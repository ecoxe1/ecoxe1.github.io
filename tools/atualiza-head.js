/* =====================================================================
   Gera o trecho comum do <head> das 8 páginas (CSP, referrer, ícone, fontes, CSS)
   e troca o ?v=N de todos os CSS/JS para furar o cache do GitHub Pages.

   Uso:   node tools/atualiza-head.js        (mantém a versão atual)
          node tools/atualiza-head.js 7      (passa tudo para ?v=7)

   Cada página guarda o que é só dela (title, description, og:*, robots) fora do bloco
   marcado com <!-- head:comum --> ... <!-- /head:comum -->. Para mudar a CSP ou as fontes,
   mude AQUI e rode o script; não edite o bloco à mão nos .html.
   O endereço do Supabase vem de assets/js/config.js (é público).
   ===================================================================== */
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const PAGINAS = ["index", "elenco", "partidas", "amistosos", "videos", "noticias", "recrutamento", "admin"];
const INI = "<!-- head:comum -->", FIM = "<!-- /head:comum -->";

const config = fs.readFileSync(path.join(RAIZ, "assets/js/config.js"), "utf8");
const m = config.match(/url:\s*"(https:\/\/[a-z0-9]+\.supabase\.co)"/);
if (!m) { console.error("Não achei a url do Supabase em assets/js/config.js"); process.exit(1); }
const SUPABASE = m[1];

const arg = process.argv[2];
if (arg !== undefined && !/^\d+$/.test(arg)) { console.error("A versão precisa ser um número. Ex.: node tools/atualiza-head.js 7"); process.exit(1); }

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  `img-src 'self' data: ${SUPABASE} https://i.ytimg.com`,
  `media-src 'self' ${SUPABASE}`,
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
  `connect-src 'self' ${SUPABASE}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const bloco = v => [
  INI,
  `<meta charset="utf-8">`,
  `<meta name="viewport" content="width=device-width, initial-scale=1">`,
  `<meta http-equiv="Content-Security-Policy" content="${CSP}">`,
  `<meta name="referrer" content="strict-origin-when-cross-origin">`,
  `<meta name="theme-color" content="#0a0a0b">`,
  `<link rel="icon" href="assets/img/escudo.webp">`,
  `<link rel="preconnect" href="https://fonts.googleapis.com">`,
  `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
  `<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`,
  `<link rel="stylesheet" href="assets/css/style.css?v=${v}">`,
  FIM,
].join("\n");

/* Linhas que pertencem ao bloco comum (usadas só na primeira vez, para migrar as páginas antigas). */
const COMUM_ANTIGO = [/^<meta charset=/i, /^<meta name="viewport"/i, /^<meta http-equiv="Content-Security-Policy"/i,
  /^<meta name="referrer"/i, /^<meta name="theme-color"/i, /^<link rel="icon"/i, /^<link rel="preconnect"/i,
  /^<link href="https:\/\/fonts\.googleapis\.com/i, /^<link rel="stylesheet" href="assets\/css\/style\.css/i];

let mudou = 0;
for (const p of PAGINAS) {
  const arq = path.join(RAIZ, p + ".html");
  const orig = fs.readFileSync(arq, "utf8");
  const v = arg || (orig.match(/style\.css\?v=(\d+)/) || [])[1] || "1";
  let html;
  const a = orig.indexOf(INI), b = orig.indexOf(FIM);
  if (a >= 0 && b > a) {
    html = orig.slice(0, a) + bloco(v) + orig.slice(b + FIM.length);
  } else {
    const i = orig.indexOf("<head>"), f = orig.indexOf("</head>");
    if (i < 0 || f < 0) { console.error(`${p}.html: não achei <head>`); process.exit(1); }
    const proprias = orig.slice(i + 6, f).split("\n").map(l => l.trim()).filter(l => l && !COMUM_ANTIGO.some(r => r.test(l)));
    html = orig.slice(0, i + 6) + "\n" + bloco(v) + "\n" + proprias.join("\n") + "\n" + orig.slice(f);
  }
  html = html.replace(/(assets\/(?:css|js)\/[\w./-]+\.(?:css|js))\?v=\d+/g, `$1?v=${v}`);
  if (html !== orig) { fs.writeFileSync(arq, html); mudou++; console.log(`atualizado: ${p}.html (v=${v})`); }
}
console.log(mudou ? `${mudou} página(s) atualizada(s).` : "Nada a mudar.");
