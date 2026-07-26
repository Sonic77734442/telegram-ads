create or replace view public.v_ad_stats_reporting
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
  lower(coalesce(a.media_type, '')) = 'video' as video_opens_estimated
from public.ad_stats s
join public.ad_campaigns a on a.id = s.ad_id;

revoke all on public.v_ad_stats_reporting from anon;
grant select on public.v_ad_stats_reporting to authenticated, service_role;

comment on view public.v_ad_stats_reporting is
  'Reporting layer over ad_stats. video_opens is an estimate calculated as views * 31789 / 5625000 for video campaigns.';
