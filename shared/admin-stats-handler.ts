import { getSupabaseAdmin } from '../api/supabaseAdmin.js';
import { distributeDaily } from './distribution.js';
import { checkDailyStats } from './manual-stats.js';
export async function adminStats(req: any, res: any, session: any) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (session.role !== 'admin') return res.status(403).json({error:'Р”РѕСЃС‚СѓРї С‚РѕР»СЊРєРѕ РґР»СЏ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°.'});
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({error:'Method not allowed'});
  const db=getSupabaseAdmin();
  if(req.method==='GET' && !req.query.ad_id) {
    const {data,error}=await db.from('ad_campaigns').select('id,title,client_id,budget,daily_budget,cpm').order('created_at',{ascending:false}).limit(1000);
    if(error) return res.status(503).json({error:'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РѕР±СЉСЏРІР»РµРЅРёСЏ.'});
    const {data:users,error:userError}=await db.from('users').select('user_id,username').limit(1000);
    if(userError) return res.status(503).json({error:'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РєР»РёРµРЅС‚РѕРІ.'});
    const names=new Map((users||[]).map((u:any)=>[u.user_id,u.username]));
    return res.status(200).json({data:(data||[]).map((a:any)=>({...a,client_name:names.get(a.client_id)||a.client_id}))});
  }
  const input=req.method==='POST'?req.body:req.query;
  const {ad_id,day}=input||{};
  if(req.method==='POST' && input?.mode==='actions') {
    if(typeof ad_id!=='string'||!/^[\da-f-]{36}$/i.test(ad_id)||
       !Number.isInteger(input.actions)||input.actions<0||input.actions>2147483647||
       !Number.isInteger(input.expected_actions)||input.expected_actions<0||input.expected_actions>2147483647)
      return res.status(400).json({error:'РЈРєР°Р¶РёС‚Рµ С†РµР»РѕРµ РЅРµРѕС‚СЂРёС†Р°С‚РµР»СЊРЅРѕРµ С‡РёСЃР»Рѕ С†РµР»РµРІС‹С… РґРµР№СЃС‚РІРёР№.'});
    const {data,error}=await db.rpc('admin_campaign_actions',{p_ad:ad_id,p_actions:input.actions,p_expected:input.expected_actions,p_actor:session.user_id});
    if(error)return res.status(error.code==='P0001'?409:503).json({error:error.code==='P0001'?error.message:'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ Actions.'});
    return res.status(200).json({data});
  }
  if(typeof ad_id!=='string'||!/^[\da-f-]{36}$/i.test(ad_id)||typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day)
    return res.status(400).json({error:'Р’С‹Р±РµСЂРёС‚Рµ РѕР±СЉСЏРІР»РµРЅРёРµ Рё РєРѕСЂСЂРµРєС‚РЅСѓСЋ РґР°С‚Сѓ.'});
  const params:any={p_ad:ad_id,p_day:day};
  let rpcName='admin_daily_statistics';
  if(req.method==='POST' && input.mode==='cancel-distribution') {
    if(typeof input.revision!=='string')return res.status(400).json({error:'Р—Р°РіСЂСѓР·РёС‚Рµ РґРµРЅСЊ Р·Р°РЅРѕРІРѕ.'});
    rpcName='admin_schedule_statistics';Object.assign(params,{p_actor:session.user_id,p_revision:input.revision,p_cancel:true});
  } else if(req.method==='POST') {
    const {views,clicks,cpm,revision}=input;
    const checked=checkDailyStats(views,clicks,cpm,Number.MAX_SAFE_INTEGER,0,0);
    if(checked.errors.length||typeof revision!=='string') return res.status(400).json({error:checked.errors[0]||'РЎРЅР°С‡Р°Р»Р° Р·Р°РіСЂСѓР·РёС‚Рµ РґР°РЅРЅС‹Рµ Р·Р° РґРµРЅСЊ.'});
    if(input.mode==='distribution') {
      try {params.p_slots=distributeDaily(ad_id,day,input.start,input.end,views,clicks);}
      catch(e){return res.status(400).json({error:(e as Error).message});}
      rpcName='admin_schedule_statistics';
      Object.assign(params,{p_views:views,p_clicks:clicks,p_cpm:cpm,p_revision:revision,p_actor:session.user_id});
    } else Object.assign(params,{p_views:views,p_clicks:clicks,p_cpm:cpm,p_revision:revision,p_actor:session.user_id,p_save:true});
  }
  const {data,error}=await db.rpc(rpcName,params);
  if(error) {
    if(error.code==='P0001') return res.status(409).json({error:error.message});
    console.error('admin statistics',error.code);
    return res.status(503).json({error:'РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±СЂР°Р±РѕС‚Р°С‚СЊ СЃС‚Р°С‚РёСЃС‚РёРєСѓ. Р”Р°РЅРЅС‹Рµ РЅРµ СЃРѕС…СЂР°РЅРµРЅС‹.'});
  }
  const {data:campaign,error:campaignError}=await db.from('ad_campaigns').select('actions').eq('id',ad_id).single();
  if(campaignError)return res.status(503).json({error:'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ Actions. РћР±РЅРѕРІРёС‚Рµ РґР°РЅРЅС‹Рµ.'});
  data.campaign.actions=Number(campaign.actions??0);
  return res.status(200).json({data});
}
