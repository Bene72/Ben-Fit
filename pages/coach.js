-- ============================================================
-- Migration : cycles + coach_tasks  (version "repart propre")
-- Utilise ceci si coach_tasks et/ou cycles existent déjà avec un
-- schéma différent et sont VIDES (vérifié avec select count(*)).
-- Si elles contiennent des données importantes, ne lance pas le
-- drop et dis-le moi : on adaptera avec des ALTER TABLE à la place.
-- ============================================================

drop view if exists cycle_alerts;
drop table if exists coach_tasks;
drop table if exists cycles;

-- 1) TABLE CYCLES ------------------------------------------------
create table cycles (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references profiles(id) on delete cascade,
  coach_id        uuid references profiles(id) on delete set null,
  name            text not null,
  start_date      date not null default current_date,
  duration_weeks  integer not null default 5 check (duration_weeks > 0),
  end_date        date generated always as (start_date + (duration_weeks * 7)) stored,
  status          text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  notes           text,
  created_at      timestamptz not null default now()
);

create index idx_cycles_client on cycles(client_id);
create index idx_cycles_coach_status on cycles(coach_id, status);
create index idx_cycles_end_date on cycles(end_date) where status = 'active';
create unique index idx_cycles_one_active_per_client
  on cycles(client_id) where status = 'active';

-- 2) TABLE COACH_TASKS --------------------------------------------
create table coach_tasks (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null references profiles(id) on delete cascade,
  client_id       uuid references profiles(id) on delete cascade,
  cycle_id        uuid references cycles(id) on delete set null,
  type            text not null default 'task' check (type in ('task', 'suivi')),
  title           text not null,
  due_date        date not null,
  done            boolean not null default false,
  created_at      timestamptz not null default now()
);

create index idx_coach_tasks_coach_due on coach_tasks(coach_id, due_date);
create index idx_coach_tasks_client on coach_tasks(client_id);

-- 3) VUE : alertes de fin de cycle -------------------------------
create or replace view cycle_alerts as
select
  c.id            as cycle_id,
  c.client_id,
  c.coach_id,
  c.name          as cycle_name,
  c.start_date,
  c.end_date,
  c.duration_weeks,
  p.full_name     as client_name,
  (c.end_date - current_date)::int as days_remaining,
  case
    when c.end_date < current_date then 'expired'
    when c.end_date - current_date <= 7 then 'ending_soon'
    else 'ok'
  end as alert_level
from cycles c
join profiles p on p.id = c.client_id
where c.status = 'active';

-- 4) RLS -----------------------------------------------------------
alter table cycles enable row level security;
alter table coach_tasks enable row level security;

create policy "coach manages own cycles" on cycles
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy "coach manages own tasks" on coach_tasks
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy "client reads own cycles" on cycles
  for select using (client_id = auth.uid());

-- 5) BACKFILL --------------------------------------------------------
insert into cycles (client_id, coach_id, name, start_date, duration_weeks, status)
select
  p.id,
  p.coach_id,
  p.current_cycle_name,
  current_date,
  5,
  'active'
from profiles p
where p.current_cycle_name is not null
  and p.current_cycle_name != ''
  and p.role = 'client'
on conflict do nothing;
