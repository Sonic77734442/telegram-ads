begin;
-- Keep exact reporting days while allowing separate publication intervals within them.
-- Existing daily rows are preserved; admin replacement stays serialized by campaign lock.
create unique index ux_ad_stats_day_interval on public.ad_stats(ad_id,day,"timestamp");
drop index public.ux_ad_stats_unique_day;
commit;
