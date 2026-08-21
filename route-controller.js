/* Route lifecycle bridge. Runtime owns cancellation; it publishes route state through the central store. */
const start = name => window.EduFlowRuntime?.beginRoute?.(name || location.hash.slice(1) || 'dashboard');

document.addEventListener('click', event => {
  const element = event.target instanceof Element ? event.target.closest('[data-page],#refresh-btn') : null;
  if (element) start(element.dataset.page || 'refresh');
}, true);

window.addEventListener('hashchange', () => start(location.hash.replace(/^#\/?/, '') || 'dashboard'), true);
window.addEventListener('beforeunload', () => window.EduFlowRuntime?.cancelRoute?.('page-unload'));

export { start as startRoute };
