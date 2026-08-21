/**
 * Emergency fix: prevent infinite MutationObserver loop on #auth-screen.
 * applyAuth() was rewriting text nodes under a subtree observer → tab freeze.
 * Loaded after i18n.js; replaces applyAuth + observer wiring.
 */
(function () {
  'use strict';
  const i18n = window.EduFlowI18n;
  if (!i18n) return;

  let applying = false;
  let observer = null;

  function t(key) {
    return i18n.t(key);
  }

  function applyAuthSafe() {
    if (applying) return;
    const root = document.getElementById('auth-screen');
    if (!root || root.classList.contains('hidden')) return;
    applying = true;
    try {
      if (observer) observer.disconnect();

      if (!root.querySelector('.eduflow-lang-btn')) {
        const card = root.querySelector('.auth-card') || root;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-ghost eduflow-lang-btn language-toggle';
        b.addEventListener('click', () => i18n.toggleLang());
        card.prepend(b);
      }

      const signup = !!root.querySelector('#auth-fullname');
      const set = (sel, key) => {
        const el = root.querySelector(sel) || document.querySelector(sel);
        if (el) el.textContent = t(key);
      };
      set('h1', signup ? 'auth.register' : 'auth.welcome');
      set('.sub', signup ? 'auth.sub.signup' : 'auth.sub.signin');

      const ids = {
        'auth-fullname': 'auth.name',
        'auth-orgname': 'auth.org',
        'auth-email': 'auth.email',
        'auth-password': 'auth.password'
      };
      root.querySelectorAll('label').forEach((el) => {
        const key = ids[el.htmlFor];
        if (key) el.textContent = t(key);
      });

      const btn = root.querySelector('#auth-btn');
      if (btn) btn.textContent = t(signup ? 'auth.create' : 'auth.signin');
      const toggle = root.querySelector('#auth-toggle');
      if (toggle) toggle.textContent = t(signup ? 'auth.toggle.signin' : 'auth.toggle.signup');
      const hint = root.querySelector('.subtitle:last-child');
      if (hint) hint.textContent = t(signup ? 'auth.hint.signup' : 'auth.hint.signin');
      const langBtn = root.querySelector('.eduflow-lang-btn');
      if (langBtn) langBtn.textContent = i18n.getLang() === 'bn' ? 'English' : 'বাংলা';
    } finally {
      applying = false;
      if (observer && root.isConnected) {
        observer.observe(root, { childList: true, subtree: false });
      }
    }
  }

  // Replace the public method so app-core / lang toggle use the safe version.
  i18n.applyAuth = applyAuthSafe;
  const originalApplyAll = i18n.applyAll?.bind(i18n);
  i18n.applyAll = function () {
    i18n.applyStatic?.();
    i18n.applyLanding?.();
    applyAuthSafe();
    document.documentElement.lang = i18n.getLang() === 'bn' ? 'bn' : 'en';
  };

  // Kill any existing observers by cloning the node (drops listeners/observers).
  const root = document.getElementById('auth-screen');
  if (root && root.parentNode) {
    const clone = root.cloneNode(true);
    root.parentNode.replaceChild(clone, root);
    observer = new MutationObserver(() => {
      if (applying) return;
      requestAnimationFrame(applyAuthSafe);
    });
    observer.observe(clone, { childList: true, subtree: false });
  }

  window.addEventListener('eduflow:langchange', () => {
    requestAnimationFrame(applyAuthSafe);
  });
})();
