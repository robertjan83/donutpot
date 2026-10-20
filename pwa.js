(function(){
'use strict';
const banner=document.getElementById('pwaInstallBanner');
const navButton=document.getElementById('pwaInstallBtn');
const action=document.getElementById('pwaInstallAccept');
const later=document.getElementById('pwaInstallLater');
const close=document.getElementById('pwaInstallClose');
const instruction=document.getElementById('pwaInstallInstructions');
if(!banner||!navButton||!action||!later||!close||!instruction)return;
const ua=navigator.userAgent||'';
const ios=/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const android=/Android/i.test(ua);
const mobile=ios||android;
const storageKey='donutops-pwa-dismissed-until';
let deferredPrompt=null;
function standalone(){return window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}
function hidden(){banner.classList.add('hidden');}
function recentlyDismissed(){try{return Number(localStorage.getItem(storageKey)||0)>Date.now();}catch(e){return false;}}
function dismiss(){hidden();try{localStorage.setItem(storageKey,String(Date.now()+14*24*60*60*1000));}catch(e){}}
function guide(){
 instruction.classList.remove('hidden');
 if(ios){
  instruction.innerHTML='<strong>Op iPhone/iPad:</strong> Open DONUT OPS in Safari, tik op het deelmenu (vierkant met pijl omhoog), kies <strong>Zet op beginscherm</strong> en tik op <strong>Voeg toe</strong>. Schakel waar beschikbaar <strong>Open als webapp</strong> in.';
 }else{
  instruction.innerHTML='<strong>Op Android:</strong> Open DONUT OPS in Chrome. Tik rechtsboven op het menu <strong>⋮</strong>, kies <strong>App installeren</strong> of <strong>Toevoegen aan startscherm</strong> en bevestig.';
 }
 action.textContent='Begrepen';
}
function show(force){
 if(standalone())return;
 if(!force&&recentlyDismissed())return;
 instruction.classList.add('hidden');
 action.textContent=deferredPrompt?'📲 Installeer app':(ios?'📲 Hoe installeer ik?':'📲 App installeren');
 banner.classList.remove('hidden');
}
window.addEventListener('beforeinstallprompt',event=>{
 event.preventDefault();
 deferredPrompt=event;
 navButton.classList.remove('hidden');
 if(android)show(false);
});
window.addEventListener('appinstalled',()=>{
 deferredPrompt=null;
 navButton.classList.add('hidden');
 hidden();
 try{localStorage.removeItem(storageKey);}catch(e){}
});
navButton.addEventListener('click',()=>show(true));
later.addEventListener('click',dismiss);
close.addEventListener('click',dismiss);
action.addEventListener('click',async()=>{
 if(!instruction.classList.contains('hidden')){dismiss();return;}
 if(deferredPrompt){
  const prompt=deferredPrompt;deferredPrompt=null;
  try{
   await prompt.prompt();
   const choice=await prompt.userChoice;
   if(choice&&choice.outcome==='accepted'){hidden();return;}
   dismiss();
  }catch(e){guide();}
 }else{guide();}
});
window.addEventListener('load',()=>{
 if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(err=>console.warn('PWA service worker:',err));}
 if(standalone())return;
 if(mobile){
  navButton.classList.remove('hidden');
  window.setTimeout(()=>show(false),3500);
 }
});
})();
