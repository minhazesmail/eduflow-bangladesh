import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const H={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...H,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:H});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const auth=req.headers.get('Authorization')||'';const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 if(!service||auth!==`Bearer ${service}`)return json({error:'Forbidden'},403);
 const url=Deno.env.get('SUPABASE_URL')||'';const sid=Deno.env.get('TWILIO_ACCOUNT_SID')||'';const token=Deno.env.get('TWILIO_AUTH_TOKEN')||'';const smsFrom=Deno.env.get('TWILIO_SMS_FROM')||'';const waFrom=Deno.env.get('TWILIO_WHATSAPP_FROM')||'';
 if(!url||!service)return json({error:'Server configuration is incomplete'},500);
 const db=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:items,error}=await db.from('notifications').select('id,guardian_id,channel,body,status').eq('status','queued').order('created_at',{ascending:true}).limit(20);if(error)return json({error:error.message},500);
 let sent=0,failed=0,skipped=0;
 for(const n of items||[]){
  const {data:g}=await db.from('guardians').select('phone').eq('id',n.guardian_id).maybeSingle();if(!g?.phone||!sid||!token||(!smsFrom&&n.channel!=='whatsapp')||(!waFrom&&n.channel==='whatsapp')){skipped++;continue;}
  let from=smsFrom,to=g.phone;if(n.channel==='whatsapp'){from=waFrom.startsWith('whatsapp:')?waFrom:`whatsapp:${waFrom}`;to=to.startsWith('whatsapp:')?to:`whatsapp:${to}`;}
  const endpoint=`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;const form=new URLSearchParams({To:to,From:from,Body:n.body});const r=await fetch(endpoint,{method:'POST',headers:{Authorization:`Basic ${btoa(`${sid}:${token}`)}`,'Content-Type':'application/x-www-form-urlencoded'},body:form});const data=await r.json();
  if(r.ok){await db.from('notifications').update({status:'sent',provider_message_id:data.sid,sent_at:new Date().toISOString()}).eq('id',n.id);sent++;}else{await db.from('notifications').update({status:'failed'}).eq('id',n.id);failed++;}
 }
 return json({ok:true,processed:(items||[]).length,sent,failed,skipped});
});
