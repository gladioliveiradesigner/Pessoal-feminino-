\set ON_ERROR_STOP on
-- Hábitos semanais/mensais, treinos e alimentação: isolamento e integridade.
insert into auth.users (id) values ('55555555-5555-5555-5555-555555555555'), ('66666666-6666-6666-6666-666666666666');
set role authenticated;
set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
insert into habits (name, frequency, target_per_period) values ('Academia', 'weekly', 3), ('Faxina', 'monthly', 1);
insert into workout_plans (name, days_of_week, exercises) values ('Treino A', '{1,4}', '[{"id":"x","name":"Agachamento","sets":4,"reps":"10","weight_kg":30}]');
insert into workout_sessions (plan_id, name, performed_on, duration_min, effort, entries)
  select id, name, current_date, 50, 3, '[{"exercise_id":"x","name":"Agachamento","sets":4,"reps":"10","weight_kg":32.5,"done":true}]' from workout_plans;
insert into meals (name, time, planned) values ('Almoço', '12:30', 'Arroz e feijão');
insert into meal_logs (log_date, meal_id, name, status) select current_date, id, name, 'as_planned' from meals;
insert into meal_logs (log_date, name, status) values (current_date, 'Lanche extra', 'different');
-- upsert do mesmo registro (app usa on conflict meal_id,log_date)
insert into meal_logs (log_date, meal_id, name, status) select current_date, id, name, 'skipped' from meals
  on conflict (meal_id, log_date) do update set status = excluded.status;
select status as status_almoco from meal_logs where meal_id is not null;
\set ON_ERROR_STOP off
-- devem falhar: semanal com 8 vezes, horário inválido, esforço 9
insert into habits (name, frequency, target_per_period) values ('x', 'weekly', 8);
insert into meals (name, time) values ('x', '25:00');
insert into workout_sessions (name, performed_on, effort) values ('x', current_date, 9);
\set ON_ERROR_STOP on
set request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
select (select count(*) from workout_plans) as fichas_visiveis_para_outra,
       (select count(*) from workout_sessions) as treinos, (select count(*) from meals) as refeicoes,
       (select count(*) from meal_logs) as registros;
update workout_plans set name = 'hack'; -- 0 linhas
\set ON_ERROR_STOP off
-- usar ficha/refeição da outra deve falhar
reset role;
insert into workout_sessions (user_id, plan_id, name, performed_on)
  select '66666666-6666-6666-6666-666666666666', id, 'x', current_date from workout_plans limit 1;
insert into meal_logs (user_id, meal_id, log_date, name)
  select '66666666-6666-6666-6666-666666666666', id, current_date, 'x' from meals limit 1;
set role anon;
select count(*) from meals; -- deve negar
reset role;
\set ON_ERROR_STOP on
select name from workout_plans; -- continua "Treino A"
