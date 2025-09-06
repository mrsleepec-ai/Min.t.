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
    }
  }
} else {
  tasks = [];
}

const els = {
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
  emptyCheck: document.getElementById('emptyCheck'),
  // lightbox
  lightbox: document.getElementById('lightbox'),
  lightboxImg: document.getElementById('lightboxImg'),
};

function save() { localStorage.setItem(storeKey, JSON.stringify(tasks)); }
function uid() { return Math.random().toString(36).slice(2, 10); }

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
function ghost(text, onClick) {
  const btn = document.createElement('button');
  btn.className = 'ghost'; btn.type = 'button'; btn.textContent = text;
  btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
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
function removeTask(id) {
  tasks = tasks.filter(x => x.id !== id);
  save();
  if (currentId === id) location.hash = '#/';
  showList();
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
    } else {
      const attachBtn = ghost('📎', () => attachPhoto(task.id, it.id));
      actions.append(attachBtn, editBtn, delBtn);
    }

    li.append(cb, title, actions);
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
function removeItem(taskId, itemId) {
  const t = tasks.find(x => x.id === taskId);
  if (!t) return;
  t.items = t.items.filter(i => i.id !== itemId);
  save(); renderChecklist(t);
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
function attachPhoto(taskId, itemId) {
  // Simple choice: Camera or Gallery
  const choice = window.prompt('Фото: введите 1 — Камера, 2 — Галерея', '2');
  if (choice === null) return;
  const useCamera = String(choice).trim() === '1';

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

function removePhoto(taskId, itemId) {
  const t = tasks.find(x => x.id === taskId);
  if (!t) return;
  const it = t.items.find(i => i.id === itemId);
  if (!it) return;
  it.photo = null;
  save(); renderChecklist(t);
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
