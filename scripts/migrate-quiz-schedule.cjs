/* One-time, server-side rescheduling of an already activated DONUT OPS quiz.
 * Uses the existing Firebase service account in GitHub Actions. Never changes
 * completed questions, answer attempts, winners or prizes. Only startMs of
 * genuinely future rounds is changed.
 */
'use strict';
const {randomInt}=require('node:crypto');

async function migrateQuizWindows(db){
 const {scheduleQuizRounds}=await import('../quiz-schedule.mjs');
 const stateRef=db.doc('quizState/main');
 const markerRef=db.doc('quizSchedule/windows-2026-v1');
 const ids=Array.from({length:25},(_,i)=>'q'+String(i+1).padStart(2,'0'));
 const refs=ids.map(id=>db.doc('quizRounds/'+id));
 const result=await db.runTransaction(async tx=>{
   const [state,marker,...rounds]=await Promise.all([
     tx.get(stateRef),tx.get(markerRef),...refs.map(ref=>tx.get(ref))
   ]);
   if(marker.exists)return {status:'already_updated'};
   if(!state.exists)return {status:'not_activated'};
   const currentId=state.data()?.currentRoundId;
   if(!currentId||currentId==='done')return {status:'finished'};
   const index=ids.indexOf(currentId);
   if(index<0)throw new Error('Quizstatus wijst naar onbekende ronde: '+currentId);
   const now=Date.now();
   const currentData=rounds[index].data();
   if(!currentData)throw new Error('Actieve ronde ontbreekt in Firestore: '+currentId);
   // The currently visible round must remain untouched if already released.
   const keepCurrent=currentData.startMs<=now || !!currentData.winnerUid;
   const startIndex=index+(keepCurrent?1:0);
   const toUpdate=[];
   for(let i=startIndex;i<ids.length;i++){
      const data=rounds[i].data();
      if(!data)throw new Error('Quizronde ontbreekt: '+ids[i]);
      if(data.winnerUid)continue;
      toUpdate.push({ref:refs[i],id:ids[i],oldStartMs:data.startMs});
   }
   if(!toUpdate.length){
     tx.set(markerRef,{version:1,updatedAt:Date.now(),status:'nothing_pending',preservedOpenRound:keepCurrent?currentId:null});
     return {status:'nothing_pending',openPreserved:keepCurrent?currentId:null};
   }
   // At least 31 minutes lead: in-app and push get-ready can precede the
   // earliest new question; random within allowed Amsterdam local dayparts.
   const rng=()=>randomInt(0,1000000)/1000000;
   const times=scheduleQuizRounds(toUpdate.length,now,rng);
   toUpdate.forEach((item,i)=>tx.update(item.ref,{startMs:times[i]}));
   tx.set(markerRef,{
      version:1,updatedAt:Date.now(),status:'rescheduled',
      changedCount:toUpdate.length,
      preservedOpenRound:keepCurrent?currentId:null,
      firstScheduledMs:times[0],lastScheduledMs:times[times.length-1]
   });
   return {status:'rescheduled',changedCount:toUpdate.length,
     preservedOpenRound:keepCurrent?currentId:null,
     first: new Date(times[0]).toISOString(),last:new Date(times.at(-1)).toISOString()};
 });
 console.log('Quiz venster-migratie:',JSON.stringify(result));
 return result;
}
module.exports={migrateQuizWindows};
