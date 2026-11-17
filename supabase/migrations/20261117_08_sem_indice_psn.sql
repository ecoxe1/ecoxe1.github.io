-- =====================================================================
-- Migração 08: tira o índice único "uma candidatura pendente por ID".
-- Com ele, o 409 revelava a qualquer um que um ID já tinha se candidatado, e dava para "trancar"
-- a candidatura de outra pessoa enviando antes com o ID dela.
-- Agora o banco aceita repetidas; o site responde igual ao sucesso e o painel mostra o selo
-- "N com este ID" só para a diretoria. O limite por hora (migração 03) continua segurando spam.
-- Pode rodar de novo.
-- =====================================================================

drop index if exists public.candidaturas_psn_pendente;
