/**
 * EduFlow Configuration
 * 
 * NEVER commit real credentials to git.
 * For Vercel: Set environment variables in Project Settings.
 * For local dev: Create a .env file and use a build tool, or serve with:
 *   npx serve . --listen 3000
 * 
 * Required env vars:
 *   SUPABASE_URL, SUPABASE_ANON_KEY
 * Optional:
 *   APP_ENV (development|staging|production)
 *   RATE_LIMIT_MAX (default: 100)
 *   RATE_LIMIT_WINDOW_MS (default: 60000)
 */

(function() {
  'use strict';

  const DEFAULTS = {
    appEnv: 'development',
    rateLimitMax: 100,
    rateLimitWindow: 60000,
    maxStudentsFree: 50,
    maxStudentsPro: 500,
    maxStudentsEnterprise: 5000,
  };

  // Try multiple sources (Vercel envs, injected config, localStorage override for dev)
  function getConfig() {
    // Vercel injects env vars at build time for SSR; for SPA we check window.__ENV
    const env = window.__ENV || {};

    const url = env.SUPABASE_URL || localStorage.getItem('ef_supabase_url') || '';
    const key = env.SUPABASE_ANON_KEY || localStorage.getItem('ef_supabase_key') || '';

    return {
      supabaseUrl: url,
      supabaseKey: key,
      appEnv: env.APP_ENV || DEFAULTS.appEnv,
      rateLimitMax: parseInt(env.RATE_LIMIT_MAX || DEFAULTS.rateLimitMax, 10),
      rateLimitWindow: parseInt(env.RATE_LIMIT_WINDOW_MS || DEFAULTS.rateLimitWindow, 10),
      limits: {
        free: parseInt(env.MAX_STUDENTS_FREE || DEFAULTS.maxStudentsFree, 10),
        pro: parseInt(env.MAX_STUDENTS_PRO || DEFAULTS.maxStudentsPro, 10),
        enterprise: parseInt(env.MAX_STUDENTS_ENTERPRISE || DEFAULTS.maxStudentsEnterprise, 10),
      }
    };
  }

  const cfg = getConfig();

  // Validate
  if (!cfg.supabaseUrl || !cfg.supabaseKey) {
    console.error(
      '%c[EduFlow Config Error]%c\n' +
      'Supabase URL and Anon Key are required.\n' +
      'Set them via environment variables or localStorage for dev:\n' +
      '  localStorage.setItem("ef_supabase_url", "your-url")\n' +
      '  localStorage.setItem("ef_supabase_key", "your-anon-key")',
      'color:#dc2626;font-weight:bold', 'color:inherit'
    );
  }

  window.eduflowConfig = cfg;
})();