-- =====================================================================
-- EC OXE: banco do site no Supabase.
-- Instalação NOVA: rodar este arquivo uma vez no SQL Editor. Pode rodar de novo sem quebrar nada.
-- Banco que já existia antes de 17/11/2026: NÃO use este arquivo para atualizar.
-- Rode, na ordem, os arquivos de supabase/migrations/ (01, 02, 03, 04). Eles têm o mesmo conteúdo
-- das seções "Links só http(s)", "Limite de envios", "Permissões" e "Regras" abaixo.
-- (Este arquivo e as migrações precisam andar juntos: mudou um, atualize o outro.)
--
-- Quem pode o quê:
--   visitante (anon)  -> envia candidatura e pedido de amistoso (só as colunas do formulário, com limite
--                        de envios por hora); lê notícias, vídeos e a agenda pública
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

-- ---------- Links só http(s) (migração 01) ----------
-- Impede "javascript:", "data:" etc. em lances, capas e origem de vídeo, mesmo para quem chama a API direto.
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

-- ---------- Limite de envios por hora (migração 03) ----------
-- Recusa o excedente com HTTP 429. Por origem (hash do IP, nunca o IP) e no total, janela de 1 hora:
-- candidaturas 3 por origem e 30 no total; amistosos 5 por origem e 40 no total (números no "create trigger").
-- O IP vem do cabeçalho repassado pelo Supabase; se vier ausente ou forjado, só o limite total protege.
alter table public.candidaturas add column if not exists origem text;
alter table public.amistosos    add column if not exists origem text;

create index if not exists candidaturas_origem_created on public.candidaturas (origem, created_at);
create index if not exists candidaturas_created        on public.candidaturas (created_at);
create index if not exists amistosos_origem_created    on public.amistosos (origem, created_at);
create index if not exists amistosos_created           on public.amistosos (created_at);

create or replace function public.limita_envios()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  papel text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '');
  cab json := coalesce(nullif(current_setting('request.headers', true), '')::json, '{}'::json);
  max_origem int := tg_argv[0]::int;
  max_total int := tg_argv[1]::int;
  ip text;
  n int;
begin
  -- SQL Editor, service_role e migrações não passam por aqui: só visitante (anon) e logado (authenticated)
  if papel not in ('anon', 'authenticated') then return new; end if;

  ip := nullif(btrim(coalesce(cab ->> 'cf-connecting-ip', cab ->> 'x-real-ip', split_part(coalesce(cab ->> 'x-forwarded-for', ''), ',', 1))), '');
  new.origem := null;
  if ip is not null then
    new.origem := encode(sha256(convert_to(ip || ':ec-oxe', 'utf8')), 'hex');
    execute format('select count(*) from public.%I where origem = $1 and created_at > now() - interval ''1 hour''', tg_table_name)
      into n using new.origem;
    if n >= max_origem then
      raise exception 'Muitos envios deste aparelho. Tente de novo mais tarde.' using errcode = 'PT429';
    end if;
  end if;

  execute format('select count(*) from public.%I where created_at > now() - interval ''1 hour''', tg_table_name) into n;
  if n >= max_total then
    raise exception 'Muitos envios no momento. Tente de novo mais tarde.' using errcode = 'PT429';
  end if;
  return new;
end
$$;
revoke all on function public.limita_envios() from public, anon, authenticated;

drop trigger if exists candidaturas_limita on public.candidaturas;
create trigger candidaturas_limita before insert on public.candidaturas
  for each row execute function public.limita_envios(3, 30);

drop trigger if exists amistosos_limita on public.amistosos;
create trigger amistosos_limita before insert on public.amistosos
  for each row execute function public.limita_envios(5, 40);

-- ---------- Agenda pública (migração 04) ----------
-- Só confirmados e realizados, sem contato nem observações. A view roda com as permissões de quem
-- consulta (security_invoker): o visitante só enxerga as 8 colunas liberadas abaixo e as linhas da policy "agenda publica".
create or replace view public.amistosos_publico as
  select id, time, plataforma, data, hora, status, placar_nos, placar_eles
  from public.amistosos where status in ('confirmado','realizado');
alter view public.amistosos_publico set (security_invoker = true);

-- ---------- Permissões da API (o projeto não expõe tabelas sozinho) ----------
grant usage on schema public to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant select on public.news, public.videos to anon, authenticated;
grant select, insert, update, delete on public.news, public.videos to authenticated;
grant select on public.admins to authenticated;
-- Projetos novos do Supabase dão ao visitante TRUNCATE/TRIGGER/REFERENCES por padrão; ele nunca precisa disso.
revoke insert, update, delete, truncate, references, trigger on public.news, public.videos, public.admins, public.amistosos_publico from anon;

-- Candidaturas e amistosos: o visitante só insere as colunas do formulário (id, created_at, status,
-- nota_admin, placares e origem ficam de fora). O admin lê, altera e apaga; se inserir, só as colunas do formulário.
revoke all on public.candidaturas, public.amistosos from anon, authenticated;
grant select, update, delete on public.candidaturas, public.amistosos to authenticated;
grant insert (psn, nick, plataforma, posicao, posicao2, contato, horarios, experiencia, clube_anterior, lances, sobre)
  on public.candidaturas to anon, authenticated;
grant insert (time, capitao, contato, plataforma, data, hora, data2, hora2, divisao, jogadores, obs)
  on public.amistosos to anon, authenticated;
grant select (id, time, plataforma, data, hora, status, placar_nos, placar_eles) on public.amistosos to anon;
grant select on public.amistosos_publico to anon, authenticated;

-- ---------- Regras (RLS) ----------
drop policy if exists "envio publico" on public.candidaturas;
create policy "envio publico" on public.candidaturas for insert to anon, authenticated
  with check (status = 'pendente' and nota_admin is null);
drop policy if exists "admin gerencia" on public.candidaturas;
create policy "admin gerencia" on public.candidaturas for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "envio publico" on public.amistosos;
create policy "envio publico" on public.amistosos for insert to anon, authenticated
  with check (status = 'pendente' and placar_nos is null and placar_eles is null and nota_admin is null);
drop policy if exists "agenda publica" on public.amistosos;
create policy "agenda publica" on public.amistosos for select to anon
  using (status in ('confirmado','realizado'));
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
