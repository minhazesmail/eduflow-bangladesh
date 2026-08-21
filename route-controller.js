/* Route lifecycle bridge backed by the centralized store. */
import { store } from './src/eduflow-store.js';

const start = name => {
  const routeName = name || location.hash.slice(1) || 'dashboard';
  store.actions.beginRoute(routeName, store.getState().runtime.routeSignal);
  window.EduFlowRuntime?.beginRoute?.(routeName);
};

document.addEventListener('click', event => {
  const element = event.target instanceof Element ? event.target.closest('[data-page],#refresh-btn') : null;
  if (element) start(element.dataset.page || 'refresh');
}, true);

window.addEventListener('hashchange', () => start(location.hash.replace(/^#\/?/, '') || 'dashboard'), true);
window.addEventListener('beforeunload', () => {
  store.actions.cancelRoute('page-unload');
  window.EduFlowRuntime?.cancelRoute?.('page-unload');
});

export { start as startRoute };
