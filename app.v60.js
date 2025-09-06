// Mint
const storeKey='minimal_tasks_v45';
let tasks=[];
try{ tasks=JSON.parse(localStorage.getItem(storeKey)||'[]'); }catch{ tasks=[]; }
for(const t of tasks){ if(typeof t.done!=='boolean') t.done=false; if(!Array.isArray(t.items)) t.items=[]; for(const it of t.items){ if(typeof it.note!=='string') it.note=''; if(!Array.isArray(it.notePhotoKeys)) it.notePhotoKeys=[]; if(typeof it.done!=='boolean') it.done=false; } }

const els={
  appTitle: document.getElementById('appTitle'),
  viewList: document.getElementById('view-list'),
  viewDetail: document.getElementById('view-detail'),
  viewNote: document.getElementById('view-note'),
  // list
  addTask: document.getElementById('addTask'),
  taskTitle: document.getElementById('taskTitle'),
  tasks: document.getElementById('tasks'),
  tasksEmpty: document.getElementById('tasksEmpty'),
  tabActive: document.getElementById('tabActive'),
  tabDone: document.getElementById('tabDone'),
  tabAll: document.getElementById('tabAll'),
  // detail
  taskHeader: document.getElementById('taskHeader'),
  pdfBtn: document.getElementById('pdfBtn'),
  renameTaskBtn: document.getElementById('renameTaskBtn'),
  deleteTaskBtn: document.getElementById('deleteTaskBtn'),
  addSub: document.getElementById('addSub'),
  subTitle: document.getElementById('subTitle'),
  checkList: document.getElementById('checkList'),
  emptyCheck: document.getElementById('emptyCheck'),
  // note
  crumbTask: document.getElementById('crumbTask'),
  noteSubtaskText: document.getElementById('noteSubtaskText'),
  noteText: document.getElementById('noteText'),
  saveNoteBtn: document.getElementById('saveNoteBtn'),
  noteAttachBtn: document.getElementById('noteAttachBtn'),
  noteAttachInput: document.getElementById('noteAttachInput'),
  notePhotos: document.getElementById('notePhotos'),
  // confirm
  confirmModal: document.getElementById('confirmModal'),
  confirmText: document.getElementById('confirmText'),
  confirmCancel: document.getElementById('confirmCancel'),
  confirmOk: document.getElementById('confirmOk'),
  // pdf choice
  pdfChoiceModal: document.getElementById('pdfChoiceModal'),
  optChecklist: document.getElementById('optChecklist'),
  optDescription: document.getElementById('optDescription'),
  pdfChoiceCancel: document.getElementById('pdfChoiceCancel'),
  // checklist params
  checklistParamsModal: document.getElementById('checklistParamsModal'),
  paramDays: document.getElementById('paramDays'),
  paramExtra: document.getElementById('paramExtra'),
  paramLandscape: document.getElementById('paramLandscape'),
  paramsCancel: document.getElementById('paramsCancel'),
  paramsCreate: document.getElementById('paramsCreate'),
};

function save(){ localStorage.setItem(storeKey, JSON.stringify(tasks)); }
function uid(){ return Math.random().toString(36).slice(2,10); }

// Routing
window.addEventListener('hashchange', route);
window.addEventListener('load', ()=>{ if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js'); route(); });
window.addEventListener('DOMContentLoaded', ()=>{ try{route();}catch(e){console.error(e);} });

function route(){
  const parts=(location.hash||'#/').slice(2).split('/').filter(Boolean);
  els.viewList.hidden=els.viewDetail.hidden=els.viewNote.hidden=true;
  if(parts.length===0){ showTasks(); }
  else if(parts[0]==='task' && parts[1]){ showDetail(parts[1]); }
  else if(parts[0]==='note' && parts[1] && parts[2]){ showNote(parts[1], parts[2]); }
  else { location.hash='#/'; }
}

// Confirm modal
function showConfirm(message, onOk){
  els.confirmText.textContent=message;
  els.confirmModal.style.display='flex';
  function cleanup(){ els.confirmModal.style.display='none'; els.confirmOk.onclick=null; els.confirmCancel.onclick=null; document.removeEventListener('keydown',onKey); }
  function onKey(e){ if(e.key==='Escape') cleanup(); }
  document.addEventListener('keydown', onKey);
  els.confirmCancel.onclick=()=>cleanup();
  els.confirmOk.onclick=()=>{ cleanup(); onOk(); };
}

// Helpers
function ghost(text, onClick){ const b=document.createElement('button'); b.className='ghost'; b.textContent=text; b.addEventListener('click',e=>{ e.preventDefault(); e.stopPropagation(); onClick(); }); return b; }

let currentTaskId=null; let taskFilter = localStorage.getItem('mt_filter') || 'active';

function setTabLabels(){
  if(!els.tabActive || !els.tabDone || !els.tabAll) return;
  const total = tasks.length;
  const done = tasks.filter(t=>!!t.done).length;
  const active = total - done;
  els.tabActive.textContent = `Активные (${active})`;
  els.tabDone.textContent = `Выполненные (${done})`;
  els.tabAll.textContent = `Все (${total})`;
}

// List
function showTasks(){
  els.viewList.hidden=false; els.appTitle.textContent='Mint'; setTabLabels();
  // tabs
  if(els.tabActive){ els.tabActive.classList.toggle('active', taskFilter==='active'); els.tabActive.onclick=()=>{ taskFilter='active'; localStorage.setItem('mt_filter', taskFilter); showTasks(); }; }
  if(els.tabDone){ els.tabDone.classList.toggle('active', taskFilter==='done'); els.tabDone.onclick=()=>{ taskFilter='done'; localStorage.setItem('mt_filter', taskFilter); showTasks(); }; }
  if(els.tabAll){ els.tabAll.classList.toggle('active', taskFilter==='all'); els.tabAll.onclick=()=>{ taskFilter='all'; localStorage.setItem('mt_filter', taskFilter); showTasks(); }; }

  els.tasks.innerHTML='';
  const filtered = tasks.filter(t => taskFilter==='all' ? true : (taskFilter==='done'? !!t.done : !t.done));
  els.tasksEmpty.hidden = filtered.length>0;

  for(const t of filtered){
    const li=document.createElement('li'); li.className='row';
    const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=!!t.done;
    cb.addEventListener('change', e=>{ e.preventDefault(); e.stopPropagation(); t.done=cb.checked; save(); setTabLabels(); showTasks(); });
    const title=document.createElement('div'); title.className='title'; title.textContent=t.title;
    const actions=document.createElement('div'); actions.className='actions';
    const pdfBtn=ghost('PDF', ()=> showPdfChoice(t));
    const editBtn=ghost('✏️', ()=> renameTask(t.id));
    const delBtn=ghost('🗑️', ()=> removeTask(t.id));
    actions.append(pdfBtn, editBtn, delBtn);
    const link=document.createElement('a'); link.className='row-link'; link.href='#/task/'+t.id;
    actions.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); });
    li.append(cb,title,actions,link);
    els.tasks.append(li);
  }

  els.addTask.onsubmit = (e)=>{ e.preventDefault(); const v=els.taskTitle.value.trim(); if(!v) return; tasks.push({id:uid(), title:v, done:false, items:[]}); save(); setTabLabels(); els.taskTitle.value=''; showTasks(); };
}
function renameTask(id){
  const t=tasks.find(x=>x.id===id); if(!t) return;
  const v=prompt('Новое имя задачи', t.title); if(v==null) return;
  t.title=v.trim()||t.title; save(); showTasks();
}
function removeTask(id){
  showConfirm('Удалить задачу?', ()=>{ tasks = tasks.filter(t=>t.id!==id); save(); setTabLabels(); showTasks(); });
}

// Detail
function showDetail(taskId){
  const t=tasks.find(x=>x.id===taskId); if(!t){ location.hash='#/'; return; }
  currentTaskId=taskId;
  els.viewDetail.hidden=false; els.appTitle.textContent='Подзадачи';
  els.taskHeader.textContent=t.title;
  els.pdfBtn.onclick=(e)=>{ e.preventDefault(); e.stopPropagation(); showPdfChoice(t); };
  els.renameTaskBtn.onclick=()=> renameTask(t.id);
  els.deleteTaskBtn.onclick=()=> removeTask(t.id);

  renderChecklist(t);

  els.addSub.onsubmit=(e)=>{ e.preventDefault(); const v=els.subTitle.value.trim(); if(!v) return; (t.items ||= []).push({id:uid(), title:v, done:false, note:'', notePhotoKeys:[]}); t.done=false; save(); setTabLabels(); els.subTitle.value=''; renderChecklist(t); };
}

function renderChecklist(t){
  const items = t.items || [];
  els.checkList.innerHTML=''; els.emptyCheck.hidden = items.length>0;
  for(const it of items){
    const li=document.createElement('li'); li.className='row'; li.dataset.id=it.id;
    const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=!!it.done;
    cb.addEventListener('change', e=>{ e.preventDefault(); e.stopPropagation(); it.done=cb.checked; const allDone=(t.items||[]).length>0 && (t.items||[]).every(x=>x.done); t.done=allDone; save(); setTabLabels(); });
    const title=document.createElement('div'); title.className='title'; title.textContent=it.title;
    const actions=document.createElement('div'); actions.className='actions';
    const attachBtn=ghost('📎', ()=> attachPhoto(t.id, it.id));
    const editBtn=ghost('✏️', ()=> editItem(t.id, it.id));
    const delBtn=ghost('🗑️', ()=> removeItem(t.id, it.id));
    actions.append(attachBtn, editBtn, delBtn);
    actions.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); });
    const link=document.createElement('a'); link.className='row-link'; link.href='#/note/'+t.id+'/'+it.id;
    li.append(cb,title,actions,link);
    els.checkList.append(li);
  }
}
function editItem(taskId, itemId){
  const t=tasks.find(x=>x.id===taskId); if(!t) return;
  const it=(t.items||[]).find(i=>i.id===itemId); if(!it) return;
  const v=prompt('Новое имя пункта', it.title); if(v==null) return;
  it.title=v.trim()||it.title; save(); renderChecklist(t);
}
function removeItem(taskId, itemId){
  showConfirm('Удалить подзадачу?', ()=>{
    const t=tasks.find(x=>x.id===taskId); if(!t) return;
    t.items=(t.items||[]).filter(s=>s.id!==itemId);
    t.done = (t.items||[]).length>0 ? (t.items||[]).every(x=>x.done) : t.done;
    save(); setTabLabels(); renderChecklist(t);
  });
}

// Note & photos
function showNote(taskId, itemId){
  const t=tasks.find(x=>x.id===taskId); if(!t){ location.hash='#/'; return; }
  const it=(t.items||[]).find(i=>i.id===itemId); if(!it){ location.hash='#/task/'+taskId; return; }
  els.viewNote.hidden=false; els.appTitle.textContent='Примечание';
  els.crumbTask.textContent=t.title; els.crumbTask.href='#/task/'+taskId;
  noteCtx={taskId,itemId};
  els.noteSubtaskText.textContent=it.title; els.noteText.value=it.note||'';
  renderNotePhotos(it);
  els.noteAttachBtn.onclick=(e)=>{ e.preventDefault(); e.stopPropagation(); els.noteAttachInput.removeAttribute('capture'); const ch=prompt('Фото: 1 — Камера, 2 — Галерея','2'); if(ch==='1') els.noteAttachInput.setAttribute('capture','environment'); els.noteAttachInput.click(); };
  els.noteAttachInput.onchange=async (e)=>{ const f=e.target.files&&e.target.files[0]; if(!f) return; await attachPhotoToNote(taskId,itemId,f); e.target.value=''; };
  let timer=null; els.noteText.oninput=()=>{ clearTimeout(timer); timer=setTimeout(()=>{ it.note=els.noteText.value; save(); },300); };
  els.saveNoteBtn.onclick=()=>{ it.note=els.noteText.value; save(); els.saveNoteBtn.textContent='Сохранено'; setTimeout(()=>els.saveNoteBtn.textContent='Сохранить',800); };
}

let noteCtx={taskId:null,itemId:null};
async function renderNotePhotos(it){
  els.notePhotos.innerHTML='';
  for(const key of (it.notePhotoKeys||[])){
    const blob = await idbGet(key); if(!blob) continue;
    const url = URL.createObjectURL(blob);
    const w=document.createElement('div'); w.className='note-thumb-wrap';
    const img=document.createElement('img'); img.className='note-thumb'; img.src=url;
    const del=document.createElement('button'); del.className='note-del'; del.textContent='✖';
    del.addEventListener('click', async (e)=>{ e.preventDefault(); e.stopPropagation(); await idbDel(key); it.notePhotoKeys=it.notePhotoKeys.filter(k=>k!==key); save(); renderNotePhotos(it); });
    img.addEventListener('click', ()=> openLightbox(url));
    w.append(img, del); els.notePhotos.append(w);
  }
}

function attachPhoto(taskId, itemId){
  location.hash = '#/note/'+taskId+'/'+itemId;
  setTimeout(()=>{ els.noteAttachBtn?.click(); }, 100);
}

function openLightbox(url){
  const w=window.open('','_blank'); w.document.write('<img src=\"'+url+'\" style=\"max-width:100%;height:auto\">');
}

function compressImageToDataURL(file, maxSize, quality){
  return new Promise((resolve,reject)=>{
    const img=new Image(); const r=new FileReader();
    r.onload=()=>{ img.onload=()=>{
        const ratio=Math.min(maxSize/img.width, maxSize/img.height, 1);
        const canvas=document.createElement('canvas'); canvas.width=img.width*ratio; canvas.height=img.height*ratio;
        const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality||0.85));
      }; img.onerror=reject; img.src=r.result;
    }; r.onerror=reject; r.readAsDataURL(file);
  });
}

// IndexedDB
const DB_NAME='mtasks'; const DB_VER=1;
let dbPromise=null;
function openDB(){ if(!('indexedDB' in window)) return null; if(dbPromise) return dbPromise;
  dbPromise=new Promise((res,rej)=>{ const req=indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded=()=>{ const db=req.result; if(!db.objectStoreNames.contains('photos')) db.createObjectStore('photos'); };
    req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error);
  }); return dbPromise; }
async function idbSet(key, blob){ const db=await openDB(); if(!db) throw new Error('IDB unavailable'); return await new Promise((res,rej)=>{ const tx=db.transaction('photos','readwrite'); tx.objectStore('photos').put(blob,key); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); }
async function idbGet(key){ const db=await openDB(); if(!db) return null; return await new Promise((res,rej)=>{ const tx=db.transaction('photos','readonly'); const rq=tx.objectStore('photos').get(key); rq.onsuccess=()=>res(rq.result||null); rq.onerror=()=>rej(rq.error); }); }
async function idbDel(key){ const db=await openDB(); if(!db) return; return await new Promise((res,rej)=>{ const tx=db.transaction('photos','readwrite'); tx.objectStore('photos').delete(key); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); }
function dataURLtoBlob(dataUrl){ const [meta,b64]=dataUrl.split(','); const mime=(meta.match(/data:(.*?);/)||[])[1]||'image/jpeg'; const bin=atob(b64); const u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i); return new Blob([u8],{type:mime}); }

async function attachPhotoToNote(taskId,itemId,file){
  const t=tasks.find(x=>x.id===taskId); if(!t) return;
  const it=(t.items||[]).find(i=>i.id===itemId); if(!it) return;
  const dataUrl = await compressImageToDataURL(file, 1600, 0.8);
  const blob = dataURLtoBlob(dataUrl);
  const key = 'notephoto-'+itemId+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
  await idbSet(key, blob);
  it.notePhotoKeys.push(key); save();
  if(!els.viewNote.hidden) renderNotePhotos(it);
}

// PDF: helpers
async function blobToDataURL(blob){ return await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(blob); }); }

async function exportDescriptionPDF(task, preopenWin, mode){
  const items=task.items||[]; const sections=[];
  for(const [idx,it] of items.entries()){
    const photos=[];
    if(Array.isArray(it.notePhotoKeys)){
      for(const key of it.notePhotoKeys){ const blob=await idbGet(key); if(blob){ const u=await blobToDataURL(blob); photos.push(u); } }
    }
    sections.push({ idx: idx+1, title: it.title||'', note: it.note||'', photos });
  }
  let html = `<!doctype html><html lang=\"ru\"><head><meta charset=\"utf-8\"><title>${task.title} — описание</title>
  <style>@page{size:auto;margin:14mm}body{font-family:-apple-system,system-ui,\"Segoe UI\",Roboto,Arial;color:#111}
  h1{font-size:18pt;margin:0 0 10pt;text-align:center}.section{page-break-inside:avoid;border:1px solid #222;border-radius:8px;padding:10pt;margin:0 0 10pt}
  .h{font-weight:700;margin-bottom:6pt}.note{white-space:pre-wrap;font-size:10.5pt;margin:6pt 0 4pt}.photos{display:flex;gap:6pt;flex-wrap:wrap}
  .photos img{max-height:120pt;border:1px solid #999;border-radius:6px}.meta{display:flex;justify-content:space-between;font-size:9pt;color:#333;margin:2pt 0 8pt}
  @media print{.no-print{display:none}}</style></head><body>
  <div class=\"no-print\" style=\"text-align:right;margin-bottom:8pt;\"><button onclick=\"window.print()\">Печать/Сохранить в PDF</button></div><h1>${task.title}</h1>`;
  for(const s of sections){
    html += `<div class=\"section\"><div class=\"meta\"><div>№ ${s.idx}</div><div></div></div>
      <div class=\"h\">${s.title.replace(/</g,'&lt;')}</div>
      ${s.note?`<div class=\"note\">${s.note.replace(/</g,'&lt;')}</div>`:''}
      ${s.photos && s.photos.length?`<div class=\"photos\">`+s.photos.map(u=>`<img src=\"${u}\">`).join('')+`</div>`:''}
    </div>`;
  }
  html += `</body></html>`;
  if(mode==='inline'){ return html; } const win = preopenWin || window.open('','_blank'); if(!win){ alert('Разрешите всплывающие окна для экспорта PDF.'); return; } win.document.open(); win.document.write(html); win.document.close();
}

async function exportChecklistPDF(task, preopenWin, days, extra, landscape, mode){
  const rows = (task.items||[]).concat(Array.from({length:extra||0}, ()=>({title:''})));
  const dates=[]; const today=new Date();
  for(let i=0;i<days;i++){ const d=new Date(today.getTime()+i*86400000); const dd=d.toLocaleDateString('ru-RU'); dates.push(dd); }
  let html = `<!doctype html><html lang=\"ru\"><head><meta charset=\"utf-8\"><title>${task.title} — чек-лист</title>
  <style>@page{size:${landscape||days>12 ? 'A4 landscape' : 'auto'};margin:16mm}body{font-family:-apple-system,system-ui,\"Segoe UI\",Roboto,Arial;color:#111}
  h1{font-size:18pt;margin:0 0 10pt;text-align:center}table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #222;padding:5pt 5pt;font-size:9.5pt}th{background:#f2f2f2;text-align:center}td.n{text-align:center;width:28pt}td.t{white-space:pre-wrap}
  .meta{display:flex;justify-content:space-between;font-size:9.5pt;margin-bottom:8pt}@media print{.no-print{display:none}}</style>
  </head><body><div class=\"no-print\" style=\"text-align:right;margin-bottom:8pt;\"><button onclick=\"window.print()\">Печать/Сохранить в PDF</button></div><h1>${task.title}</h1>`;
  html += `<table><colgroup><col style=\"width:28pt\" /><col />${dates.map(_=>'<col style=\"width:32pt\" />').join('')}</colgroup><thead><tr><th>№</th><th>Пункт</th>${dates.map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody>`;
  rows.forEach((it,idx)=>{ html += `<tr><td class=\"n\">${idx+1}</td><td class=\"t\">${(it.title||'').replace(/</g,'&lt;')}</td>${dates.map(()=>'<td></td>').join('')}</tr>`; });
  html += `</tbody></table></body></html>`;
  if(mode==='inline'){ return html; } const win = preopenWin || window.open('','_blank'); if(!win){ alert('Разрешите всплывающие окна для экспорта PDF.'); return; } win.document.open(); win.document.write(html); win.document.close();
}

// PDF modals and flow
function showPdfChoice(task){
  els.pdfChoiceModal.style.display='flex';
  function cleanup(){ els.pdfChoiceModal.style.display='none'; els.optChecklist.onclick=null; els.optDescription.onclick=null; els.pdfChoiceCancel.onclick=null; document.removeEventListener('keydown',onKey); }
  function onKey(e){ if(e.key==='Escape') cleanup(); }
  document.addEventListener('keydown', onKey);
  els.optChecklist.onclick = (e)=>{ e.preventDefault(); cleanup(); showChecklistParams(task); };
  els.optDescription.onclick = async (e)=>{ e.preventDefault(); cleanup(); const html = await exportDescriptionPDF(task, null, 'inline'); if(window.MT_openPdfViewer) MT_openPdfViewer(html); };
  els.pdfChoiceCancel.onclick = (e)=>{ e.preventDefault(); cleanup(); };
}

function showChecklistParams(task){
  els.checklistParamsModal.style.display='flex';
  els.paramDays.value = els.paramDays.value || 7;
  els.paramExtra.value = els.paramExtra.value || 0;
  function applyLandscapeHint(){ const d=parseInt(els.paramDays.value||'7',10)||7; els.paramLandscape.checked = d>12; }
  applyLandscapeHint();
  els.paramDays.oninput = applyLandscapeHint;

  function cleanup(){ els.checklistParamsModal.style.display='none'; els.paramsCancel.onclick=null; els.paramsCreate.onclick=null; els.paramDays.oninput=null; document.removeEventListener('keydown', onKey); }
  function onKey(e){ if(e.key==='Escape') cleanup(); }
  document.addEventListener('keydown', onKey);

  els.paramsCancel.onclick = (e)=>{ e.preventDefault(); cleanup(); };
  els.paramsCreate.onclick = async (e)=>{
    e.preventDefault();
    const days = Math.max(1, Math.min(60, parseInt(els.paramDays.value||'7',10)||7));
    const extra = Math.max(0, Math.min(50, parseInt(els.paramExtra.value||'0',10)||0));
    const landscape = !!els.paramLandscape.checked;
    cleanup();
    const html = await exportChecklistPDF(task, null, days, extra, landscape, 'inline'); if(window.MT_openPdfViewer) MT_openPdfViewer(html);
  };
}


// --- Orientation lock (portrait-only UX) ---
(function(){
  const el = document.getElementById('orientationLock');
  function update(){
    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    el.style.display = isPortrait ? 'none' : 'flex';
    // Prevent background scroll when overlay visible
    document.documentElement.style.overflow = isPortrait ? '' : 'hidden';
    document.body.style.overflow = isPortrait ? '' : 'hidden';
  }
  window.addEventListener('orientationchange', update);
  window.addEventListener('resize', update);
  document.addEventListener('visibilitychange', update);
  // Try Screen Orientation API where available (won't work on iOS Safari, but safe)
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('portrait').catch(()=>{});
  }
  update();
})();


// --- In-app update flow ---
(function(){
  const bar = document.getElementById('updateBar');
  const btn = document.getElementById('updateNowBtn');
  if(!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistration().then(reg=>{
    if(!reg) return;
    setInterval(()=>{ reg.update().catch(()=>{}); }, 60000);
    reg.addEventListener('updatefound', ()=>{
      const nw = reg.installing;
      if(!nw) return;
      nw.addEventListener('statechange', ()=>{
        if(nw.state==='installed' && navigator.serviceWorker.controller){
          if(bar) bar.style.display='flex';
          if(btn){ btn.onclick = ()=>{ nw.postMessage({type:'SKIP_WAITING'}); }; }
        }
      });
    });
  });
  navigator.serviceWorker.addEventListener('controllerchange', ()=>{ location.reload(); });
})();

// --- iOS A2HS keyboard fixes ---
(function(){
  function clearOverflow(){
    document.documentElement.style.overflow='';
    document.body.style.overflow='';
  }
  window.addEventListener('pageshow', clearOverflow);
  window.addEventListener('orientationchange', clearOverflow);
  document.addEventListener('visibilitychange', clearOverflow);

  function wireFocusNudge(scope){
    try{
      const sel='input[type="text"], input[type="number"], textarea';
      (scope||document).querySelectorAll(sel).forEach(el=>{
        el.style.webkitUserSelect='text';
        el.style.userSelect='text';
        el.addEventListener('touchend', function(){
          try{ el.focus({preventScroll:true}); }catch(e){ try{ el.focus(); }catch(_){} }
          // tiny scroll nudge to wake keyboard in iOS PWA
          const x=window.pageXOffset, y=window.pageYOffset;
          setTimeout(()=>window.scrollTo(x, y+1), 0);
          setTimeout(()=>window.scrollTo(x, y), 0);
        }, {passive:true});
      });
    }catch(e){}
  }
  document.addEventListener('DOMContentLoaded', ()=> wireFocusNudge(document));
  // Hook places where inputs are dynamically added
  if (window.MT_afterRenderChecklist) {
    const prev = window.MT_afterRenderChecklist;
    window.MT_afterRenderChecklist = function(t){ try{ prev(t); }catch(e){} wireFocusNudge(document); }
  } else {
    window.MT_afterRenderChecklist = function(){ wireFocusNudge(document); };
  }
})();


// --- In-app PDF viewer (HTML preview) ---
(function(){
  let currentBlobUrl = null;
  const wrap = document.getElementById('pdfViewer');
  const frame = document.getElementById('pdfFrame');
  const btnClose = document.getElementById('pdfCloseBtn');
  const btnSafari = document.getElementById('pdfOpenSafari');
  function openHtmlInViewer(html){
    try{
      if(currentBlobUrl){ URL.revokeObjectURL(currentBlobUrl); currentBlobUrl=null; }
      const blob = new Blob([html], {type:'text/html'});
      const url = URL.createObjectURL(blob);
      currentBlobUrl = url;
      if(frame) frame.src = url;
      if(wrap) wrap.style.display = 'flex';
      document.documentElement.style.overflow=''; document.body.style.overflow='';
      if(btnSafari){
        btnSafari.onclick = (e)=>{ e.preventDefault(); try{ window.open(url,'_blank'); }catch(_){} };
      }
    }catch(e){ console.error(e); alert('Не удалось открыть превью. Разрешите всплывающие окна и попробуйте ещё раз.'); }
  }
  function closeViewer(){
    if(wrap) wrap.style.display='none';
    if(frame) frame.src='about:blank';
    if(currentBlobUrl){ URL.revokeObjectURL(currentBlobUrl); currentBlobUrl=null; }
  }
  if(btnClose) btnClose.onclick = (e)=>{ e.preventDefault(); closeViewer(); };
  window.MT_openPdfViewer = openHtmlInViewer;
})();


// --- Share/Download for in-app PDF viewer ---
(function(){
  let lastHtml = null;
  const btnShare = null; // removed share button
  const btnDl = document.getElementById('pdfDownloadBtn');
  const btnSafari = document.getElementById('pdfOpenSafari');

  const _prevOpen = window.MT_openPdfViewer;
  window.MT_openPdfViewer = function(html){ window.__lastPdfHtml = html;
    lastHtml = html;
    return _prevOpen(html);
  };

  async function getHtmlBlob(){
    if(!lastHtml) return null;
    try{ return new Blob([lastHtml], {type:'text/html'}); }catch(e){ return null; }
  }

  if(btnShare){
    
// share removed
  }

  if(btnDl){
    btnDl.onclick = async (e)=>{
      e.preventDefault();
      const blob = await getHtmlBlob();
      if(!blob){ alert('Нет данных для скачивания'); return; }
      try{
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mint.pdf.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(()=>URL.revokeObjectURL(url), 15000);
      }catch(err){
        alert('Скачивание недоступно. Откройте документ в Safari и сохраните через «Поделиться» → «Сохранить в Файлы».');
      }
    };
  }
})();
