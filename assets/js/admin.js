/* Painel do EC OXE: login do administrador e gestão de candidaturas, amistosos, notícias e vídeos no Supabase.
   Usa as funções de app.js (esc, dataCurta, partidas...). Quem não está na tabela "admins" não consegue ler nem gravar nada. */
(function () {
  const root = document.getElementById("root");
  const q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
  /* Anti-frame: a CSP em <meta> não aceita frame-ancestors, então o painel se recusa a rodar dentro de outro site. */
  if (window.top !== window.self) { root.innerHTML = `<div class="panel"><h3>Painel bloqueado</h3><p class="sec-sub" style="margin:0">Abra o painel direto em ecoxe.club/admin.html.</p></div>`; return; }
  if (!nuvem) { root.innerHTML = `<div class="panel"><h3>Painel não configurado</h3><p class="sec-sub" style="margin:0">Preencha url e key em assets/js/config.js.</p></div>`; return; }
  if (!window.supabase) { root.innerHTML = `<div class="panel"><h3>Não foi possível carregar o painel</h3><p class="sec-sub" style="margin:0">Verifique a internet e recarregue a página.</p></div>`; return; }
  const sb = window.supabase.createClient(SB.url, SB.key);

  /* ---------- utilitários ---------- */
  const slug = t => (t || "item").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) + "-" + Math.random().toString(36).slice(2, 6);
  const ytId = s => { s = (s || "").trim(); const m = s.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/); return m ? m[1] : (/^[\w-]{11}$/.test(s) ? s : null); };
  const quando = iso => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} às ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const erro = e => (e && (e.message || e.error_description)) || String(e);
  /* Sessão vencida: o Supabase responde "JWT expired" (PGRST301) ou 401. Em vez de mostrar erro solto, volta para o login. */
  const expirada = e => !!e && (e.code === "PGRST301" || e.status === 401 || e.statusCode === "401" || /jwt expired|invalid jwt|jwt.*expir/i.test(String(e.message || e)));
  const expira = () => sb.auth.signOut({ scope: "local" }).catch(() => {}).then(() => telaLogin("Sua sessão expirou. Entre de novo."));
  const falhou = (e, prefixo) => { if (expirada(e)) { expira(); return; } diga(prefixo + erro(e), false); };
  /* Link vindo do banco só vira <a> se for http(s); senão aparece como texto (esc() sozinho não bloqueia "javascript:"). */
  const link = (url, texto) => urlHttp(url) ? `<a href="${esc(urlHttp(url))}" target="_blank" rel="noopener noreferrer">${esc(texto ?? url)}</a>` : esc(texto ?? url);
  let aviso;
  const diga = (t, ok = true) => {
    let el = document.getElementById("adm-toast");
    if (!el) { el = document.createElement("div"); el.id = "adm-toast"; el.className = "adm-toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.textContent = t; el.className = "adm-toast show " + (ok ? "ok" : "err");
    clearTimeout(aviso); aviso = setTimeout(() => el.classList.remove("show"), 3500);
  };
  async function envia(arquivo, pasta) {
    const ext = (arquivo.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const caminho = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await sb.storage.from("media").upload(caminho, arquivo, { contentType: arquivo.type, cacheControl: "31536000" });
    if (error) throw error;
    return sb.storage.from("media").getPublicUrl(caminho).data.publicUrl;
  }
  /* Apaga do Storage os arquivos que o painel enviou (links de fora são ignorados). Falha aqui não atrapalha o resto. */
  const PUBLICO = `${SB.url}/storage/v1/object/public/media/`;
  const apagaArquivos = urls => {
    const caminhos = urls.map(u => String(u || "").replace(/^arquivo:/, "")).filter(u => u.startsWith(PUBLICO)).map(u => decodeURIComponent(u.slice(PUBLICO.length)));
    return caminhos.length ? sb.storage.from("media").remove(caminhos).catch(() => {}) : Promise.resolve();
  };

  /* Troca rápida de aba: cada abertura ganha um número; resposta de uma abertura antiga é descartada. */
  let vez = 0;
  const marca = () => { const n = vez; return () => n === vez; };

  /* Sai sozinho depois de 30 minutos sem mexer no painel. */
  const OCIOSO_MS = 30 * 60 * 1000;
  let ocioso, logado = false;
  const mexeu = () => {
    if (!logado) return;
    clearTimeout(ocioso);
    ocioso = setTimeout(async () => { logado = false; await sb.auth.signOut({ scope: "local" }).catch(() => {}); telaLogin("Você ficou 30 minutos sem mexer e saiu do painel. Entre de novo."); }, OCIOSO_MS);
  };
  ["pointerdown", "keydown", "scroll", "touchstart"].forEach(t => window.addEventListener(t, mexeu, { passive: true }));

  /* ---------- login ---------- */
  function telaLogin(msg) {
    logado = false; clearTimeout(ocioso); vez++;
    root.innerHTML = `<form class="panel adm-login" id="login" novalidate>
      <h3>Entrar no painel</h3>
      <label for="em">E-mail</label><input id="em" name="email" type="email" autocomplete="username" required>
      <label for="pw" style="margin-top:12px">Senha</label><input id="pw" name="senha" type="password" autocomplete="current-password" required>
      <div class="factions"><button class="btn btn-gold" type="submit">Entrar</button></div>
      <div class="msg err" id="lmsg" ${msg ? "" : "hidden"}>${esc(msg || "")}</div></form>`;
    q("#login").onsubmit = async e => {
      e.preventDefault();
      const b = e.target.querySelector("button"); b.disabled = true; b.textContent = "Entrando…";
      const { error } = await sb.auth.signInWithPassword({ email: q("#em").value.trim(), password: q("#pw").value });
      if (error) { b.disabled = false; b.textContent = "Entrar"; const m = q("#lmsg"); m.hidden = false; m.textContent = "E-mail ou senha incorretos."; return; }
      inicia();
    };
  }

  async function inicia() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return telaLogin();
    const { data: adm, error: errAdm } = await sb.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle();
    if (expirada(errAdm)) return expira();
    if (errAdm) return telaLogin("Não foi possível conferir o acesso agora. Tente de novo em instantes.");
    if (!adm) { await sb.auth.signOut({ scope: "local" }); return telaLogin("Esta conta não é de administrador."); }
    logado = true; mexeu();
    root.innerHTML = `
      <div class="adm-top"><span class="by">Logado como <b>${esc(session.user.email)}</b></span><button class="btn btn-ghost btn-sm" id="sair" type="button">Sair</button></div>
      <div class="toolbar adm-tabs" role="tablist">
        <button class="fbtn" data-aba="cand">Candidaturas</button><button class="fbtn" data-aba="amis">Amistosos</button>
        <button class="fbtn" data-aba="news">Notícias</button><button class="fbtn" data-aba="vid">Vídeos</button>
      </div><div id="aba"></div>`;
    q("#sair").onclick = async () => { await sb.auth.signOut({ scope: "local" }); telaLogin(); }; /* só este aparelho */
    qa("[data-aba]").forEach(b => b.onclick = () => abre(b.dataset.aba));
    abre(guarda.get("oxe_aba") || "cand");
  }
  const ABAS = { cand: abaCandidaturas, amis: abaAmistosos, news: abaNoticias, vid: abaVideos };
  function abre(k) {
    if (!ABAS[k]) k = "cand";
    guarda.set("oxe_aba", k);
    qa("[data-aba]").forEach(b => b.classList.toggle("on", b.dataset.aba === k));
    q("#aba").innerHTML = `<div class="empty-state">Carregando…</div>`;
    vez++;
    const valendo = marca();
    ABAS[k]().catch(e => { if (!valendo()) return; if (expirada(e)) return expira(); q("#aba").innerHTML = `<div class="msg err">Erro: ${esc(erro(e))}</div>`; });
  }

  /* ---------- Candidaturas ---------- */
  async function abaCandidaturas() {
    const valendo = marca();
    const { data, error } = await sb.from("candidaturas").select("*").order("created_at", { ascending: false });
    if (!valendo()) return;
    if (error) throw error;
    const n = s => data.filter(x => x.status === s).length;
    /* O site não avisa mais o visitante que um ID já se candidatou; quem vê a repetição é só a diretoria. */
    const repetidas = {};
    data.filter(x => x.status === "pendente").forEach(x => { const k = String(x.psn).toLowerCase(); repetidas[k] = (repetidas[k] || 0) + 1; });
    const selo = c => { const t = c.status === "pendente" && repetidas[String(c.psn).toLowerCase()]; return t > 1 ? ` <span class="adm-badge pendente" title="Mesmo ID em mais de uma candidatura pendente">${t} com este ID</span>` : ""; };
    q("#aba").innerHTML = `<p class="sec-sub">${n("pendente")} pendente(s) · ${n("aprovado")} aprovada(s) · ${n("recusado")} recusada(s)</p>` + (data.length ? data.map(c => `
      <div class="panel adm-item" data-id="${esc(c.id)}">
        <div class="adm-head"><h3>${esc(c.psn)}${c.nick ? ` <small>(${esc(c.nick)})</small>` : ""}${selo(c)}</h3><span class="adm-badge ${esc(c.status)}">${esc(c.status)}</span></div>
        <dl class="adm-dl">
          <dt>Posição</dt><dd>${esc(c.posicao)}${c.posicao2 ? " / " + esc(c.posicao2) : ""}</dd>
          <dt>Plataforma</dt><dd>${esc(c.plataforma || "-")}</dd>
          <dt>Contato</dt><dd>${esc(c.contato)}</dd>
          <dt>Horários</dt><dd>${esc(c.horarios || "-")}</dd>
          <dt>Experiência</dt><dd>${esc(c.experiencia || "-")}</dd>
          <dt>Último clube</dt><dd>${esc(c.clube_anterior || "-")}</dd>
          ${c.lances ? `<dt>Lances</dt><dd>${link(c.lances)}</dd>` : ""}
          ${c.sobre ? `<dt>Sobre</dt><dd>${esc(c.sobre)}</dd>` : ""}
          <dt>Enviada</dt><dd>${quando(c.created_at)}</dd>
        </dl>
        <div class="fgrid">
          <div><label>Situação</label><select data-f="status">${["pendente", "aprovado", "recusado"].map(s => `<option${s === c.status ? " selected" : ""}>${s}</option>`).join("")}</select></div>
          <div><label>Anotação da diretoria</label><input data-f="nota_admin" value="${esc(c.nota_admin || "")}"></div>
        </div>
        <div class="factions"><button class="btn btn-gold btn-sm" data-salvar>Salvar</button><button class="btn btn-ghost btn-sm" data-apagar>Apagar</button></div>
      </div>`).join("") : `<div class="empty-state">Nenhuma candidatura ainda.</div>`);
    liga("candidaturas", abaCandidaturas);
  }

  /* ---------- Amistosos ---------- */
  async function abaAmistosos() {
    const valendo = marca();
    const { data, error } = await sb.from("amistosos").select("*").order("data", { ascending: false }).order("hora", { ascending: false });
    if (!valendo()) return;
    if (error) throw error;
    q("#aba").innerHTML = `<p class="sec-sub">Mude para <b>confirmado</b> para o jogo aparecer na agenda pública. Depois do jogo, marque <b>realizado</b> e coloque o placar.</p>` + (data.length ? data.map(a => `
      <div class="panel adm-item" data-id="${esc(a.id)}">
        <div class="adm-head"><h3>${esc(clube.nome)} x ${esc(a.time)}</h3><span class="adm-badge ${esc(a.status)}">${esc(a.status)}</span></div>
        <dl class="adm-dl">
          <dt>Dia e horário</dt><dd>${dataCurta(a.data)} às ${esc(String(a.hora).slice(0, 5))}${a.data2 ? ` · outra opção: ${dataCurta(a.data2)} às ${esc(String(a.hora2 || "").slice(0, 5))}` : ""}</dd>
          <dt>Capitão</dt><dd>${esc(a.capitao)} (${esc(a.plataforma || "-")})</dd>
          <dt>Contato</dt><dd>${esc(a.contato)}</dd>
          <dt>Divisão</dt><dd>${esc(a.divisao || "-")}${a.jogadores ? ` · ${a.jogadores} jogadores` : ""}</dd>
          ${a.obs ? `<dt>Observações</dt><dd>${esc(a.obs)}</dd>` : ""}
          <dt>Pedido em</dt><dd>${quando(a.created_at)}</dd>
        </dl>
        <div class="fgrid">
          <div><label>Situação</label><select data-f="status">${["pendente", "confirmado", "realizado", "recusado"].map(s => `<option${s === a.status ? " selected" : ""}>${s}</option>`).join("")}</select></div>
          <div><label>Dia / horário combinados</label><div style="display:flex;gap:8px"><input type="date" data-f="data" value="${a.data}"><input type="time" data-f="hora" value="${String(a.hora).slice(0, 5)}"></div></div>
          <div><label>Placar: ${esc(clube.nome)}</label><input type="number" min="0" data-f="placar_nos" value="${a.placar_nos ?? ""}"></div>
          <div><label>Placar: ${esc(a.time)}</label><input type="number" min="0" data-f="placar_eles" value="${a.placar_eles ?? ""}"></div>
          <div class="full"><label>Anotação da diretoria</label><input data-f="nota_admin" value="${esc(a.nota_admin || "")}"></div>
        </div>
        <div class="factions"><button class="btn btn-gold btn-sm" data-salvar>Salvar</button><button class="btn btn-ghost btn-sm" data-apagar>Apagar</button></div>
      </div>`).join("") : `<div class="empty-state">Nenhum pedido de amistoso ainda.</div>`);
    liga("amistosos", abaAmistosos);
  }

  /* Salvar e apagar nos cartões de candidaturas e amistosos */
  function liga(tabela, recarrega) {
    qa(".adm-item").forEach(card => {
      const id = card.dataset.id;
      card.querySelector("[data-salvar]").onclick = async ev => {
        const dados = {};
        card.querySelectorAll("[data-f]").forEach(i => { const v = i.value.trim(); dados[i.dataset.f] = i.type === "number" ? (v === "" ? null : Number(v)) : (v === "" && i.dataset.f === "nota_admin" ? null : v); });
        ev.target.disabled = true;
        const { error } = await sb.from(tabela).update(dados).eq("id", id);
        ev.target.disabled = false;
        if (error) return falhou(error, "Erro ao salvar: ");
        diga("Salvo!"); recarrega();
      };
      card.querySelector("[data-apagar]").onclick = async () => {
        if (!confirm("Apagar de vez? Não dá para desfazer.")) return;
        const { error } = await sb.from(tabela).delete().eq("id", id);
        if (error) return falhou(error, "Erro ao apagar: ");
        diga("Apagado."); recarrega();
      };
    });
  }

  /* ---------- Notícias ---------- */
  async function abaNoticias(editando) {
    const valendo = marca();
    const { data, error } = await sb.from("news").select("*").order("data", { ascending: false }).order("created_at", { ascending: false });
    if (!valendo()) return;
    if (error) throw error;
    const a = editando ? data.find(x => x.id === editando) : null;
    q("#aba").innerHTML = `
      <form class="panel" id="nform" novalidate>
        <h3>${a ? "Editar notícia" : "Nova notícia"}</h3>
        <div class="fgrid">
          <div class="full"><label>Título *</label><input name="titulo" maxlength="160" required value="${esc(a?.titulo || "")}"></div>
          <div><label>Chapéu <small>(ex.: Resultado, Bastidores)</small></label><input name="chapeu" maxlength="40" value="${esc(a?.chapeu || "Clube")}"></div>
          <div><label>Data</label><input name="data" type="date" value="${a?.data || hojeISO}"></div>
          <div class="full"><label>Resumo <small>(linha abaixo do título)</small></label><input name="resumo" maxlength="300" value="${esc(a?.resumo || "")}"></div>
          <div><label>Autor</label><input name="autor" maxlength="60" value="${esc(a?.autor || "Diretoria")}"></div>
          <div><label>Capa <small>(foto do topo)</small></label><input name="capaArq" type="file" accept="image/*">${a?.capa ? `<small class="by">Atual: ${link(a.capa, "ver capa")}</small>` : ""}</div>
          <div class="full"><label>Texto * <small>Linha em branco separa parágrafos · "## " no começo vira subtítulo · **negrito** · *itálico* · [texto](https://link)</small></label>
            <textarea name="corpo" rows="12" required>${esc(a?.corpo || "")}</textarea>
            <div class="factions" style="margin-top:8px"><label class="btn btn-ghost btn-sm" style="margin:0">Inserir foto no texto<input type="file" accept="image/*" id="fotoTexto" hidden></label></div></div>
          <div class="full"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="publicado" style="width:auto" ${a?.publicado === false ? "" : "checked"}> Publicada (aparece no site)</label></div>
        </div>
        <div class="factions"><button class="btn btn-gold" type="submit">${a ? "Salvar alterações" : "Publicar notícia"}</button>${a ? `<button class="btn btn-ghost" type="button" id="ncancel">Cancelar edição</button>` : ""}</div>
      </form>
      <h3 style="margin-top:32px">Publicadas pelo painel</h3>
      ${data.length ? data.map(x => `<div class="panel adm-row"><div><b>${esc(x.titulo)}</b><small class="by"> · ${dataCurta(x.data)} · ${x.publicado ? "publicada" : "rascunho"}</small></div>
        <div class="factions" style="margin:0"><a class="btn btn-ghost btn-sm" href="noticias.html#/${esc(x.id)}" target="_blank" rel="noopener">Ver</a><button class="btn btn-ghost btn-sm" data-ed="${esc(x.id)}">Editar</button><button class="btn btn-ghost btn-sm" data-del="${esc(x.id)}">Apagar</button></div></div>`).join("")
        : `<div class="empty-state">Nenhuma notícia publicada pelo painel ainda.</div>`}`;
    const f = q("#nform");
    q("#ncancel") && (q("#ncancel").onclick = () => abaNoticias());
    q("#fotoTexto").onchange = async e => {
      const arq = e.target.files[0]; if (!arq) return;
      diga("Enviando foto…");
      try {
        const url = await envia(arq, "news");
        const leg = prompt("Legenda da foto (opcional):") || "";
        f.corpo.value = f.corpo.value.replace(/\s*$/, "") + `\n\n![${leg.replace(/[\[\]]/g, "")}](${url})\n\n`;
        diga("Foto inserida no texto.");
      } catch (err) { falhou(err, "Erro ao enviar foto: "); }
      e.target.value = "";
    };
    f.onsubmit = async e => {
      e.preventDefault();
      if (f.titulo.value.trim().length < 3) return diga("Coloque um título.", false);
      if (!f.corpo.value.trim()) return diga("Escreva o texto da notícia.", false);
      const btn = f.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "Salvando…";
      try {
        let capa = a?.capa || "";
        if (f.capaArq.files[0]) capa = await envia(f.capaArq.files[0], "news");
        const dados = { titulo: f.titulo.value.trim(), chapeu: f.chapeu.value.trim() || "Clube", data: f.data.value || hojeISO, resumo: f.resumo.value.trim(),
          autor: f.autor.value.trim() || "Diretoria", capa, corpo: f.corpo.value.trim(), publicado: f.publicado.checked };
        const { error } = a ? await sb.from("news").update(dados).eq("id", a.id) : await sb.from("news").insert({ id: slug(dados.titulo), ...dados });
        if (error) throw error;
        if (a?.capa && a.capa !== capa) apagaArquivos([a.capa]); /* capa trocada: a antiga sai do Storage */
        diga(a ? "Notícia atualizada!" : "Notícia publicada!"); abaNoticias();
      } catch (err) { btn.disabled = false; btn.textContent = a ? "Salvar alterações" : "Publicar notícia"; falhou(err, "Erro: "); }
    };
    qa("[data-ed]").forEach(b => b.onclick = () => { abaNoticias(b.dataset.ed); window.scrollTo({ top: 0, behavior: "smooth" }); });
    qa("[data-del]").forEach(b => b.onclick = async () => {
      if (!confirm("Apagar esta notícia de vez?")) return;
      const x = data.find(n => n.id === b.dataset.del);
      const { error } = await sb.from("news").delete().eq("id", b.dataset.del);
      if (error) return falhou(error, "Erro ao apagar: ");
      /* capa e fotos inseridas no texto também saem do Storage */
      if (x) apagaArquivos([x.capa, ...[...String(x.corpo || "").matchAll(/!\[[^\]]*\]\((https:\/\/[^)\s]+)\)/g)].map(m => m[1])]);
      diga("Notícia apagada."); abaNoticias();
    });
  }

  /* ---------- Vídeos ---------- */
  async function abaVideos(editando) {
    const valendo = marca();
    const { data, error } = await sb.from("videos").select("*").order("data", { ascending: false }).order("created_at", { ascending: false });
    if (!valendo()) return;
    if (error) throw error;
    const v = editando ? data.find(x => x.id === editando) : null;
    const tipoSrc = v ? v.src.slice(0, v.src.indexOf(":")) : "youtube", valSrc = v ? v.src.slice(v.src.indexOf(":") + 1) : "";
    q("#aba").innerHTML = `
      <form class="panel" id="vform" novalidate>
        <h3>${v ? "Editar vídeo" : "Novo vídeo"}</h3>
        <div class="fgrid">
          <div class="full"><label>Título *</label><input name="titulo" maxlength="160" required value="${esc(v?.titulo || "")}"></div>
          <div><label>Tipo</label><select name="tipo"><option value="lance"${v?.tipo === "partida" ? "" : " selected"}>Lance</option><option value="partida"${v?.tipo === "partida" ? " selected" : ""}>Partida completa</option></select></div>
          <div><label>Data</label><input name="data" type="date" value="${v?.data || hojeISO}"></div>
          <div class="full"><label>De onde vem o vídeo?</label>
            <select name="origem"><option value="youtube"${tipoSrc === "youtube" ? " selected" : ""}>YouTube</option><option value="arquivo"${tipoSrc === "arquivo" ? " selected" : ""}>Enviar arquivo (MP4, até 50 MB)</option><option value="link"${tipoSrc === "link" ? " selected" : ""}>Outro link (Twitch, Medal, Instagram…)</option></select></div>
          <div class="full" data-orig="youtube"><label>Link do YouTube</label><input name="yt" placeholder="https://youtu.be/..." value="${tipoSrc === "youtube" ? "https://youtu.be/" + esc(valSrc) : ""}"></div>
          <div class="full" data-orig="arquivo"><label>Arquivo de vídeo</label><input name="arq" type="file" accept="video/mp4,video/webm">${tipoSrc === "arquivo" ? `<small class="by">Atual: ${link(valSrc, "ver vídeo")} (deixe vazio para manter)</small>` : ""}</div>
          <div class="full" data-orig="link"><label>Link</label><input name="link" type="url" placeholder="https://" value="${tipoSrc === "link" ? esc(valSrc) : ""}"></div>
          <div><label>Capa <small>(opcional; YouTube já tem)</small></label><input name="capaArq" type="file" accept="image/*"></div>
          <div><label>Partida relacionada <small>(opcional)</small></label><select name="partida"><option value="">Nenhuma</option>${partidas.map(m => `<option value="${esc(m.id)}"${v?.partida === m.id ? " selected" : ""}>${dataCurta(m.data)} · ${esc(m.adv)} ${m.gp}–${m.gc}</option>`).join("")}</select></div>
          <div class="full"><label>Descrição curta</label><input name="descr" maxlength="200" value="${esc(v?.descr || "")}"></div>
          <div class="full"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="publicado" style="width:auto" ${v?.publicado === false ? "" : "checked"}> Publicado (aparece no site)</label></div>
        </div>
        <div class="factions"><button class="btn btn-gold" type="submit">${v ? "Salvar alterações" : "Publicar vídeo"}</button>${v ? `<button class="btn btn-ghost" type="button" id="vcancel">Cancelar edição</button>` : ""}</div>
      </form>
      <h3 style="margin-top:32px">Publicados pelo painel</h3>
      ${data.length ? data.map(x => `<div class="panel adm-row"><div><b>${esc(x.titulo)}</b><small class="by"> · ${dataCurta(x.data)} · ${x.tipo} · ${x.publicado ? "publicado" : "rascunho"}</small></div>
        <div class="factions" style="margin:0"><button class="btn btn-ghost btn-sm" data-ed="${esc(x.id)}">Editar</button><button class="btn btn-ghost btn-sm" data-del="${esc(x.id)}">Apagar</button></div></div>`).join("")
        : `<div class="empty-state">Nenhum vídeo publicado pelo painel ainda.</div>`}`;
    const f = q("#vform");
    const mostraOrigem = () => qa("[data-orig]").forEach(d => d.hidden = d.dataset.orig !== f.origem.value);
    f.origem.onchange = mostraOrigem; mostraOrigem();
    q("#vcancel") && (q("#vcancel").onclick = () => abaVideos());
    f.onsubmit = async e => {
      e.preventDefault();
      if (f.titulo.value.trim().length < 3) return diga("Coloque um título.", false);
      const btn = f.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "Salvando…";
      try {
        let src;
        if (f.origem.value === "youtube") { const id = ytId(f.yt.value); if (!id) throw new Error("link do YouTube inválido"); src = "youtube:" + id; }
        else if (f.origem.value === "arquivo") {
          if (f.arq.files[0]) { diga("Enviando vídeo… pode demorar um pouco."); src = "arquivo:" + await envia(f.arq.files[0], "videos"); }
          else if (tipoSrc === "arquivo") src = v.src;
          else throw new Error("escolha o arquivo de vídeo");
        } else { if (!/^https?:\/\/\S+$/i.test(f.link.value.trim())) throw new Error("o link precisa começar com https://"); src = "link:" + f.link.value.trim(); }
        let capa = v?.capa || "";
        if (f.capaArq.files[0]) capa = await envia(f.capaArq.files[0], "videos");
        const dados = { titulo: f.titulo.value.trim(), tipo: f.tipo.value, data: f.data.value || hojeISO, src, capa, descr: f.descr.value.trim(), partida: f.partida.value, publicado: f.publicado.checked };
        const { error } = v ? await sb.from("videos").update(dados).eq("id", v.id) : await sb.from("videos").insert({ id: slug(dados.titulo), ...dados });
        if (error) throw error;
        if (v) apagaArquivos([v.capa !== capa && v.capa, v.src !== src && v.src]); /* arquivo ou capa trocados: os antigos saem do Storage */
        diga(v ? "Vídeo atualizado!" : "Vídeo publicado!"); abaVideos();
      } catch (err) { btn.disabled = false; btn.textContent = v ? "Salvar alterações" : "Publicar vídeo"; falhou(err, "Erro: "); }
    };
    qa("[data-ed]").forEach(b => b.onclick = () => { abaVideos(b.dataset.ed); window.scrollTo({ top: 0, behavior: "smooth" }); });
    qa("[data-del]").forEach(b => b.onclick = async () => {
      if (!confirm("Apagar este vídeo de vez?")) return;
      const x = data.find(n => n.id === b.dataset.del);
      const { error } = await sb.from("videos").delete().eq("id", b.dataset.del);
      if (error) return falhou(error, "Erro ao apagar: ");
      if (x) apagaArquivos([x.capa, x.src]);
      diga("Vídeo apagado."); abaVideos();
    });
  }

  inicia();
})();
