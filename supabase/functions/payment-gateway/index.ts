import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimit } from '../_shared/rate-limit.ts';

const H={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(b:unknown,s=200,extra:HeadersInit={})=>new Response(JSON.stringify(b),{status:s,headers:{...H,...extra,'Content-Type':'application/json'}});
const env=(k:string)=>{const v=Deno.env.get(k);if(!v)throw new Error(`Missing ${k}`);return v;};
let tokenCache:{token:string,expires:number}|null=null;

async function bkashGrant(base:string){if(tokenCache&&tokenCache.expires>Date.now()+30000)return tokenCache.token;const r=await fetch(`${base.replace(/\/$/,'')}/tokenized/checkout/token/grant`,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','username':env('BKASH_USERNAME'),'password':env('BKASH_PASSWORD')},body:JSON.stringify({app_key:env('BKASH_APP_KEY'),app_secret:env('BKASH_APP_SECRET')})});const d=await r.json();if(!r.ok||!d.id_token)throw new Error(d.errorMessage||d.errorCode||'bKash token request failed');tokenCache={token:d.id_token,expires:Date.now()+Number(d.expires_in||3600)*1000};return d.id_token;}
async function bkashCreate(base:string,input:any){const token=await bkashGrant(base);const r=await fetch(`${base.replace(/\/$/,'')}/tokenized/checkout/create`,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','Authorization':token,'X-App-Key':env('BKASH_APP_KEY')},body:JSON.stringify(input)});const d=await r.json();if(!r.ok||!d.paymentID)throw new Error(d.errorMessage||d.errorCode||'bKash create payment failed');return d;}
async function bkashVerify(base:string,paymentID:string){const token=await bkashGrant(base);const r=await fetch(`${base.replace(/\/$/,'')}/tokenized/checkout/payment/status`,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','Authorization':token,'X-App-Key':env('BKASH_APP_KEY')},body:JSON.stringify({paymentID})});const d=await r.json();if(!r.ok)throw new Error(d.errorMessage||d.errorCode||'bKash status failed');return d;}
async function nagad(action:string,input:any){const url=action==='create'?Deno.env.get('NAGAD_CREATE_URL'):Deno.env.get('NAGAD_VERIFY_URL');if(!url)throw new Error(`Nagad ${action} endpoint is not configured`);const headers:Record<string,string>={'Content-Type':'application/json','Accept':'application/json','X-KM-Api-Version':Deno.env.get('NAGAD_API_VERSION')||'v-0.2.0','X-KM-Client-Type':Deno.env.get('NAGAD_CLIENT_TYPE')||'PC_WEB'};const key=Deno.env.get('NAGAD_API_KEY');if(key)headers.Authorization=`Bearer ${key}`;const r=await fetch(url,{method:'POST',headers,body:JSON.stringify(input)});const d=await r.json();if(!r.ok)throw new Error(d.message||d.reason||`Nagad ${action} failed`);return d;}
function successful(provider:string,d:any){const s=String(d.transactionStatus||d.status||d.statusMessage||'').toLowerCase();return provider==='bkash'?s==='completed'&&String(d.currency||'BDT')==='BDT':['success','successful','completed','paid'].includes(s);}

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:H});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return json({error:'Missing authorization token'},401);
 try{
  const url=env('SUPABASE_URL'),service=env('SUPABASE_SERVICE_ROLE_KEY');
  const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
  const db=createClient(url,env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await db.auth.getUser(auth.slice(7));if(!user)return json({error:'Invalid session'},401);
  const rateLimited=await enforceRateLimit(req,admin,user.id,{scope:'payment-gateway',ipLimit:60,userLimit:20,windowSeconds:60});if(rateLimited)return rateLimited;
  const {data:p,error:pe}=await db.from('profiles').select('organization_id,role').eq('id',user.id).single();if(pe||!p)return json({error:'Workspace unavailable'},403);if(!['owner','admin','staff'].includes(p.role))return json({error:'Forbidden'},403);
  let body:any;try{body=await req.json();}catch{return json({error:'Invalid JSON'},400)}
  const provider=String(body.provider||'').toLowerCase();const action=String(body.action||'create').toLowerCase();if(!['bkash','nagad'].includes(provider))return json({error:'provider must be bkash or nagad'},400);if(!['create','verify'].includes(action))return json({error:'Unsupported action'},400);
  const {data:integration,error:ie}=await db.from('payment_integrations').select('*').eq('organization_id',p.organization_id).eq('provider',provider).maybeSingle();if(ie)return json({error:ie.message},500);if(!integration?.is_enabled)return json({error:`${provider} integration is not enabled`},409);
  if(action==='create'){
   const studentId=String(body.student_id||'');const amount=Number(body.amount||0);if(!studentId||!(amount>0))return json({error:'student_id and positive amount are required'},400);
   const {data:student,error:se}=await admin.from('students').select('id,branch_id').eq('id',studentId).eq('organization_id',p.organization_id).single();if(se||!student)return json({error:'Student not found'},404);
   const merchantInvoiceNumber=`EDUFLOW-${crypto.randomUUID().replace(/-/g,'').slice(0,20)}`;
   const {data:tx,error:te}=await admin.from('payment_transactions').insert({organization_id:p.organization_id,student_id:studentId,provider,merchant_invoice_number:merchantInvoiceNumber,amount}).select('id').single();if(te||!tx)return json({error:te?.message||'Could not create payment intent'},500);
   try{
    const callbackURL=`${url.replace(/\/$/,'')}/functions/v1/payment-ipn?provider=${encodeURIComponent(provider)}`;
    let d:any;
    if(provider==='bkash')d=await bkashCreate(env('BKASH_BASE_URL'),{mode:'0011',payerReference:String(body.payer_reference||''),callbackURL,amount:amount.toFixed(2),currency:'BDT',intent:'sale',merchantInvoiceNumber});
    else d=await nagad('create',{merchantId:env('NAGAD_MERCHANT_ID'),merchantNumber:env('NAGAD_MERCHANT_NUMBER'),orderId:merchantInvoiceNumber,amount,currency:'BDT',callbackUrl:callbackURL,paymentReference:String(body.payer_reference||'')});
    const providerPaymentId=String(d.paymentID||d.paymentId||d.paymentRefId||d.orderId||'');await admin.from('payment_transactions').update({provider_payment_id:providerPaymentId,raw_provider_response:d,updated_at:new Date().toISOString()}).eq('id',tx.id);
    return json({ok:true,provider,transaction_id:tx.id,merchant_invoice_number:merchantInvoiceNumber,payment_id:providerPaymentId,checkout_url:d.bKashURL||d.bkashURL||d.paymentURL||d.checkoutUrl||null});
   }catch(err){await admin.from('payment_transactions').update({status:'failed',raw_provider_response:{error:err instanceof Error?err.message:'provider error'},updated_at:new Date().toISOString()}).eq('id',tx.id);throw err;}
  }
  const transactionId=String(body.transaction_id||'');if(!transactionId)return json({error:'transaction_id is required'},400);
  const {data:tx,error:te}=await admin.from('payment_transactions').select('*').eq('id',transactionId).eq('organization_id',p.organization_id).single();if(te||!tx)return json({error:'Payment intent not found'},404);if(tx.provider!==provider)return json({error:'Provider mismatch'},409);
  let d:any;if(provider==='bkash')d=await bkashVerify(env('BKASH_BASE_URL'),String(tx.provider_payment_id||''));else d=await nagad('verify',{paymentReferenceId:String(tx.provider_payment_id||''),orderId:tx.merchant_invoice_number});
  const providerAmount=Number(d.amount||d.totalAmount||d.orderAmount||0);const providerTx=String(d.trxID||d.transactionId||d.paymentRefId||d.reference||'').trim();const providerStatus=String(d.transactionStatus||d.status||d.statusMessage||'unknown');
  if(!successful(provider,d))return json({ok:false,verified:false,status:providerStatus},402);if(Math.round(providerAmount*100)!==Math.round(Number(tx.amount)*100))return json({error:'Provider amount does not match payment intent'},409);if(!providerTx)return json({error:'Provider transaction id is missing'},502);
  const {data:result,error:re}=await admin.rpc('reconcile_verified_payment',{p_transaction_id:tx.id,p_provider:provider,p_provider_status:providerStatus,p_provider_transaction_id:providerTx,p_amount:providerAmount,p_raw_response:d});if(re)return json({error:re.message},409);
  return json({ok:true,verified:true,result});
 }catch(err){return json({error:err instanceof Error?err.message:'Payment provider error'},502)}
});
