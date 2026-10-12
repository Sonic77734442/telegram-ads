export type DistributionSlot = { at: string; views: number; clicks: number };
function randomFor(seed: string) {
 let state=2166136261;for(const c of seed)state=Math.imul(state^c.charCodeAt(0),16777619);
 return ()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
function allocate(total:number, weights:number[], caps=weights.map(()=>total)):number[]{
 const out=weights.map(()=>0);let remaining=total;
 let active=weights.map((_,i)=>i).filter(i=>weights[i]>0&&caps[i]>0);
 while(remaining>0&&active.length){
  const sum=active.reduce((s,i)=>s+weights[i],0);
  const limited=active.filter(i=>remaining*weights[i]/sum>=caps[i]-out[i]);
  if(limited.length){for(const i of limited){remaining-=caps[i]-out[i];out[i]=caps[i];}active=active.filter(i=>!limited.includes(i));continue;}
  const fractions=active.map(i=>{const share=remaining*weights[i]/sum;return {i,whole:Math.floor(share),fraction:share%1}});
  for(const x of fractions){out[x.i]+=x.whole;remaining-=x.whole;}
  fractions.sort((a,b)=>b.fraction-a.fraction||a.i-b.i);
  for(const x of fractions){if(!remaining)break;out[x.i]++;remaining--;}
 }
 if(remaining)throw new Error('Не удалось распределить итог.');return out;
}
export function distributionWindow(day:string,start:string,end:string){
 const minute=(s:string)=>{if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)&&s!=='24:00')return NaN;const [h,m]=s.split(':').map(Number);return h*60+m;};
 const a=minute(start),b=minute(end);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day||!Number.isFinite(a)||!Number.isFinite(b)||a>=b||b-a<5||a%5||b%5)throw new Error('Укажите интервал внутри одного дня, с шагом 5 минут.');
 return {startMs:Date.parse(day+'T00:00:00+05:00')+a*60000,endMs:Date.parse(day+'T00:00:00+05:00')+b*60000};
}
export function distributeDaily(seed:string,day:string,start:string,end:string,views:number,clicks:number):DistributionSlot[]{
 if(!Number.isInteger(views)||!Number.isInteger(clicks)||views<1||views>2147483647||clicks<0||clicks>views)throw new Error('Проверьте показы и клики.');
 const {startMs,endMs}=distributionWindow(day,start,end),rand=randomFor(seed+':'+day+':'+start+':'+end);
 const times:number[]=[],weights:number[]=[];let smooth=.5;
 for(let at=startMs+300000;at<=endMs;at+=300000){
  const hour=(new Date(at+5*3600000).getUTCHours()+new Date(at).getUTCMinutes()/60)%24;
  const profile=.12+.75*Math.exp(-Math.pow((hour-11)/3,2))+Math.exp(-Math.pow((hour-20)/3.5,2));
  smooth=.65*smooth+.35*rand();const pause=rand()<.06;
  times.push(at);weights.push(pause?0:profile*(.15+smooth)*(0.4+rand()*1.2));
 }
 if(weights.every(w=>w===0))weights[weights.length-1]=1;
 const v=allocate(views,weights);const c=allocate(clicks,v.map(x=>x*(.4+rand()*1.2)),v);
 return times.map((at,i)=>({at:new Date(at).toISOString(),views:v[i],clicks:c[i]}));
}
