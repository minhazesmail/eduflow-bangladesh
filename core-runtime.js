/* EduFlow shared runtime: one Supabase client, cancellable route requests, server-side list pagination, stale-AI guard. */
(function () {
  'use strict';
  const cfg = window.eduflowConfig || {};
  if (!cfg.supabaseUrl || !cfg.supabaseKey || !window.supabase?.createClient) return;
  const nativeCreateClient = window.supabase.createClient.bind(window.supabase);
  let sharedClient = null;
  let activeController = null;
  let routeSerial = 0;

  function wrapBuilder(builder, table) {
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
            return request.then(resolve, reject);
          };
        }
        const value = Reflect.get(target, prop, receiver);
        if (typeof value !== 'function') return value;
        return (...args) => wrapBuilder(value.apply(target, args), table);
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
    }
    return sharedClient;
  }

  window.supabase.createClient = function () { return getClient(); };
  function beginRoute(name) {
    activeController?.abort('route-superseded');
    activeController = typeof AbortController !== 'undefined' ? new AbortController() : null;
    routeSerial += 1;
    window.dispatchEvent(new CustomEvent('eduflow:route-start', { detail: { name, serial: routeSerial, signal: activeController?.signal || null } }));
    return activeController?.signal || null;
  }
  function cancelRoute(reason='route-cancelled'){activeController?.abort(reason);activeController=null;window.dispatchEvent(new CustomEvent('eduflow:route-cancel',{detail:{reason}}));}

  window.EduFlowRuntime = {get db(){return getClient();},async getSession(){const {data,error}=await getClient().auth.getSession();if(error)throw error;return data.session||null;},beginRoute,cancelRoute,get routeSignal(){return activeController?.signal||null;},get routeSerial(){return routeSerial;}};

  document.addEventListener('click',event=>{const t=event.target instanceof Element?event.target.closest('[data-growth-page="assistant"],[data-growth-action="open-assistant"],a[href="#assistant"]'):null;if(!t)return;event.preventDefault();event.stopImmediatePropagation();location.hash='#attention';},true);
  window.addEventListener('hashchange',event=>{if(location.hash.replace(/^#\/?/,'')!=='assistant')return;event.stopImmediatePropagation();history.replaceState(null,'','#attention');window.dispatchEvent(new Event('hashchange'));},true);
})();
