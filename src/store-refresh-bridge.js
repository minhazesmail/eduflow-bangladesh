import { store } from './eduflow-store.js';

let refreshTimer = null;
let pending = new Set();

function scheduleRefresh(change) {
  pending.add(change.table);
  if (refreshTimer) return;
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    const tables = [...pending];
    pending.clear();
    // The existing app-core renderer already knows the active route.
    // Trigger its normal refresh path instead of teaching each widget how to talk to every other widget.
    const refresh = document.getElementById('refresh-btn');
    if (refresh && document.visibilityState !== 'hidden') refresh.click();
    window.dispatchEvent(new CustomEvent('eduflow:records-changed', { detail: { tables } }));
  }, 80);
}

store.on('records:changed', scheduleRefresh);

window.addEventListener('online', () => store.actions.setOffline(false));
window.addEventListener('offline', () => store.actions.setOffline(true));

export { scheduleRefresh };
