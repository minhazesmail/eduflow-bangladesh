(() => {
  const originalAuthScreen = window.authScreen;
  const originalSignin = window.signin;
  const originalSignup = window.signup;

  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const get = id => document.getElementById(id);

  function authError(message) {
    const box = get('auth_error');
    if (box) { box.textContent = message; box.hidden = false; }
    else window.toast?.(message);
  }

  function friendlyAuthError(error) {
    const m = String(error?.message || error || '').toLowerCase();
    if (m.includes('invalid login credentials')) return 'Email or password is incorrect. Please try again.';
    if (m.includes('email not confirmed')) return 'Please confirm your email address first, then sign in.';
    if (m.includes('too many requests') || m.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.';
    if (m.includes('user already registered')) return 'This email already has an account. Please sign in instead.';
    if (m.includes('password')) return 'Password must meet the minimum requirements.';
    return error?.message || 'Something went wrong. Please try again.';
  }

  function setBusy(button, busy, busyText='Please wait…') {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.classList.add('is-loading');
      button.innerHTML = `<span class="auth-spinner" aria-hidden="true"></span>${busyText}`;
    } else {
      button.disabled = false;
      button.classList.remove('is-loading');
      button.textContent = button.dataset.originalText || 'Continue';
    }
  }

  window.authScreen = function(message='', invite=false) {
    if (invite) return originalAuthScreen(message, invite);
    document.body.innerHTML = `<div class="auth-shell"><div class="card auth-card">
      <div class="auth-brand">${window.rabbitLogo?.(42) || ''}<div><strong>EduFlow</strong><div class="subtitle">Bangladesh • Coaching OS</div></div></div>
      <h1>${window.authMode === 'signup' ? 'Register your Coaching Center' : 'Welcome back'}</h1>
      <div class="sub">${window.authMode === 'signup' ? 'Only center owners should register a new workspace.' : 'Run your coaching center from one place.'}</div>
      <div id="auth_error" class="auth-error" role="alert" hidden></div>
      ${window.authMode === 'signup' ? `<div class="field"><label for="auth_name">Your name</label><input id="auth_name" autocomplete="name" placeholder="Full name"></div>
      <div class="field" style="margin-top:12px"><label for="auth_org">Coaching center name</label><input id="auth_org" autocomplete="organization" placeholder="ABC Coaching Center"></div>` : ''}
      <div class="field" style="margin-top:12px"><label for="auth_email">Email</label><input id="auth_email" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com"></div>
      <div class="field" style="margin-top:12px"><label for="auth_password">Password</label><input id="auth_password" type="password" autocomplete="${window.authMode === 'signin' ? 'current-password' : 'new-password'}" placeholder="Your password"></div>
      ${window.authMode === 'signin' ? `<div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="text-link" type="button" onclick="showForgotPassword()">Forgot password?</button></div>` : ''}
      <div class="actions" style="margin-top:18px"><button id="auth_submit" class="btn btn-primary" style="flex:1" onclick="${window.authMode === 'signin' ? 'signinUx()' : 'signupUx()'}">${window.authMode === 'signin' ? 'Sign in' : 'Register your Coaching Center'}</button>
      <button class="btn btn-secondary" type="button" onclick="toggleAuth()">${window.authMode === 'signin' ? 'Register your Coaching Center' : 'Back to sign in'}</button></div>
      ${window.authMode === 'signup' ? `<div class="auth-helper">Only center owners should register. Teachers/Staff: please ask your admin for login details.</div>` : `<div class="auth-helper">Teachers and Staff should use an account provided by the center owner/admin.</div>`}
      <div class="subtitle" style="font-size:11px;margin-top:15px">Your coaching-center data stays isolated to your workspace.</div>
    </div></div>`;
  };

  window.signinUx = async function() {
    const button = get('auth_submit');
    try {
      setBusy(button, true, 'Signing in…');
      const email = get('auth_email')?.value.trim(), password = get('auth_password')?.value;
      if (!email || !password) throw new Error('Enter your email and password.');
      const { error } = await window.client().auth.signInWithPassword({ email, password });
      if (error) throw error;
      await window.boot?.();
    } catch (e) { authError(friendlyAuthError(e)); setBusy(button, false); }
  };

  window.signupUx = async function() {
    const button = get('auth_submit');
    try {
      setBusy(button, true, 'Creating workspace…');
      const email = get('auth_email')?.value.trim(), password = get('auth_password')?.value, name = get('auth_name')?.value.trim(), org = get('auth_org')?.value.trim();
      if (!name || !org || !email || password.length < 6) throw new Error('Complete all fields. Password must be at least 6 characters.');
      const { data, error } = await window.client().auth.signUp({ email, password, options: { data: { full_name: name, organization_name: org } } });
      if (error) throw error;
      if (!data.session) { window.authMode = 'signin'; window.authScreen('Your owner account was created. Check your email, confirm it, then sign in.'); return; }
      await window.boot?.();
    } catch (e) { authError(friendlyAuthError(e)); setBusy(button, false); }
  };

  window.showForgotPassword = function() {
    document.body.innerHTML = `<div class="auth-shell"><div class="card auth-card">
      <div class="auth-brand">${window.rabbitLogo?.(42) || ''}<div><strong>EduFlow</strong><div class="subtitle">Password recovery</div></div></div>
      <h1>Reset your password</h1><div class="sub">We’ll send a secure recovery link to your email.</div>
      <div id="reset_error" class="auth-error" role="alert" hidden></div><div id="reset_success" class="auth-success" role="status" hidden></div>
      <div class="field"><label for="reset_email">Email</label><input id="reset_email" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com"></div>
      <div class="actions" style="margin-top:18px"><button id="reset_submit" class="btn btn-primary" style="flex:1" onclick="sendPasswordReset()">Send reset link</button><button class="btn btn-secondary" onclick="authMode='signin';authScreen()">Back to sign in</button></div>
    </div></div>`;
  };

  window.sendPasswordReset = async function() {
    const button = get('reset_submit'), email = get('reset_email')?.value.trim();
    const err = get('reset_error'), ok = get('reset_success');
    try {
      if (!email) throw new Error('Enter the email used for your center owner account.');
      setBusy(button, true, 'Sending…');
      const { error } = await window.client().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname}` });
      if (error) throw error;
      if (err) err.hidden = true;
      if (ok) { ok.textContent = 'Reset link sent. Check your email inbox and spam folder.'; ok.hidden = false; }
    } catch (e) { if (err) { err.textContent = friendlyAuthError(e); err.hidden = false; } }
    finally { setBusy(button, false); }
  };

  window.toggleAuth = function() {
    window.authMode = window.authMode === 'signin' ? 'signup' : 'signin';
    window.authScreen();
  };
})();