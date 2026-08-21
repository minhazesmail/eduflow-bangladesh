import '../styles.css';
import '../brand-refresh.css';
import './guardian.css';
import '../config.js';
import './supabase-global.js';

(() => {
  'use strict';

  const root = document.getElementById('root');
  const client = window.supabase.createClient(
    window.eduflowConfig.supabaseUrl,
    window.eduflowConfig.supabaseKey,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );

  const escapeHtml = (value) => {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  };
  const money = (value) => `৳${Number(value || 0).toLocaleString('en-BD')}`;
  const query = async (promise) => {
    const result = await promise;
    if (result.error) throw result.error;
    return result.data || [];
  };

  async function load() {
    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session?.user) {
        root.innerHTML = '<div class="card"><h2>Sign in required</h2><p class="subtitle">Use the invitation link from your coaching center.</p><a class="btn btn-primary" href="app.html">Sign in</a></div>';
        return;
      }

      const { data: account, error: accountError } = await client.from('guardian_accounts').select('guardian_id').eq('auth_user_id', session.user.id).single();
      if (accountError || !account) {
        root.innerHTML = '<div class="card"><h2>Portal not ready</h2><p class="subtitle">Ask your coaching center to resend the guardian invitation.</p></div>';
        return;
      }

      const guardian = await query(client.from('guardians').select('id,full_name,phone,email,preferred_language').eq('id', account.guardian_id).single());
      const links = await query(client.from('student_guardians').select('student_id,is_primary').eq('guardian_id', guardian.id));
      const studentIds = links.map((item) => item.student_id);

      const students = studentIds.length
        ? await query(client.from('students').select('id,name,student_code,class_level,monthly_fee,batches(name)').in('id', studentIds))
        : [];
      const attendance = studentIds.length
        ? await query(client.from('attendance').select('student_id,present,attendance_date').in('student_id', studentIds).order('attendance_date', { ascending: false }).limit(300))
        : [];
      const payments = studentIds.length
        ? await query(client.from('payments').select('student_id,amount,payment_method,receipt_no,paid_at').in('student_id', studentIds).order('paid_at', { ascending: false }).limit(100))
        : [];
      const results = studentIds.length
        ? await query(client.from('results').select('student_id,marks,created_at,exams(name,total_marks)').in('student_id', studentIds).order('created_at', { ascending: false }).limit(100))
        : [];
      const notices = await query(client.from('notices').select('title,body,created_at').order('created_at', { ascending: false }).limit(10));

      const studentCards = students.map((student) => {
        const history = attendance.filter((item) => item.student_id === student.id);
        const attendancePct = history.length ? Math.round(history.filter((item) => item.present).length / history.length * 100) : 0;
        const result = results.find((item) => item.student_id === student.id);
        const studentPayments = payments.filter((item) => item.student_id === student.id).slice(0, 4);
        return `<section class="portal-card portal-wide"><div class="section-head"><div><h2>${escapeHtml(student.name)}</h2><div class="subtitle">${escapeHtml(student.student_code || '')} · ${escapeHtml(student.batches?.name || student.class_level || '')}</div></div><span class="badge badge-blue">${attendancePct}% attendance</span></div><div class="portal-grid"><div class="portal-card"><div class="label">Monthly fee</div><div class="value">${money(student.monthly_fee)}</div></div><div class="portal-card"><div class="label">Last result</div><div class="value" style="font-size:20px">${result ? `${Number(result.marks)} / ${Number(result.exams?.total_marks || 0)}` : '—'}</div></div><div class="portal-card" style="grid-column:span 2"><div class="label">Recent payments</div><div class="portal-list">${studentPayments.map((payment) => `<div class="portal-row"><span>${escapeHtml(payment.payment_method)} · ${escapeHtml(payment.receipt_no || '')}</span><strong>${money(payment.amount)}</strong></div>`).join('')}</div></div></div></section>`;
      }).join('');

      const noticeHtml = notices.length
        ? notices.map((notice) => `<div class="portal-row"><span><strong>${escapeHtml(notice.title)}</strong><br><span class="subtitle">${escapeHtml(notice.body)}</span></span><span class="subtitle">${new Date(notice.created_at).toLocaleDateString('en-BD')}</span></div>`).join('')
        : '<div class="empty">No notices.</div>';

      root.innerHTML = `<div class="portal-grid"><section class="portal-card"><div class="label">Guardian</div><h2>${escapeHtml(guardian.full_name)}</h2><div class="subtitle">${escapeHtml(guardian.phone || guardian.email || '')}</div></section><section class="portal-card"><div class="label">Students</div><div class="value">${students.length}</div></section><section class="portal-card"><div class="label">Recent payments</div><div class="value">${money(payments.reduce((total, item) => total + Number(item.amount || 0), 0))}</div></section><section class="portal-card"><div class="label">Language</div><div class="value" style="font-size:20px">${escapeHtml(guardian.preferred_language || 'bn')}</div></section>${studentCards}<section class="portal-card portal-wide"><h2>Notices</h2><div class="portal-list">${noticeHtml}</div></section></div>`;
    } catch (error) {
      root.innerHTML = `<div class="card"><h2>Could not load portal</h2><p class="subtitle">${escapeHtml(error?.message || 'Please try again.')}</p></div>`;
    }
  }

  document.getElementById('logout')?.addEventListener('click', async () => {
    await client.auth.signOut();
    location.reload();
  });

  client.auth.onAuthStateChange(() => load());
  load();
})();
