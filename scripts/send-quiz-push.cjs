/* DONUT OPS quiz notification sender
 * Runs in GitHub Actions every ~5 minutes. Requires 2 repository secrets:
 * FIREBASE_SERVICE_ACCOUNT_JSON and WEB_PUSH_PRIVATE_KEY.
 * Do not place either secret in committed files.
 */
'use strict';
const admin=require('firebase-admin');
const webpush=require('web-push');
const {migrateQuizWindows}=require('./migrate-quiz-schedule.cjs');

const PUBLIC_KEY='BA5yGMY7orlnz3M8uB329xlw383MPzmwaCGwEE3JdodR715mB5yV2eFh6PK5HlVfI6uK6tWW1EV-klLK4CWdFmw';
const END=Date.parse('2026-11-04T00:00:00+01:00');
const LEASE_MS=8*60*1000;

function requireEnv(key) {
  if(!process.env[key])throw new Error('GitHub Actions secret ontbreekt: '+key);
  return process.env[key];
}
async function main(){
  const serviceAccount=JSON.parse(requireEnv('FIREBASE_SERVICE_ACCOUNT_JSON'));
  admin.initializeApp({credential:admin.credential.cert(serviceAccount)});
  webpush.setVapidDetails('mailto:rjpeetoom@gmail.com',PUBLIC_KEY,requireEnv('WEB_PUSH_PRIVATE_KEY'));
  const db=admin.firestore();
  // Migrate a previously activated quiz once. A released question keeps its
  // original start and any played questions/prizes remain untouched.
  await migrateQuizWindows(db);
  const now=Date.now();
  if(now>=END){console.log('Quizperiode is voorbij; geen nieuwe meldingen.');return;}
  const stateRef=db.doc('quizState/main');

  // Cross-run reservation. A concurrent Actions run cannot announce the same
  // round twice. An abandoned claim is retryable after 8 minutes.
  const round=await db.runTransaction(async t=>{
    const state=await t.get(stateRef);
    const roundId=state.data()?.currentRoundId;
    if(!roundId||roundId==='done')return null;
    const ref=db.doc('quizRounds/'+roundId);
    const r=await t.get(ref);
    const data=r.data();
    if(!data||data.winnerUid||typeof data.startMs!=='number')return null;
    const phase=now>=data.startMs?'live':now>=data.startMs-30*60000?'ready':null;
    if(!phase)return null;
    const announcement=db.doc('quizAnnouncements/'+roundId+(phase==='ready'?'-ready':''));
    const previous=await t.get(announcement);
    if(previous.exists){
      const previousData=previous.data();
      if(previousData.status==='sent'||(previousData.leaseUntilMs||0)>now)return null;
    }
    t.set(announcement,{status:'sending',roundId,phase,leaseUntilMs:now+LEASE_MS,claimedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
    return {id:roundId,index:data.index,phase,startMs:data.startMs};
  });
  if(!round){console.log('Geen nieuwe quizvraag of Get Ready-moment om te melden.');return;}

  const subscriptions=await db.collection('pushDevices').get();
  const recipients=subscriptions.docs.filter(d=>{
    const s=d.data();
    return s.owner&&s.endpoint&&s.keys?.p256dh&&s.keys?.auth;
  });
  const isReady=round.phase==='ready';
  const message=JSON.stringify({
    type:isReady?'quiz-ready':'quiz',roundId:round.id,
    title:isReady?'🎮 GET READY! DONUT OPS':'🍩 Nieuwe DONUT OPS quizvraag!',
    body:isReady?'Binnen 30 minuten verschijnt vraag '+round.index+'/25. Houd je squad scherp!':
      'Vraag '+round.index+'/25 is beschikbaar. De eerste met het goede antwoord wint 20% korting!',
    url:'/donutpot/#quizSection'
  });
  console.log('Quizronde',round.id,'fase:',round.phase,'push-abonnementen:',recipients.length);
  let sent=0,failed=0;
  for(let offset=0;offset<recipients.length;offset+=20){
    const group=recipients.slice(offset,offset+20);
    const statuses=await Promise.all(group.map(async d=>{
      const data=d.data();
      try {
        await webpush.sendNotification(
          {endpoint:data.endpoint,keys:data.keys},message,
          {TTL:isReady?35*60:6*60*60,urgency:'high',topic:'donut-'+round.phase+'-'+round.id}
        );
        return {ok:true};
      }catch(error){
        const gone=error.statusCode===404||error.statusCode===410;
        if(gone){await d.ref.delete().catch(()=>{});}
        console.warn('Pushbezorging mislukt:',d.id,'status',error.statusCode||'onbekend');
        return {ok:false,gone};
      }
    }));
    for(const result of statuses){if(result.ok)sent++;else if(!result.gone)failed++;}
  }
  if(failed>0&&sent===0){
    // Reservation expires and subsequent cron invocations retry.
    throw new Error('Geen melding afgeleverd; '+failed+' tijdelijke fout(en).');
  }
  await db.doc('quizAnnouncements/'+round.id+(isReady?'-ready':'')).set({
    status:'sent',phase:round.phase,sentAt:admin.firestore.FieldValue.serverTimestamp(),
    sentCount:sent,failedCount:failed,leaseUntilMs:0
  },{merge:true});
  console.log('Meldingen verzonden:',round.phase,sent,'tijdelijke fouten:',failed);
}
main().catch(err=>{console.error('Quiz push sender:',err.message);process.exitCode=1;});
