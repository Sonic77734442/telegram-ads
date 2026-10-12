begin;
do $$
declare ad uuid:=gen_random_uuid(); client uuid:='5a7e8e66-af90-4d28-8df6-23d0309e5ae5'; request uuid:=gen_random_uuid(); rejected boolean;
begin
 update public.client_balances set balance=100,markup_percent=20 where client_id=client;
 insert into public.ad_campaigns(id,title,type,budget,daily_budget,cpm,status,client_id,agency_id,views,actions)
 values(ad,'QA wallet rollback','channel','10',5,'2','Moderate',client,'cc2a3806-f166-42d6-b03b-43e8f184ef59',0,0);
 if (select balance from public.client_balances where client_id=client)<>88 then raise exception 'QA initial debit';end if;
 update public.ad_campaigns set budget='10',daily_budget=3 where id=ad;
 if (select balance from public.client_balances where client_id=client)<>88 then raise exception 'QA same/daily budget double charge';end if;
 perform public.increase_campaign_budget(ad,client,5,request);
 perform public.increase_campaign_budget(ad,client,5,request);
 if (select balance from public.client_balances where client_id=client)<>82 or (select budget::numeric from public.ad_campaigns where id=ad)<>15 then raise exception 'QA duplicate request';end if;
 rejected:=false;
 begin perform public.increase_campaign_budget(ad,'f22126bc-3b8a-4e91-9cfd-c7d07bd746b9',5,gen_random_uuid()); exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'QA ownership';end if;
 rejected:=false;
 begin update public.ad_campaigns set budget='1000' where id=ad;exception when raise_exception then rejected:=sqlerrm like 'Недостаточно средств%';end;
 if not rejected or (select balance from public.client_balances where client_id=client)<>82 or (select budget::numeric from public.ad_campaigns where id=ad)<>15 then raise exception 'QA atomic insufficient balance';end if;
 update public.ad_campaigns set budget='12' where id=ad;
 if (select balance from public.client_balances where client_id=client)<>85.6 then raise exception 'QA refund';end if;
 insert into public.ad_stats(ad_id,day,"timestamp",views,clicks,cpm) values(ad,current_date,now(),2000,2,2);
 rejected:=false;
 begin update public.ad_campaigns set budget='3' where id=ad;exception when raise_exception then rejected:=sqlerrm like 'Бюджет нельзя%';end;
 if not rejected then raise exception 'QA spent floor';end if;
 delete from public.ad_campaigns where id=ad;
 if (select balance from public.client_balances where client_id=client)<>95.2 then raise exception 'QA deletion refunds only unused allocation';end if;
 if has_function_privilege('anon','public.change_campaign_allocation(uuid,uuid,numeric,text)','execute') then raise exception 'QA privilege';end if;
end $$;
select 'PASS: allocation, daily unchanged, retry once, ownership, insufficient funds rollback, refunds, spent floor, deletion. All test data rolled back.' as result;
rollback;
