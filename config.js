/** EduFlow browser configuration. Public Supabase URL + publishable key only. */
(function () {
  'use strict';
  window.eduflowConfig = Object.freeze({
    supabaseUrl: 'https://tljxhsspwabeslpbyiif.supabase.co',
    supabaseKey: 'sb_publishable_LhIRXury0u3KuwbT7RApdQ_rsMFM-tm',
    appEnv: 'production',
    rateLimitMax: 100,
    rateLimitWindow: 60000,
    limits: { free: 50, pro: 500, enterprise: 5000 }
  });
})();
