(() => {
  const roleLabels = { owner: 'Owner', admin: 'Admin', teacher: 'Teacher', staff: 'Staff' };
  const allowedRoles = ['admin', 'teacher', 'staff'];

  const canManageTeam = () => window.profile?.role === 'owner';
  const teamEscape = value => String(value ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));

  async function loadTeam() {
    if (!canManageTeam()) throw new Error('Only the workspace owner can manage the team.');
    const { data, error } = await window.client().from('profiles')
      .select('id,full_name,role,created_at')
      .eq('organization_id', window.orgId())
      .order('created_at', { ascending: true });
    if (error) throw error;
    const { data: invites, error: inviteError } = await window.client().from('organization_invitations')
      .select('id,email,full_name,role,status,created_at')
      .eq('organization_id', window.orgId())
      .order('created_at', { ascending: false });
    if (inviteError) throw inviteError;
    return { members: data || [], invites: invites || [] };
  }

  function teamView() {
    return `<div class="page-head"><div><h1>Team</h1><div class="subtitle">Manage who can access this coaching center.</div></div><button class="btn btn-primary" onclick="openInviteMember()">＋ Invite member</button></div>
      <div class="notice">Only the owner can change roles or send invitations. Database security rules enforce the same permissions.</div>
      <div id="teamContent" style="margin-top:16px"><div class="card"><div class="empty">Loading team…</div></div></div>`;
  }

  async function renderTeam() {
    if (!canManageTeam()) return `<div class="card"><div class="empty">Team management is available to the workspace owner.</div></div>`;
    const c = document.getElementById('content');
    if (!c) return;
    c.innerHTML = teamView();
    try {
      const { members, invites } = await loadTeam();
      document.getElementById('teamContent').innerHTML = `
        <div class="card"><div class="page-head" style="margin-bottom:8px"><div><h2>Members</h2><div class="subtitle">People with access to this workspace.</div></div><span class="badge badge-success">${members.length}</span></div>
          <div class="table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Joined</th><th></th></tr></thead><tbody>
          ${members.map(m => `<tr><td><strong>${teamEscape(m.full_name || 'Unnamed member')}</strong></td><td><select class="team-role" data-member="${m.id}" ${m.role==='owner'?'disabled':''}>${['owner', ...allowedRoles].map(r => `<option value="${r}" ${m.role===r?'selected':''}>${roleLabels[r]}</option>`).join('')}</select></td><td>${m.created_at ? new Date(m.created_at).toLocaleDateString('en-BD') : '—'}</td><td>${m.role==='owner' ? '<span class="badge badge-blue">Primary owner</span>' : '<button class="btn btn-secondary btn-sm" onclick="saveMemberRole(\''+m.id+'\', this)">Save</button>'}</td></tr>`).join('') || '<tr><td colspan="4"><div class="empty">No members yet.</div></td></tr>'}
          </tbody></table></div>
        </div>
        <div class="card" style="margin-top:16px"><div class="page-head" style="margin-bottom:8px"><div><h2>Invitations</h2><div class="subtitle">Pending and recent member invitations.</div></div><span class="badge badge-blue">${invites.length}</span></div>
          <div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Sent</th></tr></thead><tbody>
          ${invites.map(i => `<tr><td>${teamEscape(i.full_name || '—')}</td><td>${teamEscape(i.email)}</td><td>${roleLabels[i.role] || teamEscape(i.role)}</td><td><span class="badge ${i.status==='accepted'?'badge-success':i.status==='cancelled'?'badge-danger':'badge-warning'}">${teamEscape(i.status)}</span></td><td>${new Date(i.created_at).toLocaleDateString('en-BD')}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">No invitations yet.</div></td></tr>'}
          </tbody></table></div>
        </div>`;
    } catch (e) {
      document.getElementById('teamContent').innerHTML = `<div class="card"><div class="notice">${teamEscape(e.message)}</div></div>`;
    }
  }

  async function openInviteMember() {
    if (!canManageTeam()) return window.toast?.('Only the owner can invite members.');
    window.modal('Invite team member', `<div class="form-grid"><div class="field"><label>Full name</label><input id="tm_name" placeholder="Rahim Ahmed"></div><div class="field"><label>Email</label><input id="tm_email" type="email" placeholder="rahim@example.com"></div><div class="field"><label>Role</label><select id="tm_role">${allowedRoles.map(r => `<option value="${r}">${roleLabels[r]}</option>`).join('')}</select></div></div><div class="notice" style="margin-top:14px">EduFlow will send the invitation email. The member joins this workspace when they complete signup from the invitation.</div><div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="sendMemberInvite()">Send invitation</button></div>`);
  }

  async function sendMemberInvite() {
    try {
      const payload = { email: document.getElementById('tm_email').value.trim(), full_name: document.getElementById('tm_name').value.trim(), role: document.getElementById('tm_role').value };
      if (!payload.email) throw new Error('Email is required.');
      const { data, error } = await window.client().functions.invoke('invite-member', { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      window.closeModal();
      window.toast('Invitation sent.');
      renderTeam();
    } catch (e) { window.toast(e.message || 'Could not send invitation.'); }
  }

  async function saveMemberRole(id, button) {
    try {
      if (!canManageTeam()) throw new Error('Only the owner can change roles.');
      const select = button.closest('tr').querySelector('.team-role');
      const role = select.value;
      if (role === 'owner') throw new Error('Use the primary owner account for ownership changes.');
      button.disabled = true;
      const { error } = await window.client().from('profiles').update({ role }).eq('id', id).eq('organization_id', window.orgId());
      if (error) throw error;
      window.toast('Role updated.');
      renderTeam();
    } catch (e) { button.disabled = false; window.toast(e.message); }
  }

  const originalRender = window.render;
  window.render = function() {
    if (window.page === 'team') return renderTeam();
    return originalRender.apply(this, arguments);
  };

  const originalTitle = window.title;
  window.title = function() {
    return window.page === 'team' ? 'Team' : originalTitle.apply(this, arguments);
  };

  const originalRenderApp = window.renderApp;
  window.renderApp = function() {
    originalRenderApp.apply(this, arguments);
    const nav = document.querySelector('.nav');
    if (nav && canManageTeam() && !nav.querySelector('[data-team-nav]')) {
      const section = document.createElement('div');
      section.innerHTML = `<div class="nav-section">Workspace</div><button data-team-nav onclick="go('team')" class="${window.page==='team'?'active':''}"><span class="ico">♙</span>Team</button>`;
      nav.appendChild(section);
    }
  };

  Object.assign(window, { openInviteMember, sendMemberInvite, saveMemberRole, renderTeam });
})();
