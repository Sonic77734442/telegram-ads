-- Preserve the original caller-permission behavior of get_daily_ad_stats.
alter function public.get_daily_ad_stats(uuid) security invoker;
