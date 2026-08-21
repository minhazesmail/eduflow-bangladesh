/* Runtime fixes for production feature UX/performance. */
(function(){'use strict';
  const cfg=window.eduflowConfig||{};
  const demo=!!cfg.isDemo;
  const page=()=>document.getElementById('page-content');
  const toast=(m,t='error')=>window.eduflowSafeToast?window.eduflowSafeToast(m,t):window.EduFlow?.toast?.(m,t);
  const esc=v=>{const d=document.createElement('div');d.textContent=v==null?'':String(v);return d.innerHTML;};
  const money=v=>'৳'+Number(v||0).toLocaleString('en-BD');
  let db;
  function client(){if(db)return db;if(!window.supabase?.createClient)return null;db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return db;}
  function loading(label='Loading…'){const root=page();if(root)root.innerHTML=`<div class="card eduflow-loading" aria-busy="true"><div class="spinner" aria-hidden="true"></div><strong>${esc(label)}</strong><span class="subtitle">Please wait while EduFlow loads the latest data.</span></div>`;}
  async function getOrg(){const s=client();const {data:{session}}=await s.auth.getSession();if(!session?.user)throw new Error('Your session has expired. Please sign in again.');const {data:p,error}=await s.from('profiles').select('organization_id').eq('id',session.user.id).single();if(error||!p?.organization_id)throw new Error('Workspace information is unavailable.');return {client:s,session,userId:session.user.id,orgId:p.organization_id};}
  async function renderAttention(){
    loading('Calculating attention signals…');
    try{
      if(demo){window.EduFlowProductionFixes?.attention?.();return;}
      const {client:s,orgId}=await getOrg();
      const branchId=localStorage.getItem('eduflow.activeBranch')||null;
      const {data, error}=await s.rpc('get_attention_metrics',{p_organization_id:orgId,p_branch_id:branchId,p_days:90,p_threshold:70});
      if(error)throw error;
      const rows=data||[];
      const unknown=rows.filter(x=>x.attendance==null);
      const low=rows.filter(x=>x.attendance!=null);
      const allCount=await (async()=>{const r=await s.from('students').select('id',{count:'exact',head:true}).eq('organization_id',orgId);if(r.error)throw r.error;return r.count||0;})();
      const root=page();if(!root)return;
      root.innerHTML=`<div class="page-head"><div><h1>Attention Center</h1><p class="subtitle">Signals calculated in Postgres from the last 90 days. No large client-side ID lists.</p></div><div class="actions"><button class="btn btn-primary" id="attention-ai">Ask EduFlow AI</button></div></div><div class="grid grid-3"><div class="card"><div class="label">Low attendance</div><div class="value">${low.length}</div><div class="subtitle">Below 70%</div></div><div class="card"><div class="label">No attendance history</div><div class="value">${unknown.length}</div><div class="subtitle">Not treated as low attendance</div></div><div class="card"><div class="label">Students</div><div class="value">${allCount}</div><div class="subtitle">Current workspace</div></div></div><div class="card"><div class="section-head"><h2>Students needing attention</h2><span class="badge badge-danger">${low.length}</span></div>${low.length?`<div class="table-wrapper"><table><thead><tr><th>Student</th><th>Attendance</th><th>Guardian</th><th>Monthly fee</th><th></th></tr></thead><tbody>${low.map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td><span class="badge badge-danger">${Number(x.attendance).toLocaleString('en-BD')}%</span></td><td>${esc(x.guardian_phone||'—')}</td><td>${money(x.monthly_fee)}</td><td><button class="btn btn-secondary btn-sm" data-attention-notify="${esc(x.id)}">Queue alert</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No students are currently below the 70% threshold.</div>'}</div>`;
      root.querySelector('#attention-ai')?.addEventListener('click',()=>{location.hash='#assistant';});
      root.querySelectorAll('[data-attention-notify]').forEach(btn=>btn.addEventListener('click',async()=>{try{await window.EduFlowProductionFixes?.queueAbsent?.(btn.dataset.attentionNotify);toast('Guardian alert queued.','success');}catch(e){toast(e.message||'Could not queue alert.');}}));
    }catch(e){toast(e.message||'Could not load Attention Center.');const root=page();if(root)root.innerHTML='<div class="card"><h2>Could not load Attention Center</h2><p class="subtitle">'+esc(e.message||'Please refresh and try again.')+'</p></div>';}
  }
  // Preserve long forms locally so an expired session does not destroy typed data.
  const DRAFT_PREFIX='eduflow:draft:';
  function serialize(form){const out={};new FormData(form).forEach((value,key)=>{if(value instanceof File)return;out[key]=String(value);});return out;}
  function restore(form,key){try{const raw=localStorage.getItem(key);if(!raw)return;const data=JSON.parse(raw);Object.entries(data).forEach(([name,value])=>{const field=form.elements.namedItem(name);if(!field)return;if(field.type==='checkbox'||field.type==='radio')field.checked=String(value)===field.value;else field.value=value;});}catch(_){}
  }
  function draftKey(form){return DRAFT_PREFIX+(form.dataset.draftKey||form.id||'form');}
  function wireDrafts(){document.addEventListener('focusin',e=>{const form=e.target.closest('form');if(!form||form.dataset.noDraft==='true')return;const fields=form.querySelectorAll('input,select,textarea');if(fields.length>=4)restore(form,draftKey(form));},{passive:true});document.addEventListener('input',e=>{const form=e.target.closest('form');if(!form||form.dataset.noDraft==='true')return;const fields=form.querySelectorAll('input,select,textarea');if(fields.length<4)return;try{localStorage.setItem(draftKey(form),JSON.stringify(serialize(form)));}catch(_){}},{passive:true});document.addEventListener('submit',e=>{const form=e.target.closest('form');if(!form||form.dataset.noDraft==='true')return;try{localStorage.removeItem(draftKey(form));}catch(_){}},{capture:true});}
  function install(){
    wireDrafts();
    window.EduFlowRuntimeFixes={renderAttention,loading};
    window.addEventListener('hashchange',()=>{
      const h=location.hash.replace(/^#\/?/,'');
      if(h==='attention')setTimeout(renderAttention,0);
      else if(['guardians','admissions','branches','routine','expenses','documents','integrations','notifications','assistant'].includes(h))loading('Loading '+h.replaceAll('-',' ')+'…');
    });
    document.addEventListener('click',e=>{
      const target=e.target.closest?.('[data-page],[data-growth-action]');
      if(target&&page()){
        const action=target.dataset.page||target.dataset.growthAction||'';
        if(action==='attention'||action==='Attention'||action.includes('attention'))loading('Loading Attention Center…');
        else if(action)loading('Loading…');
      }
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
