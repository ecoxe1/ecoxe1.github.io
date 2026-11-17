/* =====================================================================
   EC OXE: todos os dados do site ficam neste arquivo.
   Edite à vontade: é só texto. Salve, recarregue a página e pronto.
   Tudo marcado com EXEMPLO deve ser trocado pelos dados reais do time.
   ===================================================================== */

/* ---------- Clube ---------- */
const clube = {
  nome: "EC OXE",
  fundacao: 2018,
  jogo: "EA FC 26",
  plataforma: "PlayStation 5",          // ex.: "PS5", "Xbox", "Todas as plataformas"
  slogan: "Oxe, é gol!",                // frase grande da página inicial
  frase: "Time de Pro Clubs que joga sério e não perde a resenha. Bora jogar com a gente?",
  discord: "",                          // convite do Discord, ex.: "https://discord.gg/xxxx". Vazio = botão some
  instagram: "",                        // ex.: "https://instagram.com/ecoxe"
  youtube: "",                          // ex.: "https://youtube.com/@ecoxe"
  twitch: "",
  tracker: "",                          // link do clube no proclubstracker.com (opcional)
};

/* ---------- Elenco (EXEMPLO) ----------
   n: nome no jogo   p: posição (GK, ZAG, LAT, VOL, MEI, ATA)
   o: overall        j: jogos   g: gols   a: assistências   mvp: vezes melhor em campo
   psn: ID na PSN/gamertag      foto: arquivo em assets/players/ (vazio = silhueta)
   ativo: false esconde o jogador da lista padrão (ex.: saiu do time) */
const elenco = [
  {n:"Capitão Farol", p:"ATA", o:84, j:120, g:96, a:41, mvp:22, psn:"exemplo_farol", foto:"", ativo:true},
  {n:"Mainha Dez",    p:"MEI", o:83, j:115, g:38, a:77, mvp:18, psn:"exemplo_mainha", foto:"", ativo:true},
  {n:"Arretado",      p:"ATA", o:82, j:98,  g:71, a:25, mvp:12, psn:"exemplo_arretado", foto:"", ativo:true},
  {n:"Visse",         p:"VOL", o:81, j:102, g:9,  a:30, mvp:9,  psn:"exemplo_visse", foto:"", ativo:true},
  {n:"Muralha",       p:"ZAG", o:83, j:110, g:6,  a:4,  mvp:11, psn:"exemplo_muralha", foto:"", ativo:true},
  {n:"Paredão",       p:"GK",  o:85, j:95,  g:0,  a:1,  mvp:14, psn:"exemplo_paredao", foto:"", ativo:true},
  {n:"Lateral Liso",  p:"LAT", o:80, j:64,  g:5,  a:19, mvp:4,  psn:"exemplo_liso", foto:"", ativo:true},
  {n:"Zé Rasteira",   p:"ZAG", o:79, j:51,  g:2,  a:3,  mvp:3,  psn:"", foto:"", ativo:true},
  {n:"Bicuda",        p:"MEI", o:78, j:22,  g:6,  a:8,  mvp:1,  psn:"", foto:"", ativo:false},
];

/* ---------- Partidas (EXEMPLO) ----------
   Coloque a mais recente no TOPO.
   data: "aaaa-mm-ddThh:mm"   comp: "Liga", "Copa", "Amistoso"...
   gols / assist: nomes do elenco (repita o nome se fez mais de um)   mvp: melhor em campo */
const partidas = [
  {id:"p8", data:"2026-10-26T22:10", adv:"Arraial United", comp:"Liga", gp:3, gc:1, gols:["Capitão Farol","Capitão Farol","Arretado"], assist:["Mainha Dez","Visse"], mvp:"Capitão Farol"},
  {id:"p7", data:"2026-10-26T21:40", adv:"Maré Alta EC",   comp:"Liga", gp:2, gc:2, gols:["Arretado","Mainha Dez"], assist:["Lateral Liso"], mvp:"Paredão"},
  {id:"p6", data:"2026-10-25T22:30", adv:"Sertão FC",      comp:"Liga", gp:1, gc:0, gols:["Muralha"], assist:["Mainha Dez"], mvp:"Muralha"},
  {id:"p5", data:"2026-10-25T21:55", adv:"Real Cuscuz",    comp:"Amistoso", gp:4, gc:2, gols:["Capitão Farol","Arretado","Arretado","Visse"], assist:["Mainha Dez","Mainha Dez","Capitão Farol"], mvp:"Arretado"},
  {id:"p4", data:"2026-10-24T22:20", adv:"Atlético Dendê", comp:"Liga", gp:0, gc:1, gols:[], assist:[], mvp:"Paredão"},
  {id:"p3", data:"2026-10-24T21:45", adv:"Bairro Novo FC", comp:"Liga", gp:2, gc:1, gols:["Mainha Dez","Capitão Farol"], assist:["Arretado"], mvp:"Mainha Dez"},
  {id:"p2", data:"2026-10-22T22:00", adv:"Ladeira SC",     comp:"Copa", gp:1, gc:3, gols:["Arretado"], assist:["Lateral Liso"], mvp:"Visse"},
  {id:"p1", data:"2026-10-22T21:30", adv:"Porto Seguro EC",comp:"Liga", gp:5, gc:0, gols:["Capitão Farol","Capitão Farol","Capitão Farol","Arretado","Lateral Liso"], assist:["Mainha Dez","Mainha Dez","Visse"], mvp:"Capitão Farol"},
];

/* ---------- Vídeos (EXEMPLO) ----------
   src: "youtube:ID" (o código depois de v= no link), "arquivo:nome.mp4" (em assets/videos/) ou "link:https://..."
   tipo: "lance" ou "partida"   partida: id de uma partida acima (opcional) */
const videos = [
  {id:"hat-trick-farol", titulo:"Hat-trick do Capitão Farol contra o Porto Seguro", tipo:"lance", data:"2026-10-22", src:"link:https://www.youtube.com/", capa:"", desc:"Troque por um vídeo real do time.", partida:"p1"},
];

/* ---------- Notícias (EXEMPLO) ----------
   corpo: lista de parágrafos. {t:"Subtítulo"} vira subtítulo; {img:"foto.jpg", legenda:"..."} vira foto (assets/news/).
   Dentro do texto: **negrito**, *itálico* e [texto](https://link). */
const noticias = [
  {id:"bem-vindos", chapeu:"Clube", titulo:"EC OXE ganha site oficial", data:"2026-10-27", autor:"Diretoria",
   resumo:"Elenco, resultados, amistosos e recrutamento agora num lugar só.",
   capa:"",
   corpo:[
     "O **EC OXE** agora tem casa própria na internet. Aqui você acompanha os resultados, conhece o elenco e pode pedir um amistoso ou fazer teste para o time.",
     {t:"Quer jogar com a gente?"},
     "Vá na página de *Recrutamento*, preencha o formulário e a diretoria entra em contato.",
   ]},
];

/* ---------- Recrutamento e amistosos ---------- */
const recrutamento = {
  posicoes: "todas",                    // texto de "Posições procuradas"
  requisitos: ["Ter microfone e usar no jogo", "Disponibilidade à noite (a partir das 21h)", "Respeito com todo mundo, dentro e fora de campo"],
};
const amistosos = {
  horarios: "Costumamos jogar à noite, a partir das 21h (horário de Brasília). Sugira o melhor dia e horário para o seu time.",
  agenda: [ /* amistosos confirmados (EXEMPLO). Com o Supabase ligado, a agenda vem da nuvem.
    {time:"Real Cuscuz", data:"2026-10-30", hora:"22:00", plataforma:"PS5"}, */ ],
};

/* Tempo mínimo (segundos) entre dois envios de formulário no mesmo aparelho */
const ESPERA_FORM = 60;
