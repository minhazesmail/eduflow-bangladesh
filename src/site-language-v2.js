(function(){
  'use strict';
  const i = window.EduFlowI18n;
  if (!i) return;
  const T = {
    en:{features:'Features',how:'How it works',roles:'For your team',contact:'Contact',signIn:'Sign in',register:'Register your Center',eyebrow:'Built for Bangladesh',heroTitle:'Run your coaching center like a modern business.',heroText:'EduFlow replaces the spreadsheet-and-chat maze with one sharp operating system for students, batches, attendance, fees, exams and team workflows.',demo:'Explore the live demo',workspace:'Create your workspace',note:'No account needed. Explore sample data instantly. No signup, no commitment.',bdt:'BDT-ready',access:'Role-based access',guardian:'Guardian-first workflows',operating:'The operating layer',less:'Less admin. More control.',operatingSub:'Everything your center runs every day, connected in one consistent system.',rhythm:'A calmer daily rhythm',workflowTitle:'From classroom to office without the handoff mess.',workflowSub:'One system for the operational loop that keeps a coaching center moving.',rolesEyebrow:'Built for the whole center',rolesTitle:'Everyone sees the work they need.',rolesSub:'Clear role boundaries keep daily operations fast without making the workspace complicated.',ctaEyebrow:'See it before you build it',ctaTitle:'Explore EduFlow with a real-looking Bangladesh demo.',ctaText:'Open the full dashboard instantly with sample students, batches, attendance and fees. No account required.',openDemo:'Explore the demo →',create:'Create your workspace',owner:'Full control',admin:'Run the center',teacher:'Focus on teaching',staff:'Keep things moving',setup:'Set up',run:'Run the day',close:'Close the loop',student360:'Student 360',attendance:'Attendance',fees:'Fees & payments',exams:'Exams & results',team:'Team roles',guardianReady:'Guardian-ready'},
    bn:{features:'ফিচার',how:'কীভাবে কাজ করে',roles:'আপনার টিমের জন্য',contact:'যোগাযোগ',signIn:'সাইন ইন',register:'সেন্টার নিবন্ধন',eyebrow:'বাংলাদেশের জন্য তৈরি',heroTitle:'আপনার কোচিং সেন্টারকে আধুনিক ব্যবসার মতো পরিচালনা করুন।',heroText:'EduFlow স্প্রেডশিট ও চ্যাটের জটিলতার বদলে শিক্ষার্থী, ব্যাচ, উপস্থিতি, ফি, পরীক্ষা ও টিমের কাজের জন্য একটি স্মার্ট অপারেটিং সিস্টেম দেয়।',demo:'লাইভ ডেমো দেখুন',workspace:'আপনার ওয়ার্কস্পেস তৈরি করুন',note:'অ্যাকাউন্ট লাগবে না। সঙ্গে সঙ্গে নমুনা ডেটা দেখুন। সাইনআপ বা কোনো বাধ্যবাধকতা নেই।',bdt:'BDT প্রস্তুত',access:'রোলভিত্তিক অ্যাক্সেস',guardian:'অভিভাবক-কেন্দ্রিক ওয়ার্কফ্লো',operating:'অপারেটিং লেয়ার',less:'কম প্রশাসনিক কাজ। বেশি নিয়ন্ত্রণ।',operatingSub:'আপনার সেন্টারের প্রতিদিনের কাজগুলো একটি সমন্বিত সিস্টেমে।',rhythm:'আরও শান্ত দৈনিক ছন্দ',workflowTitle:'ক্লাসরুম থেকে অফিস—হ্যান্ডঅফের ঝামেলা ছাড়াই।',workflowSub:'কোচিং সেন্টার সচল রাখার পুরো অপারেশনাল লুপ একটি সিস্টেমে।',rolesEyebrow:'পুরো সেন্টারের জন্য',rolesTitle:'প্রত্যেকে তার প্রয়োজনীয় কাজই দেখবে।',rolesSub:'পরিষ্কার রোল সীমা দৈনিক কাজকে দ্রুত রাখে, ওয়ার্কস্পেসকে জটিল করে না।',ctaEyebrow:'শুরু করার আগে দেখে নিন',ctaTitle:'বাংলাদেশের বাস্তবসম্মত ডেমো দিয়ে EduFlow দেখুন।',ctaText:'নমুনা শিক্ষার্থী, ব্যাচ, উপস্থিতি ও ফি-সহ পুরো ড্যাশবোর্ড সঙ্গে সঙ্গে খুলুন। অ্যাকাউন্ট লাগবে না।',openDemo:'ডেমো দেখুন →',create:'ওয়ার্কস্পেস তৈরি করুন',owner:'পূর্ণ নিয়ন্ত্রণ',admin:'সেন্টার পরিচালনা',teacher:'শিক্ষাদানে মনোযোগ',staff:'কাজ সচল রাখুন',setup:'সেটআপ',run:'দিন চালান',close:'লুপ সম্পূর্ণ করুন',student360:'স্টুডেন্ট ৩৬০',attendance:'উপস্থিতি',fees:'ফি ও পেমেন্ট',exams:'পরীক্ষা ও ফলাফল',team:'টিম রোল',guardianReady:'অভিভাবক প্রস্তুত'}
  };
  Object.keys(T.en).forEach(k=>{i.dict.en['site2.'+k]=T.en[k];i.dict.bn['site2.'+k]=T.bn[k]});
  const t=k=>i.t('site2.'+k), $=s=>document.querySelector(s), qa=s=>document.querySelectorAll(s);
  function addButton(root, selector){
    if(!root || root.querySelector('.site2-lang')) return;
    const b=document.createElement('button');
    b.className='btn btn-ghost site2-lang language-toggle';
    b.type='button';
    b.addEventListener('click',()=>i.toggleLang());
    (selector ? root.querySelector(selector) : root).prepend(b);
  }
  function set(sel,key){const el=$(sel);if(el)el.textContent=t(key)}
  function landing(){
    if(!$('.site-shell'))return;
    addButton(document.querySelector('.header-actions'));
    [['.nav-links a:nth-child(1)','features'],['.nav-links a:nth-child(2)','how'],['.nav-links a:nth-child(3)','roles'],['.nav-links a:nth-child(4)','contact'],['.header-actions a.btn-ghost','signIn'],['.header-actions a.btn-primary','register'],['.hero .eyebrow','eyebrow'],['.hero h1','heroTitle'],['.hero-text','heroText'],['.hero-actions a.btn-primary','demo'],['.hero-actions a.btn-ghost','workspace'],['.hero-note','note'],['#features .eyebrow','operating'],['#features h2','less'],['#features .section-heading p','operatingSub'],['#workflow .eyebrow','rhythm'],['#workflow h2','workflowTitle'],['#workflow .section-heading p','workflowSub'],['#roles .eyebrow','rolesEyebrow'],['#roles h2','rolesTitle'],['#roles .section-heading p','rolesSub'],['#contact .eyebrow','ctaEyebrow'],['#contact h2','ctaTitle'],['#contact p','ctaText'],['#contact .cta-actions a.btn-primary','openDemo'],['#contact .cta-actions a.btn-ghost','create']].forEach(([s,k])=>set(s,k));
    const trust=['bdt','access','guardian'];qa('.trust-row .trust-item').forEach((e,n)=>{if(trust[n])e.textContent=t(trust[n])});
    const f=['student360','attendance','fees','exams','team','guardianReady'];qa('.feature-card h3').forEach((e,n)=>{if(f[n])e.textContent=t(f[n])});
    const st=['setup','run','close'];qa('.step h3').forEach((e,n)=>{if(st[n])e.textContent=t(st[n])});
    const rt=['owner','admin','teacher','staff'];qa('.role-grid h3').forEach((e,n)=>{if(rt[n])e.textContent=t(rt[n])});
    set('.site-footer > a','openDemo');
    const b=$('.site2-lang');if(b)b.textContent=i.getLang()==='bn'?'English':'বাংলা';
  }
  function auth(){
    const r=$('#auth-screen');if(!r||r.classList.contains('hidden'))return;
    addButton(r,'.auth-card');
    const signup=!!r.querySelector('#auth-fullname');
    set('#auth-screen h1',signup?'auth.register':'auth.welcome');
    set('#auth-screen .sub',signup?'auth.sub.signup':'auth.sub.signin');
    const ids={'auth-fullname':'auth.name','auth-orgname':'auth.org','auth-email':'auth.email','auth-password':'auth.password'};
    qa('#auth-screen label').forEach(e=>{const k=ids[e.htmlFor];if(k)e.textContent=i.t(k)});
    const btn=$('#auth-btn');if(btn)btn.textContent=i.t(signup?'auth.create':'auth.signin');
    const toggle=$('#auth-toggle');if(toggle)toggle.textContent=i.t(signup?'auth.toggle.signin':'auth.toggle.signup');
    const hint=r.querySelector('.subtitle:last-child');if(hint)hint.textContent=i.t(signup?'auth.hint.signup':'auth.hint.signin');
    const b=r.querySelector('.site2-lang');if(b)b.textContent=i.getLang()==='bn'?'English':'বাংলা';
  }
  function apply(){i.applyStatic();landing();auth();document.documentElement.lang=i.getLang()==='bn'?'bn':'en'}
  window.addEventListener('eduflow:langchange',apply);
  const authRoot=document.getElementById('auth-screen');
  if(authRoot){new MutationObserver(()=>auth()).observe(authRoot,{childList:true,subtree:true})}
  window.EduFlowSiteLanguageV2={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
