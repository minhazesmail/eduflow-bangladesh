const SUPABASE_URL="https://tljxhsspwabeslpbyiif.supabase.co";
const SUPABASE_KEY="sb_publishable_LhIRXury0u3KuwbT7RApdQ_rsMFM-tm";
let sb,session,profile,page="dashboard",authMode="signin";
let data={students:[],batches:[],teachers:[],payments:[],exams:[],results:[],attendance:[],notices:[]};

const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const money=v=>"৳"+Number(v||0).toLocaleString("en-BD");
const orgId=()=>profile?.organization_id;
const nowDate=()=>new Date().toISOString().slice(0,10);

function client(){if(!window.supabase)throw new Error("Supabase did not load. Refresh the page.");if(!sb)sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return sb;}
function toast(msg){document.querySelector(".toast")?.remove();const e=document.createElement("div");e.className="toast";e.textContent=msg;document.body.appendChild(e);setTimeout(()=>e.remove(),2400)}
function nav(id,label,ico){return `<button class="${page===id?"active":""}" onclick="go('${id}')"><span class="ico">${ico}</span>${label}</button>`}
function mobileNav(){return `<nav class="mobile-nav">${nav("dashboard","Home","⌂")}${nav("students","Students","♙")}${nav("attendance","Attend","✓")}${nav("fees","Fees","৳")}${nav("exams","Exams","▣")}</nav>`}

function authScreen(message=""){
 document.body.innerHTML=`<div class="auth-shell"><div class="card auth-card">
  <div class="auth-brand"><div class="logo">E</div><div><strong style="font-size:18px">EduFlow</strong><div class="subtitle">Bangladesh • Coaching OS</div></div></div>
  <h1>${authMode==="signin"?"Welcome back":"Create your center"}</h1>
  <div class="sub">${authMode==="signin"?"Run your coaching center from one place.":"Start your private cloud workspace."}</div>
  ${message?`<div class="notice" style="margin-bottom:14px">${esc(message)}</div>`:""}
  ${authMode==="signup"?`<div class="field"><label>Your name</label><input id="auth_name" placeholder="Full name"></div><div class="field" style="margin-top:12px"><label>Coaching center name</label><input id="auth_org" placeholder="ABC Coaching Center"></div>`:""}
  <div class="field" style="margin-top:12px"><label>Email</label><input id="auth_email" type="email" placeholder="you@example.com"></div>
  <div class="field" style="margin-top:12px"><label>Password</label><input id="auth_password" type="password" placeholder="At least 6 characters"></div>
  <div class="actions" style="margin-top:18px"><button class="btn btn-primary" style="flex:1" onclick="${authMode==="signin"?"signin()":"signup()"}">${authMode==="signin"?"Sign in":"Create account"}</button><button class="btn btn-secondary" onclick="toggleAuth()">${authMode==="signin"?"Create account":"Back"}</button></div>
  <div class="subtitle" style="font-size:11px;margin-top:15px">Your coaching-center data stays isolated to your workspace.</div>
 </div></div>`;
}

function toggleAuth(){authMode=authMode==="signin"?"signup":"signin";authScreen()}
async function signup(){try{
 const email=$("auth_email").value.trim(),pass=$("auth_password").value,name=$("auth_name").value.trim(),org=$("auth_org").value.trim();
 if(!name||!org||!email||pass.length<6)throw new Error("Complete all fields. Password must be at least 6 characters.");
 const {data,error}=await client().auth.signUp({email,password:pass,options:{data:{full_name:name,organization_name:org}}});if(error)throw error;
 if(!data.session){authScreen("Account created. Check your email, confirm your account, then sign in.");return}await boot();
}catch(e){toast(e.message)}}
async function signin(){try{const email=$("auth_email").value.trim(),password=$("auth_password").value;if(!email||!password)throw new Error("Enter email and password.");const {error}=await client().auth.signInWithPassword({email,password});if(error)throw error;await boot()}catch(e){toast(e.message)}}
async function logout(){await client().auth.signOut();session=null;profile=null;authMode="signin";authScreen("Signed out.");}

async function boot(){
 try{
  const {data:s,error}=await client().auth.getSession();if(error)throw error;session=s.session;
  if(!session){authScreen();return}
  const {data:p,error:pe}=await client().from("profiles").select("id,organization_id,full_name,role,organizations(name,phone,district)").eq("id",session.user.id).maybeSingle();if(pe)throw pe;
  if(!p?.organization_id)throw new Error("Your account has no coaching-center workspace.");
  profile=p;await loadData();renderApp();
 }catch(e){console.error(e);document.body.innerHTML=`<div class="auth-shell"><div class="card auth-card"><h1>EduFlow could not start</h1><div class="notice" style="margin-top:12px">${esc(e.message)}</div><div class="actions" style="margin-top:16px"><button class="btn btn-primary" onclick="location.reload()">Reload</button><button class="btn btn-secondary" onclick="logout()">Sign out</button></div></div></div>`}
}

async function loadData(){
 const o=orgId();
 const req=[
  client().from("students").select("*,batches(name)").eq("organization_id",o).order("created_at",{ascending:false}),
  client().from("batches").select("*").eq("organization_id",o).order("created_at",{ascending:false}),
  client().from("teachers").select("*").eq("organization_id",o).order("created_at",{ascending:false}),
  client().from("payments").select("*,students(name,student_code)").eq("organization_id",o).order("paid_at",{ascending:false}),
  client().from("exams").select("*").eq("organization_id",o).order("exam_date",{ascending:false,nullsFirst:false}),
  client().from("results").select("*,students(name,student_code),exams(name,total_marks)").eq("organization_id",o).order("created_at",{ascending:false}),
  client().from("attendance").select("*").eq("organization_id",o).order("attendance_date",{ascending:false}),
  client().from("notices").select("*").eq("organization_id",o).order("created_at",{ascending:false})
 ];
 const out=await Promise.all(req);const keys=["students","batches","teachers","payments","exams","results","attendance","notices"];
 out.forEach((r,i)=>{if(r.error)throw r.error;data[keys[i]]=r.data||[]});
 data.students=data.students.map(s=>{
  const a=data.attendance.filter(x=>x.student_id===s.id),pct=a.length?Math.round(a.filter(x=>x.present).length/a.length*100):0;
  const r=data.results.filter(x=>x.student_id===s.id),last=r.length?Math.round(Number(r[0].marks)/Number(r[0].exams?.total_marks||100)*100):0;
  const paid=data.payments.filter(x=>x.student_id===s.id).reduce((n,x)=>n+Number(x.amount||0),0);
  return {...s,attendancePct:pct,latestResult:last,paid}
 })
}

function renderApp(){
 document.body.innerHTML=`<div class="app">
  <aside class="sidebar" id="sidebar">
   <div class="brand"><div class="logo">E</div><div><strong>EduFlow</strong><small>Bangladesh • Coaching OS</small></div></div>
   <div class="workspace"><div class="eyebrow">Workspace</div><strong>${esc(profile.organizations?.name||"My Center")}</strong></div>
   <nav class="nav"><div class="nav-section">Manage</div>
    ${nav("dashboard","Dashboard","⌂")}${nav("students","Students","♙")}${nav("batches","Batches","▤")}${nav("attendance","Attendance","✓")}${nav("fees","Fees & Payments","৳")}${nav("exams","Exams & Results","▣")}${nav("teachers","Teachers","♟")}
    <div class="nav-section">Communicate</div>${nav("notices","Notices","◈")}${nav("settings","Settings","⚙")}
   </nav>
   <div class="sidebar-bottom"><div class="profile-mini"><div class="avatar">${esc((profile.full_name||"A").slice(0,1).toUpperCase())}</div><div style="min-width:0"><strong style="font-size:12px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(profile.full_name||"Admin")}</strong><span style="font-size:10px;color:#8b96a9">${esc(profile.role||"owner")}</span></div></div></div>
  </aside>
  <main class="main">
   <header class="topbar"><div class="topbar-left"><button class="mobile-toggle" onclick="toggleSidebar()">☰</button><div class="page-title">${title()}</div></div><div class="top-actions"><button class="btn btn-secondary btn-sm hide-mobile" onclick="refresh()">↻ Refresh</button><span class="subtitle hide-mobile">${esc(profile.full_name||"Admin")}</span><button class="btn btn-secondary btn-sm" onclick="logout()">Sign out</button></div></header>
   <section class="container" id="content"></section>
  </main>${mobileNav()}</div>`;
 render();
}
function toggleSidebar(){$("sidebar")?.classList.toggle("open")}
function title(){return ({dashboard:"Dashboard",students:"Students",batches:"Batches",attendance:"Attendance",fees:"Fees & Payments",exams:"Exams & Results",teachers:"Teachers",notices:"Notices",settings:"Settings"})[page]||"EduFlow"}
function go(p){page=p;toggleSidebarClose();render()}
function toggleSidebarClose(){$("sidebar")?.classList.remove("open")}
async function refresh(){try{await loadData();render();toast("Everything is up to date.")}catch(e){toast(e.message)}}

function render(){const c=$("content");if(!c)return;const views={dashboard,students,batches,attendance,fees,exams,teachers,notices,settings};c.innerHTML=(views[page]||dashboard)()}

function stat(label,value,note,ic){return `<div class="card stat"><div><div class="label">${label}</div><div class="value">${value}</div><div class="subtitle">${note}</div></div><div class="iconbox">${ic}</div></div>`}

function dashboard(){
 const collected=data.payments.reduce((n,p)=>n+Number(p.amount||0),0),due=data.students.reduce((n,s)=>n+Math.max(0,Number(s.monthly_fee||0)-s.paid),0),risk=data.students.filter(s=>s.attendancePct<70||s.latestResult<50).length;
 const today=data.attendance.filter(a=>a.attendance_date===nowDate()),att=today.length?Math.round(today.filter(x=>x.present).length/today.length*100):0;
 return `<div class="page-head"><div><h1>Good afternoon, ${esc(profile.full_name?.split(" ")[0]||"there")} 👋</h1><div class="subtitle">Here’s what needs your attention today.</div></div><div class="actions"><button class="btn btn-secondary" onclick="refresh()">↻ Refresh</button><button class="btn btn-primary" onclick="openStudent()">＋ Add student</button></div></div>
 <div class="card hero"><div class="subtitle">Today at ${esc(profile.organizations?.name||"your center")}</div><h2 style="margin-top:6px">Run the center from one calm dashboard.</h2><div class="quick-grid">
 <button class="quick" onclick="go('students')"><strong>${data.students.length} students</strong><span>Manage records</span></button>
 <button class="quick" onclick="go('attendance')"><strong>${att}% attendance</strong><span>Take today's roll call</span></button>
 <button class="quick" onclick="go('fees')"><strong>${money(collected)}</strong><span>Collection this month</span></button>
 <button class="quick" onclick="go('exams')"><strong>${data.exams.length} exams</strong><span>Enter or review marks</span></button></div></div>
 <div class="grid grid-4" style="margin-top:16px">${stat("Students",data.students.length,`${risk} need attention`,"♙")}${stat("Attendance",att+"%",today.length+" records today","✓")}${stat("Collected",money(collected),data.payments.length+" payments","৳")}${stat("Outstanding",money(due),"estimated current dues","!")}</div>
 <div class="split" style="margin-top:16px">
  <div class="card"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><h2>Students needing attention</h2><div class="subtitle">Attendance, results or unpaid fees.</div></div><span class="badge badge-danger">${risk}</span></div><div class="list">${data.students.filter(s=>s.attendancePct<70||s.latestResult<50).slice(0,6).map(s=>`<div class="list-item"><div><strong>${esc(s.name)}</strong><div class="subtitle">${esc(s.batches?.name||"Unassigned")} • ${s.attendancePct}% attendance</div></div><span class="badge badge-warning">${s.latestResult||0}%</span></div>`).join("")||'<div class="empty">No students need attention 🎉</div>'}</div></div>
  <div class="card"><h2>Recent payments</h2><div class="subtitle">Latest financial activity.</div><div class="list">${data.payments.slice(0,6).map(p=>`<div class="list-item"><div><strong>${esc(p.students?.name||"Student")}</strong><div class="subtitle">${esc(p.payment_method)} • ${new Date(p.paid_at).toLocaleDateString("en-BD")}</div></div><strong>${money(p.amount)}</strong></div>`).join("")||'<div class="empty">No payments yet.</div>'}</div></div>
 </div>`;
}

function students(){
 return `<div class="page-head"><div><h1>Students</h1><div class="subtitle">Search, enroll and manage every student.</div></div><div class="actions"><input class="search" placeholder="Search students…" oninput="filterStudents(this.value)"><button class="btn btn-primary" onclick="openStudent()">＋ Add student</button></div></div>
 <div class="card"><div class="table-wrap"><table><thead><tr><th>Student</th><th>Batch</th><th>Phone</th><th>Attendance</th><th>Result</th><th>Paid</th><th>Status</th><th></th></tr></thead><tbody id="studentRows">${studentRows(data.students)}</tbody></table></div></div>`;
}
function studentRows(list){return list.map(s=>`<tr><td><strong>${esc(s.name)}</strong><div class="subtitle">${esc(s.student_code)} • ${esc(s.guardian_name||"No guardian")}</div></td><td>${esc(s.batches?.name||"Unassigned")}</td><td>${esc(s.phone||"—")}</td><td>${s.attendancePct}%</td><td>${s.latestResult||0}%</td><td>${money(s.paid)} / ${money(s.monthly_fee)}</td><td><span class="badge ${(s.attendancePct<70||s.latestResult<50)?"badge-danger":"badge-success"}">${(s.attendancePct<70||s.latestResult<50)?"Needs attention":"Healthy"}</span></td><td><button class="btn btn-secondary btn-sm" onclick="openStudent('${s.id}')">Edit</button></td></tr>`).join("")||'<tr><td colspan="8"><div class="empty">No students yet.</div></td></tr>'}
function filterStudents(q){const n=q.toLowerCase();$("studentRows").innerHTML=studentRows(data.students.filter(s=>(s.name+" "+s.student_code+" "+(s.phone||"")+" "+(s.guardian_name||"")).toLowerCase().includes(n)))}
function openStudent(id=""){const s=id?data.students.find(x=>x.id===id):null;modal(s?"Edit student":"Add student",`<div class="form-grid">
 <div class="field"><label>Full name</label><input id="f_name" value="${esc(s?.name||"")}"></div>
 <div class="field"><label>Student ID</label><input id="f_code" value="${esc(s?.student_code||"ST-"+Date.now().toString().slice(-6))}" ${s?"disabled":""}></div>
 <div class="field"><label>Phone</label><input id="f_phone" value="${esc(s?.phone||"")}"></div>
 <div class="field"><label>Guardian</label><input id="f_guardian" value="${esc(s?.guardian_name||"")}"></div>
 <div class="field"><label>Guardian phone</label><input id="f_gphone" value="${esc(s?.guardian_phone||"")}"></div>
 <div class="field"><label>Batch</label><select id="f_batch"><option value="">Unassigned</option>${data.batches.map(b=>`<option value="${b.id}" ${s?.batch_id===b.id?"selected":""}>${esc(b.name)}</option>`).join("")}</select></div>
 <div class="field"><label>Monthly fee</label><input id="f_fee" type="number" value="${Number(s?.monthly_fee||0)}"></div></div>
 <div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveStudent('${id}')">Save student</button></div>`)}
async function saveStudent(id){try{const p={organization_id:orgId(),name:$("f_name").value.trim(),student_code:$("f_code").value.trim(),phone:$("f_phone").value.trim()||null,guardian_name:$("f_guardian").value.trim()||null,guardian_phone:$("f_gphone").value.trim()||null,batch_id:$("f_batch").value||null,monthly_fee:Number($("f_fee").value||0)};if(!p.name||!p.student_code)throw new Error("Name and student ID are required.");const q=id?client().from("students").update(p).eq("id",id).eq("organization_id",orgId()):client().from("students").insert(p);const {error}=await q;if(error)throw error;closeModal();await loadData();render();toast(id?"Student updated.":"Student added.")}catch(e){toast(e.message)}}

function batches(){
 return `<div class="page-head"><div><h1>Batches</h1><div class="subtitle">Keep schedules simple and visible.</div></div><button class="btn btn-primary" onclick="openBatch()">＋ New batch</button></div>
 <div class="grid grid-2">${data.batches.map(b=>`<div class="card"><span class="badge badge-blue">${esc(b.subject||"General")}</span><h2 style="margin-top:9px">${esc(b.name)}</h2><div class="subtitle">${esc(b.teacher_name||"No teacher")} • ${esc(b.class_time||"No time")}</div><div class="grid grid-2" style="margin-top:16px"><div><div class="subtitle">Room</div><strong>${esc(b.room||"—")}</strong></div><div><div class="subtitle">Students</div><strong>${data.students.filter(s=>s.batch_id===b.id).length}</strong></div></div></div>`).join("")||'<div class="card empty">No batches yet.</div>'}</div>`}
function openBatch(){modal("New batch",`<div class="form-grid"><div class="field"><label>Batch name</label><input id="b_name"></div><div class="field"><label>Subject</label><input id="b_subject"></div><div class="field"><label>Teacher</label><select id="b_teacher"><option value="">No teacher</option>${data.teachers.map(t=>`<option>${esc(t.name)}</option>`).join("")}</select></div><div class="field"><label>Time</label><input id="b_time" value="08:00 AM"></div><div class="field"><label>Room</label><input id="b_room" value="Room 101"></div></div><div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveBatch()">Create batch</button></div>`)}
async function saveBatch(){try{const p={organization_id:orgId(),name:$("b_name").value.trim(),subject:$("b_subject").value.trim()||null,teacher_name:$("b_teacher").value||null,class_time:$("b_time").value.trim()||null,room:$("b_room").value.trim()||null};if(!p.name)throw new Error("Batch name is required.");const {error}=await client().from("batches").insert(p);if(error)throw error;closeModal();await loadData();render();toast("Batch created.")}catch(e){toast(e.message)}}

function attendance(){
 const d=nowDate();return `<div class="page-head"><div><h1>Attendance</h1><div class="subtitle">One screen. One class. One saved roll call.</div></div><button class="btn btn-primary" onclick="saveAttendance()">Save attendance</button></div>
 <div class="notice">Today is <strong>${d}</strong>. Students are checked present by default—untick anyone absent.</div>
 <div class="card" style="margin-top:16px"><div class="table-wrap"><table><thead><tr><th>Student</th><th>Batch</th><th>Overall</th><th>Present today</th></tr></thead><tbody>${data.students.map(s=>{const a=data.attendance.find(x=>x.student_id===s.id&&x.attendance_date===d);return `<tr><td><strong>${esc(s.name)}</strong><div class="subtitle">${esc(s.student_code)}</div></td><td>${esc(s.batches?.name||"Unassigned")}</td><td>${s.attendancePct}%</td><td><input class="att-check" type="checkbox" data-student="${s.id}" ${a?a.present?"checked":"":"checked"}></td></tr>`}).join("")||'<tr><td colspan="4"><div class="empty">Add students to start attendance.</div></td></tr>'}</tbody></table></div></div>`}
async function saveAttendance(){try{for(const box of document.querySelectorAll(".att-check")){const sid=box.dataset.student,present=box.checked,old=data.attendance.find(a=>a.student_id===sid&&a.attendance_date===nowDate());if(old){const {error}=await client().from("attendance").update({present}).eq("id",old.id).eq("organization_id",orgId());if(error)throw error}else{const {error}=await client().from("attendance").insert({organization_id:orgId(),student_id:sid,attendance_date:nowDate(),present});if(error)throw error}}await loadData();render();toast("Attendance saved.")}catch(e){toast(e.message)}}

function fees(){
 const total=data.payments.reduce((n,p)=>n+Number(p.amount||0),0);return `<div class="page-head"><div><h1>Fees & Payments</h1><div class="subtitle">Record collections and keep payment history tidy.</div></div><button class="btn btn-primary" onclick="openPayment()">＋ Record payment</button></div>
 <div class="grid grid-3">${stat("Collected",money(total),data.payments.length+" payments","৳")}${stat("Students",data.students.length,"enrolled","♙")}${stat("Outstanding",money(data.students.reduce((n,s)=>n+Math.max(0,Number(s.monthly_fee||0)-s.paid),0)),"estimated current dues","!")}</div>
 <div class="card" style="margin-top:16px"><div class="table-wrap"><table><thead><tr><th>Receipt</th><th>Student</th><th>Amount</th><th>Method</th><th>Date</th></tr></thead><tbody>${data.payments.map(p=>`<tr><td>${esc(p.receipt_no||p.id.slice(0,8))}</td><td>${esc(p.students?.name||"Student")}</td><td><strong>${money(p.amount)}</strong></td><td>${esc(p.payment_method)}</td><td>${new Date(p.paid_at).toLocaleDateString("en-BD")}</td></tr>`).join("")||'<tr><td colspan="5"><div class="empty">No payments yet.</div></td></tr>'}</tbody></table></div></div>`}
function openPayment(){modal("Record payment",`<div class="form-grid"><div class="field"><label>Student</label><select id="p_student">${data.students.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></div><div class="field"><label>Amount</label><input id="p_amount" type="number" value="1500"></div><div class="field"><label>Method</label><select id="p_method"><option>bKash</option><option>Nagad</option><option>Cash</option><option>Bank</option></select></div><div class="field"><label>Receipt number</label><input id="p_receipt" value="RCP-${Date.now().toString().slice(-6)}"></div></div><div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="savePayment()">Save payment</button></div>`)}
async function savePayment(){try{const p={organization_id:orgId(),student_id:$("p_student").value,amount:Number($("p_amount").value||0),payment_method:$("p_method").value,receipt_no:$("p_receipt").value.trim()||null};if(!p.student_id||p.amount<=0)throw new Error("Enter a valid payment.");const {error}=await client().from("payments").insert(p);if(error)throw error;closeModal();await loadData();render();toast("Payment recorded.")}catch(e){toast(e.message)}}

function exams(){return `<div class="page-head"><div><h1>Exams & Results</h1><div class="subtitle">Create an exam, enter marks, see performance.</div></div><button class="btn btn-primary" onclick="openExam()">＋ Create exam</button></div><div class="grid grid-2">${data.exams.map(e=>`<div class="card"><span class="badge badge-blue">${esc(e.subject||"General")}</span><h2 style="margin-top:9px">${esc(e.name)}</h2><div class="subtitle">${e.exam_date||"No date"} • ${e.total_marks} marks</div><button class="btn btn-primary btn-sm" style="margin-top:14px" onclick="enterMarks('${e.id}')">Enter marks</button></div>`).join("")||'<div class="card empty">No exams yet.</div>'}</div>`}
function openExam(){modal("Create exam",`<div class="form-grid"><div class="field"><label>Exam name</label><input id="e_name"></div><div class="field"><label>Subject</label><input id="e_subject"></div><div class="field"><label>Date</label><input id="e_date" type="date" value="${nowDate()}"></div><div class="field"><label>Total marks</label><input id="e_total" type="number" value="100"></div></div><div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveExam()">Create exam</button></div>`)}
async function saveExam(){try{const p={organization_id:orgId(),name:$("e_name").value.trim(),subject:$("e_subject").value.trim()||null,exam_date:$("e_date").value||null,total_marks:Number($("e_total").value||100)};if(!p.name)throw new Error("Exam name is required.");const {error}=await client().from("exams").insert(p);if(error)throw error;closeModal();await loadData();render();toast("Exam created.")}catch(e){toast(e.message)}}
function enterMarks(id){const e=data.exams.find(x=>x.id===id);modal("Enter marks",`<div class="notice">Exam: <strong>${esc(e.name)}</strong> • Total marks: ${e.total_marks}</div><div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>Student</th><th>Marks</th></tr></thead><tbody>${data.students.map(s=>{const old=data.results.find(r=>r.exam_id===id&&r.student_id===s.id);return `<tr><td>${esc(s.name)}</td><td><input class="mark-box" data-student="${s.id}" type="number" min="0" max="${e.total_marks}" value="${old?.marks??""}"></td></tr>`}).join("")}</tbody></table></div><div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveMarks('${id}')">Save marks</button></div>`)}
async function saveMarks(examId){try{const e=data.exams.find(x=>x.id===examId);for(const box of document.querySelectorAll(".mark-box")){const v=box.value.trim(),sid=box.dataset.student,old=data.results.find(r=>r.exam_id===examId&&r.student_id===sid);if(v===""){if(old)await client().from("results").delete().eq("id",old.id).eq("organization_id",orgId());continue}const marks=Number(v);if(marks<0||marks>Number(e.total_marks))throw new Error("Marks are outside the allowed range.");if(old){const {error}=await client().from("results").update({marks}).eq("id",old.id).eq("organization_id",orgId());if(error)throw error}else{const {error}=await client().from("results").insert({organization_id:orgId(),exam_id:examId,student_id:sid,marks});if(error)throw error}}closeModal();await loadData();render();toast("Marks saved.")}catch(err){toast(err.message)}}

function teachers(){return `<div class="page-head"><div><h1>Teachers</h1><div class="subtitle">Keep teacher information in one place.</div></div><button class="btn btn-primary" onclick="openTeacher()">＋ Add teacher</button></div><div class="grid grid-3">${data.teachers.map(t=>`<div class="card"><div style="display:flex;gap:12px;align-items:center"><div class="iconbox">${esc((t.name||"?").slice(0,1))}</div><div><h2>${esc(t.name)}</h2><div class="subtitle">${esc(t.subject||"")}</div></div></div><div style="margin-top:16px">Rate/class: <strong>${money(t.rate_per_class)}</strong></div></div>`).join("")||'<div class="card empty">No teachers yet.</div>'}</div>`}
function openTeacher(){modal("Add teacher",`<div class="form-grid"><div class="field"><label>Name</label><input id="t_name"></div><div class="field"><label>Subject</label><input id="t_subject"></div><div class="field"><label>Phone</label><input id="t_phone"></div><div class="field"><label>Rate / class</label><input id="t_rate" type="number" value="0"></div></div><div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveTeacher()">Save</button></div>`)}
async function saveTeacher(){try{const p={organization_id:orgId(),name:$("t_name").value.trim(),subject:$("t_subject").value.trim()||null,phone:$("t_phone").value.trim()||null,rate_per_class:Number($("t_rate").value||0)};if(!p.name)throw new Error("Teacher name is required.");const {error}=await client().from("teachers").insert(p);if(error)throw error;closeModal();await loadData();render();toast("Teacher added.")}catch(e){toast(e.message)}}

function notices(){return `<div class="page-head"><div><h1>Notices</h1><div class="subtitle">Internal announcements for your center.</div></div><button class="btn btn-primary" onclick="openNotice()">＋ New notice</button></div><div class="card"><div class="list">${data.notices.map(n=>`<div class="list-item"><div><strong>${esc(n.title)}</strong><div class="subtitle">${esc(n.body)}</div></div><span class="subtitle">${new Date(n.created_at).toLocaleDateString("en-BD")}</span></div>`).join("")||'<div class="empty">No notices yet.</div>'}</div></div>`}
function openNotice(){modal("New notice",`<div class="field"><label>Title</label><input id="n_title"></div><div class="field" style="margin-top:12px"><label>Message</label><textarea id="n_body" rows="6"></textarea></div><div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveNotice()">Publish</button></div>`)}
async function saveNotice(){try{const p={organization_id:orgId(),title:$("n_title").value.trim(),body:$("n_body").value.trim()};if(!p.title||!p.body)throw new Error("Title and message are required.");const {error}=await client().from("notices").insert(p);if(error)throw error;closeModal();await loadData();render();toast("Notice published.")}catch(e){toast(e.message)}}

function settings(){const o=profile.organizations||{};return `<div class="page-head"><div><h1>Settings</h1><div class="subtitle">Center profile and workspace information.</div></div></div><div class="grid grid-2"><div class="card"><h2>Center profile</h2><div class="form-grid" style="margin-top:16px"><div class="field"><label>Center name</label><input id="s_name" value="${esc(o.name||"")}"></div><div class="field"><label>Phone</label><input id="s_phone" value="${esc(o.phone||"")}"></div><div class="field"><label>District</label><input id="s_district" value="${esc(o.district||"")}"></div></div><button class="btn btn-primary" style="margin-top:18px" onclick="saveSettings()">Save changes</button></div><div class="card"><h2>Workspace</h2><div class="list" style="margin-top:10px"><div class="list-item"><span>Plan</span><span class="badge badge-success">Free</span></div><div class="list-item"><span>Students</span><strong>${data.students.length}</strong></div><div class="list-item"><span>Batches</span><strong>${data.batches.length}</strong></div><div class="list-item"><span>Teachers</span><strong>${data.teachers.length}</strong></div></div></div></div>`}
async function saveSettings(){try{const p={name:$("s_name").value.trim(),phone:$("s_phone").value.trim()||null,district:$("s_district").value.trim()||null};if(!p.name)throw new Error("Center name is required.");const {error}=await client().from("organizations").update(p).eq("id",orgId());if(error)throw error;const {data:p2,error:pe}=await client().from("profiles").select("id,organization_id,full_name,role,organizations(name,phone,district)").eq("id",session.user.id).single();if(pe)throw pe;profile=p2;renderApp();toast("Settings saved.")}catch(e){toast(e.message)}}

function modal(title,body){closeModal();const e=document.createElement("div");e.id="modalRoot";e.className="modal-backdrop";e.innerHTML=`<div class="modal"><div class="modal-head"><h2>${title}</h2><button class="close" onclick="closeModal()">×</button></div>${body}</div>`;document.body.appendChild(e)}
function closeModal(){$("modalRoot")?.remove()}

window.bootstrap=boot;
window.addEventListener("load",boot);
