-- =====================================================================
-- Migração 12: farol "Ao vivo" com checagem automática.
-- A função checa-live (supabase/functions/checa-live) consulta YouTube e Twitch quando alguém clica no farol
-- ou quando o prazo de uma live vence, e grava o resultado aqui para todo mundo ver a mesma cor.
-- checado_em = hora da última consulta; a função não consulta o mesmo canal de novo em menos de 1 minuto.
-- Pode rodar de novo. Depende da migração 11.
-- =====================================================================

alter table public.lives add column if not exists checado_em timestamptz;
