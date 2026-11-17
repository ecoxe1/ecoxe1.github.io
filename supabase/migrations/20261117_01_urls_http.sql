-- =====================================================================
-- Migração 01 (C1): links só http(s) no banco.
-- Impede gravar "javascript:", "data:" etc. em lances, capas e origem de vídeo,
-- mesmo para quem chama a API direto, sem passar pelo site.
--
-- Como rodar: SQL Editor do Supabase, depois de ler os passos abaixo. Pode rodar de novo.
-- As regras entram como NOT VALID: valem para tudo que for gravado daqui para frente
-- e não derrubam a migração se já houver linha antiga fora do padrão.
-- =====================================================================

-- PASSO 1 (opcional, só leitura): ver se já existe linha fora do padrão. O ideal é não voltar nada.
--   select id, lances from public.candidaturas where lances is not null and lances !~* '^https?://[^[:space:]]+$';
--   select id, capa   from public.news         where capa <> '' and capa !~* '^https?://[^[:space:]]+$';
--   select id, capa, src from public.videos     where (capa <> '' and capa !~* '^https?://[^[:space:]]+$')
--                                                  or src !~* '^(youtube:[A-Za-z0-9_-]{11}|(arquivo|link):https?://[^[:space:]]+)$';

-- PASSO 2: as regras
alter table public.candidaturas drop constraint if exists candidaturas_lances_http;
alter table public.candidaturas add constraint candidaturas_lances_http
  check (lances is null or lances ~* '^https?://[^[:space:]]+$') not valid;

alter table public.news drop constraint if exists news_capa_http;
alter table public.news add constraint news_capa_http
  check (capa = '' or capa ~* '^https?://[^[:space:]]+$') not valid;

alter table public.videos drop constraint if exists videos_capa_http;
alter table public.videos add constraint videos_capa_http
  check (capa = '' or capa ~* '^https?://[^[:space:]]+$') not valid;

-- src do vídeo: "youtube:ID" (11 caracteres), "arquivo:https://..." ou "link:https://..."
alter table public.videos drop constraint if exists videos_src_formato;
alter table public.videos add constraint videos_src_formato
  check (src ~* '^(youtube:[A-Za-z0-9_-]{11}|(arquivo|link):https?://[^[:space:]]+)$') not valid;

-- PASSO 3 (depois que o PASSO 1 não mostrar nada, ou depois de corrigir/apagar as linhas): validar as linhas antigas
--   alter table public.candidaturas validate constraint candidaturas_lances_http;
--   alter table public.news         validate constraint news_capa_http;
--   alter table public.videos       validate constraint videos_capa_http;
--   alter table public.videos       validate constraint videos_src_formato;
