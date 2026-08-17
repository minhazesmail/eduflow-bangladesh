
'use strict';

const SUPABASE_URL = 'https://tljxhsspwabeslpbyiif.supabase.co';
const SUPABASE_KEY = 'sb_publishable_LhIRXury0u3KuwbT7RApdQ_rsMFM-tm';

let client = null;
let session = null;
let profile = null;
let page = 'dashboard';
let authMode = 'signin';
let dataset = {students:[], batches:[], teachers:[], payments:[], exams:[], results:[], attendance:[], notices:[]};

const $ = (id) => document.getElementById(id);
const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money = (v) => '৳' + Number(v || 0).toLocaleString('en-BD');
const today = () => new Date().toISOString().slice(0,10);
const orgId = () => profile?.organization_id;

function supa() {
  if (!window.supabase) throw new Error('Supabase library did not load. Please refresh.');
  if (!client) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
}

function toast(message) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function showError(err) {
  console.error(err);
  toast(err?.message || String(err));
}

function authView(message='') {
  document.body.innerHTML = `
    <div style="min-height:100vh;background:#f5f7fb;display:grid;place-items:center;padding:20px">
      <div class="card" style="width:min(480px,100%);padding:30px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
          <div class="logo">E</div><div><h2 style="margin:0">EduFlow</h2><div class="subtitle">Bangladesh • Coaching Center OS</div></div>
        </div>
        <h1 style="font-size:25px;margin-bottom:6px">${authMode==='signin'?'Welcome back':'Create your coaching center'}</h1>
        <div class="subtitle" style="margin-bottom:18px">${authMode==='signin'?'Sign in to your EduFlow workspace.':'Create a private cloud workspace in a few seconds.'}</div>
        ${message ? `<div class="notice" style="margin-bottom:14px">${esc(message)}</div>` : ''}
        ${authMode==='signup'?`
          <div class="field"><label>Your name</label><input id="auth_name" placeholder="e.g. Minhaz EsmAil"></div>
          <div class="field" style="margin-top:12px"><label>Coaching center name</label><input id="auth_org" placeholder="e.g. ABC Coaching Center"></div>
        `:''}
        <div class="field" style="margin-top:12px"><label>Email</label><input id="auth_email" type="email" autocomplete="email" placeholder="you@example.com"></div>
        <div class="field" style="margin-top:12px"><label>Password</label><input id="auth_password" type="password" autocomplete="${authMode==='signin'?'current-password':'new-password'}" placeholder="At least 6 characters"></div>
        <div class="actions" style="margin-top:18px">
          <button class="btn btn-primary" style="flex:1" onclick="${authMode==='signin'?'signIn()':'signUp()'}">${authMode==='signin'?'Sign in':'Create account'}</button>
          <button class="btn btn-secondary" onclick="toggleAuth()">${authMode==='signin'?'Create account':'Back to sign in'}</button>
        </div>
        <div class="subtitle" style="font-size:12px;margin-top:15px">Your student and financial data is stored in your private cloud workspace.</div>
      </div>
    </div>`;
}

function toggleAuth() {
  authMode = authMode === 'signin' ? 'signup' : 'signin';
  authView();
}

async function signUp() {
  try {
    const name = $('auth_name').value.trim();
    const org = $('auth_org').value.trim();
    const email = $('auth_email').value.trim();
    const password = $('auth_password').value;
    if (!name || !org || !email || password.length < 6) throw new Error('Please complete all fields. Password must be at least 6 characters.');
    const {data, error} = await supa().auth.signUp({
      email, password,
      options: { data: { full_name:name, organization_name:org } }
    });
    if (error) throw error;
    if (!data.session) {
      authView('Account created. Please check your email to confirm your account, then sign in.');
      return;
    }
    await boot();
  } catch (e) { showError(e); }
}

async function signIn() {
  try {
    const email = $('auth_email').value.trim();
    const password = $('auth_password').value;
    if (!email || !password) throw new Error('Enter your email and password.');
    const {error} = await supa().auth.signInWithPassword({email,password});
    if (error) throw error;
    await boot();
  } catch (e) { showError(e); }
}

async function logout() {
  await supa().auth.signOut();
  session = null; profile = null;
  dataset = {students:[], batches:[], teachers:[], payments:[], exams:[], results:[], attendance:[], notices:[]};
  authMode = 'signin';
  authView('You have been signed out.');
}

async function loadProfile() {
  const {data, error} = await supa().from('profiles').select('id,organization_id,full_name,role,organizations(name,phone,district)').eq('id', session.user.id).maybeSingle();
  if (error) throw error;
  if (!data?.organization_id) throw new Error('Your account has no coaching-center workspace yet. Please contact support.');
  profile = data;
}

async function loadData() {
  const o = orgId();
  const results = await Promise.all([
    supa().from('students').select('*,batches(name)').eq('organization_id',o).order('created_at',{ascending:false}),
    supa().from('batches').select('*').eq('organization_id',o).order('created_at',{ascending:false}),
    supa().from('teachers').select('*').eq('organization_id',o).order('created_at',{ascending:false}),
    supa().from('payments').select('*,students(name,student_code)').eq('organization_id',o).order('paid_at',{ascending:false}),
    supa().from('exams').select('*').eq('organization_id',o).order('exam_date',{ascending:false,nullsFirst:false}),
    supa().from('results').select('*,students(name,student_code),exams(name,total_marks)').eq('organization_id',o).order('created_at',{ascending:false}),
    supa().from('attendance').select('*').eq('organization_id',o).order('attendance_date',{ascending:false}),
    supa().from('notices').select('*').eq('organization_id',o).order('created_at',{ascending:false})
  ]);
  const labels = ['students','batches','teachers','payments','exams','results','attendance','notices'];
  results.forEach((r,i)=>{ if (r.error) throw r.error; dataset[labels[i]] = r.data || []; });
  enrich();
}

function enrich() {
  dataset.students = dataset.students.map(s => {
    const a = dataset.attendance.filter(x => x.student_id===s.id);
    const pct = a.length ? Math.round(a.filter(x=>x.present).length/a.length*100) : 0;
    const res = dataset.results.filter(x=>x.student_id===s.id);
    const latest = res.length ? Number(res[0].marks || 0) / Number(res[0].exams?.total_marks || 100) * 100 : 0;
    const paid = dataset.payments.filter(x=>x.student_id===s.id).reduce((n,x)=>n+Number(x.amount||0),0);
    return {...s, attendancePct:pct, latestResult:Math.round(latest), paid};
  });
}

function risk(s) {
  return (s.attendancePct < 70 || s.latestResult < 50 || s.paid < Number(s.monthly_fee||0)) ? 'At Risk' : 'Healthy';
}

function layout() {
  document.body.innerHTML = `
    <div class="app">
      <aside class="sidebar">
        <div class="brand"><div class="logo">E</div><div><strong>EduFlow</strong><small>Bangladesh • Coaching OS</small></div></div>
        <nav class="nav">
          ${nav('dashboard','Dashboard','▦')}
          ${nav('students','Students','♙')}
          ${nav('batches','Batches','▤')}
          ${nav('attendance','Attendance','✓')}
          ${nav('fees','Fees & Payments','৳')}
          ${nav('exams','Exams & Results','▣')}
          ${nav('teachers','Teachers','♟')}
          ${nav('notices','Notices','◈')}
          ${nav('settings','Settings','⚙')}
        </nav>
        <div class="sidebar-bottom"><div class="subtitle" style="color:#9ca3af">Workspace</div><strong>${esc(profile?.organizations?.name||'My Coaching Center')}</strong></div>
      </aside>
      <main class="main">
        <header class="topbar">
          <strong>${pageTitle()}</strong>
          <div class="right"><span class="subtitle">${esc(profile?.full_name||'Admin')}</span><button class="btn btn-secondary btn-sm" onclick="logout()">Sign out</button></div>
        </header>
        <section class="container" id="content"></section>
      </main>
    </div>`;
  render();
}

function nav(id,label,ic){ return `<button class="${page===id?'active':''}" onclick="go('${id}')"><span>${ic}</span>${label}</button>`; }
function pageTitle(){ return ({dashboard:'Dashboard',students:'Students',batches:'Batches',attendance:'Attendance',fees:'Fees & Payments',exams:'Exams & Results',teachers:'Teachers',notices:'Notices',settings:'Settings'})[page]; }
function go(p){ page=p; render(); }

function stat(label,value,note,ic){ return `<div class="card stat"><div><div class="label">${label}</div><div class="value">${value}</div><div class="subtitle">${note}</div></div><div class="iconbox">${ic}</div></div>`; }

function render() {
  const c = $('content');
  if (!c) return;
  const views = {dashboard,dashboard:dashboard,students,batches,attendance,fees,exams,teachers,notices,settings};
  c.innerHTML = (views[page] || dashboard)();
}

function dashboard() {
  const collected = dataset.payments.reduce((n,p)=>n+Number(p.amount||0),0);
  const due = dataset.students.reduce((n,s)=>n+Math.max(0,Number(s.monthly_fee||0)-s.paid),0);
  const atRisk = dataset.students.filter(s=>risk(s)==='At Risk').length;
  const todayRecords = dataset.attendance.filter(a=>a.attendance_date===today());
  const todayPct = todayRecords.length ? Math.round(todayRecords.filter(a=>a.present).length/todayRecords.length*100) : 0;
  return `<div class="page-head"><div><h1>Good afternoon 👋</h1><div class="subtitle">Live overview for ${esc(profile.organizations?.name||'your coaching center')}.</div></div><button class="btn btn-primary" onclick="openStudent()">＋ Add student</button></div>
  <div class="grid grid-4">
    ${stat('Students',dataset.students.length,`${atRisk} need attention`,'♙')}
    ${stat('Today attendance',todayPct+'%',todayRecords.length+' records','✓')}
    ${stat('Collected',money(collected),dataset.payments.length+' payments','৳')}
    ${stat('Outstanding',money(due),'current month estimate','!')}
  </div>
  <div class="grid grid-2" style="margin-top:18px">
    <div class="card"><h2>Students needing attention</h2><div class="subtitle">Based on attendance, results and fees.</div>
      <div class="list" style="margin-top:12px">${dataset.students.filter(s=>risk(s)==='At Risk').slice(0,6).map(s=>`<div class="list-item"><div><strong>${esc(s.name)}</strong><div class="subtitle">${esc(s.batches?.name||'Unassigned')} • ${s.attendancePct}% attendance</div></div><span class="badge badge-danger">${s.latestResult||0}%</span></div>`).join('')||'<div class="empty">No students need attention 🎉</div>'}</div>
    </div>
    <div class="card"><h2>Recent payments</h2><div class="subtitle">Latest collection activity.</div>
      <div class="list" style="margin-top:12px">${dataset.payments.slice(0,6).map(p=>`<div class="list-item"><div><strong>${esc(p.students?.name||'Student')}</strong><div class="subtitle">${esc(p.payment_method)} • ${new Date(p.paid_at).toLocaleDateString('en-BD')}</div></div><strong>${money(p.amount)}</strong></div>`).join('')||'<div class="empty">No payments yet.</div>'}</div>
    </div>
  </div>
  <div class="grid grid-3" style="margin-top:18px">
    <div class="card"><h2>Batches</h2><div class="value" style="margin-top:10px">${dataset.batches.length}</div><div class="subtitle">active batches</div></div>
    <div class="card"><h2>Teachers</h2><div class="value" style="margin-top:10px">${dataset.teachers.length}</div><div class="subtitle">teachers in workspace</div></div>
    <div class="card"><h2>Upcoming exams</h2><div class="value" style="margin-top:10px">${dataset.exams.length}</div><div class="subtitle">exams created</div></div>
  </div>`;
}

function students() {
  return `<div class="page-head"><div><h1>Students</h1><div class="subtitle">Student records are stored in Supabase.</div></div><div class="actions"><input class="search" placeholder="Search…" oninput="filterRows(this.value)"><button class="btn btn-primary" onclick="openStudent()">＋ Add student</button></div></div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Student</th><th>Batch</th><th>Phone</th><th>Attendance</th><th>Latest result</th><th>Paid</th><th>Status</th><th></th></tr></thead><tbody id="studentRows">${studentRows(dataset.students)}</tbody></table></div></div>`;
}
function studentRows(list) {
  return list.map(s=>`<tr><td><strong>${esc(s.name)}</strong><div class="subtitle">${esc(s.student_code)} • ${esc(s.guardian_name||'No guardian')}</div></td><td>${esc(s.batches?.name||'Unassigned')}</td><td>${esc(s.phone||'—')}</td><td>${s.attendancePct}%</td><td>${s.latestResult||0}%</td><td>${money(s.paid)} / ${money(s.monthly_fee)}</td><td><span class="badge ${risk(s)==='At Risk'?'badge-danger':'badge-success'}">${risk(s)}</span></td><td><button class="btn btn-secondary btn-sm" onclick="openStudent('${s.id}')">Edit</button></td></tr>`).join('') || '<tr><td colspan="8"><div class="empty">No students yet.</div></td></tr>';
}
function filterRows(q) {
  const n = q.toLowerCase();
  $('studentRows').innerHTML = studentRows(dataset.students.filter(s=>(s.name+' '+s.student_code+' '+(s.phone||'')+' '+(s.guardian_name||'')).toLowerCase().includes(n)));
}
function openStudent(id='') {
  const s = id ? dataset.students.find(x=>x.id===id) : null;
  modal(s?'Edit student':'Add student', `<div class="form-grid">
    <div class="field"><label>Name</label><input id="m_name" value="${esc(s?.name||'')}"></div>
    <div class="field"><label>Student ID</label><input id="m_code" value="${esc(s?.student_code||('ST-'+Date.now().toString().slice(-6)))}" ${s?'disabled':''}></div>
    <div class="field"><label>Phone</label><input id="m_phone" value="${esc(s?.phone||'')}"></div>
    <div class="field"><label>Guardian</label><input id="m_guardian" value="${esc(s?.guardian_name||'')}"></div>
    <div class="field"><label>Guardian phone</label><input id="m_gphone" value="${esc(s?.guardian_phone||'')}"></div>
    <div class="field"><label>Batch</label><select id="m_batch"><option value="">Unassigned</option>${dataset.batches.map(b=>`<option value="${b.id}" ${s?.batch_id===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div>
    <div class="field"><label>Monthly fee</label><input id="m_fee" type="number" value="${Number(s?.monthly_fee||0)}"></div>
  </div><div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveStudent('${id}')">Save</button></div>`);
}
async function saveStudent(id) {
  try {
    const payload = {organization_id:orgId(),name:$('m_name').value.trim(),student_code:$('m_code').value.trim(),phone:$('m_phone').value.trim()||null,guardian_name:$('m_guardian').value.trim()||null,guardian_phone:$('m_gphone').value.trim()||null,batch_id:$('m_batch').value||null,monthly_fee:Number($('m_fee').value||0)};
    if (!payload.name || !payload.student_code) throw new Error('Name and Student ID are required.');
    const q = id ? supa().from('students').update(payload).eq('id',id).eq('organization_id',orgId()) : supa().from('students').insert(payload);
    const {error} = await q; if (error) throw error;
    closeModal(); await loadData(); render(); toast(id?'Student updated.':'Student added.');
  } catch(e){showError(e);}
}

function batches(){return `<div class="page-head"><div><h1>Batches</h1><div class="subtitle">Manage classes, schedule and rooms.</div></div><button class="btn btn-primary" onclick="openBatch()">＋ New batch</button></div><div class="grid grid-2">${dataset.batches.map(b=>`<div class="card"><span class="badge badge-blue">${esc(b.subject||'General')}</span><h2 style="margin-top:10px">${esc(b.name)}</h2><div class="subtitle">${esc(b.teacher_name||'No teacher')} • ${esc(b.class_time||'No time')}</div><div class="grid grid-2" style="margin-top:18px"><div><div class="subtitle">Room</div><strong>${esc(b.room||'—')}</strong></div><div><div class="subtitle">Students</div><strong>${dataset.students.filter(s=>s.batch_id===b.id).length}</strong></div></div></div>`).join('')||'<div class="empty">No batches yet.</div>'}</div>`;}
function openBatch(){modal('New batch',`<div class="form-grid"><div class="field"><label>Name</label><input id="b_name"></div><div class="field"><label>Subject</label><input id="b_subject"></div><div class="field"><label>Teacher</label><select id="b_teacher"><option value="">No teacher</option>${dataset.teachers.map(t=>`<option>${esc(t.name)}</option>`).join('')}</select></div><div class="field"><label>Time</label><input id="b_time" value="08:00 AM"></div><div class="field"><label>Room</label><input id="b_room" value="Room 101"></div></div><div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveBatch()">Create</button></div>`);}
async function saveBatch(){try{const p={organization_id:orgId(),name:$('b_name').value.trim(),subject:$('b_subject').value.trim()||null,teacher_name:$('b_teacher').value||null,class_time:$('b_time').value.trim()||null,room:$('b_room').value.trim()||null};if(!p.name)throw new Error('Batch name is required.');const {error}=await supa().from('batches').insert(p);if(error)throw error;closeModal();await loadData();render();toast('Batch created.')}catch(e){showError(e)}}

function teachers(){return `<div class="page-head"><div><h1>Teachers</h1><div class="subtitle">Teacher directory.</div></div><button class="btn btn-primary" onclick="openTeacher()">＋ Add teacher</button></div><div class="grid grid-3">${dataset.teachers.map(t=>`<div class="card"><h2>${esc(t.name)}</h2><div class="subtitle">${esc(t.subject||'')}</div><div style="margin-top:14px">Rate/class: <strong>${money(t.rate_per_class)}</strong></div></div>`).join('')||'<div class="empty">No teachers yet.</div>'}</div>`;}
function openTeacher(){modal('Add teacher',`<div class="form-grid"><div class="field"><label>Name</label><input id="t_name"></div><div class="field"><label>Subject</label><input id="t_subject"></div><div class="field"><label>Phone</label><input id="t_phone"></div><div class="field"><label>Rate/class</label><input id="t_rate" type="number" value="0"></div></div><div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveTeacher()">Save</button></div>`);}
async function saveTeacher(){try{const p={organization_id:orgId(),name:$('t_name').value.trim(),subject:$('t_subject').value.trim()||null,phone:$('t_phone').value.trim()||null,rate_per_class:Number($('t_rate').value||0)};if(!p.name)throw new Error('Teacher name is required.');const {error}=await supa().from('teachers').insert(p);if(error)throw error;closeModal();await loadData();render();toast('Teacher added.')}catch(e){showError(e)}}

function fees(){const total=dataset.payments.reduce((n,p)=>n+Number(p.amount||0),0);return `<div class="page-head"><div><h1>Fees & Payments</h1><div class="subtitle">Real payment records in the cloud database.</div></div><button class="btn btn-primary" onclick="openPayment()">＋ Record payment</button></div><div class="grid grid-3">${stat('Collected',money(total),dataset.payments.length+' payments','৳')}${stat('Students',dataset.students.length,'enrolled','♙')}${stat('Outstanding',money(dataset.students.reduce((n,s)=>n+Math.max(0,Number(s.monthly_fee||0)-s.paid),0)),'current month estimate','!')}</div><div class="card" style="margin-top:18px"><div class="table-wrap"><table><thead><tr><th>Receipt</th><th>Student</th><th>Amount</th><th>Method</th><th>Date</th></tr></thead><tbody>${dataset.payments.map(p=>`<tr><td>${esc(p.receipt_no||p.id.slice(0,8))}</td><td>${esc(p.students?.name||'Student')}</td><td>${money(p.amount)}</td><td>${esc(p.payment_method)}</td><td>${new Date(p.paid_at).toLocaleDateString('en-BD')}</td></tr>`).join('')||'<tr><td colspan="5"><div class="empty">No payments yet.</div></td></tr>'}</tbody></table></div></div>`;}
function openPayment(){modal('Record payment',`<div class="form-grid"><div class="field"><label>Student</label><select id="p_student">${dataset.students.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label>Amount</label><input id="p_amount" type="number" value="1500"></div><div class="field"><label>Method</label><select id="p_method"><option>bKash</option><option>Nagad</option><option>Cash</option><option>Bank</option></select></div><div class="field"><label>Receipt #</label><input id="p_receipt" value="RCP-${Date.now().toString().slice(-6)}"></div></div><div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="savePayment()">Save</button></div>`);}
async function savePayment(){try{const p={organization_id:orgId(),student_id:$('p_student').value,amount:Number($('p_amount').value||0),payment_method:$('p_method').value,receipt_no:$('p_receipt').value.trim()||null};if(!p.student_id||p.amount<=0)throw new Error('Enter a valid payment.');const {error}=await supa().from('payments').insert(p);if(error)throw error;closeModal();await loadData();render();toast('Payment recorded.')}catch(e){showError(e)}}

function attendance(){const students=dataset.students;const d=today();return `<div class="page-head"><div><h1>Attendance</h1><div class="subtitle">Mark today's attendance and save it to the cloud.</div></div><button class="btn btn-primary" onclick="saveAttendance()">Save attendance</button></div><div class="card"><div class="table-wrap"><table><thead><tr><th>Student</th><th>Batch</th><th>Attendance</th><th>Today</th></tr></thead><tbody>${students.map(s=>{const a=dataset.attendance.find(x=>x.student_id===s.id&&x.attendance_date===d);return `<tr><td><strong>${esc(s.name)}</strong></td><td>${esc(s.batches?.name||'Unassigned')}</td><td>${s.attendancePct}%</td><td><input class="att-check" type="checkbox" data-student="${s.id}" ${a?a.present?'checked':'':'checked'}></td></tr>`}).join('')||'<tr><td colspan="4"><div class="empty">No students yet.</div></td></tr>'}</tbody></table></div></div>`;}
async function saveAttendance(){try{for(const box of document.querySelectorAll('.att-check')){const sid=box.dataset.student, present=box.checked;const existing=dataset.attendance.find(a=>a.student_id===sid&&a.attendance_date===today());if(existing){const {error}=await supa().from('attendance').update({present}).eq('id',existing.id).eq('organization_id',orgId());if(error)throw error;}else{const {error}=await supa().from('attendance').insert({organization_id:orgId(),student_id:sid,attendance_date:today(),present});if(error)throw error;}}await loadData();render();toast('Attendance saved.')}catch(e){showError(e)}}

function exams(){return `<div class="page-head"><div><h1>Exams & Results</h1><div class="subtitle">Create exams and enter student marks.</div></div><button class="btn btn-primary" onclick="openExam()">＋ Create exam</button></div><div class="grid grid-2">${dataset.exams.map(e=>`<div class="card"><span class="badge badge-blue">${esc(e.subject||'General')}</span><h2 style="margin-top:10px">${esc(e.name)}</h2><div class="subtitle">${e.exam_date||'No date'} • ${e.total_marks} marks</div><button class="btn btn-primary btn-sm" style="margin-top:16px" onclick="enterMarks('${e.id}')">Enter marks</button></div>`).join('')||'<div class="empty">No exams yet.</div>'}</div>`;}
function openExam(){modal('Create exam',`<div class="form-grid"><div class="field"><label>Name</label><input id="e_name"></div><div class="field"><label>Subject</label><input id="e_subject"></div><div class="field"><label>Date</label><input id="e_date" type="date" value="${today()}"></div><div class="field"><label>Total marks</label><input id="e_total" type="number" value="100"></div></div><div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveExam()">Create</button></div>`);}
async function saveExam(){try{const p={organization_id:orgId(),name:$('e_name').value.trim(),subject:$('e_subject').value.trim()||null,exam_date:$('e_date').value||null,total_marks:Number($('e_total').value||100)};if(!p.name)throw new Error('Exam name is required.');const {error}=await supa().from('exams').insert(p);if(error)throw error;closeModal();await loadData();render();toast('Exam created.')}catch(e){showError(e)}}
function enterMarks(examId){const exam=dataset.exams.find(e=>e.id===examId);if(!exam)return;modal('Enter marks',`<div class="notice">Exam: <strong>${esc(exam.name)}</strong> • Total: ${exam.total_marks}</div><div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>Student</th><th>Marks</th></tr></thead><tbody>${dataset.students.map(s=>{const r=dataset.results.find(x=>x.exam_id===examId&&x.student_id===s.id);return `<tr><td>${esc(s.name)}</td><td><input class="mark-box" data-student="${s.id}" value="${r?.marks??''}" type="number" min="0" max="${exam.total_marks}"></td></tr>`}).join('')}</tbody></table></div><div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveMarks('${examId}')">Save marks</button></div>`);}
async function saveMarks(examId){try{const exam=dataset.exams.find(e=>e.id===examId);for(const box of document.querySelectorAll('.mark-box')){const value=box.value.trim();const sid=box.dataset.student;const old=dataset.results.find(r=>r.exam_id===examId&&r.student_id===sid);if(!value){if(old)await supa().from('results').delete().eq('id',old.id).eq('organization_id',orgId());continue;}const marks=Number(value);if(marks<0||marks>Number(exam.total_marks))throw new Error(`Marks must be between 0 and ${exam.total_marks}.`);if(old){const {error}=await supa().from('results').update({marks}).eq('id',old.id).eq('organization_id',orgId());if(error)throw error;}else{const {error}=await supa().from('results').insert({organization_id:orgId(),exam_id:examId,student_id:sid,marks});if(error)throw error;}}closeModal();await loadData();render();toast('Marks saved.')}catch(e){showError(e)}}

function notices(){return `<div class="page-head"><div><h1>Notices</h1><div class="subtitle">Internal announcements for your center.</div></div><button class="btn btn-primary" onclick="openNotice()">＋ New notice</button></div><div class="card"><div class="list">${dataset.notices.map(n=>`<div class="list-item"><div><strong>${esc(n.title)}</strong><div class="subtitle">${esc(n.body)}</div></div><span class="subtitle">${new Date(n.created_at).toLocaleDateString('en-BD')}</span></div>`).join('')||'<div class="empty">No notices yet.</div>'}</div></div>`;}
function openNotice(){modal('New notice',`<div class="field"><label>Title</label><input id="n_title"></div><div class="field" style="margin-top:12px"><label>Message</label><textarea id="n_body" rows="6"></textarea></div><div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveNotice()">Publish</button></div>`);}
async function saveNotice(){try{const p={organization_id:orgId(),title:$('n_title').value.trim(),body:$('n_body').value.trim()};if(!p.title||!p.body)throw new Error('Title and message are required.');const {error}=await supa().from('notices').insert(p);if(error)throw error;closeModal();await loadData();render();toast('Notice published.')}catch(e){showError(e)}}

function settings(){const o=profile?.organizations||{};return `<div class="page-head"><div><h1>Settings</h1><div class="subtitle">Manage your coaching center.</div></div></div><div class="card"><div class="form-grid"><div class="field"><label>Center name</label><input id="s_name" value="${esc(o.name||'')}"></div><div class="field"><label>Phone</label><input id="s_phone" value="${esc(o.phone||'')}"></div><div class="field"><label>District</label><input id="s_district" value="${esc(o.district||'')}"></div></div><button class="btn btn-primary" style="margin-top:18px" onclick="saveSettings()">Save settings</button></div>`;}
async function saveSettings(){try{const p={name:$('s_name').value.trim(),phone:$('s_phone').value.trim()||null,district:$('s_district').value.trim()||null};if(!p.name)throw new Error('Center name is required.');const {error}=await supa().from('organizations').update(p).eq('id',orgId());if(error)throw error;await loadProfile();render();toast('Settings saved.')}catch(e){showError(e)}}

function modal(title, body) {
  const old = $('modalRoot'); if (old) old.remove();
  const el = document.createElement('div'); el.id='modalRoot'; el.className='modal-backdrop';
  el.innerHTML = `<div class="modal"><div class="modal-head"><h2>${title}</h2><button class="close" onclick="closeModal()">×</button></div>${body}</div>`;
  document.body.appendChild(el);
}
function closeModal(){ $('modalRoot')?.remove(); }

async function boot() {
  try {
    const {data,error} = await supa().auth.getSession();
    if (error) throw error;
    session = data.session;
    if (!session) { authView(); return; }
    await loadProfile();
    await loadData();
    layout();
  } catch(e) {
    document.body.innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;background:#f5f7fb;padding:20px"><div class="card" style="max-width:620px"><h1>EduFlow could not start</h1><div class="notice">${esc(e.message)}</div><div class="actions" style="margin-top:16px"><button class="btn btn-primary" onclick="location.reload()">Reload</button><button class="btn btn-secondary" onclick="logout()">Sign out</button></div></div></div>`;
    console.error(e);
  }
}

window.bootstrap = boot;
window.startApp = boot;
window.addEventListener('load', boot);
