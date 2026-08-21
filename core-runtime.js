/* EduFlow shared runtime: one Supabase client, lightweight route cancellation, stale-AI guard. */
(function () {
  'use strict';

  const cfg = window.eduflowConfig || {};
  if (!cfg.supabaseUrl || !cfg.supabaseKey || !window.supabase?.createClient) return;

  const nativeCreateClient = window.supabase.createClient.bind(window.supabase);
  let sharedClient = null;
  let activeController = null;
  let routeSerial = 0;

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

  // Keep one client across legacy modules. Do not Proxy Supabase query builders:
  // they are thenables and intercepting `then()` can lock the main thread.
  window.supabase.createClient = function () {
    return getClient();
  };

  function beginRoute(name) {
    activeController?.abort('route-superseded');
    activeController = typeof AbortController !== 'undefined' ? new AbortController() : null;
    routeSerial += 1;
    window.dispatchEvent(new CustomEvent('eduflow:route-start', {
      detail: {
        name,
        serial: routeSerial,
        signal: activeController?.signal || null
      }
    }));
    return activeController?.signal || null;
  }

  function cancelRoute(reason = 'route-cancelled') {
    activeController?.abort(reason);
    activeController = null;
    window.dispatchEvent(new CustomEvent('eduflow:route-cancel', {
      detail: { reason }
    }));
  }

  window.EduFlowRuntime = {
    get db() {
      return getClient();
    },
    async getSession() {
      const { data, error } = await getClient().auth.getSession();
      if (error) throw error;
      return data.session || null;
    },
    beginRoute,
    cancelRoute,
    get routeSignal() {
      return activeController?.signal || null;
    },
    get routeSerial() {
      return routeSerial;
    }
  };

  // Hard-stop stale AI navigation without adding another router.
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element
      ? event.target.closest('[data-growth-page="assistant"],[data-growth-action="open-assistant"],a[href="#assistant"]')
      : null;
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.hash = '#attention';
  }, true);

  window.addEventListener('hashchange', () => {
    if (location.hash.replace(/^#\/?/, '') !== 'assistant') return;
    history.replaceState(null, '', '#attention');
  }, true);
})();
