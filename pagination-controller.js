/* Route-aware server pagination for core list pages. */
(function(){'use strict';
  const pageMap={students:'students',batches:'batches',exams:'exams',teachers:'teachers',audit:'audit_logs'};
  const size=25;
  const special=new Set(['attendance','payments','results','notices','team']);
  function route(){return location.hash.replace(/^#\/?/,'').split('?')[0]||'dashboard';}
  function page(){const n=Number(new URLSearchParams(location.search).get('page')||0);return Number.isFinite(n)&&n>0?Math.floor(n):0;}
  function setContext(){const current=route(),table=pageMap[current]||null;window.EduFlowPagination={table,page:page(),size,enabled:!!table&&!special.has(current)};}
  function controls(){const current=route();if(!pageMap[current]||special.has(current))return;const root=document.getElementById('page-content');if(!root||root.querySelector('.eduflow-pagination'))return;const table=pageMap[current], currentPage=page();const tableEl=root.querySelector('table');if(!tableEl)return;const rows=tableEl.querySelectorAll('tbody tr');const meaningful=[...rows].filter(r=>!r.querySelector('.empty')).length;const nav=document.createElement('div');nav.className='pagination eduflow-pagination';nav.setAttribute('aria-label',`${current} pagination`);const prev=document.createElement('button');prev.className='btn btn-sm btn-secondary';prev.textContent='Previous';prev.disabled=currentPage===0;const next=document.createElement('button');next.className='btn btn-sm btn-secondary';next.textContent='Next';next.disabled=meaningful<size;const label=document.createElement('span');label.textContent=`Page ${currentPage+1}`;const go=n=>{const url=new URL(location.href);if(n>0)url.searchParams.set('page',String(n));else url.searchParams.delete('page');history.replaceState(null,'',`${url.pathname}${url.search}#${current}`);window.dispatchEvent(new Event('hashchange'));};prev.onclick=()=>go(Math.max(0,currentPage-1));next.onclick=()=>go(currentPage+1);nav.append(prev,label,next);root.appendChild(nav);}
  const refresh=()=>{setContext();setTimeout(controls,75);setTimeout(controls,350);};
  window.addEventListener('hashchange',refresh,true);window.addEventListener('popstate',refresh,true);window.addEventListener('eduflow:route-start',refresh,true);document.addEventListener('DOMContentLoaded',refresh,{once:true});
  window.EduFlowPagination={table:null,page:0,size,enabled:false};
})();
