-- =====================================================================
-- Migração 13: partidas e números da temporada no banco (importados do Pro Clubs Tracker pelo painel).
-- O site lê daqui e recalcula jogos, gols, assistências e MVP do elenco; o data.js fica como reserva.
-- Nomes são guardados como estão no jogo (PSN/gamertag); o site troca pelo nome do elenco quando o "psn" bate.
-- Só admin grava (aba Estatísticas do painel). Pode rodar de novo. Depende da migração 06.
-- =====================================================================

create table if not exists public.partidas (
  id text primary key check (id ~ '^[0-9]{1,20}$'),           -- número da partida no tracker/EA
  data timestamptz not null,
  adv text not null check (char_length(adv) between 1 and 60),
  comp text not null default 'Liga' check (char_length(comp) <= 30),
  gp int not null check (gp between 0 and 99),
  gc int not null check (gc between 0 and 99),
  gols text[] not null default '{}' check (coalesce(array_length(gols, 1), 0) <= 99),
  assist text[] not null default '{}' check (coalesce(array_length(assist, 1), 0) <= 99),
  mvp text not null default '' check (char_length(mvp) <= 40),
  obs text not null default '' check (char_length(obs) <= 200),
  -- quem jogou: [{"psn": "...", "pos": "MEI", "nota": 7.3}], no máximo 11
  jogadores jsonb not null default '[]' check (jsonb_typeof(jogadores) = 'array' and jsonb_array_length(jogadores) <= 11),
  atualizado_em timestamptz not null default now()
);
create index if not exists partidas_data on public.partidas (data desc);
alter table public.partidas enable row level security;

create table if not exists public.temporada (
  id smallint primary key default 1 check (id = 1),           -- uma linha só
  jogos int not null check (jogos between 0 and 999),
  v int not null check (v between 0 and 999),
  e int not null check (e between 0 and 999),
  d int not null check (d between 0 and 999),
  gp int not null check (gp between 0 and 9999),
  gc int not null check (gc between 0 and 9999),
  divisao int check (divisao between 0 and 10),
  sr int check (sr between 0 and 9999),
  atualizado_em timestamptz not null default now(),
  check (v + e + d = jogos)
);
alter table public.temporada enable row level security;

grant select on public.partidas, public.temporada to anon, authenticated;
grant insert, update, delete on public.partidas, public.temporada to authenticated;
revoke insert, update, delete, truncate, references, trigger on public.partidas, public.temporada from anon;

drop policy if exists "leitura publica" on public.partidas;
create policy "leitura publica" on public.partidas for select to anon, authenticated using (true);
drop policy if exists "admin gerencia" on public.partidas;
create policy "admin gerencia" on public.partidas for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "leitura publica" on public.temporada;
create policy "leitura publica" on public.temporada for select to anon, authenticated using (true);
drop policy if exists "admin gerencia" on public.temporada;
create policy "admin gerencia" on public.temporada for all to authenticated using (private.is_admin()) with check (private.is_admin());
