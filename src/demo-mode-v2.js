/**
 * Demo Mode v2.
 * Read-only data adapter that does not block Growth-page modal opening.
 * Mutations are rejected by the in-memory client and real form submission is
 * intercepted separately, so prospective users can preview every form UI.
 */
(function () {
  'use strict';

  const config = window.eduflowConfig;
  if (!config?.isDemo) return;

  const MOCK = window.EduFlowMockData;
  if (!MOCK) {
    console.error('EduFlow demo dataset is missing.');
    return;
  }

  const WRITE_ACTION = /(^|[-_:])(new|create|update|edit|delete|remove|save|submit|record|mark)([-_:]|$)/i;
  const READ_ONLY_ACTIONS = new Set(['refresh', 'close', 'cancel', 'dismiss']);

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const getRows = table => Array.isArray(MOCK.data[table]) ? clone(MOCK.data[table]) : [];

  function matches(row, filter) {
    const value = row?.[filter.column];
    switch (filter.operator) {
      case 'eq': return String(value) === String(filter.value);
      case 'neq': return String(value) !== String(filter.value);
      case 'in': return Array.isArray(filter.value) && filter.value.map(String).includes(String(value));
      case 'ilike': return String(value ?? '').toLowerCase().includes(String(filter.value).replaceAll('%', '').toLowerCase());
      case 'gte': return value >= filter.value;
      case 'lte': return value <= filter.value;
      case 'gt': return value > filter.value;
      case 'lt': return value < filter.value;
      case 'is': return (value == null) === (filter.value == null);
      default: return true;
    }
  }

  class DemoQuery {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.ordering = [];
      this.limitValue = null;
      this.rangeValue = null;
      this.selectOptions = {};
      this.mode = null;
      this.mutation = null;
    }
    select(_columns = '*', options = {}) { this.selectOptions = options || {}; return this; }
    eq(column, value) { this.filters.push({ operator: 'eq', column, value }); return this; }
    neq(column, value) { this.filters.push({ operator: 'neq', column, value }); return this; }
    in(column, value) { this.filters.push({ operator: 'in', column, value }); return this; }
    ilike(column, value) { this.filters.push({ operator: 'ilike', column, value }); return this; }
    gte(column, value) { this.filters.push({ operator: 'gte', column, value }); return this; }
    lte(column, value) { this.filters.push({ operator: 'lte', column, value }); return this; }
    gt(column, value) { this.filters.push({ operator: 'gt', column, value }); return this; }
    lt(column, value) { this.filters.push({ operator: 'lt', column, value }); return this; }
    is(column, value) { this.filters.push({ operator: 'is', column, value }); return this; }
    order(column, options = {}) { this.ordering.push({ column, ascending: options.ascending !== false }); return this; }
    limit(value) { this.limitValue = Number(value); return this; }
    range(from, to) { this.rangeValue = [Number(from), Number(to)]; return this; }
    single() { this.mode = 'single'; return this; }
    maybeSingle() { this.mode = 'maybeSingle'; return this; }
    insert() { this.mutation = 'insert'; return this; }
    update() { this.mutation = 'update'; return this; }
    delete() { this.mutation = 'delete'; return this; }
    async execute() {
      if (this.mutation) return { data: null, error: new Error('Demo Mode is read-only. Changes are disabled.') };
      let rows = getRows(this.table).filter(row => this.filters.every(filter => matches(row, filter)));
      for (const rule of this.ordering) {
        rows.sort((a, b) => {
          const left = a?.[rule.column], right = b?.[rule.column];
          if (left === right) return 0;
          const result = left == null ? -1 : right == null ? 1 : left < right ? -1 : 1;
          return rule.ascending ? result : -result;
        });
      }
      const count = rows.length;
      if (this.rangeValue) rows = rows.slice(this.rangeValue[0], this.rangeValue[1] + 1);
      if (this.limitValue != null) rows = rows.slice(0, this.limitValue);
      if (this.selectOptions.head) return { data: null, error: null, count };
      if (this.mode === 'single') return { data: rows.length ? rows[0] : null, error: rows.length === 1 ? null : new Error('Expected exactly one demo row.') };
      if (this.mode === 'maybeSingle') return { data: rows[0] || null, error: null };
      return { data: rows, error: null, count };
    }
    then(resolve, reject) { return this.execute().then(resolve, reject); }
    catch(reject) { return this.execute().catch(reject); }
    finally(callback) { return this.execute().finally(callback); }
  }

  function toast(message) {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function createDemoClient() {
    return {
      from(table) { return new DemoQuery(table); },
      rpc() { return Promise.resolve({ data: null, error: new Error('This operation is unavailable in Demo Mode.') }); },
      auth: {
        async getSession() { return { data: { session: clone(MOCK.session) }, error: null }; },
        onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
        async signOut() { return { error: null }; }
      }
    };
  }

  window.supabase = { createClient: createDemoClient };
  window.EduFlowDemo = Object.freeze({
    isDemo: true,
    organizationId: MOCK.organizationId,
    userId: MOCK.userId,
    toast
  });

  function addBanner() {
    if (document.getElementById('demo-mode-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'demo-mode-banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML = '<strong>Demo Mode</strong><span>You are viewing sample data. Changes are disabled and nothing is saved.</span><a href="/index.html">Exit demo</a>';
    Object.assign(banner.style, {
      position: 'fixed', inset: '0 0 auto 0', zIndex: '99999', minHeight: '42px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
      padding: '10px 16px', background: '#0f172a', color: '#f8fafc',
      borderBottom: '1px solid rgba(255,255,255,.16)', boxShadow: '0 2px 12px rgba(2,6,23,.22)',
      font: '600 13px/1.4 system-ui,sans-serif'
    });
    Object.assign(banner.querySelector('a').style, { color: '#93c5fd', textDecoration: 'underline', marginLeft: '4px' });
    document.body.appendChild(banner);
    document.body.style.paddingTop = '42px';
  }

  function lockMutationControls() {
    document.querySelectorAll('[data-action]').forEach(button => {
      if (!(button instanceof HTMLElement)) return;
      const action = button.dataset.action || '';
      if (!WRITE_ACTION.test(action) || READ_ONLY_ACTIONS.has(action.toLowerCase())) return;
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.title = 'Disabled in Demo Mode';
    });

    document.querySelectorAll('#modal-root input, #modal-root select, #modal-root textarea').forEach(el => {
      el.disabled = true;
      el.setAttribute('aria-disabled', 'true');
    });
    document.querySelectorAll('#modal-root button').forEach(button => {
      const text = (button.textContent || '').trim().toLowerCase();
      const safe = text === 'cancel' || text === 'close' || button.getAttribute('aria-label')?.toLowerCase().includes('close');
      if (!safe) {
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
        button.title = 'Disabled in Demo Mode';
      }
    });
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('[data-action]') : null;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action || '';
    if (WRITE_ACTION.test(action) && !READ_ONLY_ACTIONS.has(action.toLowerCase())) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toast('Demo Mode is read-only. This action is disabled.');
    }
  }, true);

  document.addEventListener('submit', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    toast('Demo Mode is read-only. This form is disabled.');
  }, true);

  const observer = new MutationObserver(lockMutationControls);
  const start = () => { addBanner(); lockMutationControls(); observer.observe(document.body, { childList: true, subtree: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
