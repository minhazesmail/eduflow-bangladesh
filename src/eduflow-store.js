/**
 * EduFlow centralized state store.
 * Dependency-free PubSub with selector subscriptions and mutation events.
 * This is intentionally small: no framework, scheduler, or external state library.
 */

const initialState = Object.freeze({
  auth: { session: null, profile: null },
  organization: null,
  ui: { page: 'dashboard', loading: false, offline: typeof navigator !== 'undefined' && navigator.onLine === false },
  runtime: { routeSerial: 0, routeName: 'dashboard', routeSignal: null },
  data: { version: 0, lastChanged: null }
});

let state = cloneState(initialState);
const subscribers = new Set();
const selectorSubscribers = new Set();
const events = new Map();

function cloneState(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function shallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ak = Object.keys(a); const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every(k => Object.is(a[k], b[k]));
}

function getState() { return state; }

function emit(type, payload) {
  const list = events.get(type);
  if (!list) return;
  [...list].forEach(listener => {
    try { listener(payload, state); } catch (error) { console.error(`[EduFlowStore] ${type}`, error); }
  });
}

function notify(previous, action) {
  subscribers.forEach(listener => {
    try { listener(state, previous, action); } catch (error) { console.error('[EduFlowStore] subscriber', error); }
  });
  selectorSubscribers.forEach(entry => {
    let next;
    try { next = entry.selector(state); } catch (error) { console.error('[EduFlowStore] selector', error); return; }
    if (!entry.equal(entry.value, next)) {
      const previousValue = entry.value;
      entry.value = next;
      try { entry.listener(next, previousValue, state, action); } catch (error) { console.error('[EduFlowStore] selector listener', error); }
    }
  });
}

function setState(update, action = 'set-state') {
  const previous = state;
  const patch = typeof update === 'function' ? update(previous) : update;
  if (!patch || typeof patch !== 'object') return state;
  state = Object.freeze({
    ...previous,
    ...patch,
    auth: patch.auth ? { ...previous.auth, ...patch.auth } : previous.auth,
    ui: patch.ui ? { ...previous.ui, ...patch.ui } : previous.ui,
    runtime: patch.runtime ? { ...previous.runtime, ...patch.runtime } : previous.runtime,
    data: patch.data ? { ...previous.data, ...patch.data } : previous.data
  });
  notify(previous, action);
  emit('state:changed', { action, previous, state });
  return state;
}

function subscribe(listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

function subscribeSelector(selector, listener, equal = Object.is) {
  const entry = { selector, listener, equal, value: selector(state) };
  selectorSubscribers.add(entry);
  return () => selectorSubscribers.delete(entry);
}

function on(type, listener) {
  if (!events.has(type)) events.set(type, new Set());
  events.get(type).add(listener);
  return () => events.get(type)?.delete(listener);
}

const actions = {
  setAuth(session, profile = null) {
    return setState({ auth: { session, profile } }, 'auth:set');
  },
  setOrganization(organization) {
    return setState({ organization }, 'organization:set');
  },
  setPage(page) {
    return setState({ ui: { page } }, 'ui:page');
  },
  setLoading(loading) {
    return setState({ ui: { loading: !!loading } }, 'ui:loading');
  },
  setOffline(offline) {
    return setState({ ui: { offline: !!offline } }, 'ui:offline');
  },
  beginRoute(name, signal) {
    const routeSerial = state.runtime.routeSerial + 1;
    setState({ runtime: { routeSerial, routeName: name || 'dashboard', routeSignal: signal || null } }, 'route:start');
    emit('route:start', { name: name || 'dashboard', serial: routeSerial, signal: signal || null });
    return routeSerial;
  },
  cancelRoute(reason = 'route-cancelled') {
    const signal = state.runtime.routeSignal;
    setState({ runtime: { routeSignal: null } }, 'route:cancel');
    emit('route:cancel', { reason, signal });
  },
  recordsChanged(table, operation = 'unknown', payload = null) {
    const change = { table, operation, payload, at: Date.now() };
    setState({ data: { version: state.data.version + 1, lastChanged: change } }, 'data:changed');
    emit('records:changed', change);
  },
  reset() {
    state = cloneState(initialState);
    emit('state:reset', state);
  }
};

export const store = Object.freeze({ getState, setState, subscribe, subscribeSelector, on, actions });
export const select = Object.freeze({
  auth: s => s.auth,
  session: s => s.auth.session,
  profile: s => s.auth.profile,
  organization: s => s.organization,
  page: s => s.ui.page,
  offline: s => s.ui.offline,
  route: s => s.runtime,
  dataVersion: s => s.data.version,
  lastChanged: s => s.data.lastChanged
});
