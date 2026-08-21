/* EduFlow shared runtime: Supabase client, request cancellation and centralized state events. */
import { store } from './src/eduflow-store.js';

const cfg = window.eduflowConfig || {};
if (!cfg.supabaseUrl || !cfg.supabaseKey || !window.supabase?.createClient) {
  store.actions.setState?.({ ui: { loading: false } }, 'runtime:missing-config');
} else {
  const nativeCreateClient = window.supabase.createClient.bind(window.supabase);
  let sharedClient = null;
  let activeController = null;

  const MUTATIONS = new Set(['insert', 'update', 'upsert', 'delete']);

  function wrapBuilder(builder, table, operation = null) {
    if (!builder || typeof builder !== 'object') return builder;
    return new Proxy(builder, {
      get(target, prop, receiver) {
        if (prop === 'then') {
          return (resolve, reject) => {
            let request = target;
            const ctx = window.EduFlowPagination;
            if (ctx?.enabled && ctx.table === table && typeof request.range === 'function' && !request.__eduflowRanged) {
              const from = Math.max(0, Number(ctx.page || 0) * Number(ctx.size || 25));
              request = request.range(from, from + Number(ctx.size || 25) - 1);
              try { Object.defineProperty(request, '__eduflowRanged', { value: true, configurable: true }); } catch (_) {}
            }
            const signal = activeController?.signal;
            if (signal && typeof request.abortSignal === 'function') request = request.abortSignal(signal);
            return request.then((result) => {
              if (!result?.error && operation) store.actions.recordsChanged(table, operation, result?.data ?? null);
              return resolve(result);
            }, reject);
          };
        }
        const value = Reflect.get(target, prop, receiver);
        if (typeof value !== 'function') return value;
        const nextOperation = MUTATIONS.has(String(prop)) ? String(prop) : operation;
        return (...args) => wrapBuilder(value.apply(target, args), table, nextOperation);
      }
    });
  }

  function getClient() {
    if (!sharedClient) {
      sharedClient = nativeCreateClient(cfg.supabaseUrl, cfg.supabaseKey, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
      });
      const nativeFrom = sharedClient.from.bind(sharedClient);
      sharedClient.from = table => wrapBuilder(nativeFrom(table), table);
      sharedClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') store.actions.setAuth(null, null);
        else if (session) store.actions.setAuth(session, store.getState().auth.profile);
        store.on('auth:changed', () => {});
      });
    }
    return sharedClient;
  }

  window.supabase.createClient = function () { return getClient(); };

  function beginRoute(name) {
    activeController?.abort('route-superseded');
    activeController = typeof AbortController !== 'undefined' ? new AbortController() : null;
    store.actions.beginRoute(name || location.hash.slice(1) || 'dashboard', activeController?.signal || null);
    return activeController?.signal || null;
  }

  function cancelRoute(reason = 'route-cancelled') {
    activeController?.abort(reason);
    activeController = null;
    store.actions.cancelRoute(reason);
  }

  window.EduFlowRuntime = {
    get db() { return getClient(); },
    async getSession() {
      const { data, error } = await getClient().auth.getSession();
      if (error) throw error;
      if (data.session) store.actions.setAuth(data.session, store.getState().auth.profile);
      return data.session || null;
    },
    beginRoute,
    cancelRoute,
    get routeSignal() { return store.getState().runtime.routeSignal || activeController?.signal || null; },
    get routeSerial() { return store.getState().runtime.routeSerial; }
  };

  document.addEventListener('click', event => {
    const target = event.target instanceof Element
      ? event.target.closest('[data-growth-page="assistant"],[data-growth-action="open-assistant"],a[href="#assistant"]')
      : null;
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.hash = '#attention';
  }, true);

  window.addEventListener('hashchange', event => {
    if (location.hash.replace(/^#\/?/, '') !== 'assistant') return;
    event.stopImmediatePropagation();
    history.replaceState(null, '', '#attention');
    window.dispatchEvent(new Event('hashchange'));
  }, true);
}
