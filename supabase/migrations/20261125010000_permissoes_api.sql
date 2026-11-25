-- =====================================================================
-- Lume — permissões da API para usuárias logadas.
-- Projetos Supabase recentes não concedem acesso automático às tabelas
-- criadas por SQL; sem isso o app recebe "permission denied".
-- O RLS continua valendo: cada usuária só enxerga as próprias linhas.
-- =====================================================================
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
grant execute on function public.delete_my_account() to authenticated;
-- visitantes sem login continuam sem acesso a nada
revoke all on all tables in schema public from anon;
