import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { accountRequest } from '../lib/campaignApi';
import { checkDailyStats, numberInput } from '../../shared/manual-stats';

const endpoint='/api/stats?action=admin';
const money=(n:number)=>Number.isFinite(n)?`€${n.toFixed(2)}`:'—';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qyzylorda',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export default function StatisticsAdmin(){
 const [ads,setAds]=useState<any[]>([]),[adId,setAdId]=useState(''),[day,setDay]=useState(today);
 const [query,setQuery]=useState(''),[entry,setEntry]=useState<any>(null);
 const [views,setViews]=useState(''),[clicks,setClicks]=useState(''),[cpm,setCpm]=useState('');
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
 const [review,setReview]=useState(false),[revision,setRevision]=useState(0);
 const saving=useRef(false);
 useEffect(()=>{let active=true; accountRequest(endpoint).then(r=>{if(active)setAds(r.data)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[]);
 useEffect(()=>{
   let active=true;setEntry(null);setReview(false);setMessage('');setViews('');setClicks('');setCpm('');
   if(!adId||!day)return;
   setLoading(true);setError('');
   accountRequest(`${endpoint}&ad_id=${encodeURIComponent(adId)}&day=${encodeURIComponent(day)}`).then(r=>{
    if(!active)return;setEntry(r.data);setViews(r.data.row_count?String(r.data.views):'');setClicks(r.data.row_count?String(r.data.clicks):'');setCpm(String(r.data.cpm));
   }).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});
   return()=>{active=false};
 },[adId,day,revision]);
 const checked=entry?checkDailyStats(numberInput(views),numberInput(clicks),numberInput(cpm),Number(entry.campaign.budget),Number(entry.campaign.daily_budget),Number(entry.other_spend)):null;
 const problems=checked?.errors||[];
 const selected=ads.find(a=>a.id===adId);
 async function save(){
   if(!entry||!checked||problems.length||saving.current||!review)return;
   saving.current=true;setBusy(true);setError('');setMessage('');
   try{
    const r=await accountRequest(endpoint,{method:'POST',body:JSON.stringify({ad_id:adId,day,views:numberInput(views),clicks:numberInput(clicks),cpm:numberInput(cpm),revision:entry.revision})});
    setEntry(r.data);setReview(false);setMessage('Статистика сохранена. Показы, клики и расход доступны в клиентском кабинете.');
   }catch(e){setError(e instanceof Error?e.message:'Не удалось сохранить.');setReview(false)}
   finally{saving.current=false;setBusy(false)}
 }
 const field='mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400';
 return <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900">
  <div className="mx-auto max-w-5xl space-y-6">
   <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium text-sky-600">Monochrome · Администратор</p><h1 className="mt-1 text-2xl font-semibold">Перенос статистики</h1></div><Link to="/dashboard" className="text-sm text-sky-700">К объявлениям →</Link></header>
   <p className="max-w-3xl text-sm text-slate-600">Переносите итог за один день из рекламного кабинета. Используйте CPM в евро без агентской наценки. Общий расход проверяется по всем внесённым дням, дневной — по выбранной дате.</p>
   {error&&<div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
   {message&&<div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">{message}</div>}
   <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 className="text-lg font-medium">1. Объявление и дата</h2>
    <div className="mt-4 grid gap-4 md:grid-cols-3">
     <label className="text-sm">Поиск объявления или клиента<input className={field} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Название или клиент" disabled={busy}/></label>
     <label className="text-sm">Объявление<select className={field} value={adId} disabled={busy} onChange={e=>setAdId(e.target.value)}><option value="">Выберите объявление</option>{ads.filter(a=>a.id===adId||`${a.title} ${a.client_name} ${a.id}`.toLowerCase().includes(query.toLowerCase())).map(a=><option key={a.id} value={a.id}>{a.title||'Без названия'} · {a.client_name} · {a.id.slice(0,8)}</option>)}</select></label>
     <label className="text-sm">Дата отчёта<input type="date" max={today()} className={field} value={day} disabled={busy} onChange={e=>setDay(e.target.value)}/></label>
    </div>
    {selected&&<p className="mt-3 break-all text-xs text-slate-500">Клиент: {selected.client_name} · ID: {selected.id}</p>}
    {loading&&<p role="status" className="mt-4 text-sm">Загрузка статистики…</p>}
   </section>
   {entry&&<>
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
     <h2 className="text-lg font-medium">2. Показатели за день</h2>
     {entry.row_count>0&&<p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">За эту дату уже внесено {entry.views.toLocaleString('ru-RU')} показов и {entry.clicks.toLocaleString('ru-RU')} кликов. Сохранение заменит итог дня, не прибавляя его повторно. Прежняя запись останется в истории изменений.{entry.row_count>1?' Несколько записей за день будут объединены в дневной итог.':''}</p>}
     <div className="mt-4 grid gap-4 md:grid-cols-3">
      <label className="text-sm">Показы<input inputMode="numeric" className={field} value={views} disabled={busy} onChange={e=>{setViews(e.target.value);setReview(false)}} placeholder="Например, 50 000"/></label>
      <label className="text-sm">Клики<input inputMode="numeric" className={field} value={clicks} disabled={busy} onChange={e=>{setClicks(e.target.value);setReview(false)}} placeholder="Например, 250"/></label>
      <label className="text-sm">CPM, € за 1 000 показов<input inputMode="decimal" className={field} value={cpm} disabled={busy} onChange={e=>{setCpm(e.target.value);setReview(false)}} placeholder="Например, 2,00"/></label>
     </div>
     <p className="mt-3 text-xs text-slate-500">CPM можно уточнить по отчёту за этот день. Лимиты берутся из текущих настроек объявления. Дневной лимит 0 означает отсутствие ограничения.</p>
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
     <h2 className="text-lg font-medium">3. Проверка перед сохранением</h2>
     <dl className="mt-4 grid gap-5 sm:grid-cols-2 md:grid-cols-4">{[
      ['Расход за день',money(checked!.spend)],['Дневной лимит',Number(entry.campaign.daily_budget)>0?money(Number(entry.campaign.daily_budget)):'Без ограничения'],['Расход за другие дни',money(Number(entry.other_spend))],['Общий бюджет',money(Number(entry.campaign.budget))],['Расход после сохранения',money(checked!.total)],['Остаток общего бюджета',money(checked!.remaining)]
     ].map(([label,value])=><div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-lg font-medium">{value}</dd></div>)}</dl>
     <p className="mt-4 text-sm text-slate-500">Расход = показы × CPM ÷ 1 000. Бюджет не обязан быть израсходован полностью.</p>
     {problems.length>0?<div role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{problems.map(p=><p key={p}>{p}</p>)}<p className="mt-2 font-medium">Сохранение недоступно. Проверьте цифры и настройки бюджета.</p></div>:<p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">Расход укладывается в общий и дневной бюджет.</p>}
     {review&&<div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm">Подтвердите: <strong>{entry.campaign.title}</strong>, дата <strong>{day}</strong>, показы <strong>{views}</strong>, клики <strong>{clicks}</strong>, расход <strong>{money(checked!.spend)}</strong>. {entry.row_count>0?'Итог выбранного дня будет заменён.':'Будет добавлен новый день.'}</div>}
     <div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={busy||problems.length>0} onClick={()=>review?save():setReview(true)} className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">{busy?'Сохранение…':review?'Подтвердить и сохранить':'Проверить и продолжить'}</button><button type="button" disabled={busy} className="px-3 py-2 text-sm text-slate-600" onClick={()=>setRevision(n=>n+1)}>Загрузить день заново</button></div>
    </section>
   </>}
  </div>
 </main>;
}
