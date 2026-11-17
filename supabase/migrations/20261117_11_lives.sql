-- =====================================================================
-- Migração 11: transmissões ao vivo (página aovivo.html, aba "Ao vivo" do painel e selo AO VIVO).
-- O painel liga a live por algumas horas; passado o prazo, o site volta a mostrar offline sozinho.
-- Pode rodar de novo. Depende da migração 06 (private.is_admin).
-- =====================================================================

-- Uma linha por canal. "ate" = ao vivo até essa hora; vazio ou no passado = offline.
-- Guarda identificadores (nunca links): o site monta o endereço do player. O banco confere o formato de cada um.
create table if not exists public.lives (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  jogador text not null check (char_length(jogador) between 2 and 40),
  plataforma text not null check (plataforma in ('youtube','twitch','kick')),
  canal text not null,
  video text,
  titulo text not null default '' check (char_length(titulo) <= 80),
  ate timestamptz,
  constraint lives_canal_formato check (
    (plataforma = 'youtube' and canal ~ '^UC[A-Za-z0-9_-]{22}$') or
    (plataforma = 'twitch' and canal ~ '^[A-Za-z0-9_]{3,25}$') or
    (plataforma = 'kick' and canal ~ '^[A-Za-z0-9_-]{3,30}$')),
  constraint lives_video_formato check (video is null or (plataforma = 'youtube' and video ~ '^[A-Za-z0-9_-]{11}$'))
);
create unique index if not exists lives_canal_unico on public.lives (plataforma, lower(canal));
alter table public.lives enable row level security;

-- Canais e status são públicos (o visitante só lê). Só admin cadastra, liga, desliga e apaga.
grant select on public.lives to anon, authenticated;
grant insert, update, delete on public.lives to authenticated;
revoke insert, update, delete, truncate, references, trigger on public.lives from anon;

drop policy if exists "leitura publica" on public.lives;
create policy "leitura publica" on public.lives for select to anon, authenticated using (true);
drop policy if exists "admin gerencia" on public.lives;
create policy "admin gerencia" on public.lives for all to authenticated using (private.is_admin()) with check (private.is_admin());
