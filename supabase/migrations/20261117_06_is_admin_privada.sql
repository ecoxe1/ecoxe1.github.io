-- =====================================================================
-- Migração 06: esconde is_admin() da API.
-- O Security Advisor avisa 2 vezes (anon e authenticated) que public.is_admin() é SECURITY DEFINER e
-- pode ser chamada por /rest/v1/rpc/is_admin. Não vaza nada (só diz se o próprio usuário é admin),
-- mas não precisa ficar exposta. Um schema que não está em "Exposed schemas" não aparece na API.
-- As regras (RLS) continuam chamando a função: quem faz a consulta precisa de USAGE no schema e
-- EXECUTE na função, por isso os dois grants abaixo ficam. Eles não expõem nada pela API.
-- Pode rodar de novo. Rode no SQL Editor, de uma vez, depois das migrações 01 a 05.
-- =====================================================================

begin;

create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins where user_id = (select auth.uid())) $$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

-- Regras apontando para a função nova.
drop policy if exists "admin gerencia" on public.candidaturas;
create policy "admin gerencia" on public.candidaturas for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "admin gerencia" on public.amistosos;
create policy "admin gerencia" on public.amistosos for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "leitura publica" on public.news;
create policy "leitura publica" on public.news for select to anon, authenticated using (publicado or private.is_admin());
drop policy if exists "admin gerencia" on public.news;
create policy "admin gerencia" on public.news for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "leitura publica" on public.videos;
create policy "leitura publica" on public.videos for select to anon, authenticated using (publicado or private.is_admin());
drop policy if exists "admin gerencia" on public.videos;
create policy "admin gerencia" on public.videos for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "admin envia media" on storage.objects;
create policy "admin envia media" on storage.objects for insert to authenticated with check (bucket_id = 'media' and private.is_admin());
drop policy if exists "admin altera media" on storage.objects;
create policy "admin altera media" on storage.objects for update to authenticated using (bucket_id = 'media' and private.is_admin());
drop policy if exists "admin apaga media" on storage.objects;
create policy "admin apaga media" on storage.objects for delete to authenticated using (bucket_id = 'media' and private.is_admin());

-- Só agora a função antiga pode sair (nenhuma regra depende mais dela).
drop function if exists public.is_admin();

commit;

-- Conferência (deve devolver 1 linha, só em "private"):
--   select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.proname = 'is_admin';
-- Depois: Advisors > Security Advisor > Refresh. Os 2 avisos de is_admin() devem sumir.
-- Confira que "private" NÃO está em Settings > API > Exposed schemas (o padrão é só "public" e "graphql_public").
-- Teste: o painel (admin.html) continua listando candidaturas, e o visitante continua vendo notícias e vídeos publicados.
