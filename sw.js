/* DONUT OPS: online-first shell, offline info page */
const CACHE_NAME = 'donutops-pwa-v5';
const PRECACHE = ['./offline.html','./manifest.webmanifest','./pwa.js','./quiz-ui.js','./quiz-questions.js','./offer-pricing.js','./donut-sound.js','./sounds/donut-cartoon.mp3','./sounds/donut-voices.mp3','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting()));
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
  if(PRECACHE.some(path=>new URL(path,self.registration.scope).href===url.href)){
    event.respondWith(caches.match(request).then(hit=>hit||fetch(request)));
  }
});
