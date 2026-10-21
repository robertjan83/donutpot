/* DONUT OPS — quiz schedule planner
 * One common module for GitHub Pages and the server-side GitHub Action.
 * All windows are Europe/Amsterdam local clock time (handles DST correctly).
 */
export const QUIZ_ZONE='Europe/Amsterdam';
export const QUIZ_END_MS=Date.parse('2026-11-04T00:00:00+01:00');
export const QUIZ_WINDOWS=[
  {startHour:8,startMinute:30,endHour:12,endMinute:0},
  {startHour:19,startMinute:0,endHour:22,endMinute:0}
];
export const QUIZ_LEAD_MS=31*60*1000;
const fmt=new Intl.DateTimeFormat('en-GB',{
  timeZone:QUIZ_ZONE,year:'numeric',month:'2-digit',day:'2-digit',
  hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
});
function parts(ms){
 const o=Object.fromEntries(fmt.formatToParts(new Date(ms))
   .filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
 return o;
}
export function localToMillis(year,month,day,hour,minute){
 const intended=Date.UTC(year,month-1,day,hour,minute);
 let candidate=intended;
 for(let i=0;i<4;i++){
   const current=parts(candidate);
   const actual=Date.UTC(current.year,current.month-1,current.day,current.hour,current.minute,current.second);
   const offset=intended-actual;
   candidate+=offset;
   if(offset===0)break;
 }
 return candidate;
}
export function availableQuizWindows(fromMs,untilMs=QUIZ_END_MS,minLeadMs=QUIZ_LEAD_MS){
 if(!Number.isFinite(fromMs)||!Number.isFinite(untilMs)||untilMs<=fromMs)return [];
 const local=parts(fromMs),first=Date.UTC(local.year,local.month-1,local.day);
 const windows=[];
 for(let day=0;day<60;day++){
  const d=new Date(first+day*86400000),y=d.getUTCFullYear(),m=d.getUTCMonth()+1,dd=d.getUTCDate();
  const midnight=localToMillis(y,m,dd,0,0);
  if(midnight>=untilMs)break;
  for(const slot of QUIZ_WINDOWS){
   const from=localToMillis(y,m,dd,slot.startHour,slot.startMinute);
   const to=localToMillis(y,m,dd,slot.endHour,slot.endMinute);
   const start=Math.max(from,fromMs+minLeadMs);
   const end=Math.min(to,untilMs);
   if(end-start>=8*60000)windows.push({start,end,day:dd,month:m,year:y});
  }
 }
 return windows;
}
export function scheduleQuizRounds(count,fromMs=Date.now(),rng=Math.random){
 if(!Number.isInteger(count)||count<0||count>25)throw Error('Ongeldig aantal quizvragen.');
 if(count===0)return [];
 const windows=availableQuizWindows(fromMs);
 if(!windows.length)throw Error('Geen toegestane quizmomenten tot 3 november beschikbaar.');
 // If we have enough dayparts, sample distinct windows. Otherwise spread
 // questions evenly across the remaining dayparts, allowing >1 in a window.
 let picked=[];
 if(count<=windows.length){
  const remaining=windows.map((_,i)=>i);
  for(let i=0;i<count;i++){
   const index=Math.min(remaining.length-1,Math.floor(rng()*remaining.length));
   picked.push(windows[remaining.splice(index,1)[0]]);
  }
 }else{
  for(let i=0;i<count;i++)picked.push(windows[Math.floor(i*windows.length/count)]);
 }
 const allocations=new Map();
 for(const w of picked){
  const id=w.year+'-'+w.month+'-'+w.day+'-'+w.start+'-'+w.end;
  const value=allocations.get(id)||{window:w,quantity:0};
  value.quantity++;
  allocations.set(id,value);
 }
 const times=[];
 for(const {window:w,quantity} of allocations.values()){
  const firstMinute=Math.ceil(w.start/60000)*60000;
  const lastMinute=Math.floor((w.end-60000)/60000)*60000;
  for(let i=0;i<quantity;i++){
   const fraction=(i+0.15+0.7*rng())/quantity;
   const at=Math.round((firstMinute+(lastMinute-firstMinute)*fraction)/60000)*60000;
   times.push(at);
  }
 }
 times.sort((a,b)=>a-b);
 if(times.length!==count||times.some((t,i)=>t>=QUIZ_END_MS||(i&&t<=times[i-1])))
   throw Error('Planning kon niet zonder overlappende vragen worden gemaakt.');
 return times;
}
export function isAllowedQuizTime(ms){
 if(!Number.isFinite(ms)||ms>=QUIZ_END_MS)return false;
 const p=parts(ms),minute=p.hour*60+p.minute;
 return QUIZ_WINDOWS.some(w=>minute>=w.startHour*60+w.startMinute&&minute<w.endHour*60+w.endMinute);
}
