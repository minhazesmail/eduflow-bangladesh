/**
 * Site-wide language bridge for landing, auth and guardian surfaces.
 * Reuses EduFlowI18n/localStorage so every page shares one language preference.
 */
(function () {
  'use strict';

  const i18n = window.EduFlowI18n;
  if (!i18n) return;

  const landing = {
    en: {
      navFeatures: 'Features', navWorkflow: 'How it works', navRoles: 'For your team', navContact: 'Contact',
      signIn: 'Sign in', register: 'Register your Center', eyebrow: 'Built for Bangladesh',
      heroTitle: 'Run your coaching center like a modern business.',
      heroText: 'EduFlow replaces the spreadsheet-and-chat maze with one sharp operating system for students, batches, attendance, fees, exams and team workflows.',
      demo: 'Explore the live demo', workspace: 'Create your workspace', heroNote: 'No account needed. Explore sample data instantly. No signup, no commitment.',
      builtBd: 'BDT-ready', roleAccess: 'Role-based access', guardianFirst: 'Guardian-first workflows',
      previewWorkspace: 'Workspace', owner: 'OWNER', students: 'Students', attendance: 'Attendance', collected: 'Collected',
      thisMonth: '+24 this month', today: 'Today', august: 'August', attention: 'Students needing attention', feeAugust: 'Fees · August',
      followUp: 'Follow up', review: 'Review', contact: 'Contact', collectedLabel: 'Collected', due: 'due', paid: 'paid',
      oneWorkspace: 'One operating workspace', oneWorkspaceText: 'Admissions, batches, attendance, fees and results without the spreadsheet maze.',
      builtAround: 'Built around Bangladesh', builtAroundText: '৳ BDT, local phone formats and Bangladesh-first center workflows.',
      demoBefore: 'Demo before signup', demoBeforeText: 'Explore the full product before creating your workspace.',
      operatingLayer: 'The operating layer', lessAdmin: 'Less admin. More control.', lessAdminText: 'Everything your center runs every day, connected in one consistent system.',
      student360: 'Student 360', student360Text: 'Keep student, guardian, batch, attendance, result and fee context together.',
      attendanceTitle: 'Attendance', attendanceText: 'Mark a class quickly and spot repeated absence before it becomes a bigger issue.',
      feesTitle: 'Fees & payments', feesText: 'Track collections, due balances, payment references and monthly follow-ups.',
      examsTitle: 'Exams & results', examsText: 'Create assessments, enter marks and surface students who need attention.',
      teamTitle: 'Team roles', teamText: 'Owners, admins, teachers and staff see the pages and actions meant for them.',
      guardianReady: 'Guardian-ready', guardianText: 'Keep the right student context available when your team needs to communicate.',
      rhythm: 'A calmer daily rhythm', workflowTitle: 'From classroom to office without the handoff mess.', workflowText: 'One system for the operational loop that keeps a coaching center moving.',
      setup: 'Set up', setupText: 'Create your center, batches and team roles once. The structure becomes your daily workspace.',
      runDay: 'Run the day', runDayText: 'Take attendance, manage student records, record payments and keep exams moving.',
      closeLoop: 'Close the loop', closeLoopText: 'See who is due, who is absent and who needs academic follow-up before the week slips away.',
      wholeCenter: 'Built for the whole center', rolesTitle: 'Everyone sees the work they need.', rolesText: 'Clear role boundaries keep daily operations fast without making the workspace complicated.',
      ownerTitle: 'Full control', ownerText: 'Workspace settings, team management, finance and academics.',
      adminTitle: 'Run the center', adminText: 'Students, batches, attendance, fees, exams and daily operations.',
      teacherTitle: 'Focus on teaching', teacherText: 'Attendance, exams, results and the student context needed in class.',
      staffTitle: 'Keep things moving', staffText: 'Student records, attendance, fees and office workflows.',
      seeBefore: 'See it before you build it', ctaTitle: 'Explore EduFlow with a real-looking Bangladesh demo.', ctaText: 'Open the full dashboard instantly with sample students, batches, attendance and fees. No account required.',
      exploreDemo: 'Explore the demo →', createWorkspace: 'Create your workspace', footer: '© 2026 EduFlow. Built for coaching centers in Bangladesh.', openDemo: 'Open demo →'
    },
    bn: {
      navFeatures: 'ফিচার', navWorkflow: 'কীভাবে কাজ করে', navRoles: 'আপনার টিমের জন্য', navContact: 'যোগাযোগ',
      signIn: 'সাইন ইন', register: 'সেন্টার নিবন্ধন', eyebrow: 'বাংলাদেশের জন্য তৈরি',
      heroTitle: 'আপনার কোচিং সেন্টারকে আধুনিক ব্যবসার মতো পরিচালনা করুন।',
      heroText: 'EduFlow স্প্রেডশিট ও চ্যাটের জটিলতার বদলে শিক্ষার্থী, ব্যাচ, উপস্থিতি, ফি, পরীক্ষা ও টিমের কাজের জন্য একটি স্মার্ট অপারেটিং সিস্টেম দেয়।',
      demo: 'লাইভ ডেমো দেখুন', workspace: 'আপনার ওয়ার্কস্পেস তৈরি করুন', heroNote: 'অ্যাকাউন্ট লাগবে না। সঙ্গে সঙ্গে নমুনা ডেটা দেখুন। সাইনআপ বা কোনো বাধ্যবাধকতা নেই।',
      builtBd: 'BDT প্রস্তুত', roleAccess: 'রোলভিত্তিক অ্যাক্সেস', guardianFirst: 'অভিভাবক-কেন্দ্রিক ওয়ার্কফ্লো',
      previewWorkspace: 'ওয়ার্কস্পেস', owner: 'মালিক', students: 'শিক্ষার্থী', attendance: 'উপস্থিতি', collected: 'সংগ্রহ',
      thisMonth: 'এই মাসে +২৪', today: 'আজ', august: 'আগস্ট', attention: 'যেসব শিক্ষার্থীর নজর দেওয়া দরকার', feeAugust: 'ফি · আগস্ট',
      followUp: 'ফলো আপ', review: 'পর্যালোচনা', contact: 'যোগাযোগ', collectedLabel: 'সংগ্রহ', due: 'বাকি', paid: 'পরিশোধিত',
      oneWorkspace: 'একটি অপারেটিং ওয়ার্কস্পেস', oneWorkspaceText: 'অ্যাডমিশন, ব্যাচ, উপস্থিতি, ফি ও ফলাফল—স্প্রেডশিটের ঝামেলা ছাড়াই।',
      builtAround: 'বাংলাদেশকে কেন্দ্র করে তৈরি', builtAroundText: '৳ BDT, স্থানীয় ফোন ফরম্যাট ও বাংলাদেশ-কেন্দ্রিক কোচিং সেন্টার ওয়ার্কফ্লো।',
      demoBefore: 'সাইনআপের আগে ডেমো', demoBeforeText: 'ওয়ার্কস্পেস তৈরির আগে পুরো প্রোডাক্ট দেখে নিন।',
      operatingLayer: 'অপারেটিং লেয়ার', lessAdmin: 'কম প্রশাসনিক কাজ। বেশি নিয়ন্ত্রণ।', lessAdminText: 'আপনার সেন্টারের প্রতিদিনের কাজগুলো একটি সমন্বিত সিস্টেমে।',
      student360: 'স্টুডেন্ট ৩৬০', student360Text: 'শিক্ষার্থী, অভিভাবক, ব্যাচ, উপস্থিতি, ফলাফল ও ফি—সব তথ্য একসাথে রাখুন।',
      attendanceTitle: 'উপস্থিতি', attendanceText: 'দ্রুত ক্লাসের উপস্থিতি নিন এবং বারবার অনুপস্থিতি শুরুতেই ধরুন।',
      feesTitle: 'ফি ও পেমেন্ট', feesText: 'সংগ্রহ, বকেয়া, পেমেন্ট রেফারেন্স ও মাসিক ফলো-আপ ট্র্যাক করুন।',
      examsTitle: 'পরীক্ষা ও ফলাফল', examsText: 'পরীক্ষা তৈরি করুন, নম্বর দিন এবং যাদের নজর দরকার তাদের চিহ্নিত করুন।',
      teamTitle: 'টিম রোল', teamText: 'মালিক, অ্যাডমিন, শিক্ষক ও স্টাফ তাদের প্রয়োজনীয় পেজ ও কাজই দেখবেন।',
      guardianReady: 'অভিভাবক প্রস্তুত', guardianText: 'যোগাযোগের সময় সঠিক শিক্ষার্থী তথ্য হাতের কাছে রাখুন।',
      rhythm: 'আরও শান্ত দৈনিক ছন্দ', workflowTitle: 'ক্লাসরুম থেকে অফিস—হ্যান্ডঅফের ঝামেলা ছাড়াই।', workflowText: 'কোচিং সেন্টার সচল রাখার পুরো অপারেশনাল লুপ একটি সিস্টেমে।',
      setup: 'সেটআপ', setupText: 'একবার সেন্টার, ব্যাচ ও টিম রোল তৈরি করুন। এরপর সেটিই হবে আপনার প্রতিদিনের ওয়ার্কস্পেস।',
      runDay: 'দিন চালান', runDayText: 'উপস্থিতি নিন, শিক্ষার্থী রেকর্ড দেখুন, পেমেন্ট রেকর্ড করুন ও পরীক্ষা পরিচালনা করুন।',
      closeLoop: 'লুপ সম্পূর্ণ করুন', closeLoopText: 'কার ফি বাকি, কে অনুপস্থিত এবং কার একাডেমিক ফলো-আপ দরকার—সময়মতো দেখুন।',
      wholeCenter: 'পুরো সেন্টারের জন্য', rolesTitle: 'প্রত্যেকে তার প্রয়োজনীয় কাজই দেখবে।', rolesText: 'পরিষ্কার রোল সীমা দৈনিক কাজকে দ্রুত রাখে, ওয়ার্কস্পেসকে জটিল করে না।',
      ownerTitle: 'পূর্ণ নিয়ন্ত্রণ', ownerText: 'ওয়ার্কস্পেস সেটিংস, টিম ম্যানেজমেন্ট, অর্থ ও একাডেমিক কার্যক্রম।',
      adminTitle: 'সেন্টার পরিচালনা', adminText: 'শিক্ষার্থী, ব্যাচ, উপস্থিতি, ফি, পরীক্ষা ও দৈনন্দিন অপারেশন।',
      teacherTitle: 'শিক্ষাদানে মনোযোগ', teacherText: 'উপস্থিতি, পরীক্ষা, ফলাফল ও ক্লাসে দরকারি শিক্ষার্থী তথ্য।',
      staffTitle: 'কাজ সচল রাখুন', staffText: 'শিক্ষার্থী রেকর্ড, উপস্থিতি, ফি ও অফিসের কাজ।',
      seeBefore: 'শুরু করার আগে দেখে নিন', ctaTitle: 'বাংলাদেশের বাস্তবসম্মত ডেমো দিয়ে EduFlow দেখুন।', ctaText: 'নমুনা শিক্ষার্থী, ব্যাচ, উপস্থিতি ও ফি-সহ পুরো ড্যাশবোর্ড সঙ্গে সঙ্গে খুলুন। অ্যাকাউন্ট লাগবে না।',
      exploreDemo: 'ডেমো দেখুন →', createWorkspace: 'ওয়ার্কস্পেস তৈরি করুন', footer: '© ২০২৬ EduFlow. বাংলাদেশের কোচিং সেন্টারের জন্য তৈরি।', openDemo: 'ডেমো খুলুন →'
    }
  };

  Object.entries(landing.en).forEach(([key, value]) => {
    i18n.dict.en[`landing.${key}`] = value;
    i18n.dict.bn[`landing.${key}`] = landing.bn[key] || value;
  });

  const $ = (selector) => document.querySelector(selector);
  const set = (selector, key) => { const el = $(selector); if (el) el.textContent = i18n.t(`landing.${key}`); };
  const setAll = (selector, key) => document.querySelectorAll(selector).forEach((el) => { el.textContent = i18n.t(`landing.${key}`); });

  function installLandingToggle() {
    const actions = $('.header-actions');
    if (!actions || $('#site-language-toggle')) return;
    const button = document.createElement('button');
    button.id = 'site-language-toggle';
    button.className = 'btn btn-ghost language-toggle';
    button.type = 'button';
    button.addEventListener('click', () => i18n.toggleLang());
    actions.prepend(button);
  }

  function translateLanding() {
    if (!document.querySelector('.site-shell')) return;
    installLandingToggle();
    set('.nav-links a:nth-child(1)', 'navFeatures');
    set('.nav-links a:nth-child(2)', 'navWorkflow');
    set('.nav-links a:nth-child(3)', 'navRoles');
    set('.nav-links a:nth-child(4)', 'navContact');
    set('.header-actions a.btn-ghost', 'signIn');
    set('.header-actions a.btn-primary', 'register');
    set('.hero .eyebrow', 'eyebrow'); set('.hero h1', 'heroTitle'); set('.hero-text', 'heroText');
    set('.hero-actions a.btn-primary', 'demo'); set('.hero-actions a.btn-ghost', 'workspace'); set('.hero-note', 'heroNote');
    const trust = document.querySelectorAll('.trust-row .trust-item'); ['builtBd','roleAccess','guardianFirst'].forEach((k,i)=>{ if(trust[i]) trust[i].textContent=i18n.t(`landing.${k}`); });
    set('.window-title', 'previewWorkspace'); set('.dash-heading span', 'previewWorkspace'); set('.role-pill','owner');
    setAll('.mini-stats > div:nth-child(1) span','students'); setAll('.mini-stats > div:nth-child(2) span','attendance'); setAll('.mini-stats > div:nth-child(3) span','collected');
    set('.mini-stats > div:nth-child(1) small','thisMonth'); set('.mini-stats > div:nth-child(2) small','today'); set('.mini-stats > div:nth-child(3) small','august');
    set('.panel-head strong','attention'); set('.mini-grid .panel:nth-child(2) .panel-head strong','feeAugust');
    setAll('.student-row:nth-child(1) em','followUp'); setAll('.student-row:nth-child(2) em','review'); setAll('.student-row:nth-child(3) em','contact');
    set('.proof-card:nth-child(1) strong','oneWorkspace'); set('.proof-card:nth-child(1) span','oneWorkspaceText');
    set('.proof-card:nth-child(2) strong','builtAround'); set('.proof-card:nth-child(2) span','builtAroundText');
    set('.proof-card:nth-child(3) strong','demoBefore'); set('.proof-card:nth-child(3) span','demoBeforeText');
    set('#features .eyebrow','operatingLayer'); set('#features h2','lessAdmin'); set('#features .section-heading p','lessAdminText');
    const features=[['student360','student360Text'],['attendanceTitle','attendanceText'],['feesTitle','feesText'],['examsTitle','examsText'],['teamTitle','teamText'],['guardianReady','guardianText']];
    document.querySelectorAll('.feature-card').forEach((card,i)=>{ if(features[i]) { set(card,''); const h3=card.querySelector('h3'), p=card.querySelector('p'); if(h3) h3.textContent=i18n.t(`landing.${features[i][0]}`); if(p) p.textContent=i18n.t(`landing.${features[i][1]}`); }});
    set('#workflow .eyebrow','rhythm'); set('#workflow h2','workflowTitle'); set('#workflow .section-heading p','workflowText');
    const steps=[['setup','setupText'],['runDay','runDayText'],['closeLoop','closeLoopText']]; document.querySelectorAll('#workflow .step').forEach((el,i)=>{ if(steps[i]){const h3=el.querySelector('h3'),p=el.querySelector('p');if(h3)h3.textContent=i18n.t(`landing.${steps[i][0]}`);if(p)p.textContent=i18n.t(`landing.${steps[i][1]}`);}});
    set('#roles .eyebrow','wholeCenter'); set('#roles h2','rolesTitle'); set('#roles .section-heading p','rolesText');
    const roles=[['ownerTitle','ownerText'],['adminTitle','adminText'],['teacherTitle','teacherText'],['staffTitle','staffText']]; document.querySelectorAll('.role-grid > div').forEach((el,i)=>{if(roles[i]){const h3=el.querySelector('h3'),p=el.querySelector('p');if(h3)h3.textContent=i18n.t(`landing.${roles[i][0]}`);if(p)p.textContent=i18n.t(`landing.${roles[i][1]}`);}});
    set('#contact .eyebrow','seeBefore'); set('#contact h2','ctaTitle'); set('#contact p','ctaText'); set('#contact .cta-actions a.btn-primary','exploreDemo'); set('#contact .cta-actions a.btn-ghost','createWorkspace'); set('.site-footer > span','footer'); set('.site-footer > a','openDemo');
    const toggle=$('#site-language-toggle'); if(toggle){toggle.textContent=i18n.getLang()==='bn'?'English':'বাংলা'; toggle.setAttribute('aria-label',i18n.getLang()==='bn'?'Switch to English':'বাংলায় পরিবর্তন করুন');}
  }

  function translateAuth() {
    const root = document.getElementById('auth-screen'); if (!root) return;
    const signup = !!root.querySelector('#auth-fullname');
    const toggleText = root.querySelector('#auth-toggle');
    const h1 = root.querySelector('h1');
    const sub = root.querySelector('.sub');
    if (h1) h1.textContent = i18n.t(signup ? 'auth.register' : 'auth.welcome');
    if (sub) sub.textContent = i18n.t(signup ? 'auth.sub.signup' : 'auth.sub.signin');
    const labels = root.querySelectorAll('label');
    labels.forEach(label => { const id=label.htmlFor; const map={ 'auth-fullname':'auth.name','auth-orgname':'auth.org','auth-email':'auth.email','auth-password':'auth.password' }; if(map[id])label.textContent=i18n.t(map[id]); });
    const button=root.querySelector('#auth-btn'); if(button)button.textContent=i18n.t(signup?'auth.create':'auth.signin');
    if(toggleText)toggleText.textContent=i18n.t(signup?'auth.toggle.signin':'auth.toggle.signup');
    const hint=root.querySelector('.subtitle:last-child'); if(hint)hint.textContent=i18n.t(signup?'auth.hint.signup':'auth.hint.signin');
    if (!root.querySelector('#auth-language-toggle')) { const b=document.createElement('button'); b.id='auth-language-toggle'; b.type='button'; b.className='btn btn-ghost language-toggle'; b.textContent=''; b.onclick=()=>i18n.toggleLang(); root.querySelector('.auth-card')?.prepend(b); }
    const b=root.querySelector('#auth-language-toggle'); if(b)b.textContent=i18n.getLang()==='bn'?'English':'বাংলা';
  }

  window.addEventListener('eduflow:langchange', () => { translateLanding(); translateAuth(); });
  window.EduFlowSiteLanguage = Object.freeze({ translateLanding, translateAuth });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { translateLanding(); translateAuth(); }); else { translateLanding(); translateAuth(); }
})();
