/* Route lifecycle bridge: cancels Supabase requests whenever navigation changes. */
(function(){'use strict';
  const start=(name)=>window.EduFlowRuntime?.beginRoute?.(name||location.hash.slice(1)||'dashboard');
  document.addEventListener('click',e=>{const el=e.target instanceof Element?e.target.closest('[data-page],#refresh-btn'):null;if(el)start(el.dataset.page||'refresh');},true);
  window.addEventListener('hashchange',()=>start(location.hash.replace(/^#\/?/,'')||'dashboard'),true);
  window.addEventListener('beforeunload',()=>window.EduFlowRuntime?.cancelRoute?.('page-unload'));
})();
