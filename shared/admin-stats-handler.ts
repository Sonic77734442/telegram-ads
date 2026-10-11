import { getSupabaseAdmin } from '../api/supabaseAdmin.js';
import { checkDailyStats } from './manual-stats.js';
export async function adminStats(req: any, res: any, session: any) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (session.role !== 'admin') return res.status(403).json({error:'Доступ только для администратора.'});
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({error:'Method not allowed'});
  const db=getSupabaseAdmin();
  if(req.method==='GET' && !req.query.ad_id) {
    const {data,error}=await db.from('ad_campaigns').select('id,title,client_id,budget,daily_budget,cpm').order('created_at',{ascending:false}).limit(1000);
    if(error) return res.status(503).json({error:'Не удалось загрузить объявления.'});
    const {data:users,error:userError}=await db.from('users').select('user_id,username').limit(1000);
    if(userError) return res.status(503).json({error:'Не удалось загрузить клиентов.'});
    const names=new Map((users||[]).map((u:any)=>[u.user_id,u.username]));
    return res.status(200).json({data:(data||[]).map((a:any)=>({...a,client_name:names.get(a.client_id)||a.client_id}))});
  }
  const input=req.method==='POST'?req.body:req.query;
  const {ad_id,day}=input||{};
  if(typeof ad_id!=='string'||!/^[\da-f-]{36}$/i.test(ad_id)||typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day)
    return res.status(400).json({error:'Выберите объявление и корректную дату.'});
  const params:any={p_ad:ad_id,p_day:day};
  if(req.method==='POST') {
    const {views,clicks,cpm,revision}=input;
    const checked=checkDailyStats(views,clicks,cpm,Number.MAX_SAFE_INTEGER,0,0);
    if(checked.errors.length||typeof revision!=='string') return res.status(400).json({error:checked.errors[0]||'Сначала загрузите данные за день.'});
    Object.assign(params,{p_views:views,p_clicks:clicks,p_cpm:cpm,p_revision:revision,p_actor:session.user_id,p_save:true});
  }
  const {data,error}=await db.rpc('admin_daily_statistics',params);
  if(error) {
    if(error.code==='P0001') return res.status(409).json({error:error.message});
    console.error('admin statistics',error.code);
    return res.status(503).json({error:'Не удалось обработать статистику. Данные не сохранены.'});
  }
  return res.status(200).json({data});
}
