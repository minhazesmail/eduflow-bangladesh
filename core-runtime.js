/* EduFlow shared runtime: exactly one Supabase client per page. */
(function () {
  'use strict';

  const cfg = window.eduflowConfig || {};
  if (!cfg.supabaseUrl || !cfg.supabaseKey || !window.supabase?.createClient) return;

  const nativeCreateClient = window.supabase.createClient.bind(window.supabase);
  let sharedClient = null;

  function getClient() {
    if (!sharedClient) {
      sharedClient = nativeCreateClient(cfg.supabaseUrl, cfg.supabaseKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      });
    }
    return sharedClient;
  }

  window.supabase.createClient = function () {
    return getClient();
  };

  window.EduFlowRuntime = Object.freeze({
    get db() { return getClient(); },
    async getSession() {
      const { data, error } = await getClient().auth.getSession();
      if (error) throw error;
      return data.session || null;
    }
  });
})();
