/* Production integrations: branch context, document printing, explicit notification delivery. */
(function () {
  'use strict';

  const cfg = window.eduflowConfig || {};
  const demo = !!cfg.isDemo;
  const db = () => window.EduFlowRuntime?.db || null;
  const activeBranch = () => localStorage.getItem('eduflow.activeBranch') || '';
  const setActiveBranch = (id) => {
    if (id) localStorage.setItem('eduflow.activeBranch', id);
    else localStorage.removeItem('eduflow.activeBranch');
    window.dispatchEvent(new CustomEvent('eduflow:branch-change', { detail: { branchId: id || null } }));
  };
  const esc = (value) => {
    const d = document.createElement('div');
    d.textContent = value == null ? '' : String(value);
    return d.innerHTML;
  };
  const toast = (message, type = 'info') => window.EduFlow?.toast?.(message, type) || window.EduFlowDemo?.toast?.(message);

  async function queueAbsent(studentId) {
    if (demo) return toast('Demo Mode is read-only. Sending is disabled.', 'info');
    const s = db();
    const session = await window.EduFlowRuntime.getSession();
    if (!session?.user || !s) throw new Error('Your session has expired.');
    const { data: profile, error: profileError } = await s.from('profiles').select('organization_id').eq('id', session.user.id).single();
    if (profileError || !profile?.organization_id) throw new Error('Workspace information is unavailable.');
    const { data: student, error: studentError } = await s.from('students').select('id,name,guardian_phone').eq('id', studentId).eq('organization_id', profile.organization_id).single();
    if (studentError || !student) throw new Error('Student not found.');
    if (!student.guardian_phone) throw new Error('Guardian phone is missing.');
    const { data: notification, error } = await s.from('notifications').insert({
      organization_id: profile.organization_id,
      student_id: studentId,
      channel: 'sms',
      type: 'attendance_absent',
      title: 'Attendance alert',
      body: `${student.name} missed a class at your coaching center. Please check attendance details.`,
      status: 'queued'
    }).select('id').single();
    if (error) throw error;
    await dispatchOne(notification.id);
  }

  async function dispatchOne(notificationId) {
    if (demo) return;
    const session = await window.EduFlowRuntime.getSession();
    if (!session?.access_token) throw new Error('Your session has expired.');
    const response = await fetch(`${cfg.supabaseUrl}/functions/v1/dispatch-notification`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_id: notificationId })
    });
    if (!response.ok) throw new Error('Delivery provider is not ready. The notification remains queued.');
    toast('Guardian notification sent.', 'success');
  }

  async function renderBranchChooser() {
    if (demo) return;
    const s = db();
    if (!s) return;
    const session = await window.EduFlowRuntime.getSession();
    if (!session?.user) return;
    const { data: profile } = await s.from('profiles').select('organization_id').eq('id', session.user.id).single();
    if (!profile?.organization_id) return;
    const { data: branches } = await s.from('branches').select('id,name,code').eq('organization_id', profile.organization_id).eq('is_active', true).order('name');
    if (!branches?.length) return;
    const top = document.querySelector('.top-actions');
    if (!top || document.getElementById('branch-context')) return;
    const select = document.createElement('select');
    select.id = 'branch-context';
    select.className = 'btn btn-secondary';
    select.innerHTML = `<option value="">All branches</option>${branches.map(branch => `<option value="${esc(branch.id)}">${esc(branch.name)}</option>`).join('')}`;
    select.value = activeBranch();
    select.onchange = () => {
      setActiveBranch(select.value);
      toast(select.value ? 'Branch selected.' : 'Showing all branches.', 'success');
      window.dispatchEvent(new Event('eduflow:refresh'));
    };
    top.prepend(select);
  }

  const labels = {
    report_card: 'Report Card', marksheet: 'Marksheet', fee_receipt: 'Fee Receipt',
    admission_receipt: 'Admission Receipt', student_id: 'Student ID Card', batch_roster: 'Batch Roster',
    attendance_report: 'Attendance Report', fee_statement: 'Fee Statement', salary_statement: 'Teacher Salary Statement'
  };

  async function printDocument(type) {
    if (demo) return toast('Demo documents are preview-only.', 'info');
    const s = db();
    const session = await window.EduFlowRuntime.getSession();
    if (!session?.user || !s) throw new Error('Your session has expired.');
    const { data: profile, error: profileError } = await s.from('profiles').select('organization_id').eq('id', session.user.id).single();
    if (profileError || !profile?.organization_id) throw new Error('Workspace information is unavailable.');
    const orgId = profile.organization_id;
    let body = `<h2>${esc(labels[type] || 'Document')}</h2>`;

    if (type === 'batch_roster') {
      const { data } = await s.from('batches').select('name,subject,teacher_name,class_time,room').eq('organization_id', orgId).order('name').limit(500);
      body += `<table><tr><th>Batch</th><th>Subject</th><th>Teacher</th><th>Time</th><th>Room</th></tr>${(data || []).map(row => `<tr><td>${esc(row.name)}</td><td>${esc(row.subject || '')}</td><td>${esc(row.teacher_name || '')}</td><td>${esc(row.class_time || '')}</td><td>${esc(row.room || '')}</td></tr>`).join('')}</table>`;
    } else if (type === 'salary_statement') {
      const { data } = await s.from('teachers').select('name,subject,rate_per_class').eq('organization_id', orgId).order('name').limit(500);
      body += `<table><tr><th>Teacher</th><th>Subject</th><th>Rate/Class</th></tr>${(data || []).map(row => `<tr><td>${esc(row.name)}</td><td>${esc(row.subject || '')}</td><td>৳${Number(row.rate_per_class || 0).toLocaleString('en-BD')}</td></tr>`).join('')}</table>`;
    } else if (type === 'attendance_report') {
      const { data } = await s.from('attendance').select('attendance_date,present,students(name,student_code)').eq('organization_id', orgId).order('attendance_date', { ascending: false }).limit(500);
      body += `<table><tr><th>Student</th><th>Date</th><th>Status</th></tr>${(data || []).map(row => `<tr><td>${esc(row.students?.name || '')}</td><td>${esc(row.attendance_date)}</td><td>${row.present ? 'Present' : 'Absent'}</td></tr>`).join('')}</table>`;
    } else if (type === 'fee_statement') {
      const { data } = await s.from('payments').select('amount,paid_at,payment_method,receipt_no,students(name,student_code)').eq('organization_id', orgId).order('paid_at', { ascending: false }).limit(500);
      body += `<table><tr><th>Student</th><th>Date</th><th>Method</th><th>Receipt</th><th>Amount</th></tr>${(data || []).map(row => `<tr><td>${esc(row.students?.name || '')}</td><td>${esc(String(row.paid_at || '').slice(0, 10))}</td><td>${esc(row.payment_method || '')}</td><td>${esc(row.receipt_no || '')}</td><td>৳${Number(row.amount || 0).toLocaleString('en-BD')}</td></tr>`).join('')}</table>`;
    } else {
      const { data: students } = await s.from('students').select('id,name,student_code,class_level,monthly_fee').eq('organization_id', orgId).order('name').limit(1);
      const student = students?.[0];
      if (!student) throw new Error('Create at least one student first.');
      body += `<p><strong>${esc(student.name)}</strong></p><p>Code: ${esc(student.student_code || '')} · Class: ${esc(student.class_level || '')}</p><p>Monthly fee: ৳${Number(student.monthly_fee || 0).toLocaleString('en-BD')}</p>`;
      if (type === 'report_card' || type === 'marksheet') {
        const { data: results } = await s.from('results').select('marks,exams(name,total_marks)').eq('student_id', student.id).order('created_at', { ascending: false }).limit(20);
        body += `<table><tr><th>Exam</th><th>Marks</th><th>Total</th></tr>${(results || []).map(row => `<tr><td>${esc(row.exams?.name || '')}</td><td>${Number(row.marks || 0)}</td><td>${Number(row.exams?.total_marks || 0)}</td></tr>`).join('')}</table>`;
      }
    }

    const popup = window.open('', '_blank', 'width=760,height=900');
    if (!popup) throw new Error('Allow popups to print documents.');
    popup.document.write(`<html><head><title>${esc(labels[type] || 'Document')}</title><style>body{font:14px Arial;padding:32px;max-width:760px;margin:auto}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px}</style></head><body><h1>EduFlow</h1>${body}<script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  }

  function install() {
    if (demo) return;
    renderBranchChooser().catch(() => {});
    window.addEventListener('hashchange', () => setTimeout(() => renderBranchChooser().catch(() => {}), 0));
    window.addEventListener('eduflow:refresh', () => renderBranchChooser().catch(() => {}));
    document.addEventListener('click', event => {
      const button = event.target.closest?.('[data-growth-action]');
      if (!button) return;
      const action = button.getAttribute('data-growth-action') || '';
      if (action.startsWith('branch-open:')) {
        event.preventDefault();
        setActiveBranch(action.slice('branch-open:'.length));
        toast('Branch selected.', 'success');
        window.dispatchEvent(new Event('eduflow:refresh'));
      } else if (action.startsWith('notify-absent:')) {
        event.preventDefault();
        queueAbsent(action.slice('notify-absent:'.length)).catch(error => toast(error.message || 'Could not queue notification.', 'error'));
      } else if (action.startsWith('doc:')) {
        event.preventDefault();
        printDocument(action.slice(4)).catch(error => toast(error.message || 'Could not generate document.', 'error'));
      }
    }, true);
  }

  window.EduFlowProductionFixes = Object.freeze({ queueAbsent, dispatchOne, printDocument, setActiveBranch, activeBranch });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
