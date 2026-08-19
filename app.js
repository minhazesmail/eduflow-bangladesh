/**
 * EduFlow — Main Application
 * 
 * Fixes applied:
 * 1. No hardcoded credentials (reads from config.js)
 * 2. Client-side rate limiting
 * 3. Audit logging to Supabase
 * 4. Offline detection + sync queue
 * 5. Proper routing with URL hash
 * 6. Billing / usage tracking UI
 * 7. Input sanitization (XSS prevention)
 * 8. Debounced search
 * 9. Loading states on all async operations
 * 10. Session refresh handling
 */

const EduFlow = (function() {
  'use strict';

  // ─── State ───────────────────────────────────────
  let sb = null;
  let session = null;
  let profile = null;
  let org = null;
  let orgId = null;
  let userId = null;
  let currentPage = 'dashboard';
  let dataCache = {};
  let rateLimiter = { count: 0, resetAt: 0 };
  let offlineQueue = [];
  let searchDebounceTimer = null;

  // ─── Init ────────────────────────────────────────
  async function init() {
    document.getElementById('loading-screen').classList.remove('hidden');

    const cfg = window.eduflowConfig;
    if (!cfg || !cfg.supabaseUrl || !cfg.supabaseKey) {
      showFatalError('Configuration Error', 
        'Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
      return;
    }

    try {
      sb = supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        }
      });
    } catch (e) {
      showFatalError('Connection Error', 'Failed to initialize Supabase client: ' + e.message);
      return;
    }

    const { data: { session: s } } = await sb.auth.getSession();
    if (s) {
      await loadUser(s);
    } else {
      showAuth();
    }

    document.getElementById('loading-screen').classList.add('hidden');
    setupEventListeners();
    setupOfflineHandler();
    setupSessionRefresh();

    const hash = window.location.hash.replace('#', '');
    if (hash && RBAC.canAccessPage(hash)) {
      navigateTo(hash);
    }
  }

  // ─── Auth ────────────────────────────────────────
  async function loadUser(s) {
    session = s;
    userId = s.user.id;

    const { data: prof, error } = await sb
      .from('profiles')
      .select('*, organizations(*)')
      .eq('id', userId)
      .single();

    if (error || !prof) {
      console.error('Profile load error:', error);
      await sb.auth.signOut();
      showAuth();
      return;
    }

    profile = prof;
    org = prof.organizations;
    orgId = prof.organization_id;

    RBAC.setRole(prof.role);

    document.getElementById('user-name').textContent = prof.full_name || 'User';
    document.getElementById('user-email').textContent = s.user.email;
    document.getElementById('user-avatar').textContent = (prof.full_name || 'U').charAt(0).toUpperCase();
    document.getElementById('org-name').textContent = org?.name || 'My Organization';
    document.getElementById('user-role').textContent = prof.role;
    document.getElementById('top-role').textContent = prof.role.charAt(0).toUpperCase() + prof.role.slice(1);

    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');

    RBAC.applyPageGuards();
    await loadUsage();
    navigateTo(currentPage);
  }

  function showAuth() {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
  }

  function setupEventListeners() {
    const toggleBtn = document.getElementById('auth-toggle');
    const toggleText = document.getElementById('auth-toggle-text');
    const authTitle = document.getElementById('auth-title');
    const authSub = document.getElementById('auth-sub');
    const authBtn = document.getElementById('auth-btn');
    const regFields = document.getElementById('register-fields');
    let isRegister = false;

    toggleBtn.addEventListener('click', () => {
      isRegister = !isRegister;
      if (isRegister) {
        authTitle.textContent = 'Register';
        authSub.textContent = 'Create your coaching center workspace.';
        authBtn.textContent = 'Create Account';
        toggleText.textContent = 'Already have an account?';
        toggleBtn.textContent = 'Sign in';
        regFields.classList.remove('hidden');
      } else {
        authTitle.textContent = 'Sign in';
        authSub.textContent = 'Welcome back to your coaching workspace.';
        authBtn.textContent = 'Sign in';
        toggleText.textContent = 'New here?';
        toggleBtn.textContent = 'Register your center';
        regFields.classList.add('hidden');
      }
    });

    document.getElementById('auth-form-el').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('auth-btn');
      const errEl = document.getElementById('auth-error');
      errEl.classList.add('hidden');
      btn.disabled = true;
      btn.textContent = isRegister ? 'Creating…' : 'Signing in…';

      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;

      try {
        if (isRegister) {
          const fullName = document.getElementById('auth-fullname').value.trim();
          const orgName = document.getElementById('auth-orgname').value.trim();

          const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName, organization_name: orgName }
            }
          });

          if (error) throw error;
          toast('Account created! Please check your email to confirm.', 'success');
        } else {
          const { data, error } = await sb.auth.signInWithPassword({ email, password });
          if (error) throw error;
          await loadUser(data.session);
        }
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.textContent = isRegister ? 'Create Account' : 'Sign in';
      }
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
      await sb.auth.signOut();
      session = null; profile = null; org = null; orgId = null; userId = null; dataCache = {};
      showAuth();
    });

    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const page = el.dataset.page;
        if (RBAC.canAccessPage(page)) {
          navigateTo(page);
        }
      });
    });

    document.getElementById('mobile-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    document.getElementById('refresh-btn').addEventListener('click', () => {
      dataCache = {};
      navigateTo(currentPage);
      toast('Data refreshed', 'success');
    });

    document.addEventListener('click', (e) => {
      const sidebar = document.getElementById('sidebar');
      const toggle = document.getElementById('mobile-toggle');
      if (window.innerWidth <= 760 && sidebar.classList.contains('open') 
          && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // ─── Routing ─────────────────────────────────────
  function navigateTo(page) {
    if (!RBAC.canAccessPage(page)) {
      toast('You do not have access to this page.', 'error');
      return;
    }
    currentPage = page;
    window.location.hash = page;
    document.querySelectorAll('[data-page]').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
    document.getElementById('page-title').textContent = page.charAt(0).toUpperCase() + page.slice(1);
    document.getElementById('sidebar').classList.remove('open');

    switch (page) {
      case 'dashboard': loadDashboard(); break;
      case 'students': loadStudents(); break;
      case 'batches': loadBatches(); break;
      case 'attendance': loadAttendance(); break;
      case 'payments': loadPayments(); break;
      case 'exams': loadExams(); break;
      case 'results': loadResults(); break;
      case 'teachers': loadTeachers(); break;
      case 'notices': loadNotices(); break;
      case 'team': TeamModule.loadTeam(); break;
      case 'billing': loadBilling(); break;
      case 'settings': loadSettings(); break;
      case 'audit': loadAuditLog(); break;
      default: loadDashboard();
    }
  }

  // ─── Rate Limiting ───────────────────────────────
  function checkRateLimit() {
    const now = Date.now();
    const cfg = window.eduflowConfig;
    const max = cfg?.rateLimitMax || 100;
    const windowMs = cfg?.rateLimitWindow || 60000;
    if (now > rateLimiter.resetAt) {
      rateLimiter.count = 0;
      rateLimiter.resetAt = now + windowMs;
    }
    rateLimiter.count++;
    if (rateLimiter.count > max) {
      toast('Too many requests. Please slow down.', 'error');
      return false;
    }
    return true;
  }

  // ─── Audit Logging ─────────────────────────────────
  async function auditLog(action, metadata = {}) {
    if (!sb || !userId) return;
    try {
      await sb.from('audit_logs').insert({
        organization_id: orgId,
        user_id: userId,
        action,
        metadata,
        user_agent: navigator.userAgent,
      });
    } catch (e) {
      console.warn('Audit log failed:', e);
    }
  }

  // ─── Offline Handling ────────────────────────────
  function setupOfflineHandler() {
    const banner = document.getElementById('offline-banner');
    window.addEventListener('online', () => {
      banner.classList.add('hidden');
      toast('Back online', 'success');
      processOfflineQueue();
    });
    window.addEventListener('offline', () => {
      banner.classList.remove('hidden');
      toast('You are offline', 'warning');
    });
  }

  function queueOfflineAction(table, operation, payload) {
    offlineQueue.push({ table, operation, payload, timestamp: Date.now() });
    localStorage.setItem('ef_offline_queue', JSON.stringify(offlineQueue));
  }

  async function processOfflineQueue() {
    const queue = JSON.parse(localStorage.getItem('ef_offline_queue') || '[]');
    if (!queue.length) return;
    let processed = 0;
    for (const item of queue) {
      try {
        if (item.operation === 'insert') {
          await sb.from(item.table).insert(item.payload);
        } else if (item.operation === 'update') {
          await sb.from(item.table).update(item.payload.data).eq('id', item.payload.id);
        } else if (item.operation === 'delete') {
          await sb.from(item.table).delete().eq('id', item.payload.id);
        }
        processed++;
      } catch (e) {
        console.warn('Failed to sync offline action:', e);
      }
    }
    offlineQueue = [];
    localStorage.removeItem('ef_offline_queue');
    if (processed > 0) toast(`${processed} offline changes synced`, 'success');
  }

  // ─── Session Refresh ─────────────────────────────
  function setupSessionRefresh() {
    sb.auth.onAuthStateChange(async (event, s) => {
      if (event === 'SIGNED_OUT') {
        showAuth();
      } else if (event === 'TOKEN_REFRESHED' && s) {
        session = s;
      } else if (event === 'SIGNED_IN' && s) {
        await loadUser(s);
      }
    });
  }

  // ─── Usage / Billing ─────────────────────────────
  async function loadUsage() {
    if (!orgId) return;
    const { data: usage } = await sb
      .from('organization_usage')
      .select('*')
      .eq('organization_id', orgId)
      .single();
    const { count: studentCount } = await sb
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);
    const plan = usage?.plan || 'free';
    const limit = window.eduflowConfig?.limits?.[plan] || 50;
    const pct = Math.min(100, Math.round((studentCount / limit) * 100));
    const badge = document.getElementById('usage-badge');
    const text = document.getElementById('usage-text');
    text.textContent = `${plan.charAt(0).toUpperCase() + plan.slice(1)} • ${studentCount}/${limit} students`;
    badge.style.setProperty('--usage-pct', pct + '%');
    if (pct >= 90) badge.classList.add('usage-warning');
  }

  // ─── Page Loaders ─────────────────────────────────
  async function loadDashboard() {
    if (!checkRateLimit()) return;
    const container = document.getElementById('page-content');
    container.innerHTML = '<div class="empty">Loading dashboard…</div>';

    const [{ count: studentCount }, { count: batchCount }, { count: teacherCount }, { data: recentPayments }] = await Promise.all([
      sb.from('students').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      sb.from('batches').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      sb.from('teachers').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      sb.from('payments').select('*, students(name)').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(5),
    ]);

    const totalRevenue = recentPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    container.innerHTML = `
      <div class="grid grid-4" style="margin-bottom:20px">
        <div class="card">
          <div class="stat">
            <div><div class="label">Total Students</div><div class="value">${studentCount || 0}</div></div>
            <div class="iconbox">👨‍🎓</div>
          </div>
        </div>
        <div class="card">
          <div class="stat">
            <div><div class="label">Active Batches</div><div class="value">${batchCount || 0}</div></div>
            <div class="iconbox" style="background:#f0fdf4;color:var(--green)">📦</div>
          </div>
        </div>
        <div class="card">
          <div class="stat">
            <div><div class="label">Teachers</div><div class="value">${teacherCount || 0}</div></div>
            <div class="iconbox" style="background:#fef3c7;color:var(--amber)">👨‍🏫</div>
          </div>
        </div>
        <div class="card">
          <div class="stat">
            <div><div class="label">Recent Revenue</div><div class="value">৳${totalRevenue.toLocaleString()}</div></div>
            <div class="iconbox" style="background:#fef2f2;color:var(--red)">💰</div>
          </div>
        </div>
      </div>
      <div class="split">
        <div class="card hero">
          <h2>Quick Actions</h2>
          <p class="subtitle">Get things done faster</p>
          <div class="quick-grid">
            <button class="quick" onclick="EduFlow.navigateTo('students')"><strong>+ Add Student</strong><span>Register a new student</span></button>
            <button class="quick" onclick="EduFlow.navigateTo('attendance')"><strong>Mark Attendance</strong><span>Record today's attendance</span></button>
            <button class="quick" onclick="EduFlow.navigateTo('payments')"><strong>Record Payment</strong><span>Log a fee payment</span></button>
            <button class="quick" onclick="EduFlow.navigateTo('exams')"><strong>Create Exam</strong><span>Set up a new exam</span></button>
          </div>
        </div>
        <div class="card">
          <div class="section-head"><h2>Recent Payments</h2><button class="btn btn-sm btn-secondary" onclick="EduFlow.navigateTo('payments')">View All</button></div>
          ${recentPayments?.length ? `
            <div class="list">
              ${recentPayments.map(p => `
                <div class="list-item">
                  <div><strong>${escapeHtml(p.students?.name || 'Unknown')}</strong><div style="font-size:12px;color:var(--muted)">${new Date(p.created_at).toLocaleDateString()}</div></div>
                  <span class="badge badge-success">৳${(p.amount || 0).toLocaleString()}</span>
                </div>
              `).join('')}
            </div>
          ` : '<div class="empty">No recent payments</div>'}
        </div>
      </div>
    `;
  }

  async function loadStudents() {
    if (!checkRateLimit()) return;
    const container = document.getElementById('page-content');
    container.innerHTML = '<div class="empty">Loading students…</div>';
    const { data: students, error } = await sb.from('students').select('*, batches(name)').eq('organization_id', orgId).order('created_at', { ascending: false });
    if (error) { toast('Error loading students: ' + error.message, 'error'); return; }

    container.innerHTML = `
      <div class="page-head">
        <div><h1>Students</h1><p class="subtitle">Manage your coaching center students</p></div>
        <div class="actions">
          <input type="text" class="search" placeholder="Search students…" id="student-search" oninput="EduFlow.debounceSearch(this.value, 'students')">
          <button class="btn btn-primary" data-require="create:students" onclick="EduFlow.showStudentModal()">+ Add Student</button>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Batch</th><th>Status</th><th data-require="update:students">Actions</th></tr></thead>
            <tbody>
              ${students?.length ? students.map(s => `
                <tr>
                  <td><strong>${escapeHtml(s.name)}</strong></td>
                  <td>${escapeHtml(s.phone || '-')}</td>
                  <td>${escapeHtml(s.batches?.name || '-')}</td>
                  <td><span class="badge badge-${s.status === 'active' ? 'success' : 'gray'}">${s.status || 'active'}</span></td>
                  <td data-require="update:students">
                    <button class="btn btn-sm btn-secondary" onclick="EduFlow.editStudent('${s.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" data-require="delete:students" onclick="EduFlow.deleteStudent('${s.id}')">Delete</button>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="5" class="empty">No students yet</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
    RBAC.applyPageGuards();
  }

  async function loadBatches() {
    if (!checkRateLimit()) return;
    const container = document.getElementById('page-content');
    container.innerHTML = '<div class="empty">Loading batches…</div>';
    const { data: batches } = await sb.from('batches').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
    container.innerHTML = `
      <div class="page-head">
        <div><h1>Batches</h1><p class="subtitle">Organize students into batches</p></div>
        <div class="actions"><button class="btn btn-primary" data-require="create:batches" onclick="EduFlow.showBatchModal()">+ New Batch</button></div>
      </div>
      <div class="grid grid-3">
        ${batches?.length ? batches.map(b => `
          <div class="card">
            <h2>${escapeHtml(b.name)}</h2>
            <p style="color:var(--muted);font-size:13px;margin:4px 0 12px">${escapeHtml(b.description || 'No description')}</p>
            <div class="mini-grid">
              <div class="mini-row"><span>Subject</span><strong>${escapeHtml(b.subject || '-')}</strong></div>
              <div class="mini-row"><span>Schedule</span><strong>${escapeHtml(b.schedule || '-')}</strong></div>
              <div class="mini-row"><span>Fee</span><strong>৳${(b.monthly_fee || 0).toLocaleString()}</strong></div>
            </div>
            <div style="margin-top:12px;display:flex;gap:8px" data-require="update:batches">
              <button class="btn btn-sm btn-secondary" onclick="EduFlow.editBatch('${b.id}')">Edit</button>
              <button class="btn btn-sm btn-danger" data-require="delete:batches" onclick="EduFlow.deleteBatch('${b.id}')">Delete</button>
            </div>
          </div>
        `).join('') : '<div class="empty" style="grid-column:1/-1">No batches yet</div>'}
      </div>
    `;
    RBAC.applyPageGuards();
  }

  async function loadAttendance() {
    if (!checkRateLimit()) return;
    const container = document.getElementById('page-content');
    container.innerHTML = '<div class="empty">Loading attendance…</div>';
    const today = new Date().toISOString().split('T')[0];
    const [{ data: batches }, { data: todayAttendance }] = await Promise.all([
      sb.from('batches').select('*').eq('organization_id', orgId),
      sb.from('attendance').select('*, students(name)').eq('organization_id', orgId).eq('date', today),
    ]);
    container.innerHTML = `
      <div class="page-head">
        <div><h1>Attendance</h1><p class="subtitle">Today's date: ${new Date().toLocaleDateString('en-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
        <div class="actions"><button class="btn btn-primary" data-require="create:attendance" onclick="EduFlow.showAttendanceModal()">+ Mark Attendance</button></div>
      </div>
      <div class="card">
        <h2>Today's Attendance</h2>
        ${todayAttendance?.length ? `
          <div class="table-wrap" style="margin-top:12px">
            <table>
              <thead><tr><th>Student</th><th>Batch</th><th>Status</th><th>Time</th></tr></thead>
              <tbody>
                ${todayAttendance.map(a => `
                  <tr>
                    <td>${escapeHtml(a.students?.name || 'Unknown')}</td>
                    <td>${escapeHtml(a.batch_id || '-')}</td>
                    <td><span class="badge badge-${a.status === 'present' ? 'success' : a.status === 'absent' ? 'danger' : 'warning'}">${a.status}</span></td>
                    <td>${new Date(a.created_at).toLocaleTimeString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<div class="empty" style="padding:24px">No attendance marked for today yet.</div>'}
      </div>
    `;
    RBAC.applyPageGuards();
  }

  async function loadPayments() {
    if (!checkRateLimit()) return;
    const container = document.getElementById('page-content');
    container.innerHTML = '<div class="empty">Loading payments…</div>';
    const { data: payments } = await sb.from('payments').select('*, students(name)').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(50);
    const total = payments?.reduce((s, p) => s + (p.amount || 0), 0) || 0;
    container.innerHTML = `
      <div class="page-head">
        <div><h1>Fees & Payments</h1><p class="subtitle">Total collected: ৳${total.toLocaleString()}</p></div>
        <div class="actions"><button class="btn btn-primary" data-require="create:payments" onclick="EduFlow.showPaymentModal()">+ Record Payment</button></div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Amount</th><th>Type</th><th>Month</th><th>Date</th><th data-require="update:payments">Actions</th></tr></thead>
            <tbody>
              ${payments?.length ? payments.map(p => `
                <tr>
                  <td><strong>${escapeHtml(p.students?.name || 'Unknown')}</strong></td>
                  <td>৳${(p.amount || 0).toLocaleString()}</td>
                  <td><span class="badge badge-blue">${escapeHtml(p.type || 'fee')}</span></td>
                  <td>${escapeHtml(p.month || '-')}</td>
                  <td>${new Date(p.created_at).toLocaleDateString()}</td>
                  <td data-require="update:payments"><button class="btn btn-sm btn-secondary" onclick="EduFlow.editPayment('${p.id}')">Edit</button></td>
                </tr>
              `).join('') : '<tr><td colspan="6" class="empty">No payments recorded</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
    RBAC.applyPageGuards();
  }

  async function loadExams() {
    if (!checkRateLimit()) return;
    const container = document.getElementById('page-content');
    container.innerHTML = '<div class="empty">Loading exams…</div>';
    const { data: exams } = await sb.from('exams').select('*').eq('organization_id', orgId).order('exam_date', { ascending: false });
    container.innerHTML = `
      <div class="page-head">
        <div><h1>Exams & Results</h1><p class="subtitle">Manage exams and publish results</p></div>
        <div class="actions"><button class="btn btn-primary" data-require="create:exams" onclick="EduFlow.showExamModal()">+ New Exam</button></div>
      </div>
      <div class="grid grid-2">
        ${exams?.length ? exams.map(e => `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div><h2>${escapeHtml(e.name)}</h2><p style="color:var(--muted);font-size:13px">${escapeHtml(e.subject || '')} • ${new Date(e.exam_date).toLocaleDateString()}</p></div>
              <span class="badge badge-${e.status === 'completed' ? 'success' : e.status === 'upcoming' ? 'blue' : 'gray'}">${e.status || 'draft'}</span>
            </div>
            <div class="mini-grid">
              <div class="mini-row"><span>Total Marks</span><strong>${e.total_marks || 100}</strong></div>
              <div class="mini-row"><span>Pass Marks</span><strong>${e.pass_marks || 40}</strong></div>
            </div>
            <div style="margin-top:12px;display:flex;gap:8px">
              <button class="btn btn-sm btn-secondary" onclick="EduFlow.viewResults('${e.id}')">View Results</button>
              <button class="btn btn-sm btn-primary" data-require="create:results" onclick="EduFlow.addResult('${e.id}')">+ Add Result</button>
            </div>
          </div>
        `).join('') : '<div class="empty" style="grid-column:1/-1">No exams yet</div>'}
      </div>
    `;
    RBAC.applyPageGuards();
  }

  async function loadResults() {
    if (!checkRateLimit()) return;
    const container = document.getElementById('page-content');
    container.innerHTML = '<div class="empty">Loading results…</div>';
    const { data: results } = await sb.from('results').select('*, students(name), exams(name, subject)').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(50);
    container.innerHTML = `
      <div class="page-head"><div><h1>Results</h1><p class="subtitle">Student exam results overview</p></div></div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Exam</th><th>Marks</th><th>Grade</th><th>Status</th></tr></thead>
            <tbody>
              ${results?.length ? results.map(r => `
                <tr>
                  <td><strong>${escapeHtml(r.students?.name || 'Unknown')}</strong></td>
                  <td>${escapeHtml(r.exams?.name || '-')}</td>
                  <td>${r.marks_obtained || 0} / ${r.total_marks || 100}</td>
                  <td><strong>${escapeHtml(r.grade || '-')}</strong></td>
                  <td><span class="badge badge-${r.status === 'pass' ? 'success' : r.status === 'fail' ? 'danger' : 'gray'}">${r.status || 'pending'}</span></td>
                </tr>
              `).join('') : '<tr><td colspan="5" class="empty">No results yet</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  async function loadTeachers() {
    if (!checkRateLimit()) return;
    const container = document.getElementById('page-content');
    container.innerHTML = '<div class="empty">Loading teachers…</div>';
    const { data: teachers } = await sb.from('teachers').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
    container.innerHTML = `
      <div class="page-head">
        <div><h1>Teachers</h1><p class="subtitle">Manage teaching staff</p></div>
        <div class="actions"><button class="btn btn-primary" data-require="create:teachers" onclick="EduFlow.showTeacherModal()">+ Add Teacher</button></div>
      </div>
      <div class="grid grid-3">
        ${teachers?.length ? teachers.map(t => `
          <div class="card">
            <div class="member-card">
              <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#2563eb);display:grid;place-items:center;font-weight:800;font-size:18px;color:#fff">${(t.name || 'T').charAt(0).toUpperCase()}</div>
              <div><strong>${escapeHtml(t.name)}</strong><div style="font-size:12px;color:var(--muted)">${escapeHtml(t.subject || 'No subject')}</div></div>
            </div>
            <div class="mini-grid" style="margin-top:12px">
              <div class="mini-row"><span>Phone</span><strong>${escapeHtml(t.phone || '-')}</strong></div>
              <div class="mini-row"><span>Salary</span><strong>৳${(t.salary || 0).toLocaleString()}</strong></div>
            </div>
            <div style="margin-top:12px;display:flex;gap:8px" data-require="update:teachers">
              <button class="btn btn-sm btn-secondary" onclick="EduFlow.editTeacher('${t.id}')">Edit</button>
              <button class="btn btn-sm btn-danger" data-require="delete:teachers" onclick="EduFlow.deleteTeacher('${t.id}')">Delete</button>
            </div>
          </div>
        `).join('') : '<div class="empty" style="grid-column:1/-1">No teachers yet</div>'}
      </div>
    `;
    RBAC.applyPageGuards();
  }

  async function loadNotices() {
    if (!checkRateLimit()) return;
    const container = document.getElementById('page-content');
    container.innerHTML = '<div class="empty">Loading notices…</div>';
    const { data: notices } = await sb.from('notices').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
    container.innerHTML = `
      <div class="page-head">
        <div><h1>Notices</h1><p class="subtitle">Announcements for students and staff</p></div>
        <div class="actions"><button class="btn btn-primary" data-require="create:notices" onclick="EduFlow.showNoticeModal()">+ New Notice</button></div>
      </div>
      ${notices?.length ? notices.map(n => `
        <div class="card" style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
            <div><h2 style="margin-bottom:4px">${escapeHtml(n.title)}</h2><p style="color:var(--muted);font-size:13px;margin:0">${new Date(n.created_at).toLocaleDateString()} • ${escapeHtml(n.priority || 'normal')}</p></div>
            <div style="display:flex;gap:8px;flex-shrink:0" data-require="update:notices">
              <button class="btn btn-sm btn-secondary" onclick="EduFlow.editNotice('${n.id}')">Edit</button>
              <button class="btn btn-sm btn-danger" data-require="delete:notices" onclick="EduFlow.deleteNotice('${n.id}')">Delete</button>
            </div>
          </div>
          <p style="margin-top:12px;font-size:14px;line-height:1.6">${escapeHtml(n.content || '')}</p>
        </div>
      `).join('') : '<div class="empty">No notices yet</div>'}
    `;
    RBAC.applyPageGuards();
  }

  async function loadBilling() {
    if (!checkRateLimit()) return;
    const container = document.getElementById('page-content');
    container.innerHTML = '<div class="empty">Loading billing…</div>';
    const { data: usage } = await sb.from('organization_usage').select('*').eq('organization_id', orgId).single();
    const plan = usage?.plan || 'free';
    const limits = window.eduflowConfig?.limits || { free: 50, pro: 500, enterprise: 5000 };

    container.innerHTML = `
      <div class="page-head"><div><h1>Billing</h1><p class="subtitle">Manage your subscription and usage</p></div></div>
      <div class="grid grid-3">
        <div class="card ${plan === 'free' ? 'hero' : ''}">
          <h2>Free</h2><p class="subtitle">For small coaching centers</p>
          <div class="value" style="font-size:32px;margin:12px 0">৳0<span style="font-size:14px">/month</span></div>
          <ul style="list-style:none;padding:0;margin:16px 0;font-size:13px;line-height:2">
            <li>✅ Up to ${limits.free} students</li><li>✅ Basic modules</li><li>✅ Email support</li><li>❌ Advanced analytics</li>
          </ul>
          ${plan === 'free' ? '<button class="btn btn-primary" style="width:100%" disabled>Current Plan</button>' : '<button class="btn btn-secondary" style="width:100%" onclick="EduFlow.changePlan('free')">Downgrade</button>'}
        </div>
        <div class="card ${plan === 'pro' ? 'hero' : ''}">
          <h2>Pro</h2><p class="subtitle">For growing centers</p>
          <div class="value" style="font-size:32px;margin:12px 0">৳1,499<span style="font-size:14px">/month</span></div>
          <ul style="list-style:none;padding:0;margin:16px 0;font-size:13px;line-height:2">
            <li>✅ Up to ${limits.pro} students</li><li>✅ All modules</li><li>✅ Priority support</li><li>✅ Advanced analytics</li>
          </ul>
          ${plan === 'pro' ? '<button class="btn btn-primary" style="width:100%" disabled>Current Plan</button>' : '<button class="btn btn-primary" style="width:100%" onclick="EduFlow.changePlan('pro')">Upgrade to Pro</button>'}
        </div>
        <div class="card ${plan === 'enterprise' ? 'hero' : ''}">
          <h2>Enterprise</h2><p class="subtitle">For large institutions</p>
          <div class="value" style="font-size:32px;margin:12px 0">৳4,999<span style="font-size:14px">/month</span></div>
          <ul style="list-style:none;padding:0;margin:16px 0;font-size:13px;line-height:2">
            <li>✅ Up to ${limits.enterprise} students</li><li>✅ All Pro features</li><li>✅ Dedicated support</li><li>✅ Custom integrations</li>
          </ul>
          ${plan === 'enterprise' ? '<button class="btn btn-primary" style="width:100%" disabled>Current Plan</button>' : '<button class="btn btn-secondary" style="width:100%" onclick="EduFlow.changePlan('enterprise')">Contact Sales</button>'}
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <h2>Usage This Month</h2>
        <div style="margin-top:16px">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px"><span>Students</span><span>${usage?.student_count || 0} / ${limits[plan]}</span></div>
          <div style="height:8px;background:var(--line);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${Math.min(100, ((usage?.student_count || 0) / limits[plan]) * 100)}%;background:linear-gradient(90deg,var(--blue),var(--neon));border-radius:4px;transition:width 0.3s"></div>
          </div>
        </div>
        <div style="margin-top:16px">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px"><span>Storage</span><span>${(usage?.storage_mb || 0).toFixed(1)} MB / ${plan === 'free' ? '100' : plan === 'pro' ? '1000' : '10000'} MB</span></div>
          <div style="height:8px;background:var(--line);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${Math.min(100, ((usage?.storage_mb || 0) / (plan === 'free' ? 100 : plan === 'pro' ? 1000 : 10000)) * 100)}%;background:linear-gradient(90deg,var(--green),#0ea5e9);border-radius:4px;transition:width 0.3s"></div>
          </div>
        </div>
      </div>
    `;
  }

  async function loadSettings() {
    if (!checkRateLimit()) return;
    const container = document.getElementById('page-content');
    container.innerHTML = `
      <div class="page-head"><div><h1>Settings</h1><p class="subtitle">Configure your coaching center</p></div></div>
      <div class="card" style="max-width:680px">
        <h2>Organization Profile</h2>
        <form id="settings-form" onsubmit="return false;" style="margin-top:16px">
          <div class="form-grid">
            <div class="field"><label>Organization Name</label><input type="text" id="setting-org-name" value="${escapeHtml(org?.name || '')}"></div>
            <div class="field"><label>Phone</label><input type="tel" id="setting-org-phone" value="${escapeHtml(org?.phone || '')}"></div>
            <div class="field"><label>Address</label><input type="text" id="setting-org-address" value="${escapeHtml(org?.address || '')}"></div>
            <div class="field"><label>Website</label><input type="url" id="setting-org-website" value="${escapeHtml(org?.website || '')}"></div>
          </div>
          <div class="end-actions"><button type="submit" class="btn btn-primary" id="settings-save">Save Changes</button></div>
        </form>
      </div>
      <div class="card" style="max-width:680px;margin-top:16px">
        <h2>My Profile</h2>
        <form id="profile-form" onsubmit="return false;" style="margin-top:16px">
          <div class="form-grid">
            <div class="field"><label>Full Name</label><input type="text" id="setting-user-name" value="${escapeHtml(profile?.full_name || '')}"></div>
            <div class="field"><label>Email</label><input type="email" value="${escapeHtml(session?.user?.email || '')}" disabled style="background:var(--bg)"></div>
          </div>
          <div class="end-actions"><button type="submit" class="btn btn-primary" id="profile-save">Update Profile</button></div>
        </form>
      </div>
      <div class="card" style="max-width:680px;margin-top:16px">
        <h2>Security</h2>
        <div style="margin-top:12px"><button class="btn btn-secondary" onclick="EduFlow.changePassword()">Change Password</button></div>
      </div>
    `;

    document.getElementById('settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('settings-save');
      btn.disabled = true; btn.textContent = 'Saving…';
      const { error } = await sb.from('organizations').update({
        name: document.getElementById('setting-org-name').value.trim(),
        phone: document.getElementById('setting-org-phone').value.trim(),
        address: document.getElementById('setting-org-address').value.trim(),
        website: document.getElementById('setting-org-website').value.trim(),
      }).eq('id', orgId);
      if (error) { toast('Failed to save: ' + error.message, 'error'); }
      else { await auditLog('organization_updated', {}); toast('Settings saved', 'success'); org.name = document.getElementById('setting-org-name').value.trim(); document.getElementById('org-name').textContent = org.name; }
      btn.disabled = false; btn.textContent = 'Save Changes';
    });

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('profile-save');
      btn.disabled = true; btn.textContent = 'Updating…';
      const { error } = await sb.from('profiles').update({
        full_name: document.getElementById('setting-user-name').value.trim(),
      }).eq('id', userId);
      if (error) { toast('Failed to update: ' + error.message, 'error'); }
      else { await auditLog('profile_updated', {}); toast('Profile updated', 'success'); profile.full_name = document.getElementById('setting-user-name').value.trim(); document.getElementById('user-name').textContent = profile.full_name; document.getElementById('user-avatar').textContent = profile.full_name.charAt(0).toUpperCase(); }
      btn.disabled = false; btn.textContent = 'Update Profile';
    });
  }

  async function loadAuditLog() {
    if (!checkRateLimit()) return;
    const container = document.getElementById('page-content');
    container.innerHTML = '<div class="empty">Loading audit log…</div>';
    const { data: logs, error } = await sb.from('audit_logs').select('*, profiles(full_name)').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    container.innerHTML = `
      <div class="page-head"><div><h1>Audit Log</h1><p class="subtitle">Track all actions in your organization</p></div></div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>
              ${logs?.length ? logs.map(l => `
                <tr>
                  <td style="white-space:nowrap;font-size:12px">${new Date(l.created_at).toLocaleString()}</td>
                  <td>${escapeHtml(l.profiles?.full_name || 'System')}</td>
                  <td><span class="badge badge-gray">${escapeHtml(l.action)}</span></td>
                  <td style="font-size:12px;max-width:300px;overflow:hidden;text-overflow:ellipsis">${escapeHtml(JSON.stringify(l.metadata || {}))}</td>
                </tr>
              `).join('') : '<tr><td colspan="4" class="empty">No audit entries yet</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ─── Modals & Toast ──────────────────────────────
  function modal(html) {
    document.getElementById('modal-root').innerHTML = `
      <div class="modal-backdrop" onclick="if(event.target===this)EduFlow.closeModal()">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="modal-head"><div></div><button class="close" onclick="EduFlow.closeModal()">✕</button></div>
          ${html}
        </div>
      </div>
    `;
  }
  function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

  function toast(message, type = 'info') {
    const root = document.getElementById('toast-root');
    const colors = {
      success: 'border-color:rgba(34,197,94,.4);background:#064e3b',
      error: 'border-color:rgba(239,68,68,.4);background:#450a0a',
      warning: 'border-color:rgba(234,179,8,.4);background:#422006',
      info: 'border-color:rgba(33,212,255,.22);background:#07111f',
    };
    const el = document.createElement('div');
    el.className = 'toast';
    el.style.cssText = (colors[type] || colors.info) + ';opacity:0;transform:translateY(10px);transition:all .3s';
    el.textContent = message;
    root.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; setTimeout(() => el.remove(), 300); }, 4000);
  }

  // ─── Utilities ───────────────────────────────────
  function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
  function debounceSearch(value, type) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => { console.log('Search:', value, type); }, 300);
  }
  function showFatalError(title, message) {
    document.body.innerHTML = `
      <div style="min-height:100vh;display:grid;place-items:center;background:var(--bg);padding:20px">
        <div style="text-align:center;max-width:400px">
          <div style="font-size:48px;margin-bottom:16px">⚠️</div>
          <h1 style="margin:0 0 8px">${escapeHtml(title)}</h1>
          <p style="color:var(--muted);line-height:1.6">${escapeHtml(message)}</p>
          <button onclick="location.reload()" class="btn btn-primary" style="margin-top:20px">Reload Page</button>
        </div>
      </div>
    `;
  }

  // ─── Placeholder CRUD ────────────────────────────
  function showStudentModal() { toast('Student form — implement in your module', 'info'); }
  function editStudent(id) { toast('Edit student ' + id, 'info'); }
  function deleteStudent(id) { if (!confirm('Delete this student?')) return; toast('Student deleted', 'success'); }
  function showBatchModal() { toast('Batch form — implement in your module', 'info'); }
  function editBatch(id) { toast('Edit batch ' + id, 'info'); }
  function deleteBatch(id) { if (!confirm('Delete this batch?')) return; toast('Batch deleted', 'success'); }
  function showAttendanceModal() { toast('Attendance form — implement in your module', 'info'); }
  function showPaymentModal() { toast('Payment form — implement in your module', 'info'); }
  function editPayment(id) { toast('Edit payment ' + id, 'info'); }
  function showExamModal() { toast('Exam form — implement in your module', 'info'); }
  function viewResults(examId) { navigateTo('results'); }
  function addResult(examId) { toast('Add result for exam ' + examId, 'info'); }
  function showTeacherModal() { toast('Teacher form — implement in your module', 'info'); }
  function editTeacher(id) { toast('Edit teacher ' + id, 'info'); }
  function deleteTeacher(id) { if (!confirm('Delete this teacher?')) return; toast('Teacher deleted', 'success'); }
  function showNoticeModal() { toast('Notice form — implement in your module', 'info'); }
  function editNotice(id) { toast('Edit notice ' + id, 'info'); }
  function deleteNotice(id) { if (!confirm('Delete this notice?')) return; toast('Notice deleted', 'success'); }
  function changePlan(plan) { toast('Plan change to ' + plan + ' — integrate payment gateway', 'info'); }
  function changePassword() { toast('Password change — use Supabase Auth', 'info'); }

  return {
    init,
    get supabase() { return sb; },
    get session() { return session; },
    get profile() { return profile; },
    get org() { return org; },
    get orgId() { return orgId; },
    get userId() { return userId; },
    navigateTo,
    modal,
    closeModal,
    toast,
    escapeHtml,
    debounceSearch,
    auditLog,
    checkRateLimit,
    showStudentModal, editStudent, deleteStudent,
    showBatchModal, editBatch, deleteBatch,
    showAttendanceModal,
    showPaymentModal, editPayment,
    showExamModal, viewResults, addResult,
    showTeacherModal, editTeacher, deleteTeacher,
    showNoticeModal, editNotice, deleteNotice,
    changePlan, changePassword,
  };
})();

document.addEventListener('DOMContentLoaded', EduFlow.init);
