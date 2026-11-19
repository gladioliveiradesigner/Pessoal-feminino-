-- =====================================================================
-- Lume — Fase 1: perfil, categorias, agenda, tarefas, hábitos, humor
-- Toda tabela tem RLS: cada usuária acessa somente as próprias linhas.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tipos ----------
create type public.recurrence_freq as enum ('daily', 'weekly', 'monthly', 'yearly');
create type public.task_priority as enum ('low', 'medium', 'high');
create type public.day_period as enum ('morning', 'afternoon', 'evening', 'anytime');
create type public.theme_pref as enum ('light', 'dark', 'system');

-- ---------- Função utilitária: updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- Perfis ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  goals text[] not null default '{}',
  areas text[] not null default '{}',
  theme public.theme_pref not null default 'system',
  accent text not null default 'rose' check (accent in ('rose', 'lavender', 'sage', 'graphite')),
  enabled_modules text[] not null default array['agenda', 'tasks', 'habits'],
  dashboard_widgets jsonb not null default '[
    {"id":"tasks","visible":true},
    {"id":"events","visible":true},
    {"id":"habits","visible":true},
    {"id":"mood","visible":true},
    {"id":"reminders","visible":true}
  ]'::jsonb,
  week_starts_on smallint not null default 0 check (week_starts_on in (0, 1)),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Categorias (tarefas e compromissos) ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text not null default 'rose',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);
create index categories_user_idx on public.categories (user_id);

-- ---------- Compromissos ----------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  description text check (char_length(description) <= 4000),
  location text check (char_length(location) <= 200),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  category_id uuid references public.categories (id) on delete set null,
  recurrence_freq public.recurrence_freq,
  recurrence_interval smallint not null default 1 check (recurrence_interval between 1 and 365),
  recurrence_until date,
  reminder_minutes integer[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);
create index events_user_start_idx on public.events (user_id, starts_at);

-- ---------- Tarefas (subtarefas via parent_id) ----------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parent_id uuid references public.tasks (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  notes text check (char_length(notes) <= 4000),
  priority public.task_priority not null default 'medium',
  due_date date,
  due_time time,
  category_id uuid references public.categories (id) on delete set null,
  tags text[] not null default '{}',
  recurrence_freq public.recurrence_freq,
  recurrence_interval smallint not null default 1 check (recurrence_interval between 1 and 365),
  completed_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_user_due_idx on public.tasks (user_id, due_date);
create index tasks_parent_idx on public.tasks (parent_id);

-- ---------- Hábitos ----------
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  icon text not null default 'sparkles',
  color text not null default 'sage',
  days_of_week smallint[] not null default array[0,1,2,3,4,5,6]::smallint[],
  target_per_day smallint not null default 1 check (target_per_day between 1 and 50),
  unit text check (char_length(unit) <= 20),
  period public.day_period not null default 'anytime',
  archived_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (days_of_week <@ array[0,1,2,3,4,5,6]::smallint[] and cardinality(days_of_week) > 0)
);
create index habits_user_idx on public.habits (user_id);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  log_date date not null,
  count smallint not null default 1 check (count between 0 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);
create index habit_logs_user_date_idx on public.habit_logs (user_id, log_date);

-- ---------- Humor e energia (dado sensível: LGPD art. 11) ----------
create table public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entry_date date not null,
  mood smallint not null check (mood between 1 and 5),
  energy smallint check (energy between 1 and 5),
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

-- ---------- Integridade entre donos ----------
-- Impede apontar para categoria, hábito ou tarefa-mãe de outra usuária.
create or replace function public.assert_same_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name in ('events', 'tasks') then
    if new.category_id is not null and not exists (
      select 1 from categories c where c.id = new.category_id and c.user_id = new.user_id) then
      raise exception 'categoria inválida';
    end if;
  end if;
  if tg_table_name = 'tasks' then
    if new.parent_id is not null and not exists (
      select 1 from tasks t where t.id = new.parent_id and t.user_id = new.user_id) then
      raise exception 'tarefa principal inválida';
    end if;
  end if;
  if tg_table_name = 'habit_logs' then
    if not exists (select 1 from habits h where h.id = new.habit_id and h.user_id = new.user_id) then
      raise exception 'hábito inválido';
    end if;
  end if;
  return new;
end $$;

create trigger events_owner before insert or update on public.events
  for each row execute function public.assert_same_owner();
create trigger tasks_owner before insert or update on public.tasks
  for each row execute function public.assert_same_owner();
create trigger habit_logs_owner before insert or update on public.habit_logs
  for each row execute function public.assert_same_owner();

-- updated_at em todas as tabelas
do $$
declare t text;
begin
  foreach t in array array['profiles','categories','events','tasks','habits','habit_logs','mood_entries'] loop
    execute format('create trigger %I_updated before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.events enable row level security;
alter table public.tasks enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.mood_entries enable row level security;

-- Perfil: a linha é criada pelo gatilho de cadastro; a usuária lê e edita só a sua.
create policy "perfil: ler o próprio" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "perfil: editar o próprio" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

do $$
declare t text;
begin
  foreach t in array array['categories','events','tasks','habits','habit_logs','mood_entries'] loop
    execute format('create policy "dono: ler" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "dono: criar" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "dono: editar" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "dono: excluir" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- Nenhum acesso para visitantes não autenticados.
revoke all on all tables in schema public from anon;

-- ---------- Cadastro: cria perfil e categorias iniciais ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));

  insert into public.categories (user_id, name, color, position) values
    (new.id, 'Pessoal', 'rose', 0),
    (new.id, 'Trabalho', 'lavender', 1),
    (new.id, 'Casa', 'sage', 2),
    (new.id, 'Estudos', 'sky', 3),
    (new.id, 'Saúde', 'mint', 4),
    (new.id, 'Compras', 'sand', 5);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Exclusão de conta (LGPD: direito de eliminação) ----------
-- Apaga o usuário de auth.users; o "on delete cascade" remove todos os dados.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'não autenticada';
  end if;
  delete from auth.users where id = uid;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.assert_same_owner() from public, anon, authenticated;
