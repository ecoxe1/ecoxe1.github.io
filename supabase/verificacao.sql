-- =====================================================================
-- EC OXE: conferência (SÓ LEITURA) depois de rodar as migrações.
-- Cole no SQL Editor do Supabase e rode. Não altera nada.
-- Cada bloco diz o que deve aparecer.
-- =====================================================================

-- 1) Regras de link e de formato. Devem listar 4 linhas; "validada" = false só enquanto você não rodar o PASSO 3 da migração 01.
select conrelid::regclass as tabela, conname as regra, convalidated as validada
from pg_constraint
where conname in ('candidaturas_lances_http', 'news_capa_http', 'videos_capa_http', 'videos_src_formato')
order by 1, 2;

-- 2) Linhas antigas fora do padrão. Devem voltar 0 nas três linhas (se voltar mais, corrija ou apague essas linhas e valide as regras).
select 'candidaturas.lances' as onde, count(*) as fora_do_padrao from public.candidaturas where lances is not null and lances !~* '^https?://[^[:space:]]+$'
union all select 'news.capa', count(*) from public.news where capa <> '' and capa !~* '^https?://[^[:space:]]+$'
union all select 'videos.capa/src', count(*) from public.videos
  where (capa <> '' and capa !~* '^https?://[^[:space:]]+$') or src !~* '^(youtube:[A-Za-z0-9_-]{11}|(arquivo|link):https?://[^[:space:]]+)$';

-- 3) O visitante (anon) só pode inserir estas colunas. Candidaturas: psn, nick, plataforma, posicao, posicao2, contato, horarios, experiencia,
--    clube_anterior, lances, sobre. Amistosos: time, capitao, contato, plataforma, data, hora, data2, hora2, divisao, jogadores, obs.
--    NÃO podem aparecer id, created_at, status, nota_admin, placar_nos, placar_eles nem origem.
select table_name, privilege_type, string_agg(column_name, ', ' order by column_name) as colunas
from information_schema.column_privileges
where table_schema = 'public' and grantee = 'anon' and table_name in ('candidaturas', 'amistosos') and privilege_type in ('INSERT', 'SELECT')
group by 1, 2 order by 1, 2;
-- (amistosos/SELECT deve ter só: data, hora, id, placar_eles, placar_nos, plataforma, status, time)

-- 4) O visitante NÃO pode ter permissão de tabela inteira nem escrita nas outras tabelas. Deve voltar vazio, ou só SELECT em news, videos e amistosos_publico.
select table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and grantee = 'anon' and not (privilege_type = 'SELECT' and table_name in ('news', 'videos', 'amistosos_publico'))
order by 1, 2;
-- Se aparecerem INSERT/UPDATE/DELETE em news, videos, admins ou amistosos_publico (projetos antigos dão tudo por padrão), o RLS ainda bloqueia,
-- mas vale tirar: revoke insert, update, delete, truncate, references, trigger on public.news, public.videos, public.admins, public.amistosos_publico from anon;

-- 5) Triggers de limite de envios (candidaturas_limita e amistosos_limita) e função sem acesso para anon/authenticated
select tgrelid::regclass as tabela, tgname as trigger, tgenabled as ativa from pg_trigger where tgname in ('candidaturas_limita', 'amistosos_limita');
select has_function_privilege('anon', 'public.limita_envios()', 'execute') as anon_executa, has_function_privilege('authenticated', 'public.limita_envios()', 'execute') as logado_executa; -- ambos false

-- 6) A view da agenda pública deve rodar com as permissões de quem consulta: reloptions = {security_invoker=true}
select relname, reloptions from pg_class where relname = 'amistosos_publico';

-- 7) Regras de acesso (RLS) das tabelas do site
select tablename, policyname, cmd, roles from pg_policies where schemaname = 'public' order by tablename, policyname;
