/**
 * Preserves direct/bookmarked Growth-page hashes through app-core bootstrap.
 * app-core owns the core page whitelist; this bridge keeps Growth deep links
 * from being discarded before the Growth renderer is ready.
 */
(function () {
  'use strict';

  const GROWTH_PAGES = new Set([
    'attention', 'guardians', 'admissions', 'branches', 'routine',
    'expenses', 'documents', 'integrations', 'notifications'
  ]);

  const requested = location.hash.slice(1);
  if (!GROWTH_PAGES.has(requested)) return;

  const original = requested;
  sessionStorage.setItem('eduflow_pending_growth_page', original);

  if (location.hash !== '#dashboard') {
    history.replaceState(null, '', `${location.pathname}${location.search}#dashboard`);
  }

  let attempts = 0;
  const restore = () => {
    const app = document.getElementById('app-shell');
    const visible = app && !app.classList.contains('hidden');
    const growth = window.EduFlowGrowth;
    if (visible && growth?.route) {
      sessionStorage.removeItem('eduflow_pending_growth_page');
      history.replaceState(null, '', `${location.pathname}${location.search}#${original}`);
      growth.route();
      return;
    }
    if (++attempts < 240) window.setTimeout(restore, 100);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restore, { once: true });
  } else {
    restore();
  }
})();
