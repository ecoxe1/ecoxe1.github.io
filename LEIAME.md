# Site do EC OXE

Site estático (HTML, CSS e JavaScript puro) publicado em **https://ecoxe.club**
(repositório `ecoxe1/ecoxe1.github.io`, GitHub Pages pela branch `main`; o arquivo `CNAME` liga o domínio).

DNS no GoDaddy: 4 registros `A @` para 185.199.108.153, .109.153, .110.153 e .111.153, e `CNAME www` para `ecoxe1.github.io`.
Não apague o arquivo `CNAME` do repositório, senão o domínio para de funcionar.

## Estrutura

| Arquivo | Para que serve |
|---|---|
| `index.html`, `elenco.html`, `partidas.html`, `amistosos.html`, `videos.html`, `noticias.html`, `recrutamento.html` | As páginas |
| `admin.html` | **Painel da diretoria** (login): candidaturas, amistosos, notícias e vídeos |
| `assets/js/data.js` | Dados fixos do time: nome, links, elenco, partidas e conteúdos de reserva |
| `assets/js/config.js` | Conexão com o Supabase (URL + chave publishable) |
| `assets/js/app.js` | Monta as páginas |
| `assets/js/admin.js` | Painel |
| `assets/css/style.css` | Visual. As cores ficam no topo (`--gold`, `--bg`...) |
| `supabase/schema.sql` | Script do banco (tabelas, regras de segurança e pasta de fotos) |

## Painel (admin.html)

Acesse https://ecoxe1.github.io/admin.html e entre com o e-mail e a senha de administrador.

- **Candidaturas:** veja quem quer entrar, aprove ou recuse e anote.
- **Amistosos:** confirme o pedido (ele aparece na agenda pública), depois marque como realizado e coloque o placar.
- **Notícias e Vídeos:** publique com foto ou vídeo, sem mexer em código.

## Supabase

- Projeto `ec-oxe` (região São Paulo), organização EC OXE, plano Free.
- Cadastro público de usuários desligado: só quem a diretoria criar consegue entrar.
- Para dar acesso de admin a outra pessoa:
  1. Crie o usuário em *Authentication > Users > Add user* (com *Auto Confirm User*).
  2. No *SQL Editor*, rode:
     `insert into public.admins (user_id) select id from auth.users where email = 'email@da.pessoa';`
- Visitantes só conseguem **enviar** candidaturas e pedidos e **ler** notícias, vídeos e a agenda pública. Ler pedidos, postar e apagar exige login de admin.
- Nunca coloque a chave **secret** / **service_role** no site.

## Atualizar dados fixos

Elenco e partidas ficam em `assets/js/data.js`. Os números da página inicial são calculados a partir das partidas.
Ao trocar CSS ou JS, aumente o `?v=N` nos links dos arquivos `.html` para o navegador não usar a versão antiga.

## Ver no computador antes de publicar

```
npx http-server . -p 8090 -c-1
```

Depois acesse http://localhost:8090
