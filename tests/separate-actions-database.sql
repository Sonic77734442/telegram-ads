-- Execute after the migration inside a transaction, then roll back.
do $$
declare r jsonb; actor uuid:='00000000-0000-0000-0000-000000000001';
 ad uuid:='956d2e46-edae-4c17-b255-2521bccc67bf';
 live_ad uuid:='5a084d95-23be-4367-bb73-0ce4aa119fae';
begin
 perform public.admin_campaign_actions(ad,7,0,actor);
 begin
  perform public.admin_campaign_actions(ad,8,0,actor);
  raise exception 'TEST: stale write accepted';
 exception when raise_exception then if SQLERRM='TEST: stale write accepted' then raise;end if;end;
 begin
  perform public.admin_campaign_actions(ad,9,7,'5a7e8e66-af90-4d28-8df6-23d0309e5ae5');
  raise exception 'TEST: client write accepted';
 exception when raise_exception then if SQLERRM='TEST: client write accepted' then raise;end if;end;
 r:=public.admin_daily_statistics(ad,'2026-11-01');
 perform public.admin_daily_statistics(ad,'2026-11-01',0,0,0.12,r->>'revision',actor,true);
 if (select actions from public.ad_campaigns where id=ad)<>7 then raise exception 'Manual stats overwrote actions';end if;
 perform public.admin_campaign_actions(live_ad,9,0,actor);
 perform public.publish_stat_distributions();
 if (select actions from public.ad_campaigns where id=live_ad)<>9 then raise exception 'Publisher overwrote actions';end if;
 if (select actions from public.v_adcampaigns_client_compat where id=live_ad)<>9 then raise exception 'View still aliases clicks';end if;
 if (select clicks from public.v_adcampaigns_client_compat where id=live_ad)<>(select coalesce(sum(clicks),0) from public.ad_stats where ad_id=live_ad) then raise exception 'Clicks changed';end if;
end $$;
select 'Actions separated; manual, schedule, view, role and stale-write checks passed' as result;
