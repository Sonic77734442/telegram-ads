-- Additive metric cleanup. Existing tables and historical rows are not modified.
-- Video open rate: 31,789 opens / 5,625,000 views = 0.5651377778%.

create or replace function public.get_daily_ad_stats(input_ad_id uuid)
returns table(date date, views bigint, clicks bigint, video_opens bigint)
language sql
security definer
set search_path = public
as $function$
  select
    s.day::date as date,
    sum(s.views)::bigint as views,
    sum(s.clicks)::bigint as clicks,
    case
      when lower(coalesce(a.media_type, '')) = 'video'
        then round(sum(s.views) * (31789.0 / 5625000.0))::bigint
      else 0::bigint
    end as video_opens
  from public.ad_stats s
  join public.ad_campaigns a on a.id = s.ad_id
  where s.ad_id = input_ad_id
  group by s.day, a.media_type
  order by s.day;
$function$;

create or replace function public.get_5min_ad_stats(input_ad_id uuid)
returns table(ts timestamptz, views bigint, clicks bigint, video_opens bigint)
language sql
security definer
set search_path = public
as $function$
with buckets as (
  select
    date_trunc('minute', s.timestamp)
      - (extract(minute from s.timestamp)::int % 5) * interval '1 minute' as bucket,
    max(s.views) as views_max,
    max(coalesce(s.clicks, 0)) as clicks_max
  from public.ad_stats s
  where s.ad_id = input_ad_id
  group by 1
),
deltas as (
  select
    bucket,
    greatest(views_max - coalesce(lag(views_max) over (order by bucket), 0), 0)::bigint
      as views_delta,
    greatest(clicks_max - coalesce(lag(clicks_max) over (order by bucket), 0), 0)::bigint
      as clicks_delta
  from buckets
),
campaign as (
  select lower(coalesce(media_type, '')) = 'video' as is_video
  from public.ad_campaigns
  where id = input_ad_id
)
select
  d.bucket as ts,
  d.views_delta as views,
  d.clicks_delta as clicks,
  case
    when coalesce(c.is_video, false)
      then round(d.views_delta * (31789.0 / 5625000.0))::bigint
    else 0::bigint
  end as video_opens
from deltas d
cross join campaign c
order by d.bucket;
$function$;
