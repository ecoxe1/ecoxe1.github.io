-- =====================================================================
-- Migração 15: totais da temporada de cada jogador (aba Players do Pro Clubs Tracker).
-- O tracker só guarda as 10 últimas partidas; somar essas partidas dava números baixos (ex.: 3 jogos para
-- quem tinha 12). Os totais vêm da EA pela aba Players e ficam aqui, na linha única da temporada:
-- [{"psn": "...", "nome_jogo": "...", "pos": "ST", "ovr": 78, "jogos": 21, "gols": 42, "assist": 18, "mvp": 6, "nota": 7.8}]
-- Pode rodar de novo.
-- =====================================================================

alter table public.temporada add column if not exists jogadores jsonb not null default '[]';
alter table public.temporada drop constraint if exists temporada_jogadores_lista;
alter table public.temporada add constraint temporada_jogadores_lista check (jsonb_typeof(jogadores) = 'array' and jsonb_array_length(jogadores) <= 40);
