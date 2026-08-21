/* EduFlow runtime stability guards. Loaded before growth-features.js. */
(function () {
  'use strict';

  // Prevent a body-level MutationObserver from reacting to page-content renders.
  // This preserves navigation-menu observation without allowing route() → DOM → observer → route() loops.
  const NativeMutationObserver = window.MutationObserver;
  if (NativeMutationObserver && !window.__eduflowMutationObserverPatched) {
    window.__eduflowMutationObserverPatched = true;
    window.MutationObserver = class EduFlowMutationObserver extends NativeMutationObserver {
      constructor(callback) {
        const guarded = (mutations, observer) => {
          const pageContentOnly = mutations.length > 0 && mutations.every((mutation) => {
            const target = mutation.target;
            return target && typeof target.closest === 'function' && target.closest('#page-content');
          });
          if (pageContentOnly) return;
          callback(mutations, observer);
        };
        super(guarded);
      }
    };
  }

  // Notification delivery is handled by the durable Supabase/Vercel queue worker.
  // Suppress the old one-minute browser polling loop without disabling other intervals.
  const nativeSetInterval = window.setInterval.bind(window);
  window.setInterval = function (handler, timeout, ...args) {
    try {
      if (typeof handler === 'function' && /dispatchQueued/.test(Function.prototype.toString.call(handler))) {
        return 0;
      }
    } catch (_) {}
    return nativeSetInterval(handler, timeout, ...args);
  };

  // Guaranteed fallback toast for startup/error races.
  window.eduflowSafeToast = function (message, type) {
    try {
      const existing = window.EduFlow?.toast?.(message, type);
      if (existing !== undefined) return existing;
    } catch (_) {}
    try {
      const root = document.getElementById('toast-root') || document.body;
      const node = document.createElement('div');
      node.className = 'eduflow-runtime-toast eduflow-runtime-toast-' + (type || 'info');
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
  };

  // Generic loading state + table responsiveness for dynamically rendered feature pages.
  function wirePageResilience() {
    const page = document.getElementById('page-content');
    if (!page || page.__eduflowResilience) return;
    page.__eduflowResilience = true;

    const observer = new NativeMutationObserver(() => {
      page.querySelectorAll('table').forEach((table) => {
        if (table.parentElement?.classList.contains('table-wrapper')) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper';
        wrapper.style.overflowX = 'auto';
        wrapper.style.width = '100%';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      });
    });
    observer.observe(page, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(wirePageResilience, 0), { once: true });
  } else {
    setTimeout(wirePageResilience, 0);
  }
})();
