-- =====================================================================
-- Lume — Fase 2: hábitos semanais/mensais, Treinos e Rotina alimentar
-- Pode ser rodado mais de uma vez sem erro (if not exists / drop if exists).
-- =====================================================================

-- ---------- Hábitos: frequência diária, semanal ou mensal ----------
alter table public.habits add column if not exists frequency text not null default 'daily';
alter table public.habits add column if not exists target_per_period smallint not null default 1;
alter table public.habits drop constraint if exists habits_frequency_check;
alter table public.habits add constraint habits_frequency_check check (frequency in ('daily', 'weekly', 'monthly'));
alter table public.habits drop constraint if exists habits_target_per_period_check;
alter table public.habits add constraint habits_target_per_period_check check (
  target_per_period between 1 and 31 and (frequency <> 'weekly' or target_per_period <= 7));

-- ---------- Treinos: fichas ----------
-- exercises: [{id, name, sets, reps, weight_kg, rest_seconds, notes}]
create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  color text not null default 'rose',
  days_of_week smallint[] not null default '{}'::smallint[] check (days_of_week <@ array[0,1,2,3,4,5,6]::smallint[]),
  notes text check (char_length(notes) <= 2000),
  exercises jsonb not null default '[]'::jsonb check (jsonb_typeof(exercises) = 'array' and jsonb_array_length(exercises) <= 60),
  archived_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Treinos: registros ----------
-- entries: [{exercise_id, name, sets, reps, weight_kg, done}]
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_id uuid references public.workout_plans (id) on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  performed_on date not null,
  duration_min smallint check (duration_min between 1 and 600),
  effort smallint check (effort between 1 and 5),
  notes text check (char_length(notes) <= 2000),
  entries jsonb not null default '[]'::jsonb check (jsonb_typeof(entries) = 'array' and jsonb_array_length(entries) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workout_sessions_user_date_idx on public.workout_sessions (user_id, performed_on);
create index if not exists workout_sessions_plan_idx on public.workout_sessions (plan_id);

-- ---------- Alimentação: plano de refeições ----------
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  time text check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  planned text check (char_length(planned) <= 1000),
  days_of_week smallint[] not null default array[0,1,2,3,4,5,6]::smallint[]
    check (days_of_week <@ array[0,1,2,3,4,5,6]::smallint[] and cardinality(days_of_week) > 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Alimentação: registros do dia ----------
-- meal_id nulo = refeição fora do plano. Uma linha por refeição planejada e dia.
create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date date not null,
  meal_id uuid references public.meals (id) on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  status text not null default 'as_planned' check (status in ('as_planned', 'different', 'skipped')),
  description text check (char_length(description) <= 1000),
  time text check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meal_id, log_date)
);
create index if not exists meal_logs_user_date_idx on public.meal_logs (user_id, log_date);

-- ---------- Integridade entre donas ----------
create or replace function public.assert_same_owner_fase2b()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- (ifs aninhados: o PL/pgSQL não deixa ler um campo que a tabela não tem)
  if tg_table_name = 'workout_sessions' then
    if new.plan_id is not null and not exists (
      select 1 from workout_plans p where p.id = new.plan_id and p.user_id = new.user_id) then
      raise exception 'ficha inválida';
    end if;
  end if;
  if tg_table_name = 'meal_logs' then
    if new.meal_id is not null and not exists (
      select 1 from meals m where m.id = new.meal_id and m.user_id = new.user_id) then
      raise exception 'refeição inválida';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.assert_same_owner_fase2b() from public, anon, authenticated;

drop trigger if exists workout_sessions_owner on public.workout_sessions;
create trigger workout_sessions_owner before insert or update on public.workout_sessions
  for each row execute function public.assert_same_owner_fase2b();
drop trigger if exists meal_logs_owner on public.meal_logs;
create trigger meal_logs_owner before insert or update on public.meal_logs
  for each row execute function public.assert_same_owner_fase2b();

-- ---------- RLS: cada usuária só vê e mexe nas próprias linhas ----------
do $$
declare t text;
begin
  foreach t in array array['workout_plans','workout_sessions','meals','meal_logs'] loop
    execute format('drop trigger if exists %I_updated on public.%I', t, t);
    execute format('create trigger %I_updated before update on public.%I for each row execute function public.set_updated_at()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "dono: ler" on public.%I', t);
    execute format('drop policy if exists "dono: criar" on public.%I', t);
    execute format('drop policy if exists "dono: editar" on public.%I', t);
    execute format('drop policy if exists "dono: excluir" on public.%I', t);
    execute format('create policy "dono: ler" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "dono: criar" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "dono: editar" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "dono: excluir" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create index if not exists %I on public.%I (user_id)', t || '_user_idx', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- novos cartões no início para perfis novos (perfis antigos recebem pelo app)
alter table public.profiles alter column dashboard_widgets set default '[
  {"id":"tasks","visible":true},
  {"id":"events","visible":true},
  {"id":"habits","visible":true},
  {"id":"finance","visible":true},
  {"id":"workout","visible":true},
  {"id":"food","visible":true},
  {"id":"mood","visible":true},
  {"id":"reminders","visible":true}
]'::jsonb;
