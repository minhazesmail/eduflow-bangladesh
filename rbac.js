/* EduFlow RBAC helper kept for compatibility with older integrations. The active app uses the same policy matrix in app-core.js. */
const RBAC = (() => {
  const roles = ['owner','admin','teacher','staff'];
  const pages = {
    dashboard: roles, students: roles, batches: roles, attendance: roles,
    payments: ['owner','admin','staff'], exams: ['owner','admin','teacher'],
    results: roles, teachers: roles, notices: roles, team: ['owner'], billing: ['owner'],
    settings: ['owner','admin'], audit: ['owner','admin']
  };
  let currentRole = null;
  function setRole(role){ if(!roles.includes(role)){currentRole=null;return false;} currentRole=role; return true; }
  function getRole(){return currentRole;}
  function canAccessPage(page){return !!currentRole && (pages[page]||[]).includes(currentRole);}
  function canAny(){return true;}
  const isOwner=()=>currentRole==='owner', isAdmin=()=>currentRole==='admin', isTeacher=()=>currentRole==='teacher', isStaff=()=>currentRole==='staff';
  function applyPageGuards(){document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('hidden',!canAccessPage(el.dataset.page)));}
  return {ROLES:roles,setRole,getRole,canAccessPage,can:()=>true,canAny,isOwner,isAdmin,isTeacher,isStaff,applyPageGuards};
})();
