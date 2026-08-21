import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json'}});
Deno.serve(async req=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers});
  if(req.method!=='POST') return json({error:'Method not allowed'},405);
  const auth=req.headers.get('Authorization'); if(!auth?.startsWith('Bearer ')) return json({error:'Missing authorization token'},401);
  const url=Deno.env.get('SUPABASE_URL'), key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), site=Deno.env.get('SITE_URL')||'https://eduflow-bangladesh.vercel.app';
  if(!url||!key)return json({error:'Server configuration is incomplete'},500);
  const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:userData,error:userError}=await admin.auth.getUser(auth.slice(7));
  if(userError||!userData.user)return json({error:'Invalid session'},401);
  const {data:actor}=await admin.from('profiles').select('id,organization_id,role').eq('id',userData.user.id).single();
  if(!actor||!['owner','admin','staff'].includes(actor.role))return json({error:'You do not have permission to invite guardians'},403);
  let body: any; try{body=await req.json();}catch{return json({error:'Invalid JSON body'},400)}
  const guardianId=String(body.guardian_id||''); if(!guardianId)return json({error:'guardian_id is required'},400);
  const {data:g,error:ge}=await admin.from('guardians').select('id,organization_id,email,full_name').eq('id',guardianId).eq('organization_id',actor.organization_id).single();
  if(ge||!g?.email)return json({error:'Guardian email is required before sending a portal invite'},400);
  const {data:existing}=await admin.from('guardian_invitations').select('id,status').eq('guardian_id',guardianId).in('status',['pending','sent']).maybeSingle();
  if(existing)return json({error:'An active guardian invitation already exists'},409);
  const {data:invite,error:ie}=await admin.from('guardian_invitations').insert({organization_id:actor.organization_id,guardian_id:guardianId,email:g.email,status:'pending'}).select('id').single();
  if(ie||!invite)return json({error:ie?.message||'Could not create invitation'},500);
  const redirectTo=`${site.replace(/\/$/,'')}/guardian.html`;
  const {error:ae}=await admin.auth.admin.inviteUserByEmail(g.email,{redirectTo,data:{guardian_invitation_id:invite.id,guardian_id:guardianId,organization_id:actor.organization_id,full_name:g.full_name}});
  if(ae){await admin.from('guardian_invitations').update({status:'cancelled'}).eq('id',invite.id);return json({error:ae.message},502)}
  await admin.from('guardian_invitations').update({status:'sent'}).eq('id',invite.id);
  return json({ok:true,invitation_id:invite.id});
});
