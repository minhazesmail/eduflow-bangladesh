const seed = {
  students: [
    {id:"ST-1001", name:"Md. Fahim Rahman", phone:"01711000001", guardian:"Abdul Rahman", batch:"HSC Physics A", fee:1500, paid:1500, attendance:92, result:87, status:"Active"},
    {id:"ST-1002", name:"Nusrat Jahan", phone:"01711000002", guardian:"M. Jahan", batch:"HSC Physics A", fee:1500, paid:1500, attendance:96, result:91, status:"Active"},
    {id:"ST-1003", name:"Siam Ahmed", phone:"01711000003", guardian:"Kamrul Ahmed", batch:"HSC Physics B", fee:1500, paid:500, attendance:61, result:54, status:"At Risk"},
    {id:"ST-1004", name:"Tanjim Hasan", phone:"01711000004", guardian:"Hasan Ali", batch:"Admission Math", fee:1800, paid:1800, attendance:88, result:78, status:"Active"},
    {id:"ST-1005", name:"Rifat Karim", phone:"01711000005", guardian:"Karim Uddin", batch:"Admission Math", fee:1800, paid:0, attendance:67, result:63, status:"At Risk"},
    {id:"ST-1006", name:"Sadia Islam", phone:"01711000006", guardian:"M. Islam", batch:"HSC Chemistry", fee:1500, paid:1500, attendance:94, result:89, status:"Active"}
  ],
  batches: [
    {id:"B-01", name:"HSC Physics A", subject:"Physics", teacher:"Rahman Sir", time:"08:00 AM", room:"Room 201", students:75},
    {id:"B-02", name:"HSC Physics B", subject:"Physics", teacher:"Rahman Sir", time:"10:00 AM", room:"Room 202", students:62},
    {id:"B-03", name:"Admission Math", subject:"Math", teacher:"Hasan Sir", time:"04:00 PM", room:"Room 101", students:80},
    {id:"B-04", name:"HSC Chemistry", subject:"Chemistry", teacher:"Nadia Ma'am", time:"06:00 PM", room:"Room 202", students:71}
  ],
  teachers: [
    {id:"T-01", name:"Abdul Rahman", subject:"Physics", phone:"01811000001", classes:46, rate:1200},
    {id:"T-02", name:"Hasan Mahmud", subject:"Mathematics", phone:"01811000002", classes:42, rate:1100},
    {id:"T-03", name:"Nadia Akter", subject:"Chemistry", phone:"01811000003", classes:39, rate:1000}
  ],
  exams: [
    {id:"EX-01", name:"August Monthly Exam", subject:"Physics", date:"2026-08-15", total:100, participants:142},
    {id:"EX-02", name:"Admission Model Test 01", subject:"Mathematics", date:"2026-08-18", total:100, participants:80}
  ],
  payments: [
    {id:"RCP-0821", student:"Md. Fahim Rahman", amount:1500, date:"2026-08-03", method:"bKash", status:"Paid"},
    {id:"RCP-0822", student:"Nusrat Jahan", amount:1500, date:"2026-08-04", method:"Cash", status:"Paid"},
    {id:"RCP-0823", student:"Siam Ahmed", amount:500, date:"2026-08-05", method:"Nagad", status:"Paid"},
    {id:"RCP-0824", student:"Tanjim Hasan", amount:1800, date:"2026-08-06", method:"bKash", status:"Paid"}
  ]
};

let state = JSON.parse(localStorage.getItem("eduflow-state") || "null") || seed;
let currentPage = "dashboard";

const icon = {
  dashboard:"▦", students:"♙", batches:"▤", attendance:"✓", fees:"৳", exams:"▣",
  teachers:"♟", notices:"◈", settings:"⚙"
};

function save(){ localStorage.setItem("eduflow-state", JSON.stringify(state)); }
function money(n){ return "৳" + Number(n||0).toLocaleString("en-BD"); }
function esc(s){ return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); }
function toast(msg){ const el=document.createElement("div"); el.className="toast"; el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),2200); }

function render(){
  document.getElementById("app").innerHTML = `
  <div class="app">
    <aside class="sidebar" id="sidebar">
      <div class="brand"><div class="logo">E</div><div><strong>EduFlow</strong><small>Bangladesh • Coaching OS</small></div></div>
      <nav class="nav">
        ${nav("dashboard","Dashboard")}
        ${nav("students","Students")}
        ${nav("batches","Batches")}
        ${nav("attendance","Attendance")}
        ${nav("fees","Fees & Payments")}
        ${nav("exams","Exams & Results")}
        ${nav("teachers","Teachers")}
        ${nav("notices","Notices")}
        ${nav("settings","Settings")}
      </nav>
      <div class="sidebar-bottom">
        <div style="font-size:12px;color:#9ca3af">Demo institution</div>
        <div style="font-weight:700;margin-top:4px">ABC Coaching Center</div>
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div style="display:flex;align-items:center;gap:12px"><button class="mobile-menu" onclick="toggleSidebar()">☰</button><strong>${pageTitle()}</strong></div>
        <div class="right"><span style="color:var(--muted);font-size:13px">Admin</span><button class="btn btn-secondary btn-sm" onclick="resetDemo()">Reset demo</button></div>
      </header>
      <section class="container">${page()}</section>
    </main>
  </div>`;
}
function nav(id,label){ return `<button class="${currentPage===id?"active":""}" onclick="go('${id}')"><span>${icon[id]}</span>${label}</button>`; }
function pageTitle(){ return ({dashboard:"Dashboard",students:"Students",batches:"Batches",attendance:"Attendance",fees:"Fees & Payments",exams:"Exams & Results",teachers:"Teachers",notices:"Notices",settings:"Settings"})[currentPage]; }
function go(p){ currentPage=p; render(); window.scrollTo(0,0); }
function toggleSidebar(){document.getElementById("sidebar")?.classList.toggle("open");}
function resetDemo(){ if(confirm("Reset all demo data?")){state=JSON.parse(JSON.stringify(seed));save();render();toast("Demo data reset");}}

function page(){
  if(currentPage==="dashboard") return dashboard();
  if(currentPage==="students") return students();
  if(currentPage==="batches") return batches();
  if(currentPage==="attendance") return attendance();
  if(currentPage==="fees") return fees();
  if(currentPage==="exams") return exams();
  if(currentPage==="teachers") return teachers();
  if(currentPage==="notices") return notices();
  return settings();
}

function dashboard(){
  const total=state.students.length, active=state.students.filter(s=>s.status==="Active").length;
  const collected=state.payments.reduce((a,p)=>a+Number(p.amount),0);
  const outstanding=state.students.reduce((a,s)=>a+Math.max(0,s.fee-s.paid),0);
  const risk=state.students.filter(s=>s.status==="At Risk").length;
  return `<div class="page-head"><div><h1>Good afternoon 👋</h1><div class="subtitle">Here's what is happening at ABC Coaching Center today.</div></div><button class="btn btn-primary" onclick="openStudentModal()">+ Add student</button></div>
  <div class="grid grid-4">
    ${stat("Students",total,"♙")}
    ${stat("Today's attendance","91%","✓")}
    ${stat("Collected this month",money(collected),"৳")}
    ${stat("Outstanding",money(outstanding),"!")}
  </div>
  <div class="grid grid-2" style="margin-top:18px">
    <div class="card"><div style="display:flex;justify-content:space-between"><div><h2>Monthly collection</h2><div class="subtitle">August 2026</div></div><span class="badge badge-success">+12.4%</span></div>
      <div class="chart">${[52,68,60,74,81,66,92].map((v,i)=>`<div class="bar" style="height:${v}%"><b>${money([52,68,60,74,81,66,92][i]*1000)}</b><span>${["12","13","14","15","16","17","18"][i]}</span></div>`).join("")}</div>
    </div>
    <div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><div><h2>Students needing attention</h2><div class="subtitle">Based on attendance + results + fees</div></div><span class="badge badge-danger">${risk} at risk</span></div>
      <div class="list" style="margin-top:12px">${state.students.filter(s=>s.status==="At Risk").map(s=>`<div class="list-item"><div><strong>${esc(s.name)}</strong><div class="subtitle">${esc(s.batch)} • ${s.attendance}% attendance</div></div><span class="badge badge-danger">${s.result}%</span></div>`).join("") || '<div class="empty">No students at risk 🎉</div>'}</div>
    </div>
  </div>
  <div class="grid grid-3" style="margin-top:18px">
    <div class="card"><h2>Today's classes</h2><div class="list" style="margin-top:12px">${state.batches.slice(0,3).map(b=>`<div class="list-item"><div><strong>${esc(b.name)}</strong><div class="subtitle">${esc(b.teacher)} • ${esc(b.room)}</div></div><span class="badge badge-blue">${b.time}</span></div>`).join("")}</div></div>
    <div class="card"><h2>Fee collection</h2><div style="font-size:30px;font-weight:800;margin-top:14px">${money(collected)}</div><div class="subtitle">from ${state.payments.length} recorded payments</div><div class="progress" style="margin-top:18px"><span style="width:82%"></span></div><div class="subtitle" style="margin-top:7px">82% of expected collection</div></div>
    <div class="card"><h2>Upcoming exams</h2><div class="list" style="margin-top:12px">${state.exams.map(e=>`<div class="list-item"><div><strong>${esc(e.name)}</strong><div class="subtitle">${esc(e.subject)} • ${e.participants} students</div></div><span>${e.date.slice(5)}</span></div>`).join("")}</div></div>
  </div>`;
}
function stat(label,value,ic){return `<div class="card stat"><div><div class="label">${label}</div><div class="value">${value}</div></div><div class="iconbox">${ic}</div></div>`;}

function students(){
 return `<div class="page-head"><div><h1>Students</h1><div class="subtitle">Manage admissions, profiles, attendance and performance.</div></div><div class="actions"><input class="search" id="studentSearch" placeholder="Search students..." oninput="filterStudents(this.value)"><button class="btn btn-primary" onclick="openStudentModal()">+ Add student</button></div></div>
 <div class="card"><div class="table-wrap"><table><thead><tr><th>Student</th><th>Batch</th><th>Phone</th><th>Attendance</th><th>Result</th><th>Fees</th><th>Status</th><th></th></tr></thead><tbody id="studentRows">${studentRows(state.students)}</tbody></table></div></div>`;
}
function studentRows(list){return list.map(s=>`<tr><td><strong>${esc(s.name)}</strong><div class="subtitle">${s.id} • Guardian: ${esc(s.guardian)}</div></td><td>${esc(s.batch)}</td><td>${esc(s.phone)}</td><td><strong>${s.attendance}%</strong></td><td>${s.result}%</td><td>${money(s.paid)} / ${money(s.fee)}</td><td><span class="badge ${s.status==="Active"?"badge-success":"badge-danger"}">${s.status}</span></td><td><button class="btn btn-secondary btn-sm" onclick="studentDetails('${s.id}')">View</button></td></tr>`).join("")}
function filterStudents(q){const list=state.students.filter(s=>(s.name+s.phone+s.batch+s.id).toLowerCase().includes(q.toLowerCase()));document.getElementById("studentRows").innerHTML=studentRows(list);}
function openStudentModal(){
 modal("Add student",`<div class="form-grid">
 <div class="field"><label>Full name</label><input id="f_name" placeholder="e.g. Md. Rahim"></div>
 <div class="field"><label>Phone</label><input id="f_phone" placeholder="01XXXXXXXXX"></div>
 <div class="field"><label>Guardian name</label><input id="f_guardian"></div>
 <div class="field"><label>Batch</label><select id="f_batch">${state.batches.map(b=>`<option>${esc(b.name)}</option>`).join("")}</select></div>
 <div class="field"><label>Monthly fee</label><input id="f_fee" type="number" value="1500"></div>
 </div><div class="actions" style="margin-top:18px;justify-content:flex-end"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="addStudent()">Save student</button></div>`);
}
function addStudent(){const name=document.getElementById("f_name").value.trim();if(!name){toast("Name is required");return;}state.students.unshift({id:"ST-"+Date.now().toString().slice(-5),name,phone:document.getElementById("f_phone").value,guardian:document.getElementById("f_guardian").value,batch:document.getElementById("f_batch").value,fee:Number(document.getElementById("f_fee").value||0),paid:0,attendance:100,result:0,status:"Active"});save();closeModal();render();toast("Student added");}
function studentDetails(id){const s=state.students.find(x=>x.id===id);modal("Student profile",`<div class="grid grid-2"><div class="card" style="padding:15px"><div class="subtitle">Student ID</div><strong>${s.id}</strong><div class="subtitle" style="margin-top:12px">Phone</div><strong>${esc(s.phone)}</strong><div class="subtitle" style="margin-top:12px">Guardian</div><strong>${esc(s.guardian)}</strong></div><div class="card" style="padding:15px"><div class="subtitle">Attendance</div><strong>${s.attendance}%</strong><div class="subtitle" style="margin-top:12px">Latest result</div><strong>${s.result}%</strong><div class="subtitle" style="margin-top:12px">Outstanding</div><strong>${money(Math.max(0,s.fee-s.paid))}</strong></div></div><div class="notice" style="margin-top:16px">Risk engine: <strong>${s.status==="At Risk"?"High — follow up with guardian":"Low — healthy"}.</strong></div>`);}

function batches(){
 return `<div class="page-head"><div><h1>Batches</h1><div class="subtitle">Schedules, teachers, rooms and enrollment.</div></div><button class="btn btn-primary" onclick="openBatchModal()">+ New batch</button></div>
 <div class="grid grid-2">${state.batches.map(b=>`<div class="card"><div style="display:flex;justify-content:space-between;gap:10px"><div><span class="badge badge-blue">${esc(b.subject)}</span><h2 style="margin-top:10px">${esc(b.name)}</h2><div class="subtitle">${esc(b.teacher)}</div></div><strong>${b.students} students</strong></div><div class="grid grid-2" style="margin-top:18px"><div><div class="subtitle">Time</div><strong>${b.time}</strong></div><div><div class="subtitle">Room</div><strong>${b.room}</strong></div></div><div class="progress" style="margin-top:18px"><span style="width:${Math.min(100,b.students/100*100)}%"></span></div></div>`).join("")}</div>`;
}
function openBatchModal(){modal("Create batch",`<div class="form-grid"><div class="field"><label>Batch name</label><input id="b_name" placeholder="HSC Physics C"></div><div class="field"><label>Subject</label><input id="b_subject" placeholder="Physics"></div><div class="field"><label>Teacher</label><input id="b_teacher" placeholder="Teacher name"></div><div class="field"><label>Time</label><input id="b_time" value="08:00 AM"></div><div class="field"><label>Room</label><input id="b_room" value="Room 101"></div></div><div class="actions" style="margin-top:18px;justify-content:flex-end"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="addBatch()">Create</button></div>`);}
function addBatch(){const n=document.getElementById("b_name").value.trim();if(!n){toast("Batch name required");return;}state.batches.push({id:"B-"+Date.now().toString().slice(-4),name:n,subject:document.getElementById("b_subject").value,teacher:document.getElementById("b_teacher").value,time:document.getElementById("b_time").value,room:document.getElementById("b_room").value,students:0});save();closeModal();render();toast("Batch created");}

function attendance(){
 return `<div class="page-head"><div><h1>Attendance</h1><div class="subtitle">Take attendance in seconds and identify students who need attention.</div></div><div class="actions"><select class="search" style="width:220px"><option>HSC Physics A</option>${state.batches.slice(1).map(b=>`<option>${esc(b.name)}</option>`).join("")}</select><button class="btn btn-primary" onclick="markAllPresent()">Mark all present</button></div></div>
 <div class="grid grid-3"><div class="card"><div class="subtitle">Today's attendance</div><div style="font-size:34px;font-weight:800;margin-top:6px">91%</div><div class="progress" style="margin-top:14px"><span style="width:91%"></span></div></div><div class="card"><div class="subtitle">Present</div><div style="font-size:34px;font-weight:800;margin-top:6px">198</div><div class="subtitle">of 218 expected students</div></div><div class="card"><div class="subtitle">Guardian alerts</div><div style="font-size:34px;font-weight:800;margin-top:6px">20</div><div class="subtitle">absence notifications queued</div></div></div>
 <div class="card" style="margin-top:18px"><h2>Today's roll call</h2><div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Student</th><th>Batch</th><th>Attendance</th><th>Today</th></tr></thead><tbody>${state.students.map(s=>`<tr><td><strong>${esc(s.name)}</strong><div class="subtitle">${s.id}</div></td><td>${esc(s.batch)}</td><td>${s.attendance}%</td><td><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked onchange="toggleAttendance('${s.id}',this.checked)"> Present</label></td></tr>`).join("")}</tbody></table></div></div>`;
}
function toggleAttendance(id,present){const s=state.students.find(x=>x.id===id);if(s){s.attendance=Math.max(0,Math.min(100,Math.round(s.attendance+(present?1:-1))));save();toast(present?"Marked present":"Marked absent");}}
function markAllPresent(){state.students.forEach(s=>s.attendance=Math.min(100,s.attendance+1));save();render();toast("All students marked present");}

function fees(){
 const outstanding=state.students.reduce((a,s)=>a+Math.max(0,s.fee-s.paid),0), collected=state.payments.reduce((a,p)=>a+Number(p.amount),0);
 return `<div class="page-head"><div><h1>Fees & Payments</h1><div class="subtitle">Track collections, outstanding balances and receipts.</div></div><button class="btn btn-primary" onclick="openPaymentModal()">+ Record payment</button></div>
 <div class="grid grid-3">${stat("Collected",money(collected),"৳")}${stat("Outstanding",money(outstanding),"!")}${stat("Collection rate","82%","↗")}</div>
 <div class="card" style="margin-top:18px"><h2>Payment ledger</h2><div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Receipt</th><th>Student</th><th>Amount</th><th>Date</th><th>Method</th><th>Status</th></tr></thead><tbody>${state.payments.map(p=>`<tr><td><strong>${p.id}</strong></td><td>${esc(p.student)}</td><td>${money(p.amount)}</td><td>${p.date}</td><td>${p.method}</td><td><span class="badge badge-success">${p.status}</span></td></tr>`).join("")}</tbody></table></div></div>`;
}
function openPaymentModal(){modal("Record payment",`<div class="form-grid"><div class="field"><label>Student</label><select id="p_student">${state.students.map(s=>`<option value="${s.id}">${esc(s.name)} — ${money(Math.max(0,s.fee-s.paid))} due</option>`).join("")}</select></div><div class="field"><label>Amount</label><input id="p_amount" type="number" value="1500"></div><div class="field"><label>Method</label><select id="p_method"><option>bKash</option><option>Nagad</option><option>Cash</option><option>Bank</option></select></div></div><div class="actions" style="margin-top:18px;justify-content:flex-end"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="addPayment()">Save payment</button></div>`);}
function addPayment(){const sid=document.getElementById("p_student").value, s=state.students.find(x=>x.id===sid), amount=Number(document.getElementById("p_amount").value||0);s.paid+=amount;s.status=(s.attendance<70||s.result<60)?"At Risk":"Active";state.payments.unshift({id:"RCP-"+Date.now().toString().slice(-4),student:s.name,amount,date:new Date().toISOString().slice(0,10),method:document.getElementById("p_method").value,status:"Paid"});save();closeModal();render();toast("Payment recorded");}

function exams(){
 return `<div class="page-head"><div><h1>Exams & Results</h1><div class="subtitle">Create exams, enter marks and publish results.</div></div><button class="btn btn-primary" onclick="openExamModal()">+ Create exam</button></div>
 <div class="grid grid-2">${state.exams.map(e=>`<div class="card"><div style="display:flex;justify-content:space-between"><div><span class="badge badge-blue">${esc(e.subject)}</span><h2 style="margin-top:10px">${esc(e.name)}</h2><div class="subtitle">${e.date} • ${e.participants} participants</div></div><button class="btn btn-secondary btn-sm" onclick="toast('Result entry opened')">Enter marks</button></div><div class="grid grid-3" style="margin-top:18px"><div><div class="subtitle">Total</div><strong>${e.total}</strong></div><div><div class="subtitle">Average</div><strong>76%</strong></div><div><div class="subtitle">Top score</div><strong>96</strong></div></div></div>`).join("")}</div>
 <div class="card" style="margin-top:18px"><h2>Student performance</h2><div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Student</th><th>Latest score</th><th>Attendance</th><th>Risk</th></tr></thead><tbody>${state.students.map(s=>`<tr><td><strong>${esc(s.name)}</strong></td><td>${s.result}%</td><td>${s.attendance}%</td><td><span class="badge ${s.status==="At Risk"?"badge-danger":"badge-success"}">${s.status}</span></td></tr>`).join("")}</tbody></table></div></div>`;
}
function openExamModal(){modal("Create exam",`<div class="form-grid"><div class="field"><label>Exam name</label><input id="e_name" placeholder="September Monthly Exam"></div><div class="field"><label>Subject</label><input id="e_subject" placeholder="Physics"></div><div class="field"><label>Date</label><input id="e_date" type="date"></div><div class="field"><label>Total marks</label><input id="e_total" type="number" value="100"></div></div><div class="actions" style="margin-top:18px;justify-content:flex-end"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="addExam()">Create exam</button></div>`);}
function addExam(){const n=document.getElementById("e_name").value.trim();if(!n){toast("Exam name required");return;}state.exams.unshift({id:"EX-"+Date.now().toString().slice(-4),name:n,subject:document.getElementById("e_subject").value,date:document.getElementById("e_date").value||new Date().toISOString().slice(0,10),total:Number(document.getElementById("e_total").value||100),participants:0});save();closeModal();render();toast("Exam created");}

function teachers(){
 return `<div class="page-head"><div><h1>Teachers</h1><div class="subtitle">Manage teachers and class workload.</div></div><button class="btn btn-primary" onclick="openTeacherModal()">+ Add teacher</button></div>
 <div class="grid grid-3">${state.teachers.map(t=>`<div class="card"><div style="display:flex;gap:12px;align-items:center"><div class="iconbox">${t.name.slice(0,1)}</div><div><h2>${esc(t.name)}</h2><div class="subtitle">${esc(t.subject)}</div></div></div><div class="grid grid-2" style="margin-top:18px"><div><div class="subtitle">Classes</div><strong>${t.classes}</strong></div><div><div class="subtitle">Rate/class</div><strong>${money(t.rate)}</strong></div></div><div class="notice" style="margin-top:16px">Estimated August pay: <strong>${money(t.classes*t.rate)}</strong></div></div>`).join("")}</div>`;
}
function openTeacherModal(){modal("Add teacher",`<div class="form-grid"><div class="field"><label>Name</label><input id="t_name"></div><div class="field"><label>Subject</label><input id="t_subject"></div><div class="field"><label>Phone</label><input id="t_phone"></div><div class="field"><label>Rate per class</label><input id="t_rate" type="number" value="1000"></div></div><div class="actions" style="margin-top:18px;justify-content:flex-end"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="addTeacher()">Save</button></div>`);}
function addTeacher(){const n=document.getElementById("t_name").value.trim();if(!n){toast("Name required");return;}state.teachers.push({id:"T-"+Date.now().toString().slice(-4),name:n,subject:document.getElementById("t_subject").value,phone:document.getElementById("t_phone").value,classes:0,rate:Number(document.getElementById("t_rate").value||0)});save();closeModal();render();toast("Teacher added");}

function notices(){
 return `<div class="page-head"><div><h1>Notices</h1><div class="subtitle">Send announcements to students and guardians.</div></div><button class="btn btn-primary" onclick="openNoticeModal()">+ New notice</button></div>
 <div class="grid grid-2"><div class="card"><h2>Communication channels</h2><div class="list" style="margin-top:12px"><div class="list-item"><span>SMS</span><span class="badge badge-success">Ready</span></div><div class="list-item"><span>WhatsApp</span><span class="badge badge-warning">Connect later</span></div><div class="list-item"><span>Push notifications</span><span class="badge badge-blue">App</span></div></div></div><div class="card"><h2>Recent announcements</h2><div class="list" style="margin-top:12px"><div class="list-item"><div><strong>Physics class postponed</strong><div class="subtitle">Sent to HSC Physics A • Today</div></div><span>✓</span></div><div class="list-item"><div><strong>August exam result published</strong><div class="subtitle">Sent to 142 students</div></div><span>✓</span></div></div></div></div>`;
}
function openNoticeModal(){modal("New notice",`<div class="field"><label>Title</label><input id="n_title" placeholder="Important announcement"></div><div class="field" style="margin-top:12px"><label>Message</label><textarea id="n_body" rows="5" style="padding:10px 12px;border:1px solid var(--line);border-radius:10px" placeholder="Write your message..."></textarea></div><div class="actions" style="margin-top:18px;justify-content:flex-end"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="sendNotice()">Send notice</button></div>`);}
function sendNotice(){const n=document.getElementById("n_title").value.trim();if(!n){toast("Title required");return;}closeModal();toast("Notice queued for delivery");}

function settings(){
 return `<div class="page-head"><div><h1>Settings</h1><div class="subtitle">Institution profile and demo controls.</div></div></div>
 <div class="grid grid-2"><div class="card"><h2>Institution</h2><div class="form-grid" style="margin-top:16px"><div class="field"><label>Name</label><input value="ABC Coaching Center"></div><div class="field"><label>Phone</label><input value="01700000000"></div><div class="field"><label>District</label><input value="Dhaka"></div><div class="field"><label>Currency</label><input value="BDT (৳)" disabled></div></div><button class="btn btn-primary" style="margin-top:18px" onclick="toast('Settings saved')">Save settings</button></div>
 <div class="card"><h2>Current release</h2><p class="subtitle">EduFlow MVP is designed to run on Vercel with no server setup. Data in this starter is stored in your browser.</p><div class="notice">For a real multi-user SaaS, the next upgrade is Supabase authentication + PostgreSQL + row-level security.</div><div style="margin-top:16px"><strong>Included now</strong><div class="list" style="margin-top:8px"><div class="list-item"><span>Dashboard</span><span>✓</span></div><div class="list-item"><span>Students / batches / teachers</span><span>✓</span></div><div class="list-item"><span>Attendance</span><span>✓</span></div><div class="list-item"><span>Fees / receipts</span><span>✓</span></div><div class="list-item"><span>Exams / results</span><span>✓</span></div><div class="list-item"><span>Notices</span><span>✓</span></div></div></div></div></div>`;
}

function modal(title,body){const old=document.getElementById("modalRoot");if(old)old.remove();const el=document.createElement("div");el.id="modalRoot";el.className="modal-backdrop";el.innerHTML=`<div class="modal"><div class="modal-head"><h2>${title}</h2><button class="close" onclick="closeModal()">×</button></div>${body}</div>`;document.body.appendChild(el);}
function closeModal(){document.getElementById("modalRoot")?.remove();}
render();
