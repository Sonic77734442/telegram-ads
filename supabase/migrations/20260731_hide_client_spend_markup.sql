begin;

-- Recreate without CASCADE so an unexpected dependency aborts the migration.
drop view public.v_ad_stats_reporting;

create view public.v_ad_stats_reporting
with (security_invoker = true)
as
select
  s.id,
  s.ad_id,
  s."timestamp",
  s.day,
  s.views,
  s.clicks,
  s.cpm,
  a.title as ad_title,
  a.media_type,
  case
    when lower(coalesce(a.media_type, '')) = 'video'
      then round(s.views::numeric * (31789.0 / 5625000.0))::bigint
    else null::bigint
  end as video_opens,
  lower(coalesce(a.media_type, '')) = 'video' as video_opens_estimated,
  s.day as period_date,
  date_trunc('month', s.day)::date as period_month,
  round(s.views::numeric * coalesce(s.cpm, 0)::numeric / 1000.0, 2)
    as spent,
  a.budget::numeric as budget_net,
  round(
    a.budget::numeric
      * (1.0 + coalesce(cb.markup_percent, 0)::numeric / 100.0),
    2
  ) as budget_client
from public.ad_stats s
join public.ad_campaigns a on a.id = s.ad_id
left join public.client_balances cb on cb.client_id = a.client_id;

revoke all on public.v_ad_stats_reporting from anon;
grant select on public.v_ad_stats_reporting to authenticated, service_role;

comment on view public.v_ad_stats_reporting is
  'Daily reporting layer. Spend is always net; spend with markup and markup percent are intentionally not exposed.';

commit;
