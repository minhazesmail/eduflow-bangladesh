/* EduFlow password recovery: works with the active app.html runtime and Supabase Auth. */
(function () {
  'use strict';

  const config = window.eduflowConfig;
  if (!config?.supabaseUrl || !config?.supabaseKey || config.isDemo) return;

  const supabaseClient = window.supabase?.createClient?.(config.supabaseUrl, config.supabaseKey, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
  });
  if (!supabaseClient) return;

  const $ = (id) => document.getElementById(id);
  const esc = (value) => {
    const d = document.createElement('div');
    d.textContent = value == null ? '' : String(value);
    return d.innerHTML;
  };

  function showMessage(text, type = 'error') {
    const node = $('auth-recovery-message');
    if (!node) return;
    node.textContent = text;
    node.className = type === 'success' ? 'auth-success' : 'auth-error';
    node.hidden = false;
  }

  function renderRecovery() {
    const root = $('auth-screen');
    if (!root) return;
    root.classList.remove('hidden');
    $('app-shell')?.classList.add('hidden');
    root.innerHTML = `<div class="auth-shell"><div class="card auth-card">
      <div class="auth-brand"><img src="/eduflow-icon.svg" alt="EduFlow" width="42" height="42"><div><strong>EduFlow</strong><div class="subtitle">Secure password recovery</div></div></div>
      <h1>Set a new password</h1>
      <p class="sub">Choose a new password for your coaching-center account.</p>
      <div id="auth-recovery-message" hidden></div>
      <form id="auth-recovery-form">
        <div class="field"><label for="recovery-password">New password</label><input id="recovery-password" type="password" minlength="6" autocomplete="new-password" required></div>
        <div class="field" style="margin-top:12px"><label for="recovery-confirm">Confirm password</label><input id="recovery-confirm" type="password" minlength="6" autocomplete="new-password" required></div>
        <div class="actions" style="margin-top:18px"><button class="btn btn-primary" id="recovery-submit" type="submit">Update password</button></div>
      </form>
    </div></div>`;

    $('auth-recovery-form').onsubmit = async (event) => {
      event.preventDefault();
      const button = $('recovery-submit');
      const password = $('recovery-password').value;
      const confirm = $('recovery-confirm').value;
      if (password.length < 6) return showMessage('Password must be at least 6 characters.');
      if (password !== confirm) return showMessage('Passwords do not match.');
      button.disabled = true;
      button.textContent = 'Updating…';
      try {
        const { error } = await supabaseClient.auth.updateUser({ password });
        if (error) throw error;
        showMessage('Password updated. Please sign in with your new password.', 'success');
        await supabaseClient.auth.signOut();
        history.replaceState(null, '', `${location.pathname}`);
        setTimeout(() => location.reload(), 700);
      } catch (error) {
        showMessage(error?.message || 'Could not update your password.');
      } finally {
        button.disabled = false;
        button.textContent = 'Update password';
      }
    };
  }

  function renderForgotPasswordLink() {
    const form = $('auth-form-el');
    if (!form || $('forgot-password-link')) return;
    const actions = form.querySelector('.actions');
    if (!actions) return;
    const link = document.createElement('button');
    link.type = 'button';
    link.id = 'forgot-password-link';
    link.className = 'btn btn-secondary';
    link.textContent = 'Forgot password?';
    link.style.marginTop = '8px';
    link.onclick = async () => {
      const email = $('auth-email')?.value.trim().toLowerCase();
      if (!email) return showForgotForm('Enter your account email first.');
      await sendReset(email);
    };
    actions.parentElement?.appendChild(link);
  }

  function showForgotForm(message = '') {
    const root = $('auth-screen');
    if (!root) return;
    root.classList.remove('hidden');
    $('app-shell')?.classList.add('hidden');
    root.innerHTML = `<div class="auth-shell"><div class="card auth-card">
      <div class="auth-brand"><img src="/eduflow-icon.svg" alt="EduFlow" width="42" height="42"><div><strong>EduFlow</strong><div class="subtitle">Password recovery</div></div></div>
      <h1>Reset your password</h1>
      <p class="sub">We will email you a secure link to choose a new password.</p>
      ${message ? `<div id="forgot-message" class="auth-error" role="alert">${esc(message)}</div>` : '<div id="forgot-message" hidden></div>'}
      <form id="forgot-form">
        <div class="field"><label for="forgot-email">Email</label><input id="forgot-email" type="email" autocomplete="email" required></div>
        <div class="actions" style="margin-top:18px"><button class="btn btn-primary" type="submit" id="forgot-submit">Send reset link</button><button class="btn btn-secondary" type="button" id="forgot-back">Back to sign in</button></div>
      </form>
    </div></div>`;
    $('forgot-back').onclick = () => location.reload();
    $('forgot-form').onsubmit = async (event) => {
      event.preventDefault();
      await sendReset($('forgot-email').value.trim().toLowerCase());
    };
  }

  async function sendReset(email) {
    const button = $('forgot-submit');
    if (button) { button.disabled = true; button.textContent = 'Sending…'; }
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/app.html?mode=recovery`
      });
      if (error) throw error;
      const message = $('forgot-message');
      if (message) {
        message.className = 'auth-success';
        message.textContent = 'If an account exists for that email, a reset link has been sent.';
        message.hidden = false;
      }
    } catch (error) {
      const message = $('forgot-message');
      if (message) {
        message.className = 'auth-error';
        message.textContent = error?.message || 'Could not send the reset link.';
        message.hidden = false;
      }
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Send reset link'; }
    }
  }

  function watchAuth() {
    supabaseClient.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') renderRecovery();
    });
  }

  const observer = new MutationObserver(renderForgotPasswordLink);
  function start() {
    if (new URLSearchParams(location.search).get('mode') === 'recovery') {
      setTimeout(async () => {
        const { data } = await supabaseClient.auth.getSession();
        if (data?.session) renderRecovery();
      }, 0);
    }
    renderForgotPasswordLink();
    observer.observe(document.body, { childList: true, subtree: true });
    watchAuth();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
