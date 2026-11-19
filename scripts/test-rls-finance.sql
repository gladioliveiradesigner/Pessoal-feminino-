\set ON_ERROR_STOP on
-- Finanças: isolamento entre usuárias, integridade e geração idempotente.
grant select, insert, update, delete on all tables in schema public to authenticated;
insert into auth.users (id) values ('33333333-3333-3333-3333-333333333333'), ('44444444-4444-4444-4444-444444444444');
select count(*) as cats_fin_carol from finance_categories where user_id = '33333333-3333-3333-3333-333333333333';
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into transactions (kind, description, amount_cents, occurred_on, category_id)
  select 'expense', 'Mercado', 25990, current_date, id from finance_categories where name = 'Mercado';
insert into recurring_transactions (kind, description, amount_cents, start_date) values ('expense', 'Aluguel', 180000, date_trunc('month', current_date));
insert into transactions (kind, description, amount_cents, occurred_on, recurring_id, status, source)
  select 'expense', 'Aluguel', 180000, start_date, id, 'pending', 'recurring' from recurring_transactions;
insert into budgets (month, amount_cents) values (date_trunc('month', current_date), 400000);
insert into savings_goals (name, target_cents) values ('Viagem', 500000);
\set ON_ERROR_STOP off
-- repetir a mesma ocorrência deve falhar (índice único)
insert into transactions (kind, description, amount_cents, occurred_on, recurring_id)
  select 'expense', 'Aluguel', 180000, start_date, id from recurring_transactions;
-- dois orçamentos totais no mesmo mês devem falhar
insert into budgets (month, amount_cents) values (date_trunc('month', current_date), 1);
-- valor negativo deve falhar
insert into transactions (kind, description, amount_cents, occurred_on) values ('income', 'x', -1, current_date);
\set ON_ERROR_STOP on
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select (select count(*) from transactions) as transacoes_visiveis_para_dani,
       (select count(*) from budgets) as orcamentos, (select count(*) from savings_goals) as metas,
       (select count(*) from finance_categories) as cats_proprias_dani;
\set ON_ERROR_STOP off
-- usar categoria da Carol deve falhar
insert into transactions (kind, description, amount_cents, occurred_on, category_id)
  values ('expense', 'x', 1, current_date, (select id from finance_categories limit 0));
reset role;
insert into transactions (user_id, kind, description, amount_cents, occurred_on, category_id)
  select '44444444-4444-4444-4444-444444444444', 'expense', 'x', 1, current_date, id from finance_categories where user_id = '33333333-3333-3333-3333-333333333333' limit 1;
\set ON_ERROR_STOP on
select count(*) as transacoes_carol from transactions where user_id = '33333333-3333-3333-3333-333333333333';
