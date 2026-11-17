/* =====================================================================
   Favorito "Copiar do tracker" (bookmarklet). NÃO roda no site do EC OXE: o painel transforma este arquivo
   num link "javascript:" que a diretoria arrasta para a barra de favoritos e clica na página do clube no
   Pro Clubs Tracker. Ele só lê o que já está na tela (abre os detalhes de cada partida e a aba Player Stats)
   e manda o texto para o painel (admin.html#importar=...), que interpreta, mostra a prévia e grava.
   O texto vai no "#" do endereço: não passa por nenhum servidor. Precisa caber numa linha: sem comentários de //.
   ===================================================================== */
(async () => {
  const PAINEL = "https://ecoxe.club/admin.html";
  if (!/proclubstracker\.com\/club\//.test(location.href)) { alert("Abra a página do clube no Pro Clubs Tracker (aba Matches) e clique no favorito de novo."); return; }
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const aviso = document.createElement("div");
  aviso.style.cssText = "position:fixed;z-index:2147483647;left:50%;top:20px;transform:translateX(-50%);background:#111;color:#f0c75e;border:1px solid #f0c75e;border-radius:12px;padding:16px 20px;font:15px system-ui;max-width:90vw;box-shadow:0 10px 40px #000;text-align:center";
  aviso.textContent = "EC OXE: lendo as partidas…";
  document.body.appendChild(aviso);
  const botoes = [...document.querySelectorAll("button")].filter(b => /^(Show|Hide) match details$/.test(b.textContent.trim()));
  const cartoes = [];
  for (const [i, b] of botoes.entries()) {
    aviso.textContent = `EC OXE: lendo partida ${i + 1} de ${botoes.length}…`;
    if (b.textContent.trim().startsWith("Show")) { b.click(); await espera(900); }
    let c = b;
    for (let k = 0; k < 10 && c.parentElement; k++) { c = c.parentElement; if (/Match #\d+/.test(c.innerText)) break; }
    const ps = [...c.querySelectorAll("button")].find(x => /Player Stats/.test(x.textContent));
    if (ps) { ps.click(); await espera(900); }
    cartoes.push(c.innerText.replace(/Player match analysis[\s\S]*?(?=Match #)/, "").slice(0, 6000));
  }
  const cabecalho = (document.querySelector("main") || document.body).innerText.slice(0, 600);
  /* aba Players: totais da temporada de cada jogador (o tracker só guarda as 10 últimas partidas) */
  aviso.textContent = "EC OXE: lendo os números da temporada…";
  const aba = [...document.querySelectorAll("button")].find(x => /Players/.test(x.textContent) && x.textContent.length < 20);
  const elenco = [], mapa = [];
  if (aba) {
    aba.click(); await espera(2500);
    for (const h of document.querySelectorAll("main h4")) {
      const card = h.closest(".rounded-xl");
      if (card && /Games/.test(card.innerText)) elenco.push({ nome: h.textContent.trim(), pos: (card.querySelector("span") || {}).textContent || "", texto: card.innerText.slice(0, 1500) });
    }
    /* o comparador de jogadores liga o nome no jogo ao PSN */
    const h2h = [...document.querySelectorAll("button, a, div")].find(x => /Player head to head/.test(x.textContent) && x.textContent.length < 80);
    if (h2h) { h2h.click(); await espera(2500); }
    const sel = document.querySelector("select");
    if (sel) for (const o of sel.options) if (o.value) mapa.push({ nome: o.textContent.trim(), psn: o.value });
  }
  const pacote = { v: 2, url: location.href, tz: new Date().getTimezoneOffset(), lingua: navigator.language, cabecalho, cartoes, elenco, mapa };
  const destino = PAINEL + "#importar=" + encodeURIComponent(JSON.stringify(pacote));
  aviso.innerHTML = "";
  const t = document.createElement("div"); t.textContent = `EC OXE: ${cartoes.length} partida(s) e ${elenco.length} jogador(es) lidos.`; t.style.marginBottom = "10px";
  const ir = document.createElement("button"); ir.textContent = "Enviar para o painel do EC OXE";
  ir.style.cssText = "background:#f0c75e;color:#1a1408;border:0;border-radius:999px;padding:10px 18px;font:600 15px system-ui;cursor:pointer;margin-right:8px";
  ir.onclick = () => { window.open(destino, "_blank", "noopener"); aviso.remove(); };
  const fecha = document.createElement("button"); fecha.textContent = "Cancelar";
  fecha.style.cssText = "background:none;color:#ccc;border:1px solid #555;border-radius:999px;padding:10px 14px;font:15px system-ui;cursor:pointer";
  fecha.onclick = () => aviso.remove();
  aviso.append(t, ir, fecha);
})();
