-- =====================================================================
-- Migração 16: atualização automática das estatísticas todo dia às 06:00 de Brasília (09:00 UTC).
-- O pg_cron chama a função importa-tracker (supabase/functions/importa-tracker), que lê o Pro Clubs Tracker
-- e grava partidas, temporada e totais dos jogadores. Brasil não tem horário de verão desde 2019.
-- Ver as execuções:  select * from cron.job_run_details order by start_time desc limit 10;
-- Ver a resposta da função:  select status_code, content from net._http_response order by created desc limit 5;
-- Mudar o horário:  select cron.schedule('ec-oxe-importa-tracker', '0 9 * * *', ...);  (mesmo nome = substitui)
-- Parar:  select cron.unschedule('ec-oxe-importa-tracker');
-- Pode rodar de novo.
-- =====================================================================

-- A função entra como service_role: só lê e grava as duas tabelas das estatísticas.
grant select, insert, update on public.partidas, public.temporada to service_role;

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'ec-oxe-importa-tracker',
  '0 9 * * *',
  $$ select net.http_post(
       url := 'https://dvwvmoqslovnbjbvbeqd.supabase.co/functions/v1/importa-tracker',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{}'::jsonb,
       timeout_milliseconds := 30000
     ) $$
);
