-- =====================================================================
-- Lume — Fase 2: Finanças
-- Valores em centavos (inteiros) para evitar erros de arredondamento.
-- Sem integração bancária: tudo é lançado manualmente. A coluna `source`
-- e `external_id` deixam a porta aberta para importações futuras.
-- =====================================================================

create type public.money_kind as enum ('income', 'expense');
create type public.payment_kind as enum ('cash', 'debit', 'credit', 'pix', 'transfer', 'other');
create type public.txn_status as enum ('paid', 'pending');

-- ---------- Formas de pagamento ----------
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  kind public.payment_kind not null default 'other',
  archived_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------- Categorias financeiras ----------
create table public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  kind public.money_kind not null,
  color text not null default 'graphite',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind, name)
);

-- ---------- Metas de economia ----------
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  target_cents bigint not null check (target_cents > 0 and target_cents <= 100000000000),
  saved_cents bigint not null default 0 check (saved_cents >= 0 and saved_cents <= 100000000000),
  deadline date,
  color text not null default 'sage',
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Lançamentos recorrentes (modelo) ----------
create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind public.money_kind not null,
  description text not null check (char_length(description) between 1 and 140),
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 100000000000),
  category_id uuid references public.finance_categories (id) on delete set null,
  payment_method_id uuid references public.payment_methods (id) on delete set null,
  freq public.recurrence_freq not null default 'monthly',
  interval_count smallint not null default 1 check (interval_count between 1 and 365),
  start_date date not null,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

-- ---------- Lançamentos ----------
-- status 'pending' + despesa = conta a pagar (occurred_on é o vencimento).
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind public.money_kind not null,
  description text not null check (char_length(description) between 1 and 140),
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 100000000000),
  occurred_on date not null,
  status public.txn_status not null default 'paid',
  paid_at date,
  category_id uuid references public.finance_categories (id) on delete set null,
  payment_method_id uuid references public.payment_methods (id) on delete set null,
  recurring_id uuid references public.recurring_transactions (id) on delete set null,
  notes text check (char_length(notes) <= 2000),
  source text not null default 'manual' check (source in ('manual', 'recurring', 'import')),
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transactions_user_date_idx on public.transactions (user_id, occurred_on);
-- uma ocorrência por recorrência e data (geração idempotente)
create unique index transactions_recurring_once on public.transactions (recurring_id, occurred_on) where recurring_id is not null;

-- ---------- Orçamento mensal ----------
-- category_id nulo = orçamento total do mês.
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  category_id uuid references public.finance_categories (id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 100000000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, month, category_id)
);

-- ---------- Integridade entre donos ----------
create or replace function public.assert_same_owner_finance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name in ('transactions', 'recurring_transactions', 'budgets') then
    if new.category_id is not null and not exists (
      select 1 from finance_categories c where c.id = new.category_id and c.user_id = new.user_id) then
      raise exception 'categoria inválida';
    end if;
  end if;
  if tg_table_name in ('transactions', 'recurring_transactions') then
    if new.payment_method_id is not null and not exists (
      select 1 from payment_methods p where p.id = new.payment_method_id and p.user_id = new.user_id) then
      raise exception 'forma de pagamento inválida';
    end if;
  end if;
  if tg_table_name = 'transactions' then
    if new.recurring_id is not null and not exists (
      select 1 from recurring_transactions r where r.id = new.recurring_id and r.user_id = new.user_id) then
      raise exception 'recorrência inválida';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.assert_same_owner_finance() from public, anon, authenticated;

create trigger transactions_owner before insert or update on public.transactions
  for each row execute function public.assert_same_owner_finance();
create trigger recurring_owner before insert or update on public.recurring_transactions
  for each row execute function public.assert_same_owner_finance();
create trigger budgets_owner before insert or update on public.budgets
  for each row execute function public.assert_same_owner_finance();

do $$
declare t text;
begin
  foreach t in array array['payment_methods','finance_categories','savings_goals','recurring_transactions','transactions','budgets'] loop
    execute format('create trigger %I_updated before update on public.%I for each row execute function public.set_updated_at()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "dono: ler" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "dono: criar" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "dono: editar" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "dono: excluir" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create index %I on public.%I (user_id)', t || '_user_idx', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- índices das chaves estrangeiras (consultas e exclusões em cascata)
create index transactions_category_idx on public.transactions (category_id);
create index transactions_payment_idx on public.transactions (payment_method_id);
create index recurring_category_idx on public.recurring_transactions (category_id);
create index recurring_payment_idx on public.recurring_transactions (payment_method_id);
create index budgets_category_idx on public.budgets (category_id);

-- ---------- Dados iniciais de finanças ----------
create or replace function public.seed_finance_defaults(uid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.finance_categories (user_id, name, kind, color, position) values
    (uid, 'Salário', 'income', 'sage', 0),
    (uid, 'Renda extra', 'income', 'mint', 1),
    (uid, 'Outras receitas', 'income', 'sky', 2),
    (uid, 'Moradia', 'expense', 'lavender', 0),
    (uid, 'Mercado', 'expense', 'sage', 1),
    (uid, 'Transporte', 'expense', 'sky', 2),
    (uid, 'Saúde', 'expense', 'mint', 3),
    (uid, 'Lazer', 'expense', 'rose', 4),
    (uid, 'Beleza e cuidados', 'expense', 'rose', 5),
    (uid, 'Educação', 'expense', 'sand', 6),
    (uid, 'Contas e assinaturas', 'expense', 'graphite', 7),
    (uid, 'Outros', 'expense', 'graphite', 8)
  on conflict do nothing;
  insert into public.payment_methods (user_id, name, kind, position) values
    (uid, 'Pix', 'pix', 0),
    (uid, 'Cartão de débito', 'debit', 1),
    (uid, 'Cartão de crédito', 'credit', 2),
    (uid, 'Dinheiro', 'cash', 3)
  on conflict do nothing;
end $$;
revoke all on function public.seed_finance_defaults(uuid) from public, anon, authenticated;

-- novas contas recebem as categorias financeiras no cadastro
create or replace function public.handle_new_user_finance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.seed_finance_defaults(new.id);
  return new;
end $$;
revoke all on function public.handle_new_user_finance() from public, anon, authenticated;

create trigger on_auth_user_created_finance
  after insert on auth.users
  for each row execute function public.handle_new_user_finance();

-- contas já existentes também recebem
select public.seed_finance_defaults(id) from auth.users;

-- finanças passa a vir ativada por padrão
alter table public.profiles alter column enabled_modules set default array['agenda', 'tasks', 'habits', 'finance'];
alter table public.profiles alter column dashboard_widgets set default '[
  {"id":"tasks","visible":true},
  {"id":"events","visible":true},
  {"id":"habits","visible":true},
  {"id":"finance","visible":true},
  {"id":"mood","visible":true},
  {"id":"reminders","visible":true}
]'::jsonb;
