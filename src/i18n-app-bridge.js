/**
 * Bridges EduFlowI18n into app-core runtime without a full rewrite.
 */
(function () {
  'use strict';

  function t(key, params) {
    return window.EduFlowI18n ? window.EduFlowI18n.t(key, params) : key;
  }

  function enhanceAfterRender() {
    const titleMap = {
      dashboard: 'nav.dashboard',
      students: 'page.students',
      batches: 'page.batches',
      attendance: 'page.attendance',
      payments: 'page.payments',
      exams: 'page.exams',
      results: 'page.results',
      teachers: 'page.teachers',
      notices: 'page.notices',
      team: 'page.team',
      billing: 'page.billing',
      settings: 'page.settings',
      audit: 'page.audit',
    };
    const page = (location.hash || '#dashboard').slice(1) || 'dashboard';
    const titleEl = document.getElementById('page-title');
    if (titleEl && titleMap[page]) titleEl.textContent = t(titleMap[page]);

    document.querySelectorAll('[data-sms-fee]').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.onclick = () => {
        const d = btn.dataset;
        window.EduFlowSms?.sendFeeReminder({
          studentId: d.studentId,
          studentName: d.studentName,
          phone: d.phone,
          amount: d.amount,
          orgName: d.orgName,
          organizationId: d.orgId,
        });
      };
    });

    document.querySelectorAll('[data-sms-result]').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.onclick = () => {
        const d = btn.dataset;
        window.EduFlowSms?.sendExamResult({
          studentId: d.studentId,
          studentName: d.studentName,
          phone: d.phone,
          examName: d.examName,
          marks: d.marks,
          totalMarks: d.totalMarks,
          orgName: d.orgName,
          organizationId: d.orgId,
        });
      };
    });
  }

  const root = () => document.getElementById('page-content');
  let observer;
  function startObserver() {
    const el = root();
    if (!el || observer) return;
    observer = new MutationObserver(() => {
      requestAnimationFrame(enhanceAfterRender);
    });
    observer.observe(el, { childList: true, subtree: true });
  }

  function patchEduFlow() {
    if (!window.EduFlow) return false;
    window.EduFlow.t = t;
    const original = window.EduFlow.navigateTo;
    if (original && !original.__i18nPatched) {
      window.EduFlow.navigateTo = function (page) {
        const r = original.apply(this, arguments);
        setTimeout(() => {
          window.EduFlowI18n?.applyStatic();
          enhanceAfterRender();
        }, 50);
        return r;
      };
      window.EduFlow.navigateTo.__i18nPatched = true;
    }
    startObserver();
    return true;
  }

  const iv = setInterval(() => {
    if (patchEduFlow()) clearInterval(iv);
  }, 100);
  setTimeout(() => clearInterval(iv), 15000);

  window.addEventListener('eduflow:langchange', () => {
    window.EduFlowI18n?.applyStatic();
    enhanceAfterRender();
  });
})();
