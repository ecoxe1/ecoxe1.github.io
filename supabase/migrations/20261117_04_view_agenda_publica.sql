-- =====================================================================
-- Migração 04 (I13): view da agenda pública sem "security definer".
-- Antes a view amistosos_publico rodava com as permissões do dono do banco e ignorava o RLS
-- (o linter do Supabase aponta isso como alerta). Agora ela roda com as permissões de quem consulta:
--   * o visitante (anon) só lê 8 colunas da tabela amistosos, e só linhas confirmadas ou realizadas;
--   * contato, capitão, observações, anotações e origem continuam impossíveis de ler pelo visitante.
-- A consulta do site (/rest/v1/amistosos_publico) não muda.
--
-- Como rodar: SQL Editor do Supabase, depois da migração 03. Pode rodar de novo.
-- Exige Postgres 15 ou mais novo (projetos atuais do Supabase têm).
-- =====================================================================

create or replace view public.amistosos_publico as
  select id, time, plataforma, data, hora, status, placar_nos, placar_eles
  from public.amistosos where status in ('confirmado','realizado');
alter view public.amistosos_publico set (security_invoker = true);

grant select (id, time, plataforma, data, hora, status, placar_nos, placar_eles) on public.amistosos to anon;
grant select on public.amistosos_publico to anon, authenticated;

drop policy if exists "agenda publica" on public.amistosos;
create policy "agenda publica" on public.amistosos for select to anon
  using (status in ('confirmado','realizado'));
