# Site do EC OXE

Site estático (HTML, CSS e JavaScript puro). Não precisa instalar nada nem compilar.

## Estrutura

| Arquivo | Para que serve |
|---|---|
| `index.html`, `elenco.html`, `partidas.html`, `amistosos.html`, `videos.html`, `noticias.html`, `recrutamento.html` | As páginas |
| `assets/js/data.js` | **Todos os dados do time**: nome, links, elenco, partidas, vídeos, notícias |
| `assets/js/config.js` | Conexão opcional com o Supabase (formulários) |
| `assets/js/app.js` | Monta as páginas a partir do `data.js` |
| `assets/css/style.css` | Visual. As cores ficam no topo (`--gold`, `--bg`...) |
| `assets/img/escudo.webp` | Escudo |
| `assets/players/` | Fotos dos jogadores (retrato vertical, ~400x480) |
| `assets/videos/`, `assets/news/` | Vídeos, capas e fotos das notícias |

## Atualizar o site

Quase tudo se faz editando `assets/js/data.js`:

- **Novo jogo:** acrescente uma linha no topo de `partidas`. Os números da página inicial (jogos, % de vitórias, gols, saldo) são calculados sozinhos.
- **Jogador novo:** acrescente uma linha em `elenco`. Se ele sair do time, troque `ativo:true` por `ativo:false`.
- **Foto de jogador:** salve em `assets/players/` e coloque o nome do arquivo em `foto:"nome.jpg"`.
- **Discord, Instagram, YouTube:** preencha em `clube` no topo. Botão de link vazio não aparece.

## Ver no computador antes de publicar

Abra um terminal na pasta e rode:

```
npx http-server . -p 8090 -c-1
```

Depois acesse http://localhost:8090

## Publicar grátis no GitHub Pages

1. No GitHub Desktop: *File > Add local repository* e escolha esta pasta (ele oferece criar o repositório).
2. *Publish repository*, deixando **público**.
3. No site do GitHub, no repositório: *Settings > Pages > Branch: main / root > Save*.
4. Em 1 ou 2 minutos o site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.
5. Domínio próprio (opcional): registre no registro.br e configure em *Settings > Pages > Custom domain*.

## Ligar os formulários (opcional, grátis)

Sem isso, os formulários de recrutamento e amistoso mostram um texto pronto para a pessoa copiar e mandar no Discord.

1. Crie uma conta e um projeto em https://supabase.com
2. No projeto, abra *SQL Editor*, cole o bloco abaixo e clique em *Run*.
3. Em *Project Settings > API*, copie a **Project URL** e a chave **publishable** (ou "anon public") para `assets/js/config.js`.
   Nunca use a chave **secret** / **service_role** no site.
4. As candidaturas e pedidos aparecem em *Table Editor*. Para mostrar um amistoso na agenda pública, mude o `status` dele para `confirmado`.

```sql
-- Candidaturas do recrutamento
create table public.candidaturas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pendente',
  psn text not null check (char_length(psn) between 2 and 40),
  nick text, plataforma text,
  posicao text not null, posicao2 text,
  contato text not null check (char_length(contato) between 3 and 120),
  horarios text, experiencia text, clube_anterior text, lances text,
  sobre text check (char_length(sobre) <= 800)
);
-- Impede duas candidaturas pendentes para o mesmo ID (o site mostra o aviso)
create unique index candidaturas_psn_pendente on public.candidaturas (lower(psn)) where status = 'pendente';

-- Pedidos de amistoso
create table public.amistosos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pendente',   -- pendente, confirmado, realizado, recusado
  time text not null check (char_length(time) between 2 and 60),
  capitao text not null, contato text not null, plataforma text,
  data date not null, hora time not null, data2 date, hora2 time,
  divisao text, jogadores int check (jogadores between 1 and 11),
  obs text check (char_length(obs) <= 600)
);

-- Visitantes só podem INSERIR. Ninguém de fora lê, edita ou apaga.
alter table public.candidaturas enable row level security;
alter table public.amistosos enable row level security;
create policy "envio publico" on public.candidaturas for insert to anon with check (status = 'pendente');
create policy "envio publico" on public.amistosos for insert to anon with check (status = 'pendente');

-- Agenda pública: só amistosos confirmados, sem contato nem observações
create view public.amistosos_publico as
  select id, time, plataforma, data, hora from public.amistosos where status = 'confirmado';
grant select on public.amistosos_publico to anon;
```
