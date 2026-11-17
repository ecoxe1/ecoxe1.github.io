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
| `assets/js/vendor/supabase-2.118.0.min.js` | Biblioteca do Supabase usada só no painel, hospedada aqui (sem CDN). Para atualizar, troque o arquivo e o nome no `admin.html` |
| `supabase/schema.sql` | Banco completo para uma instalação **nova** (tabelas, regras de segurança, limite de envios e pasta de fotos) |
| `supabase/migrations/` | Alterações para um banco que **já existe**. Rode na ordem do nome (`01` a `10`) no SQL Editor. As 01 a 10 já foram rodadas no projeto `ec-oxe` em 17/11/2026 |
| `supabase/verificacao.sql` | Conferência só de leitura, para rodar depois das migrações |
| `tools/atualiza-head.js` | Gera o trecho comum do `<head>` das 8 páginas (CSP, fontes, ícones, prévia de compartilhamento) e troca o `?v=N` |
| `tools/check-data.js` | Confere o `data.js` (placar x gols, nomes do elenco, somas, V+E+D). Rode antes de commitar |
| `assets/img/` | `escudo-96/240/640.webp` (logo, miniaturas e destaque), `favicon-32.png`, `apple-touch-icon.png`, `icon-192/512.png` e `og-1200x630.jpg` (prévia no WhatsApp/Discord) |
| `_config.yml` | Diz ao GitHub Pages o que **não** publicar: `supabase/`, `tools/`, este LEIAME e os `.txt` |
| `.gitignore` | Arquivos locais que nunca vão para o repositório (listas de tarefas `.txt`) |

## Painel (admin.html)

Acesse https://ecoxe.club/admin.html e entre com o e-mail e a senha de administrador.

- **Candidaturas:** veja quem quer entrar, aprove ou recuse e anote. O selo "N com este ID" avisa quando o mesmo ID mandou mais de uma (o site não conta isso ao visitante).
- **Segurança:** "Sair" desconecta só este aparelho; o painel sai sozinho depois de 30 minutos parado e não abre dentro de outro site.
- **Amistosos:** confirme o pedido (ele aparece na agenda pública), depois marque como realizado e coloque o placar.
- **Arquivar:** candidaturas e amistosos não se apagam direto. "Arquivar" manda o item para a gaveta "Arquivados" no fim da lista (amistoso arquivado sai da agenda pública); lá dentro ficam "Desarquivar" e "Apagar de vez".
- **Notícias e Vídeos:** publique com foto ou vídeo, sem mexer em código. Para esconder sem apagar, edite e desmarque "Publicada". Apagar também tira do Storage as fotos e vídeos enviados pelo painel.

## Supabase

- Projeto `ec-oxe` (região São Paulo), organização EC OXE, plano Free.
- Cadastro público de usuários desligado: só quem a diretoria criar consegue entrar.
- Para dar acesso de admin a outra pessoa:
  1. Crie o usuário em *Authentication > Users > Add user* (com *Auto Confirm User*).
  2. No *SQL Editor*, rode:
     `insert into public.admins (user_id) select id from auth.users where email = 'email@da.pessoa';`
- Visitantes só conseguem **enviar** candidaturas e pedidos e **ler** notícias, vídeos e a agenda pública. Ler pedidos, postar e apagar exige login de admin.
- Nunca coloque a chave **secret** / **service_role** no site.
- Links (lances, capas, vídeos) só aceitam `http(s)`, tanto no site quanto no banco. Os envios têm limite por hora no servidor (candidaturas: 3 por aparelho e 30 no total; amistosos: 5 e 40). Os números ficam no fim de `supabase/migrations/20261117_03_limite_envios.sql` (e no `schema.sql`).
- Mudou o banco? Crie um arquivo novo em `supabase/migrations/` (`AAAAMMDD_NN_nome.sql`) e atualize o `schema.sql` para ficarem iguais.
- Todas as páginas têm uma política de conteúdo (`Content-Security-Policy` no `<head>`). Ela só libera o projeto Supabase do `config.js`, o YouTube e as fontes do Google: imagem de capa colada de outro site **não aparece** (suba a foto pelo painel). Se um dia o site passar a usar outro serviço externo (analytics, outra fonte, outro player), acrescente o endereço em `tools/atualiza-head.js` e rode o script; não edite o bloco `<!-- head:comum -->` à mão.

### Configurações no painel do Supabase (não são código)

1. *Authentication > Sign In / Providers*: desligar **Allow new users to sign up** e **Allow anonymous sign-ins**.
2. MFA (segundo fator): em *Authentication > Multi-Factor* confira que o TOTP está habilitado, mas **isso sozinho não protege nada**: o painel ainda não tem tela para cadastrar e pedir o código, nem as regras do banco exigem o segundo fator (`aal2`). Isso é uma etapa de código, ainda pendente. Até lá, use senha longa e única para cada admin.
3. Depois de rodar as migrações, abra *Advisors > Security Advisor* e confira se não sobrou alerta.

## Atualizar dados fixos

Elenco e partidas ficam em `assets/js/data.js`. Os números da página inicial são calculados a partir das partidas.
Horários das partidas em horário de Brasília, com `-03:00` no fim. Antes de commitar, rode `node tools/check-data.js`: ERRO precisa corrigir, AVISO é só para conferir.
Ao trocar CSS ou JS, aumente a versão para o navegador não usar a antiga: `node tools/atualiza-head.js 9` (troca o `?v=N` das 8 páginas; o número atual está no link do `style.css`).

## Ver no computador antes de publicar

```
npx http-server . -p 8090 -c-1
```

Depois acesse http://localhost:8090
