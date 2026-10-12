begin;
-- Money actually allocated by this feature. Old campaigns start uncharged until explicit reconciliation.
create table public.campaign_wallet_allocations(
 ad_id uuid primary key, client_id uuid not null, net numeric not null default 0 check(net>=0),
 gross numeric not null default 0 check(gross>=0)
);
create table public.campaign_wallet_events(
 id uuid primary key default gen_random_uuid(), ad_id uuid not null, client_id uuid not null,
 net_delta numeric not null, wallet_delta numeric not null, balance_after numeric not null,
 reason text not null, created_at timestamptz not null default now()
);
create table public.campaign_budget_requests(
 request_id uuid primary key, ad_id uuid not null, actor_id uuid not null, amount numeric not null,
 created_at timestamptz not null default now()
);
alter table public.campaign_wallet_allocations enable row level security;
alter table public.campaign_wallet_events enable row level security;
alter table public.campaign_budget_requests enable row level security;
revoke all on public.campaign_wallet_allocations,public.campaign_wallet_events,public.campaign_budget_requests from public,anon,authenticated;
grant all on public.campaign_wallet_allocations,public.campaign_wallet_events,public.campaign_budget_requests to service_role;

create function public.change_campaign_allocation(p_ad uuid,p_client uuid,p_delta numeric,p_reason text) returns void
language plpgsql security invoker set search_path=public as $$
declare w public.client_balances%rowtype; a public.campaign_wallet_allocations%rowtype; new_gross numeric; debit numeric; new_net numeric;
begin
 if p_delta=0 then return;end if;
 select * into w from public.client_balances where client_id=p_client for update;
 if not found then raise exception 'Для клиента не настроен общий баланс.';end if;
 if w.balance is null or w.balance<0 or w.balance::text in ('NaN','Infinity','-Infinity') or coalesce(w.markup_percent,0)<0 or coalesce(w.markup_percent,0)::text in ('NaN','Infinity','-Infinity') then raise exception 'Проверьте баланс и наценку клиента.';end if;
 insert into public.campaign_wallet_allocations(ad_id,client_id) values(p_ad,p_client) on conflict(ad_id) do nothing;
 select * into a from public.campaign_wallet_allocations where ad_id=p_ad for update;
 if a.client_id is distinct from p_client then raise exception 'Нельзя менять владельца бюджета кампании.';end if;
 if p_delta<0 then p_delta:=-least(-p_delta,a.net);end if;
 new_net:=a.net+p_delta;
 new_gross:=case when p_delta>=0 then a.gross+p_delta*(1+coalesce(w.markup_percent,0)/100) when a.net=0 then 0 else a.gross*new_net/a.net end;
 debit:=round(new_gross,2)-round(a.gross,2);
 if debit>w.balance then raise exception 'Недостаточно средств: нужно % €, доступно % €.',debit,w.balance;end if;
 update public.client_balances set balance=balance-debit,updated_at=now() where client_id=p_client;
 update public.campaign_wallet_allocations set net=new_net,gross=new_gross where ad_id=p_ad;
 insert into public.campaign_wallet_events(ad_id,client_id,net_delta,wallet_delta,balance_after,reason) values(p_ad,p_client,p_delta,-debit,w.balance-debit,p_reason);
end $$;
revoke all on function public.change_campaign_allocation(uuid,uuid,numeric,text) from public,anon,authenticated;
grant execute on function public.change_campaign_allocation(uuid,uuid,numeric,text) to service_role;

create function public.sync_campaign_wallet() returns trigger
language plpgsql security invoker set search_path=public as $$
declare old_budget numeric:=0; new_budget numeric:=0; used numeric:=0; allocated numeric:=0;
begin
 if TG_OP<>'INSERT' then old_budget:=coalesce(old.budget::numeric,0);end if;
 if TG_OP<>'DELETE' then new_budget:=coalesce(new.budget::numeric,0);end if;
 if TG_OP='UPDATE' and new.client_id is distinct from old.client_id then raise exception 'Нельзя менять владельца кампании с бюджетом.';end if;
 if new_budget<0 or new_budget::text in ('NaN','Infinity','-Infinity') then raise exception 'Укажите корректный бюджет.';end if;
 if TG_OP='DELETE' then
   select net into allocated from public.campaign_wallet_allocations where ad_id=old.id;
   if coalesce(allocated,0)=0 then return old;end if;
 end if;
 if TG_OP='DELETE' or new_budget<old_budget then
   if exists(select 1 from public.ad_stats where ad_id=old.id and (views is null or views<0 or cpm is null or cpm<0 or cpm::text in ('NaN','Infinity','-Infinity'))) then raise exception 'Проверьте расход кампании перед возвратом бюджета.';end if;
   select coalesce(sum(views*cpm/1000.0),0) into used from public.ad_stats where ad_id=old.id;
   if TG_OP='DELETE' then
     perform public.change_campaign_allocation(old.id,old.client_id,-greatest(0,old_budget-used),'campaign-delete');
     return old;
   end if;
   if new_budget<used+public.distribution_reserved(old.id) then raise exception 'Бюджет нельзя уменьшить ниже расхода и запланированной статистики.';end if;
 end if;
 perform public.change_campaign_allocation(new.id,new.client_id,new_budget-old_budget,case when TG_OP='INSERT' then 'campaign-create' else 'budget-change' end);
 return new;
end $$;
revoke all on function public.sync_campaign_wallet() from public,anon,authenticated;
grant execute on function public.sync_campaign_wallet() to service_role;
-- Existing insert_client_balance trigger runs first (alphabetic trigger order).
create trigger zz_campaign_wallet after insert or update of budget,client_id on public.ad_campaigns for each row execute function public.sync_campaign_wallet();
-- Read spent statistics before their FK cascades on deletion.
create trigger campaign_wallet_delete before delete on public.ad_campaigns for each row execute function public.sync_campaign_wallet();

create function public.increase_campaign_budget(p_ad uuid,p_actor uuid,p_amount numeric,p_request uuid) returns void
language plpgsql security invoker set search_path=public as $$
declare a public.ad_campaigns%rowtype; u public.users%rowtype; previous public.campaign_budget_requests%rowtype;
begin
 if p_amount is null or p_amount<=0 or p_amount::text in ('NaN','Infinity','-Infinity') or p_request is null then raise exception 'Укажите положительную сумму пополнения.';end if;
 select * into a from public.ad_campaigns where id=p_ad for update;
 if not found then raise exception 'Кампания не найдена.';end if;
 select * into u from public.users where user_id=p_actor;
 if not found or not (u.role='admin' or (u.role='client' and a.client_id=u.user_id) or (u.role='agency' and a.agency_id=u.user_id)) then raise exception 'Нет доступа к бюджету кампании.';end if;
 select * into previous from public.campaign_budget_requests where request_id=p_request;
 if found then
  if previous.ad_id<>p_ad or previous.actor_id<>p_actor or previous.amount<>p_amount then raise exception 'Повторный запрос содержит другую сумму.';end if;
  return;
 end if;
 insert into public.campaign_budget_requests(request_id,ad_id,actor_id,amount) values(p_request,p_ad,p_actor,p_amount);
 update public.ad_campaigns set budget=(coalesce(budget::numeric,0)+p_amount)::text where id=p_ad;
end $$;
revoke all on function public.increase_campaign_budget(uuid,uuid,numeric,uuid) from public,anon,authenticated;
grant execute on function public.increase_campaign_budget(uuid,uuid,numeric,uuid) to service_role;
commit;
