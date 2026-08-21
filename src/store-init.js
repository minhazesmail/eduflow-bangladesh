import { store } from './eduflow-store.js';

const initialOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
store.setState({ ui: { offline: initialOffline } }, 'state:init');
export { store };
