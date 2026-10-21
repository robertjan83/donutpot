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
  const supported=('serviceWorker' in navigator)&&('PushManager' in window)&&
    ('Notification' in window)&&Boolean(crypto?.subtle);
  const optedIn=()=>{try{return localStorage.getItem(OPT_IN)==='yes';}catch(e){return false;}};
  const remember=enabled=>{try{enabled?localStorage.setItem(OPT_IN,'yes'):localStorage.removeItem(OPT_IN);}catch(e){}};
  const inform=t=>{if(note)note.textContent=t;};
  function render(){
    btn.classList.toggle('hidden',!user);
    btn.disabled=busy;
    if(!user)return;
    if(!supported){btn.textContent='🔕 Meldingen niet ondersteund';btn.disabled=true;return;}
    const enabled=Notification.permission==='granted'&&optedIn();
    btn.textContent=enabled?'🔔 Quizmeldingen aan':'🔕 Quizmeldingen aanzetten';
    btn.setAttribute('aria-pressed',String(enabled));
  }
  async function getRegistration(){
    let reg=await navigator.serviceWorker.getRegistration('./');
    if(!reg)reg=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
    return reg;
  }
  async function subscribeAndSave(){
    if(!user||!supported||Notification.permission!=='granted')return;
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
    if(!user||!supported)return;
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
    if(busy||!user||!supported)return;
    busy=true;render();
    try{
      if(Notification.permission==='granted'&&optedIn()){
        await deactivate();
      }else{
        if(Notification.permission==='denied')
          throw Error('Meldingen staan geblokkeerd. Zet ze aan bij de instellingen van DONUT OPS op je telefoon.');
        // The browser permission prompt is directly triggered by the tap.
        const permission=await Notification.requestPermission();
        if(permission!=='granted')throw Error('Geen toestemming voor meldingen gegeven.');
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
    if(user&&supported&&optedIn()&&Notification.permission==='granted'){
      try{await subscribeAndSave();}catch(e){inform('Meldingen opnieuw registreren: '+(e.message||e));}
    }else if(user&&supported&&Notification.permission==='default'){
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
