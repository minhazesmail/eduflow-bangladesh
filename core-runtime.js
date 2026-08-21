/* EduFlow shared runtime: exactly one Supabase client per page, plus hard removal of stale AI routes. */
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

  // AI was retired. Stop stale links/routes before feature routers can consume them.
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element
      ? event.target.closest('[data-growth-page="assistant"],[data-growth-action="open-assistant"],a[href="#assistant"]')
      : null;
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.hash = '#attention';
  }, true);

  window.addEventListener('hashchange', (event) => {
    if (location.hash.replace(/^#\/?/, '') !== 'assistant') return;
    event.stopImmediatePropagation();
    history.replaceState(null, '', '#attention');
    window.dispatchEvent(new Event('hashchange'));
  }, true);
})();
