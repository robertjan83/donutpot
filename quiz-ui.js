
import {QUIZ_QUESTIONS} from './quiz-questions.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {collection,doc,onSnapshot,getDoc,getDocs,query,where,runTransaction,writeBatch,serverTimestamp,setDoc,addDoc} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const END=Date.parse('2026-11-03T23:55:00+01:00');
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const delayRandom=()=>{const b=new Uint32Array(1);crypto.getRandomValues(b);return b[0]/4294967296;};
function schedule(){
 const from=Date.now()+120000;
 if(from>=END-25*120000)throw Error('De periode tot en met 3 november is voorbij.');
 const width=(END-from)/25;
 return Array.from({length:25},(_,i)=>Math.floor(from+(i+.15+.7*delayRandom())*width));
}
export function installQuiz(auth,db){
 const el=document.getElementById('quizSection');
 if(!el)throw Error('Quizsection ontbreekt');
 let user=null,game=null,rounds=[],players=[],prizes=[],attempt=null,attemptId=null;
 let stop=[],stopAttempt=null,busy=false,notice='',privateKey='';
 const admin=()=>user?.email?.toLowerCase()==='rjpeetoom@gmail.com'&&user.emailVerified===true;
 const current=()=>rounds.find(x=>x.id===game?.currentRoundId);
 const name=id=>players.find(p=>p.id===id)?.name||'Speler';
 const pending=()=>prizes.filter(p=>p.redeemedDonutId===null);
 const report=x=>{notice=x;render();};
 function render(){
  if(!user){el.classList.add('hidden');return;}
  el.classList.remove('hidden');
  let s='<div class="quiz-top"><div><p class="eyebrow">// DONUT INTEL</p><h2>🎯 SQUAD QUIZ CHALLENGE</h2><p class="muted">25 vragen t/m 3 november · iedereen dezelfde vraag · één poging per speler.</p></div><strong>🏆 20% VOLGENDE DONUT</strong></div>';
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
   else if(Date.now()<round.startMs)s+='<p class="quiz-wait">⏳ Er staat een vraag klaar. Hij verschijnt op een willekeurig gepland moment.</p>';
   else{
    s+='<div class="quiz-current"><small>VRAAG '+round.index+' / 25</small><h3>'+safe(q.question)+'</h3>';
    if(attempt?.round===round.id)s+='<p class="quiz-missed">❌ Helaas, fout. Voor deze vraag kun je niet opnieuw antwoorden. De anderen mogen nog proberen.</p>';
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
  if(!confirm('Alle 25 vragen nu willekeurig plannen t/m 3 november voor de hele squad?'))return;
  busy=true;
  try{
   if((await getDoc(doc(db,'quizState','main'))).exists())throw Error('De quiz is al geactiveerd.');
   const dates=schedule(),batch=writeBatch(db);
   QUIZ_QUESTIONS.forEach((q,i)=>{
    batch.set(doc(db,'quizRounds',q.id),{index:i+1,startMs:dates[i],nextId:QUIZ_QUESTIONS[i+1]?.id||'done',winnerUid:null,createdAt:serverTimestamp()});
    batch.set(doc(db,'quizAnswers',q.id),{answer:secret[i],createdAt:serverTimestamp()});
   });
   batch.set(doc(db,'quizState','main'),{currentRoundId:'q01',createdAt:serverTimestamp()});
   await batch.commit();privateKey='';report('✓ De 25 quizvragen zijn ingepland voor de hele squad.');
  }catch(e){report('Activeren mislukt: '+(e.message||e.code));}finally{busy=false;render();}
 }
 async function answer(choice){
  if(busy||!user||!game)return;
  const r=current();if(!r||Date.now()<r.startMs||attempt?.round===r.id)return;
  busy=true;render();
  const sRef=doc(db,'quizState','main'),rRef=doc(db,'quizRounds',r.id);
  const aRef=doc(db,'quizRounds',r.id,'attempts',user.uid),pRef=doc(db,'quizPrizes',r.id);
  try{
   const won=await runTransaction(db,async t=>{
    const [s,round,old]=await Promise.all([t.get(sRef),t.get(rRef),t.get(aRef)]);
    if(!s.exists()||s.data().currentRoundId!==r.id||!round.exists()||round.data().winnerUid||old.exists())return false;
    t.set(aRef,{owner:user.uid,choice,result:'correct',answeredAt:serverTimestamp()});
    t.update(rRef,{winnerUid:user.uid,winningChoice:choice,answeredAt:serverTimestamp()});
    t.set(pRef,{owner:user.uid,awardedAt:serverTimestamp(),redeemedDonutId:null});
    t.update(sRef,{currentRoundId:r.nextId,updatedAt:serverTimestamp()});
    return true;
   });
   report(won?'🏆 JUIST! Jij was de eerste! Je hebt 20% korting op je volgende donut.':'Deze vraag is net door een ander gewonnen.');
  }catch(e){
   if(e.code!=='permission-denied'){report('Antwoord niet verwerkt: '+(e.message||e.code));}
   else{
    try{
     await setDoc(aRef,{owner:user.uid,choice,result:'wrong',answeredAt:serverTimestamp()});
     attempt={round:r.id,result:'wrong'};
     report('❌ Helaas fout! Je hebt voor deze vraag geen tweede kans.');
    }catch(err){report('Een andere speler was je voor. Bekijk de winnaar!');}
   }
  }finally{busy=false;render();}
 }
 function watchAttempt(){
  const r=current();
  if(!user||!r||attemptId===r.id)return;
  if(stopAttempt)stopAttempt();attemptId=r.id;attempt=null;
  stopAttempt=onSnapshot(doc(db,'quizRounds',r.id,'attempts',user.uid),
    d=>{attempt=d.exists()?{round:r.id,...d.data()}:null;render();},()=>{});
 }
 onAuthStateChanged(auth,u=>{
  stop.forEach(fn=>fn());stop=[];
  if(stopAttempt)stopAttempt();stopAttempt=null;attemptId=null;
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
