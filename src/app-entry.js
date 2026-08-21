import '../styles.css';
import '../brand-refresh.css';
import '../runtime-stability.css';
import '../auth-modern.css';

import '../config.js';
import './supabase-global.js';
import './i18n.js';
import '../dev-access.js';
import '../branch-context.js';
import '../runtime-stability.js';
import '../mock-data.js';
import '../mock-data-normalize.js';
import '../demo-mode.js';
import '../core-runtime.js';
import '../route-controller.js';
import '../pagination-controller.js';
import '../offline-attendance.js';
import '../auth-recovery.js';
import '../app-core.js';
import '../operations-ui.js';
import '../payment-checkout.js';
import '../growth-features.js';
import '../production-gaps-fix.js';
import '../runtime-feature-fixes.js';
import './sms-actions.js';
import './i18n-app-bridge.js';

// Wire language toggle + initial static apply
(function () {
  const i18n = window.EduFlowI18n;
  if (!i18n) return;

  function wireToggles() {
    const handler = () => {
      i18n.toggleLang();
      i18n.applyStatic();
      // Re-render current page if app is mounted
      if (window.EduFlow?.navigateTo && location.hash) {
        const page = location.hash.slice(1) || 'dashboard';
        window.EduFlow.navigateTo(page);
      } else if (window.EduFlow?.navigateTo) {
        window.EduFlow.navigateTo('dashboard');
      }
    };
    document.getElementById('lang-toggle')?.addEventListener('click', handler);
    document.getElementById('lang-toggle-top')?.addEventListener('click', handler);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      i18n.applyStatic();
      wireToggles();
    });
  } else {
    i18n.applyStatic();
    wireToggles();
  }

  window.addEventListener('eduflow:langchange', () => i18n.applyStatic());
})();
