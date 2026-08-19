/** EduFlow public client configuration. The Supabase publishable/anon key is safe to expose in a browser; RLS is the security boundary. */
(function () {
  'use strict';
  var env = window.__ENV || {};
  var storedUrl = localStorage.getItem('ef_supabase_url');
  var storedKey = localStorage.getItem('ef_supabase_key');
  window.eduflowConfig = {
    supabaseUrl: env.SUPABASE_URL || storedUrl || 'https://tljxhsspwabeslpbyiif.supabase.co',
    supabaseKey: env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || storedKey || 'sb_publishable_LhIRXury0u3KuwbT7RApdQ_rsMFM-tm',
    appEnv: env.APP_ENV || 'production',
    rateLimitMax: Number(env.RATE_LIMIT_MAX || 100),
    rateLimitWindow: Number(env.RATE_LIMIT_WINDOW_MS || 60000),
    limits: { free: Number(env.MAX_STUDENTS_FREE || 50), pro: Number(env.MAX_STUDENTS_PRO || 500), enterprise: Number(env.MAX_STUDENTS_ENTERPRISE || 5000) }
  };
})();
