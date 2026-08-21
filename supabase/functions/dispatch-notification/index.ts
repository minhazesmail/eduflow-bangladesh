import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimit } from '../_shared/rate-limit.ts';

const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200,extra:HeadersInit={})=>new Response(JSON.stringify(body),{status,headers:{...headers,...extra,'Content-Type':'application/json'}});
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return json({error:'Missing authorization token'},401);
  const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),sid=Deno.env.get('TWILIO_ACCOUNT_SID'),token=Deno.env.get('TWILIO_AUTH_TOKEN'),smsFrom=Deno.env.get('TWILIO_SMS_FROM'),waFrom=Deno.env.get('TWILIO_WHATSAPP_FROM');
  if(!url||!anon||!service)return json({error:'Server configuration is incomplete'},500);
  const db=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:{user}}=await db.auth.getUser(auth.slice(7));if(!user)return json({error:'Invalid session'},401);
  const rateLimited=await enforceRateLimit(req,admin,user.id,{scope:'dispatch-notification',ipLimit:60,userLimit:30,windowSeconds:60});
  if(rateLimited)return rateLimited;
  let b:any;try{b=await req.json()}catch{return json({error:'Invalid JSON body'},400)}
  const id=String(b.notification_id||'');if(!id)return json({error:'notification_id is required'},400);
  const {data:n,error:ne}=await db.from('notifications').select('id,organization_id,guardian_id,channel,title,body,status').eq('id',id).single();if(ne||!n)return json({error:'Notification not found'},404);
  const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();if(!['owner','admin','staff'].includes(profile?.role||''))return json({error:'Forbidden'},403);
  const {data:g}=await db.from('guardians').select('phone').eq('id',n.guardian_id).single();if(!g?.phone)return json({error:'Guardian phone is missing'},400);
  if(!sid||!token)return json({error:'Twilio is not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.'},503);
  let from=smsFrom;let to=g.phone;if(n.channel==='whatsapp'){if(!waFrom)return json({error:'TWILIO_WHATSAPP_FROM is not configured'},503);from=waFrom.startsWith('whatsapp:')?waFrom:`whatsapp:${waFrom}`;to=to.startsWith('whatsapp:')?to:`whatsapp:${to}`;}if(!from)return json({error:'Twilio sender is not configured'},503);
  const endpoint=`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;const form=new URLSearchParams({To:to,From:from,Body:n.body});const r=await fetch(endpoint,{method:'POST',headers:{Authorization:`Basic ${btoa(`${sid}:${token}`)}`,'Content-Type':'application/x-www-form-urlencoded'},body:form});const data=await r.json();
  if(!r.ok){await db.from('notifications').update({status:'failed'}).eq('id',id);return json({error:data?.message||'Provider delivery failed'},502)}
  await db.from('notifications').update({status:'sent',provider_message_id:data.sid,sent_at:new Date().toISOString()}).eq('id',id);
  return json({ok:true,provider_message_id:data.sid});
});
