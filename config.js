/**
 * EduFlow Configuration
 * Optional overrides via localStorage (dev) or window.__ENV (if injected at deploy).
 */
(function () {
  "use strict";
  var env = window.__ENV || {};
  window.eduflowConfig = {
    supabaseUrl: env.SUPABASE_URL || localStorage.getItem("ef_supabase_url") || "",
    supabaseKey: env.SUPABASE_ANON_KEY || localStorage.getItem("ef_supabase_key") || "",
    appEnv: env.APP_ENV || "production",
    rateLimitMax: parseInt(env.RATE_LIMIT_MAX || "100", 10),
    rateLimitWindow: parseInt(env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    limits: {
      free: parseInt(env.MAX_STUDENTS_FREE || "50", 10),
      pro: parseInt(env.MAX_STUDENTS_PRO || "500", 10),
      enterprise: parseInt(env.MAX_STUDENTS_ENTERPRISE || "5000", 10)
    }
  };
})();
