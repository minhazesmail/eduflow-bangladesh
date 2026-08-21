/* EduFlow operational UX extensions: attendance history/bulk marking, payments/results/notices CRUD, team invites/role modal. */
(function () {
  'use strict';

  let sb = null;
  let profile = null;
  let organization = null;
  let currentRole = null;
  let demo = false;
  let initialized = false;

  const $ = (id) => document.getElementById(id);
  const esc = (value) => { const d = document.createElement('div'); d.textContent = value == null ? '' : String(value); return d.innerHTML; };
  const can = (resource, action) => {
    const roles = {
      'payments:create': ['owner', 'admin', 'staff'], 'payments:update': ['owner', 'admin'], 'payments:delete': ['owner', 'admin'],
      'results:create': ['owner', 'admin', 'teacher'], 'results:update': ['owner', 'admin', 'teacher'], 'results:delete': ['owner', 'admin'],
      'notices:create': ['owner', 'admin'], 'notices:update': ['owner', 'admin'], 'notices:delete': ['owner', 'admin'],
      'attendance:create': ['owner', 'admin', 'staff'], 'attendance:update': ['owner', 'admin', 'staff'],
      'team:manage': ['owner']
    };
    return !!currentRole && (roles[`${resource}:${action}`] || []).includes(currentRole);
  };
  const toast = (message, type = 'info') => window.EduFlow?.toast?.(message, type);

  async function q(request, fallback = null) {
    try {
      const result = await request;
      if (result.error) throw result.error;
      return result.data == null ? fallback : result.data;
    } catch (error) {
      toast(error.message || 'Unable to load data.', 'error');
      return fallback;
    }
  }

  function modal(title, body, onSubmit) {
    const root = $('modal-root');
    root.innerHTML = `<div class="modal-backdrop" data-op-close><div class="modal"><div class="modal-head"><h2>${esc(title)}</h2><button type="button" class="close" id="op-modal-close">✕</button></div><form id="op-modal-form">${body}<div class="end-actions"><button type="button" class="btn btn-secondary" id="op-cancel">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div></form></div></div>`;
    $('op-modal-close').onclick = () => root.innerHTML = '';
    $('op-cancel').onclick = () => root.innerHTML = '';
    root.querySelector('[data-op-close]').onclick = (event) => { if (event.target === event.currentTarget) root.innerHTML = ''; };
    $('op-modal-form').onsubmit = onSubmit;
  }

  async function context() {
    if (initialized) return;
    demo = !!window.eduflowConfig?.isDemo;
    if (!window.supabase?.createClient || !window.eduflowConfig?.supabaseUrl || !window.eduflowConfig?.supabaseKey) return;
    sb = window.supabase.createClient(window.eduflowConfig.supabaseUrl, window.eduflowConfig.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    const { data: sessionData } = await sb.auth.getSession();
    const session = sessionData?.session;
    if (!session?.user) return;
    profile = await q(sb.from('profiles').select('id,organization_id,full_name,role,created_at').eq('id', session.user.id).maybeSingle(), null);
    if (profile) {
      organization = await q(sb.from('organizations').select('id,name,phone,district,created_at').eq('id', profile.organization_id).single(), null);
      currentRole = profile.role;
    }
    initialized = true;
  }

  async function loadAttendance() {
    await context();
    const date = $('op-attendance-date')?.value || new Date().toISOString().slice(0, 10);
    const batchId = $('op-attendance-batch')?.value || '';
    const students = await q(sb.from('students').select('id,name,batch_id,batches(name)').eq('organization_id', organization.id).order('name'), []);
    const filtered = batchId ? students.filter(s => s.batch_id === batchId) : students;
    const attendance = await q(sb.from('attendance').select('student_id,present').eq('organization_id', organization.id).eq('attendance_date', date), []);
    const map = new Map(attendance.map(row => [row.student_id, !!row.present]));
    $('op-attendance-list').innerHTML = filtered.length ? filtered.map(student => `
      <label class="list-item" style="cursor:pointer"><span><strong>${esc(student.name)}</strong><span class="subtitle">${esc(student.batches?.name || 'No batch')}</span></span><input type="checkbox" data-student-id="${esc(student.id)}" ${map.get(student.id) !== false ? 'checked' : ''}></label>
    `).join('') : '<div class="empty">No students match this batch.</div>';
  }

  async function saveAttendance() {
    await context();
    if (!can('attendance', 'create')) return toast('You do not have permission to mark attendance.', 'error');
    const date = $('op-attendance-date').value;
    const rows = [...document.querySelectorAll('#op-attendance-list input[data-student-id]')].map(input => ({
      organization_id: organization.id, student_id: input.dataset.studentId, attendance_date: date, present: input.checked
    }));
    if (!rows.length) return toast('No students to save.', 'warning');
    const { error } = await sb.from('attendance').upsert(rows, { onConflict: 'student_id,attendance_date' });
    if (error) return toast(error.message, 'error');
    toast('Attendance saved.', 'success');
    await loadAttendance();
  }

  async function renderAttendance() {
    await context();
    const batches = await q(sb.from('batches').select('id,name').eq('organization_id', organization.id).order('name'), []);
    const today = new Date().toISOString().slice(0, 10);
    $('page-content').innerHTML = `<div class="page-head"><div><h1>Attendance</h1><p class="subtitle">Mark a whole class in one pass and review any date.</p></div><div class="actions"><button class="btn btn-primary" id="op-save-attendance">Save attendance</button></div></div>
      <div class="card"><div class="form-grid"><div class="field"><label for="op-attendance-date">Date</label><input id="op-attendance-date" type="date" value="${today}"></div><div class="field"><label for="op-attendance-batch">Batch</label><select id="op-attendance-batch"><option value="">All batches</option>${batches.map(b => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('')}</select></div></div></div>
      <div class="card" style="margin-top:16px"><div id="op-attendance-list"></div></div>`;
    $('op-attendance-date').onchange = loadAttendance;
    $('op-attendance-batch').onchange = loadAttendance;
    $('op-save-attendance').onclick = saveAttendance;
    await loadAttendance();
  }

  async function paymentModal(id = null) {
    await context();
    if (!id && !can('payments', 'create')) return toast('You do not have permission to record payments.', 'error');
    if (id && !can('payments', 'update')) return toast('You do not have permission to update payments.', 'error');
    const [students, existing] = await Promise.all([
      q(sb.from('students').select('id,name').eq('organization_id', organization.id).order('name'), []),
      id ? q(sb.from('payments').select('*').eq('id', id).eq('organization_id', organization.id).single(), null) : null
    ]);
    modal(id ? 'Edit Payment' : 'Record Payment', `<div class="form-grid"><div class="field"><label>Student</label><select id="op-student" required>${students.map(s => `<option value="${esc(s.id)}" ${existing?.student_id === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label>Amount</label><input id="op-amount" type="number" min="1" step="0.01" required value="${existing?.amount || ''}"></div><div class="field"><label>Method</label><select id="op-method">${['cash','bKash','Nagad','Rocket','bank','card','other'].map(v => `<option ${existing?.payment_method === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div><div class="field"><label>Receipt no.</label><input id="op-receipt" value="${esc(existing?.receipt_no || '')}"></div><div class="field"><label>Paid at</label><input id="op-paid-at" type="datetime-local" value="${existing?.paid_at ? new Date(existing.paid_at).toISOString().slice(0,16) : new Date().toISOString().slice(0,16)}"></div></div>`, async event => {
      event.preventDefault();
      const payload = { student_id: $('op-student').value, amount: Number($('op-amount').value), payment_method: $('op-method').value, receipt_no: $('op-receipt').value.trim() || null, paid_at: new Date($('op-paid-at').value).toISOString(), organization_id: organization.id };
      const result = id ? await sb.from('payments').update(payload).eq('id', id).eq('organization_id', organization.id) : await sb.from('payments').insert(payload);
      if (result.error) return toast(result.error.message, 'error');
      $('modal-root').innerHTML = '';
      toast(id ? 'Payment updated.' : 'Payment recorded.', 'success');
      renderPayments();
    });
  }

  async function renderPayments() {
    await context();
    const data = await q(sb.from('payments').select('id,student_id,amount,payment_method,receipt_no,paid_at,students(name)').eq('organization_id', organization.id).order('paid_at', { ascending: false }).limit(100), []);
    const actions = can('payments','create') ? '<button class="btn btn-primary" id="op-new-payment">+ Record payment</button>' : '';
    $('page-content').innerHTML = `<div class="page-head"><div><h1>Fees & Payments</h1><p class="subtitle">Collections, receipts and payment history.</p></div><div class="actions">${actions}</div></div><div class="card"><div class="table-wrap"><table><thead><tr><th>Student</th><th>Amount</th><th>Method</th><th>Receipt</th><th>Paid</th><th>Actions</th></tr></thead><tbody>${data.length ? data.map(p => `<tr><td>${esc(p.students?.name || 'Student')}</td><td>৳${Number(p.amount).toLocaleString()}</td><td>${esc(p.payment_method)}</td><td>${esc(p.receipt_no || '-')}</td><td>${new Date(p.paid_at).toLocaleString()}</td><td>${can('payments','update') ? `<button class="btn btn-sm btn-secondary" data-op-pay-edit="${esc(p.id)}">Edit</button>` : ''} ${can('payments','delete') ? `<button class="btn btn-sm btn-danger" data-op-pay-delete="${esc(p.id)}">Delete</button>` : ''}</td></tr>`).join('') : '<tr><td colspan="6" class="empty">No payments yet.</td></tr>'}</tbody></table></div></div>`;
    $('op-new-payment')?.addEventListener('click', () => paymentModal());
    document.querySelectorAll('[data-op-pay-edit]').forEach(el => el.addEventListener('click', () => paymentModal(el.dataset.opPayEdit)));
    document.querySelectorAll('[data-op-pay-delete]').forEach(el => el.addEventListener('click', async () => { if (!confirm('Delete this payment?')) return; const r = await sb.from('payments').delete().eq('id', el.dataset.opPayDelete).eq('organization_id', organization.id); if (r.error) return toast(r.error.message, 'error'); renderPayments(); }));
  }

  async function resultModal(id = null, examId = null) {
    await context();
    if (!id && !can('results', 'create')) return toast('You do not have permission to add results.', 'error');
    if (id && !can('results', 'update')) return toast('You do not have permission to edit results.', 'error');
    const [students, exams, existing] = await Promise.all([
      q(sb.from('students').select('id,name').eq('organization_id', organization.id).order('name'), []),
      q(sb.from('exams').select('id,name,total_marks').eq('organization_id', organization.id).order('exam_date', { ascending: false }), []),
      id ? q(sb.from('results').select('*').eq('id', id).eq('organization_id', organization.id).single(), null) : null
    ]);
    const selectedExam = existing?.exam_id || examId || exams[0]?.id || '';
    modal(id ? 'Edit Result' : 'Add Result', `<div class="form-grid"><div class="field"><label>Student</label><select id="op-result-student">${students.map(s => `<option value="${esc(s.id)}" ${existing?.student_id === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label>Exam</label><select id="op-result-exam">${exams.map(e => `<option value="${esc(e.id)}" ${selectedExam === e.id ? 'selected' : ''}>${esc(e.name)} · ${e.total_marks}</option>`).join('')}</select></div><div class="field"><label>Marks</label><input id="op-result-marks" type="number" min="0" step="0.01" required value="${existing?.marks ?? ''}"></div></div>`, async event => {
      event.preventDefault();
      const exam = exams.find(e => e.id === $('op-result-exam').value);
      const marks = Number($('op-result-marks').value);
      if (!exam || marks > Number(exam.total_marks)) return toast('Marks cannot exceed total marks.', 'error');
      const payload = { organization_id: organization.id, student_id: $('op-result-student').value, exam_id: $('op-result-exam').value, marks };
      const result = id ? await sb.from('results').update(payload).eq('id', id).eq('organization_id', organization.id) : await sb.from('results').upsert(payload, { onConflict: 'student_id,exam_id' });
      if (result.error) return toast(result.error.message, 'error');
      $('modal-root').innerHTML = '';
      toast(id ? 'Result updated.' : 'Result saved.', 'success');
      renderResults();
    });
  }

  async function renderResults() {
    await context();
    const data = await q(sb.from('results').select('id,marks,student_id,exam_id,created_at,students(name),exams(name,total_marks)').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(100), []);
    $('page-content').innerHTML = `<div class="page-head"><div><h1>Results</h1><p class="subtitle">Student exam performance.</p></div><div class="actions">${can('results','create') ? '<button class="btn btn-primary" id="op-new-result">+ Add result</button>' : ''}</div></div><div class="card"><div class="table-wrap"><table><thead><tr><th>Student</th><th>Exam</th><th>Marks</th><th>Percent</th><th>Actions</th></tr></thead><tbody>${data.length ? data.map(r => { const pct = r.exams?.total_marks ? Math.round(Number(r.marks) / Number(r.exams.total_marks) * 100) : 0; return `<tr><td>${esc(r.students?.name || 'Student')}</td><td>${esc(r.exams?.name || 'Exam')}</td><td>${Number(r.marks)} / ${Number(r.exams?.total_marks || 0)}</td><td>${pct}%</td><td>${can('results','update') ? `<button class="btn btn-sm btn-secondary" data-op-result-edit="${esc(r.id)}">Edit</button>` : ''} ${can('results','delete') ? `<button class="btn btn-sm btn-danger" data-op-result-delete="${esc(r.id)}">Delete</button>` : ''}</td></tr>`; }).join('') : '<tr><td colspan="5" class="empty">No results yet.</td></tr>'}</tbody></table></div></div>`;
    $('op-new-result')?.addEventListener('click', () => resultModal());
    document.querySelectorAll('[data-op-result-edit]').forEach(el => el.addEventListener('click', () => resultModal(el.dataset.opResultEdit)));
    document.querySelectorAll('[data-op-result-delete]').forEach(el => el.addEventListener('click', async () => { if (!confirm('Delete this result?')) return; const r = await sb.from('results').delete().eq('id', el.dataset.opResultDelete).eq('organization_id', organization.id); if (r.error) return toast(r.error.message, 'error'); renderResults(); }));
  }

  async function noticeModal(id = null) {
    await context();
    if (!id && !can('notices','create')) return toast('You do not have permission to create notices.', 'error');
    if (id && !can('notices','update')) return toast('You do not have permission to edit notices.', 'error');
    const existing = id ? await q(sb.from('notices').select('*').eq('id', id).eq('organization_id', organization.id).single(), null) : null;
    modal(id ? 'Edit Notice' : 'New Notice', `<div class="field"><label>Title</label><input id="op-notice-title" required value="${esc(existing?.title || '')}"></div><div class="field" style="margin-top:12px"><label>Body</label><textarea id="op-notice-body" rows="7" required>${esc(existing?.body || '')}</textarea></div>`, async event => {
      event.preventDefault();
      const payload = { organization_id: organization.id, title: $('op-notice-title').value.trim(), body: $('op-notice-body').value.trim(), status: existing?.status || 'published' };
      const result = id ? await sb.from('notices').update(payload).eq('id', id).eq('organization_id', organization.id) : await sb.from('notices').insert(payload);
      if (result.error) return toast(result.error.message, 'error');
      $('modal-root').innerHTML = '';
      toast(id ? 'Notice updated.' : 'Notice published.', 'success');
      renderNotices();
    });
  }

  async function renderNotices() {
    await context();
    const data = await q(sb.from('notices').select('id,title,body,status,created_at').eq('organization_id', organization.id).order('created_at', { ascending: false }), []);
    $('page-content').innerHTML = `<div class="page-head"><div><h1>Notices</h1><p class="subtitle">Announcements for your center.</p></div><div class="actions">${can('notices','create') ? '<button class="btn btn-primary" id="op-new-notice">+ New notice</button>' : ''}</div></div>${data.length ? data.map(n => `<div class="card" style="margin-bottom:12px"><div class="section-head"><h2>${esc(n.title)}</h2><div class="actions"><span class="badge badge-blue">${esc(n.status)}</span><span class="subtitle">${new Date(n.created_at).toLocaleDateString()}</span></div></div><p style="line-height:1.65">${esc(n.body)}</p><div class="actions">${can('notices','update') ? `<button class="btn btn-sm btn-secondary" data-op-notice-edit="${esc(n.id)}">Edit</button>` : ''} ${can('notices','delete') ? `<button class="btn btn-sm btn-danger" data-op-notice-delete="${esc(n.id)}">Delete</button>` : ''}</div></div>`).join('') : '<div class="empty">No notices yet.</div>'}`;
    $('op-new-notice')?.addEventListener('click', () => noticeModal());
    document.querySelectorAll('[data-op-notice-edit]').forEach(el => el.addEventListener('click', () => noticeModal(el.dataset.opNoticeEdit)));
    document.querySelectorAll('[data-op-notice-delete]').forEach(el => el.addEventListener('click', async () => { if (!confirm('Delete this notice?')) return; const r = await sb.from('notices').delete().eq('id', el.dataset.opNoticeDelete).eq('organization_id', organization.id); if (r.error) return toast(r.error.message, 'error'); renderNotices(); }));
  }

  async function roleModal(userId) {
    await context();
    if (!can('team','manage')) return toast('Only the owner can manage team roles.', 'error');
    const member = await q(sb.from('profiles').select('id,full_name,role').eq('id', userId).eq('organization_id', organization.id).single(), null);
    if (!member) return;
    modal('Change Team Role', `<p class="subtitle">${esc(member.full_name || 'Team member')}</p><div class="field" style="margin-top:12px"><label>Role</label><select id="op-role"><option value="admin" ${member.role === 'admin' ? 'selected' : ''}>Admin</option><option value="teacher" ${member.role === 'teacher' ? 'selected' : ''}>Teacher</option><option value="staff" ${member.role === 'staff' ? 'selected' : ''}>Staff</option></select></div>`, async event => {
      event.preventDefault();
      const result = await sb.from('profiles').update({ role: $('op-role').value }).eq('id', userId).eq('organization_id', organization.id);
      if (result.error) return toast(result.error.message, 'error');
      $('modal-root').innerHTML = '';
      toast('Role updated.', 'success');
      renderTeam();
    });
  }

  async function renderTeam() {
    await context();
    if (!can('team','manage')) return;
    const [members, invites] = await Promise.all([
      q(sb.from('profiles').select('id,full_name,role,created_at').eq('organization_id', organization.id).order('created_at', { ascending: false }), []),
      q(sb.from('organization_invitations').select('id,email,full_name,role,status,created_at').eq('organization_id', organization.id).in('status', ['pending','sent']).order('created_at', { ascending: false }), [])
    ]);
    $('page-content').innerHTML = `<div class="page-head"><div><h1>Team</h1><p class="subtitle">Manage roles and invite your center team.</p></div><div class="actions"><button class="btn btn-primary" id="op-invite">+ Invite member</button></div></div><div class="card"><div class="table-wrap"><table><thead><tr><th>Member</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead><tbody>${members.map(m => `<tr><td>${esc(m.full_name || 'User')}</td><td><span class="badge badge-gray">${esc(m.role)}</span></td><td>${new Date(m.created_at).toLocaleDateString()}</td><td>${m.id === profile.id ? '<span class="subtitle">You</span>' : `<button class="btn btn-sm btn-secondary" data-op-role="${esc(m.id)}">Change role</button>`}</td></tr>`).join('')}</tbody></table></div></div>${invites.length ? `<div class="card" style="margin-top:16px"><h2>Pending invitations</h2><div class="table-wrap"><table><thead><tr><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>${invites.map(i => `<tr><td>${esc(i.email)}</td><td>${esc(i.role)}</td><td>${esc(i.status)}</td><td><button class="btn btn-sm btn-danger" data-op-invite-delete="${esc(i.id)}">Cancel</button></td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
    $('op-invite').onclick = inviteModal;
    document.querySelectorAll('[data-op-role]').forEach(el => el.onclick = () => roleModal(el.dataset.opRole));
    document.querySelectorAll('[data-op-invite-delete]').forEach(el => el.onclick = async () => { if (!confirm('Cancel this invitation?')) return; const r = await sb.from('organization_invitations').delete().eq('id', el.dataset.opInviteDelete).eq('organization_id', organization.id); if (r.error) return toast(r.error.message, 'error'); renderTeam(); });
  }

  function inviteModal() {
    if (!can('team','manage')) return toast('Only the owner can invite members.', 'error');
    modal('Invite Team Member', `<div class="form-grid"><div class="field"><label>Email</label><input id="op-invite-email" type="email" required></div><div class="field"><label>Full name</label><input id="op-invite-name"></div><div class="field"><label>Role</label><select id="op-invite-role"><option value="admin">Admin</option><option value="teacher">Teacher</option><option value="staff">Staff</option></select></div></div>`, async event => {
      event.preventDefault();
      if (demo) return toast('Invitations are disabled in Demo Mode.', 'warning');
      const { data, error } = await sb.functions.invoke('invite-member', { body: { email: $('op-invite-email').value.trim().toLowerCase(), full_name: $('op-invite-name').value.trim(), role: $('op-invite-role').value } });
      if (error) return toast(error.message || 'Invitation failed.', 'error');
      if (data?.error) return toast(data.error, 'error');
      $('modal-root').innerHTML = '';
      toast('Invitation sent.', 'success');
      renderTeam();
    });
  }

  function intercept() {
    document.addEventListener('click', (event) => {
      const el = event.target instanceof Element ? event.target.closest('[data-page]') : null;
      if (!el) return;
      const page = el.dataset.page;
      if (!['attendance','payments','results','notices','team'].includes(page)) return;
      window.setTimeout(() => {
        if (page === 'attendance') renderAttendance();
        if (page === 'payments') renderPayments();
        if (page === 'results') renderResults();
        if (page === 'notices') renderNotices();
        if (page === 'team') renderTeam();
      }, 80);
    }, true);
    window.addEventListener('hashchange', () => {
      window.setTimeout(() => {
        const page = location.hash.slice(1);
        if (page === 'attendance') renderAttendance();
        if (page === 'payments') renderPayments();
        if (page === 'results') renderResults();
        if (page === 'notices') renderNotices();
        if (page === 'team') renderTeam();
      }, 80);
    });
    if (demo) {
      const exitDemo = () => { window.location.href = '/index.html'; };
      const observer = new MutationObserver(() => {
        const logout = $('logout-btn');
        if (logout && logout.dataset.demoBound !== '1') {
          logout.dataset.demoBound = '1';
          logout.textContent = 'Exit Demo';
          logout.onclick = exitDemo;
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      exitDemo();
    }
  }

  async function init() {
    await context();
    intercept();
    const page = location.hash.slice(1);
    if (page === 'attendance') renderAttendance();
    if (page === 'payments') renderPayments();
    if (page === 'results') renderResults();
    if (page === 'notices') renderNotices();
    if (page === 'team') renderTeam();
  }

  document.addEventListener('DOMContentLoaded', () => { window.setTimeout(init, 120); });
})();
