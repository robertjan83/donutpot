/* DONUT OPS: online-first shell, offline info page */
const CACHE_NAME = 'donutops-pwa-v7';
const PRECACHE = ['./offline.html','./manifest.webmanifest','./pwa.js','./quiz-ui.js','./push-client.js','./quiz-questions.js','./offer-pricing.js','./donut-sound.js','./sounds/donut-cartoon.mp3','./sounds/donut-voices.mp3','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install', event => {
  // A new worker refreshes its cached files from the network, instead of
  // copying an older HTTP-cached version into a newer Cache Storage.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE.map(path => new Request(path, {cache:'reload'}))))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('donutops-pwa-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(()=>caches.match(new URL('./offline.html',self.registration.scope))));
    return;
  }
  // Voice clips and app scripts need fresh versions even inside an installed
  // PWA. Fetch them online first, but retain the last cached copy for offline.
  const mutable=/\/(?:pwa|donut-sound|quiz-ui|quiz-questions|offer-pricing)\.js$/.test(url.pathname)
    || /\/sounds\/[^/]+\.mp3$/.test(url.pathname);
  if(mutable){
    event.respondWith((async () => {
      try {
        const response=await fetch(request,{cache:'no-cache'});
        if(!response.ok)throw new Error('Server returned '+response.status);
        const cache=await caches.open(CACHE_NAME);
        await cache.put(request,response.clone());
        return response;
      }catch(err){
        return (await caches.match(request,{ignoreSearch:true}))||Response.error();
      }
    })());
    return;
  }
  if(PRECACHE.some(path=>new URL(path,self.registration.scope).href===url.href)){
    event.respondWith(caches.match(request).then(hit=>hit||fetch(request)));
  }
});

/* Visible Web Push notifications for the installed Android and iOS PWAs. */
self.addEventListener('push',event=>{
  let payload={};
  try{payload=event.data?.json()||{};}catch(error){payload={};}
  if(payload.type!=='quiz')return;
  const title=typeof payload.title==='string'?payload.title:'🍩 DONUT OPS quiz!';
  const body=typeof payload.body==='string'?payload.body:'Een nieuwe vraag staat klaar! Wees de eerste met het goede antwoord.';
  event.waitUntil(self.registration.showNotification(title,{
    body,
    icon:'./icons/icon-192.png',
    badge:'./icons/icon-192.png',
    tag:'donutops-'+String(payload.roundId||'quiz'),
    renotify:false,
    data:{roundId:String(payload.roundId||'')},
    requireInteraction:false
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=new URL('./#quizSection',self.registration.scope).href;
  event.waitUntil((async()=>{
    const windows=await clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=windows.find(c=>c.url.startsWith(self.registration.scope));
    if(existing){
      await existing.focus();
      existing.postMessage({type:'donutops-quiz-available'});
      return;
    }
    await clients.openWindow(url);
  })());
});
