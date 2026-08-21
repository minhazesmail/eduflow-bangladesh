/**
 * At-Risk / Attrition Score UI
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (v) => {
    const d = document.createElement('div');
    d.textContent = v == null ? '' : String(v);
    return d.innerHTML;
  };
  const money = (v) => `৳${Number(v || 0).toLocaleString('en-BD')}`;
  const toast = (m, t = 'info') => window.EduFlow?.toast?.(m, t);

  function getClient() {
    const cfg = window.eduflowConfig || {};
    if (!cfg.supabaseUrl || !window.supabase?.createClient) return null;
    return window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }

  async function orgContext(sb) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) return null;
    const { data: profile } = await sb
      .from('profiles')
      .select('id,organization_id,role,full_name')
      .eq('id', session.user.id)
      .maybeSingle();
    if (!profile?.organization_id) return null;
    return { session, profile, orgId: profile.organization_id, role: profile.role };
  }

  function riskBadge(level, score) {
    const cls = level === 'critical' || level === 'high' ? 'badge-danger' : 'badge-gray';
    const label = level === 'critical' ? 'Critical' : level === 'high' ? 'High' : 'Watch';
    return `<span class="badge ${cls}">${esc(label)} · ${Number(score || 0).toFixed(0)}</span>`;
  }

  function bar(score, max = 40, color = '#dc2626') {
    const pct = Math.min(100, Math.round((Number(score || 0) / max) * 100));
    return `<div style="height:6px;background:rgba(255,255,255,.08);border-radius:99px;overflow:hidden;min-width:64px"><div style="height:100%;width:${pct}%;background:${color};border-radius:99px"></div></div>`;
  }

  async function loadScores(sb, orgId) {
    const { data, error } = await sb.rpc('get_attrition_scores', {
      p_organization_id: orgId, p_branch_id: null, p_days: 60, p_min_score: 0,
    });
    if (error) throw error;
    return data || [];
  }

  async function loadOpenAlerts(sb, orgId) {
    const { data, error } = await sb
      .from('attrition_alerts')
      .select('id,student_id,attrition_score,risk_level,is_high_value,signals,status,created_at,students(name,guardian_phone,monthly_fee)')
      .eq('organization_id', orgId)
      .eq('status', 'open')
      .order('attrition_score', { ascending: false })
      .limit(50);
    if (error) return [];
    return data || [];
  }

  async function evaluateAlerts(sb, orgId) {
    const { data, error } = await sb.rpc('evaluate_attrition_alerts', {
      p_organization_id: orgId, p_score_threshold: 55, p_high_value_only: true,
    });
    if (error) throw error;
    return data || [];
  }

  async function acknowledgeAlert(sb, alertId, userId) {
    const { error } = await sb.from('attrition_alerts').update({
      status: 'acknowledged', acknowledged_by: userId, acknowledged_at: new Date().toISOString(),
    }).eq('id', alertId);
    if (error) throw error;
  }

  function renderPanel(scores, alerts, ctx) {
    const atRisk = scores.filter((s) => Number(s.attrition_score) >= 55);
    const critical = scores.filter((s) => s.risk_level === 'critical');
    const highValueRisk = scores.filter((s) => s.is_high_value && Number(s.attrition_score) >= 55);

    const alertHtml = alerts.length === 0
      ? '<div class="empty">No open high-value attrition alerts.</div>'
      : `<div class="table-wrap"><table><thead><tr><th>Student</th><th>Score</th><th>Value</th><th>Signals</th><th></th></tr></thead><tbody>${alerts.map((a) => {
          const sig = a.signals || {};
          return `<tr><td><strong>${esc(a.students?.name || 'Student')}</strong><div class="subtitle">${esc(a.students?.guardian_phone || '')}</div></td><td>${riskBadge(a.risk_level, a.attrition_score)}</td><td>${a.is_high_value ? '<span class="badge badge-blue">High-value</span>' : '—'}</td><td class="subtitle">Missed ${esc(sig.attendance_missed ?? '—')}/${esc(sig.attendance_total ?? '—')} · Unpaid ${money(sig.unpaid_amount)} · Δ%ile ${sig.percentile_delta != null ? esc(sig.percentile_delta) : '—'}</td><td><button type="button" class="btn btn-sm btn-secondary" data-ack-alert="${esc(a.id)}">Acknowledge</button></td></tr>`;
        }).join('')}</tbody></table></div>`;

    const tableHtml = scores.length === 0
      ? '<div class="empty">No active students to score.</div>'
      : `<div class="table-wrap"><table><thead><tr><th>Student</th><th>Attrition</th><th>Attendance (40)</th><th>Fees (35)</th><th>Academic (25)</th><th>Fee</th></tr></thead><tbody>${scores.slice(0, 40).map((s) => {
          const hv = s.is_high_value ? ' <span class="badge badge-blue">HV</span>' : '';
          return `<tr><td><strong>${esc(s.name)}</strong>${hv}<div class="subtitle">${esc(s.guardian_phone || '')}</div></td><td>${riskBadge(s.risk_level, s.attrition_score)}</td><td><div class="subtitle">${s.attendance_pct != null ? esc(s.attendance_pct) + '%' : 'n/a'} · missed ${esc(s.attendance_missed)}</div>${bar(s.attendance_score, 40, '#f97316')}</td><td><div class="subtitle">${money(s.unpaid_amount)} · ${esc(s.open_invoices)} inv</div>${bar(s.fee_score, 35, '#eab308')}</td><td><div class="subtitle">${s.recent_percentile != null ? 'Now ' + esc(Number(s.recent_percentile).toFixed(0)) : 'n/a'}${s.prior_percentile != null ? ' · was ' + esc(Number(s.prior_percentile).toFixed(0)) : ''}</div>${bar(s.academic_score, 25, '#a855f7')}</td><td>${money(s.monthly_fee)}</td></tr>`;
        }).join('')}</tbody></table></div>`;

    return `<div class="page-head"><div><h1>At-Risk Students</h1><p class="subtitle">Attrition score from missed classes, unpaid fees, and dropping exam percentiles. Intervene before high-value students leave.</p></div><div class="actions"><button type="button" class="btn btn-secondary" id="attrition-refresh">Refresh</button>${['owner', 'admin'].includes(ctx.role) ? '<button type="button" class="btn btn-primary" id="attrition-evaluate">Run owner alerts</button>' : ''}</div></div><div class="grid grid-4" style="margin-bottom:16px"><div class="card"><div class="label">Scored</div><div class="value">${scores.length}</div><div class="subtitle">Active students</div></div><div class="card"><div class="label">At risk (≥55)</div><div class="value">${atRisk.length}</div><div class="subtitle">Needs attention</div></div><div class="card"><div class="label">Critical (≥80)</div><div class="value">${critical.length}</div><div class="subtitle">Urgent</div></div><div class="card"><div class="label">High-value at risk</div><div class="value">${highValueRisk.length}</div><div class="subtitle">Owner priority</div></div></div><div class="card" style="margin-bottom:16px"><div class="section-head"><h2>Open alerts</h2><span class="subtitle">High-value students with rising dropout risk</span></div>${alertHtml}</div><div class="card"><div class="section-head"><h2>Attrition ranking</h2><span class="subtitle">Weights: attendance 40 · fees 35 · academic drop 25</span></div>${tableHtml}</div>`;
  }

  async function render() {
    const root = $('page-content');
    if (!root) return;
    root.innerHTML = '<div class="empty">Loading attrition scores…</div>';
    const sb = getClient();
    if (!sb) { root.innerHTML = '<div class="empty">Supabase client unavailable.</div>'; return; }
    try {
      const ctx = await orgContext(sb);
      if (!ctx) { root.innerHTML = '<div class="empty">Sign in required.</div>'; return; }
      const [scores, alerts] = await Promise.all([loadScores(sb, ctx.orgId), loadOpenAlerts(sb, ctx.orgId)]);
      root.innerHTML = renderPanel(scores, alerts, ctx);
      $('attrition-refresh')?.addEventListener('click', () => render());
      $('attrition-evaluate')?.addEventListener('click', async () => {
        try {
          const created = await evaluateAlerts(sb, ctx.orgId);
          const n = created.filter((x) => x.created).length;
          toast(n ? `${n} new high-value alert(s) created` : 'No new alerts (or already open within 7 days)', 'success');
          render();
        } catch (e) { toast(e.message || 'Evaluate failed', 'error'); }
      });
      root.querySelectorAll('[data-ack-alert]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await acknowledgeAlert(sb, btn.getAttribute('data-ack-alert'), ctx.profile.id);
            toast('Alert acknowledged', 'success');
            render();
          } catch (e) { toast(e.message || 'Could not acknowledge', 'error'); }
        });
      });
    } catch (e) {
      root.innerHTML = `<div class="card"><h2>Could not load attrition scores</h2><p class="subtitle">${esc(e.message || 'Run migration 20260821190000_attrition_score.sql first.')}</p></div>`;
    }
  }

  function injectNav() {
    const nav = document.querySelector('.nav');
    if (!nav || nav.querySelector('[data-page="at-risk"]')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.page = 'at-risk';
    btn.innerHTML = '<span class="ico">⚠</span><span>At-Risk</span>';
    btn.addEventListener('click', (e) => { e.preventDefault(); location.hash = 'at-risk'; render(); });
    const att = nav.querySelector('[data-page="attendance"]');
    if (att?.nextSibling) att.parentNode.insertBefore(btn, att.nextSibling);
    else nav.appendChild(btn);
  }

  function route() {
    if (location.hash.slice(1) === 'at-risk') { injectNav(); render(); return true; }
    return false;
  }

  function enhanceAttentionCenter() {
    const page = location.hash.slice(1);
    if (page !== 'attention') return;
    const content = $('page-content');
    if (!content || content.dataset.attritionEnhanced) return;
    const head = content.querySelector('.page-head .actions');
    if (!head) return;
    content.dataset.attritionEnhanced = '1';
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'btn btn-primary';
    link.textContent = 'At-Risk scores';
    link.onclick = () => { location.hash = 'at-risk'; render(); };
    head.appendChild(link);
  }

  const obs = new MutationObserver(() => {
    injectNav();
    enhanceAttentionCenter();
    if (location.hash.slice(1) === 'at-risk' && $('page-content') && !$('attrition-refresh')) render();
  });

  function start() {
    injectNav();
    obs.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', () => route());
    route();
  }

  window.EduFlowAttrition = { render, loadScores, evaluateAlerts };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
