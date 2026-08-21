/** EduFlow browser configuration. Public Supabase URL + publishable key only. */
(function () {
  'use strict';

  const demoParam = new URLSearchParams(window.location.search).get('demo');
  const isDemo = demoParam === 'true' || demoParam === '1';

  window.eduflowConfig = Object.freeze({
    supabaseUrl: 'https://tljxhsspwabeslpbyiif.supabase.co',
    supabaseKey: 'sb_publishable_LhIRXury0u3KuwbT7RApdQ_rsMFM-tm',
    appEnv: 'production',
    isDemo,
    limits: { free: 50, pro: 500, enterprise: 5000 }
  });
})();
