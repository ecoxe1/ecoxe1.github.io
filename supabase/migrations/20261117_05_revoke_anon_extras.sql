-- =====================================================================
-- Migração 05: tira do visitante (anon) permissões que ele nunca usa.
-- Projetos novos do Supabase dão TRUNCATE, TRIGGER e REFERENCES por padrão. O RLS não cobre TRUNCATE,
-- então é melhor não deixar. Foi o "revoke" sugerido no bloco 4 do verificacao.sql.
-- Rodada no projeto ec-oxe em 17/11/2026. Pode rodar de novo.
-- =====================================================================

revoke insert, update, delete, truncate, references, trigger
  on public.news, public.videos, public.admins, public.amistosos_publico from anon;
