import '../styles.css';
import '../brand-refresh.css';
import '../auth-modern.css';

import '../config.js';
import './supabase-global.js';
import './security-sanitize.js';
import './i18n.js';
import '../dev-access.js';
import '../branch-context.js';
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
import './app-core-sms-patch.js';
import './attrition-ui.js';

(function () {
  const i18n = window.EduFlowI18n;
  if (!i18n) return;

  const handler = () => {
    i18n.toggleLang();
    i18n.applyAll?.() || i18n.applyStatic();
    if (window.EduFlow?.navigateTo) {
      window.EduFlow.navigateTo(location.hash.slice(1) || 'dashboard');
    }
  };

  const wire = () => {
    document.getElementById('lang-toggle')?.addEventListener('click', handler);
    document.getElementById('lang-toggle-top')?.addEventListener('click', handler);
    i18n.applyAll?.() || i18n.applyStatic();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
