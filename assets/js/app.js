/* EC OXE: layout comum (menu e rodapé) e montagem de cada página. Os dados ficam em data.js. */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const page = document.body.dataset.page;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
/* Link vindo de formulário ou do banco: só vale http(s). Qualquer outro esquema (javascript:, data:...) vira "". Mesma regra do banco (supabase/migrations/20261117_01). */
const urlHttp = u => { const s = String(u ?? "").trim(); return /^https?:\/\/\S+$/i.test(s) ? s : ""; };
/* Mensagem de campo grande demais ("" = ok). Os máximos espelham os CHECK de supabase/schema.sql. */
const limite = (valor, max, nome) => String(valor || "").length > max ? `${nome}: use no máximo ${max} caracteres (agora são ${String(valor).length}).` : "";
/* Validação na ordem dos campos: [[nomeDoCampo, mensagemOuVazio], ...] -> o primeiro erro, com o campo para receber o foco. */
const primeiroErro = lista => { const e = lista.find(([, m]) => m); return e ? { campo: e[0], msg: e[1] } : null; };
/* Rolagem suave só para quem não pediu menos movimento no sistema. */
const suave = () => (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) ? "auto" : "smooth";
const pad = n => String(n).padStart(2, "0");
const plural = (n, s, p) => `${n} ${n === 1 ? s : (p || s + "s")}`;
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const SEMANA = ["domingo","segunda","terça","quarta","quinta","sexta","sábado"];
const dia = s => { const [y, m, d] = s.slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); };
const dataLonga = s => { const d = dia(s); return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; };
const dataCurta = s => { const d = dia(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
/* O time joga no horário de Brasília (sem horário de verão desde 2019): "hoje", "ontem" e os horários seguem o fuso de lá,
   mesmo para quem abre o site de outro país. */
const FUSO = "America/Sao_Paulo";
const emBrasilia = d => { try { const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d).map(x => [x.type, x.value])); return { iso: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` }; } catch (e) { return { iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, hora: `${pad(d.getHours())}:${pad(d.getMinutes())}` }; } };
const hojeISO = emBrasilia(new Date()).iso;
const noPassado = (data, hora) => new Date(`${data}T${hora}:00-03:00`) < new Date(); /* data e hora digitadas valem como horário de Brasília */
const SB = window.SUPABASE || {}, nuvem = !!(SB.url && SB.key);
const sbHeaders = extra => Object.assign({ apikey: SB.key }, SB.key && SB.key.startsWith("eyJ") ? { Authorization: "Bearer " + SB.key } : {}, extra);
const sbGet = (tabela, consulta) => fetch(`${SB.url}/rest/v1/${tabela}?${consulta}`, { headers: sbHeaders() }).then(r => r.ok ? r.json() : Promise.reject(new Error(tabela + ": " + r.status)));
/* Texto do painel -> blocos da notícia: parágrafos separados por linha em branco, "## " vira subtítulo, "![legenda](url)" vira foto. */
const textoParaBlocos = t => String(t || "").split(/\n\s*\n/).map(s => s.trim()).filter(Boolean).map(s => {
  const img = s.match(/^!\[(.*?)\]\((\S+?)\)$/);
  if (img) return { img: img[2], legenda: img[1] };
  if (s.startsWith("## ")) return { t: s.slice(3).trim() };
  return s.replace(/\n/g, " ");
});
/* Junta o que veio do painel (nuvem) com o que está em data.js; a nuvem vale quando o id é igual. */
const juntar = (lista, linhas) => { const ids = new Set(linhas.map(x => x.id)); const resto = lista.filter(x => !ids.has(x.id)); lista.length = 0; lista.push(...linhas, ...resto); };
const comTempo = (p, ms) => Promise.race([p, new Promise((_, n) => setTimeout(() => n(new Error("tempo esgotado")), ms))]);
const conteudoNuvem = !nuvem ? Promise.resolve() : Promise.all([
  page === "noticias" ? comTempo(sbGet("news", "select=*&order=data.desc,created_at.desc"), 7000).then(rows => juntar(noticias, rows.map(r => ({
    id: r.id, chapeu: r.chapeu, titulo: r.titulo, resumo: r.resumo, autor: r.autor, data: r.data, capa: r.capa, corpo: textoParaBlocos(r.corpo) }))))
    .catch(e => console.warn("Notícias da nuvem indisponíveis:", e.message)) : null,
  page === "videos" ? comTempo(sbGet("videos", "select=*&order=data.desc,created_at.desc"), 7000).then(rows => juntar(videos, rows.map(r => ({
    id: r.id, titulo: r.titulo, tipo: r.tipo, data: r.data, src: r.src, capa: r.capa, desc: r.descr, partida: r.partida }))))
    .catch(e => console.warn("Vídeos da nuvem indisponíveis:", e.message)) : null,
]);
const guarda = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };

/* Texto das notícias: **negrito**, *itálico*, [texto](https://link). O HTML é escapado antes. */
const fmt = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, "$1<em>$2</em>")
  .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

/* ---------- Menu e rodapé ---------- */
const PAGINAS = [["index.html","inicio","Início"],["elenco.html","elenco","Elenco"],["partidas.html","partidas","Partidas"],["amistosos.html","amistosos","Amistosos"],["videos.html","videos","Vídeos"],["noticias.html","noticias","Notícias"],["recrutamento.html","recrutamento","Recrutamento"]];
$("#nav").innerHTML = `
  <div class="wrap">
    <a href="index.html" class="brand"><img src="assets/img/escudo-96.webp" alt="" width="40" height="40">${esc(clube.nome)}</a>
    <button class="menu-btn" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="menu-links">☰</button>
    <div class="links" id="menu-links">${PAGINAS.map(([h, k, l]) => `<a href="${h}"${k === page ? ' class="active" aria-current="page"' : ""}>${l}</a>`).join("")}</div>
    <a href="recrutamento.html" class="btn btn-gold btn-sm">Jogar no OXE</a>
  </div>`;
const menuBtn = $(".menu-btn");
const menu = abrir => {
  $("#nav").classList.toggle("open", abrir);
  menuBtn.setAttribute("aria-expanded", abrir);
  menuBtn.setAttribute("aria-label", abrir ? "Fechar menu" : "Abrir menu");
  menuBtn.textContent = abrir ? "✕" : "☰";
};
menuBtn.onclick = () => menu(!$("#nav").classList.contains("open"));
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#nav").classList.contains("open")) { menu(false); menuBtn.focus(); } });

const redes = [["Discord", clube.discord], ["Instagram", clube.instagram], ["YouTube", clube.youtube], ["Twitch", clube.twitch], ["Pro Clubs Tracker", clube.tracker]].filter(([, u]) => u);
$("#footer").innerHTML = `
  <div class="wrap">
    <span>© ${new Date().getFullYear()} ${esc(clube.nome)} · Fundado em ${clube.fundacao} · Pro Clubs ${esc(clube.jogo)}</span>
    <div class="social">${redes.map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${n}</a>`).join("")}</div>
  </div>`;
$$("[data-discord]").forEach(a => { if (clube.discord) { a.href = clube.discord; a.target = "_blank"; a.rel = "noopener"; } else a.hidden = true; });
$$("[data-nome]").forEach(el => el.textContent = clube.nome);

/* ---------- Números calculados a partir das partidas ---------- */
const res = m => m.gp > m.gc ? "V" : m.gp < m.gc ? "D" : "E";
const RES = { V: "Vitória", E: "Empate", D: "Derrota" };
const POS = { GK: "Goleiro", ZAG: "Zagueiro", LAT: "Lateral", VOL: "Volante", MEI: "Meia", ATA: "Atacante" };
const conta = r => partidas.filter(m => res(m) === r).length;
const golsPro = () => partidas.reduce((s, m) => s + m.gp, 0);
const golsContra = () => partidas.reduce((s, m) => s + m.gc, 0);

/* Usa os números da temporada (clube.temporada, do tracker) quando existirem; senão, soma as partidas da lista. */
function faixaNumeros(el) {
  const t = clube.temporada;
  const n = t ? t.jogos : partidas.length, v = t ? t.v : conta("V"), e = t ? t.e : conta("E"), d = t ? t.d : conta("D");
  const gp = t ? t.gp : golsPro(), gc = t ? t.gc : golsContra();
  const pct = n ? Math.round(v / n * 100) : 0, saldo = gp - gc;
  const bar = `<div class="bar"><i style="flex:${v};background:var(--win)"></i><i style="flex:${e};background:var(--draw)"></i><i style="flex:${d};background:var(--loss)"></i></div>`;
  el.innerHTML = [[n, "Jogos na temporada"], [pct + "%", `Vitórias (${v}V ${e}E ${d}D)` + bar], [gp, "Gols marcados"], [(saldo > 0 ? "+" : "") + saldo, "Saldo de gols"],
    t && t.divisao ? [t.divisao, "Divisão" + (t.sr ? ` · SR ${t.sr}` : "")] : [clube.fundacao, "Fundação"]]
    .map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("");
}
function sequencia(el, lista) {
  el.innerHTML = lista.slice(0, 10).map(m => { const r = res(m); return `<span class="chip ${r}" role="img" aria-label="${esc(m.adv)}: ${RES[r]} ${m.gp} a ${m.gc}" title="${esc(m.adv)}: ${RES[r]} ${m.gp}–${m.gc}">${r}</span>`; }).join("");
}
function quando(iso) {
  const b = emBrasilia(new Date(iso)), diff = Math.round((dia(hojeISO) - dia(b.iso)) / 864e5);
  const rel = diff <= 0 ? "Hoje" : diff === 1 ? "Ontem" : `Há ${diff} dias`;
  return `${rel} · ${b.iso.slice(8, 10)}/${b.iso.slice(5, 7)} às ${b.hora}`;
}
const agrupa = nomes => { const c = {}; nomes.forEach(n => c[n] = (c[n] || 0) + 1); return Object.entries(c).map(([n, q]) => esc(n) + (q > 1 ? ` (${q})` : "")).join(", ") || "-"; };
function listaPartidas(el, lista) {
  el.innerHTML = lista.length ? lista.map(m => { const r = res(m); return `
    <div class="mrow" data-id="${esc(m.id)}">
      <div class="match" role="button" tabindex="0" aria-expanded="false">
        <span class="chip ${r}" role="img" aria-label="${RES[r]}" title="${RES[r]}">${r}</span>
        <div class="vs">${esc(clube.nome)} x ${esc(m.adv)}${m.comp ? `<span class="tag-comp">${esc(m.comp)}</span>` : ""}<small>${quando(m.data)}</small></div>
        <div class="score">${m.gp}–${m.gc}</div>
        <span class="chev" aria-hidden="true">›</span>
      </div>
    </div>`; }).join("") : `<div class="empty-state">Nenhum jogo com esse filtro.</div>`;
  el.onclick = el.onkeydown = e => {
    if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
    const head = e.target.closest(".match"); if (!head) return;
    e.preventDefault();
    const row = head.parentElement, aberto = head.getAttribute("aria-expanded") === "true";
    if (aberto) { row.querySelector(".mdetail")?.remove(); row.classList.remove("open"); head.setAttribute("aria-expanded", "false"); return; }
    const m = partidas.find(x => x.id === row.dataset.id);
    row.insertAdjacentHTML("beforeend", `<div class="mdetail">
      <div><span>⚽ Gols</span><b>${agrupa(m.gols || [])}</b></div>
      <div><span>🅰️ Assistências</span><b>${agrupa(m.assist || [])}</b></div>
      <div><span>⭐ Melhor em campo</span><b>${esc(m.mvp || "-")}</b></div>
      ${m.obs ? `<div class="obs"><span>ℹ️ Obs.</span><b>${esc(m.obs)}</b></div>` : ""}
    </div>`);
    row.classList.add("open"); head.setAttribute("aria-expanded", "true");
  };
}
function ranking(el) {
  const ativos = elenco.filter(p => p.ativo !== false);
  const top = k => ativos.reduce((a, b) => (b[k] > a[k] ? b : a), ativos[0]);
  el.innerHTML = ativos.length ? [["Artilheiro", "g"], ["Garçom", "a"], ["Mais vezes melhor em campo", "mvp"], ["Mais jogos", "j"]].map(([l, k]) => {
    const t = top(k);
    return `<div class="row"><div><div class="lab">${l}</div><div class="who">${esc(t.n)}</div></div><div class="num">${t[k]}</div></div>`;
  }).join("") : `<p class="sec-sub">Cadastre o elenco em data.js.</p>`;
}
const SILHUETA = `<svg viewBox="0 0 64 72" aria-hidden="true"><circle cx="32" cy="26" r="13" fill="currentColor"/><path d="M6 72c0-17 12-28 26-28s26 11 26 28z" fill="currentColor"/></svg>`;
function carta(p) {
  return `
  <article class="card${p.ativo === false ? " inactive" : ""}">
    <div class="top">
      <div><div class="ovr">${p.o || "–"}<small>OVR</small></div>${p.p ? `<span class="pos" title="${POS[p.p] || ""}">${esc(p.p)}</span>` : ""}</div>
      <div class="photo">${p.foto ? `<img src="assets/players/${esc(p.foto)}" alt="Foto de ${esc(p.n)}" loading="lazy">` : SILHUETA}</div>
    </div>
    <h3>${esc(p.n)}</h3>
    <div class="psn"><span class="tag">ID</span>${esc(p.psn || "a informar")}</div>
    <div class="mini">
      <div><b>${p.j}</b><span>Jogos</span></div><div><b>${p.g}</b><span>Gols</span></div>
      <div><b>${p.a}</b><span>Assis.</span></div><div title="Vezes melhor em campo"><b>${p.mvp}</b><span>MVP</span></div>
    </div>
  </article>`;
}

/* ---------- Formulários (recrutamento e amistoso) ---------- */
/* Valida, respeita o tempo de espera, envia ao Supabase se estiver configurado
   e, se não estiver (ou falhar), mostra o texto pronto para copiar e mandar no Discord. */
function formulario({ form, msg, botao, tabela, chaveEspera, ler, validar, resumo, concluido, textoBotao }) {
  /* Erro usa role="alert" (leitor de tela anuncia na hora); o resto, role="status". */
  const mostra = (t, ok) => { msg.hidden = false; msg.setAttribute("role", ok ? "status" : "alert"); msg.className = "msg " + (ok ? "ok" : "err"); msg.textContent = t; };
  const limpaInvalidos = () => form.querySelectorAll("[aria-invalid]").forEach(i => { i.removeAttribute("aria-invalid"); i.removeAttribute("aria-describedby"); });
  form.addEventListener("submit", async e => {
    e.preventDefault(); msg.hidden = true; limpaInvalidos();
    const v = Object.fromEntries(new FormData(form));
    if (v.hp_campo) { concluido(null); return; } /* campo escondido (nome neutro, para o autofill não preencher): só robôs preenchem */
    const dados = ler(v), erro = validar(dados);
    if (erro) {
      mostra(erro.msg);
      const campo = form.elements[erro.campo];
      if (campo && campo.focus) { campo.setAttribute("aria-invalid", "true"); campo.setAttribute("aria-describedby", msg.id); campo.focus(); }
      return;
    }
    const espera = ESPERA_FORM * 1000 - (Date.now() - Number(guarda.get(chaveEspera) || 0));
    if (espera > 0) return mostra(`Você acabou de enviar. Aguarde ${Math.ceil(espera / 1000)} segundos para enviar de novo.`);
    const plano = motivo => {
      const t = resumo(dados);
      mostra(motivo + " Copie o texto abaixo e mande para a gente" + (clube.discord ? " no Discord." : "."));
      msg.insertAdjacentHTML("beforeend", `<pre>${esc(t)}</pre><div class="factions"><button class="btn btn-ghost btn-sm" type="button" data-copiar>Copiar texto</button>${clube.discord ? `<a class="btn btn-gold btn-sm" href="${esc(clube.discord)}" target="_blank" rel="noopener">Abrir Discord</a>` : ""}</div>`);
      msg.querySelector("[data-copiar]").onclick = ev => {
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => ev.target.textContent = "Copiado!", () => ev.target.textContent = "Não deu para copiar, selecione o texto");
      };
    };
    if (!nuvem) return plano("O envio automático ainda não está ligado.");
    botao.disabled = true; botao.textContent = "Enviando…";
    try {
      const r = await fetch(`${SB.url}/rest/v1/${tabela}`, { method: "POST", headers: sbHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }), body: JSON.stringify(dados) });
      /* 409 (registro repetido) recebe a mesma resposta do sucesso: o site não revela se um ID já se candidatou. */
      if (r.ok || r.status === 409) { guarda.set(chaveEspera, String(Date.now())); concluido(dados); return; }
      botao.disabled = false; botao.textContent = textoBotao;
      if (r.status === 429) return plano("Recebemos muitos envios em pouco tempo e o servidor pediu uma pausa.");
      if (r.status === 400) return mostra("Alguma informação não foi aceita. Confira os campos e tente de novo.");
      plano("Não foi possível enviar agora.");
    } catch (err) {
      botao.disabled = false; botao.textContent = textoBotao;
      plano("Sem conexão com o servidor.");
    }
  });
}
const telaFinal = (box, titulo, texto, itens, botao) => {
  box.innerHTML = `<div class="panel done" role="status"><div class="check" aria-hidden="true">✓</div><h3 tabindex="-1" data-foco>${titulo}</h3>
    <p class="sec-sub" style="margin:0 0 16px">${texto}</p>
    ${itens.length ? `<p>${itens.map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v)}`).join("<br>")}</p>` : ""}
    <button class="btn btn-ghost" type="button" data-recarregar>${botao}</button></div>`;
  box.querySelector("[data-recarregar]").addEventListener("click", () => location.reload());
  box.querySelector("[data-foco]").focus({ preventScroll: true }); /* leitor de tela e teclado vão direto para o "enviado" */
  window.scrollTo({ top: 0, behavior: suave() });
};

/* =============================== Páginas =============================== */

if (page === "inicio") {
  $("#slogan").innerHTML = esc(clube.slogan).replace(/^(\S+)/, "<em>$1</em>");
  $("#frase").textContent = clube.frase;
  $("#pill").textContent = `Pro Clubs · ${clube.jogo} · ${clube.plataforma}`;
  faixaNumeros($("#stats"));
  sequencia($("#form"), partidas);
  listaPartidas($("#matches"), partidas.slice(0, 5));
  ranking($("#leaders"));
  $("#cards").innerHTML = elenco.filter(p => p.ativo !== false).sort((a, b) => b.j - a.j).slice(0, 4).map(carta).join("");
}

if (page === "partidas") {
  const gp = golsPro(), gc = golsContra();
  $("#resbar").innerHTML = [[conta("V"), "Vitórias"], [conta("E"), "Empates"], [conta("D"), "Derrotas"], [gp + " x " + gc, "Gols pró x contra"]]
    .map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join("");
  sequencia($("#form"), partidas);
  let f = "T";
  const desenha = () => {
    const lista = f === "T" ? partidas : partidas.filter(m => res(m) === f);
    listaPartidas($("#matches"), lista);
    $("#count").textContent = plural(lista.length, "jogo");
    $$(".fbtn").forEach(b => b.classList.toggle("on", b.dataset.f === f));
  };
  $$(".fbtn").forEach(b => b.onclick = () => { f = b.dataset.f; desenha(); });
  desenha();
}

if (page === "elenco") {
  let pos = "T", q = "", ordem = "j", inativos = false;
  const desenha = () => {
    const lista = elenco
      .filter(p => (inativos || p.ativo !== false) && (pos === "T" || p.p === pos) && [p.n, p.psn].some(s => String(s || "").toLowerCase().includes(q)))
      .sort((a, b) => (b[ordem] || 0) - (a[ordem] || 0));
    $("#cards").innerHTML = lista.map(carta).join("");
    $("#none").hidden = lista.length > 0;
    $("#count").textContent = plural(lista.length, "jogador", "jogadores");
    $$(".fbtn[data-pos]").forEach(b => b.classList.toggle("on", b.dataset.pos === pos));
    $("#inact").classList.toggle("on", inativos);
  };
  $$(".fbtn[data-pos]").forEach(b => b.onclick = () => { pos = b.dataset.pos; desenha(); });
  $("#q").oninput = e => { q = e.target.value.trim().toLowerCase(); desenha(); };
  $("#sort").onchange = e => { ordem = e.target.value; desenha(); };
  $("#inact").onclick = () => { inativos = !inativos; desenha(); };
  desenha();
}

if (page === "videos") conteudoNuvem.then(() => {
  /* Origem do vídeo (pode vir do banco): "youtube:ID" (11 caracteres), "arquivo:https://..." (ou nome de arquivo em assets/videos/) e "link:https://...".
     Qualquer outra coisa devolve null e o vídeo não aparece na lista. */
  const fonte = v => {
    const src = String(v.src || ""), i = src.indexOf(":"), tipo = src.slice(0, i), val = src.slice(i + 1);
    const capa = urlHttp(v.capa) || (v.capa && !/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(v.capa) ? "assets/videos/" + v.capa : "");
    if (tipo === "youtube") return /^[\w-]{11}$/.test(val) ? { tipo, embed: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(val)}?autoplay=1&rel=0`, capa: capa || `https://i.ytimg.com/vi/${encodeURIComponent(val)}/hqdefault.jpg` } : null;
    if (tipo === "arquivo") { const arquivo = urlHttp(val) || (/^[\w. -]+\.(mp4|webm)$/i.test(val) ? "assets/videos/" + val : ""); return arquivo ? { tipo, arquivo, capa } : null; }
    if (tipo === "link") { const url = urlHttp(val); return url ? { tipo, url, capa } : null; }
    return null;
  };
  const ord = videos.filter(v => fonte(v)).sort((a, b) => String(b.data).localeCompare(String(a.data)));
  const modal = $("#vmodal"), palco = $("#vstage");
  let f = "T";
  const desenha = () => {
    const lista = f === "T" ? ord : ord.filter(v => v.tipo === f);
    $("#vgrid").innerHTML = lista.map(v => { const s = fonte(v); return `
      <button class="vcard" data-id="${esc(v.id)}">
        <div class="vthumb">${s.capa ? `<img src="${esc(s.capa)}" alt="" loading="lazy">` : `<img class="logo" src="assets/img/escudo-240.webp" alt="" width="240" height="240">`}<span class="vplay" aria-hidden="true">▶</span><span class="vbadge">${v.tipo === "partida" ? "Partida" : "Lance"}</span></div>
        <div class="vmeta"><h3>${esc(v.titulo)}</h3><span>${dataCurta(v.data)}${v.desc ? " · " + esc(v.desc) : ""}</span></div>
      </button>`; }).join("");
    $("#vnone").hidden = lista.length > 0;
    $("#count").textContent = plural(lista.length, "vídeo");
    $$("[data-vf]").forEach(b => b.classList.toggle("on", b.dataset.vf === f));
  };
  $$("[data-vf]").forEach(b => b.onclick = () => { f = b.dataset.vf; desenha(); });
  const fecha = () => { palco.innerHTML = ""; if (modal.open) modal.close(); };
  $("#vclose").onclick = fecha;
  modal.addEventListener("click", e => { if (e.target === modal) fecha(); });
  modal.addEventListener("close", () => { palco.innerHTML = ""; });
  $("#vgrid").onclick = e => {
    const c = e.target.closest(".vcard"); if (!c) return;
    const v = videos.find(x => x.id === c.dataset.id), s = v && fonte(v);
    if (!s) return;
    if (s.tipo === "link") { window.open(s.url, "_blank", "noopener"); return; }
    palco.innerHTML = s.tipo === "youtube"
      ? `<iframe src="${s.embed}" title="${esc(v.titulo)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`
      : `<video src="${esc(s.arquivo)}" controls autoplay playsinline></video>`;
    const m = v.partida && partidas.find(x => x.id === v.partida);
    $("#vinfo").innerHTML = `<h3>${esc(v.titulo)}</h3><p class="by">${dataLonga(v.data)}${m ? ` · ${esc(clube.nome)} ${m.gp}–${m.gc} ${esc(m.adv)}` : ""}</p>${v.desc ? `<p>${esc(v.desc)}</p>` : ""}`;
    modal.showModal();
  };
  desenha();
}).catch(e => { /* dado estragado não pode deixar a página em branco */
  console.error("Vídeos:", e);
  const g = $("#vgrid"); if (g) g.innerHTML = `<div class="empty-state">Não foi possível mostrar os vídeos agora. Recarregue a página em instantes.</div>`;
});

if (page === "noticias") conteudoNuvem.then(() => {
  const arts = noticias.slice().sort((a, b) => String(b.data).localeCompare(String(a.data)));
  const capa = a => a.capa
    ? `<div class="pimg"><img src="${esc(urlHttp(a.capa) || "assets/news/" + a.capa)}" alt="" loading="lazy"></div>`
    : `<div class="pimg blank"><img src="assets/img/escudo-240.webp" alt="" width="240" height="240" loading="lazy"></div>`;
  const cartao = (a, cls = "") => `<a class="story ${cls}" href="#/${esc(a.id)}">${capa(a)}
    <div class="txt"><div class="kick">${esc(a.chapeu)}</div><h2>${esc(a.titulo)}</h2><p>${esc(a.resumo)}</p><div class="by">${esc(a.autor)} · ${dataLonga(a.data)}</div></div></a>`;
  const blocos = a => a.corpo.map(b => typeof b === "string" ? `<p>${fmt(b)}</p>`
    : b.t ? `<h3>${esc(b.t)}</h3>`
    : `<figure><img src="${esc(urlHttp(b.img) || "assets/news/" + b.img)}" alt="${esc(b.legenda || "")}" loading="lazy">${b.legenda ? `<figcaption>${esc(b.legenda)}</figcaption>` : ""}</figure>`).join("");
  const rota = trocou => {
    let id = "";
    try { id = decodeURIComponent(location.hash.replace(/^#\/?/, "")); } catch (e) { id = ""; } /* hash malformado (ex.: #/%E0%A4%A) vira a lista, não um erro */
    const a = id && arts.find(x => x.id === id);
    $("#head").hidden = !!a;
    $("#paper").innerHTML = a ? `
      <article class="art">
        <a class="back" href="#/">‹ Todas as notícias</a>
        <div class="kick">${esc(a.chapeu)}</div><h1>${esc(a.titulo)}</h1>
        <p class="deck">${esc(a.resumo)}</p><div class="by">Por ${esc(a.autor)} · ${dataLonga(a.data)}</div>
        ${a.capa ? `<figure>${capa(a).replace('class="pimg"', 'class="pimg" style="aspect-ratio:auto"')}</figure>` : ""}
        <div class="art-body">${blocos(a)}</div>
      </article>`
      : arts.length ? `<div class="news-grid">${arts.map((x, i) => cartao(x, i === 0 ? "lead" : "")).join("")}</div>`
      : `<div class="empty-state">A primeira notícia está sendo escrita.</div>`;
    document.title = (a ? a.titulo + " | " : "Notícias | ") + clube.nome;
    window.scrollTo({ top: 0, behavior: "auto" });
    /* trocou de notícia pelo link: foco no título novo (leitor de tela e teclado não ficam "perdidos") */
    if (trocou) { const h = a ? $("#paper h1") : $("#head h1"); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }
  };
  const rotaSegura = ev => {
    try { rota(!!ev); } catch (e) {
      console.error("Notícias:", e);
      $("#head").hidden = false;
      $("#paper").innerHTML = `<div class="empty-state">Não foi possível mostrar esta notícia agora. <a href="#/">Voltar às notícias</a></div>`;
    }
  };
  window.addEventListener("hashchange", rotaSegura);
  rotaSegura();
}).catch(e => {
  console.error("Notícias:", e);
  const p = $("#paper"); if (p) p.innerHTML = `<div class="empty-state">Não foi possível mostrar as notícias agora. Recarregue a página em instantes.</div>`;
});

if (page === "recrutamento") {
  $("#posLine").textContent = "Posições procuradas: " + recrutamento.posicoes;
  $("#reqs").innerHTML = recrutamento.requisitos.map(r => `<li>${esc(r)}</li>`).join("");
  const f = $("#recForm");
  formulario({
    form: f, msg: $("#recMsg"), botao: $("#recSend"), tabela: "candidaturas", chaveEspera: "oxe_rec", textoBotao: "Enviar candidatura",
    ler: v => ({ psn: (v.psn || "").trim(), nick: (v.nick || "").trim(), plataforma: v.plataforma || "", posicao: v.posicao || "", posicao2: v.posicao2 || "",
      contato: (v.contato || "").trim(), horarios: (v.horarios || "").trim(), experiencia: v.experiencia || "", clube_anterior: (v.clube_anterior || "").trim(),
      lances: (v.lances || "").trim(), sobre: (v.sobre || "").trim() }),
    validar: p => primeiroErro([
      ["psn", limite(p.psn, 40, "ID no jogo") || (p.psn.length < 2 ? "Informe o seu ID (PSN ou gamertag)." : "")],
      ["nick", limite(p.nick, 40, "Como quer ser chamado")],
      ["posicao", !p.posicao ? "Escolha a posição em que você quer jogar." : ""],
      ["contato", limite(p.contato, 120, "Contato") || (p.contato.length < 3 ? "Informe um contato (Discord, WhatsApp ou Instagram)." : "")],
      ["horarios", limite(p.horarios, 120, "Horários livres")],
      ["clube_anterior", limite(p.clube_anterior, 60, "Último clube")],
      ["lances", limite(p.lances, 300, "Link de lances") || (p.lances && !urlHttp(p.lances) ? "O link dos lances precisa começar com https://" : "")],
      ["sobre", limite(p.sobre, 800, "Fale um pouco de você")],
    ]),
    resumo: p => `Candidatura para o ${clube.nome}\nID: ${p.psn} (${p.plataforma})` + (p.nick ? `\nNome: ${p.nick}` : "")
      + `\nPosição: ${p.posicao}` + (p.posicao2 && p.posicao2 !== p.posicao ? ` / ${p.posicao2}` : "") + `\nContato: ${p.contato}`
      + (p.horarios ? `\nHorários: ${p.horarios}` : "") + (p.experiencia ? `\nExperiência: ${p.experiencia}` : "")
      + (p.clube_anterior ? `\nÚltimo clube: ${p.clube_anterior}` : "") + (p.lances ? `\nLances: ${p.lances}` : "") + (p.sobre ? `\nSobre: ${p.sobre}` : ""),
    concluido: p => telaFinal($("#recBox"), "Candidatura enviada!",
      p ? `Valeu, <b>${esc(p.nick || p.psn)}</b>! A diretoria vai analisar e chamar você pelo contato informado para marcar o teste.` : "Recebemos a sua candidatura.",
      p ? [["ID", p.psn], ["Posição", p.posicao], ["Contato", p.contato]] : [], "Enviar outra candidatura"),
  });
}

if (page === "amistosos") {
  $("#hours").textContent = amistosos.horarios;
  const f = $("#amForm");
  f.data.min = hojeISO; f.data2.min = hojeISO;
  const linha = x => {
    const d = dia(x.data), feito = x.status === "realizado", placar = feito && x.placar_nos != null && x.placar_eles != null;
    const r = placar ? (x.placar_nos > x.placar_eles ? "V" : x.placar_nos < x.placar_eles ? "D" : "E") : "";
    return `<div class="ag-row"><div class="ag-date"><b>${pad(d.getDate())}/${pad(d.getMonth() + 1)}</b><span>${SEMANA[d.getDay()].slice(0, 3)}</span></div>
    <div class="ag-info"><b>${esc(clube.nome)} x ${esc(x.time)}</b><small>${esc(String(x.hora).slice(0, 5))}${x.plataforma ? " · " + esc(x.plataforma) : ""}${feito && !placar ? " · realizado" : ""}</small></div>
    ${placar ? `<span class="chip ${r}" style="margin-left:auto;width:auto;padding:0 8px" title="Placar">${x.placar_nos} x ${x.placar_eles}</span>` : ""}</div>`;
  };
  const mostraAgenda = lista => {
    const prox = lista.filter(x => x.status !== "realizado" && x.data >= hojeISO).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    const feitos = lista.filter(x => x.status === "realizado").sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora)).slice(0, 5);
    $("#agenda").innerHTML = (prox.length ? prox.map(linha).join("") : `<p class="sec-sub" style="margin:0">Nenhum amistoso marcado no momento. Que tal ser o próximo?</p>`)
      + (feitos.length ? `<div class="eyebrow" style="margin:18px 0 4px">Já jogados</div>` + feitos.map(linha).join("") : "");
  };
  mostraAgenda(amistosos.agenda);
  /* Com o Supabase ligado, a agenda vem da view pública (só amistosos confirmados, sem contatos). */
  if (nuvem) sbGet("amistosos_publico", "select=*&order=data.asc,hora.asc")
    .then(rows => mostraAgenda(rows.concat(amistosos.agenda))).catch(e => console.warn("Agenda da nuvem indisponível:", e.message));

  formulario({
    form: f, msg: $("#amMsg"), botao: $("#amSend"), tabela: "amistosos", chaveEspera: "oxe_am", textoBotao: "Enviar pedido",
    ler: v => ({ time: (v.time || "").trim(), capitao: (v.capitao || "").trim(), contato: (v.contato || "").trim(), plataforma: v.plataforma || "",
      data: v.data, hora: v.hora, data2: v.data2 || null, hora2: v.hora2 || null, divisao: v.divisao || "", jogadores: v.jogadores ? parseInt(v.jogadores, 10) : null, obs: (v.obs || "").trim() }),
    validar: p => primeiroErro([
      ["time", limite(p.time, 60, "Nome do seu time") || (p.time.length < 2 ? "Informe o nome do time." : "")],
      ["capitao", limite(p.capitao, 40, "Capitão") || (p.capitao.length < 2 ? "Informe o capitão (PSN ou gamertag)." : "")],
      ["contato", limite(p.contato, 120, "Contato") || (p.contato.length < 3 ? "Informe um contato (Discord, WhatsApp ou Instagram)." : "")],
      [!p.data ? "data" : "hora", !p.data || !p.hora ? "Escolha o dia e o horário do amistoso." : ""],
      ["data", noPassado(p.data, p.hora) ? "Escolha um dia e horário que ainda não passaram." : ""],
      [!p.data2 ? "data2" : "hora2", !!p.data2 !== !!p.hora2 ? "Na segunda opção, preencha dia e horário, ou deixe os dois em branco." : ""],
      ["data2", p.data2 && noPassado(p.data2, p.hora2) ? "A segunda opção precisa ser no futuro." : ""],
      ["jogadores", p.jogadores !== null && !(p.jogadores >= 1 && p.jogadores <= 11) ? "A quantidade de jogadores vai de 1 a 11." : ""],
      ["obs", limite(p.obs, 600, "Observações")],
    ]),
    resumo: p => `Pedido de amistoso contra o ${clube.nome}\nTime: ${p.time}\nCapitão: ${p.capitao} (${p.plataforma})\nContato: ${p.contato}\nDia e horário: ${dataCurta(p.data)} às ${p.hora}`
      + (p.data2 ? `\nOutra opção: ${dataCurta(p.data2)} às ${p.hora2}` : "") + (p.divisao ? `\nDivisão: ${p.divisao}` : "")
      + (p.jogadores ? `\nJogadores: ${p.jogadores}` : "") + (p.obs ? `\nObservações: ${p.obs}` : ""),
    concluido: p => telaFinal($("#formBox"), "Pedido enviado!",
      p ? `Recebemos o pedido do <b>${esc(p.time)}</b>. Vamos falar com o capitão <b>${esc(p.capitao)}</b> pelo contato informado para confirmar.` : "Recebemos o seu pedido.",
      p ? [["Dia e horário", `${dataCurta(p.data)} às ${p.hora}`], ["Contato", p.contato]] : [], "Enviar outro pedido"),
  });
}
