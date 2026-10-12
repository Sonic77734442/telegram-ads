begin;
do $$
declare ad uuid:=gen_random_uuid(); d date:=(now() at time zone 'Asia/Qyzylorda')::date+1; actor uuid:='00000000-0000-0000-0000-000000000001'; r jsonb; slots jsonb; rejected boolean; n integer;
begin
 insert into public.ad_campaigns(id,title,type,budget,daily_budget,cpm,status,client_id,agency_id,views,actions)
 values(ad,'QA schedule transaction','channel','100',10,'2','Moderate','5a7e8e66-af90-4d28-8df6-23d0309e5ae5','cc2a3806-f166-42d6-b03b-43e8f184ef59',0,0);
 slots:=jsonb_build_array(jsonb_build_object('at',(d::timestamp+interval '9 hours 5 minutes') at time zone 'Asia/Qyzylorda','views',1500,'clicks',7),jsonb_build_object('at',(d::timestamp+interval '9 hours 10 minutes') at time zone 'Asia/Qyzylorda','views',3500,'clicks',13));
 r:=public.admin_daily_statistics(ad,d);
 rejected:=false;
 begin perform public.admin_schedule_statistics(ad,d,'cc2a3806-f166-42d6-b03b-43e8f184ef59',r->>'revision',slots,5000,20,2);exception when raise_exception then rejected:=sqlerrm like 'Доступ только%';end;
 if not rejected then raise exception 'QA role';end if;
 rejected:=false;
 begin perform public.admin_schedule_statistics(ad,d,actor,r->>'revision',slots,5000,20,3);exception when raise_exception then rejected:=sqlerrm like 'Не соответствует дневному%';end;
 if not rejected then raise exception 'QA daily budget';end if;
 r:=public.admin_schedule_statistics(ad,d,actor,r->>'revision',slots,5000,20,2);
 if (r->'plan'->>'views')::int<>5000 or public.distribution_reserved(ad)<>10 then raise exception 'QA reservation';end if;
 perform public.publish_stat_distributions();
 if exists(select 1 from public.ad_stats where ad_id=ad) then raise exception 'QA future exposed';end if;
 rejected:=false;
 begin perform public.admin_daily_statistics(ad,d,5000,20,2,r->>'revision',actor,true);exception when raise_exception then rejected:=sqlerrm like 'Сначала остановите%';end;
 if not rejected then raise exception 'QA active plan overwrite';end if;
 update public.ad_campaigns set budget='11' where id=ad;
 r:=public.admin_daily_statistics(ad,d-1);
 rejected:=false;
 begin perform public.admin_daily_statistics(ad,d-1,1000,1,2,r->>'revision',actor,true);exception when raise_exception then rejected:=sqlerrm like 'Не соответствует общему%';end;
 if not rejected then raise exception 'QA reserved budget';end if;
 -- Move only this synthetic plan's slots into the past to test the worker without waiting.
 update public.stat_distribution_plans set slots=jsonb_build_array(jsonb_build_object('at',now()-interval '10 minutes','views',1500,'clicks',7),jsonb_build_object('at',now()+interval '5 minutes','views',3500,'clicks',13)) where ad_id=ad;
 update public.ad_campaigns set daily_budget=1 where id=ad;
 perform public.publish_stat_distributions();
 if (select status from public.stat_distribution_plans where ad_id=ad)<>'blocked' or exists(select 1 from public.ad_stats where ad_id=ad) then raise exception 'QA budget pause';end if;
 update public.ad_campaigns set daily_budget=10 where id=ad;
 perform public.publish_stat_distributions();perform public.publish_stat_distributions();
 if (select count(*) from public.ad_stats where ad_id=ad)<>1 or (select views from public.ad_campaigns where id=ad)<>1500 or public.distribution_reserved(ad)<>7 then raise exception 'QA partial / idempotence';end if;
 update public.stat_distribution_plans set slots=jsonb_set(public.stat_distribution_plans.slots,'{1,at}',to_jsonb(now()-interval '5 minutes')) where ad_id=ad;
 perform public.publish_stat_distributions();perform public.publish_stat_distributions();
 if (select count(*) from public.ad_stats where ad_id=ad)<>2 or (select views from public.ad_campaigns where id=ad)<>5000 or (select actions from public.ad_campaigns where id=ad)<>20 or public.distribution_reserved(ad)<>0 or (select status from public.stat_distribution_plans where ad_id=ad)<>'complete' then raise exception 'QA exact final';end if;
 r:=public.admin_daily_statistics(ad,d+1);
 slots:=jsonb_build_array(jsonb_build_object('at',((d+1)::timestamp+interval '9 hours 5 minutes') at time zone 'Asia/Qyzylorda','views',100,'clicks',1));
 r:=public.admin_schedule_statistics(ad,d+1,actor,r->>'revision',slots,100,1,2);
 r:=public.admin_schedule_statistics(ad,d+1,actor,r->>'revision',p_cancel=>true);
 if r->'plan'->>'status'<>'cancelled' or public.distribution_reserved(ad)<>0 then raise exception 'QA cancel';end if;
 if has_function_privilege('anon','public.publish_stat_distributions()','execute') or has_function_privilege('authenticated','public.admin_schedule_statistics(uuid,date,uuid,text,jsonb,integer,integer,numeric,boolean)','execute') then raise exception 'QA public privilege';end if;
end $$;
select 'PASS: roles, daily / reserved budgets, future isolation, pause/resume, idempotence, exact totals, cancellation. Test rows rolled back.' as result;
rollback;

