(() => {
  function renderRecovery(){
    document.body.innerHTML = `<div class="auth-shell"><div class="card auth-card">
      <div class="auth-brand">${window.rabbitLogo?.(42) || ''}<div><strong>EduFlow</strong><div class="subtitle">Secure password recovery</div></div></div>
      <h1>Set a new password</h1>
      <div class="sub">Choose a new password for your coaching-center owner account.</div>
      <div id="recovery_error" class="auth-error" role="alert" hidden></div>
      <div id="recovery_success" class="auth-success" role="status" hidden></div>
      <div class="field"><label for="new_password">New password</label><input id="new_password" type="password" autocomplete="new-password" minlength="6" placeholder="At least 6 characters"></div>
      <div class="field" style="margin-top:12px"><label for="new_password_confirm">Confirm new password</label><input id="new_password_confirm" type="password" autocomplete="new-password" minlength="6" placeholder="Re-enter your password"></div>
      <div class="actions" style="margin-top:18px"><button id="recovery_submit" class="btn btn-primary" style="flex:1" onclick="updateRecoveredPassword()">Update password</button><button class="btn btn-secondary" onclick="location.reload()">Cancel</button></div>
    </div></div>`;
  }

  window.updateRecoveredPassword = async function(){
    const button=document.getElementById('recovery_submit'), err=document.getElementById('recovery_error'), ok=document.getElementById('recovery_success');
    try{
      const p=document.getElementById('new_password')?.value||'', c=document.getElementById('new_password_confirm')?.value||'';
      if(p.length<6) throw new Error('Password must be at least 6 characters.');
      if(p!==c) throw new Error('Passwords do not match.');
      button.disabled=true; button.textContent='Updating…';
      const {error}=await window.client().auth.updateUser({password:p});
      if(error) throw error;
      if(ok){ok.textContent='Password updated. Opening your EduFlow workspace…';ok.hidden=false;}
      if(err) err.hidden=true;
      setTimeout(()=>location.reload(),700);
    }catch(e){if(err){err.textContent=e?.message||'Could not update your password.';err.hidden=false;}}
    finally{button.disabled=false;button.textContent='Update password';}
  };

  function watchRecovery(){
    const sb=window.client?.(); if(!sb) return;
    sb.auth.onAuthStateChange((event)=>{ if(event==='PASSWORD_RECOVERY') setTimeout(renderRecovery,0); });
  }
  watchRecovery();
})();