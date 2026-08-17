(() => {
  let active = false;
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const money = v => '৳' + Number(v || 0).toLocaleString('en-BD');
  const canWrite = () => ['owner','admin','staff'].includes(window.profile?.role || '');
  const students = () => window.data?.students || [];
  const batches = () => window.data?.batches || [];
  const phone = s => (s.guardian_phone || s.phone || '').trim();
  const personalize = (body, s) => body.replaceAll('{{student}}', s.name || 'Student').replaceAll('{{guardian}}', s.guardian_name || 'Guardian').replaceAll('{{batch}}', s.batches?.name || batches().find(b => b.id === s.batch_id)?.name || 'your batch').replaceAll('{{center}}', window.profile?.organizations?.name || 'EduFlow');
  const org = () => window.orgId?.();

  function addNavButton() {
    const nav = document.querySelector('.sidebar .nav');
    if (!nav || document.getElementById('communicationNavButton')) return;
    const section = [...nav.querySelectorAll('.nav-section')].find(x => x.textContent.trim() === 'Communicate');
    const button = document.createElement('button');
    button.id = 'communicationNavButton';
    button.className = active ? 'active' : '';
    button.innerHTML = '<span class="ico">✉</span><span>Communication</span>';
    button.addEventListener('click', openCenter);
    if (section) section.after(button); else nav.appendChild(button);
  }

  async function loadCampaigns() {
    const { data, error } = await window.client().from('communication_campaigns').select('id,title,channel,audience_type,status,created_at').eq('organization_id', org()).order('created_at', { ascending:false });
    if (error) throw error;
    return data || [];
  }

  function view(campaigns=[]) {
    const rows = campaigns.map(c => `<div class="list-item"><div><strong>${esc(c.title)}</strong><div class="subtitle">${esc(c.channel)} • ${esc(c.audience_type)} • ${new Date(c.created_at).toLocaleDateString('en-BD')}</div></div><button class="btn btn-secondary btn-sm" onclick="window.openCommunicationCampaign('${c.id}')">View</button></div>`).join('') || '<div class="empty">No prepared campaigns yet.</div>';
    return `<div class="page-head"><div><h1>Communication Center</h1><div class="subtitle">Prepare targeted guardian and student messages without accidental bulk sending.</div></div><div class="actions">${canWrite() ? '<button class="btn btn-primary" onclick="window.openCommunicationComposer()">＋ New message</button>' : '<span class="badge badge-gray">Read only</span>'}</div></div>
      <div class="grid grid-3">
        <div class="card stat"><div><div class="label">Students</div><div class="value">${students().length}</div><div class="subtitle">available recipients</div></div></div>
        <div class="card stat"><div><div class="label">Guardians</div><div class="value">${students().filter(s => s.guardian_phone).length}</div><div class="subtitle">with guardian phone</div></div></div>
        <div class="card stat"><div><div class="label">Prepared</div><div class="value">${campaigns.length}</div><div class="subtitle">message campaigns</div></div></div>
      </div>
      <div class="card" style="margin-top:16px"><div class="section-head"><div><h2>Recent campaigns</h2><div class="subtitle">Saved message sets and recipient groups.</div></div></div><div class="list">${rows}</div></div>`;
  }

  async function openCenter() {
    active = true;
    document.querySelector('.sidebar button.active')?.classList.remove('active');
    document.getElementById('communicationNavButton')?.classList.add('active');
    document.querySelector('.sidebar')?.classList.remove('open');
    document.querySelector('.page-title')?.replaceChildren(document.createTextNode('Communication Center'));
    const c = document.getElementById('content');
    if (c) c.innerHTML = '<div class="card"><div class="empty">Loading communication center…</div></div>';
    try { if (window.loadData) await window.loadData(); const campaigns = await loadCampaigns(); if (c) c.innerHTML = view(campaigns); }
    catch (e) { if (c) c.innerHTML = `<div class="card"><div class="notice">${esc(e.message)}</div></div>`; }
  }

  function composer() {
    if (!canWrite()) return window.toast?.('Only owners, admins, and staff can prepare messages.');
    const selected = [];
    window.modal('New communication', `<div class="form-grid"><div class="field"><label>Title</label><input id="ac_title" placeholder="Fee reminder"></div><div class="field"><label>Channel</label><select id="ac_channel"><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="notice">Internal notice</option></select></div><div class="field"><label>Audience</label><select id="ac_audience" onchange="window.updateCommunicationAudience()"><option value="all">All guardians</option><option value="batch">One batch</option><option value="students">Selected students</option></select></div><div class="field" id="ac_batch_wrap" style="display:none"><label>Batch</label><select id="ac_batch">${batches().map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></div></div><div id="ac_students_wrap" style="margin-top:14px"></div><div class="field" style="margin-top:14px"><label>Message</label><textarea id="ac_body" rows="8" placeholder="Dear {{guardian}}, {{student}}'s monthly fee is due…"></textarea><div class="subtitle">Variables: {{student}}, {{guardian}}, {{batch}}, {{center}}</div></div><div class="actions end-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="window.prepareCommunicationAccess()">Prepare message</button></div>`);
    window.updateCommunicationAudience();
  }

  function updateAudience() {
    const a = document.getElementById('ac_audience')?.value;
    const b = document.getElementById('ac_batch_wrap');
    const s = document.getElementById('ac_students_wrap');
    if (b) b.style.display = a === 'batch' ? '' : 'none';
    if (s) s.innerHTML = a === 'students' ? `<div class="card"><div class="subtitle" style="margin-bottom:8px">Select recipients</div>${students().map(x=>`<label style="display:flex;gap:8px;align-items:center;padding:6px 0"><input type="checkbox" class="ac-student" value="${x.id}"> ${esc(x.name)} <span class="subtitle">${esc(phone(x) || 'No phone')}</span></label>`).join('') || '<div class="empty">No students.</div>'}</div>` : '';
  }

  async function prepare() {
    try {
      const title = document.getElementById('ac_title').value.trim();
      const body = document.getElementById('ac_body').value.trim();
      const channel = document.getElementById('ac_channel').value;
      const audience = document.getElementById('ac_audience').value;
      const batchId = document.getElementById('ac_batch')?.value || null;
      const ids = [...document.querySelectorAll('.ac-student:checked')].map(x=>x.value);
      if (!title || !body) throw new Error('Title and message are required.');
      let targets = students();
      if (audience === 'batch') targets = targets.filter(s=>s.batch_id === batchId);
      if (audience === 'students') targets = targets.filter(s=>ids.includes(s.id));
      targets = targets.filter(s=>phone(s));
      if (!targets.length) throw new Error('No matching recipients have a phone number.');
      const sample = personalize(body, targets[0]);
      window.modal('Review & prepare', `<div class="notice">No message is sent automatically.</div><div class="card" style="margin-top:12px"><h2>${esc(title)}</h2><div class="subtitle">${targets.length} recipients • ${esc(channel)}</div><div style="margin-top:12px;white-space:pre-wrap;background:#f8fafc;border:1px solid var(--line);padding:14px;border-radius:10px">${esc(sample)}</div></div><div class="actions end-actions"><button class="btn btn-secondary" onclick="closeModal()">Back</button><button class="btn btn-primary" onclick="window.saveCommunicationAccess(${JSON.stringify({title,body,channel,audience,batchId,ids})})">Save & prepare</button></div>`);
    } catch(e) { window.toast?.(e.message); }
  }

  async function save(payload) {
    try {
      let targets = students();
      if (payload.audience === 'batch') targets = targets.filter(s=>s.batch_id === payload.batchId);
      if (payload.audience === 'students') targets = targets.filter(s=>payload.ids.includes(s.id));
      targets = targets.filter(s=>phone(s));
      const {data,error}=await window.client().from('communication_campaigns').insert({organization_id:org(),title:payload.title,body:payload.body,channel:payload.channel,audience_type:payload.audience,batch_id:payload.audience==='batch'?payload.batchId:null,status:'prepared'}).select().single();
      if(error)throw error;
      const {error:re}=await window.client().from('communication_recipients').insert(targets.map(s=>({organization_id:org(),campaign_id:data.id,student_id:s.id,recipient_name:s.guardian_name||s.name,recipient_phone:phone(s),recipient_type:s.guardian_phone?'guardian':'student'})));
      if(re)throw re;
      window.closeModal(); window.toast?.('Messages prepared.'); await openCenter();
    } catch(e){window.toast?.(e.message);}
  }

  async function campaign(id) {
    try {
      const {data:c,error}=await window.client().from('communication_campaigns').select('*').eq('organization_id',org()).eq('id',id).single(); if(error)throw error;
      const {data:r,error:re}=await window.client().from('communication_recipients').select('recipient_name,recipient_phone,recipient_type,student_id').eq('organization_id',org()).eq('campaign_id',id); if(re)throw re;
      const student=students().find(s=>s.id===r?.[0]?.student_id); const text=student?personalize(c.body,student):c.body;
      window.modal(`Communication • ${esc(c.title)}`,`<div class="notice">Prepared only. External sending is not connected yet.</div><div class="card" style="margin-top:12px"><div class="subtitle">Example message for ${esc(r?.[0]?.recipient_name||'recipient')}</div><div style="margin-top:8px;white-space:pre-wrap;background:#f8fafc;border:1px solid var(--line);padding:12px;border-radius:10px">${esc(text)}</div><div class="actions" style="margin-top:12px"><button class="btn btn-primary" onclick="window.copyCommunicationAccess(${JSON.stringify(text)})">Copy message</button>${c.channel==='whatsapp'?`<a class="btn btn-secondary" href="https://wa.me/${encodeURIComponent((r?.[0]?.recipient_phone||'').replace(/\D/g,''))}" target="_blank" rel="noopener">Open WhatsApp</a>`:''}</div></div><div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Recipient</th><th>Phone</th><th>Type</th></tr></thead><tbody>${(r||[]).map(x=>`<tr><td>${esc(x.recipient_name||'—')}</td><td>${esc(x.recipient_phone||'—')}</td><td>${esc(x.recipient_type)}</td></tr>`).join('')}</tbody></table></div>`);
    } catch(e){window.toast?.(e.message);}
  }

  async function copy(text){try{await navigator.clipboard.writeText(text);window.toast?.('Message copied.')}catch(e){window.toast?.('Copy failed; select the message manually.')}}
  window.openCommunicationCenter=openCenter;
  window.openCommunicationComposer=composer;
  window.updateCommunicationAudience=updateAudience;
  window.prepareCommunicationAccess=prepare;
  window.saveCommunicationAccess=save;
  window.openCommunicationCampaign=campaign;
  window.copyCommunicationAccess=copy;
  const obs=new MutationObserver(()=>addNavButton());
  window.addEventListener('load',()=>{addNavButton();obs.observe(document.body,{childList:true,subtree:true});});
})();
