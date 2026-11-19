\set ON_ERROR_STOP on
grant select, insert, update, delete on all tables in schema public to authenticated;
insert into auth.users (id, raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111', '{"display_name":"Ana"}'),
 ('22222222-2222-2222-2222-222222222222', '{"display_name":"Bia"}');
select count(*) as categorias_criadas from public.categories;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select display_name from profiles; -- só Ana
select count(*) as cats_ana from categories;
insert into tasks (title, due_date) values ('Comprar flores', current_date);
insert into habits (name) values ('Beber água');
insert into habit_logs (habit_id, log_date) select id, current_date from habits;
insert into mood_entries (entry_date, mood) values (current_date, 4);
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select count(*) as tarefas_visiveis_para_bia from tasks;
select count(*) as humor_visivel_para_bia from mood_entries;
update tasks set title = 'hack'; -- deve afetar 0 linhas
\set ON_ERROR_STOP off
-- tentar usar categoria da Ana: deve falhar
insert into tasks (title, category_id) select 'x', id from categories where user_id = '11111111-1111-1111-1111-111111111111' limit 1;
-- tentar inserir com user_id de outra: deve falhar (RLS)
insert into tasks (user_id, title) values ('11111111-1111-1111-1111-111111111111', 'x');
\set ON_ERROR_STOP on
select delete_my_account();
reset role;
select count(*) as usuarios_restantes, (select count(*) from categories) as cats_restantes from auth.users;
set role anon;
\set ON_ERROR_STOP off
select * from tasks;
