import {useState,useRef} from 'react';
import {accountRequest} from '../lib/campaignApi';

export default function CampaignActionsEditor({adId,initialActions}:{adId:string;initialActions:number}){
 const [value,setValue]=useState(String(initialActions)),[saved,setSaved]=useState(initialActions);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const saving=useRef(false);
 const count=/^\d+$/.test(value.trim())?Number(value):NaN;
 const valid=Number.isInteger(count)&&count>=0&&count<=2147483647;
 async function save(){
  if(!valid||saving.current)return;saving.current=true;setBusy(true);setError('');setMessage('');
  try{
   const r=await accountRequest('/api/stats?action=admin',{method:'POST',body:JSON.stringify({ad_id:adId,mode:'actions',actions:count,expected_actions:saved})});
   setSaved(r.data.actions);setValue(String(r.data.actions));setMessage('Целевые действия сохранены.');
  }catch(e){setError(e instanceof Error?e.message:'Не удалось сохранить Actions.');}
  finally{saving.current=false;setBusy(false);}
 }
 return <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
  <h2 className="text-lg font-medium">Actions — целевые действия</h2>
  <p className="mt-2 text-sm text-slate-600">Общий итог по объявлению за всё время, независимо от выбранной даты. Введите подтверждённые конверсии. Клики и расписание не меняют это число. Пока действий нет — 0.</p>
  <label className="mt-4 block text-sm">Целевые действия за всё время<input inputMode="numeric" value={value} disabled={busy} onChange={e=>{setValue(e.target.value);setMessage('');}} className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2.5"/></label>
  <button type="button" disabled={!valid||busy||count===saved} onClick={save} className="mt-3 rounded-lg bg-sky-600 px-5 py-2.5 text-sm text-white disabled:opacity-40">{busy?'Сохранение…':'Сохранить Actions'}</button>
  {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  {message&&<p role="status" className="mt-3 text-sm text-green-700">{message}</p>}
 </section>;
}
