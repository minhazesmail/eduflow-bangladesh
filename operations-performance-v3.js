/* Server-filtered operations helpers. Keeps large organizations from downloading entire tables. */
(function(){'use strict';
  const esc=v=>{const d=document.createElement('div');d.textContent=v==null?'':String(v);return d.innerHTML;};
  const toast=(m,t='error')=>window.eduflowSafeToast?window.eduflowSafeToast(m,t):window.EduFlow?.toast?.(m,t);
  let db;
  function client(){if(db)return db;const c=window.eduflowConfig||{};db=window.supabase?.createClient?.(c.supabaseUrl,c.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return db;}
  async function orgId(){const s=client();if(!s)throw new Error('Supabase is unavailable.');const {data:{session}}=await s.auth.getSession();if(!session?.user)throw new Error('Your session has expired.');const {data:p,error}=await s.from('profiles').select('organization_id').eq('id',session.user.id).single();if(error||!p?.organization_id)throw error||new Error('Workspace information is unavailable.');return {db:s,id:p.organization_id};}
  async function studentsForBatch(batchId){const {db:s,id}=await orgId();let q=s.from('students').select('id,name,batch_id,batches(name)').eq('organization_id',id).order('name').limit(500);if(batchId)q=q.eq('batch_id',batchId);const {data,error}=await q;if(error)throw error;return data||[];}
  async function paymentPage(page=0,pageSize=50){const {db:s,id}=await orgId();const from=page*pageSize,to=from+pageSize-1;const {data,error,count}=await s.from('payments').select('id,amount,payment_method,receipt_no,paid_at,students(name)',{count:'exact'}).eq('organization_id',id).order('paid_at',{ascending:false}).range(from,to);if(error)throw error;return {data:data||[],count:count||0,page,pageSize};}
  async function resultPage(page=0,pageSize=50){const {db:s,id}=await orgId();const from=page*pageSize,to=from+pageSize-1;const {data,error,count}=await s.from('results').select('id,marks,students(name),exams(name,total_marks)',{count:'exact'}).eq('organization_id',id).order('created_at',{ascending:false}).range(from,to);if(error)throw error;return {data:data||[],count:count||0,page,pageSize};}
  window.EduFlowOperationsPerformance={studentsForBatch,paymentPage,resultPage,toast,esc};
})();
