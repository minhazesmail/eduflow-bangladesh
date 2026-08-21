/* Online payment action: server-side provider gateway, no provider secrets in browser. */
(function(){'use strict';
  const toast=(m,t='info')=>window.eduflowSafeToast?window.eduflowSafeToast(m,t):window.EduFlow?.toast?.(m,t);
  const db=()=>window.EduFlowRuntime?.db;
  const isDemo=()=>!!window.eduflowConfig?.isDemo;
  async function open(){
    if(isDemo())return toast('Online payments are disabled in Demo Mode.','warning');
    const s=db();if(!s)return toast('Payment service is not ready.','error');
    const {data:{session}}=await s.auth.getSession();if(!session?.user)return toast('Please sign in first.','error');
    const {data:profile}=await s.from('profiles').select('organization_id').eq('id',session.user.id).single();
    if(!profile)return toast('Workspace is unavailable.','error');
    const {data:students,error}=await s.from('students').select('id,name,student_code,monthly_fee').eq('organization_id',profile.organization_id).order('name').limit(200);if(error)return toast(error.message,'error');
    const modal=document.getElementById('modal-root');if(!modal)return;
    const esc=v=>{const d=document.createElement('div');d.textContent=v==null?'':String(v);return d.innerHTML;};
    modal.innerHTML=`<div class="modal-backdrop" data-pc-close><div class="modal"><div class="modal-head"><h2>Create online payment</h2><button type="button" class="close" id="pc-close">✕</button></div><form id="pc-form"><div class="field"><label>Provider</label><select id="pc-provider"><option value="bkash">bKash</option><option value="nagad">Nagad</option></select></div><div class="field"><label>Student</label><select id="pc-student" required>${(students||[]).map(x=>`<option value="${esc(x.id)}">${esc(x.name)}${x.student_code?` · ${esc(x.student_code)}`:''}</option>`).join('')}</select></div><div class="field"><label>Amount (BDT)</label><input id="pc-amount" type="number" min="1" step="0.01" required></div><div class="field"><label>Payer reference</label><input id="pc-reference" placeholder="Student/guardian phone or invoice note"></div><div class="end-actions"><button type="button" class="btn btn-secondary" id="pc-cancel">Cancel</button><button class="btn btn-primary">Create checkout</button></div></form></div></div>`;
    const close=()=>modal.innerHTML='';document.getElementById('pc-close').onclick=close;document.getElementById('pc-cancel').onclick=close;modal.querySelector('[data-pc-close]').onclick=e=>{if(e.target===e.currentTarget)close();};
    document.getElementById('pc-form').onsubmit=async e=>{e.preventDefault();const btn=e.submitter;btn.disabled=true;btn.textContent='Creating…';try{const provider=document.getElementById('pc-provider').value,studentId=document.getElementById('pc-student').value,amount=Number(document.getElementById('pc-amount').value),reference=document.getElementById('pc-reference').value.trim();const {data,error}=await s.functions.invoke('payment-gateway',{body:{provider,action:'create',student_id:studentId,amount,payer_reference:reference}});if(error)throw error;if(data?.error)throw new Error(data.error);if(data?.checkout_url)window.open(data.checkout_url,'_blank','noopener,noreferrer');else toast('Payment intent created. Provider checkout is unavailable for this integration.','warning');close();}catch(err){toast(err.message||'Could not create online payment.','error');}finally{btn.disabled=false;btn.textContent='Create checkout';}};
  }
  function inject(){const hash=location.hash.replace(/^#\/?/,'');if(hash!=='payments'||isDemo())return;const actions=document.querySelector('.page-head .actions');if(!actions||document.getElementById('pc-open'))return;const b=document.createElement('button');b.id='pc-open';b.className='btn btn-secondary';b.textContent='Create online payment';b.onclick=open;actions.prepend(b);}
  const refresh=()=>setTimeout(inject,250);
  window.addEventListener('hashchange',refresh);window.addEventListener('popstate',refresh);document.addEventListener('DOMContentLoaded',refresh,{once:true});
})();
