import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const H = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...H,'Content-Type':'application/json'}});
const env=(k:string)=>{const v=Deno.env.get(k);if(!v)throw new Error(`Missing ${k}`);return v;};
let tokenCache:{token:string,expires:number}|null=null;

async function bkashGrant(base:string){
  if(tokenCache&&tokenCache.expires>Date.now()+30000)return tokenCache.token;
  const r=await fetch(`${base.replace(/\/$/,'')}/tokenized/checkout/token/grant`,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','username':env('BKASH_USERNAME'),'password':env('BKASH_PASSWORD')},body:JSON.stringify({app_key:env('BKASH_APP_KEY'),app_secret:env('BKASH_APP_SECRET')})});
  const d=await r.json();if(!r.ok||!d.id_token)throw new Error(d.errorMessage||d.errorCode||'bKash token request failed');
  tokenCache={token:d.id_token,expires:Date.now()+Number(d.expires_in||3600)*1000};return d.id_token;
}
async function bkashCreate(base:string,input:any){
  const token=await bkashGrant(base);const r=await fetch(`${base.replace(/\/$/,'')}/tokenized/checkout/create`,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','Authorization':token,'X-App-Key':env('BKASH_APP_KEY')},body:JSON.stringify({mode:'0011',payerReference:String(input.payerReference||''),callbackURL:String(input.callbackURL||''),amount:Number(input.amount).toFixed(2),currency:'BDT',intent:'sale',merchantInvoiceNumber:String(input.merchantInvoiceNumber)})});
  const d=await r.json();if(!r.ok||!d.paymentID)throw new Error(d.errorMessage||d.errorCode||'bKash create payment failed');return d;
}
async function bkashExecute(base:string,paymentID:string){const token=await bkashGrant(base);const r=await fetch(`${base.replace(/\/$/,'')}/tokenized/checkout/execute`,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','Authorization':token,'X-App-Key':env('BKASH_APP_KEY')},body:JSON.stringify({paymentID})});const d=await r.json();if(!r.ok)throw new Error(d.errorMessage||d.errorCode||'bKash execute failed');return d;}
async function bkashStatus(base:string,paymentID:string){const token=await bkashGrant(base);const r=await fetch(`${base.replace(/\/$/,'')}/tokenized/checkout/payment/status`,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','Authorization':token,'X-App-Key':env('BKASH_APP_KEY')},body:JSON.stringify({paymentID})});const d=await r.json();if(!r.ok)throw new Error(d.errorMessage||d.errorCode||'bKash status failed');return d;}

async function nagad(action:string,input:any){
  const url=action==='create'?Deno.env.get('NAGAD_CREATE_URL'):Deno.env.get('NAGAD_VERIFY_URL');
  if(!url)throw new Error(`Nagad ${action} endpoint is not configured. Set NAGAD_${action.toUpperCase()}_URL from the merchant contract.`);
  const headers:Record<string,string>={'Content-Type':'application/json','Accept':'application/json','X-KM-Api-Version':Deno.env.get('NAGAD_API_VERSION')||'v-0.2.0','X-KM-Client-Type':Deno.env.get('NAGAD_CLIENT_TYPE')||'PC_WEB'};
  const key=Deno.env.get('NAGAD_API_KEY');if(key)headers.Authorization=`Bearer ${key}`;
  const r=await fetch(url,{method:action==='create'?'POST':'GET',headers,body:action==='create'?JSON.stringify(input):undefined});const d=await r.json();if(!r.ok)throw new Error(d.message||d.reason||'Nagad request failed');return d;
}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:H});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return json({error:'Missing authorization token'},401);
  try{
    const db=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:auth}}});
    const {data:{user}}=await db.auth.getUser(auth.slice(7));if(!user)return json({error:'Invalid session'},401);
    const {data:p,error:pe}=await db.from('profiles').select('organization_id,role').eq('id',user.id).single();if(pe||!p)return json({error:'Workspace unavailable'},403);
    if(!['owner','admin','staff'].includes(p.role))return json({error:'Forbidden'},403);
    let body:any;try{body=await req.json();}catch{return json({error:'Invalid JSON'},400);}
    const provider=String(body.provider||'').toLowerCase();const action=String(body.action||'create').toLowerCase();
    if(!['bkash','nagad'].includes(provider))return json({error:'provider must be bkash or nagad'},400);
    if(!['create','execute','verify'].includes(action))return json({error:'Unsupported action'},400);
    const {data:integration,error:ie}=await db.from('payment_integrations').select('*').eq('organization_id',p.organization_id).eq('provider',provider).maybeSingle();
    if(ie)return json({error:ie.message},500);if(!integration?.is_enabled)return json({error:`${provider} integration is not enabled`},409);
    if(provider==='bkash'){
      const base=env('BKASH_BASE_URL');
      if(action==='create'){const amount=Number(body.amount||0);if(!(amount>0))return json({error:'amount must be greater than 0'},400);const d=await bkashCreate(base,{amount,payerReference:body.payer_reference,callbackURL:body.callback_url,merchantInvoiceNumber:body.merchant_invoice_number||`EDUFLOW-${crypto.randomUUID().slice(0,12)}`});return json({ok:true,provider,action,payment_id:d.paymentID,checkout_url:d.bKashURL||d.paymentURL||null,raw:d});}
      if(!body.payment_id)return json({error:'payment_id is required'},400);const d=action==='execute'?await bkashExecute(base,String(body.payment_id)):await bkashStatus(base,String(body.payment_id));return json({ok:true,provider,action,raw:d});
    }
    const d=await nagad(action,{merchantId:Deno.env.get('NAGAD_MERCHANT_ID')||integration.merchant_id||'',merchantNumber:Deno.env.get('NAGAD_MERCHANT_NUMBER')||'',orderId:String(body.order_id||`EDUFLOW-${crypto.randomUUID().slice(0,12)}`),amount:Number(body.amount||0),callbackUrl:String(body.callback_url||''),paymentRefId:String(body.payment_ref_id||'')});
    return json({ok:true,provider,action,raw:d});
  }catch(e){return json({error:e instanceof Error?e.message:'Payment provider error'},502);}
});
