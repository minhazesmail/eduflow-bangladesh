/* EduFlow core app: single runtime, schema-aligned, no legacy module dependencies. */
(function () {
  'use strict';

  const PAGE_ROLES = {
    dashboard: ['owner','admin','teacher','staff'], students: ['owner','admin','teacher','staff'],
    batches: ['owner','admin','teacher','staff'], attendance: ['owner','admin','teacher','staff'],
    payments: ['owner','admin','staff'], exams: ['owner','admin','teacher'],
    results: ['owner','admin','teacher','staff'], teachers: ['owner','admin','teacher','staff'],
    notices: ['owner','admin','teacher','staff'], team: ['owner'], billing: ['owner'],
    settings: ['owner','admin'], audit: ['owner','admin']
  };
  const ACTION_ROLES = {
    'students:create':['owner','admin'],'students:update':['owner','admin'],'students:delete':['owner','admin'],
    'batches:create':['owner','admin'],'batches:update':['owner','admin'],'batches:delete':['owner','admin'],
    'attendance:create':['owner','admin','staff'],'attendance:update':['owner','admin','staff'],'attendance:delete':['owner','admin'],
    'payments:create':['owner','admin','staff'],'payments:update':['owner','admin'],'payments:delete':['owner','admin'],
    'exams:create':['owner','admin'],'exams:update':['owner','admin'],'exams:delete':['owner','admin'],
    'results:create':['owner','admin','teacher'],'results:update':['owner','admin','teacher'],'results:delete':['owner','admin'],
    'teachers:create':['owner','admin'],'teachers:update':['owner','admin'],'teachers:delete':['owner','admin'],
    'notices:create':['owner','admin'],'notices:update':['owner','admin'],'notices:delete':['owner','admin']
  };

  let sb, session, profile, organization, currentPage = 'dashboard', currentRole = null;
  let listenersReady = false, loadingUser = null, modalRoot;
  const $ = id => document.getElementById(id);
  const esc = value => { const d = document.createElement('div'); d.textContent = value == null ? '' : String(value); return d.innerHTML; };
  const canPage = p => !!currentRole && (PAGE_ROLES[p] || []).includes(currentRole);
  const can = (resource, action) => !!currentRole && (ACTION_ROLES[`${resource}:${action}`] || []).includes(currentRole);

  function toast(message, type='info') {
    const root = $('toast-root'); if (!root) return;
    const el = document.createElement('div'); el.className='toast'; el.textContent=message;
    const bg={success:'#064e3b',error:'#450a0a',warning:'#422006',info:'#07111f'}[type]||'#07111f';
    el.style.cssText=`background:${bg};border-color:rgba(255,255,255,.16);opacity:0;transform:translateY(10px);transition:.2s`;
    root.appendChild(el); requestAnimationFrame(()=>{el.style.opacity='1';el.style.transform='translateY(0)'});
    setTimeout(()=>{el.style.opacity='0';el.style.transform='translateY(10px)';setTimeout(()=>el.remove(),250)},3500);
  }

  function showFatal(title,message) {
    document.body.innerHTML=`<div class="auth-shell"><div class="card auth-card"><div class="auth-brand"><span class="loading-logo">◦</span><div><strong>EduFlow</strong><div class="subtitle">Bangladesh • Coaching OS</div></div></div><h1>${esc(title)}</h1><p class="sub">${esc(message)}</p><button class="btn btn-primary" onclick="location.reload()">Reload</button></div></div>`;
  }

  function setLoading(on) { $('loading-screen')?.classList.toggle('hidden', !on); }

  function renderAuth(mode='signin', message='') {
    const authRoot = $('auth-screen');
    if (!authRoot) { showFatal('UI error', 'Auth screen is missing from the page.'); return; }
    setLoading(false);
    authRoot.innerHTML=`<div class="auth-shell"><div class="card auth-card">
      <div class="auth-brand"><span class="loading-logo">◦</span><div><strong>EduFlow</strong><div class="subtitle">Bangladesh • Coaching OS</div></div></div>
      <h1>${mode==='signup'?'Register your Coaching Center':'Welcome back'}</h1>
      <p class="sub">${mode==='signup'?'Create a workspace for your coaching center.':'Run your coaching center from one place.'}</p>
      ${message?`<div class="auth-error" role="status">${esc(message)}</div>`:''}
      <div id="auth-error" class="auth-error" role="alert" hidden></div>
      <form id="auth-form-el">
        ${mode==='signup'?`<div class="field"><label for="auth-fullname">Your name</label><input id="auth-fullname" required autocomplete="name"></div><div class="field"><label for="auth-orgname">Coaching center</label><input id="auth-orgname" required autocomplete="organization"></div>`:''}
        <div class="field"><label for="auth-email">Email</label><input id="auth-email" type="email" required autocomplete="email"></div>
        <div class="field"><label for="auth-password">Password</label><input id="auth-password" type="password" minlength="6" required autocomplete="${mode==='signup'?'new-password':'current-password'}"></div>
        <div class="actions" style="margin-top:18px"><button class="btn btn-primary" id="auth-btn" type="submit">${mode==='signup'?'Create Account':'Sign in'}</button><button class="btn btn-secondary" id="auth-toggle" type="button">${mode==='signup'?'Back to sign in':'Register your center'}</button></div>
      </form>
      <p class="subtitle" style="font-size:11px;margin-top:16px">${mode==='signup'?'Only center owners should register.':'Teachers and staff should use an account provided by the center.'}</p>
    </div></div>`;
    authRoot.classList.remove('hidden');
    $('app-shell')?.classList.add('hidden');
    $('auth-toggle').onclick=()=>renderAuth(mode==='signup'?'signin':'signup');
    $('auth-form-el').onsubmit=e=>submitAuth(e,mode);
    try { window.EduFlowI18n?.applyAuth?.(); } catch (_) {}
  }

  async function submitAuth(e, mode) {
    e.preventDefault(); const btn=$('auth-btn'), err=$('auth-error'); err.hidden=true; btn.disabled=true; btn.textContent=mode==='signup'?'Creating…':'Signing in…';
    try {
      const email=$('auth-email').value.trim().toLowerCase(), password=$('auth-password').value;
      if (mode==='signup') {
        const full_name=$('auth-fullname').value.trim(), organization_name=$('auth-orgname').value.trim();
        const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name,organization_name}}}); if(error) throw error;
        if(data.session) await loadUser(data.session); else renderAuth('signin','Account created. Check your email, confirm it, then sign in.');
      } else {
        const {data,error}=await sb.auth.signInWithPassword({email,password}); if(error) throw error;
        await loadUser(data.session);
      }
    } catch (error) { err.textContent=error?.message||'Authentication failed.'; err.hidden=false; }
    finally { btn.disabled=false; btn.textContent=mode==='signup'?'Create Account':'Sign in'; }
  }

  async function loadUser(nextSession) {
    if (!nextSession?.user) { renderAuth('signin'); return; }
    if (loadingUser) return loadingUser;
    loadingUser=(async()=>{
      session=nextSession;
      const {data:prof,error:pe}=await sb.from('profiles').select('id,organization_id,full_name,role,created_at').eq('id',session.user.id).maybeSingle();
      if(pe||!prof||!prof.organization_id){ await sb.auth.signOut(); renderAuth('signin',pe?.message||'Your profile is not ready yet. Please sign in again.'); return; }
      const {data:org,error:oe}=await sb.from('organizations').select('id,name,phone,district,created_at').eq('id',prof.organization_id).single();
      if(oe||!org){ showFatal('Workspace error','Your account exists but its coaching center could not be loaded.'); return; }
      profile=prof; organization=org; currentRole=prof.role;
      $('user-name').textContent=prof.full_name||'User'; $('user-email').textContent=session.user.email||''; $('user-avatar').textContent=(prof.full_name||'U').slice(0,1).toUpperCase();
      $('org-name').textContent=org.name||'Coaching Center'; $('user-role').textContent=prof.role; $('top-role').textContent=prof.role[0].toUpperCase()+prof.role.slice(1);
      $('auth-screen').classList.add('hidden'); $('app-shell').classList.remove('hidden');
      applyNav(); await updateUsage(); navigateTo(resolveInitialPage());
    })();
    try { return await loadingUser; } finally { loadingUser=null; }
  }

  function resolveInitialPage(){ const requested=location.hash.slice(1); return canPage(requested)?requested:'dashboard'; }

  function applyNav(){ document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('hidden',!canPage(el.dataset.page))); }

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(label || 'Request timed out')), ms))
    ]);
  }

  async function init(){
    setLoading(true);
    modalRoot = $('modal-root');
    const failsafe = setTimeout(() => {
      const loading = $('loading-screen');
      const auth = $('auth-screen');
      if (loading && !loading.classList.contains('hidden') && auth && auth.classList.contains('hidden')) {
        try { renderAuth('signin', 'Loading took too long. You can sign in now.'); } catch (_) {}
        setLoading(false);
      }
    }, 8000);
    try {
      if (!window.eduflowConfig?.supabaseUrl || !window.eduflowConfig?.supabaseKey) {
        showFatal('Configuration error', 'Supabase client configuration is missing.');
        return;
      }
      if (!window.supabase?.createClient) {
        showFatal('Dependency error', 'Supabase could not be loaded. Refresh the page or check your network connection.');
        return;
      }
      try {
        sb = window.supabase.createClient(window.eduflowConfig.supabaseUrl, window.eduflowConfig.supabaseKey, {
          auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
        });
      } catch (e) {
        showFatal('Connection error', e.message || 'Could not create Supabase client.');
        return;
      }
      let s = null;
      try {
        const result = await withTimeout(sb.auth.getSession(), 6000, 'Session check timed out');
        s = result?.data?.session || null;
      } catch (sessionErr) {
        console.warn(sessionErr);
        s = null;
      }
      if (s) {
        try {
          await withTimeout(loadUser(s), 10000, 'Workspace load timed out');
        } catch (loadErr) {
          console.warn(loadErr);
          try { await sb.auth.signOut(); } catch (_) {}
          renderAuth('signin', loadErr?.message || 'Could not load your workspace. Please sign in again.');
        }
      } else {
        renderAuth(new URLSearchParams(location.search).get('mode') === 'signup' ? 'signup' : 'signin');
      }
      setupListeners();
      setupOffline();
      if (navigator.onLine === false) $('offline-banner')?.classList.remove('hidden');
    } catch (err) {
      console.error(err);
      try {
        renderAuth('signin', err?.message || 'Something went wrong while starting EduFlow.');
      } catch (_) {
        showFatal('Startup error', err?.message || 'Something went wrong while starting EduFlow.');
      }
    } finally {
      clearTimeout(failsafe);
      setLoading(false);
    }
  }

  function setupListeners(){
    if(listenersReady) return; listenersReady=true;
    $('logout-btn').onclick=async()=>{await sb.auth.signOut();session=null;profile=null;organization=null;currentRole=null;renderAuth('signin');};
    $('refresh-btn').onclick=()=>navigateTo(currentPage);
    $('mobile-toggle').onclick=()=>$('sidebar').classList.toggle('open');
    document.querySelectorAll('[data-page]').forEach(el=>el.onclick=e=>{e.preventDefault();if(canPage(el.dataset.page))navigateTo(el.dataset.page);});
    window.addEventListener('hashchange',()=>{const p=location.hash.slice(1);if(canPage(p))navigateTo(p);});
    sb.auth.onAuthStateChange((event,s)=>{ if(event==='SIGNED_OUT') renderAuth('signin'); else if(event==='TOKEN_REFRESHED'&&s) session=s; });
  }

  function setupOffline(){
    window.addEventListener('online',()=>{$('offline-banner').classList.add('hidden');toast('Back online','success');});
    window.addEventListener('offline',()=>{$('offline-banner').classList.remove('hidden');toast('You are offline. Changes are not saved until you reconnect.','warning');});
  }

  function navigateTo(page){ if(!canPage(page)) return toast('You do not have access to this page.','error'); currentPage=page; if(location.hash!==`#${page}`) history.replaceState(null,'',`#${page}`); $('page-title').textContent=page.replace(/(^|[-_])([a-z])/g,(_,a,b)=>' '+b.toUpperCase()).trim(); document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===page)); $('sidebar').classList.remove('open');
    const loaders={dashboard:loadDashboard,students:loadStudents,batches:loadBatches,attendance:loadAttendance,payments:loadPayments,exams:loadExams,results:loadResults,teachers:loadTeachers,notices:loadNotices,team:loadTeam,billing:loadBilling,settings:loadSettings,audit:loadAudit};
    (loaders[page]||loadDashboard)();
  }

  async function q(promise, fallback=null){try{const r=await promise; if(r.error) throw r.error; return r.data==null?fallback:r.data;}catch(e){toast(e.message||'Unable to load data.','error');return fallback;}}
  const button=(label,action,cls='btn btn-primary')=>`<button class="${cls}" data-action="${esc(action)}">${esc(label)}</button>`;
  function bindActions(){ document.querySelectorAll('[data-action]').forEach(el=>{const a=el.dataset.action; if(a==='new-student')el.onclick=()=>studentModal(); if(a==='new-batch')el.onclick=()=>batchModal(); if(a==='new-attendance')el.onclick=()=>attendanceModal(); if(a==='new-payment')el.onclick=()=>paymentModal(); if(a==='new-exam')el.onclick=()=>examModal(); if(a==='new-result')el.onclick=()=>resultModal(); if(a==='new-teacher')el.onclick=()=>teacherModal(); if(a==='new-notice')el.onclick=()=>noticeModal();}); }
  function setContent(html){$('page-content').innerHTML=html; bindActions();}

  async function loadDashboard(){
    setContent('<div class="empty">Loading dashboard…</div>');
    const [{count:students},{count:batches},{count:teachers},{data:payments}]=await Promise.all([
      sb.from('students').select('id',{count:'exact',head:true}).eq('organization_id',organization.id),
      sb.from('batches').select('id',{count:'exact',head:true}).eq('organization_id',organization.id),
      sb.from('teachers').select('id',{count:'exact',head:true}).eq('organization_id',organization.id),
      sb.from('payments').select('amount,paid_at,students(name)').eq('organization_id',organization.id).order('paid_at',{ascending:false}).limit(5)
    ]);
    const total=(payments||[]).reduce((s,p)=>s+Number(p.amount||0),0);
    setContent(`<div class="grid grid-4" style="margin-bottom:20px"><div class="card"><div class="stat"><div><div class="label">Students</div><div class="value">${students||0}</div></div><div class="iconbox">👨‍🎓</div></div></div><div class="card"><div class="stat"><div><div class="label">Batches</div><div class="value">${batches||0}</div></div><div class="iconbox">📚</div></div></div><div class="card"><div class="stat"><div><div class="label">Teachers</div><div class="value">${teachers||0}</div></div><div class="iconbox">👨‍🏫</div></div></div><div class="card"><div class="stat"><div><div class="label">Recent payments</div><div class="value">৳${total.toLocaleString()}</div></div><div class="iconbox">৳</div></div></div></div><div class="split"><div class="card"><h2>Quick actions</h2><p class="subtitle">Use the operational tools directly.</p><div class="quick-grid">${can('students','create')?button('Add Student','new-student','quick'):''}${can('attendance','create')?button('Mark Attendance','new-attendance','quick'):''}${can('payments','create')?button('Record Payment','new-payment','quick'):''}${can('exams','create')?button('Create Exam','new-exam','quick'):''}</div></div><div class="card"><div class="section-head"><h2>Recent payments</h2></div>${(payments||[]).length?(payments||[]).map(p=>`<div class="list-item"><div><strong>${esc(p.students?.name||'Student')}</strong><div class="subtitle">${new Date(p.paid_at).toLocaleDateString()}</div></div><span class="badge badge-success">৳${Number(p.amount||0).toLocaleString()}</span></div>`).join(''):'<div class="empty">No payments recorded yet.</div>'}</div></div>`);
  }

  async function listPage(title,subtitle,rows,headers,empty,extra=''){setContent(`<div class="page-head"><div><h1>${esc(title)}</h1><p class="subtitle">${esc(subtitle)}</p></div><div class="actions">${extra}</div></div><div class="card"><div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${headers.length}" class="empty">${esc(empty)}</td></tr>`}</tbody></table></div></div>`);}

  async function loadStudents(){const data=await q(sb.from('students').select('id,name,phone,guardian_name,guardian_phone,batch_id,monthly_fee,created_at,batches(name)').eq('organization_id',organization.id).order('created_at',{ascending:false}),[]); const rows=data.length?data.map(s=>`<tr><td><strong>${esc(s.name)}</strong></td><td>${esc(s.phone||'-')}</td><td>${esc(s.guardian_phone||'-')}</td><td>${esc(s.batches?.name||'-')}</td><td>৳${Number(s.monthly_fee||0).toLocaleString()}</td><td>${can('students','update')?button('Edit',`edit-student:${s.id}`,'btn btn-sm btn-secondary'):''} ${can('students','delete')?button('Delete',`delete-student:${s.id}`,'btn btn-sm btn-danger'):''}</td></tr>`).join(''):''; await listPage('Students','Student and guardian records.',rows,['Name','Phone','Guardian','Batch','Monthly fee','Actions'],'No students yet',can('students','create')?button('+ Add Student','new-student'):'' ); bindRowActions();}
  async function loadBatches(){const data=await q(sb.from('batches').select('id,name,subject,teacher_name,class_time,room,created_at').eq('organization_id',organization.id).order('created_at',{ascending:false}),[]); const rows=data.length?data.map(b=>`<tr><td><strong>${esc(b.name)}</strong></td><td>${esc(b.subject||'-')}</td><td>${esc(b.teacher_name||'-')}</td><td>${esc(b.class_time||'-')}</td><td>${esc(b.room||'-')}</td><td>${can('batches','update')?button('Edit',`edit-batch:${b.id}`,'btn btn-sm btn-secondary'):''} ${can('batches','delete')?button('Delete',`delete-batch:${b.id}`,'btn btn-sm btn-danger'):''}</td></tr>`).join(''):''; await listPage('Batches','Organize classes and schedules.',rows,['Name','Subject','Teacher','Time','Room','Actions'],'No batches yet',can('batches','create')?button('+ New Batch','new-batch'):'' ); bindRowActions();}
  async function loadAttendance(){const today=new Date().toISOString().slice(0,10); const data=await q(sb.from('attendance').select('id,student_id,attendance_date,present,students(name)').eq('organization_id',organization.id).eq('attendance_date',today).order('created_at',{ascending:false}),[]); const rows=data.length?data.map(a=>`<tr><td><strong>${esc(a.students?.name||'Student')}</strong></td><td>${esc(a.attendance_date)}</td><td><span class="badge ${a.present?'badge-success':'badge-danger'}">${a.present?'Present':'Absent'}</span></td></tr>`).join(''):''; await listPage('Attendance',`Today: ${today}`,rows,['Student','Date','Status'],'No attendance marked today',can('attendance','create')?button('Mark Attendance','new-attendance'):'' );}
  async function loadPayments(){const data=await q(sb.from('payments').select('id,student_id,amount,payment_method,receipt_no,paid_at,students(name)').eq('organization_id',organization.id).order('paid_at',{ascending:false}).limit(100),[]); const rows=data.length?data.map(p=>`<tr><td><strong>${esc(p.students?.name||'Student')}</strong></td><td>৳${Number(p.amount||0).toLocaleString()}</td><td>${esc(p.payment_method||'-')}</td><td>${esc(p.receipt_no||'-')}</td><td>${new Date(p.paid_at).toLocaleDateString()}</td></tr>`).join(''):''; await listPage('Fees & Payments','Recorded fee collections.',rows,['Student','Amount','Method','Receipt','Paid at'],'No payments yet',can('payments','create')?button('+ Record Payment','new-payment'):'' );}
  async function loadExams(){const data=await q(sb.from('exams').select('id,name,subject,exam_date,total_marks,created_at').eq('organization_id',organization.id).order('exam_date',{ascending:false}),[]); const rows=data.length?data.map(e=>`<tr><td><strong>${esc(e.name)}</strong></td><td>${esc(e.subject||'-')}</td><td>${esc(e.exam_date||'-')}</td><td>${Number(e.total_marks||0)}</td><td>${can('results','create')?button('Add Result',`new-result:${e.id}`,'btn btn-sm btn-primary'):''}</td></tr>`).join(''):''; await listPage('Exams','Exam schedule and marks setup.',rows,['Exam','Subject','Date','Total marks','Actions'],'No exams yet',can('exams','create')?button('+ New Exam','new-exam'):'' ); bindRowActions();}
  async function loadResults(){const data=await q(sb.from('results').select('id,marks,student_id,exam_id,created_at,students(name),exams(name,total_marks)').eq('organization_id',organization.id).order('created_at',{ascending:false}).limit(100),[]); const rows=data.length?data.map(r=>`<tr><td>${esc(r.students?.name||'Student')}</td><td>${esc(r.exams?.name||'Exam')}</td><td>${Number(r.marks||0)} / ${Number(r.exams?.total_marks||0)}</td><td>${r.exams?.total_marks?Math.round((Number(r.marks)/Number(r.exams.total_marks))*100):0}%</td></tr>`).join(''):''; await listPage('Results','Student exam performance.',rows,['Student','Exam','Marks','Percent'],'No results yet',can('results','create')?button('+ Add Result','new-result'):'' );}
  async function loadTeachers(){const data=await q(sb.from('teachers').select('id,name,subject,phone,rate_per_class,created_at').eq('organization_id',organization.id).order('created_at',{ascending:false}),[]); const rows=data.length?data.map(t=>`<tr><td><strong>${esc(t.name)}</strong></td><td>${esc(t.subject||'-')}</td><td>${esc(t.phone||'-')}</td><td>৳${Number(t.rate_per_class||0).toLocaleString()}</td><td>${can('teachers','update')?button('Edit',`edit-teacher:${t.id}`,'btn btn-sm btn-secondary'):''} ${can('teachers','delete')?button('Delete',`delete-teacher:${t.id}`,'btn btn-sm btn-danger'):''}</td></tr>`).join(''):''; await listPage('Teachers','Teaching staff.',rows,['Name','Subject','Phone','Rate/class','Actions'],'No teachers yet',can('teachers','create')?button('+ Add Teacher','new-teacher'):'' ); bindRowActions();}
  async function loadNotices(){const data=await q(sb.from('notices').select('id,title,body,created_at').eq('organization_id',organization.id).order('created_at',{ascending:false}),[]); setContent(`<div class="page-head"><div><h1>Notices</h1><p class="subtitle">Announcements for your center.</p></div><div class="actions">${can('notices','create')?button('+ New Notice','new-notice'):''}</div></div>${data.length?data.map(n=>`<div class="card" style="margin-bottom:12px"><div class="section-head"><h2>${esc(n.title)}</h2><span class="subtitle">${new Date(n.created_at).toLocaleDateString()}</span></div><p style="line-height:1.65">${esc(n.body)}</p><div class="actions">${can('notices','update')?button('Edit',`edit-notice:${n.id}`,'btn btn-sm btn-secondary'):''} ${can('notices','delete')?button('Delete',`delete-notice:${n.id}`,'btn btn-sm btn-danger'):''}</div></div>`).join(''):'<div class="empty">No notices yet.</div>'}`); bindRowActions();}
  async function loadTeam(){const data=await q(sb.from('profiles').select('id,full_name,role,created_at').eq('organization_id',organization.id).order('created_at',{ascending:false}),[]); const rows=data.length?data.map(m=>`<tr><td>${esc(m.full_name||'User')}</td><td><span class="badge badge-gray">${esc(m.role)}</span></td><td>${new Date(m.created_at).toLocaleDateString()}</td><td>${m.id===profile.id?'<span class="subtitle">You</span>':button('Change role',`role:${m.id}`,'btn btn-sm btn-secondary')}</td></tr>`).join(''):''; await listPage('Team','Members of your coaching center.',rows,['Member','Role','Joined','Actions'],'No team members yet'); bindRowActions();}
  async function loadBilling(){const usage=await q(sb.from('organization_usage').select('*').eq('organization_id',organization.id).single(),null); const plan=usage?.plan||'free'; const limit=window.eduflowConfig.limits[plan]||50; setContent(`<div class="page-head"><div><h1>Billing</h1><p class="subtitle">Usage and plan status.</p></div></div><div class="grid grid-3"><div class="card hero"><h2>${esc(plan.toUpperCase())}</h2><p class="subtitle">${usage?.subscription_status||'active'}</p><div class="value" style="font-size:34px;margin:12px 0">${usage?.student_count||0}<span style="font-size:14px"> / ${limit} students</span></div></div><div class="card"><h2>Storage</h2><div class="value" style="margin-top:12px">${Number(usage?.storage_mb||0).toFixed(1)} MB</div></div><div class="card"><h2>Billing email</h2><p class="subtitle" style="margin-top:12px">${esc(usage?.billing_email||session.user.email||'Not set')}</p></div></div>`);}
  async function loadSettings(){setContent(`<div class="page-head"><div><h1>Settings</h1><p class="subtitle">Workspace and profile settings.</p></div></div><div class="card" style="max-width:720px"><form id="settings-form"><div class="form-grid"><div class="field"><label>Center name</label><input id="org-name-input" value="${esc(organization.name||'')}" required></div><div class="field"><label>Phone</label><input id="org-phone-input" value="${esc(organization.phone||'')}"></div><div class="field"><label>District</label><input id="org-district-input" value="${esc(organization.district||'')}"></div><div class="field"><label>Your name</label><input id="profile-name-input" value="${esc(profile.full_name||'')}" required></div></div><div class="end-actions"><button class="btn btn-primary">Save changes</button></div></form></div>`); $('settings-form').onsubmit=saveSettings;}
  async function loadAudit(){const data=await q(sb.from('audit_logs').select('created_at,action,metadata,profiles(full_name)').eq('organization_id',organization.id).order('created_at',{ascending:false}).limit(100),[]); const rows=data.length?data.map(l=>`<tr><td>${new Date(l.created_at).toLocaleString()}</td><td>${esc(l.profiles?.full_name||'System')}</td><td>${esc(l.action)}</td><td>${esc(JSON.stringify(l.metadata||{}))}</td></tr>`).join(''):''; await listPage('Audit Log','Security and activity history.',rows,['Time','User','Action','Details'],'No audit entries yet');}

  async function saveSettings(e){e.preventDefault(); const payload={name:$('org-name-input').value.trim(),phone:$('org-phone-input').value.trim(),district:$('org-district-input').value.trim()}; const {error:oe}=await sb.from('organizations').update(payload).eq('id',organization.id); if(oe)return toast(oe.message,'error'); const {error:pe}=await sb.from('profiles').update({full_name:$('profile-name-input').value.trim()}).eq('id',profile.id); if(pe)return toast(pe.message,'error'); organization={...organization,...payload};profile={...profile,full_name:$('profile-name-input').value.trim()};$('org-name').textContent=organization.name;$('user-name').textContent=profile.full_name;$('user-avatar').textContent=profile.full_name.slice(0,1).toUpperCase();await audit('settings_updated',{});toast('Settings saved','success');}

  function openModal(title,html,submit){ modalRoot.innerHTML=`<div class="modal-backdrop" data-close-modal><div class="modal"><div class="modal-head"><h2>${esc(title)}</h2><button class="close" type="button" id="modal-close">✕</button></div>${html}</div></div>`; $('modal-close').onclick=closeModal; modalRoot.querySelector('[data-close-modal]').onclick=e=>{if(e.target===e.currentTarget)closeModal();}; if(submit)submit(); }
  function closeModal(){modalRoot.innerHTML='';}
  async function options(table,labelCol='name',extra=''){const rows=await q(sb.from(table).select(`id,${labelCol}`).eq('organization_id',organization.id).order(labelCol),[]);return rows.map(r=>`<option value="${esc(r.id)}">${esc(r[labelCol])}</option>`).join('');}
  function form(html,handler){openModal('',`<form id="modal-form">${html}<div class="end-actions"><button type="button" class="btn btn-secondary" id="m-cancel">Cancel</button><button class="btn btn-primary">Save</button></div></form>`,()=>{ $('m-cancel').onclick=closeModal;$('modal-form').onsubmit=handler;});}
  async function studentModal(id){const existing=id?await q(sb.from('students').select('*').eq('id',id).eq('organization_id',organization.id).single(),null):null;const batchOpts=await options('batches');form(`<div class="form-grid"><div class="field"><label>Name</label><input id="m-name" required value="${esc(existing?.name||'')}"></div><div class="field"><label>Phone</label><input id="m-phone" value="${esc(existing?.phone||'')}"></div><div class="field"><label>Guardian name</label><input id="m-gname" value="${esc(existing?.guardian_name||'')}"></div><div class="field"><label>Guardian phone</label><input id="m-gphone" value="${esc(existing?.guardian_phone||'')}"></div><div class="field"><label>Batch</label><select id="m-batch"><option value="">No batch</option>${batchOpts}</select></div><div class="field"><label>Monthly fee</label><input id="m-fee" type="number" min="0" step="0.01" value="${Number(existing?.monthly_fee||0)}"></div></div>`,async e=>{e.preventDefault();const data={name:$('m-name').value.trim(),phone:$('m-phone').value.trim()||null,guardian_name:$('m-gname').value.trim()||null,guardian_phone:$('m-gphone').value.trim()||null,batch_id:$('m-batch').value||null,monthly_fee:Number($('m-fee').value||0)};let r=id?await sb.from('students').update(data).eq('id',id).eq('organization_id',organization.id):await sb.from('students').insert({...data,organization_id:organization.id,student_code:`ST-${Date.now().toString().slice(-8)}`});if(r.error)return toast(r.error.message,'error');await audit(id?'student_updated':'student_created',{});closeModal();loadStudents();}); if(existing)$('m-batch').value=existing.batch_id||'';}
  async function batchModal(id){const existing=id?await q(sb.from('batches').select('*').eq('id',id).eq('organization_id',organization.id).single(),null):null;form(`<div class="form-grid"><div class="field"><label>Name</label><input id="m-name" required value="${esc(existing?.name||'')}"></div><div class="field"><label>Subject</label><input id="m-subject" value="${esc(existing?.subject||'')}"></div><div class="field"><label>Teacher</label><input id="m-teacher" value="${esc(existing?.teacher_name||'')}"></div><div class="field"><label>Class time</label><input id="m-time" value="${esc(existing?.class_time||'')}"></div><div class="field"><label>Room</label><input id="m-room" value="${esc(existing?.room||'')}"></div></div>`,async e=>{e.preventDefault();const data={name:$('m-name').value.trim(),subject:$('m-subject').value.trim()||null,teacher_name:$('m-teacher').value.trim()||null,class_time:$('m-time').value.trim()||null,room:$('m-room').value.trim()||null};const r=id?await sb.from('batches').update(data).eq('id',id).eq('organization_id',organization.id):await sb.from('batches').insert({...data,organization_id:organization.id});if(r.error)return toast(r.error.message,'error');closeModal();loadBatches();});}
  async function attendanceModal(){const students=await q(sb.from('students').select('id,name').eq('organization_id',organization.id).order('name'),[]);form(`<div class="field"><label>Student</label><select id="m-student" required>${students.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div><div class="field" style="margin-top:12px"><label>Status</label><select id="m-present"><option value="true">Present</option><option value="false">Absent</option></select></div>`,async e=>{e.preventDefault();const date=new Date().toISOString().slice(0,10);const r=await sb.from('attendance').upsert({organization_id:organization.id,student_id:$('m-student').value,attendance_date:date,present:$('m-present').value==='true'},{onConflict:'student_id,attendance_date'});if(r.error)return toast(r.error.message,'error');closeModal();loadAttendance();});}
  async function paymentModal(){const students=await q(sb.from('students').select('id,name').eq('organization_id',organization.id).order('name'),[]);form(`<div class="form-grid"><div class="field"><label>Student</label><select id="m-student" required>${students.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label>Amount</label><input id="m-amount" type="number" min="0" step="0.01" required></div><div class="field"><label>Payment method</label><select id="m-method"><option>cash</option><option>bKash</option><option>Nagad</option><option>bank</option><option>card</option><option>other</option></select></div><div class="field"><label>Receipt no.</label><input id="m-receipt"></div></div>`,async e=>{e.preventDefault();const r=await sb.from('payments').insert({organization_id:organization.id,student_id:$('m-student').value,amount:Number($('m-amount').value),payment_method:$('m-method').value,receipt_no:$('m-receipt').value.trim()||null,paid_at:new Date().toISOString()});if(r.error)return toast(r.error.message,'error');closeModal();loadPayments();});}
  async function examModal(){form(`<div class="form-grid"><div class="field"><label>Name</label><input id="m-name" required></div><div class="field"><label>Subject</label><input id="m-subject"></div><div class="field"><label>Exam date</label><input id="m-date" type="date"></div><div class="field"><label>Total marks</label><input id="m-total" type="number" min="1" value="100"></div></div>`,async e=>{e.preventDefault();const r=await sb.from('exams').insert({organization_id:organization.id,name:$('m-name').value.trim(),subject:$('m-subject').value.trim()||null,exam_date:$('m-date').value||null,total_marks:Number($('m-total').value||100)});if(r.error)return toast(r.error.message,'error');closeModal();loadExams();});}
  async function resultModal(examId){const [students,exams]=await Promise.all([q(sb.from('students').select('id,name').eq('organization_id',organization.id).order('name'),[]),q(sb.from('exams').select('id,name,total_marks').eq('organization_id',organization.id).order('exam_date',{ascending:false}),[])]);form(`<div class="field"><label>Student</label><select id="m-student">${students.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div><div class="field" style="margin-top:12px"><label>Exam</label><select id="m-exam">${exams.map(x=>`<option value="${x.id}" ${examId===x.id?'selected':''}>${esc(x.name)} (${Number(x.total_marks||0)})</option>`).join('')}</select></div><div class="field" style="margin-top:12px"><label>Marks</label><input id="m-marks" type="number" min="0" required></div>`,async e=>{e.preventDefault();const r=await sb.from('results').insert({organization_id:organization.id,student_id:$('m-student').value,exam_id:$('m-exam').value,marks:Number($('m-marks').value)});if(r.error)return toast(r.error.message,'error');closeModal();loadResults();});}
  async function teacherModal(id){const existing=id?await q(sb.from('teachers').select('*').eq('id',id).eq('organization_id',organization.id).single(),null):null;form(`<div class="form-grid"><div class="field"><label>Name</label><input id="m-name" required value="${esc(existing?.name||'')}"></div><div class="field"><label>Subject</label><input id="m-subject" value="${esc(existing?.subject||'')}"></div><div class="field"><label>Phone</label><input id="m-phone" value="${esc(existing?.phone||'')}"></div><div class="field"><label>Rate / class</label><input id="m-rate" type="number" min="0" step="0.01" value="${Number(existing?.rate_per_class||0)}"></div></div>`,async e=>{e.preventDefault();const data={name:$('m-name').value.trim(),subject:$('m-subject').value.trim()||null,phone:$('m-phone').value.trim()||null,rate_per_class:Number($('m-rate').value||0)};const r=id?await sb.from('teachers').update(data).eq('id',id).eq('organization_id',organization.id):await sb.from('teachers').insert({...data,organization_id:organization.id});if(r.error)return toast(r.error.message,'error');closeModal();loadTeachers();});}
  async function noticeModal(){form(`<div class="field"><label>Title</label><input id="m-title" required></div><div class="field" style="margin-top:12px"><label>Body</label><textarea id="m-body" rows="6" required></textarea></div>`,async e=>{e.preventDefault();const r=await sb.from('notices').insert({organization_id:organization.id,title:$('m-title').value.trim(),body:$('m-body').value.trim()});if(r.error)return toast(r.error.message,'error');closeModal();loadNotices();});}
  async function audit(action,metadata){await sb.from('audit_logs').insert({organization_id:organization.id,user_id:profile.id,action,metadata:metadata||{},user_agent:navigator.userAgent});}
  function bindRowActions(){document.querySelectorAll('[data-action]').forEach(el=>el.onclick=()=>{const [a,id]=el.dataset.action.split(':'); if(a==='edit-student')studentModal(id);else if(a==='delete-student')remove('students',id,loadStudents);else if(a==='edit-batch')batchModal(id);else if(a==='delete-batch')remove('batches',id,loadBatches);else if(a==='edit-teacher')teacherModal(id);else if(a==='delete-teacher')remove('teachers',id,loadTeachers);else if(a==='new-result')resultModal(id);else if(a==='role')changeRole(id);});}
  async function remove(table,id,reload){if(!confirm('Delete this record?'))return;const r=await sb.from(table).delete().eq('id',id).eq('organization_id',organization.id);if(r.error)return toast(r.error.message,'error');await audit(`${table}_deleted`,{id});reload();}
  async function changeRole(id){const role=prompt('New role: admin, teacher, or staff');if(!['admin','teacher','staff'].includes(role))return;const r=await sb.from('profiles').update({role}).eq('id',id).eq('organization_id',organization.id);if(r.error)return toast(r.error.message,'error');await audit('member_role_changed',{id,role});loadTeam();}
  async function updateUsage(){const usage=await q(sb.from('organization_usage').select('plan,student_count').eq('organization_id',organization.id).single(),null);const plan=usage?.plan||'free',limit=window.eduflowConfig.limits[plan]||50; $('usage-text').textContent=`${plan[0].toUpperCase()+plan.slice(1)} • ${usage?.student_count||0}/${limit} students`; $('usage-badge').style.setProperty('--usage-pct',`${Math.min(100,Math.round(((usage?.student_count||0)/limit)*100))}%`);}

  window.EduFlow={navigateTo,toast,closeModal,get organization(){return organization;},get profile(){return profile;},get role(){return currentRole;}};
  document.addEventListener('DOMContentLoaded',init);
})();
