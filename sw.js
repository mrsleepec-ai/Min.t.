// SW v45
const CACHE='minimal-tasks-cache-v55';
const ASSETS=['./','./index.html','./app.v58.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const ks=await caches.keys(); await Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)));})()); self.clients.claim();});
self.addEventListener('fetch',e=>{const r=e.request; if(r.method!=='GET')return; const u=new URL(r.url); if(u.pathname.endsWith('/sw.js'))return;
  e.respondWith((async()=>{const c=await caches.open(CACHE); const hit=await c.match(r); const net=fetch(r).then(res=>{ if(res&&res.ok) c.put(r,res.clone()); return res; }).catch(()=>null); return hit||net||Response.error();})());
});
self.addEventListener('message', e=>{ if(e.data&&e.data.type==='SKIP_WAITING'){ self.skipWaiting(); }});
