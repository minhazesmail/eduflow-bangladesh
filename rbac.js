/**
 * EduFlow RBAC (Role-Based Access Control)
 * 
 * Permissions matrix:
 *   owner:    all + team + billing
 *   admin:    all except team/billing
 *   teacher:  read students/batches/teachers/notices, read attendance/exams, manage results
 *   staff:    read students/batches/teachers/notices, manage attendance/payments, read results
 */

const RBAC = (function() {
  'use strict';

  const ROLES = ['owner', 'admin', 'teacher', 'staff'];

  const PERMISSIONS = {
    // Page access
    page: {
      dashboard:   ['owner', 'admin', 'teacher', 'staff'],
      students:    ['owner', 'admin', 'teacher', 'staff'],
      batches:     ['owner', 'admin', 'teacher', 'staff'],
      attendance:  ['owner', 'admin', 'teacher', 'staff'],
      payments:    ['owner', 'admin', 'staff'],
      exams:       ['owner', 'admin', 'teacher'],
      results:     ['owner', 'admin', 'teacher', 'staff'],
      teachers:    ['owner', 'admin', 'teacher', 'staff'],
      notices:     ['owner', 'admin', 'teacher', 'staff'],
      team:        ['owner'],
      billing:     ['owner'],
      settings:    ['owner', 'admin'],
      audit:       ['owner', 'admin'],
    },
    // CRUD actions per resource
    students: {
      create: ['owner', 'admin'],
      read:   ['owner', 'admin', 'teacher', 'staff'],
      update: ['owner', 'admin'],
      delete: ['owner', 'admin'],
    },
    batches: {
      create: ['owner', 'admin'],
      read:   ['owner', 'admin', 'teacher', 'staff'],
      update: ['owner', 'admin'],
      delete: ['owner', 'admin'],
    },
    attendance: {
      create: ['owner', 'admin', 'staff'],
      read:   ['owner', 'admin', 'teacher', 'staff'],
      update: ['owner', 'admin', 'staff'],
      delete: ['owner', 'admin'],
    },
    payments: {
      create: ['owner', 'admin', 'staff'],
      read:   ['owner', 'admin', 'staff'],
      update: ['owner', 'admin'],
      delete: ['owner', 'admin'],
    },
    exams: {
      create: ['owner', 'admin'],
      read:   ['owner', 'admin', 'teacher'],
      update: ['owner', 'admin'],
      delete: ['owner', 'admin'],
    },
    results: {
      create: ['owner', 'admin', 'teacher'],
      read:   ['owner', 'admin', 'teacher', 'staff'],
      update: ['owner', 'admin', 'teacher'],
      delete: ['owner', 'admin'],
    },
    teachers: {
      create: ['owner', 'admin'],
      read:   ['owner', 'admin', 'teacher', 'staff'],
      update: ['owner', 'admin'],
      delete: ['owner', 'admin'],
    },
    notices: {
      create: ['owner', 'admin'],
      read:   ['owner', 'admin', 'teacher', 'staff'],
      update: ['owner', 'admin'],
      delete: ['owner', 'admin'],
    },
    team: {
      invite:   ['owner'],
      remove:   ['owner'],
      updateRole: ['owner'],
    },
    billing: {
      manage: ['owner'],
      view:   ['owner'],
    },
    settings: {
      update: ['owner', 'admin'],
    },
  };

  let currentRole = null;

  function setRole(role) {
    if (!ROLES.includes(role)) {
      console.warn('[RBAC] Invalid role:', role);
      currentRole = null;
      return false;
    }
    currentRole = role;
    return true;
  }

  function getRole() {
    return currentRole;
  }

  function canAccessPage(page) {
    if (!currentRole) return false;
    const allowed = PERMISSIONS.page[page];
    return allowed ? allowed.includes(currentRole) : false;
  }

  function can(action, resource) {
    if (!currentRole) return false;
    const res = PERMISSIONS[resource];
    if (!res) return false;
    const allowed = res[action];
    return allowed ? allowed.includes(currentRole) : false;
  }

  function canAny(actions, resource) {
    return actions.some(a => can(a, resource));
  }

  function isOwner() { return currentRole === 'owner'; }
  function isAdmin() { return currentRole === 'admin'; }
  function isTeacher() { return currentRole === 'teacher'; }
  function isStaff() { return currentRole === 'staff'; }

  // UI helpers
  function applyPage Guards() {
    if (!currentRole) return;

    // Hide nav items based on role
    document.querySelectorAll('[data-page]').forEach(el => {
      const page = el.dataset.page;
      if (!canAccessPage(page)) {
        el.classList.add('hidden');
      } else {
        el.classList.remove('hidden');
      }
    });

    // Hide action buttons
    document.querySelectorAll('[data-require]').forEach(el => {
      const req = el.dataset.require; // e.g. "create:students"
      const [action, resource] = req.split(':');
      if (!can(action, resource)) {
        el.classList.add('hidden');
      } else {
        el.classList.remove('hidden');
      }
    });
  }

  return {
    ROLES,
    setRole,
    getRole,
    canAccessPage,
    can,
    canAny,
    isOwner,
    isAdmin,
    isTeacher,
    isStaff,
    applyPageGuards: applyPage Guards,
  };
})();
