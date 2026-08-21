/**
 * EduFlow Guardian Portal
 * Read-only workspace for invited guardians (RLS-scoped).
 */
import '../styles.css';
import '../brand-refresh.css';
import './guardian.css';
import '../config.js';
import './supabase-global.js';
import './i18n.js';
import './guardian-language.js';

(function () {
  'use strict';

  const cfg = window.eduflowConfig || {};
  const i18n = window.EduFlowI18n;
  const t = (key) => (i18n ? i18n.t(key) : key);

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (v) => {
    const d = document.createElement('div');
    d.textContent = v == null ? '' : String(v);
    return d.innerHTML;
  };
  const money = (v) => `৳${Number(v || 0).toLocaleString('en-BD')}`;

  function createClient() {
    if (!cfg.supabaseUrl || !cfg.supabaseKey || !window.supabase?.createClient) {
      return null;
    }
    return window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  function setRoot(html) {
    const root = $('#root');
    if (root) root.innerHTML = html;
  }

  function card(title, body, wide = false) {
    return `<section class="portal-card${wide ? ' portal-wide' : ''}">
      <h2 class="label" style="margin:0 0 12px;font-size:0.85rem;letter-spacing:.04em;text-transform:uppercase;opacity:.75">${esc(title)}</h2>
      ${body}
    </section>`;
  }

  function renderSignedOut() {
    document.title = t('guardian.title');
    setRoot(`
      <div class="card portal-card portal-wide">
        <h1 style="margin:0 0 8px">${esc(t('guardian.signin_required'))}</h1>
        <p class="subtitle" style="margin:0 0 16px">${esc(t('guardian.invite_hint'))}</p>
        <p class="subtitle" style="margin:0">${esc(t('guardian.resend'))}</p>
      </div>`);
    const logout = $('#logout');
    if (logout) logout.style.display = 'none';
  }

  function renderNotReady() {
    document.title = t('guardian.title');
    setRoot(`
      <div class="card portal-card portal-wide">
        <h1 style="margin:0 0 8px">${esc(t('guardian.not_ready'))}</h1>
        <p class="subtitle" style="margin:0">${esc(t('guardian.resend'))}</p>
      </div>`);
  }

  function renderError(message) {
    setRoot(`
      <div class="card portal-card portal-wide">
        <h1 style="margin:0 0 8px">${esc(t('guardian.load_error'))}</h1>
        <p class="subtitle" style="margin:0 0 12px">${esc(message || t('guardian.try_again'))}</p>
        <button type="button" class="btn btn-primary" id="guardian-retry">${esc(t('guardian.try_again'))}</button>
      </div>`);
    $('#guardian-retry')?.addEventListener('click', () => location.reload());
  }

  function attendancePct(rows) {
    if (!rows?.length) return null;
    const present = rows.filter((r) => r.present).length;
    return Math.round((present / rows.length) * 1000) / 10;
  }

  function renderPortal(ctx) {
    const { guardian, org, students, attendanceByStudent, payments, results, notices } = ctx;
    document.title = t('guardian.title');

    const studentCards = (students || [])
      .map((s) => {
        const att = attendanceByStudent[s.id] || [];
        const pct = attendancePct(att);
        const lastResult = (results || []).find((r) => r.student_id === s.id);
        const examLabel = lastResult?.exams?.name
          ? `${lastResult.exams.name}: ${lastResult.marks}/${lastResult.exams.total_marks || 100}`
          : '—';
        return `<div class="portal-card">
          <div class="value" style="font-size:1.15rem;font-weight:700">${esc(s.name)}</div>
          <div class="subtitle">${esc(s.student_code || '')}${s.batches?.name ? ' · ' + esc(s.batches.name) : ''}</div>
          <div class="portal-list" style="margin-top:12px">
            <div class="portal-row"><span class="label">${esc(t('guardian.monthly_fee'))}</span><strong>${money(s.monthly_fee)}</strong></div>
            <div class="portal-row"><span class="label">${esc(t('guardian.attendance'))}</span><strong>${pct == null ? '—' : pct + '%'}</strong></div>
            <div class="portal-row"><span class="label">${esc(t('guardian.last_result'))}</span><strong>${esc(examLabel)}</strong></div>
          </div>
        </div>`;
      })
      .join('');

    const paymentRows = (payments || []).length
      ? (payments || [])
          .map(
            (p) =>
              `<div class="portal-row"><span>${esc(p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-BD') : '—')} · ${esc(p.students?.name || '')}</span><strong>${money(p.amount)}</strong></div>`
          )
          .join('')
      : `<div class="empty subtitle">—</div>`;

    const noticeRows = (notices || []).length
      ? (notices || [])
          .map(
            (n) =>
              `<div class="portal-row" style="flex-direction:column;align-items:flex-start"><strong>${esc(n.title)}</strong><span class="subtitle">${esc(n.body)}</span></div>`
          )
          .join('')
      : `<div class="empty subtitle">${esc(t('guardian.no_notices'))}</div>`;

    setRoot(`
      <div class="portal-grid">
        <section class="portal-card portal-wide">
          <div class="subtitle">${esc(org?.name || 'EduFlow')}</div>
          <h1 style="margin:4px 0 0">${esc(guardian.full_name)}</h1>
          <p class="subtitle" style="margin:8px 0 0">
            ${esc(guardian.relationship || t('guardian.title'))}
            ${guardian.phone ? ' · ' + esc(guardian.phone) : ''}
          </p>
        </section>

        <section class="portal-card portal-wide">
          <h2 class="label" style="margin:0 0 12px;font-size:0.85rem;letter-spacing:.04em;text-transform:uppercase;opacity:.75">${esc(t('guardian.students'))}</h2>
          <div class="portal-grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">
            ${studentCards || `<div class="empty subtitle">—</div>`}
          </div>
        </section>

        ${card(t('guardian.recent_payments'), `<div class="portal-list">${paymentRows}</div>`, true)}
        ${card(t('guardian.notices'), `<div class="portal-list">${noticeRows}</div>`, true)}
      </div>`);

    const logout = $('#logout');
    if (logout) {
      logout.style.display = '';
      logout.textContent = t('guardian.signout');
    }
  }

  async function loadPortal(sb, user) {
    const { data: account, error: accountErr } = await sb
      .from('guardian_accounts')
      .select('id,organization_id,guardian_id,guardians(id,full_name,phone,email,relationship,preferred_language,portal_enabled)')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (accountErr) throw accountErr;
    if (!account?.guardian_id || !account.guardians) {
      renderNotReady();
      return;
    }

    const guardian = account.guardians;
    if (guardian.portal_enabled === false) {
      renderNotReady();
      return;
    }

    if (guardian.preferred_language && i18n) {
      const lang = guardian.preferred_language.startsWith('en') ? 'en' : 'bn';
      if (i18n.getLang() !== lang) i18n.setLang(lang);
    }

    const orgId = account.organization_id;

    const [{ data: org }, { data: links }, { data: notices }] = await Promise.all([
      sb.from('organizations').select('id,name,district').eq('id', orgId).maybeSingle(),
      sb
        .from('student_guardians')
        .select('student_id,is_primary,students(id,name,student_code,monthly_fee,batch_id,status,batches(name))')
        .eq('guardian_id', account.guardian_id),
      sb
        .from('notices')
        .select('id,title,body,status,created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const students = (links || [])
      .map((l) => l.students)
      .filter(Boolean)
      .filter((s) => s.status === 'active' || !s.status);

    const studentIds = students.map((s) => s.id);
    let attendanceByStudent = {};
    let payments = [];
    let results = [];

    if (studentIds.length) {
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const sinceStr = since.toISOString().slice(0, 10);

      const [attRes, payRes, resRes] = await Promise.all([
        sb
          .from('attendance')
          .select('student_id,attendance_date,present')
          .in('student_id', studentIds)
          .gte('attendance_date', sinceStr)
          .order('attendance_date', { ascending: false }),
        sb
          .from('payments')
          .select('id,amount,paid_at,payment_method,receipt_no,student_id,students(name)')
          .in('student_id', studentIds)
          .order('paid_at', { ascending: false })
          .limit(20),
        sb
          .from('results')
          .select('id,student_id,marks,created_at,exams(name,total_marks,exam_date)')
          .in('student_id', studentIds)
          .order('created_at', { ascending: false })
          .limit(30),
      ]);

      (attRes.data || []).forEach((row) => {
        if (!attendanceByStudent[row.student_id]) attendanceByStudent[row.student_id] = [];
        attendanceByStudent[row.student_id].push(row);
      });
      payments = payRes.data || [];
      results = resRes.data || [];
    }

    try {
      await sb
        .from('guardian_accounts')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', account.id);
    } catch (_) {}

    renderPortal({
      guardian,
      org: org || { name: 'EduFlow' },
      students,
      attendanceByStudent,
      payments,
      results,
      notices: (notices || []).filter((n) => !n.status || n.status === 'published'),
    });
  }

  async function boot() {
    const sb = createClient();
    if (!sb) {
      renderError('Supabase client unavailable');
      return;
    }

    $('#logout')?.addEventListener('click', async () => {
      await sb.auth.signOut();
      location.reload();
    });

    document.title = t('guardian.title');
    const brandSub = $('.portal-brand .subtitle');
    if (brandSub) brandSub.textContent = t('guardian.title');
    const logoutBtn = $('#logout');
    if (logoutBtn) logoutBtn.textContent = t('guardian.signout');

    window.addEventListener('eduflow:langchange', () => {
      document.title = t('guardian.title');
      if (brandSub) brandSub.textContent = t('guardian.title');
      if (logoutBtn) logoutBtn.textContent = t('guardian.signout');
    });

    try {
      const {
        data: { session },
      } = await sb.auth.getSession();

      if (!session?.user) {
        renderSignedOut();
        return;
      }

      setRoot(`<div class="card portal-card portal-wide"><div class="empty">${esc(t('loading') || 'Loading…')}</div></div>`);
      await loadPortal(sb, session.user);
    } catch (err) {
      console.error(err);
      renderError(err?.message || t('guardian.try_again'));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
