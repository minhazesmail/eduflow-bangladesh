/*
 * Growth & Operations compatibility layer.
 * Loads the existing feature renderer without its legacy DOM-wide router observer,
 * then provides deterministic navigation for Demo and production modes.
 */
(async function () {
  'use strict';

  const NativeMutationObserver = window.MutationObserver;

  // The legacy growth renderer creates a body-wide observer whose callback
  // calls route(), which can recursively render the DOM. Make that observer
  // inert while retaining MutationObserver for every other module.
  window.MutationObserver = class SafeGrowthObserver {
    constructor() {}
    observe() {}
    disconnect() {}
    takeRecords() { return []; }
  };

  try {
    await import('../growth-features.js');
  } finally {
    window.MutationObserver = NativeMutationObserver;
  }

  const featurePages = new Set([
    'attention', 'guardians', 'admissions', 'branches', 'routine',
    'expenses', 'documents', 'integrations', 'notifications'
  ]);

  function go(page) {
    if (!featurePages.has(page)) return false;
    if (location.hash.slice(1) !== page) {
      location.hash = page;
      return true;
    }
    window.EduFlowGrowth?.route?.();
    return true;
  }

  function injectNav() {
    const nav = document.querySelector('.nav');
    if (!nav || nav.querySelector('[data-growth-nav="true"]')) return;

    const section = document.createElement('div');
    section.className = 'nav-section';
    section.dataset.growthNav = 'true';
    section.textContent = 'Growth & Operations';
    nav.appendChild(section);

    const labels = {
      attention: 'Attention',
      guardians: 'Guardians',
      admissions: 'Admissions CRM',
      branches: 'Branches',
      routine: 'Routine',
      expenses: 'Expenses & Profit',
      documents: 'Documents',
      integrations: 'Integrations',
      notifications: 'Notifications'
    };

    for (const [page, label] of Object.entries(labels)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.growthNav = 'true';
      button.dataset.growthPage = page;
      button.textContent = label;
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        go(page);
      });
      nav.appendChild(button);
    }
  }

  function wireGrowthNavigation() {
    injectNav();
    document.addEventListener('click', event => {
      const target = event.target instanceof Element
        ? event.target.closest('[data-growth-page]')
        : null;
      if (!target) return;
      const page = target.dataset.growthPage;
      if (!featurePages.has(page)) return;
      event.preventDefault();
      event.stopPropagation();
      go(page);
    }, true);

    window.addEventListener('hashchange', () => {
      const page = location.hash.slice(1);
      if (featurePages.has(page)) {
        window.EduFlowGrowth?.route?.();
      }
    });

    const retry = () => injectNav();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', retry, { once: true });
    }
  }

  wireGrowthNavigation();
  const page = location.hash.slice(1);
  if (featurePages.has(page)) {
    window.EduFlowGrowth?.route?.();
  }
})();
