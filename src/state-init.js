import { store } from './eduflow-store.js';

// Keep browser configuration out of application state consumers.
// The existing config.js remains the compatibility source while modules migrate to selectors/actions.
if (typeof window !== 'undefined') {
  store.setState({
    ui: { offline: typeof navigator !== 'undefined' && navigator.onLine === false }
  }, 'state:init');
}

export { store };
