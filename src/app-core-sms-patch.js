/**
 * Injects SMS action buttons into Students / Results tables.
 * Fee SMS uses guardian phone from the students table row.
 * Result SMS loads guardian/student phones from Supabase when needed.
 */
(function () {
  'use strict';

  const t = (key) => (window.EduFlowI18n ? window.EduFlowI18n.t(key) : key);
  let phoneCache = null; // Map studentName -> phone

  function orgMeta() {
    const org = window.EduFlow?.organization;
    return {
      orgName: org?.name || document.getElementById('org-name')?.textContent || 'EduFlow',
      orgId: org?.id || '',
    };
  }

  function alreadyHasSms(row) {
    return !!row.querySelector('[data-sms-fee],[data-sms-result]');
  }

  function getClient() {
    const cfg = window.eduflowConfig;
    if (!cfg?.supabaseUrl || !window.supabase?.createClient) return null;
    return window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  }

  async function ensurePhoneCache() {
    if (phoneCache) return phoneCache;
    phoneCache = new Map();
    const orgId = orgMeta().orgId || window.EduFlow?.organization?.id;
    const sb = getClient();
    if (!sb || !orgId) return phoneCache;
    try {
      const { data } = await sb
        .from('students')
        .select('name,phone,guardian_phone')
        .eq('organization_id', orgId);
      (data || []).forEach((s) => {
        const phone = s.guardian_phone || s.phone || '';
        if (phone && s.name) phoneCache.set(String(s.name).trim(), phone);
      });
    } catch (_) {}
    return phoneCache;
  }

  function injectStudents() {
    const table = document.querySelector('#page-content table');
    if (!table) return;
    const headers = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim().toLowerCase());
    if (headers.length < 5) return;
    const looksLikeStudents =
      headers.some((h) => h.includes('guardian') || h.includes('অভিভাবক')) ||
      headers.some((h) => h.includes('monthly') || h.includes('মাসিক') || h.includes('fee') || h.includes('ফি'));
    if (!looksLikeStudents) return;

    const { orgName, orgId } = orgMeta();
    table.querySelectorAll('tbody tr').forEach((row) => {
      if (alreadyHasSms(row)) return;
      const cells = row.querySelectorAll('td');
      if (cells.length < 5) return;
      const name = cells[0]?.textContent?.trim() || '';
      const phoneCell = cells[2]?.textContent?.trim() || cells[1]?.textContent?.trim() || '';
      const phone = phoneCell === '-' ? '' : phoneCell;
      const feeText = cells[4]?.textContent?.replace(/[^\d.]/g, '') || '0';
      const actions = cells[cells.length - 1];
      if (!actions || !phone) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm btn-secondary';
      btn.textContent = t('sms.send_fee_reminder');
      btn.setAttribute('data-sms-fee', '');
      btn.dataset.studentName = name;
      btn.dataset.phone = phone;
      btn.dataset.amount = feeText;
      btn.dataset.orgName = orgName;
      btn.dataset.orgId = orgId;
      btn.style.marginLeft = '4px';
      actions.appendChild(btn);
    });
  }

  async function injectResults() {
    const table = document.querySelector('#page-content table');
    if (!table) return;
    const headers = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim().toLowerCase());
    const looksLikeResults =
      headers.some((h) => h.includes('percent') || h.includes('শতাংশ')) ||
      (headers.some((h) => h.includes('marks') || h.includes('নম্বর')) &&
        headers.some((h) => h.includes('exam') || h.includes('পরীক্ষা')));
    if (!looksLikeResults) return;

    const cache = await ensurePhoneCache();
    const { orgName, orgId } = orgMeta();

    table.querySelectorAll('tbody tr').forEach((row) => {
      if (alreadyHasSms(row)) return;
      const cells = [...row.querySelectorAll('td')];
      if (cells.length < 4) return;
      const studentName = cells[0]?.textContent?.trim() || '';
      const examName = cells[1]?.textContent?.trim() || '';
      const marksParts = (cells[2]?.textContent || '').split('/');
      const phone = cache.get(studentName) || '';
      if (!phone) return;

      let actions = cells[cells.length - 1];
      // If last cell is not actions-like, append a new cell
      if (cells.length === 4) {
        actions = document.createElement('td');
        row.appendChild(actions);
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm btn-secondary';
      btn.textContent = t('sms.send_result');
      btn.setAttribute('data-sms-result', '');
      btn.dataset.studentName = studentName;
      btn.dataset.phone = phone;
      btn.dataset.examName = examName;
      btn.dataset.marks = (marksParts[0] || '0').trim();
      btn.dataset.totalMarks = (marksParts[1] || '0').trim();
      btn.dataset.orgName = orgName;
      btn.dataset.orgId = orgId;
      actions.appendChild(btn);
    });
  }

  function run() {
    const page = (location.hash || '#dashboard').slice(1) || 'dashboard';
    if (page === 'students') injectStudents();
    if (page === 'results') injectResults();
  }

  const root = document.getElementById('page-content');
  if (root) {
    const obs = new MutationObserver(() => requestAnimationFrame(run));
    obs.observe(root, { childList: true, subtree: true });
  }
  window.addEventListener('eduflow:langchange', () => {
    phoneCache = null;
    requestAnimationFrame(run);
  });
  setTimeout(run, 300);
})();
