-- =====================================================================
-- Migração 14: a função checa-live (Edge Function) entra no banco como service_role.
-- Ela só precisa ler os canais e gravar o resultado (ate, video, titulo, checado_em) na tabela lives.
-- Pode rodar de novo.
-- =====================================================================

grant usage on schema public to service_role;
grant select, update on public.lives to service_role;
