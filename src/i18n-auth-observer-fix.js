/**
 * Safety shim: i18n.js no longer uses a MutationObserver on #auth-screen.
 * Kept as a no-op import so older deploys that still reference this file stay safe.
 */
(function () {
  'use strict';
  // Intentionally empty — root fix lives in src/i18n.js.
})();
