/**
 * Injects SMS action buttons into Students tables (fee reminders).
 * Pairs with src/sms-actions.js and i18n-app-bridge.js.
 */
(function () {
  'use strict';

  const t = (key) => (window.EduFlowI18n ? window.EduFlowI18n.t(key) : key);

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

  function injectStudents() {
    const table = document.querySelector('#page-content table');
    if (!table) return;
    const headers = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim().toLowerCase());
    if (headers.length < 5) return;
    const looksLikeStudents =
      headers.some((h) => h.includes('guardian') || h.includes('\u0985\u09ad\u09bf\u09ad\u09be\u09ac\u0995')) ||
      headers.some((h) => h.includes('monthly') || h.includes('\u09ae\u09be\u09b8\u09bf\u0995'));
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

  function run() {
    const page = (location.hash || '#dashboard').slice(1) || 'dashboard';
    if (page === 'students') injectStudents();
  }

  const root = document.getElementById('page-content');
  if (root) {
    const obs = new MutationObserver(() => requestAnimationFrame(run));
    obs.observe(root, { childList: true, subtree: true });
  }
  window.addEventListener('eduflow:langchange', () => requestAnimationFrame(run));
  setTimeout(run, 300);
})();
