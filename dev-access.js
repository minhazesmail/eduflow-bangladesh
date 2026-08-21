/* EduFlow development access: opt-in only, read-only sample workspace, no real auth/session. */
(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const enabled = params.get('dev') === 'true' || params.get('dev') === '1';
  if (!enabled) return;

  window.__eduflowDevMode = true;
  if (window.eduflowConfig) {
    window.eduflowConfig = Object.freeze({ ...window.eduflowConfig, isDev: true, isDemo: true });
  }

  const banner = document.createElement('div');
  banner.textContent = 'Development Mode — sample data only • Authentication bypassed';
  Object.assign(banner.style, {
    position: 'fixed', top: '0', left: '0', right: '0', zIndex: '100000',
    padding: '7px 12px', background: '#7c2d12', color: '#fff',
    font: '700 12px/1.3 system-ui,sans-serif', textAlign: 'center'
  });
  document.addEventListener('DOMContentLoaded', () => document.body.prepend(banner), { once: true });
})();
