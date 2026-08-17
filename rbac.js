(() => {
  const permissions = {
    owner:  { students:true, batches:true, attendance:true, fees:true, exams:true, teachers:true, notices:true, settings:true },
    admin:  { students:true, batches:true, attendance:true, fees:true, exams:true, teachers:true, notices:true, settings:true },
    teacher:{ students:false, batches:false, attendance:true, fees:false, exams:true, teachers:false, notices:false, settings:false },
    staff:  { students:false, batches:false, attendance:true, fees:true, exams:false, teachers:false, notices:false, settings:false }
  };

  const can = section => !!permissions[window.profile?.role || 'owner']?.[section];

  function guarded(name, section) {
    const original = window[name];
    if (typeof original !== 'function') return;
    window[name] = function (...args) {
      if (!can(section)) {
        window.toast?.('You do not have permission for this action.');
        return;
      }
      return original.apply(this, args);
    };
  }

  ['openStudent','saveStudent'].forEach(n => guarded(n,'students'));
  ['openBatch','saveBatch'].forEach(n => guarded(n,'batches'));
  ['saveAttendance'].forEach(n => guarded(n,'attendance'));
  ['openPayment','savePayment'].forEach(n => guarded(n,'fees'));
  ['openExam','saveExam','saveMarks','enterMarks'].forEach(n => guarded(n,'exams'));
  ['openTeacher','saveTeacher'].forEach(n => guarded(n,'teachers'));
  ['openNotice','saveNotice'].forEach(n => guarded(n,'notices'));
  ['saveSettings'].forEach(n => guarded(n,'settings'));

  const labels = {
    students: ['Students'],
    batches: ['Batches'],
    attendance: ['Attendance'],
    fees: ['Fees & Payments'],
    exams: ['Exams & Results'],
    teachers: ['Teachers'],
    notices: ['Notices'],
    settings: ['Settings']
  };

  function hideUnauthorized() {
    const navButtons = [...document.querySelectorAll('.nav button, .mobile-nav button')];
    navButtons.forEach(btn => {
      const text = btn.textContent.trim();
      for (const [section, names] of Object.entries(labels)) {
        if (names.some(name => text.includes(name))) {
          btn.style.display = can(section) || (section === 'students' && ['teacher','staff'].includes(window.profile?.role)) ? '' : 'none';
        }
      }
    });

    const sectionButtons = {
      students: ['Add student'],
      batches: ['New batch'],
      attendance: ['Save attendance'],
      fees: ['Record payment'],
      exams: ['Create exam'],
      teachers: ['Add teacher'],
      notices: ['New notice'],
      settings: ['Save changes']
    };
    document.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent.trim();
      for (const [section, names] of Object.entries(sectionButtons)) {
        if (names.some(name => text.includes(name)) && !can(section)) btn.style.display = 'none';
      }
    });
  }

  const observer = new MutationObserver(hideUnauthorized);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', hideUnauthorized);
})();
