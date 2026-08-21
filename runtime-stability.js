/* EduFlow runtime stability guards. Loaded before growth-features.js. */
(function () {
  'use strict';
  const NativeMutationObserver = window.MutationObserver;
  if (NativeMutationObserver && !window.__eduflowMutationObserverPatched) {
    window.__eduflowMutationObserverPatched = true;
    window.MutationObserver = class EduFlowMutationObserver extends NativeMutationObserver {
      constructor(callback) {
        let observesBody = false;
        const source = (() => { try { return Function.prototype.toString.call(callback); } catch (_) { return ''; } })();
        const growthRouterObserver = source.includes('injectNav') && source.includes('route()');
        super((mutations, observer) => {
          if (growthRouterObserver) {
            const nav = document.querySelector('.nav');
            if (!nav) return;
            callback([], observer);
            try { observer.disconnect(); } catch (_) {}
            return;
          }
          const pageContentOnly = observesBody && mutations.length > 0 && mutations.every((mutation) => {
            const target = mutation.target;
            return target && typeof target.closest === 'function' && target.closest('#page-content');
          });
          if (!pageContentOnly) callback(mutations, observer);
        });
        this.__eduflowMarkBody = () => { observesBody = true; };
      }
      observe(target, options) {
        if (target === document.body) this.__eduflowMarkBody?.();
        return super.observe(target, options);
      }
    };
  }
  const nativeSetInterval = window.setInterval.bind(window);
  window.setInterval = function (handler, timeout, ...args) {
    try { if (typeof handler === 'function' && /dispatchQueued/.test(Function.prototype.toString.call(handler))) return 0; } catch (_) {}
    return nativeSetInterval(handler, timeout, ...args);
  };
  window.eduflowSafeToast = function (message, type) {
    try { const existing = window.EduFlow?.toast?.(message, type); if (existing !== undefined) return existing; } catch (_) {}
    try {
      const root = document.getElementById('toast-root') || document.body;
      const node = document.createElement('div'); node.className='eduflow-runtime-toast'; node.textContent=message==null?'Something went wrong.':String(message);
      Object.assign(node.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:'99999',maxWidth:'min(420px, calc(100vw - 36px))',padding:'12px 14px',borderRadius:'12px',background:'#111827',color:'#fff',boxShadow:'0 14px 40px rgba(0,0,0,.18)',font:'600 13px/1.4 system-ui,sans-serif'});
      root.appendChild(node); window.setTimeout(()=>node.remove(),4200);
    } catch (_) { try { window.alert(String(message||'Something went wrong.')); } catch (__) {} }
  };
  const nativeCreateClient = window.supabase?.createClient;
  if (nativeCreateClient && !window.__eduflowAuthBootstrap) {
    window.__eduflowAuthBootstrap = true;
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const waitForProfile = async (client, userId) => {
      if (!userId) return;
      for (let i = 0; i < 10; i++) {
        try {
          const { data, error } = await client.from('profiles').select('id,organization_id,role').eq('id', userId).maybeSingle();
          if (!error && data?.id && data.organization_id) return data;
        } catch (_) {}
        await delay(400);
      }
    };
    window.supabase.createClient = function (...args) {
      const client = nativeCreateClient(...args);
      if (!client?.auth || client.auth.__eduflowWrapped) return client;
      const nativeSignIn = client.auth.signInWithPassword.bind(client.auth);
      const nativeSignUp = client.auth.signUp.bind(client.auth);
      client.auth.signInWithPassword = async (...signInArgs) => {
        const result = await nativeSignIn(...signInArgs);
        if (!result?.error && result.data?.user?.id) await waitForProfile(client, result.data.user.id);
        return result;
      };
      client.auth.signUp = async (...signUpArgs) => {
        const result = await nativeSignUp(...signUpArgs);
        if (!result?.error && result.data?.user?.id && result.data?.session) await waitForProfile(client, result.data.user.id);
        return result;
      };
      Object.defineProperty(client.auth, '__eduflowWrapped', { value: true, enumerable: false });
      return client;
    };
  }
  function wirePageResilience() {
    const page=document.getElementById('page-content'); if(!page||page.__eduflowResilience)return; page.__eduflowResilience=true;
    const observer=new NativeMutationObserver(()=>{page.querySelectorAll('table').forEach(table=>{if(table.parentElement?.classList.contains('table-wrapper'))return;const wrapper=document.createElement('div');wrapper.className='table-wrapper';wrapper.style.overflowX='auto';wrapper.style.width='100%';table.parentNode.insertBefore(wrapper,table);wrapper.appendChild(table);});});
    observer.observe(page,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(wirePageResilience,0),{once:true});else setTimeout(wirePageResilience,0);
})();
