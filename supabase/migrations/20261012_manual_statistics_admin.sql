begin;
create table if not exists public.manual_stats_audit (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null,
  day date not null,
  actor_id uuid not null,
  changed_at timestamptz not null default now(),
  previous_rows jsonb not null,
  new_values jsonb not null
);
alter table public.manual_stats_audit enable row level security;
revoke all on public.manual_stats_audit from public, anon, authenticated;
grant all on public.manual_stats_audit to service_role;

create or replace function public.admin_daily_statistics(
 p_ad uuid, p_day date, p_views integer default null, p_clicks integer default null,
 p_cpm numeric default null, p_revision text default null, p_actor uuid default null,
 p_save boolean default false
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare
 a public.ad_campaigns%rowtype; old_rows jsonb; rev text;
 budget_value numeric; daily_value numeric; other_spend numeric; daily_spend numeric;
 old_views bigint; old_clicks bigint; total_views bigint; total_clicks bigint;
begin
 select * into a from public.ad_campaigns where id=p_ad for update;
 if not found then raise exception 'Объявление не найдено.'; end if;
 budget_value := a.budget::numeric;
 daily_value := coalesce(a.daily_budget,0);
 if budget_value is null or budget_value<0 or budget_value::text in ('NaN','Infinity','-Infinity') or daily_value<0 or daily_value::text in ('NaN','Infinity','-Infinity') then
   raise exception 'У объявления некорректный бюджет.';
 end if;
 if exists(select 1 from public.ad_stats where ad_id=p_ad and (views is null or views<0 or clicks is null or clicks<0 or cpm is null or cpm<0 or cpm::text in ('NaN','Infinity','-Infinity'))) then
   raise exception 'В прежней статистике есть некорректные значения. Проверьте их перед вводом.';
 end if;
 select coalesce(jsonb_agg(to_jsonb(s) order by s.id),'[]'::jsonb) into old_rows
 from public.ad_stats s where ad_id=p_ad and coalesce(day,("timestamp" at time zone 'UTC')::date)=p_day;
 select md5(coalesce(jsonb_agg(to_jsonb(s) order by s.id),'[]'::jsonb)::text || budget_value::text || daily_value::text) into rev from public.ad_stats s where ad_id=p_ad;
 select coalesce(sum(views*cpm/1000.0),0) into other_spend from public.ad_stats
 where ad_id=p_ad and coalesce(day,("timestamp" at time zone 'UTC')::date)<>p_day;
 select coalesce(sum(views),0),coalesce(sum(clicks),0),coalesce(sum(views*cpm/1000.0),0)
 into old_views,old_clicks,daily_spend from public.ad_stats
 where ad_id=p_ad and coalesce(day,("timestamp" at time zone 'UTC')::date)=p_day;
 if p_save then
   if p_actor is null or not exists(select 1 from public.users where user_id=p_actor and role='admin') then raise exception 'Доступ только для администратора.'; end if;
   if p_day>(now() at time zone 'Asia/Qyzylorda')::date then raise exception 'Нельзя внести фактическую статистику за будущую дату.'; end if;
   if p_revision is distinct from rev then raise exception 'Данные изменились. Загрузите день заново и проверьте цифры.'; end if;
   if p_views is null or p_views<0 or p_clicks is null or p_clicks<0 or p_clicks>p_views or p_cpm is null or p_cpm<0 or (p_views>0 and p_cpm=0) or p_cpm::text in ('NaN','Infinity','-Infinity') then raise exception 'Проверьте показы, клики и CPM.'; end if;
   daily_spend:=p_views*p_cpm/1000.0;
   if round(other_spend+daily_spend,2)>round(budget_value,2) then raise exception 'Не соответствует общему бюджету: расход % €, бюджет % €.',round(other_spend+daily_spend,2),budget_value; end if;
   if daily_value>0 and round(daily_spend,2)>round(daily_value,2) then raise exception 'Не соответствует дневному бюджету: расход % €, лимит % €.',round(daily_spend,2),daily_value; end if;
   insert into public.manual_stats_audit(ad_id,day,actor_id,previous_rows,new_values)
     values(p_ad,p_day,p_actor,old_rows,jsonb_build_object('views',p_views,'clicks',p_clicks,'cpm',p_cpm));
   delete from public.ad_stats where ad_id=p_ad and coalesce(day,("timestamp" at time zone 'UTC')::date)=p_day;
   insert into public.ad_stats(ad_id,day,"timestamp",views,clicks,cpm)
     values(p_ad,p_day,p_day::timestamp at time zone 'UTC',p_views,p_clicks,p_cpm);
   select coalesce(sum(views),0),coalesce(sum(clicks),0) into total_views,total_clicks from public.ad_stats where ad_id=p_ad;
   if total_views>2147483647 or total_clicks>2147483647 then raise exception 'Слишком большое итоговое количество показов или кликов.'; end if;
   update public.ad_campaigns set views=total_views,actions=total_clicks,updated_at=now() where id=p_ad;
   return public.admin_daily_statistics(p_ad,p_day);
 end if;
 return jsonb_build_object('campaign',jsonb_build_object('id',a.id,'title',a.title,'budget',budget_value,'daily_budget',daily_value,'cpm',a.cpm),'day',p_day,'views',old_views,'clicks',old_clicks,'cpm',case when old_views>0 then daily_spend*1000/old_views else coalesce(nullif(a.cpm,'')::numeric,0) end,'spend',daily_spend,'other_spend',other_spend,'row_count',jsonb_array_length(old_rows),'revision',rev);
end $$;
revoke all on function public.admin_daily_statistics(uuid,date,integer,integer,numeric,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.admin_daily_statistics(uuid,date,integer,integer,numeric,text,uuid,boolean) to service_role;
commit;
