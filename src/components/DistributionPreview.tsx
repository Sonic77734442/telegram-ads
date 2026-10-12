import { distributeDaily } from '../../shared/distribution';
export function DistributionPreview(props:{seed:string;day:string;start:string;end:string;views:number;clicks:number}){
 try{
 const slots=distributeDaily(props.seed,props.day,props.start,props.end,props.views,props.clicks);
 const max=Math.max(...slots.map(s=>s.views),1);
 return <div className="my-4 rounded-lg bg-slate-50 p-4"><p className="mb-3 text-sm">Предпросмотр темпа показов · {slots.length} интервалов по 5 минут</p><svg viewBox={`0 0 ${slots.length*3} 84`} className="h-24 w-full" role="img" aria-label="Неравномерное распределение показов по времени">{slots.map((s,i)=><rect key={s.at} x={i*3} y={80-s.views/max*78} width="2" height={Math.max(.5,s.views/max*78)} fill="#0284c7"><title>{new Date(s.at).toLocaleTimeString('ru-RU',{timeZone:'Asia/Qyzylorda',hour:'2-digit',minute:'2-digit'})}: {s.views} показов, {s.clicks} кликов</title></rect>)}</svg><div className="flex justify-between text-xs text-slate-500"><span>{props.start}</span><span>{props.end}, UTC+5</span></div><p className="mt-2 text-xs text-slate-500">Итого: {props.views.toLocaleString('ru-RU')} показов · {props.clicks.toLocaleString('ru-RU')} кликов. Форма кривой фиксируется при запуске.</p></div>;
 }catch(e){return <p role="alert" className="my-3 text-sm text-red-700">{(e as Error).message}</p>}
}
