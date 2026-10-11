begin;
do $$
declare ad uuid:=gen_random_uuid(); r jsonb; old_revision text; rejected boolean;
begin
 insert into public.ad_campaigns(id,title,type,budget,daily_budget,cpm,status,client_id,agency_id,views,actions)
 values(ad,'QA manual statistics transaction','channel','100',10,'2','Moderate','5a7e8e66-af90-4d28-8df6-23d0309e5ae5','cc2a3806-f166-42d6-b03b-43e8f184ef59',0,0);
 r:=public.admin_daily_statistics(ad,'2026-10-01'); old_revision:=r->>'revision';
 r:=public.admin_daily_statistics(ad,'2026-10-01',5000,20,2,old_revision,'00000000-0000-0000-0000-000000000001',true);
 if (r->>'spend')::numeric<>10 or (r->>'row_count')::int<>1 then raise exception 'QA save failed'; end if;
 rejected:=false;
 begin perform public.admin_daily_statistics(ad,'2026-10-01',5000,20,2,old_revision,'00000000-0000-0000-0000-000000000001',true); exception when raise_exception then rejected:=sqlerrm like 'Данные изменились%';end;
 if not rejected then raise exception 'QA duplicate guard failed';end if;
 rejected:=false;
 begin perform public.admin_daily_statistics(ad,'2026-10-01',6000,20,2,r->>'revision','00000000-0000-0000-0000-000000000001',true); exception when raise_exception then rejected:=sqlerrm like 'Не соответствует дневному%';end;
 if not rejected then raise exception 'QA daily guard failed';end if;
 r:=public.admin_daily_statistics(ad,'2026-10-01',4000,15,2,r->>'revision','00000000-0000-0000-0000-000000000001',true);
 if (select count(*) from public.ad_stats where ad_id=ad)<>1 or (select views from public.ad_campaigns where id=ad)<>4000 then raise exception 'QA replacement failed';end if;
 update public.ad_campaigns set budget='9',daily_budget=0 where id=ad;
 r:=public.admin_daily_statistics(ad,'2026-10-02'); rejected:=false;
 begin perform public.admin_daily_statistics(ad,'2026-10-02',1000,2,2,r->>'revision','00000000-0000-0000-0000-000000000001',true); exception when raise_exception then rejected:=sqlerrm like 'Не соответствует общему%';end;
 if not rejected then raise exception 'QA total guard failed';end if;
 rejected:=false;
 begin perform public.admin_daily_statistics(ad,'2026-10-02',100,2,2,r->>'revision','cc2a3806-f166-42d6-b03b-43e8f184ef59',true); exception when raise_exception then rejected:=sqlerrm like 'Доступ только%';end;
 if not rejected then raise exception 'QA role guard failed';end if;
 if (select count(*) from public.manual_stats_audit where ad_id=ad)<>2 then raise exception 'QA audit failed';end if;
 if has_function_privilege('anon','public.admin_daily_statistics(uuid,date,integer,integer,numeric,text,uuid,boolean)','execute') then raise exception 'QA anon privilege failed';end if;
end $$;
select 'PASS: save, replace, totals, daily budget, overall budget, stale revision, roles, audit. All test changes rolled back.' as result;
rollback;
