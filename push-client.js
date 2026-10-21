/* DONUT OPS — voluntary browser push subscription for logged-in squad members */
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {doc,setDoc,deleteDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

// Public VAPID key. The corresponding PRIVATE key is only stored as a GitHub
// Actions secret, never in this repository or in Firestore.
const PUBLIC_VAPID='BA5yGMY7orlnz3M8uB329xlw383MPzmwaCGwEE3JdodR715mB5yV2eFh6PK5HlVfI6uK6tWW1EV-klLK4CWdFmw';
const OPT_IN='donutops-quiz-push-optin';

function b64urlBytes(input) {
  const padded=input.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-input.length%4)%4);
  const raw=atob(padded);
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
async function endpointId(url) {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(url));
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export function setupQuizNotifications(auth,db) {
  const btn=document.getElementById('quizPushBtn');
  const note=document.getElementById('quizPushStatus');
  if(!btn)return {disableBeforeSignOut:async()=>{}};
  let user=null,busy=false;
  const support=()=>({
    secure:window.isSecureContext,
    worker:'serviceWorker' in navigator,
    push:'PushManager' in window,
    notification:'Notification' in window && typeof Notification.requestPermission==='function',
    crypto:!!(window.crypto&&window.crypto.subtle)
  });
  const supported=()=>Object.values(support()).every(Boolean);
  const isIOS=/iPad|iPhone|iPod/i.test(navigator.userAgent||'');
  const isInstalled=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const isSamsungBrowser=/SamsungBrowser/i.test(navigator.userAgent||'');
  function guidance(){
    const available=support();
    if(isIOS&&!isInstalled)return 'Op iPhone werken webpushmeldingen alleen wanneer DONUT OPS via Safari aan het beginscherm is toegevoegd en als webapp wordt geopend (iOS 16.4 of nieuwer).';
    if(!available.secure)return 'Voor meldingen moet DONUT OPS via de beveiligde https://-website worden geopend.';
    if(!available.worker||!available.push||!available.notification||!available.crypto){
      const missing=[
        !available.worker?'Service Worker':null,
        !available.push?'Push API':null,
        !available.notification?'Notificaties API':null,
        !available.crypto?'Web Crypto':null
      ].filter(Boolean).join(', ');
      return 'Deze browser/PWA biedt niet alle meldingsfuncties ('+missing+'). '+
        (isSamsungBrowser?'Open DONUT OPS in de actuele Chrome-browser en installeer de PWA via Chrome.':'Open DONUT OPS in de nieuwste Chrome op Android, of via de geïnstalleerde Safari-PWA op iPhone.');
    }
    if(Notification.permission==='denied')return 'Meldingen zijn eerder geblokkeerd. Zet notificaties voor DONUT OPS en de gebruikte browser aan onder Android Instellingen > Apps > Meldingen én controleer de websitemachtigingen in Chrome of Samsung Internet.';
    return '';
  }
  const optedIn=()=>{try{return localStorage.getItem(OPT_IN)==='yes';}catch(e){return false;}};
  const remember=enabled=>{try{enabled?localStorage.setItem(OPT_IN,'yes'):localStorage.removeItem(OPT_IN);}catch(e){}};
  const inform=t=>{if(note)note.textContent=t;};
  function render(){
    btn.classList.toggle('hidden',!user);
    btn.disabled=busy;
    if(!user)return;
    if(!supported()){
      btn.textContent='🔕 Meldingen: hulp nodig?';
      btn.title='Tik om te zien waarom meldingen niet werken';
      btn.setAttribute('aria-pressed','false');
      inform(guidance());
      return;
    }
    const enabled=Notification.permission==='granted'&&optedIn();
    btn.textContent=enabled?'🔔 Quizmeldingen aan':Notification.permission==='denied'?'🔕 Meldingen geblokkeerd':'🔕 Quizmeldingen aanzetten';
    btn.title=Notification.permission==='denied'?'Tik voor hulp bij het toestaan van meldingen':'Zet meldingen voor nieuwe quizvragen aan of uit';
    btn.setAttribute('aria-pressed',String(enabled));
  }
  async function getRegistration(){
    let reg=await navigator.serviceWorker.getRegistration('./');
    if(!reg)reg=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
    // Ensure the service worker is active before subscribe(); some Samsung
    // devices open the installed PWA while an update is still installing.
    return (await navigator.serviceWorker.ready)||reg;
  }
  async function subscribeAndSave(){
    if(!user||!supported()||Notification.permission!=='granted')return;
    const uid=user.uid;
    const reg=await getRegistration();
    let subscription=await reg.pushManager.getSubscription();
    if(!subscription)subscription=await reg.pushManager.subscribe({
      userVisibleOnly:true,applicationServerKey:b64urlBytes(PUBLIC_VAPID)
    });
    const json=subscription.toJSON();
    if(!json.endpoint||!json.keys?.p256dh||!json.keys?.auth)throw Error('Geen volledige pushregistratie ontvangen.');
    await setDoc(doc(db,'pushDevices',await endpointId(json.endpoint)),{
      owner:uid,endpoint:json.endpoint,
      keys:{p256dh:json.keys.p256dh,auth:json.keys.auth},
      updatedAt:serverTimestamp()
    });
    inform('Je krijgt een melding wanneer er een nieuwe quizvraag beschikbaar is.');
  }
  async function deactivate(keepPreference=false){
    if(!keepPreference)remember(false);
    if(!user||!supported())return;
    const reg=await getRegistration();
    const subscription=await reg.pushManager.getSubscription();
    if(!subscription)return;
    const id=await endpointId(subscription.endpoint);
    // Delete only our own subscription. On shared devices another account's
    // registration must not be overwritten or deleted.
    await deleteDoc(doc(db,'pushDevices',id));
    await subscription.unsubscribe();
    inform('Quizmeldingen uitgeschakeld op dit apparaat.');
  }
  btn.addEventListener('click',async()=>{
    if(busy||!user)return;
    if(!supported()||Notification.permission==='denied'){
      inform(guidance());
      return;
    }
    busy=true;render();
    try{
      if(Notification.permission==='granted'&&optedIn()){
        await deactivate();
      }else{
        // The browser permission prompt is directly triggered by the tap.
        const permission=await Notification.requestPermission();
        if(permission!=='granted')throw Error(permission==='denied'?'De browser blokkeert meldingen. '+guidance():'Er is nog geen toestemming gegeven. Kies Toestaan wanneer de browser dat vraagt.');
        remember(true);
        await subscribeAndSave();
      }
    }catch(e){inform('Meldingen: '+(e.message||String(e)));}
    finally{busy=false;render();}
  });
  onAuthStateChanged(auth,async nextUser=>{
    user=nextUser;
    inform('');
    render();
    if(user&&supported()&&optedIn()&&Notification.permission==='granted'){
      try{await subscribeAndSave();}catch(e){inform('Meldingen opnieuw registreren: '+(e.message||e));}
    }else if(user&&supported()&&Notification.permission==='default'){
      inform('Tik op “Quizmeldingen aanzetten” om meldingen te ontvangen. Ook als de PWA dicht is.');
    }
  });
  navigator.serviceWorker?.addEventListener('message',event=>{
    if(event.data?.type==='donutops-quiz-available'){
      document.getElementById('quizSection')?.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });
  return {
    disableBeforeSignOut:async()=>{
      if(user&&optedIn()){
        // Opt-in survives logout and can be restored on the next login.
        try{await deactivate(true);}catch(e){console.warn('Quiz push logout:',e);}
      }
    }
  };
}
