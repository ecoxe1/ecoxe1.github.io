-- =====================================================================
-- Migração 02 (I2): visitante só insere as colunas do formulário.
-- Antes o "anon" podia definir id, created_at e (em candidaturas) nota_admin.
-- Agora o INSERT é liberado por coluna, e a policy também exige nota_admin vazio.
--
-- Como rodar: SQL Editor do Supabase, depois da migração 01. Pode rodar de novo, mas se rodar esta
-- depois da 04, rode a 04 outra vez (o "revoke" abaixo também zera a leitura por coluna da agenda pública).
-- O admin logado continua lendo, alterando e apagando candidaturas e amistosos. Se ele inserir direto,
-- vale a mesma regra do visitante: só as colunas do formulário (o painel nunca precisou disso).
-- =====================================================================

-- Zera as permissões de tabela (inclui as que o Supabase possa ter dado por padrão) e devolve só o necessário
revoke all on public.candidaturas, public.amistosos from anon, authenticated;
grant select, update, delete on public.candidaturas, public.amistosos to authenticated;

grant insert (psn, nick, plataforma, posicao, posicao2, contato, horarios, experiencia, clube_anterior, lances, sobre)
  on public.candidaturas to anon, authenticated;
grant insert (time, capitao, contato, plataforma, data, hora, data2, hora2, divisao, jogadores, obs)
  on public.amistosos to anon, authenticated;

-- Policies de envio: nasce pendente e sem anotação/placar
drop policy if exists "envio publico" on public.candidaturas;
create policy "envio publico" on public.candidaturas for insert to anon, authenticated
  with check (status = 'pendente' and nota_admin is null);

drop policy if exists "envio publico" on public.amistosos;
create policy "envio publico" on public.amistosos for insert to anon, authenticated
  with check (status = 'pendente' and placar_nos is null and placar_eles is null and nota_admin is null);
