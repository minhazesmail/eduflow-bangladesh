(() => {
  function syncActive(page) {
    document.querySelectorAll('.nav button, .mobile-nav button').forEach(button => {
      const match = (button.getAttribute('onclick') || '').match(/go\(['\"]([^'\"]+)['\"]\)/);
      button.classList.toggle('active', !!match && match[1] === page);
    });
  }

  const originalGo = window.go;
  if (typeof originalGo === 'function') {
    window.go = function (page) {
      syncActive(page);
      const result = originalGo.apply(this, arguments);
      requestAnimationFrame(() => syncActive(page));
      return result;
    };
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('.nav button, .mobile-nav button');
    if (!button) return;
    const match = (button.getAttribute('onclick') || '').match(/go\(['\"]([^'\"]+)['\"]\)/);
    if (match) syncActive(match[1]);
  }, true);
})();
