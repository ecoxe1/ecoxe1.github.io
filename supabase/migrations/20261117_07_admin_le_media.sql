-- =====================================================================
-- Migração 07: o admin precisa "enxergar" os arquivos da pasta media para trocar ou apagar.
-- No Storage do Supabase, update e delete só alcançam linhas que a regra de SELECT deixa ver.
-- Sem esta regra, o admin enviava fotos, mas trocar dava erro de RLS e apagar não apagava nada
-- (fotos de notícias apagadas ficavam para sempre no Storage).
-- A pasta continua pública para leitura pelo link direto (bucket público); esta regra só vale
-- para a API de listagem/gestão, e só para admin. Visitante continua sem enviar, trocar ou apagar.
-- Pode rodar de novo. Depende da migração 06 (private.is_admin).
-- =====================================================================

drop policy if exists "admin le media" on storage.objects;
create policy "admin le media" on storage.objects for select to authenticated
  using (bucket_id = 'media' and private.is_admin());
