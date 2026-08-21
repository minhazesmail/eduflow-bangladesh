/**
 * EduFlowI18n — single language module for app, landing, auth, guardian.
 * en / bn, localStorage persistence, no external dependency.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'eduflow_lang';
  const DEFAULT_LANG = 'bn';

  const dict = {
    en: {
      'app.title': 'EduFlow Dashboard',
      'brand.subtitle': 'Bangladesh • Coaching OS',
      'nav.core': 'Core',
      'nav.academic': 'Academic',
      'nav.workspace': 'Workspace',
      'nav.dashboard': 'Dashboard',
      'nav.students': 'Students',
      'nav.batches': 'Batches',
      'nav.attendance': 'Attendance',
      'nav.payments': 'Fees & Payments',
      'nav.exams': 'Exams',
      'nav.results': 'Results',
      'nav.teachers': 'Teachers',
      'nav.notices': 'Notices',
      'nav.team': 'Team',
      'nav.billing': 'Billing',
      'nav.settings': 'Settings',
      'nav.audit': 'Audit Log',
      'nav.home': 'Home',
      'nav.fees': 'Fees',
      'action.refresh': 'Refresh',
      'action.signout': 'Sign out',
      'action.save': 'Save',
      'action.cancel': 'Cancel',
      'action.edit': 'Edit',
      'action.delete': 'Delete',
      'action.add': 'Add',
      'offline.banner': 'You are offline. Reading continues. Attendance changes can be saved locally and will sync automatically when you reconnect.',
      'loading': 'Loading…',
      'lang.toggle': 'বাংলা',
      'lang.label': 'Language',
      'auth.welcome': 'Welcome back',
      'auth.register': 'Register your Coaching Center',
      'auth.sub.signin': 'Run your coaching center from one place.',
      'auth.sub.signup': 'Create a workspace for your coaching center.',
      'auth.name': 'Your name',
      'auth.org': 'Coaching center',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.signin': 'Sign in',
      'auth.create': 'Create Account',
      'auth.toggle.signin': 'Back to sign in',
      'auth.toggle.signup': 'Register your center',
      'auth.hint.signup': 'Only center owners should register.',
      'auth.hint.signin': 'Teachers and staff should use an account provided by the center.',
      'auth.creating': 'Creating…',
      'auth.signing': 'Signing in…',
      'dash.students': 'Students',
      'dash.batches': 'Batches',
      'dash.teachers': 'Teachers',
      'dash.recent_payments': 'Recent payments',
      'dash.quick_actions': 'Quick actions',
      'dash.quick_sub': 'Use the operational tools directly.',
      'dash.add_student': 'Add Student',
      'dash.mark_attendance': 'Mark Attendance',
      'dash.record_payment': 'Record Payment',
      'dash.create_exam': 'Create Exam',
      'dash.no_payments': 'No payments recorded yet.',
      'list.name': 'Name',
      'list.phone': 'Phone',
      'list.guardian': 'Guardian',
      'list.batch': 'Batch',
      'list.monthly_fee': 'Monthly fee',
      'list.actions': 'Actions',
      'list.subject': 'Subject',
      'list.teacher': 'Teacher',
      'list.time': 'Time',
      'list.room': 'Room',
      'list.student': 'Student',
      'list.date': 'Date',
      'list.status': 'Status',
      'list.amount': 'Amount',
      'list.method': 'Method',
      'list.receipt': 'Receipt',
      'list.paid_at': 'Paid at',
      'list.exam': 'Exam',
      'list.marks': 'Marks',
      'list.percent': 'Percent',
      'list.rate': 'Rate/class',
      'list.member': 'Member',
      'list.role': 'Role',
      'list.joined': 'Joined',
      'list.present': 'Present',
      'list.absent': 'Absent',
      'empty.students': 'No students yet',
      'empty.batches': 'No batches yet',
      'empty.attendance': 'No attendance marked today',
      'empty.payments': 'No payments yet',
      'empty.exams': 'No exams yet',
      'empty.results': 'No results yet',
      'empty.teachers': 'No teachers yet',
      'empty.notices': 'No notices yet',
      'empty.team': 'No team members yet',
      'empty.audit': 'No audit entries yet',
      'page.students': 'Students',
      'page.students.sub': 'Student and guardian records.',
      'page.batches': 'Batches',
      'page.batches.sub': 'Organize classes and schedules.',
      'page.attendance': 'Attendance',
      'page.payments': 'Fees & Payments',
      'page.payments.sub': 'Recorded fee collections.',
      'page.exams': 'Exams',
      'page.exams.sub': 'Exam schedule and marks setup.',
      'page.results': 'Results',
      'page.results.sub': 'Student exam performance.',
      'page.teachers': 'Teachers',
      'page.teachers.sub': 'Teaching staff.',
      'page.notices': 'Notices',
      'page.notices.sub': 'Announcements for your center.',
      'page.team': 'Team',
      'page.team.sub': 'Members of your coaching center.',
      'page.billing': 'Billing',
      'page.billing.sub': 'Usage and plan status.',
      'page.settings': 'Settings',
      'page.settings.sub': 'Workspace and profile settings.',
      'page.audit': 'Audit Log',
      'page.audit.sub': 'Security and activity history.',
      'sms.send_fee_reminder': 'Send fee SMS',
      'sms.send_result': 'Send result SMS',
      'sms.sending': 'Sending SMS…',
      'sms.sent': 'SMS sent successfully',
      'sms.failed': 'SMS failed',
      'sms.no_phone': 'Guardian phone missing',
      'sms.confirm_fee': 'Send Bangla fee reminder SMS to guardian?',
      'sms.confirm_result': 'Send Bangla exam result SMS to guardian?',
      'guardian.title': 'Guardian Portal',
      'guardian.signout': 'Sign out',
      'guardian.signin_required': 'Sign in required',
      'guardian.invite_hint': 'Use the invitation link from your coaching center.',
      'guardian.not_ready': 'Portal not ready',
      'guardian.resend': 'Ask your coaching center to resend the guardian invitation.',
      'guardian.monthly_fee': 'Monthly fee',
      'guardian.last_result': 'Last result',
      'guardian.recent_payments': 'Recent payments',
      'guardian.notices': 'Notices',
      'guardian.no_notices': 'No notices.',
      'guardian.attendance': 'attendance',
      'guardian.students': 'Students',
      'guardian.language': 'Language',
      'guardian.load_error': 'Could not load portal',
      'guardian.try_again': 'Please try again.',
      'site.features': 'Features',
      'site.how': 'How it works',
      'site.roles': 'For your team',
      'site.contact': 'Contact',
      'site.signIn': 'Sign in',
      'site.register': 'Register your Center',
      'site.eyebrow': 'Built for Bangladesh',
      'site.heroTitle': 'Run your coaching center like a modern business.',
      'site.heroText': 'EduFlow replaces the spreadsheet-and-chat maze with one sharp operating system for students, batches, attendance, fees, exams and team workflows.',
      'site.demo': 'Explore the live demo',
      'site.workspace': 'Create your workspace',
      'site.note': 'No account needed. Explore sample data instantly. No signup, no commitment.',
      'site.bdt': 'BDT-ready',
      'site.access': 'Role-based access',
      'site.guardian': 'Guardian-first workflows',
      'site.operating': 'The operating layer',
      'site.less': 'Less admin. More control.',
      'site.operatingSub': 'Everything your center runs every day, connected in one consistent system.',
      'site.rhythm': 'A calmer daily rhythm',
      'site.workflowTitle': 'From classroom to office without the handoff mess.',
      'site.workflowSub': 'One system for the operational loop that keeps a coaching center moving.',
      'site.rolesEyebrow': 'Built for the whole center',
      'site.rolesTitle': 'Everyone sees the work they need.',
      'site.rolesSub': 'Clear role boundaries keep daily operations fast without making the workspace complicated.',
      'site.ctaEyebrow': 'See it before you build it',
      'site.ctaTitle': 'Explore EduFlow with a real-looking Bangladesh demo.',
      'site.ctaText': 'Open the full dashboard instantly with sample students, batches, attendance and fees. No account required.',
      'site.openDemo': 'Explore the demo →',
      'site.create': 'Create your workspace',
      'site.owner': 'Full control',
      'site.admin': 'Run the center',
      'site.teacher': 'Focus on teaching',
      'site.staff': 'Keep things moving',
      'site.setup': 'Set up',
      'site.run': 'Run the day',
      'site.close': 'Close the loop',
      'site.student360': 'Student 360',
      'site.attendance': 'Attendance',
      'site.fees': 'Fees & payments',
      'site.exams': 'Exams & results',
      'site.team': 'Team roles',
      'site.guardianReady': 'Guardian-ready'
    },
    bn: {
      'app.title': 'এডুফ্লো ড্যাশবোর্ড',
      'brand.subtitle': 'বাংলাদেশ • কোচিং ওএস',
      'nav.core': 'মূল',
      'nav.academic': 'একাডেমিক',
      'nav.workspace': 'ওয়ার্কস্পেস',
      'nav.dashboard': 'ড্যাশবোর্ড',
      'nav.students': 'শিক্ষার্থী',
      'nav.batches': 'ব্যাচ',
      'nav.attendance': 'উপস্থিতি',
      'nav.payments': 'ফি ও পেমেন্ট',
      'nav.exams': 'পরীক্ষা',
      'nav.results': 'ফলাফল',
      'nav.teachers': 'শিক্ষক',
      'nav.notices': 'নোটিশ',
      'nav.team': 'টিম',
      'nav.billing': 'বিলিং',
      'nav.settings': 'সেটিংস',
      'nav.audit': 'অডিট লগ',
      'nav.home': 'হোম',
      'nav.fees': 'ফি',
      'action.refresh': 'রিফ্রেশ',
      'action.signout': 'সাইন আউট',
      'action.save': 'সংরক্ষণ',
      'action.cancel': 'বাতিল',
      'action.edit': 'সম্পাদনা',
      'action.delete': 'মুছুন',
      'action.add': 'যোগ করুন',
      'offline.banner': 'আপনি অফলাইনে আছেন। পড়া চলতে পারে। উপস্থিতি স্থানীয়ভাবে সংরক্ষিত হবে এবং সংযোগ ফিরলে সিঙ্ক হবে।',
      'loading': 'লোড হচ্ছে…',
      'lang.toggle': 'English',
      'lang.label': 'ভাষা',
      'auth.welcome': 'ফিরে আসার জন্য স্বাগতম',
      'auth.register': 'আপনার কোচিং সেন্টার নিবন্ধন করুন',
      'auth.sub.signin': 'এক জায়গা থেকে আপনার কোচিং সেন্টার চালান।',
      'auth.sub.signup': 'আপনার কোচিং সেন্টারের জন্য ওয়ার্কস্পেস তৈরি করুন।',
      'auth.name': 'আপনার নাম',
      'auth.org': 'কোচিং সেন্টার',
      'auth.email': 'ইমেইল',
      'auth.password': 'পাসওয়ার্ড',
      'auth.signin': 'সাইন ইন',
      'auth.create': 'অ্যাকাউন্ট তৈরি',
      'auth.toggle.signin': 'সাইন ইনে ফিরুন',
      'auth.toggle.signup': 'সেন্টার নিবন্ধন করুন',
      'auth.hint.signup': 'শুধুমাত্র সেন্টার মালিকরা নিবন্ধন করবেন।',
      'auth.hint.signin': 'শিক্ষক ও স্টাফ সেন্টার প্রদত্ত অ্যাকাউন্ট ব্যবহার করবেন।',
      'auth.creating': 'তৈরি হচ্ছে…',
      'auth.signing': 'সাইন ইন হচ্ছে…',
      'dash.students': 'শিক্ষার্থী',
      'dash.batches': 'ব্যাচ',
      'dash.teachers': 'শিক্ষক',
      'dash.recent_payments': 'সাম্প্রতিক পেমেন্ট',
      'dash.quick_actions': 'দ্রুত কাজ',
      'dash.quick_sub': 'সরাসরি অপারেশনাল টুল ব্যবহার করুন।',
      'dash.add_student': 'শিক্ষার্থী যোগ',
      'dash.mark_attendance': 'উপস্থিতি নিন',
      'dash.record_payment': 'পেমেন্ট রেকর্ড',
      'dash.create_exam': 'পরীক্ষা তৈরি',
      'dash.no_payments': 'এখনো কোনো পেমেন্ট নেই।',
      'list.name': 'নাম',
      'list.phone': 'ফোন',
      'list.guardian': 'অভিভাবক',
      'list.batch': 'ব্যাচ',
      'list.monthly_fee': 'মাসিক ফি',
      'list.actions': 'কার্যক্রম',
      'list.subject': 'বিষয়',
      'list.teacher': 'শিক্ষক',
      'list.time': 'সময়',
      'list.room': 'রুম',
      'list.student': 'শিক্ষার্থী',
      'list.date': 'তারিখ',
      'list.status': 'অবস্থা',
      'list.amount': 'পরিমাণ',
      'list.method': 'পদ্ধতি',
      'list.receipt': 'রসিদ',
      'list.paid_at': 'পরিশোধের তারিখ',
      'list.exam': 'পরীক্ষা',
      'list.marks': 'নম্বর',
      'list.percent': 'শতাংশ',
      'list.rate': 'ক্লাসপ্রতি হার',
      'list.member': 'সদস্য',
      'list.role': 'ভূমিকা',
      'list.joined': 'যোগদান',
      'list.present': 'উপস্থিত',
      'list.absent': 'অনুপস্থিত',
      'empty.students': 'এখনো কোনো শিক্ষার্থী নেই',
      'empty.batches': 'এখনো কোনো ব্যাচ নেই',
      'empty.attendance': 'আজ কোনো উপস্থিতি নেওয়া হয়নি',
      'empty.payments': 'এখনো কোনো পেমেন্ট নেই',
      'empty.exams': 'এখনো কোনো পরীক্ষা নেই',
      'empty.results': 'এখনো কোনো ফলাফল নেই',
      'empty.teachers': 'এখনো কোনো শিক্ষক নেই',
      'empty.notices': 'এখনো কোনো নোটিশ নেই',
      'empty.team': 'এখনো কোনো টিম সদস্য নেই',
      'empty.audit': 'এখনো কোনো অডিট এন্ট্রি নেই',
      'page.students': 'শিক্ষার্থী',
      'page.students.sub': 'শিক্ষার্থী ও অভিভাবকের রেকর্ড।',
      'page.batches': 'ব্যাচ',
      'page.batches.sub': 'ক্লাস ও সময়সূচি সংগঠিত করুন।',
      'page.attendance': 'উপস্থিতি',
      'page.payments': 'ফি ও পেমেন্ট',
      'page.payments.sub': 'রেকর্ডকৃত ফি সংগ্রহ।',
      'page.exams': 'পরীক্ষা',
      'page.exams.sub': 'পরীক্ষার সময়সূচি ও নম্বর সেটআপ।',
      'page.results': 'ফলাফল',
      'page.results.sub': 'শিক্ষার্থীর পরীক্ষার পারফরম্যান্স।',
      'page.teachers': 'শিক্ষক',
      'page.teachers.sub': 'শিক্ষক কর্মীবৃন্দ।',
      'page.notices': 'নোটিশ',
      'page.notices.sub': 'আপনার সেন্টারের ঘোষণা।',
      'page.team': 'টিম',
      'page.team.sub': 'আপনার কোচিং সেন্টারের সদস্যরা।',
      'page.billing': 'বিলিং',
      'page.billing.sub': 'ব্যবহার ও প্ল্যান স্ট্যাটাস।',
      'page.settings': 'সেটিংস',
      'page.settings.sub': 'ওয়ার্কস্পেস ও প্রোফাইল সেটিংস।',
      'page.audit': 'অডিট লগ',
      'page.audit.sub': 'নিরাপত্তা ও কার্যকলাপের ইতিহাস।',
      'sms.send_fee_reminder': 'ফি এসএমএস পাঠান',
      'sms.send_result': 'ফলাফল এসএমএস',
      'sms.sending': 'এসএমএস পাঠানো হচ্ছে…',
      'sms.sent': 'এসএমএস সফলভাবে পাঠানো হয়েছে',
      'sms.failed': 'এসএমএস ব্যর্থ',
      'sms.no_phone': 'অভিভাবকের ফোন নেই',
      'sms.confirm_fee': 'অভিভাবককে বাংলায় ফি রিমাইন্ডার এসএমএস পাঠাবেন?',
      'sms.confirm_result': 'অভিভাবককে বাংলায় পরীক্ষার ফলাফল এসএমএস পাঠাবেন?',
      'guardian.title': 'অভিভাবক পোর্টাল',
      'guardian.signout': 'সাইন আউট',
      'guardian.signin_required': 'সাইন ইন প্রয়োজন',
      'guardian.invite_hint': 'আপনার কোচিং সেন্টারের আমন্ত্রণ লিঙ্ক ব্যবহার করুন।',
      'guardian.not_ready': 'পোর্টাল প্রস্তুত নয়',
      'guardian.resend': 'আপনার কোচিং সেন্টারকে অভিভাবক আমন্ত্রণ আবার পাঠাতে বলুন।',
      'guardian.monthly_fee': 'মাসিক ফি',
      'guardian.last_result': 'শেষ ফলাফল',
      'guardian.recent_payments': 'সাম্প্রতিক পেমেন্ট',
      'guardian.notices': 'নোটিশ',
      'guardian.no_notices': 'কোনো নোটিশ নেই।',
      'guardian.attendance': 'উপস্থিতি',
      'guardian.students': 'শিক্ষার্থী',
      'guardian.language': 'ভাষা',
      'guardian.load_error': 'পোর্টাল লোড করা যায়নি',
      'guardian.try_again': 'আবার চেষ্টা করুন।',
      'site.features': 'ফিচার',
      'site.how': 'কীভাবে কাজ করে',
      'site.roles': 'আপনার টিমের জন্য',
      'site.contact': 'যোগাযোগ',
      'site.signIn': 'সাইন ইন',
      'site.register': 'সেন্টার নিবন্ধন',
      'site.eyebrow': 'বাংলাদেশের জন্য তৈরি',
      'site.heroTitle': 'আপনার কোচিং সেন্টারকে আধুনিক ব্যবসার মতো পরিচালনা করুন।',
      'site.heroText': 'EduFlow স্প্রেডশিট ও চ্যাটের জটিলতার বদলে শিক্ষার্থী, ব্যাচ, উপস্থিতি, ফি, পরীক্ষা ও টিমের কাজের জন্য একটি স্মার্ট অপারেটিং সিস্টেম দেয়।',
      'site.demo': 'লাইভ ডেমো দেখুন',
      'site.workspace': 'আপনার ওয়ার্কস্পেস তৈরি করুন',
      'site.note': 'অ্যাকাউন্ট লাগবে না। সঙ্গে সঙ্গে নমুনা ডেটা দেখুন। সাইনআপ বা কোনো বাধ্যবাধকতা নেই।',
      'site.bdt': 'BDT প্রস্তুত',
      'site.access': 'রোলভিত্তিক অ্যাক্সেস',
      'site.guardian': 'অভিভাবক-কেন্দ্রিক ওয়ার্কফ্লো',
      'site.operating': 'অপারেটিং লেয়ার',
      'site.less': 'কম প্রশাসনিক কাজ। বেশি নিয়ন্ত্রণ।',
      'site.operatingSub': 'আপনার সেন্টারের প্রতিদিনের কাজগুলো একটি সমন্বিত সিস্টেমে।',
      'site.rhythm': 'আরও শান্ত দৈনিক ছন্দ',
      'site.workflowTitle': 'ক্লাসরুম থেকে অফিস—হ্যান্ডঅফের ঝামেলা ছাড়াই।',
      'site.workflowSub': 'কোচিং সেন্টার সচল রাখার পুরো অপারেশনাল লুপ একটি সিস্টেমে।',
      'site.rolesEyebrow': 'পুরো সেন্টারের জন্য',
      'site.rolesTitle': 'প্রত্যেকে তার প্রয়োজনীয় কাজই দেখবে।',
      'site.rolesSub': 'পরিষ্কার রোল সীমা দৈনিক কাজকে দ্রুত রাখে, ওয়ার্কস্পেসকে জটিল করে না।',
      'site.ctaEyebrow': 'শুরু করার আগে দেখে নিন',
      'site.ctaTitle': 'বাংলাদেশের বাস্তবসম্মত ডেমো দিয়ে EduFlow দেখুন।',
      'site.ctaText': 'নমুনা শিক্ষার্থী, ব্যাচ, উপস্থিতি ও ফি-সহ পুরো ড্যাশবোর্ড সঙ্গে সঙ্গে খুলুন। অ্যাকাউন্ট লাগবে না।',
      'site.openDemo': 'ডেমো দেখুন →',
      'site.create': 'ওয়ার্কস্পেস তৈরি করুন',
      'site.owner': 'পূর্ণ নিয়ন্ত্রণ',
      'site.admin': 'সেন্টার পরিচালনা',
      'site.teacher': 'শিক্ষাদানে মনোযোগ',
      'site.staff': 'কাজ সচল রাখুন',
      'site.setup': 'সেটআপ',
      'site.run': 'দিন চালান',
      'site.close': 'লুপ সম্পূর্ণ করুন',
      'site.student360': 'স্টুডেন্ট ৩৬০',
      'site.attendance': 'উপস্থিতি',
      'site.fees': 'ফি ও পেমেন্ট',
      'site.exams': 'পরীক্ষা ও ফলাফল',
      'site.team': 'টিম রোল',
      'site.guardianReady': 'অভিভাবক প্রস্তুত'
    }
  };

  const smsTemplates = {
    fee_reminder: (p) =>
      `প্রিয় অভিভাবক, ${p.studentName} এর ${p.month || 'এই মাসের'} ফি ৳${p.amount} বাকি আছে। অনুগ্রহ করে দ্রুত পরিশোধ করুন। — ${p.orgName}`,
    exam_result: (p) =>
      `প্রিয় অভিভাবক, ${p.studentName} এর ${p.examName} পরীক্ষায় নম্বর: ${p.marks}/${p.totalMarks} (${p.percent}%)। — ${p.orgName}`
  };

  let current = (() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'bn') return stored;
    } catch (_) {}
    return DEFAULT_LANG;
  })();

  function t(key, params) {
    let str = (dict[current] && dict[current][key]) || (dict.en && dict.en[key]) || key;
    if (params && typeof params === 'object') {
      Object.keys(params).forEach((k) => {
        str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), String(params[k]));
      });
    }
    return str;
  }

  function getLang() {
    return current;
  }

  function setLang(lang) {
    if (lang !== 'en' && lang !== 'bn') return;
    current = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (_) {}
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
    window.dispatchEvent(new CustomEvent('eduflow:langchange', { detail: { lang } }));
  }

  function toggleLang() {
    setLang(current === 'bn' ? 'en' : 'bn');
  }

  function applyStatic() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key));
    });
    const titleEl = document.querySelector('title');
    if (titleEl && titleEl.hasAttribute('data-i18n')) {
      titleEl.textContent = t(titleEl.getAttribute('data-i18n'));
    }
  }

  function setText(sel, key) {
    const el = document.querySelector(sel);
    if (el) el.textContent = t(key);
  }

  function ensureLangButton(root, selector) {
    if (!root || root.querySelector('.eduflow-lang-btn')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-ghost eduflow-lang-btn language-toggle';
    b.addEventListener('click', () => toggleLang());
    const host = selector ? root.querySelector(selector) : root;
    if (host) host.prepend(b);
    else root.prepend(b);
  }

  function applyLanding() {
    if (!document.querySelector('.site-shell')) return;
    ensureLangButton(document.querySelector('.header-actions'));
    const map = [
      ['.nav-links a:nth-child(1)', 'site.features'],
      ['.nav-links a:nth-child(2)', 'site.how'],
      ['.nav-links a:nth-child(3)', 'site.roles'],
      ['.nav-links a:nth-child(4)', 'site.contact'],
      ['.header-actions a.btn-ghost', 'site.signIn'],
      ['.header-actions a.btn-primary', 'site.register'],
      ['.hero .eyebrow', 'site.eyebrow'],
      ['.hero h1', 'site.heroTitle'],
      ['.hero-text', 'site.heroText'],
      ['.hero-actions a.btn-primary', 'site.demo'],
      ['.hero-actions a.btn-ghost', 'site.workspace'],
      ['.hero-note', 'site.note'],
      ['#features .eyebrow', 'site.operating'],
      ['#features h2', 'site.less'],
      ['#features .section-heading p', 'site.operatingSub'],
      ['#workflow .eyebrow', 'site.rhythm'],
      ['#workflow h2', 'site.workflowTitle'],
      ['#workflow .section-heading p', 'site.workflowSub'],
      ['#roles .eyebrow', 'site.rolesEyebrow'],
      ['#roles h2', 'site.rolesTitle'],
      ['#roles .section-heading p', 'site.rolesSub'],
      ['#contact .eyebrow', 'site.ctaEyebrow'],
      ['#contact h2', 'site.ctaTitle'],
      ['#contact p', 'site.ctaText'],
      ['#contact .cta-actions a.btn-primary', 'site.openDemo'],
      ['#contact .cta-actions a.btn-ghost', 'site.create'],
      ['.site-footer > a', 'site.openDemo']
    ];
    map.forEach(([sel, key]) => setText(sel, key));
    const trust = ['site.bdt', 'site.access', 'site.guardian'];
    document.querySelectorAll('.trust-row .trust-item').forEach((el, i) => {
      if (trust[i]) el.textContent = t(trust[i]);
    });
    const feats = ['site.student360', 'site.attendance', 'site.fees', 'site.exams', 'site.team', 'site.guardianReady'];
    document.querySelectorAll('.feature-card h3').forEach((el, i) => {
      if (feats[i]) el.textContent = t(feats[i]);
    });
    const steps = ['site.setup', 'site.run', 'site.close'];
    document.querySelectorAll('.step h3').forEach((el, i) => {
      if (steps[i]) el.textContent = t(steps[i]);
    });
    const roles = ['site.owner', 'site.admin', 'site.teacher', 'site.staff'];
    document.querySelectorAll('.role-grid h3').forEach((el, i) => {
      if (roles[i]) el.textContent = t(roles[i]);
    });
    const btn = document.querySelector('.eduflow-lang-btn');
    if (btn) btn.textContent = current === 'bn' ? 'English' : 'বাংলা';
  }

  function applyAuth() {
    const root = document.getElementById('auth-screen');
    if (!root || root.classList.contains('hidden')) return;
    ensureLangButton(root, '.auth-card');
    const signup = !!root.querySelector('#auth-fullname');
    setText('#auth-screen h1', signup ? 'auth.register' : 'auth.welcome');
    setText('#auth-screen .sub', signup ? 'auth.sub.signup' : 'auth.sub.signin');
    const ids = {
      'auth-fullname': 'auth.name',
      'auth-orgname': 'auth.org',
      'auth-email': 'auth.email',
      'auth-password': 'auth.password'
    };
    root.querySelectorAll('label').forEach((el) => {
      const key = ids[el.htmlFor];
      if (key) el.textContent = t(key);
    });
    const btn = root.querySelector('#auth-btn');
    if (btn) btn.textContent = t(signup ? 'auth.create' : 'auth.signin');
    const toggle = root.querySelector('#auth-toggle');
    if (toggle) toggle.textContent = t(signup ? 'auth.toggle.signin' : 'auth.toggle.signup');
    const hint = root.querySelector('.subtitle:last-child');
    if (hint) hint.textContent = t(signup ? 'auth.hint.signup' : 'auth.hint.signin');
    const langBtn = root.querySelector('.eduflow-lang-btn');
    if (langBtn) langBtn.textContent = current === 'bn' ? 'English' : 'বাংলা';
  }

  function applyAll() {
    applyStatic();
    applyLanding();
    applyAuth();
    document.documentElement.lang = current === 'bn' ? 'bn' : 'en';
  }

  function smsBody(templateKey, params) {
    const fn = smsTemplates[templateKey];
    return fn ? fn(params || {}) : '';
  }

  document.documentElement.lang = current === 'bn' ? 'bn' : 'en';

  window.addEventListener('eduflow:langchange', () => applyAll());

  const authRoot = document.getElementById('auth-screen');
  if (authRoot) {
    new MutationObserver(() => applyAuth()).observe(authRoot, { childList: true, subtree: true });
  }

  window.EduFlowI18n = {
    t,
    getLang,
    setLang,
    toggleLang,
    applyStatic,
    applyLanding,
    applyAuth,
    applyAll,
    smsBody,
    dict
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAll, { once: true });
  } else {
    applyAll();
  }
})();
