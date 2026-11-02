begin;
create table if not exists public.campaign_actions_audit (
 id uuid primary key default gen_random_uuid(), ad_id uuid not null,
 actor_id uuid, previous_actions integer, new_actions integer not null,
 reason text not null, changed_at timestamptz not null default now()
);
alter table public.campaign_actions_audit enable row level security;
revoke all on public.campaign_actions_audit from public,anon,authenticated;
grant all on public.campaign_actions_audit to service_role;

-- Keep original definitions so this repair is reversible.
create table if not exists public.actions_repair_backup (
 object_name text primary key, definition text not null, saved_at timestamptz default now()
);
alter table public.actions_repair_backup enable row level security;
revoke all on public.actions_repair_backup from public,anon,authenticated;
grant all on public.actions_repair_backup to service_role;

do $$
declare name text; definition text; patched text;
begin
 foreach name in array array['public.publish_stat_distributions()', 'public.admin_daily_statistics(uuid,date,integer,integer,numeric,text,uuid,boolean)'] loop
  definition:=pg_get_functiondef(name::regprocedure);
  insert into public.actions_repair_backup(object_name,definition) values(name,definition) on conflict do nothing;
  patched:=replace(definition,',actions=total_clicks','');
  patched:=replace(patched,',actions=(select coalesce(sum(clicks),0) from public.ad_stats where ad_id=p.ad_id)','');
  if patched=definition and definition ~* 'actions\s*=' then raise exception 'Unexpected actions writer: %',name;end if;
  execute patched;
 end loop;
 definition:=pg_get_viewdef('public.v_adcampaigns_client_compat'::regclass,true);
 insert into public.actions_repair_backup(object_name,definition) values('public.v_adcampaigns_client_compat',definition) on conflict do nothing;
 patched:=replace(definition,'COALESCE(st.clicks_sum, 0::bigint)::integer AS actions','COALESCE(a.actions, 0)::integer AS actions');
 if patched=definition and definition not like '%COALESCE(a.actions, 0) AS actions%' and definition not like '%COALESCE(a.actions, 0)::integer AS actions%' then raise exception 'Unexpected Actions view';end if;
 execute 'create or replace view public.v_adcampaigns_client_compat as '||patched;
end $$;

-- Only the client whose imported clicks were confirmed not to be conversions.
-- Serialize against the publisher and retain every previous value in the audit.
lock table public.ad_campaigns in share row exclusive mode;
with repaired as (
 insert into public.campaign_actions_audit(ad_id,previous_actions,new_actions,reason)
 select a.id,a.actions,0,'repair-clicks-as-actions-20261102' from public.ad_campaigns a
 where a.client_id='5a7e8e66-af90-4d28-8df6-23d0309e5ae5'
 and not exists(select 1 from public.campaign_actions_audit h where h.ad_id=a.id and h.reason='repair-clicks-as-actions-20261102')
 returning ad_id
)
update public.ad_campaigns a set actions=0 where a.id in(select ad_id from repaired);

create or replace function public.admin_campaign_actions(p_ad uuid,p_actions integer,p_expected integer,p_actor uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare a public.ad_campaigns%rowtype;
begin
 if p_actor is null or not exists(select 1 from public.users where user_id=p_actor and role='admin') then raise exception 'Доступ только для администратора.';end if;
 if p_actions is null or p_actions<0 or p_expected is null or p_expected<0 then raise exception 'Укажите целое неотрицательное число действий.';end if;
 select * into a from public.ad_campaigns where id=p_ad for update;
 if not found then raise exception 'Объявление не найдено.';end if;
 if coalesce(a.actions,0)<>p_expected then raise exception 'Actions изменились. Загрузите день заново и проверьте число.';end if;
 if coalesce(a.actions,0)<>p_actions then
  insert into public.campaign_actions_audit(ad_id,actor_id,previous_actions,new_actions,reason) values(p_ad,p_actor,a.actions,p_actions,'admin-manual-actions');
  update public.ad_campaigns set actions=p_actions where id=p_ad;
 end if;
 return jsonb_build_object('ad_id',p_ad,'actions',p_actions);
end $$;
revoke all on function public.admin_campaign_actions(uuid,integer,integer,uuid) from public,anon,authenticated;
grant execute on function public.admin_campaign_actions(uuid,integer,integer,uuid) to service_role;
commit;
