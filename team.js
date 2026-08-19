/**
 * EduFlow Team Management
 * Owner-only functionality for inviting and managing team members.
 */

const TeamModule = (function() {
  'use strict';

  async function loadTeam() {
    if (!RBAC.isOwner()) {
      EduFlow.toast('You do not have permission to manage team members.', 'error');
      return;
    }

    const { data: members, error } = await EduFlow.supabase
      .from('profiles')
      .select('id, full_name, email:users(email), role, created_at')
      .eq('organization_id', EduFlow.orgId)
      .order('created_at', { ascending: false });

    if (error) {
      EduFlow.toast('Failed to load team: ' + error.message, 'error');
      return;
    }

    const { data: invites } = await EduFlow.supabase
      .from('organization_invitations')
      .select('*')
      .eq('organization_id', EduFlow.orgId)
      .in('status', ['pending', 'sent'])
      .order('created_at', { ascending: false });

    renderTeam(members || [], invites || []);
  }

  function renderTeam(members, invites) {
    const container = document.getElementById('page-content');

    const membersHtml = members.map(m => `
      <tr>
        <td>
          <div class="member-card">
            <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#21d4ff,#2563eb);display:grid;place-items:center;font-weight:800;font-size:14px;color:#fff">
              ${(m.full_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>${EduFlow.escapeHtml(m.full_name || 'Unknown')}</strong>
              <div style="font-size:12px;color:var(--muted)">${EduFlow.escapeHtml(m.email?.email || '')}</div>
            </div>
          </div>
        </td>
        <td><span class="badge badge-${m.role === 'owner' ? 'blue' : 'gray'}">${m.role}</span></td>
        <td>${new Date(m.created_at).toLocaleDateString()}</td>
        <td>
          ${m.id !== EduFlow.userId ? `
            <button class="btn btn-sm btn-secondary" onclick="TeamModule.changeRole('${m.id}', '${m.role}')">Change Role</button>
            <button class="btn btn-sm btn-danger" onclick="TeamModule.removeMember('${m.id}', '${EduFlow.escapeHtml(m.full_name || 'this member')}')">Remove</button>
          ` : '<span style="font-size:12px;color:var(--muted)">You</span>'}
        </td>
      </tr>
    `).join('');

    const invitesHtml = invites.length ? `
      <div class="card" style="margin-top:16px">
        <h2>Pending Invitations</h2>
        <table>
          <thead><tr><th>Email</th><th>Role</th><th>Sent</th><th></th></tr></thead>
          <tbody>
            ${invites.map(i => `
              <tr>
                <td>${EduFlow.escapeHtml(i.email)}</td>
                <td><span class="badge badge-gray">${i.role}</span></td>
                <td>${new Date(i.created_at).toLocaleDateString()}</td>
                <td>
                  <button class="btn btn-sm btn-danger" onclick="TeamModule.cancelInvite('${i.id}')">Cancel</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '';

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Team Management</h1>
          <p class="subtitle">Invite and manage your coaching center team members.</p>
        </div>
        <div class="actions">
          <button class="btn btn-primary" onclick="TeamModule.showInviteModal()">+ Invite Member</button>
        </div>
      </div>

      <div class="card">
        <div class="section-head">
          <h2>Members (${members.length})</h2>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Member</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>${membersHtml}</tbody>
          </table>
        </div>
      </div>

      ${invitesHtml}
    `;
  }

  function showInviteModal() {
    if (!RBAC.isOwner()) return;

    EduFlow.modal(`
      <h2>Invite Team Member</h2>
      <form id="invite-form" onsubmit="return false;">
        <div class="form-grid" style="margin-top:16px">
          <div class="field">
            <label>Email Address *</label>
            <input type="email" id="invite-email" placeholder="colleague@example.com" required>
          </div>
          <div class="field">
            <label>Full Name</label>
            <input type="text" id="invite-name" placeholder="John Doe">
          </div>
          <div class="field">
            <label>Role *</label>
            <select id="invite-role" required>
              <option value="admin">Admin — Full operational access</option>
              <option value="teacher">Teacher — Students, attendance, results</option>
              <option value="staff">Staff — Attendance, payments, read-only</option>
            </select>
          </div>
        </div>
        <div class="end-actions">
          <button type="button" class="btn btn-secondary" onclick="EduFlow.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary" id="invite-submit">Send Invitation</button>
        </div>
      </form>
    `);

    document.getElementById('invite-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('invite-submit');
      btn.disabled = true;
      btn.textContent = 'Sending…';

      const email = document.getElementById('invite-email').value.trim();
      const fullName = document.getElementById('invite-name').value.trim();
      const role = document.getElementById('invite-role').value;

      try {
        const res = await fetch('/api/invite-member', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await EduFlow.supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({ email, full_name: fullName, role })
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Invitation failed');

        EduFlow.toast('Invitation sent successfully!', 'success');
        EduFlow.closeModal();
        await loadTeam();
      } catch (err) {
        EduFlow.toast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send Invitation';
      }
    });
  }

  async function changeRole(userId, currentRole) {
    if (!RBAC.isOwner()) return;

    EduFlow.modal(`
      <h2>Change Role</h2>
      <div class="field" style="margin-top:16px">
        <label>Select New Role</label>
        <select id="new-role">
          <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>Admin</option>
          <option value="teacher" ${currentRole === 'teacher' ? 'selected' : ''}>Teacher</option>
          <option value="staff" ${currentRole === 'staff' ? 'selected' : ''}>Staff</option>
        </select>
      </div>
      <div class="end-actions">
        <button class="btn btn-secondary" onclick="EduFlow.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="TeamModule.confirmChangeRole('${userId}')">Update Role</button>
      </div>
    `);
  }

  async function confirmChangeRole(userId) {
    const newRole = document.getElementById('new-role').value;
    if (!newRole) return;

    const { error } = await EduFlow.supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
      .eq('organization_id', EduFlow.orgId);

    if (error) {
      EduFlow.toast('Failed to update role: ' + error.message, 'error');
      return;
    }

    await EduFlow.auditLog('team_role_changed', { target_user_id: userId, new_role: newRole });
    EduFlow.toast('Role updated successfully', 'success');
    EduFlow.closeModal();
    await loadTeam();
  }

  async function removeMember(userId, name) {
    if (!confirm(`Remove ${name} from your organization? This cannot be undone.`)) return;

    const { error } = await EduFlow.supabase
      .from('profiles')
      .delete()
      .eq('id', userId)
      .eq('organization_id', EduFlow.orgId);

    if (error) {
      EduFlow.toast('Failed to remove member: ' + error.message, 'error');
      return;
    }

    await EduFlow.auditLog('team_member_removed', { target_user_id: userId });
    EduFlow.toast('Member removed', 'success');
    await loadTeam();
  }

  async function cancelInvite(inviteId) {
    if (!confirm('Cancel this invitation?')) return;

    const { error } = await EduFlow.supabase
      .from('organization_invitations')
      .delete()
      .eq('id', inviteId)
      .eq('organization_id', EduFlow.orgId);

    if (error) {
      EduFlow.toast('Failed to cancel invitation: ' + error.message, 'error');
      return;
    }

    EduFlow.toast('Invitation cancelled', 'success');
    await loadTeam();
  }

  return {
    loadTeam,
    showInviteModal,
    changeRole,
    confirmChangeRole,
    removeMember,
    cancelInvite,
  };
})();
