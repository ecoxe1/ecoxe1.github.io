-- =====================================================================
-- Migração 03 (I1): limite de envios por janela de tempo, no servidor.
-- O honeypot e a espera de 60 s do site só valem no navegador; quem chama a API direto
-- ignora os dois. Esta trigger conta quantos envios entraram na última hora e recusa o excedente
-- com HTTP 429 (o site então mostra o texto pronto para mandar no Discord).
--
-- Dois limites por tabela, na janela de 1 hora:
--   por origem : mesmo aparelho/rede (guarda só um hash do IP, nunca o IP)
--   total      : somando todo mundo (trava de segurança; vale mesmo se alguém forjar o IP)
--   candidaturas: 3 por origem, 30 no total        amistosos: 5 por origem, 40 no total
-- Para mudar, altere os números no "create trigger" no fim e rode de novo.
--
-- Limites desta abordagem: o IP vem do cabeçalho que o Supabase repassa (cf-connecting-ip);
-- se vier ausente ou forjado, só o limite total protege. Um atacante pode esgotar o total e
-- bloquear envios legítimos por até 1 hora (o aviso com o texto para o Discord continua funcionando).
-- Se isso virar problema, o próximo passo é Cloudflare Turnstile + Edge Function.
--
-- Como rodar: SQL Editor do Supabase, depois da migração 02. Pode rodar de novo.
-- =====================================================================

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
