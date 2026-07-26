begin;

-- These objects are not referenced by the current application, deployed bundle,
-- current database views/functions/triggers, or recorded PostgREST traffic.
-- Do not use CASCADE: an unexpected dependency must abort the migration.
drop view if exists public.v_ad_metrics;
drop view if exists public.v_ad_stats_agg;
drop view if exists public.v_client_balances_public;

-- The function exists without a trigger or another database dependency.
drop function if exists public.log_ad_stats();

-- This table is not part of the current metrics pipeline. Refuse to remove it
-- if any rows appeared since the audit.
do $$
begin
  if to_regclass('public.ad_budget_events') is not null
     and exists (select 1 from public.ad_budget_events limit 1) then
    raise exception
      'Refusing to drop public.ad_budget_events because it contains data';
  end if;
end
$$;

drop table if exists public.ad_budget_events;

commit;
