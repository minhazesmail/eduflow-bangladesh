/* EduFlow shared runtime: one Supabase client, route cancellation, safe toast. */
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
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
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
      detail: { name, serial: routeSerial, signal: activeController?.signal || null }
    }));
    return activeController?.signal || null;
  }

  function cancelRoute(reason = 'route-cancelled') {
    activeController?.abort(reason);
    activeController = null;
    window.dispatchEvent(new CustomEvent('eduflow:route-cancel', { detail: { reason } }));
  }

  function safeToast(message, type = 'info') {
    try {
      const existing = window.EduFlow?.toast?.(message, type);
      if (existing !== undefined) return existing;
    } catch (_) {}

    try {
      const root = document.getElementById('toast-root') || document.body;
      const node = document.createElement('div');
      node.className = 'eduflow-runtime-toast';
      node.textContent = message == null ? 'Something went wrong.' : String(message);
      Object.assign(node.style, {
        position: 'fixed',
        right: '18px',
        bottom: '18px',
        zIndex: '99999',
        maxWidth: 'min(420px, calc(100vw - 36px))',
        padding: '12px 14px',
        borderRadius: '12px',
        background: '#111827',
        color: '#fff',
        boxShadow: '0 14px 40px rgba(0,0,0,.18)',
        font: '600 13px/1.4 system-ui,sans-serif'
      });
      root.appendChild(node);
      window.setTimeout(() => node.remove(), 4200);
    } catch (_) {
      try { window.alert(String(message || 'Something went wrong.')); } catch (__) {}
    }
  }

  window.EduFlowRuntime = {
    get db() { return getClient(); },
    async getSession() {
      const { data, error } = await getClient().auth.getSession();
      if (error) throw error;
      return data.session || null;
    },
    beginRoute,
    cancelRoute,
    get routeSignal() { return activeController?.signal || null; },
    get routeSerial() { return routeSerial; }
  };

  window.eduflowSafeToast = safeToast;
})();
