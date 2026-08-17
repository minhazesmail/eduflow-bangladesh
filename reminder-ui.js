(() => {
  const originalGo=window.go;
  const originalRender=window.render;
  const originalTitle=window.title;
  function addReminderNav(){const nav=document.querySelector('.nav');if(!nav||nav.querySelector('[data-reminder-nav]'))return;const section=document.createElement('div');section.className='nav-section';section.textContent='Automation';const btn=document.createElement('button');btn.dataset.reminderNav='1';btn.className=window.page==='reminders'?'active':'';btn.innerHTML='<span class="ico">◌</span><span>Reminders</span>';btn.onclick=()=>window.go('reminders');nav.append(section,btn);}
  function renderReminder(){const c=document.getElementById('content');if(!c)return;addReminderNav();if(window.page==='reminders'){window.loadReminders?.();}}
  window.go=function(p){if(p==='reminders'){window.page='reminders';window.closeSidebar?.();originalRender();setTimeout(renderReminder,0);return;}return originalGo.apply(this,arguments);};
  window.title=function(){return window.page==='reminders'?'Reminders':originalTitle?originalTitle.apply(this,arguments):'EduFlow';};
  window.render=function(){const r=originalRender.apply(this,arguments);setTimeout(renderReminder,0);return r;};
  window.addEventListener('load',()=>setTimeout(()=>{addReminderNav();if(window.page==='reminders')renderReminder();},0));
})();
