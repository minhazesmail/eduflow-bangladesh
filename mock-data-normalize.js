/* Normalize demo records to app-core's production field contract without duplicating the dataset. */
(function(){'use strict';
  const m=window.EduFlowMockData;if(!m?.data)return;
  const d=m.data;
  d.batches=(d.batches||[]).map(b=>({...b,teacher_name:b.teacher_name||b.teacher?.name||'',class_time:b.class_time||b.schedule||'',room:b.room||''}));
  d.attendance=(d.attendance||[]).map(a=>({...a,present:a.present!=null?a.present:a.status!=='absent'}));
  d.payments=(d.payments||[]).map(p=>({...p,payment_method:p.payment_method||p.method||'cash',receipt_no:p.receipt_no||p.reference||null}));
  d.exams=(d.exams||[]).map(e=>({...e,name:e.name||e.title||'Exam'}));
  d.results=(d.results||[]).map(r=>({...r,exams:{name:r.exams?.name||r.exams?.title||'Exam',total_marks:r.exams?.total_marks||100}}));
  d.teachers=(d.teachers||[]).map(t=>({...t,subject:t.subject||t.specialization||'',rate_per_class:t.rate_per_class||0}));
  d.notices=(d.notices||[]).map(n=>({...n,created_at:n.created_at||n.published_at||m.session?.expires_at||new Date().toISOString()}));
})();
