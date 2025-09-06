
(() => {
const storeKey = 'mint_tasks_new';
const els = {
  home: document.getElementById('view-home'),
  task: document.getElementById('view-task'),
  note: document.getElementById('view-note'),

  newTaskInput: document.getElementById('newTaskInput'),
  addTaskBtn: document.getElementById('addTaskBtn'),
  taskList: document.getElementById('taskList'),
  emptyHome: document.getElementById('emptyHome'),
  tabs: Array.from(document.querySelectorAll('.tab')),

  backHome: document.getElementById('backHome'),
  pdfBtn: document.getElementById('pdfBtn'),
  foldersBtn: document.getElementById('foldersBtn'),
  deleteTaskBtn: document.getElementById('deleteTaskBtn'),
  taskTitle: document.getElementById('taskTitle'),
  newItemInput: document.getElementById('newItemInput'),
  addItemBtn: document.getElementById('addItemBtn'),
  checkList: document.getElementById('checkList'),
  emptyCheck: document.getElementById('emptyCheck'),

  backTask: document.getElementById('backTask'),
  delItemBtn: document.getElementById('delItemBtn'),
  noteTitle: document.getElementById('noteTitle'),
  noteArea: document.getElementById('noteArea'),
  addPhotoBtn: document.getElementById('addPhotoBtn'),
  clearPhotosBtn: document.getElementById('clearPhotosBtn'),
  photoInput: document.getElementById('photoInput'),
  noteGallery: document.getElementById('noteGallery'),

  // modals
  pdfModal: document.getElementById('pdfModal'),
  pdfChecklist: document.getElementById('pdfChecklist'),
  pdfDescription: document.getElementById('pdfDescription'),
  daysRow: document.getElementById('daysRow'),
  daysCount: document.getElementById('daysCount'),
  pdfClose: document.getElementById('pdfClose'),

  foldersModal: document.getElementById('foldersModal'),
  folderName: document.getElementById('folderName'),
  addFolderBtn: document.getElementById('addFolderBtn'),
  foldersList: document.getElementById('foldersList'),
  foldersClose: document.getElementById('foldersClose'),
};

const state = {
  tasks: load() || [],
  currentTaskId: null,
  currentItemId: null,
  tab: 'all'
};

function uid(){ return Math.random().toString(36).slice(2,10); }
function save(){ localStorage.setItem(storeKey, JSON.stringify(state.tasks)); }

function load(){ try{ return JSON.parse(localStorage.getItem(storeKey)||'[]'); }catch(e){ return []; } }

function setView(name){
  els.home.classList.toggle('hidden', name!=='home');
  els.task.classList.toggle('hidden', name!=='task');
  els.note.classList.toggle('hidden', name!=='note');
}

function normalizeTask(t){
  if(!Array.isArray(t.items)) t.items=[];
  if(!Array.isArray(t.folders)) t.folders=[]; // {id,title}
  if(typeof t.done!=='boolean') t.done=false;
  for(const it of t.items){
    if(typeof it.done!=='boolean') it.done=false;
    if(!Array.isArray(it.photos)) it.photos=[];
    if(typeof it.note!=='string') it.note='';
    if(typeof it.folderId==='undefined') it.folderId=null;
  }
  return t;
}

function addTask(title){
  const t = normalizeTask({id:uid(), title, done:false, items:[], folders:[]});
  state.tasks.push(t); save(); renderHome();
}
function removeTask(id){
  state.tasks = state.tasks.filter(t=>t.id!==id); save(); renderHome(); setView('home');
}

function renderHome(){
  const list = els.taskList; list.innerHTML='';
  const tab=state.tab;
  let tasks = state.tasks.map(normalizeTask);
  if(tab==='active') tasks = tasks.filter(t=>!t.done);
  if(tab==='done') tasks = tasks.filter(t=>t.done);
  els.emptyHome.style.display = tasks.length? 'none':'block';
  for(const t of tasks){
    const li=document.createElement('li'); li.className='row'; li.dataset.id=t.id;
    const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=!!t.done;
    cb.addEventListener('change', e=>{ t.done=cb.checked; save(); renderHome(); });
    const title=document.createElement('div'); title.className='title'; title.textContent=t.title;
    const actions=document.createElement('div'); actions.className='actions';
    const pdf=ghost('📄', ()=> openPdfMenu(t.id));
    const del=ghost('🗑️', ()=> confirmDelete(()=> removeTask(t.id)));
    actions.append(pdf, del);
    const link=document.createElement('a'); link.className='row-link'; link.href='#/task/'+t.id;
    li.append(cb,title,actions,link); list.append(li);
  }
}

function ghost(label, fn){ const b=document.createElement('button'); b.className='ghost'; b.textContent=label; b.onclick=(e)=>{e.preventDefault();e.stopPropagation();fn();}; return b; }

// Routing
window.addEventListener('hashchange', handleHash);
function handleHash(){
  const h=location.hash.slice(1);
  if(!h){ setView('home'); renderHome(); return; }
  const parts=h.split('/');
  if(parts[0]==='task'){ const id=parts[1]; openTask(id); }
  else if(parts[0]==='note'){ const tid=parts[1], iid=parts[2]; openNote(tid,iid); }
  else { setView('home'); renderHome(); }
}

// Task view
function openTask(id){
  const t = state.tasks.find(x=>x.id===id); if(!t){ setView('home'); return; }
  state.currentTaskId=id; normalizeTask(t);
  els.taskTitle.textContent = t.title;
  setView('task'); renderChecklist(t);
}
function renderChecklist(t){
  const ul=els.checkList; ul.innerHTML='';
  els.emptyCheck.style.display = t.items.length? 'none':'block';
  // Render groups by folders
  const byFolder=new Map();
  for(const it of t.items){
    const key=it.folderId || 'ungrouped';
    if(!byFolder.has(key)) byFolder.set(key,[]);
    byFolder.get(key).push(it);
  }
  // Existing folders first
  for(const f of t.folders){
    const hdr=document.createElement('li'); hdr.className='group-header'; hdr.textContent='📁 '+f.title;
    ul.append(hdr);
    const arr=byFolder.get(f.id)||[];
    if(!arr.length){ const empty=document.createElement('li'); empty.className='group-empty'; empty.textContent='(пусто)'; ul.append(empty); }
    for(const it of arr){ ul.append(itemRow(t,it)); }
  }
  // Ungrouped
  const un=byFolder.get('ungrouped')||[];
  if(un.length){
    const hdr=document.createElement('li'); hdr.className='group-header'; hdr.style.opacity='.75'; hdr.textContent='Без папки';
    ul.append(hdr);
    for(const it of un){ ul.append(itemRow(t,it)); }
  }
  // Task done auto if all done
  t.done = t.items.length>0 && t.items.every(x=>x.done);
  save(); renderHome(); // update counters
}
function itemRow(t,it){
  const li=document.createElement('li'); li.className='row'; li.dataset.id=it.id;
  const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=!!it.done;
  cb.addEventListener('change', e=>{ it.done=cb.checked; save(); renderChecklist(t); });
  const title=document.createElement('div'); title.className='title'; title.textContent=it.title;
  const actions=document.createElement('div'); actions.className='actions';
  const folderBtn=ghost('📁', ()=> assignFolder(t,it));
  const editBtn=ghost('✏️', ()=> renameItem(t,it));
  const delBtn=ghost('🗑️', ()=> confirmDelete(()=> removeItem(t,it)));
  actions.append(folderBtn, editBtn, delBtn);
  actions.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); });
  const link=document.createElement('a'); link.className='row-link'; link.href='#/note/'+t.id+'/'+it.id;
  li.append(cb,title,actions,link); return li;
}

function addItem(title){
  const t = state.tasks.find(x=>x.id===state.currentTaskId); if(!t) return;
  t.items.push({id:uid(), title, done:false, note:'', photos:[], folderId:null});
  save(); renderChecklist(t);
}
function renameItem(t,it){
  const v=prompt('Название', it.title); if(v==null) return; it.title=v.trim()||it.title; save(); renderChecklist(t);
}
function removeItem(t,it){
  t.items=t.items.filter(x=>x.id!==it.id); save(); renderChecklist(t);
}

// Note view
function openNote(taskId,itemId){
  const t=state.tasks.find(x=>x.id===taskId); if(!t){ setView('home'); return; }
  const it=t.items.find(x=>x.id===itemId); if(!it){ openTask(taskId); return; }
  state.currentTaskId=taskId; state.currentItemId=itemId;
  els.noteTitle.textContent=it.title; els.noteArea.value=it.note||'';
  renderGallery(it.photos||[]);
  setView('note');
}
function renderGallery(arr){
  els.noteGallery.innerHTML='';
  for(const src of arr){
    const img=new Image(); img.src=src; els.noteGallery.append(img);
  }
}

// Folders
function openFolders(){
  const t=state.tasks.find(x=>x.id===state.currentTaskId); if(!t) return;
  normalizeTask(t);
  els.folderName.value='';
  renderFoldersList(t);
  show(els.foldersModal);
}
function renderFoldersList(t){
  const box=els.foldersList; box.innerHTML='';
  for(const f of t.folders){
    const row=document.createElement('div'); row.className='row';
    row.style.gridTemplateColumns='1fr auto';
    const title=document.createElement('div'); title.className='title'; title.textContent=f.title;
    const del=ghost('🗑️', ()=>{
      if(t.items.some(it=>it.folderId===f.id)){ alert('Сначала уберите элементы из папки'); return; }
      t.folders=t.folders.filter(x=>x.id!==f.id); save(); renderFoldersList(t); renderChecklist(t);
    });
    row.append(title, del); box.append(row);
  }
}
function assignFolder(t,it){
  if(!t.folders.length){ alert('Сначала создайте папку в меню «Папки».'); return; }
  const names = t.folders.map((f,i)=>`${i+1}. ${f.title}`).join('\n');
  const pick = prompt('Куда поместить?\n'+names+'\n0 — Без папки', '0');
  const n = Number(pick||'0');
  if(!isFinite(n)) return;
  if(n<=0) it.folderId=null;
  else {
    const f=t.folders[n-1]; if(!f) return; it.folderId=f.id;
  }
  save(); renderChecklist(t);
}

// PDF
function openPdfMenu(taskId){
  const t=state.tasks.find(x=>x.id===taskId); if(!t) return;
  state.currentTaskId=taskId;
  show(els.pdfModal);
  els.daysRow.classList.add('hidden');
}
function pdfChecklist(){
  const t=state.tasks.find(x=>x.id===state.currentTaskId); if(!t) return;
  els.daysRow.classList.remove('hidden');
  const days = Math.max(1, Math.min(60, Number(els.daysCount.value)||7));
  // build printable HTML
  const cols = ['#','Пункт', ...Array.from({length:days},(_,i)=>dateAdd(i))];
  const rows = [];
  let idx=1;
  for(const it of t.items){ rows.push([idx++, it.title]); }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(t.title)}</title>
    <style>body{font-family:Arial,sans-serif;padding:16px}h2{margin:0 0 12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:6px 8px;text-align:left}th{background:#f0f3f8}</style>
  </head><body>
    <h2>${escapeHtml(t.title)}</h2>
    <table>
      <thead><tr>${cols.map(c=>'<th>'+escapeHtml(c)+'</th>').join('')}</tr></thead>
      <tbody>
        ${rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+escapeHtml(r[1])+'</td>'+Array.from({length:days},()=>'<td></td>').join('')+'</tr>').join('')}
      </tbody>
    </table>
  </body></html>`;
  openPrint(html);
}
function pdfDescription(){
  const t=state.tasks.find(x=>x.id===state.currentTaskId); if(!t) return;
  const blocks = t.items.map((it,i)=>{
    const pics = (it.photos||[]).map(src=>`<img src="${src}" style="width:120px;height:120px;object-fit:cover;border:1px solid #ccc;border-radius:8px;margin-right:6px;margin-bottom:6px">`).join('');
    const note = it.note? `<div style="white-space:pre-wrap">${escapeHtml(it.note)}</div>`:'';
    return `<div style="margin:0 0 14px">
      <div style="font-weight:bold">${i+1}. ${escapeHtml(it.title)}</div>
      ${note}
      <div>${pics}</div>
    </div>`;
  }).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(t.title)}</title>
  <style>body{font-family:Arial,sans-serif;padding:16px}h2{margin:0 0 12px}</style></head>
  <body><h2>${escapeHtml(t.title)}</h2>${blocks}</body></html>`;
  openPrint(html);
}
function openPrint(html){
  const w = window.open('', '_blank'); w.document.open(); w.document.write(html); w.document.close(); w.focus();
  // iOS users can use share → Save PDF
}
function dateAdd(d){
  const dt=new Date(); dt.setDate(dt.getDate()+d);
  const dd=String(dt.getDate()).padStart(2,'0'); const mm=String(dt.getMonth()+1).padStart(2,'0');
  return dd+'.'+mm;
}
function escapeHtml(s){ return String(s).replace(/[&<>]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m])); }

// Confirm
function confirmDelete(fn){
  if(confirm('Точно удалить?')) fn();
}

// Events
els.addTaskBtn.onclick = () => {
  const v=(els.newTaskInput.value||'').trim(); if(!v) return;
  addTask(v); els.newTaskInput.value='';
};
els.tabs.forEach(tab=>{
  tab.onclick=()=>{ state.tab=tab.dataset.tab; renderHome(); };
});
els.backHome.onclick = ()=>{ location.hash=''; };
els.addItemBtn.onclick = ()=>{
  const v=(els.newItemInput.value||'').trim(); if(!v) return;
  addItem(v); els.newItemInput.value='';
};

els.pdfBtn.onclick = ()=> openPdfMenu(state.currentTaskId);
els.pdfChecklist.onclick = ()=> pdfChecklist();
els.pdfDescription.onclick = ()=> pdfDescription();
els.pdfClose.onclick = ()=> hide(els.pdfModal);

els.foldersBtn.onclick = ()=> openFolders();
els.addFolderBtn.onclick = ()=>{
  const t=state.tasks.find(x=>x.id===state.currentTaskId); if(!t) return;
  const v=(els.folderName.value||'').trim(); if(!v) return;
  t.folders.push({id:uid(), title:v}); els.folderName.value=''; save(); renderFoldersList(t); renderChecklist(t);
};
els.foldersClose.onclick = ()=> hide(els.foldersModal);
els.deleteTaskBtn.onclick = ()=> confirmDelete(()=> removeTask(state.currentTaskId));

els.backTask.onclick = ()=>{ location.hash='#/task/'+state.currentTaskId; };
els.delItemBtn.onclick = ()=>{
  const t=state.tasks.find(x=>x.id===state.currentTaskId);
  const it=t?.items.find(x=>x.id===state.currentItemId);
  if(!t||!it) return;
  confirmDelete(()=>{ removeItem(t,it); location.hash='#/task/'+t.id; });
};
els.noteArea.oninput = ()=>{
  const t=state.tasks.find(x=>x.id===state.currentTaskId);
  const it=t?.items.find(x=>x.id===state.currentItemId); if(!it) return;
  it.note = els.noteArea.value; save();
};
els.addPhotoBtn.onclick = ()=> els.photoInput.click();
els.photoInput.onchange = async (e)=>{
  const file=e.target.files[0]; if(!file) return;
  const t=state.tasks.find(x=>x.id===state.currentTaskId);
  const it=t?.items.find(x=>x.id===state.currentItemId); if(!it) return;
  const reader=new FileReader();
  reader.onload=()=>{ it.photos.push(reader.result); save(); renderGallery(it.photos); };
  reader.readAsDataURL(file);
};
els.clearPhotosBtn.onclick = ()=>{
  const t=state.tasks.find(x=>x.id===state.currentTaskId);
  const it=t?.items.find(x=>x.id===state.currentItemId); if(!it) return;
  if(!it.photos.length) return;
  confirmDelete(()=>{ it.photos=[]; save(); renderGallery(it.photos); });
};

function show(el){ el.style.display='flex'; }
function hide(el){ el.style.display='none'; }

// Start
renderHome();
handleHash();

// PWA SW
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}

})();