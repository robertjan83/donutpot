
import {QUIZ_QUESTIONS} from './quiz-questions.js';
import {scheduleQuizRounds} from './quiz-schedule.mjs';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {collection,doc,onSnapshot,getDoc,getDocs,query,where,runTransaction,writeBatch,serverTimestamp,setDoc,addDoc} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
// Cryptographically random selection inside the two Europe/Amsterdam windows.
const delayRandom=()=>{const b=new Uint32Array(1);crypto.getRandomValues(b);return b[0]/4294967296;};
const schedule=()=>scheduleQuizRounds(25,Date.now(),delayRandom);
const untilLabel=ms=>{
 const seconds=Math.max(0,Math.ceil((ms-Date.now())/1000));
 return Math.floor(seconds/60)+' min '+String(seconds%60).padStart(2,'0')+' sec';
};
export function installQuiz(auth,db){
 const el=document.getElementById('quizSection');
 if(!el)throw Error('Quizsection ontbreekt');
 let user=null,game=null,rounds=[],players=[],prizes=[],attempt=null,attemptId=null;
 let stop=[],stopAttempt=null,busy=false,notice='',privateKey='';
 const attemptedClaim=new Set();
 const admin=()=>user?.email?.toLowerCase()==='rjpeetoom@gmail.com'&&user.emailVerified===true;
 const current=()=>rounds.find(x=>x.id===game?.currentRoundId);
 const name=id=>players.find(p=>p.id===id)?.name||'Speler';
 const pending=()=>prizes.filter(p=>p.redeemedDonutId===null);
 const report=x=>{notice=x;render();};
 function render(){
  if(!user){el.classList.add('hidden');return;}
  el.classList.remove('hidden');
  let s='<div class="quiz-top"><div><p class="eyebrow">// DONUT INTEL</p><h2>🎯 SQUAD QUIZ CHALLENGE</h2><p class="muted">25 vragen t/m 3 november · random 08:30–12:00 en 19:00–22:00 · één poging per speler.</p></div><strong>🏆 20% VOLGENDE DONUT</strong></div>';
  if(pending().length)s+='<p class="quiz-earned">🎟️ '+pending().length+' kortingsbon(nen) klaar voor je volgende donut(s).</p>';
  if(notice)s+='<p class="quiz-notice" role="status">'+safe(notice)+'</p>';
  if(!game){
   if(admin())s+='<div class="quiz-setup"><h3>🔐 Eenmalig quiz activeren</h3><p>Plak de privé antwoordcode van de quizmaster. Alleen Firestore-regels mogen daarna de juiste antwoorden lezen.</p><input id="quizKey" type="password" autocomplete="off" maxlength="25" placeholder="25 letters A–D" value="'+safe(privateKey)+'"><button id="quizStart" type="button">🎯 25 vragen plannen</button></div>';
   else s+='<p class="muted">De quizmaster plant binnenkort de eerste vraag.</p>';
  }else if(game.currentRoundId==='done'){
   s+='<p class="quiz-earned">Alle 25 vragen zijn gespeeld!</p>';
  }else{
   const round=current(),q=QUIZ_QUESTIONS.find(q=>q.id===round?.id);
   if(!round||!q)s+='<p class="muted">Vraag wordt geladen…</p>';
   else if(Date.now()<round.startMs){
    const timeLeft=round.startMs-Date.now();
    if(timeLeft<=30*60*1000){
      s+='<div class="quiz-ready" aria-live="off"><span class="quiz-ready-tag">🎮 GET READY, SQUAD!</span><h3>Nieuwe quizvraag binnen 30 minuten!</h3><p>⏱️ Nog <strong>'+untilLabel(round.startMs)+'</strong> · De eerste met het goede antwoord wint 20% korting.</p><div class="quiz-ready-track"><div style="width:'+Math.max(0,Math.min(100,(30*60*1000-timeLeft)/(30*60*1000)*100))+'%"></div></div></div>';
    }else{
      s+='<p class="quiz-wait">⏳ De volgende vraag komt op een willekeurig moment tussen 08:30–12:00 of 19:00–22:00. Vanaf 30 minuten ervoor start de Get Ready-aftelling!</p>';
    }
   }
   else{
    s+='<div class="quiz-current"><small>VRAAG '+round.index+' / 25</small><h3>'+safe(q.question)+'</h3>';
    if(attempt?.round===round.id)s+='<p class="quiz-missed">📝 Je enige antwoord is vastgelegd. Je kunt niet opnieuw kiezen. Het systeem controleert je poging automatisch.</p>';
    else s+='<div class="quiz-options">'+q.options.map((o,i)=>'<button class="quiz-option" type="button" data-answer="'+('ABCD'[i])+'" '+(busy?'disabled':'')+'><b>'+('ABCD'[i])+'</b> '+safe(o)+'</button>').join('')+'</div>';
    s+='</div>';
   }
  }
  const winners=rounds.filter(r=>r.winnerUid).sort((a,b)=>b.index-a.index).slice(0,5);
  if(winners.length)s+='<div class="quiz-winners"><strong>🏅 Wie won de korting?</strong>'+winners.map(r=>'<div><span>Vraag '+r.index+': <b>'+safe(name(r.winnerUid))+'</b></span><span>20% korting gewonnen</span></div>').join('')+'</div>';
  s+='<p class="quiz-foot">Een fout antwoord is definitief. De server wijst slechts één winnaar aan. Bij de volgende donut wordt de prijs automatisch gebruikt.</p>';
  el.innerHTML=s;
  const input=el.querySelector('#quizKey');if(input)input.oninput=()=>{privateKey=input.value.toUpperCase();};
  const start=el.querySelector('#quizStart');if(start)start.onclick=activate;
  el.querySelectorAll('[data-answer]').forEach(btn=>btn.onclick=()=>answer(btn.dataset.answer));
 }
 async function activate(){
  if(!admin()||busy)return;
  const secret=privateKey.trim().toUpperCase();
  if(!/^[ABCD]{25}$/.test(secret)){report('Vul precies 25 letters A t/m D in.');return;}
  if(!confirm('Alle 25 vragen willekeurig tussen 08:30–12:00 en 19:00–22:00 plannen t/m 3 november voor de hele squad?'))return;
  busy=true;
  try{
   if((await getDoc(doc(db,'quizState','main'))).exists())throw Error('De quiz is al geactiveerd.');
   const dates=schedule(),batch=writeBatch(db);
   QUIZ_QUESTIONS.forEach((q,i)=>{
    batch.set(doc(db,'quizRounds',q.id),{index:i+1,startMs:dates[i],nextId:QUIZ_QUESTIONS[i+1]?.id||'done',winnerUid:null,createdAt:serverTimestamp()});
    batch.set(doc(db,'quizAnswers',q.id),{answer:secret[i],createdAt:serverTimestamp()});
   });
   batch.set(doc(db,'quizState','main'),{currentRoundId:'q01',createdAt:serverTimestamp()});
   await batch.commit();privateKey='';report('✓ Alle vragen zijn willekeurig verdeeld over de ochtend- en avondvensters. Vanaf 30 minuten vooraf verschijnt een Get Ready-aftelling.');
  }catch(e){report('Activeren mislukt: '+(e.message||e.code));}finally{busy=false;render();}
 }
 async function claim(round,answerRef){
  const stateRef=doc(db,'quizState','main'),roundRef=doc(db,'quizRounds',round.id),prizeRef=doc(db,'quizPrizes',round.id);
  try{
   const won=await runTransaction(db,async t=>{
    // Attempt is already persisted, so an attacker cannot brute-force guesses
    // by submitting transactions that the server simply rejects.
    const [state,docRound,attemptDoc]=await Promise.all([t.get(stateRef),t.get(roundRef),t.get(answerRef)]);
    if(!state.exists()||state.data().currentRoundId!==round.id||!docRound.exists()||docRound.data().winnerUid||!attemptDoc.exists())return false;
    const choice=attemptDoc.data().choice;
    t.update(roundRef,{winnerUid:user.uid,winningChoice:choice,answeredAt:serverTimestamp()});
    t.set(prizeRef,{owner:user.uid,awardedAt:serverTimestamp(),redeemedDonutId:null});
    t.update(stateRef,{currentRoundId:round.nextId,updatedAt:serverTimestamp()});
    return true;
   });
   if(won){report('🏆 GOED! Jij was de eerste met een bevestigd goed antwoord. Je krijgt 20% korting op de volgende donut!');return true;}
   report('De vraag is inmiddels door iemand anders gewonnen.');
  }catch(e){
   if(e.code==='permission-denied'){report('❌ Helaas, jouw vastgelegde antwoord is fout. Een tweede poging is niet mogelijk.');}
   else report('Je antwoord is opgeslagen, maar controle lukt even niet: '+(e.message||e.code)+'. Open de pagina opnieuw.');
  }
  return false;
 }
 async function answer(choice){
  if(busy||!user||!game)return;
  const r=current();if(!r||Date.now()<r.startMs||attempt?.round===r.id)return;
  busy=true;render();
  const aRef=doc(db,'quizRounds',r.id,'attempts',user.uid);
  try{
   // Crucial: a guess is committed exactly once BEFORE testing correctness.
   // No speculative rejected write can be used to probe all four answers.
   await setDoc(aRef,{owner:user.uid,choice,answeredAt:serverTimestamp()});
   attempt={round:r.id,choice};
   await claim(r,aRef);
  }catch(e){
   report('Antwoord niet vastgelegd: '+(e.message||e.code));
  }finally{busy=false;render();}
 }
 function watchAttempt(){
  const r=current();
  if(!user||!r||attemptId===r.id)return;
  if(stopAttempt)stopAttempt();attemptId=r.id;attempt=null;
  stopAttempt=onSnapshot(doc(db,'quizRounds',r.id,'attempts',user.uid),
    d=>{
      attempt=d.exists()?{round:r.id,...d.data()}:null;
      render();
      // Resume a committed answer after the player reopens the PWA.
      if(attempt&&!busy&&!attemptedClaim.has(r.id)&&game?.currentRoundId===r.id){
        attemptedClaim.add(r.id);
        claim(r,doc(db,'quizRounds',r.id,'attempts',user.uid));
      }
    },()=>{});
 }
 onAuthStateChanged(auth,u=>{
  stop.forEach(fn=>fn());stop=[];
  if(stopAttempt)stopAttempt();stopAttempt=null;attemptId=null;
  attemptedClaim.clear();
  user=u;game=null;rounds=[];prizes=[];players=[];attempt=null;notice='';render();
  if(!u)return;
  stop.push(onSnapshot(doc(db,'quizState','main'),d=>{game=d.exists()?d.data():null;watchAttempt();render();},e=>report('Quizstatus niet toegankelijk: '+e.code)));
  stop.push(onSnapshot(collection(db,'quizRounds'),s=>{rounds=s.docs.map(d=>({id:d.id,...d.data()}));watchAttempt();render();},e=>report('Quizvragen niet toegankelijk: '+e.code)));
  stop.push(onSnapshot(collection(db,'players'),s=>{players=s.docs.map(d=>({id:d.id,...d.data()}));render();}));
  stop.push(onSnapshot(query(collection(db,'quizPrizes'),where('owner','==',u.uid)),s=>{prizes=s.docs.map(d=>({id:d.id,...d.data()}));render();},e=>report('Kortingen niet toegankelijk: '+e.code)));
 });
 setInterval(()=>{if(user&&!document.hidden)render();},15000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
 async function addDonut(owner){
  const s=await getDocs(query(collection(db,'quizPrizes'),where('owner','==',owner)));
  const todo=s.docs.filter(d=>d.data().redeemedDonutId===null).sort((a,b)=>(a.data().awardedAt?.seconds||0)-(b.data().awardedAt?.seconds||0));
  if(!todo.length)return addDoc(collection(db,'donuts'),{owner,paid:false,createdAt:serverTimestamp()});
  const prizeRef=todo[0].ref,donutRef=doc(collection(db,'donuts'));
  await runTransaction(db,async t=>{
   const prize=await t.get(prizeRef);
   if(!prize.exists()||prize.data().owner!==owner||prize.data().redeemedDonutId!==null)throw Error('De kortingsbon is inmiddels al gebruikt. Probeer opnieuw.');
   t.set(donutRef,{owner,paid:false,createdAt:serverTimestamp(),quizPrizeRound:prizeRef.id});
   t.update(prizeRef,{redeemedDonutId:donutRef.id,redeemedAt:serverTimestamp()});
  });
  return donutRef;
 }
 render();
 return {addDonut};
}
