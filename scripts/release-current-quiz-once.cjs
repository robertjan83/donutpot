/* One-time operator request: make the currently pending quiz round live.
 * All writes use the existing GitHub Actions Firebase service account.
 * The one-time marker prevents re-runs from accidentally releasing the next
 * question. No attempts, winners, discounts or answer keys are changed.
 */
'use strict';
const admin=require('firebase-admin');
const MARKER='quizAdminActions/release-2026-10-22-request';
async function main(){
 const encoded=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
 if(!encoded)throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON ontbreekt.');
 admin.initializeApp({credential:admin.credential.cert(JSON.parse(encoded))});
 const db=admin.firestore();
 const result=await db.runTransaction(async tx=>{
  const markerRef=db.doc(MARKER);
  const stateRef=db.doc('quizState/main');
  const [marker,state]=await Promise.all([tx.get(markerRef),tx.get(stateRef)]);
  if(marker.exists)return {status:'already-executed',...marker.data()};
  if(!state.exists)return {status:'not-activated',detail:'Activeer de quiz eerst in DONUT OPS.'};
  const roundId=state.data()?.currentRoundId;
  if(!roundId||roundId==='done')return {status:'finished'};
  const roundRef=db.doc('quizRounds/'+roundId),round=await tx.get(roundRef);
  if(!round.exists)throw new Error('Huidige vraag ontbreekt: '+roundId);
  const old=round.data(),now=Date.now();
  if(old.winnerUid)return {status:'already-won',roundId};
  const status=old.startMs>now?'released-now':'already-live';
  if(status==='released-now')tx.update(roundRef,{startMs:now-1000});
  tx.set(markerRef,{
   status,roundId,
   oldStartMs:old.startMs,
   releasedAt:admin.firestore.FieldValue.serverTimestamp()
  });
  return {status,roundId,originalStart:new Date(old.startMs).toISOString(),releasedAt:new Date(now).toISOString()};
 });
 console.log('DONUT OPS huidige quizvraag:',JSON.stringify(result));
}
main().catch(e=>{console.error('Vrijgeven mislukt:',e.message);process.exitCode=1;});
