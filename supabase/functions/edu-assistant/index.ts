import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json'}});
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return json({error:'Missing authorization token'},401);
  const supabaseUrl=Deno.env.get('SUPABASE_URL'),anonKey=Deno.env.get('SUPABASE_ANON_KEY'),openaiKey=Deno.env.get('OPENAI_API_KEY'),model=Deno.env.get('OPENAI_MODEL')||'gpt-5.6';
  if(!supabaseUrl||!anonKey||!openaiKey)return json({error:'AI server configuration is incomplete'},500);
  const userClient=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:ue}=await userClient.auth.getUser(auth.slice(7));if(ue||!user)return json({error:'Invalid session'},401);
  const {data:profile,error:pe}=await userClient.from('profiles').select('id,organization_id,full_name,role').eq('id',user.id).single();if(pe||!profile)return json({error:'Profile unavailable'},403);
  if(!['owner','admin'].includes(profile.role))return json({error:'AI Assistant is available to owners and admins'},403);
  let body:any;try{body=await req.json()}catch{return json({error:'Invalid JSON body'},400)}
  const question=String(body.question||'').trim();if(!question||question.length>2000)return json({error:'Question is required and must be under 2000 characters'},400);
  const org=profile.organization_id;
  const [students,batches,teachers,payments,attendance,leads,expenses]=await Promise.all([
    userClient.from('students').select('name,status,monthly_fee,class_level,batch_id').eq('organization_id',org).limit(500),
    userClient.from('batches').select('name,subject,class_time').eq('organization_id',org).limit(200),
    userClient.from('teachers').select('name,subject').eq('organization_id',org).limit(200),
    userClient.from('payments').select('amount,payment_method,paid_at').eq('organization_id',org).order('paid_at',{ascending:false}).limit(300),
    userClient.from('attendance').select('student_id,present,attendance_date').eq('organization_id',org).order('attendance_date',{ascending:false}).limit(1000),
    userClient.from('admission_leads').select('name,source,stage,interested_course').eq('organization_id',org).limit(300),
    userClient.from('expenses').select('category,amount,expense_date').eq('organization_id',org).limit(300),
  ]);
  const context=JSON.stringify({organization_id:org,student_count:students.data?.length||0,batches:batches.data||[],teachers:teachers.data||[],recent_payments:payments.data||[],attendance:attendance.data||[],admission_leads:leads.data||[],expenses:expenses.data||[]});
  const prompt=`You are EduFlow AI, an operations assistant for a Bangladesh coaching center. Answer only from the supplied workspace data. Be concise, practical, and transparent when the data is insufficient. Use BDT amounts and Bangladesh date conventions. Never invent a student, payment, result, or financial figure.\n\nWorkspace data:\n${context}\n\nOwner question:\n${question}`;
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${openaiKey}`},body:JSON.stringify({model,input:prompt})});
  if(!r.ok){const detail=await r.text();return json({error:'AI provider request failed',detail:detail.slice(0,500),model},502)}
  const data=await r.json();const answer=data.output_text||data.output?.flatMap((x:any)=>x.content||[]).map((x:any)=>x.text||'').join('')||'No answer was returned.';
  await userClient.from('ai_usage').insert({organization_id:org,user_id:user.id,model,input_tokens:data.usage?.input_tokens||0,output_tokens:data.usage?.output_tokens||0});
  return json({answer,model});
});
