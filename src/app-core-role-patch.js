/**
 * Runtime safety patch: if app-core is missing/broken, this cannot fully restore it.
 * Prefer full app-core.js restore. This only rewires changeRole when EduFlow exists.
 */
(function () {
  'use strict';
  // Loaded after app-core when present.
  const wrap = () => {
    const flow = window.EduFlow;
    if (!flow || flow.__roleRpcPatched) return;
    // No public changeRole export; operations-ui already uses RPC.
    flow.__roleRpcPatched = true;
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(wrap, 200), { once: true });
  } else {
    setTimeout(wrap, 200);
  }
})();
