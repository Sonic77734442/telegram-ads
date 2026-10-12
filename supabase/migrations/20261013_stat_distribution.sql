begin;
create table public.stat_distribution_plans(
 id uuid primary key default gen_random_uuid(), ad_id uuid not null references public.ad_campaigns(id) on delete cascade,
 day date not null, actor_id uuid not null, views integer not null, clicks integer not null, cpm numeric not null,
 slots jsonb not null, next_slot integer not null default 0, published_views integer not null default 0,
 published_clicks integer not null default 0, status text not null default 'running', reason text,
 created_at timestamptz not null default now(), unique(ad_id,day)
);
alter table public.stat_distribution_plans enable row level security;
revoke all on public.stat_distribution_plans from public,anon,authenticated;
grant all on public.stat_distribution_plans to service_role;

create function public.distribution_reserved(p_ad uuid,p_except date default null) returns numeric
language sql stable security invoker set search_path=public as $$
 select coalesce(sum((views-published_views)*cpm/1000.0),0) from public.stat_distribution_plans
 where ad_id=p_ad and status in ('running','blocked') and (p_except is null or day<>p_except)
$$;
revoke all on function public.distribution_reserved(uuid,date) from public,anon,authenticated;
grant execute on function public.distribution_reserved(uuid,date) to service_role;

create function public.admin_schedule_statistics(p_ad uuid,p_day date,p_actor uuid,p_revision text,
 p_slots jsonb default null,p_views integer default null,p_clicks integer default null,p_cpm numeric default null,p_cancel boolean default false)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare r jsonb; a public.ad_campaigns%rowtype; s record; v bigint:=0; c bigint:=0; previous_at timestamptz; moment timestamptz;
begin
 select * into a from public.ad_campaigns where id=p_ad for update;
 if not found then raise exception 'Объявление не найдено.';end if;
 if not exists(select 1 from public.users where user_id=p_actor and role='admin') then raise exception 'Доступ только для администратора.';end if;
 r:=public.admin_daily_statistics(p_ad,p_day);
 if p_revision is distinct from r->>'revision' then raise exception 'Данные изменились. Загрузите день заново.';end if;
 if p_cancel then
  update public.stat_distribution_plans set status='cancelled',reason='Остановлено администратором' where ad_id=p_ad and day=p_day and status in ('running','blocked');
  insert into public.manual_stats_audit(ad_id,day,actor_id,previous_rows,new_values) values(p_ad,p_day,p_actor,'[]',jsonb_build_object('mode','distribution-stop'));
  return public.admin_daily_statistics(p_ad,p_day);
 end if;
 if exists(select 1 from public.stat_distribution_plans where ad_id=p_ad and day=p_day) or (r->>'row_count')::integer>0 then raise exception 'На эту дату уже есть статистика или расписание. Выберите свободный день.';end if;
 if p_day<(now() at time zone 'Asia/Qyzylorda')::date then raise exception 'Для распределения выберите сегодняшний или будущий день.';end if;
 if p_views is null or p_views<1 or p_clicks is null or p_clicks<0 or p_clicks>p_views or p_cpm is null or p_cpm<=0 or p_cpm::text in ('NaN','Infinity','-Infinity') then raise exception 'Проверьте показы, клики и CPM.';end if;
 if jsonb_typeof(p_slots) is distinct from 'array' or jsonb_array_length(p_slots) not between 1 and 288 then raise exception 'Некорректное расписание.';end if;
 for s in select value from jsonb_array_elements(p_slots) loop
  moment:=(s.value->>'at')::timestamptz;
  if moment is null or extract(epoch from moment)::numeric % 300 <> 0 or moment<=(p_day::timestamp at time zone 'Asia/Qyzylorda') or moment>((p_day+1)::timestamp at time zone 'Asia/Qyzylorda') or (previous_at is not null and moment<>previous_at+interval '5 minutes') then raise exception 'Некорректные интервалы расписания.';end if;
  if (s.value->>'views')::numeric is null or (s.value->>'clicks')::numeric is null or (s.value->>'views')::numeric<>trunc((s.value->>'views')::numeric) or (s.value->>'clicks')::numeric<>trunc((s.value->>'clicks')::numeric) or (s.value->>'views')::numeric<0 or (s.value->>'clicks')::numeric<0 or (s.value->>'clicks')::numeric>(s.value->>'views')::numeric then raise exception 'Некорректные значения интервала.';end if;
  v:=v+(s.value->>'views')::bigint;c:=c+(s.value->>'clicks')::bigint;previous_at:=moment;
 end loop;
 if v<>p_views or c<>p_clicks then raise exception 'Итоги расписания не совпадают с введёнными.';end if;
 if previous_at<=now() then raise exception 'Время окончания уже прошло.';end if;
 if round((r->>'other_spend')::numeric+p_views*p_cpm/1000,2)>round(a.budget::numeric,2) then raise exception 'Не соответствует общему бюджету с учётом других расписаний.';end if;
 if a.daily_budget>0 and round(p_views*p_cpm/1000,2)>round(a.daily_budget,2) then raise exception 'Не соответствует дневному бюджету.';end if;
 if (select coalesce(sum(views),0) from public.ad_stats where ad_id=p_ad)+(select coalesce(sum(views-published_views),0) from public.stat_distribution_plans where ad_id=p_ad and status in ('running','blocked'))+p_views>2147483647 then raise exception 'Слишком большой итог показов.';end if;
 insert into public.stat_distribution_plans(ad_id,day,actor_id,views,clicks,cpm,slots) values(p_ad,p_day,p_actor,p_views,p_clicks,p_cpm,p_slots);
 insert into public.manual_stats_audit(ad_id,day,actor_id,previous_rows,new_values) values(p_ad,p_day,p_actor,'[]',jsonb_build_object('mode','distribution','model','uneven-v1','views',p_views,'clicks',p_clicks,'cpm',p_cpm,'slots',p_slots));
 return public.admin_daily_statistics(p_ad,p_day);
end $$;
revoke all on function public.admin_schedule_statistics(uuid,date,uuid,text,jsonb,integer,integer,numeric,boolean) from public,anon,authenticated;
grant execute on function public.admin_schedule_statistics(uuid,date,uuid,text,jsonb,integer,integer,numeric,boolean) to service_role;

create function public.publish_stat_distributions() returns integer language plpgsql security invoker set search_path=public as $$
declare candidate record; p public.stat_distribution_plans%rowtype; a public.ad_campaigns%rowtype; item jsonb; count_written integer:=0; actual numeric;
begin
 for candidate in select id,ad_id from public.stat_distribution_plans where status in ('running','blocked') order by ad_id,day loop
  -- All writers lock campaign before plan, so publishing and admin writes serialize.
  select * into a from public.ad_campaigns where id=candidate.ad_id for update skip locked;
  if not found then continue;end if;
  select * into p from public.stat_distribution_plans where id=candidate.id for update;
  if p.status not in ('running','blocked') then continue;end if;
  select coalesce(sum(views*cpm/1000.0),0) into actual from public.ad_stats where ad_id=p.ad_id;
  if a.budget is null or a.budget::numeric<0 or a.budget::numeric::text in ('NaN','Infinity','-Infinity') or round(actual+public.distribution_reserved(p.ad_id),2)>round(a.budget::numeric,2) or (a.daily_budget>0 and round(p.views*p.cpm/1000,2)>round(a.daily_budget,2)) then
   update public.stat_distribution_plans set status='blocked',reason='Проверьте общий и дневной бюджет: лимит изменился после запуска.' where id=p.id;continue;
  end if;
  while p.next_slot<jsonb_array_length(p.slots) loop
   item:=p.slots->p.next_slot;
   exit when (item->>'at')::timestamptz>now();
   insert into public.ad_stats(ad_id,day,"timestamp",views,clicks,cpm) values(p.ad_id,p.day,(item->>'at')::timestamptz,(item->>'views')::integer,(item->>'clicks')::integer,p.cpm);
   p.next_slot:=p.next_slot+1;p.published_views:=p.published_views+(item->>'views')::integer;p.published_clicks:=p.published_clicks+(item->>'clicks')::integer;count_written:=count_written+1;
  end loop;
  update public.stat_distribution_plans set next_slot=p.next_slot,published_views=p.published_views,published_clicks=p.published_clicks,status=case when p.next_slot=jsonb_array_length(p.slots) then 'complete' else 'running' end,reason=null where id=p.id;
  update public.ad_campaigns set views=(select coalesce(sum(views),0) from public.ad_stats where ad_id=p.ad_id),actions=(select coalesce(sum(clicks),0) from public.ad_stats where ad_id=p.ad_id),updated_at=now() where id=p.ad_id;
 end loop;
 return count_written;
end $$;
revoke all on function public.publish_stat_distributions() from public,anon,authenticated;
grant execute on function public.publish_stat_distributions() to service_role;

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
 other_spend:=other_spend+public.distribution_reserved(p_ad,p_day);
 rev:=md5(rev || coalesce((select jsonb_agg(to_jsonb(p) order by id)::text from public.stat_distribution_plans p where ad_id=p_ad),''));
 if p_save then
   if exists(select 1 from public.stat_distribution_plans where ad_id=p_ad and day=p_day and status in ('running','blocked')) then raise exception 'Сначала остановите распределение за выбранный день.';end if;
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
   if total_views+(select coalesce(sum(views-published_views),0) from public.stat_distribution_plans where ad_id=p_ad and status in ('running','blocked'))>2147483647 or total_clicks>2147483647 then raise exception 'Слишком большое итоговое количество показов или кликов.'; end if;
   update public.ad_campaigns set views=total_views,actions=total_clicks,updated_at=now() where id=p_ad;
   return public.admin_daily_statistics(p_ad,p_day);
 end if;
 return jsonb_build_object('campaign',jsonb_build_object('id',a.id,'title',a.title,'budget',budget_value,'daily_budget',daily_value,'cpm',a.cpm),'day',p_day,'views',old_views,'clicks',old_clicks,'cpm',case when old_views>0 then daily_spend*1000/old_views else coalesce(nullif(a.cpm,'')::numeric,0) end,'spend',daily_spend,'other_spend',other_spend,'row_count',jsonb_array_length(old_rows),'revision',rev,'plan',(select to_jsonb(p) from public.stat_distribution_plans p where ad_id=p_ad and day=p_day));
end $$;
revoke all on function public.admin_daily_statistics(uuid,date,integer,integer,numeric,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.admin_daily_statistics(uuid,date,integer,integer,numeric,text,uuid,boolean) to service_role;

create extension if not exists pg_cron;
select cron.schedule('publish-stat-distributions','* * * * *','select public.publish_stat_distributions();');
commit;
