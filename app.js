// Minimal Tasks v4 — фото вложения для подзадач (локально), PDF без картинок
const storeKey = 'minimal_tasks_v4';
// ==== App meta/version ====
const APP_VERSION = "v21";
function safeParse(k, fallback){ try { return JSON.parse(localStorage.getItem(k) || ''); } catch { return fallback; } }


let tasks = safeParse(storeKey, null) || safeParse('minimal_tasks_v3', null) || safeParse('minimal_tasks_v2', []) || [];
let filter = 'all';
let currentId = null;

// migrate schema
if (Array.isArray(tasks)) {
  for (const t of tasks) {
    if (!Array.isArray(t.items)) t.items = [];
    for (const it of t.items) {
      if (typeof it.photo !== 'string') it.photo = null; // dataURL or null
      if (typeof it.photoKey !== 'string') it.photoKey = null;
      if (typeof it.note !== 'string') it.note = '';
      if (!Array.isArray(it.notePhotoKeys)) it.notePhotoKeys = [];
    }
  }
} else {
  tasks = [];
}

const els = {
  confirmModal: document.getElementById('confirmModal'),
  confirmText: document.getElementById('confirmText'),
  confirmCancel: document.getElementById('confirmCancel'),
  confirmOk: document.getElementById('confirmOk'),
  viewList: document.getElementById('view-list'),
  viewDetail: document.getElementById('view-detail'),
  appTitle: document.getElementById('appTitle'),
  // list view
  list: document.getElementById('list'),
  empty: document.getElementById('empty'),
  addForm: document.getElementById('addForm'),
  newTitle: document.getElementById('newTitle'),
  filterButtons: Array.from(document.querySelectorAll('.filters button')),
  // detail view
  detailTitle: document.getElementById('detailTitle'),
  addCheckForm: document.getElementById('addCheckForm'),
  newCheck: document.getElementById('newCheck'),
  checkList: document.getElementById('checkList'),
  // note view
  viewNote: document.getElementById('view-note'),
  crumbTask: document.getElementById('crumbTask'),
  noteTitle: document.getElementById('noteTitle'),
  noteSubtaskText: document.getElementById('noteSubtaskText'),
  noteText: document.getElementById('noteText'),
  saveNoteBtn: document.getElementById('saveNoteBtn'),
  clearNoteBtn: document.getElementById('clearNoteBtn'),
  emptyCheck: document.getElementById('emptyCheck'),
  // lightbox
  lightbox: document.getElementById('lightbox'),
  lightboxImg: document.getElementById('lightboxImg'),
};

function save() { localStorage.setItem(storeKey, JSON.stringify(tasks)); }
function showConfirm(message, onOk){
  // focus-safe modal

  els.confirmText.textContent = message;
  els.confirmModal.style.display = 'flex';
  function cleanup(){ els.confirmModal.style.display='none'; els.confirmOk.onclick=null; els.confirmCancel.onclick=null; document.removeEventListener('keydown', onKey); }
  function onKey(ev){ if(ev.key==='Escape'){ cleanup(); } }
  document.addEventListener('keydown', onKey);
  els.confirmCancel.onclick = ()=> cleanup();
  els.confirmOk.onclick = ()=>{ cleanup(); onOk(); };
}
function uid() { return Math.random().toString(36).slice(2, 10); }

// --- IndexedDB helpers for photos in notes ---
const DB_NAME = 'mtasks'; const DB_VER = 1;
let dbPromise = null;
function openDB(){
  if (!('indexedDB' in window)) return null;
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}
async function idbSet(key, blob){
  const db = await openDB(); if (!db) throw new Error('IDB unavailable');
  return new Promise((res, rej)=>{ const tx=db.transaction('photos','readwrite'); tx.objectStore('photos').put(blob, key); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); });
}
async function idbGet(key){
  const db = await openDB(); if (!db) return null;
  return new Promise((res, rej)=>{ const tx=db.transaction('photos','readonly'); const req=tx.objectStore('photos').get(key); req.onsuccess=()=>res(req.result||null); req.onerror=()=>rej(req.error); });
}
async function idbDel(key){
  const db = await openDB(); if (!db) return;
  return new Promise((res, rej)=>{ const tx=db.transaction('photos','readwrite'); tx.objectStore('photos').delete(key); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); });
}
function dataURLtoBlob(dataUrl){
  const [meta, b64] = dataUrl.split(','); const mime = (meta.match(/data:(.*?);/)||[])[1] || 'image/jpeg';
  const bin = atob(b64); const u8 = new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i);
  return new Blob([u8], {type:mime});
}


function wrap16(str, n) {
  const s = String(str);
  let out = '';
  for (let i = 0; i < s.length; i += n) {
    out += s.slice(i, i + n);
    if (i + n < s.length) out += '\n';
  }
  return out;
}

/* ---------- ROUTER ---------- */
function route() {
  const hash = location.hash || '#/';
  const parts = hash.slice(2).split('/');
  if (parts[0] === '' || parts[0] === undefined) {
    currentId = null; showList();
  } else if (parts[0] === 'task' && parts[1]) {
    currentId = parts[1]; showDetail(parts[1]);
  } else if (parts[0] === 'note' && parts[1] && parts[2]) {
    showNote(parts[1], parts[2]);
  } else {
    location.hash = '#/';
  }
}
window.addEventListener('hashchange', route);
window.addEventListener('load', route);

/* ---------- LIST VIEW ---------- */
function showList() {
  els.viewList.hidden = false;
  els.viewDetail.hidden = true;
  if (els.viewNote) els.viewNote.hidden = true;
  els.appTitle.textContent = 'Minimal Tasks';

  const base = tasks.filter(t => filter === 'all' || (filter === 'active' ? !t.done : t.done));
  els.list.innerHTML = '';
  els.empty.hidden = base.length > 0;

  for (const t of base) {
    const li = document.createElement('li');
    li.className = 'task' + (t.done ? ' done' : '');
    li.dataset.id = t.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = t.done;
    checkbox.addEventListener('click', (e) => { e.stopPropagation(); toggleTask(t.id); });

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = t.title;

    const actions = document.createElement('div');
    actions.className = 'actions';
    const pdfBtn = ghost('📄 PDF', () => openPdfDialog(t.id));
    const delBtn = ghost('🗑️', () => removeTask(t.id));
    actions.append(pdfBtn, delBtn);

    li.append(checkbox, title, actions);
    li.addEventListener('click', () => openTask(t.id));
    els.list.append(li);
  }
}
function ghost(text, onClick) { /*wrapped*/
  const btn = document.createElement('button');
  btn.className = 'ghost'; btn.type = 'button'; btn.textContent = text;
  btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onClick(); });
  return btn;
}
function addTask(title) {
  tasks.push({ id: uid(), title: title.trim(), done: false, createdAt: Date.now(), items: [] });
  save(); showList();
}
function toggleTask(id) {
  const t = tasks.find(x => x.id === id);
  if (t) { t.done = !t.done; save(); showList(); }
}
function removeTask(id){
  showConfirm('Удалить задачу?', ()=>{
    tasks = tasks.filter(t => t.id !== id);
    save(); showTasks();
  });
}
function openTask(id) { location.hash = '#/task/' + id; }

els.addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = els.newTitle.value.trim();
  if (!value) return;
  addTask(value);
  els.newTitle.value = '';
  els.newTitle.focus();
});
els.filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    els.filterButtons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
    btn.classList.add('active'); btn.setAttribute('aria-selected', 'true');
    filter = btn.dataset.filter;
    showList();
  });
});

/* ---------- DETAIL VIEW (checklist + photo) ---------- */
function showDetail(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) { location.hash = '#/'; return; }

  els.viewList.hidden = true;
  els.viewDetail.hidden = false;
  if (els.viewNote) els.viewNote.hidden = true;
  els.appTitle.textContent = task.title;
  els.detailTitle.textContent = task.title;

  renderChecklist(task);
}
function renderChecklist(task) {
  const items = task.items || [];
  els.checkList.innerHTML = '';
  els.emptyCheck.hidden = items.length > 0;

  for (const it of items) {
    const li = document.createElement('li');
    li.className = it.done ? 'done' : '';
    li.dataset.id = it.id;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = it.done;
    cb.addEventListener('change', () => toggleItem(task.id, it.id));

    const title = document.createElement('div');
    title.className = 'title';
    // title + optional thumbnail
    const content = document.createElement('div');
    content.className = 'thumb-wrap';
    const titleText = document.createElement('span');
    titleText.className = 'wrap-16';
    titleText.textContent = wrap16(it.title, 20);
    content.append(titleText);
    if (it.photo) {
      const img = document.createElement('img');
      img.src = it.photo;
      img.className = 'thumb';
      img.alt = 'Фото подзадачи';
      img.addEventListener('click', (e) => { e.stopPropagation(); openLightbox(it.photo); });
      content.append(img);
    }
    title.append(content);

    const actions = document.createElement('div');
    actions.className = 'actions';
    const editBtn = ghost('✏️', () => editItem(task.id, it.id));
    const delBtn = ghost('🗑️', () => removeItem(task.id, it.id));
    if (it.photo) {
      const removePhotoBtn = ghost('🖼️✖︎', () => removePhoto(task.id, it.id));
      actions.append(removePhotoBtn, editBtn, delBtn);
    actions.addEventListener('click', (e) => e.stopPropagation());
    } else {
      const attachBtn = ghost('📎', () => attachPhoto(task.id, it.id));
      actions.append(attachBtn, editBtn, delBtn);
    actions.addEventListener('click', (e) => e.stopPropagation());
    }

    li.append(cb, title, actions);
    // Overlay link on the entire row (reliable tap)
    const rowLink = document.createElement('a');
    rowLink.className = 'row-link';
    rowLink.href = '#/note/' + task.id + '/' + it.id;
    li.append(rowLink);
    els.checkList.append(li);
  }
}

function addItem(taskId, text) {
  const t = tasks.find(x => x.id === taskId);
  if (!t) return;
  (t.items ||= []).push({ id: uid(), title: text.trim(), done: false, photo: null });
  save(); renderChecklist(t);
}
function toggleItem(taskId, itemId) {
  const t = tasks.find(x => x.id === taskId);
  if (!t) return;
  const it = t.items.find(i => i.id === itemId);
  if (!it) return;
  it.done = !it.done;
  save(); renderChecklist(t);
}
function removeItem(taskId, itemId){
  showConfirm('Удалить подзадачу?', ()=>{
    const t = tasks.find(x => x.id === taskId); if (!t) return;
    t.items = (t.items||[]).filter(s => s.id !== itemId);
    save(); showDetail(taskId);
  });
}
function editItem(taskId, itemId) {
  const t = tasks.find(x => x.id === taskId);
  if (!t) return;
  const it = t.items.find(i => i.id === itemId);
  if (!it) return;
  const next = prompt('Изменить пункт:', it.title);
  if (next !== null) {
    it.title = next.trim();
    save(); renderChecklist(t);
  }
}

els.addCheckForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = els.newCheck.value.trim();
  if (!value || !currentId) return;
  addItem(currentId, value);
  els.newCheck.value = '';
});

/* ---------- Photo Attachments ---------- */
function attachPhoto(taskId, itemId) { // redirect to note and attach there
  // Simple choice: Camera or Gallery
  const choice = window.prompt('Фото: введите 1 — Камера, 2 — Галерея', '2');
  if (choice === null) return;
  const useCamera = String(choice).trim() === '1';

  location.hash = '#/note/' + taskId + '/' + itemId;
  setTimeout(()=>{
    const noteBtn = document.getElementById('noteAttachBtn'); if(noteBtn) noteBtn.click();
  }, 100);
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  if (useCamera) input.capture = 'environment'; // request camera
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataURL(file, 1600, 0.8);
      const t = tasks.find(x => x.id === taskId);
      if (!t) return;
      const it = t.items.find(i => i.id === itemId);
      if (!it) return;
      it.photo = dataUrl;
      save(); renderChecklist(t);
    } catch (e) {
      alert('Не удалось добавить фото: ' + e);
    }
  });
  input.click();
}

function removePhoto(taskId, itemId){
  const t = tasks.find(x => x.id === taskId); if (!t) return;
  const it = (t.items||[]).find(i => i.id === itemId); if (!it) return;
  showConfirm('Удалить фото?', ()=>{
    if (it.photoKey) { try { idbDel(it.photoKey); } catch(e){} it.photoKey = null; }
    it.photo = null;
    save(); renderChecklist(t);
  });
}

function compressImageToDataURL(file, maxW, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxW / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL('image/jpeg', quality);
        resolve(url);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---------- Lightbox ---------- */
function openLightbox(src) {
  els.lightboxImg.src = src;
  els.lightbox.style.display = 'flex';
}
els.lightbox.addEventListener('click', () => {
  els.lightbox.style.display = 'none';
  els.lightboxImg.src = '';
});

/* ---------- PDF EXPORT (unchanged: no photos) ---------- */
function openPdfDialog(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const type = prompt('PDF: 1 — Чек‑лист, 2 — Описание', '1');
  if (type && type.trim() === '2') { await exportDescriptionPDF(task); return; }
  const daysStr = prompt('Сколько дней (колонки дат) добавить?', '7');
  if (daysStr === null) return;
  const days = Math.max(1, Math.min(365, parseInt(daysStr || '7', 10)));

  const startStr = prompt('Начальная дата (ГГГГ-ММ-ДД). Пусто = сегодня', '');
  const startDate = startStr ? new Date(startStr) : new Date();
  if (isNaN(startDate.getTime())) { alert('Неверная дата'); return; }

  const win = window.open('', '_blank');
  if (!win) { alert('Разрешите всплывающие окна для генерации PDF'); return; }

  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    dates.push(d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' }));
  }

  const rows = (task.items && task.items.length ? task.items : [{title: ''}]).map((it, idx) => {
    const cells = dates.map(() => '<td></td>').join('');
    return `<tr><td class="n">${idx + 1}</td><td class="t">${escapeHtml(it.title || '')}</td>${cells}</tr>`;
  }).join('');

  const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>${escapeHtml(task.title)} — чек-лист</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: -apple-system, system-ui, "Segoe UI", Roboto, Arial; color: #111; }
  h1 { font-size: 20pt; margin: 0 0 12pt; text-align: center; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #222; padding: 6pt 6pt; font-size: 10pt; }
  th { background: #f2f2f2; text-align: center; }
  td.n { width: 28pt; text-align: center; }
  td.t { white-space: pre-wrap; }
  .meta { display: flex; justify-content: space-between; font-size: 10pt; margin-bottom: 8pt; }
  @media print { .no-print { display:none; } }
</style>
</head>
<body>
  <h1>${escapeHtml(task.title)}</h1>
  <div class="meta">
    <div>Всего пунктов: ${(task.items||[]).length}</div>
    <div>Начало: ${dates[0]} • Дней: ${days}</div>
  </div>
  <table>
    <colgroup>
      <col style=\"width:28pt\" />
      <col />
      ${dates.map(_ => '<col style=\\\"width:32pt\\\" />').join('')}
    </colgroup>
    <thead><tr><th>№</th><th>Пункт</th>${dates.map(d => `<th>${d}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="no-print" style="margin-top:12pt;"><button onclick="window.print()">Сохранить как PDF</button></div>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// initial render
route();

/* ---------- NOTE VIEW ---------- */
function showNote(taskId, itemId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) { location.hash = '#/'; return; }
  const it = (task.items || []).find(i => i.id === itemId);
  if (!it) { location.hash = '#/task/' + taskId; return; }

  els.viewList.hidden = true;
  els.viewDetail.hidden = true;
  els.viewNote.hidden = false;

  els.appTitle.textContent = 'Примечание';
  els.noteTitle.textContent = 'Примечание';
  els.crumbTask.textContent = task.title;
  els.crumbTask.href = '#/task/' + taskId;
  els.noteSubtaskText.textContent = it.title;
  els.noteText.value = it.note || '';
  const noteAttachBtn = document.getElementById('noteAttachBtn');
  const noteAttachInput = document.getElementById('noteAttachInput');
  renderNotePhotos(it);
  noteAttachBtn.onclick = (e)=>{ e.preventDefault(); e.stopPropagation(); noteAttachInput.removeAttribute('capture'); const choice = window.prompt('Фото: 1 — Камера, 2 — Галерея','2'); if(choice==='1') noteAttachInput.setAttribute('capture','environment'); noteAttachInput.click(); };
  noteAttachInput.onchange = async ()=>{ const f = noteAttachInput.files && noteAttachInput.files[0]; if(!f) return; await attachPhotoToNote(taskId, itemId, f); noteAttachInput.value=''; };

  // Autosave (already injected earlier if present)
  els.saveNoteBtn.onclick = () => {
    it.note = els.noteText.value; save();
    els.saveNoteBtn.textContent = 'Сохранено';
    setTimeout(() => els.saveNoteBtn.textContent = 'Сохранить', 800);
  };
  }


// --- Note Photos Logic ---
async function attachPhotoToNote(taskId, itemId, file){
  const t = tasks.find(x => x.id === taskId); if (!t) return;
  const it = (t.items||[]).find(i => i.id === itemId); if (!it) return;
  try {
    const dataUrl = await compressImageToDataURL(file, 1600, 0.8);
    const blob = dataURLtoBlob(dataUrl);
    const key = 'notephoto-' + itemId + '-' + Date.now() + '-' + Math.random().toString(36).slice(2,7);
    await idbSet(key, blob);
    it.notePhotoKeys.push(key);
    save();
    // If we are on note screen, render immediately
    if (!els.viewNote.hidden && els.noteText) renderNotePhotos(it);
  } catch (e) {
    alert('Не удалось добавить фото: ' + e);
  }
}
async function renderNotePhotos(it){
  const wrap = document.getElementById('notePhotos'); if (!wrap) return;
  wrap.innerHTML = '';
  for (const key of (it.notePhotoKeys||[])){
    const blob = await idbGet(key);
    if (!blob) continue;
    const url = URL.createObjectURL(blob);
    const w = document.createElement('div'); w.className='note-thumb-wrap';
    const img = document.createElement('img'); img.className='note-thumb'; img.src=url; img.alt='Фото';
    const del = document.createElement('button'); del.className='note-del'; del.textContent='✖';
    del.addEventListener('click', async (e)=>{ e.preventDefault(); e.stopPropagation(); await idbDel(key); it.notePhotoKeys = it.notePhotoKeys.filter(k=>k!==key); save(); renderNotePhotos(it); });
    img.addEventListener('click', ()=> openLightbox(url));
    w.append(img, del);
    wrap.append(w);
  }
}

async function blobToDataURL(blob){
  return await new Promise((res, rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(blob); });
}

async function exportDescriptionPDF(task){
  // Build sections with notes and photos
  const items = task.items || [];
  const sections = [];
  for (const [idx, it] of items.entries()){
    const photos = [];
    if (Array.isArray(it.notePhotoKeys)){
      for (const key of it.notePhotoKeys){
        const blob = await idbGet(key);
        if (blob) { const dataUrl = await blobToDataURL(blob); photos.push(dataUrl); }
      }
    }
    sections.push({ idx: idx+1, title: it.title || '', note: it.note || '', photos });
  }

  let html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<title>${task.title} — описание</title>
<style>
  @page { size: auto; margin: 14mm; }
  body { font-family: -apple-system, system-ui, "Segoe UI", Roboto, Arial; color: #111; }
  h1 { font-size: 18pt; margin: 0 0 10pt; text-align: center; }
  .section { page-break-inside: avoid; border: 1px solid #222; border-radius: 8px; padding: 10pt; margin: 0 0 10pt; }
  .h { font-weight: 700; margin-bottom: 6pt; }
  .note { white-space: pre-wrap; font-size: 10.5pt; margin: 6pt 0 4pt; }
  .photos { display: flex; gap: 6pt; flex-wrap: wrap; }
  .photos img { max-height: 120pt; border: 1px solid #999; border-radius: 6px; }
  .meta { display:flex; justify-content: space-between; font-size: 9pt; color:#333; margin: 2pt 0 8pt; }
  @media print { .no-print { display:none; } }
</style>
</head><body>
  <div class="no-print" style="text-align:right; margin-bottom:8pt;">
    <button onclick="window.print()">Печать/Сохранить в PDF</button>
  </div>
  <h1>${task.title}</h1>
`;

  for (const s of sections){
    html += `<div class="section">
      <div class="meta"><div>№ ${s.idx}</div><div></div></div>
      <div class="h">${s.title.replace(/</g,'&lt;')}</div>
      ${s.note ? `<div class="note">${s.note.replace(/</g,'&lt;')}</div>` : ''}
      ${s.photos && s.photos.length ? `<div class="photos">` + s.photos.map(u=>`<img src="${u}">`).join('') + `</div>` : ''}
    </div>`;
  }

  html += `</body></html>`;

  const win = window.open('', '_blank');
  win.document.open(); win.document.write(html); win.document.close();
}
