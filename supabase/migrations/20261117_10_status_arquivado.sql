-- =====================================================================
-- Migração 10: status "arquivado" em candidaturas e amistosos.
-- O painel agora arquiva em vez de apagar; "Apagar de vez" só aparece no que já está arquivado.
-- Amistoso arquivado sai da agenda pública (a view e a regra de leitura só mostram confirmado e realizado).
-- Pode rodar de novo.
-- =====================================================================

alter table public.candidaturas drop constraint if exists candidaturas_status_check;
alter table public.candidaturas add constraint candidaturas_status_check
  check (status in ('pendente','aprovado','recusado','arquivado'));

alter table public.amistosos drop constraint if exists amistosos_status_check;
alter table public.amistosos add constraint amistosos_status_check
  check (status in ('pendente','confirmado','realizado','recusado','arquivado'));
