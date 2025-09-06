
(function(){
var badge=document.getElementById('badge'); function setBadge(s){ if(badge) badge.textContent='Boot: '+s; }
setBadge('JS');

var storeKey='mint_folders_reset';
var state={tasks:load(), tab:'all', taskId:null, itemId:null};

function uid(){return Math.random().toString(36).slice(2,10);}
function save(){ localStorage.setItem(storeKey, JSON.stringify(state.tasks)); }
function load(){ try{return JSON.parse(localStorage.getItem(storeKey)||'[]')}catch(e){return[]} }

// els
var els={
  home:byId('home'), task:byId('task'), note:byId('note'),
  taskInput:byId('taskInput'), taskAdd:byId('taskAdd'),
  taskList:byId('taskList'), emptyHome:byId('emptyHome'),
  tabs:[].slice.call(document.querySelectorAll('.tab')),
  toHome:byId('toHome'), taskPdf:byId('taskPdf'), taskFolders:byId('taskFolders'), taskDelete:byId('taskDelete'),
  taskTitle:byId('taskTitle'),
  itemInput:byId('itemInput'), itemAdd:byId('itemAdd'), checkList:byId('checkList'), emptyCheck:byId('emptyCheck'),
  toTask:byId('toTask'), itemDelete:byId('itemDelete'),
  noteTitle:byId('noteTitle'), noteArea:byId('noteArea'), addPhoto:byId('addPhoto'), clearPhotos:byId('clearPhotos'), photoInput:byId('photoInput'), gallery:byId('gallery'),
  // modals
  foldersModal:byId('foldersModal'), folderInput:byId('folderInput'), folderAdd:byId('folderAdd'), foldersList:byId('foldersList'), foldersClose:byId('foldersClose'),
  pdfModal:byId('pdfModal'), pdfChecklist:byId('pdfChecklist'), pdfDescription:byId('pdfDescription'), daysRow:byId('daysRow'), daysCount:byId('daysCount'), pdfClose:byId('pdfClose')
};

function byId(id){return document.getElementById(id);}
function show(el){el.style.display='flex'} function hide(el){el.style.display='none'}
function setView(v){ els.home.classList.toggle('hidden', v!=='home'); els.task.classList.toggle('hidden', v!=='task'); els.note.classList.toggle('hidden', v!=='note'); }

function normTask(t){
  if(!Array.isArray(t.items)) t.items=[];
  if(!Array.isArray(t.folders)) t.folders=[]; // {id,title}
  if(typeof t.done!=='boolean') t.done=false;
  t.items.forEach(function(it){
    if(typeof it.done!=='boolean') it.done=false;
    if(!Array.isArray(it.photos)) it.photos=[];
    if(typeof it.note!=='string') it.note='';
    if(typeof it.folderId==='undefined') it.folderId=null;
  });
  return t;
}

// Render Home
function renderHome(){
  var list=els.taskList; list.innerHTML='';
  var tasks=state.tasks.map(normTask);
  if(state.tab==='active') tasks=tasks.filter(function(t){return !t.done});
  if(state.tab==='done') tasks=tasks.filter(function(t){return t.done});
  els.emptyHome.style.display = tasks.length?'none':'block';
  tasks.forEach(function(t){
    var li=row(); li.dataset.id=t.id;
    var cb=checkbox(t.done, function(){ t.done=!t.done; save(); renderHome(); });
    var title=div('title', t.title);
    var buttons=actions([
      ['📄', function(){ openPdfMenu(t.id); }],
      ['🗑️', function(){ confirmDel(function(){ deleteTask(t.id); }); }]
    ]);
    var link=linkTo('#/task/'+t.id);
    li.append(cb,title,buttons,link); list.appendChild(li);
  });
}

function row(){ var el=document.createElement('li'); el.className='row'; return el; }
function div(cls, text){ var el=document.createElement('div'); el.className=cls; el.textContent=text||''; return el; }
function checkbox(checked, onch){ var el=document.createElement('input'); el.type='checkbox'; el.checked=!!checked; el.addEventListener('change', function(e){e.preventDefault(); e.stopPropagation(); onch();}); return el; }
function actions(list){ var wrap=document.createElement('div'); wrap.className='actions'; list.forEach(function(p){ wrap.append(ghost(p[0],p[1])); }); return wrap; }
function ghost(label, fn){ var b=document.createElement('button'); b.className='ghost'; b.textContent=label; b.onclick=function(e){ e.preventDefault(); e.stopPropagation(); fn(); }; return b; }
function linkTo(h){ var a=document.createElement('a'); a.className='row-link'; a.href=h; return a; }

function addTask(title){
  var t=normTask({id:uid(), title:title, done:false, items:[], folders:[]});
  state.tasks.push(t); save(); renderHome();
}
function deleteTask(id){
  state.tasks = state.tasks.filter(function(t){return t.id!==id}); save(); setView('home'); renderHome();
}

// Task (Checklist)
function openTask(id){
  var t=state.tasks.find(function(x){return x.id===id}); if(!t) { setView('home'); return; }
  state.taskId=id; normTask(t);
  els.taskTitle.textContent=t.title;
  setView('task'); renderChecklist(t);
}
function renderChecklist(t){
  var ul=els.checkList; ul.innerHTML='';
  els.emptyCheck.style.display = t.items.length?'none':'block';
  // group by folders
  var byFld=new Map();
  t.items.forEach(function(it){
    var key=it.folderId || 'ungrouped';
    if(!byFld.has(key)) byFld.set(key, []);
    byFld.get(key).push(it);
  });
  t.folders.forEach(function(f){
    var hdr=document.createElement('li'); hdr.className='group-header'; hdr.textContent='📁 '+f.title; ul.appendChild(hdr);
    var arr=byFld.get(f.id)||[]; if(!arr.length){ var e=document.createElement('li'); e.className='group-empty'; e.textContent='(пусто)'; ul.appendChild(e); }
    arr.forEach(function(it){ ul.appendChild(itemRow(t,it)); });
  });
  var un=byFld.get('ungrouped')||[];
  if(un.length){ var hdr=document.createElement('li'); hdr.className='group-header'; hdr.style.opacity='.75'; hdr.textContent='Без папки'; ul.appendChild(hdr); un.forEach(function(it){ ul.appendChild(itemRow(t,it)); }); }
  t.done = t.items.length>0 && t.items.every(function(x){return x.done}); save(); renderHome();
}
function itemRow(t,it){
  var li=row(); li.dataset.id=it.id;
  var cb=checkbox(it.done, function(){ it.done=!it.done; save(); renderChecklist(t); });
  var title=div('title', it.title);
  var buttons=actions([
    ['📁', function(){ assignFolder(t,it); }],
    ['✏️', function(){ renameItem(t,it); }],
    ['🗑️', function(){ confirmDel(function(){ removeItem(t,it); }); }]
  ]);
  var link=linkTo('#/note/'+t.id+'/'+it.id);
  li.append(cb,title,buttons,link); return li;
}
function addItem(title){
  var t=state.tasks.find(function(x){return x.id===state.taskId}); if(!t) return;
  t.items.push({id:uid(), title:title, done:false, note:'', photos:[], folderId:null});
  save(); renderChecklist(t);
}
function renameItem(t,it){
  var v=prompt('Название', it.title); if(v==null) return; it.title=(v||'').trim()||it.title; save(); renderChecklist(t);
}
function removeItem(t,it){
  t.items=t.items.filter(function(x){return x.id!==it.id}); save(); renderChecklist(t);
}

// Note
function openNote(tid,iid){
  var t=state.tasks.find(function(x){return x.id===tid}); if(!t){ setView('home'); return; }
  var it=t.items.find(function(x){return x.id===iid}); if(!it){ openTask(tid); return; }
  state.taskId=tid; state.itemId=iid;
  els.noteTitle.textContent=it.title; els.noteArea.value=it.note||''; renderGallery(it.photos||[]);
  setView('note');
}
function renderGallery(arr){ els.gallery.innerHTML=''; arr.forEach(function(src){ var im=new Image(); im.src=src; im.width=96; im.height=96; im.style.objectFit='cover'; im.style.borderRadius='10px'; im.style.border='1px solid var(--line)'; els.gallery.appendChild(im); }); }

// Folders
function openFolders(){
  var t=state.tasks.find(function(x){return x.id===state.taskId}); if(!t) return; normTask(t);
  els.folderInput.value=''; renderFoldersList(t); show(els.foldersModal);
}
function renderFoldersList(t){
  var box=els.foldersList; box.innerHTML='';
  t.folders.forEach(function(f){
    var r=document.createElement('div'); r.className='row'; r.style.gridTemplateColumns='1fr auto';
    var nm=div('title', f.title);
    var del=ghost('🗑️', function(){ if(t.items.some(function(it){return it.folderId===f.id})){ alert('Сначала уберите элементы из папки'); return; } t.folders=t.folders.filter(function(x){return x.id!==f.id}); save(); renderFoldersList(t); renderChecklist(t); });
    r.append(nm, del); box.appendChild(r);
  });
}
function assignFolder(t,it){
  if(!t.folders.length){ alert('Сначала создайте папку в меню «Папки».'); return; }
  var msg='Куда поместить?\\n'+t.folders.map(function(f,i){return (i+1)+'. '+f.title}).join('\\n')+'\\n0 — Без папки';
  var pick=prompt(msg,'0'); var n=Number(pick||'0'); if(!isFinite(n)) return;
  if(n<=0) it.folderId=null; else { var f=t.folders[n-1]; if(!f) return; it.folderId=f.id; }
  save(); renderChecklist(t);
}

// PDF
function openPdfMenu(taskId){ state.taskId=taskId; show(els.pdfModal); els.daysRow.style.display='none'; }
function pdfChecklist(){
  var t=state.tasks.find(function(x){return x.id===state.taskId}); if(!t) return;
  els.daysRow.style.display='flex'; var days=Math.max(1, Math.min(60, Number(els.daysCount.value)||7));
  var cols=['#','Пункт']; for(var i=0;i<days;i++){ cols.push(dateAdd(i)); }
  var rows=[]; for(var i2=0;i2<t.items.length;i2++){ rows.push([i2+1, t.items[i2].title]); }
  var html='<!doctype html><html><head><meta charset=utf-8><title>'+esc(t.title)+'</title><style>body{font-family:Arial,sans-serif;padding:16px}h2{margin:0 0 12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:6px 8px;text-align:left}th{background:#f0f3f8}</style></head><body><h2>'+esc(t.title)+'</h2><table><thead><tr>'+cols.map(function(c){return '<th>'+esc(c)+'</th>'}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+r[0]+'</td><td>'+esc(r[1])+'</td>'+Array.from({length:days}).map(function(){return '<td></td>'}).join('')+'</tr>'}).join('')+'</tbody></table></body></html>';
  printHtml(html);
}
function pdfDescription(){
  var t=state.tasks.find(function(x){return x.id===state.taskId}); if(!t) return;
  var blocks=t.items.map(function(it,i){ var pics=(it.photos||[]).map(function(src){return '<img src=\"'+src+'\" style=\"width:120px;height:120px;object-fit:cover;border:1px solid #ccc;border-radius:8px;margin-right:6px;margin-bottom:6px\">'}).join(''); var note=it.note?'<div style=\"white-space:pre-wrap\">'+esc(it.note)+'</div>':''; return '<div style=\"margin:0 0 14px\"><div style=\"font-weight:bold\">'+(i+1)+'. '+esc(it.title)+'</div>'+note+'<div>'+pics+'</div></div>'; }).join('');
  var html='<!doctype html><html><head><meta charset=utf-8><title>'+esc(t.title)+'</title><style>body{font-family:Arial,sans-serif;padding:16px}h2{margin:0 0 12px}</style></head><body><h2>'+esc(t.title)+'</h2>'+blocks+'</body></html>';
  printHtml(html);
}
function printHtml(html){ var w=window.open('','_blank'); w.document.open(); w.document.write(html); w.document.close(); w.focus(); }
function dateAdd(d){ var dt=new Date(); dt.setDate(dt.getDate()+d); var dd=('0'+dt.getDate()).slice(-2), mm=('0'+(dt.getMonth()+1)).slice(-2); return dd+'.'+mm; }
function esc(s){ return String(s).replace(/[&<>]/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[m]; }); }

function confirmDel(fn){ if(confirm('Точно удалить?')) fn(); }

// Events
els.taskAdd.onclick=function(){ var v=(els.taskInput.value||'').trim(); if(!v) return; addTask(v); els.taskInput.value=''; };
els.tabs.forEach(function(tab){ tab.onclick=function(){ state.tab=tab.dataset.tab; renderHome(); }; });
els.toHome.onclick=function(){ setView('home'); renderHome(); };
els.itemAdd.onclick=function(){ var v=(els.itemInput.value||'').trim(); if(!v) return; addItem(v); els.itemInput.value=''; };
els.taskPdf.onclick=function(){ openPdfMenu(state.taskId); };
els.pdfChecklist.onclick=function(){ pdfChecklist(); };
els.pdfDescription.onclick=function(){ pdfDescription(); };
els.pdfClose.onclick=function(){ hide(els.pdfModal); };
els.taskFolders.onclick=function(){ openFolders(); };
els.folderAdd.onclick=function(){ var t=state.tasks.find(function(x){return x.id===state.taskId}); if(!t) return; var v=(els.folderInput.value||'').trim(); if(!v) return; t.folders.push({id:uid(), title:v}); els.folderInput.value=''; save(); renderFoldersList(t); renderChecklist(t); };
els.foldersClose.onclick=function(){ hide(els.foldersModal); };
els.taskDelete.onclick=function(){ confirmDel(function(){ deleteTask(state.taskId); }); };
els.toTask.onclick=function(){ setView('task'); };
els.itemDelete.onclick=function(){ var t=state.tasks.find(function(x){return x.id===state.taskId}); var it=t&&t.items.find(function(x){return x.id===state.itemId}); if(!t||!it) return; confirmDel(function(){ removeItem(t,it); setView('task'); }); };
els.noteArea.oninput=function(){ var t=state.tasks.find(function(x){return x.id===state.taskId}); var it=t&&t.items.find(function(x){return x.id===state.itemId}); if(!it) return; it.note=els.noteArea.value; save(); };
els.addPhoto.onclick=function(){ els.photoInput.click(); };
els.photoInput.onchange=function(e){ var f=e.target.files[0]; if(!f) return; var reader=new FileReader(); reader.onload=function(){ var t=state.tasks.find(function(x){return x.id===state.taskId}); var it=t&&t.items.find(function(x){return x.id===state.itemId}); if(!it) return; it.photos.push(reader.result); save(); renderGallery(it.photos); }; reader.readAsDataURL(f); };
els.clearPhotos.onclick=function(){ var t=state.tasks.find(function(x){return x.id===state.taskId}); var it=t&&t.items.find(function(x){return x.id===state.itemId}); if(!it||!it.photos.length) return; confirmDel(function(){ it.photos=[]; save(); renderGallery(it.photos); }); };

// Router
window.addEventListener('hashchange', function(){ route(); });
function route(){ var h=location.hash.slice(1).split('/'); if(!h[0]){ setView('home'); renderHome(); return; } if(h[0]==='task'){ openTask(h[1]); } else if(h[0]==='note'){ openNote(h[1], h[2]); } else { setView('home'); renderHome(); } }
route();
setBadge('Ready');
})();