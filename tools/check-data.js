/* =====================================================================
   Confere o assets/js/data.js antes de publicar. Uso:  node tools/check-data.js
   ERRO   = dado que aparece errado no site (o script termina com código 1).
   AVISO  = vale olhar, mas pode estar certo (ex.: vitória por W.O.).
   ===================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const arq = path.join(__dirname, "..", "assets/js/data.js");
let d;
try {
  d = vm.runInNewContext(fs.readFileSync(arq, "utf8") + "\n;({ clube, elenco, partidas, videos, noticias, recrutamento, amistosos })", {}, { filename: "data.js" });
} catch (e) { console.error("ERRO  data.js não roda: " + e.message); process.exit(1); }

const erros = [], avisos = [];
const erro = t => erros.push(t), aviso = t => avisos.push(t);
const conta = lista => lista.reduce((c, n) => (c[n] = (c[n] || 0) + 1, c), {});
const nomes = new Set(d.elenco.map(j => j.n));

/* Clube */
const t = d.clube.temporada;
if (t) {
  if (t.v + t.e + t.d !== t.jogos) erro(`clube.temporada: ${t.v}V + ${t.e}E + ${t.d}D = ${t.v + t.e + t.d}, mas jogos = ${t.jogos}`);
  if (t.jogos < d.partidas.length) erro(`clube.temporada: ${t.jogos} jogos, mas há ${d.partidas.length} partidas listadas`);
}

/* Elenco */
const vistos = new Set();
d.elenco.forEach(j => {
  if (vistos.has(j.n)) erro(`elenco: nome repetido "${j.n}"`);
  vistos.add(j.n);
  if (j.p && !["GK", "ZAG", "LAT", "VOL", "MEI", "ATA"].includes(j.p)) erro(`elenco ${j.n}: posição "${j.p}" fora de GK/ZAG/LAT/VOL/MEI/ATA`);
  if (!j.p) aviso(`elenco ${j.n}: sem posição`);
  if (j.foto && !fs.existsSync(path.join(__dirname, "..", "assets/players", j.foto))) erro(`elenco ${j.n}: foto assets/players/${j.foto} não existe`);
});

/* Partidas */
const ids = new Set();
let anterior = null;
d.partidas.forEach(m => {
  const q = `partida ${m.id} (${m.adv})`;
  if (ids.has(m.id)) erro(`${q}: id repetido`);
  ids.add(m.id);
  if (isNaN(new Date(m.data))) erro(`${q}: data inválida "${m.data}"`);
  else if (!/[+-]\d\d:\d\d$|Z$/.test(m.data)) aviso(`${q}: data sem fuso (use "-03:00" no fim)`);
  if (anterior && new Date(m.data) > new Date(anterior)) erro(`${q}: fora de ordem (a mais recente vai no topo)`);
  anterior = m.data;
  const gols = m.gols || [], assist = m.assist || [];
  if (gols.length !== m.gp) (m.obs ? aviso : erro)(`${q}: placar ${m.gp}, mas ${gols.length} gol(s) listado(s)${m.obs ? ` (obs: ${m.obs})` : ""}`);
  if (assist.length > m.gp) erro(`${q}: ${assist.length} assistências para ${m.gp} gol(s)`);
  [...gols, ...assist, m.mvp].filter(Boolean).forEach(n => { if (!nomes.has(n)) erro(`${q}: "${n}" não está no elenco`); });
  if (m.obs && gols.length === m.gp) aviso(`${q}: tem obs "${m.obs}"`);
});

/* Soma do elenco x partidas (j/g/a/mvp contam só as partidas listadas) */
const g = conta(d.partidas.flatMap(m => m.gols || [])), a = conta(d.partidas.flatMap(m => m.assist || [])), mvp = conta(d.partidas.map(m => m.mvp).filter(Boolean));
d.elenco.forEach(j => {
  if ((j.g || 0) !== (g[j.n] || 0)) erro(`elenco ${j.n}: g:${j.g}, mas as partidas somam ${g[j.n] || 0} gol(s)`);
  if ((j.a || 0) !== (a[j.n] || 0)) erro(`elenco ${j.n}: a:${j.a}, mas as partidas somam ${a[j.n] || 0} assistência(s)`);
  if ((j.mvp || 0) !== (mvp[j.n] || 0)) erro(`elenco ${j.n}: mvp:${j.mvp}, mas as partidas somam ${mvp[j.n] || 0}`);
  if (j.j > d.partidas.length) erro(`elenco ${j.n}: j:${j.j}, mas só há ${d.partidas.length} partidas listadas`);
});

/* Vídeos e notícias de reserva */
[...d.videos, ...d.noticias].forEach(x => { if (!x.id || !x.titulo || !x.data) erro(`vídeo/notícia sem id, título ou data: ${JSON.stringify(x).slice(0, 80)}`); });

avisos.forEach(x => console.log("AVISO " + x));
erros.forEach(x => console.log("ERRO  " + x));
console.log(erros.length ? `\n${erros.length} erro(s). Corrija antes de publicar.` : `\nOK: ${d.elenco.length} jogadores, ${d.partidas.length} partidas${avisos.length ? `, ${avisos.length} aviso(s)` : ""}.`);
process.exit(erros.length ? 1 : 0);
