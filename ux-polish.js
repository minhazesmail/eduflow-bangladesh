(() => {
  const style = document.createElement('style');
  style.textContent = `
    .auth-helper{margin-top:12px;padding:10px 12px;border:1px solid rgba(59,130,246,.25);background:rgba(59,130,246,.06);border-radius:10px;color:#64748b;font-size:12px;line-height:1.45}
    .auth-error{margin:12px 0 0;padding:10px 12px;border-radius:10px;background:#fff1f2;border:1px solid #fecdd3;color:#be123c;font-size:13px;line-height:1.4}
    .auth-success{margin:12px 0 0;padding:10px 12px;border-radius:10px;background:#ecfdf5;border:1px solid #a7f3d0;color:#047857;font-size:13px;line-height:1.4}
    .text-link{border:0;background:none;color:#2563eb;font-size:12px;cursor:pointer;padding:2px 0}
    .text-link:hover{text-decoration:underline}
    .is-loading{cursor:wait;opacity:.88}
    .auth-spinner{display:inline-block;width:13px;height:13px;margin-right:8px;vertical-align:-2px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:efspin .7s linear infinite}
    @keyframes efspin{to{transform:rotate(360deg)}}
    .onboarding-card{margin-top:16px;border:1px solid rgba(59,130,246,.25);background:linear-gradient(135deg,rgba(37,99,235,.08),rgba(2,6,23,.02));}
    .onboarding-steps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}
    .onboarding-step{display:flex;align-items:center;gap:12px;border:1px solid var(--line);border-radius:12px;padding:12px;background:rgba(255,255,255,.7);cursor:pointer;text-align:left}
    .onboarding-step:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(2,6,23,.08)}
    .step-num{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:#0ea5e9;color:#fff;font-weight:800;font-size:12px;flex:0 0 auto}
    @media(max-width:760px){
      .onboarding-steps{grid-template-columns:1fr}
      .table-wrap{overflow:visible}
      .table-wrap table,.table-wrap thead,.table-wrap tbody,.table-wrap tr,.table-wrap th,.table-wrap td{display:block;width:100%}
      .table-wrap thead{display:none}
      .table-wrap tbody tr{border:1px solid var(--line);border-radius:14px;background:var(--surface,#fff);padding:12px;margin-bottom:10px;box-shadow:0 6px 18px rgba(2,6,23,.05)}
      .table-wrap tbody td{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border:0;padding:7px 0;text-align:right;min-height:28px}
      .table-wrap tbody td:first-child{display:block;text-align:left;padding-top:0}
      .table-wrap tbody td::before{content:attr(data-label);font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;font-weight:700;text-align:left}
      .table-wrap tbody td:first-child::before{display:none}
      .table-wrap .btn{min-height:36px}
    }
  `;
  document.head.appendChild(style);

  const origRenderApp = window.renderApp;
  if (origRenderApp) {
    window.renderApp = function(){
      origRenderApp.apply(this, arguments);
      syncRoleNav();
    };
  }

  const origRender = window.render;
  if (origRender) {
    window.render = function(){
      origRender.apply(this, arguments);
      syncRoleNav();
      requestAnimationFrame(() => {
        addMobileLabels();
        addOnboarding();
      });
    };
  }

  function syncRoleNav(){
    const r = window.profile?.role || '';
    const buttons = [...document.querySelectorAll('.sidebar .nav > button')];
    if (!buttons.length) return;
    const hide = new Set();
    if (r === 'teacher') ['Students','Teachers','Notices','Settings','Team','Fees & Payments'].forEach(x => hide.add(x));
    if (r === 'staff') ['Exams & Results','Settings','Team'].forEach(x => hide.add(x));
    buttons.forEach(b => {
      const label = (b.textContent || '').trim();
      if (hide.has(label)) b.style.display = 'none';
      if (r === 'teacher' && label === 'Batches') { const span = b.querySelectorAll('span')[1]; if (span) span.textContent = 'My Batches'; }
      if (label === 'Communication') b.style.display = '';
    });
    document.querySelectorAll('.nav-section').forEach(section => {
      const next = []; let node = section.nextElementSibling;
      while (node && !node.classList.contains('nav-section')) { if (getComputedStyle(node).display !== 'none') next.push(node); node = node.nextElementSibling; }
      section.style.display = next.length ? '' : 'none';
    });
  }

  function addMobileLabels(){
    document.querySelectorAll('.table-wrap table').forEach(table => {
      const headers = [...table.querySelectorAll('thead th')].map(x => x.textContent.trim());
      table.querySelectorAll('tbody tr').forEach(row => {
        [...row.children].forEach((cell, i) => {
          if (!cell.dataset.label && headers[i]) cell.dataset.label = headers[i];
        });
      });
    });
  }

  function addOnboarding(){
    if (window.page !== 'dashboard') return;
    const content = document.getElementById('content');
    if (!content || document.getElementById('owner-onboarding')) return;
    if (window.profile?.role !== 'owner') return;
    const students = window.data?.students || [], batches = window.data?.batches || [], teachers = window.data?.teachers || [];
    if (students.length || batches.length || teachers.length) return;
    const card = document.createElement('div');
    card.id = 'owner-onboarding';
    card.className = 'card onboarding-card';
    card.innerHTML = `<div class="section-head"><div><div class="badge badge-blue">Welcome to EduFlow</div><h2 style="margin-top:10px">Let’s set up your coaching center.</h2><div class="subtitle">You’re ready to go. Start with these two steps and your dashboard will come alive.</div></div></div><div class="onboarding-steps"><button class="onboarding-step" onclick="go('batches')"><span class="step-num">1</span><span><strong>Create your first Batch</strong><div class="subtitle">Add subject, teacher, class time and room.</div></span></button><button class="onboarding-step" onclick="go('team')"><span class="step-num">2</span><span><strong>Add a Teacher</strong><div class="subtitle">Invite teachers and staff from Team.</div></span></button></div>`;
    content.appendChild(card);
  }
})();