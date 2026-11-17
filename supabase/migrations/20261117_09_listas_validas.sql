-- =====================================================================
-- Migração 09: campos de escolha só aceitam as opções dos formulários.
-- Antes aceitavam qualquer texto (até 30-40 letras), então um POST direto na API enchia o painel de lixo.
-- As listas são exatamente as dos <select> de recrutamento.html e amistosos.html. Vazio ('') e nulo continuam
-- valendo onde o campo é opcional. Mudou uma opção no HTML? Mude aqui também (nova migração) e no schema.sql.
-- Pode rodar de novo. As regras entram como NOT VALID (não conferem as linhas antigas).
-- PASSO 1 (antes): veja se há linha antiga fora da lista. Deve voltar vazio:
--   select 'cand' t, plataforma, posicao, posicao2, experiencia, null divisao from public.candidaturas
--    where plataforma not in ('','PlayStation 5','Xbox Series','PC')
--       or posicao not in ('Goleiro','Zagueiro','Lateral','Volante','Meia','Ponta','Atacante')
--       or posicao2 not in ('','Goleiro','Zagueiro','Lateral','Volante','Meia','Ponta','Atacante')
--       or experiencia not in ('','Começando agora','Jogo casual','Já joguei em clube','Competitivo / liga')
--   union all
--   select 'amis', plataforma, null, null, null, divisao from public.amistosos
--    where plataforma not in ('','PlayStation 5','Xbox Series','PC','Crossplay')
--       or divisao not in ('','1','2','3','4','5','6','7','8','9','10');
-- PASSO 3 (depois, se o PASSO 1 voltou vazio): rode os VALIDATE do fim do arquivo.
-- =====================================================================

alter table public.candidaturas drop constraint if exists candidaturas_plataforma_lista;
alter table public.candidaturas add constraint candidaturas_plataforma_lista
  check (plataforma in ('','PlayStation 5','Xbox Series','PC')) not valid;

alter table public.candidaturas drop constraint if exists candidaturas_posicao_lista;
alter table public.candidaturas add constraint candidaturas_posicao_lista
  check (posicao in ('Goleiro','Zagueiro','Lateral','Volante','Meia','Ponta','Atacante')) not valid;

alter table public.candidaturas drop constraint if exists candidaturas_posicao2_lista;
alter table public.candidaturas add constraint candidaturas_posicao2_lista
  check (posicao2 in ('','Goleiro','Zagueiro','Lateral','Volante','Meia','Ponta','Atacante')) not valid;

alter table public.candidaturas drop constraint if exists candidaturas_experiencia_lista;
alter table public.candidaturas add constraint candidaturas_experiencia_lista
  check (experiencia in ('','Começando agora','Jogo casual','Já joguei em clube','Competitivo / liga')) not valid;

alter table public.amistosos drop constraint if exists amistosos_plataforma_lista;
alter table public.amistosos add constraint amistosos_plataforma_lista
  check (plataforma in ('','PlayStation 5','Xbox Series','PC','Crossplay')) not valid;

alter table public.amistosos drop constraint if exists amistosos_divisao_lista;
alter table public.amistosos add constraint amistosos_divisao_lista
  check (divisao in ('','1','2','3','4','5','6','7','8','9','10')) not valid;

-- PASSO 3:
--   alter table public.candidaturas validate constraint candidaturas_plataforma_lista;
--   alter table public.candidaturas validate constraint candidaturas_posicao_lista;
--   alter table public.candidaturas validate constraint candidaturas_posicao2_lista;
--   alter table public.candidaturas validate constraint candidaturas_experiencia_lista;
--   alter table public.amistosos validate constraint amistosos_plataforma_lista;
--   alter table public.amistosos validate constraint amistosos_divisao_lista;
