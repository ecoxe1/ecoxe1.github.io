/* =====================================================================
   EC OXE: dados fixos do site. Edite à vontade: é só texto.
   Fonte das estatísticas: Pro Clubs Tracker, clube 2210096 (EA FC 27, crossplay PS5/Xbox/PC).
   Última atualização com o tracker: 17/11/2026.
   Notícias e vídeos novos são postados pelo painel (admin.html); as listas daqui são reserva.
   ===================================================================== */

/* ---------- Clube ---------- */
const clube = {
  nome: "EC OXE",
  fundacao: 2018,
  jogo: "EA FC 27",
  plataforma: "Crossplay PS5 · Xbox · PC",
  slogan: "Oxe, é gol!",                // frase grande da página inicial
  frase: "Time de Pro Clubs que joga sério e não perde a resenha. Bora jogar com a gente?",
  discord: "",                          // convite do Discord, ex.: "https://discord.gg/xxxx". Vazio = botão some
  instagram: "",                        // ex.: "https://instagram.com/ecoxe"
  youtube: "",                          // ex.: "https://youtube.com/@ecoxe"
  twitch: "",
  tracker: "https://proclubstracker.com/club/2210096?platform=common-gen5",
  /* Números da temporada inteira, do tracker (a lista de partidas abaixo tem só os jogos mais recentes).
     O tracker não mostra o total de gols, mas ele sai exato da média e do saldo: 2,67 x 27 jogos = 72
     (71 daria 2,63 e 73 daria 2,70) e 72 - 2 = 70 sofridos. Ao atualizar, refaça a conta. */
  temporada: { jogos: 27, v: 11, e: 5, d: 11, gp: 72, gc: 70, divisao: 3, sr: 1506 },
};

/* ---------- Elenco ----------
   n: nome mostrado   p: posição (GK, ZAG, LAT, VOL, MEI, ATA)   o: overall (0 = não informado)
   j / g / a / mvp: jogos, gols, assistências e vezes melhor em campo NAS PARTIDAS REGISTRADAS ABAIXO
   psn: ID na PSN/gamertag   foto: arquivo em assets/players/ (vazio = silhueta)   ativo:false esconde da lista
   Para mostrar o nome do jogador no jogo em vez da PSN, troque só o "n" (ex.: n:"Carlos JR") e use o mesmo nome nas partidas. */
const elenco = [
  {n:"JygOk", p:"MEI", o:0, j:10, g:6, a:2, mvp:0, psn:"JygOk", foto:"", ativo:true},
  {n:"Monkeyvader91", p:"MEI", o:0, j:8, g:1, a:13, mvp:2, psn:"Monkeyvader91", foto:"", ativo:true},
  {n:"L. Gantois", p:"ATA", o:78, j:7, g:18, a:6, mvp:2, psn:"LucasGantoisP", foto:"", ativo:true},
  {n:"deGoose14", p:"ZAG", o:76, j:7, g:0, a:1, mvp:0, psn:"deGoose14", foto:"", ativo:true},
  {n:"PeuIvo27", p:"MEI", o:0, j:3, g:1, a:0, mvp:0, psn:"PeuIvo27", foto:"peuivo27.webp", ativo:true},
  {n:"BIGGENDD", p:"ATA", o:0, j:3, g:1, a:2, mvp:0, psn:"BIGGENDD", foto:"", ativo:true},
  {n:"Diegomengo0313", p:"MEI", o:0, j:3, g:0, a:0, mvp:1, psn:"Diegomengo0313", foto:"", ativo:true},
  {n:"Balbenadal", p:"MEI", o:0, j:2, g:1, a:0, mvp:1, psn:"Balbenadal", foto:"", ativo:true},
  {n:"RP_BBMP", p:"MEI", o:0, j:2, g:0, a:0, mvp:1, psn:"RP_BBMP", foto:"", ativo:true},
];

/* ---------- Partidas (do Pro Clubs Tracker) ----------
   A mais recente no TOPO. id = número da partida no tracker.
   data: horário de Brasília, com "-03:00" no fim (o tracker mostra no fuso de quem abre a página).
   gols / assist: nomes do elenco (repetido = mais de um). mvp vazio = o melhor em campo foi do adversário.
   obs: aviso opcional, aparece ao abrir a partida (ex.: vitória por W.O.). */
const partidas = [
  {id:"400169", data:"2026-11-16T22:32-03:00", adv:"Royal Madridd", comp:"Liga", gp:1, gc:1, gols:["PeuIvo27"], assist:["BIGGENDD"], mvp:"RP_BBMP"},
  {id:"650018", data:"2026-11-16T22:15-03:00", adv:"El Mango", comp:"Liga", gp:0, gc:0, gols:[], assist:[], mvp:""},
  {id:"800261", data:"2026-11-16T22:09-03:00", adv:"The Burb United", comp:"Liga", gp:2, gc:3, gols:["BIGGENDD","JygOk"], assist:["BIGGENDD"], mvp:"Diegomengo0313"},
  {id:"160450", data:"2026-11-15T04:05-03:00", adv:"Fc delvaux", comp:"Liga", gp:6, gc:0, gols:["L. Gantois","L. Gantois","L. Gantois","Monkeyvader91","JygOk","JygOk"], assist:["L. Gantois","L. Gantois","L. Gantois","Monkeyvader91","Monkeyvader91","JygOk"], mvp:"L. Gantois"},
  {id:"100340", data:"2026-11-15T03:48-03:00", adv:"The JLA", comp:"Liga", gp:7, gc:2, gols:["L. Gantois","L. Gantois","L. Gantois","L. Gantois","L. Gantois","L. Gantois","JygOk"], assist:["L. Gantois","Monkeyvader91","Monkeyvader91","Monkeyvader91","Monkeyvader91","JygOk"], mvp:"L. Gantois"},
  {id:"240385", data:"2026-11-15T03:27-03:00", adv:"Des Sources FC", comp:"Liga", gp:3, gc:4, gols:["L. Gantois","L. Gantois","L. Gantois"], assist:["Monkeyvader91","Monkeyvader91","deGoose14"], mvp:"Monkeyvader91"},
  {id:"670070", data:"2026-11-15T03:11-03:00", adv:"EMPIRE SBZ", comp:"Liga", gp:2, gc:0, gols:["JygOk","L. Gantois"], assist:["Monkeyvader91"], mvp:"Monkeyvader91"},
  {id:"760001", data:"2026-11-15T02:55-03:00", adv:"Los Cholos 504", comp:"Liga", gp:3, gc:4, gols:["JygOk","L. Gantois","L. Gantois"], assist:["Monkeyvader91","Monkeyvader91","L. Gantois"], mvp:""},
  {id:"210350", data:"2026-11-15T02:33-03:00", adv:"Tri of Death", comp:"Liga", gp:2, gc:4, gols:["L. Gantois","L. Gantois"], assist:["Monkeyvader91"], mvp:"Balbenadal"},
  {id:"030139", data:"2026-11-15T02:18-03:00", adv:"Tumbados CDF", comp:"Liga", gp:3, gc:0, gols:["Balbenadal","L. Gantois"], assist:["Monkeyvader91","L. Gantois"], mvp:"", obs:"Vitória por W.O.: o adversário abandonou a partida quando estava 2–0."},
];

/* ---------- Vídeos (reserva; poste pelo painel) ----------
   src: "youtube:ID", "arquivo:nome.mp4" (em assets/videos/) ou "link:https://..."   tipo: "lance" ou "partida" */
const videos = [];

/* ---------- Notícias (reserva; poste pelo painel) ----------
   Formato: {id:"slug", chapeu:"Clube", titulo:"...", data:"AAAA-MM-DD", autor:"Diretoria", resumo:"...", capa:"", corpo:["parágrafo", ...]}
   corpo: lista de parágrafos. {t:"Subtítulo"} vira subtítulo; {img:"foto.jpg", legenda:"..."} vira foto (assets/news/). */
const noticias = [];

/* ---------- Recrutamento e amistosos ---------- */
const recrutamento = {
  posicoes: "todas",                    // texto de "Posições procuradas"
  requisitos: ["Ter microfone e usar no jogo", "Disponibilidade à noite (a partir das 21h)", "Respeito com todo mundo, dentro e fora de campo"],
};
const amistosos = {
  horarios: "Costumamos jogar à noite, a partir das 21h (horário de Brasília). Sugira o melhor dia e horário para o seu time.",
  agenda: [], /* amistosos confirmados vêm do painel (Supabase) */
};

/* Tempo mínimo (segundos) entre dois envios de formulário no mesmo aparelho */
const ESPERA_FORM = 60;
