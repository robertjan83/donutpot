const zone='Europe/Amsterdam';
const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});
export const stampMs=item=>item.createdAt?.toMillis?.()??(item.createdAt?.seconds?item.createdAt.seconds*1000:0);
export function validBirthday(month,day){
 if(!Number.isInteger(month)||month<1||month>12||!Number.isInteger(day))return false;
 const dt=new Date(Date.UTC(2000,month-1,day));
 return dt.getUTCMonth()===month-1&&dt.getUTCDate()===day;
}
export function birthdayWeek(ms,birth){
 if(!birth||!validBirthday(birth.month,birth.day))return false;
 const f=Object.fromEntries(fmt.formatToParts(new Date(ms)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
 const date=Date.UTC(f.year,f.month-1,f.day);
 for(const year of [f.year-1,f.year,f.year+1]){
  const leap=year%4===0&&(year%100!==0||year%400===0);
  const day=birth.month===2&&birth.day===29&&!leap?28:birth.day;
  const b=Date.UTC(year,birth.month-1,day);
  const monday=b-((new Date(b).getUTCDay()+6)%7)*86400000;
  if(date>=monday&&date<monday+7*86400000)return true;
 }
 return false;
}
export const offerValid=o=>o&&Number.isInteger(o.startMs)&&Number.isInteger(o.endMs)&&
 o.endMs>o.startMs&&Number.isInteger(o.maxDonuts)&&o.maxDonuts>=1&&
 Number.isInteger(o.percent)&&o.percent>=0&&o.percent<=100;
export const offerUsed=(o,entries)=>entries.filter(e=>e.owner===o.owner&&stampMs(e)>=o.startMs&&stampMs(e)<o.endMs).length;
export function promotionRates(entries,players,offers){
 const rates=new Map(),birthdays=new Map(players.map(p=>[p.id,p.birthday]));
 for(const e of entries){const ms=stampMs(e);if(ms&&birthdayWeek(ms,birthdays.get(e.owner)))rates.set(e.id,{percent:20,kind:'verjaardag'});}
 const sorted=[...entries].sort((a,b)=>stampMs(a)-stampMs(b)||a.id.localeCompare(b.id));
 for(const o of offers){
  if(!offerValid(o))continue;
  let used=0;
  for(const e of sorted){
   if(e.owner!==o.owner)continue;
   const ms=stampMs(e);
   if(!ms||ms<o.startMs||ms>=o.endMs)continue;
   if(used>=o.maxDonuts)break;
   used++;
   const prev=rates.get(e.id);
   if(!prev||o.percent>prev.percent)rates.set(e.id,{percent:o.percent,kind:'actie'});
  }
 }
 return rates;
}
export function calculateDebt(entries,players,offers,owner,basePercent){
 const outstanding=entries.filter(e=>e.owner===owner&&!e.paid);
 const rates=promotionRates(entries,players,offers);
 let cents=0,extra=0,birthdays=0,actions=0;
 for(const d of outstanding){
  const promo=rates.get(d.id);
  const pct=Math.max(basePercent,promo?.percent??0);
  cents+=100-pct;
  if(promo&&promo.percent>basePercent){extra++;if(promo.kind==='verjaardag')birthdays++;else actions++;}
 }
 return {count:outstanding.length,cents,gross:outstanding.length*100,saved:outstanding.length*100-cents,extra,birthdays,actions};
}
