/* EduFlow AI removal guard. Keeps the production app free of AI UI/runtime calls. */
(function () {
  'use strict';

  function stripAiUi() {
    document.querySelectorAll('[data-growth-page="assistant"],[data-growth-action="open-assistant"],a[href="#assistant"]').forEach((el) => el.remove());
    document.querySelectorAll('#page-content h1,#page-content h2,#page-content h3').forEach((heading) => {
      if (/EduFlow AI|AI Assistant/i.test(heading.textContent || '')) {
        const card = heading.closest('.card');
        if (card) card.remove();
      }
    });
  }

  function redirectAiHash() {
    if (location.hash.replace(/^#/, '') === 'assistant') location.hash = '#attention';
  }

  document.addEventListener('click', (event) => {
    const el = event.target instanceof Element ? event.target.closest('[data-growth-action="open-assistant"],[data-growth-page="assistant"]') : null;
    if (!el) return;
    event.preventDefault();
    location.hash = '#attention';
    stripAiUi();
  }, true);

  window.addEventListener('hashchange', redirectAiHash);

  const page = document.getElementById('page-content');
  if (page && window.MutationObserver) {
    const observer = new MutationObserver(stripAiUi);
    observer.observe(page, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { stripAiUi(); redirectAiHash(); }, { once: true });
  } else {
    stripAiUi();
    redirectAiHash();
  }
})();
