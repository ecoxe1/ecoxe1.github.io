# Site do EC OXE

Site estático (HTML, CSS e JavaScript puro) publicado em **https://ecoxe.club**
(repositório `ecoxe1/ecoxe1.github.io`, GitHub Pages pela branch `main`; o arquivo `CNAME` liga o domínio).

DNS no GoDaddy: 4 registros `A @` para 185.199.108.153, .109.153, .110.153 e .111.153, e `CNAME www` para `ecoxe1.github.io`.
Não apague o arquivo `CNAME` do repositório, senão o domínio para de funcionar.

## Estrutura

| Arquivo | Para que serve |
|---|---|
| `index.html`, `elenco.html`, `partidas.html`, `amistosos.html`, `videos.html`, `noticias.html`, `recrutamento.html`, `aovivo.html` | As páginas (`aovivo.html` fica no rodapé e aparece no menu só quando alguém está ao vivo) |
| `admin.html` | **Painel da diretoria** (login): candidaturas, amistosos, notícias e vídeos |
| `assets/js/data.js` | Dados fixos do time: nome, links, elenco, partidas e conteúdos de reserva |
| `assets/js/config.js` | Conexão com o Supabase (URL + chave publishable) |
| `assets/js/app.js` | Monta as páginas |
| `assets/js/admin.js` | Painel |
| `assets/css/style.css` | Visual. As cores ficam no topo (`--gold`, `--bg`...) |
| `assets/js/vendor/supabase-2.118.0.min.js` | Biblioteca do Supabase usada só no painel, hospedada aqui (sem CDN). Para atualizar, troque o arquivo e o nome no `admin.html` |
| `supabase/schema.sql` | Banco completo para uma instalação **nova** (tabelas, regras de segurança, limite de envios e pasta de fotos) |
| `supabase/migrations/` | Alterações para um banco que **já existe**. Rode na ordem do nome (`01` a `15`) no SQL Editor. As 01 a 14 já foram rodadas no projeto `ec-oxe` em 17/11/2026 |
| `supabase/functions/checa-live/` | Função do Supabase que confere se os canais do YouTube e da Twitch estão ao vivo (farol do menu) |
| `assets/js/favorito-tracker.js` | Código do favorito "⚽ Copiar do tracker" (o painel monta o link a partir dele; não roda no site) |
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
- **Ao vivo:** cadastre uma vez o canal de cada jogador (YouTube pelo link `youtube.com/channel/UC…`, Twitch ou Kick). O **farol "Ao vivo"** do menu fica vermelho; quem clica faz o site conferir no YouTube e na Twitch. Se alguém estiver no ar, o farol fica verde para todo mundo e abre o player. Depois de 4 h o site confere de novo sozinho (e de 2 em 2 h enquanto a live continuar). Os botões **Entrar ao vivo**, **+2h** e **Encerrar** do painel forçam na mão; no Kick, são o único jeito.
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
- Todas as páginas têm uma política de conteúdo (`Content-Security-Policy` no `<head>`). Ela só libera o projeto Supabase do `config.js`, os players do YouTube, da Twitch e do Kick e as fontes do Google: imagem de capa colada de outro site **não aparece** (suba a foto pelo painel). Se um dia o site passar a usar outro serviço externo (analytics, outra fonte, outro player), acrescente o endereço em `tools/atualiza-head.js` e rode o script; não edite o bloco `<!-- head:comum -->` à mão.

### Configurações no painel do Supabase (não são código)

1. *Authentication > Sign In / Providers*: desligar **Allow new users to sign up** e **Allow anonymous sign-ins**.
2. MFA (segundo fator): em *Authentication > Multi-Factor* confira que o TOTP está habilitado, mas **isso sozinho não protege nada**: o painel ainda não tem tela para cadastrar e pedir o código, nem as regras do banco exigem o segundo fator (`aal2`). Isso é uma etapa de código, ainda pendente. Até lá, use senha longa e única para cada admin.
3. Depois de rodar as migrações, abra *Advisors > Security Advisor* e confira se não sobrou alerta.

## Atualizar as estatísticas (sem mexer em código)

1. No painel, aba **Estatísticas**, arraste o botão **⚽ Copiar do tracker** para a barra de favoritos (uma vez só).
2. Abra a página do EC OXE no Pro Clubs Tracker, espere carregar e clique no favorito. Ele abre cada partida e, no fim, mostra **Enviar para o painel do EC OXE**.
3. Confira a prévia no painel e clique em **Gravar no site**. Partidas, temporada (V/E/D, gols, divisão, SR) e os números do elenco atualizam na hora.

O tracker (e a EA) só guarda as **10 últimas partidas** do clube; o banco guarda todas que já foram importadas. Os números do Elenco (jogos, gols, assistências, MVP e OVR) vêm da aba **Players** do tracker, que tem a **temporada inteira** de cada jogador; o favorito lê essa aba e o comparador de jogadores (que liga o nome no jogo ao PSN). O tracker não tem horário fixo: cada visita monta a página na hora com os dados da EA, que atualiza alguns minutos depois de cada partida. Jogador novo aparece sozinho no Elenco (com o ID do jogo; para trocar o nome mostrado, cadastre-o no `data.js` com o mesmo `psn`). Se o tracker mudar o jeito de mostrar e a prévia vier errada, o ajuste é na função `leTracker()` do `admin.js`.

## Atualizar dados fixos

Nomes, posições, OVR e fotos do elenco ficam em `assets/js/data.js`. As partidas de lá são só reserva (usadas se o banco não responder).
Horários das partidas em horário de Brasília, com `-03:00` no fim. Antes de commitar, rode `node tools/check-data.js`: ERRO precisa corrigir, AVISO é só para conferir.
Ao trocar CSS ou JS, aumente a versão para o navegador não usar a antiga: `node tools/atualiza-head.js 9` (troca o `?v=N` das 8 páginas; o número atual está no link do `style.css`).

## Ver no computador antes de publicar

```
npx http-server . -p 8090 -c-1
```

Depois acesse http://localhost:8090

## Checagem automática da live (função `checa-live`)

- Fica em `supabase/functions/checa-live/index.ts` e roda no Supabase (*Edge Functions*), com **Verify JWT desligado** (o site chama com a chave publishable; a proteção é o intervalo de 1 minuto por canal).
- Segredos em *Edge Functions > Secrets* (nunca no código nem no site): `YOUTUBE_API_KEY`, `TWITCH_CLIENT_ID` e `TWITCH_CLIENT_SECRET`. Sem a chave de uma plataforma, ela simplesmente não é conferida.
- YouTube: lê os vídeos recentes do canal (RSS, sem custo) e faz 1 consulta à API (1 ponto da cota grátis de 10.000/dia). Twitch: API oficial com token de app.
- Mudou o código? Cole o arquivo de novo no editor da função no painel do Supabase e clique em *Deploy*.
