/* Single runtime UX layer: attention, loading, safe errors, and drafts. */
(function () {
  'use strict';

  const cfg = window.eduflowConfig || {};
  const demo = !!cfg.isDemo;
  const root = () => document.getElementById('page-content');
  const escapeHtml = (value) => {
    const d = document.createElement('div');
    d.textContent = value == null ? '' : String(value);
    return d.innerHTML;
  };
  const toast = (message, type = 'error') => {
    if (window.EduFlow?.toast) return window.EduFlow.toast(message, type);
    const node = document.createElement('div');
    node.textContent = message;
    Object.assign(node.style, { position: 'fixed', right: '16px', bottom: '16px', zIndex: '100001', padding: '12px 14px', borderRadius: '10px', background: '#0f172a', color: '#fff', font: '600 13px system-ui' });
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 3500);
  };
  const money = (value) => `৳${Number(value || 0).toLocaleString('en-BD')}`;

  function db() {
    return window.EduFlowRuntime?.db || null;
  }

  function loading(label = 'Loading…') {
    const el = root();
    if (!el) return;
    el.innerHTML = `<div class="card eduflow-loading" aria-busy="true"><div class="spinner" aria-hidden="true"></div><strong>${escapeHtml(label)}</strong><span class="subtitle">Please wait while EduFlow loads the latest data.</span></div>`;
  }

  async function getOrgContext() {
    const s = db();
    if (!s) throw new Error('Database client is unavailable.');
    const session = await window.EduFlowRuntime.getSession();
    if (!session?.user) throw new Error('Your session has expired. Please sign in again.');
    const { data: profile, error } = await s.from('profiles').select('organization_id').eq('id', session.user.id).single();
    if (error || !profile?.organization_id) throw new Error('Workspace information is unavailable.');
    return { client: s, session, orgId: profile.organization_id };
  }

  async function queueAttention(studentId) {
    if (demo) return toast('Demo Mode is read-only. Guardian alerts are disabled.', 'info');
    const { client: s, orgId } = await getOrgContext();
    const { data: student, error: studentError } = await s.from('students').select('id,name,guardian_phone').eq('id', studentId).eq('organization_id', orgId).single();
    if (studentError || !student) throw new Error('Student not found.');
    if (!student.guardian_phone) throw new Error('Guardian phone is missing.');
    const { data: notification, error } = await s.from('notifications').insert({
      organization_id: orgId,
      student_id: studentId,
      channel: 'sms',
      type: 'attendance_absent',
      title: 'Attendance alert',
      body: `${student.name} has low recent attendance. Please check the EduFlow attendance details.`,
      status: 'queued'
    }).select('id').single();
    if (error) throw error;
    toast(`Guardian alert queued (${notification.id.slice(0, 8)}…).`, 'success');
  }

  async function renderAttention() {
    loading('Calculating attention signals…');
    try {
      if (demo) {
        const rows = [
          { id: 'd1', name: 'Rahim Ahmed', guardian_phone: '01711111111', attendance: 62, monthly_fee: 2500 },
          { id: 'd2', name: 'Nusrat Sultana', guardian_phone: '01822222222', attendance: 72, monthly_fee: 2800 },
          { id: 'd3', name: 'Tanvir Hasan', guardian_phone: '01933333333', attendance: 68, monthly_fee: 2400 }
        ];
        return renderRows(rows, rows.filter(r => r.attendance < 70), 3);
      }

      const { client: s, orgId } = await getOrgContext();
      const branchId = localStorage.getItem('eduflow.activeBranch') || null;
      const { data, error } = await s.rpc('get_attention_metrics', {
        p_organization_id: orgId,
        p_branch_id: branchId,
        p_days: 90,
        p_threshold: 70
      });
      if (error) throw error;
      const rows = data || [];
      const low = rows.filter(row => row.attendance != null);
      const unknown = rows.filter(row => row.attendance == null);
      const { count, error: countError } = await s.from('students').select('id', { count: 'exact', head: true }).eq('organization_id', orgId);
      if (countError) throw countError;
      renderRows(rows, low, unknown.length + low.length || count || 0, unknown.length);
    } catch (error) {
      toast(error.message || 'Could not load Attention Center.');
      const el = root();
      if (el) el.innerHTML = `<div class="card"><h2>Could not load Attention Center</h2><p class="subtitle">${escapeHtml(error.message || 'Please refresh and try again.')}</p></div>`;
    }
  }

  function renderRows(rows, low, totalStudents, unknownCount = 0) {
    const el = root();
    if (!el) return;
    el.innerHTML = `<div class="page-head"><div><h1>Attention Center</h1><p class="subtitle">Signals calculated from attendance history over the last 90 days.</p></div></div>
      <div class="grid grid-3"><div class="card"><div class="label">Low attendance</div><div class="value">${low.length}</div><div class="subtitle">Below 70%</div></div>
      <div class="card"><div class="label">No attendance history</div><div class="value">${unknownCount}</div><div class="subtitle">Not falsely flagged</div></div>
      <div class="card"><div class="label">Students</div><div class="value">${totalStudents}</div><div class="subtitle">Current workspace</div></div></div>
      <div class="card"><div class="section-head"><h2>Students needing attention</h2><span class="badge badge-danger">${low.length}</span></div>
      ${low.length ? `<div class="table-wrapper"><table><thead><tr><th>Student</th><th>Attendance</th><th>Guardian</th><th>Monthly fee</th><th></th></tr></thead><tbody>${low.map(row => `<tr><td><strong>${escapeHtml(row.name)}</strong></td><td><span class="badge badge-danger">${Number(row.attendance).toLocaleString('en-BD')}%</span></td><td>${escapeHtml(row.guardian_phone || '—')}</td><td>${money(row.monthly_fee)}</td><td><button class="btn btn-secondary btn-sm" data-attention-notify="${escapeHtml(row.id)}">Queue alert</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No students are currently below the 70% threshold.</div>'}</div>`;
    el.querySelectorAll('[data-attention-notify]').forEach(button => button.addEventListener('click', () => queueAttention(button.dataset.attentionNotify).catch(error => toast(error.message || 'Could not queue alert.'))));
  }

  const DRAFT_PREFIX = 'eduflow:draft:';
  function draftKey(form) { return `${DRAFT_PREFIX}${form.dataset.draftKey || form.id || 'form'}`; }
  function serialize(form) {
    const data = {};
    new FormData(form).forEach((value, key) => { if (!(value instanceof File)) data[key] = String(value); });
    return data;
  }
  function restore(form) {
    try {
      const raw = localStorage.getItem(draftKey(form));
      if (!raw) return;
      const data = JSON.parse(raw);
      Object.entries(data).forEach(([name, value]) => {
        const field = form.elements.namedItem(name);
        if (!field) return;
        if (field.type === 'checkbox' || field.type === 'radio') field.checked = String(value) === field.value;
        else field.value = value;
      });
    } catch (_) {}
  }
  function wireDrafts() {
    document.addEventListener('focusin', event => {
      const form = event.target.closest?.('form');
      if (!form || form.dataset.noDraft === 'true') return;
      if (form.querySelectorAll('input,select,textarea').length >= 4) restore(form);
    });
    document.addEventListener('input', event => {
      const form = event.target.closest?.('form');
      if (!form || form.dataset.noDraft === 'true' || form.querySelectorAll('input,select,textarea').length < 4) return;
      try { localStorage.setItem(draftKey(form), JSON.stringify(serialize(form))); } catch (_) {}
    });
    document.addEventListener('submit', event => {
      const form = event.target.closest?.('form');
      if (!form || form.dataset.noDraft === 'true') return;
      try { localStorage.removeItem(draftKey(form)); } catch (_) {}
    }, true);
  }

  function install() {
    wireDrafts();
    window.EduFlowRuntimeFixes = Object.freeze({ renderAttention, loading, queueAttention });
    window.addEventListener('hashchange', () => {
      const page = location.hash.replace(/^#\/?/, '');
      if (page === 'attention') setTimeout(renderAttention, 0);
    });
    document.addEventListener('click', event => {
      const target = event.target.closest?.('[data-page],[data-growth-action]');
      if (!target) return;
      const action = target.dataset.page || target.dataset.growthAction || '';
      if (action === 'attention' || action.includes('attention')) loading('Loading Attention Center…');
      else if (action && !action.includes('assistant')) loading('Loading…');
    }, true);
    document.addEventListener('click', event => {
      const ai = event.target.closest?.('[data-growth-page="assistant"],[data-growth-action="open-assistant"],a[href="#assistant"]');
      if (!ai) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      location.hash = '#attention';
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
