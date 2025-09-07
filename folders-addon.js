
// folders-addon.js — безопасное расширение без правок core-кода
(function(){
  const LOG_PREFIX = '[folders-addon]';
  console.log(LOG_PREFIX,'loaded');

  function ensureModals(){
    if(!document.getElementById('folderPickerModal')){
      const m=document.createElement('div');
      m.id='folderPickerModal';
      m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.2);display:none;align-items:flex-end;justify-content:center;padding:16px;z-index:9999';
      m.innerHTML=`<div style="background:#fff;border-radius:16px;padding:12px;min-width:min(520px,95vw);max-height:85vh;overflow:auto;box-shadow:0 10px 30px rgba(0,0,0,.2)">
        <h3 style="margin:0 0 8px">Добавить в папку</h3>
        <div id="folderPickerList"></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
          <button type="button" id="folderPickerClose" class="ghost">Отмена</button>
        </div>
      </div>`;
      document.body.appendChild(m);
      m.querySelector('#folderPickerClose').onclick=()=>{m.style.display='none';};
    }
    if(!document.getElementById('folderViewModal')){
      const v=document.createElement('div');
      v.id='folderViewModal';
      v.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.2);display:none;align-items:flex-end;justify-content:center;padding:16px;z-index:9999';
      v.innerHTML=`<div style="background:#fff;border-radius:16px;padding:12px;min-width:min(520px,95vw);max-height:85vh;overflow:auto;box-shadow:0 10px 30px rgba(0,0,0,.2)">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <h3 id="folderViewTitle" style="margin:0">Папка</h3>
          <button type="button" id="folderViewClose" class="ghost">Закрыть</button>
        </div>
        <ul id="folderViewList" class="list" style="margin-top:12px;padding:0;list-style:none"></ul>
      </div>`;
      document.body.appendChild(v);
      v.querySelector('#folderViewClose').onclick=()=>{v.style.display='none';};
    }
  }

  function showPicker(taskId,itemId){
    ensureModals();
    try{
      const t=(window.tasks||[]).find(x=>x.id===taskId); if(!t) return;
      const it=(t.items||[]).find(i=>i.id===itemId); if(!it) return;
      const folders=(t.items||[]).filter(x=>x.type==='folder');
      const modal=document.getElementById('folderPickerModal');
      const list=document.getElementById('folderPickerList');
      list.innerHTML='';
      if(folders.length===0){
        const p=document.createElement('p'); p.textContent='В этой задаче пока нет папок.'; list.appendChild(p);
      }else{
        folders.forEach(f=>{
          const b=document.createElement('button'); b.type='button'; b.className='ghost'; b.textContent='📁 '+f.title;
          b.onclick=()=>{ it.folderId=f.id; (window.save&&save()); modal.style.display='none'; (window.renderChecklist&&renderChecklist(t)); };
          list.appendChild(b);
        });
      }
      if(it.folderId){
        const sep=document.createElement('div'); sep.style.margin='8px 0'; list.appendChild(sep);
        const u=document.createElement('button'); u.type='button'; u.className='ghost'; u.textContent='⏏️ Убрать из папки';
        u.onclick=()=>{ delete it.folderId; (window.save&&save()); modal.style.display='none'; (window.renderChecklist&&renderChecklist(t)); };
        list.appendChild(u);
      }
      modal.style.display='flex';
    }catch(e){ console.warn(LOG_PREFIX,'picker error',e); }
  }

  function openFolder(taskId,folderId){
    ensureModals();
    try{
      const t=(window.tasks||[]).find(x=>x.id===taskId); if(!t) return;
      const f=(t.items||[]).find(i=>i.id===folderId && i.type==='folder'); if(!f) return;
      const v=document.getElementById('folderViewModal');
      const ttl=v.querySelector('#folderViewTitle');
      const lst=v.querySelector('#folderViewList');
      ttl.textContent=f.title; lst.innerHTML='';
      const arr=(t.items||[]).filter(x=>x.type!=='folder' && x.folderId===f.id);
      if(arr.length===0){
        const li=document.createElement('li'); li.className='row';
        const sp=document.createElement('div'); const tt=document.createElement('div'); tt.className='title'; tt.textContent='Пусто';
        const ac=document.createElement('div'); ac.className='actions'; li.append(sp,tt,ac); lst.appendChild(li);
      } else {
        arr.forEach(it=>{
          const li=document.createElement('li'); li.className='row'; li.dataset.id=it.id;
          const sp=document.createElement('div'); const tt=document.createElement('div'); tt.className='title'; tt.textContent=it.title;
          const ac=document.createElement('div'); ac.className='actions';
          const openBtn=document.createElement('button'); openBtn.type='button'; openBtn.className='ghost'; openBtn.textContent='↗️';
          openBtn.onclick=()=>{ location.hash='#/note/'+t.id+'/'+it.id; v.style.display='none'; };
          ac.append(openBtn); li.append(sp,tt,ac); lst.appendChild(li);
        });
      }
      v.style.display='flex';
    }catch(e){ console.warn(LOG_PREFIX,'open folder error',e); }
  }

  // добавление кнопки 📂 и клик по папке — через делегирование
  function wireList(list, taskId){
    if(!list || list.__foldersWired) return;
    list.__foldersWired = true;

    list.addEventListener('click', function(e){
      const li = e.target.closest('li.row'); if(!li) return;
      const id = li.dataset && li.dataset.id; if(!id) return;
      const t=(window.tasks||[]).find(x=>x.id===taskId); if(!t) return;
      const it=(t.items||[]).find(i=>i.id===id); if(!it) return;

      // клик по папке — открыть
      if(it.type==='folder'){
        if(e.target.tagName==='BUTTON' || e.target.closest('button')) return;
        openFolder(taskId, id);
      }
    });

    // добавить кнопки 📂 для подзадач (однократно на текущем рендере)
    const t=(window.tasks||[]).find(x=>x.id===taskId); if(!t) return;
    (list.querySelectorAll('li.row[data-id]')||[]).forEach(li=>{
      const id=li.dataset.id;
      const it=(t.items||[]).find(i=>i.id===id);
      if(!it || it.type==='folder') return;
      const actions=li.querySelector('.actions')||li.lastElementChild;
      if(actions && !actions.querySelector('.moveToFolderBtn')){
        const btn=document.createElement('button');
        btn.type='button'; btn.className='ghost moveToFolderBtn'; btn.textContent='📂';
        btn.onclick=(e)=>{ e.preventDefault(); e.stopPropagation(); showPicker(taskId,id); };
        actions.appendChild(btn);
      }
    });
  }

  // наблюдаем за переходами и рендерами
  function tryWire(){
    const view=document.getElementById('view-detail') || document.querySelector('[data-view="detail"]') || document;
    const list = view.querySelector('.list') || view.querySelector('ul');
    const tId  = (window.location.hash.match(/#\/task\/([^\/]+)/)||[])[1] || (window.current && current.task && current.task.id);
    if(list && tId){ wireList(list, tId); }
  }

  // Публичные функции на window (чтобы статичные обработчики могли звать)
  window.showPicker = showPicker;
  window.openFolder = openFolder;

  // первый запуск
  document.addEventListener('DOMContentLoaded', tryWire);
  window.addEventListener('hashchange', ()=>setTimeout(tryWire,0));
  // на всякий случай — наблюдатель за DOM
  const mo=new MutationObserver(()=>setTimeout(tryWire,0));
  mo.observe(document.documentElement, {subtree:true, childList:true});
})();
