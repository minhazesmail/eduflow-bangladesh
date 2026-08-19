// ⚠️ SECURITY: These credentials are exposed in client-side code.
// For production, use environment variables or server-side configuration.
// Consider using Supabase Edge Functions for sensitive operations.
// Configuration - Use environment variables in production
// For Vercel: Set SUPABASE_URL and SUPABASE_KEY in project settings
// For local dev: Create a config.js file with window.eduflowConfig
const SUPABASE_URL = window.eduflowConfig?.supabase?.url ||
                     window.env?.SUPABASE_URL ||
                     "https://tljxhsspwabeslpbyiif.supabase.co";
const SUPABASE_KEY = window.eduflowConfig?.supabase?.key ||
                     window.env?.SUPABASE_KEY ||
                     "sb_publishable_LhIRXury0u3KuwbT7RApdQ_rsMFM-tm";

// Security warning
if (SUPABASE_URL === "https://tljxhsspwabeslpbyiif.supabase.co") {
  console.warn("⚠️ Using default Supabase URL. Set SUPABASE_URL environment variable for production.");
}

// Keep all your existing app.js code below this point
// [Your existing app.js code continues here...]
let sb=null,session=null,profile=null,page="dashboard",authMode="signin",data={students:[],batches:[],teachers:[],payments:[],exams:[],results:[],attendance:[],notices:[]};

// Rest of your existing app.js code...
// [All your existing functions and code remain unchanged]