-- =====================================================================
-- EC OXE: banco do site no Supabase.
-- Rodar uma vez no SQL Editor. Pode rodar de novo sem quebrar nada.
--
-- Quem pode o quê:
--   visitante (anon)  -> envia candidatura e pedido de amistoso; lê notícias, vídeos e a agenda pública
--   administrador     -> lê e muda tudo, posta notícias/vídeos e envia fotos (tabela admins)
-- =====================================================================

-- ---------- Administradores ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins where user_id = (select auth.uid())) $$;

drop policy if exists "admin ve a si mesmo" on public.admins;
create policy "admin ve a si mesmo" on public.admins for select to authenticated using (user_id = (select auth.uid()));

-- ---------- Candidaturas (recrutamento) ----------
create table if not exists public.candidaturas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pendente' check (status in ('pendente','aprovado','recusado')),
  psn text not null check (char_length(psn) between 2 and 40),
  nick text check (char_length(nick) <= 40),
  plataforma text check (char_length(plataforma) <= 30),
  posicao text not null check (char_length(posicao) between 1 and 30),
  posicao2 text check (char_length(posicao2) <= 30),
  contato text not null check (char_length(contato) between 3 and 120),
  horarios text check (char_length(horarios) <= 120),
  experiencia text check (char_length(experiencia) <= 40),
  clube_anterior text check (char_length(clube_anterior) <= 60),
  lances text check (char_length(lances) <= 300),
  sobre text check (char_length(sobre) <= 800),
  nota_admin text
);
-- Uma candidatura pendente por ID (o site mostra "já recebemos" quando repete)
create unique index if not exists candidaturas_psn_pendente on public.candidaturas (lower(psn)) where status = 'pendente';
alter table public.candidaturas enable row level security;

-- ---------- Amistosos ----------
create table if not exists public.amistosos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pendente' check (status in ('pendente','confirmado','realizado','recusado')),
  time text not null check (char_length(time) between 2 and 60),
  capitao text not null check (char_length(capitao) between 2 and 40),
  contato text not null check (char_length(contato) between 3 and 120),
  plataforma text check (char_length(plataforma) <= 30),
  data date not null,
  hora time not null,
  data2 date,
  hora2 time,
  divisao text check (char_length(divisao) <= 30),
  jogadores int check (jogadores between 1 and 11),
  obs text check (char_length(obs) <= 600),
  placar_nos int check (placar_nos >= 0),
  placar_eles int check (placar_eles >= 0),
  nota_admin text
);
alter table public.amistosos enable row level security;

-- Agenda pública: só confirmados e realizados, sem contato nem observações
create or replace view public.amistosos_publico as
  select id, time, plataforma, data, hora, status, placar_nos, placar_eles
  from public.amistosos where status in ('confirmado','realizado');

-- ---------- Notícias ----------
create table if not exists public.news (
  id text primary key check (id ~ '^[a-z0-9-]{2,80}$'),
  created_at timestamptz not null default now(),
  data date not null default current_date,
  chapeu text not null default 'Clube',
  titulo text not null check (char_length(titulo) between 3 and 160),
  resumo text not null default '',
  autor text not null default 'Diretoria',
  capa text not null default '',
  corpo text not null default '',
  publicado boolean not null default true
);
alter table public.news enable row level security;

-- ---------- Vídeos ----------
create table if not exists public.videos (
  id text primary key check (id ~ '^[a-z0-9-]{2,80}$'),
  created_at timestamptz not null default now(),
  data date not null default current_date,
  titulo text not null check (char_length(titulo) between 3 and 160),
  tipo text not null default 'lance' check (tipo in ('lance','partida')),
  src text not null,
  capa text not null default '',
  descr text not null default '',
  partida text not null default '',
  publicado boolean not null default true
);
alter table public.videos enable row level security;

-- ---------- Permissões da API (o projeto não expõe tabelas sozinho) ----------
grant usage on schema public to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant insert on public.candidaturas, public.amistosos to anon, authenticated;
grant select on public.news, public.videos, public.amistosos_publico to anon, authenticated;
grant select, insert, update, delete on public.candidaturas, public.amistosos, public.news, public.videos to authenticated;
grant select on public.admins to authenticated;

-- ---------- Regras (RLS) ----------
drop policy if exists "envio publico" on public.candidaturas;
create policy "envio publico" on public.candidaturas for insert to anon, authenticated with check (status = 'pendente');
drop policy if exists "admin gerencia" on public.candidaturas;
create policy "admin gerencia" on public.candidaturas for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "envio publico" on public.amistosos;
create policy "envio publico" on public.amistosos for insert to anon, authenticated
  with check (status = 'pendente' and placar_nos is null and placar_eles is null and nota_admin is null);
drop policy if exists "admin gerencia" on public.amistosos;
create policy "admin gerencia" on public.amistosos for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "leitura publica" on public.news;
create policy "leitura publica" on public.news for select to anon, authenticated using (publicado or public.is_admin());
drop policy if exists "admin gerencia" on public.news;
create policy "admin gerencia" on public.news for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "leitura publica" on public.videos;
create policy "leitura publica" on public.videos for select to anon, authenticated using (publicado or public.is_admin());
drop policy if exists "admin gerencia" on public.videos;
create policy "admin gerencia" on public.videos for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Fotos e vídeos enviados pelo painel ----------
-- Pasta pública "media" (até 50 MB por arquivo; só imagens e vídeos). Só admin envia, troca ou apaga.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin envia media" on storage.objects;
create policy "admin envia media" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "admin altera media" on storage.objects;
create policy "admin altera media" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
drop policy if exists "admin apaga media" on storage.objects;
create policy "admin apaga media" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());
