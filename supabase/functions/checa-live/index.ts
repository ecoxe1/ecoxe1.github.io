// =====================================================================
// checa-live: descobre se os canais cadastrados na tabela "lives" estão ao vivo e grava o resultado.
// Chamada pelo site (farol "Ao vivo") com POST {"motivo": "clique"} ou {"motivo": "reteste"}.
//
//   clique  -> testa os canais que estão vermelhos (sem live marcada ou com o prazo vencido)
//   reteste -> testa só os que estavam ao vivo e cujo prazo venceu (4 h na primeira vez, depois de 2 em 2 h)
//
// Ao vivo  -> grava "ate" = agora + 4 h (live nova) ou agora + 2 h (live que continua), e o vídeo/título.
// Offline  -> limpa "ate" (farol volta a vermelho).
// O mesmo canal não é consultado de novo em menos de 1 minuto (coluna checado_em): cliques em massa
// não gastam a cota do YouTube nem da Twitch.
//
// Segredos (Supabase > Edge Functions > Secrets; NUNCA no código nem no site):
//   YOUTUBE_API_KEY, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY o próprio Supabase fornece.
// Kick não é consultado (fica no botão manual do painel).
// =====================================================================

const ORIGENS = ["https://ecoxe.club", "https://www.ecoxe.club", "https://ecoxe1.github.io", "http://localhost:8090"];
const H = 3600 * 1000;
const PRIMEIRO_PRAZO = 4 * H, PRAZO_EXTRA = 2 * H, INTERVALO_MIN = 60 * 1000, TEMPO_EXTERNO = 6000;

const env = (k: string) => Deno.env.get(k) ?? "";
const SB_URL = env("SUPABASE_URL"), SB_KEY = env("SUPABASE_SERVICE_ROLE_KEY");

type Live = { id: string; jogador: string; plataforma: string; canal: string; video: string | null; titulo: string; ate: string | null; checado_em: string | null };
type Resultado = { online: boolean; video?: string | null; titulo?: string };

const cors = (origem: string | null) => ({
  "Access-Control-Allow-Origin": origem && ORIGENS.includes(origem) ? origem : ORIGENS[0],
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
  "Vary": "Origin",
});
const json = (corpo: unknown, status: number, origem: string | null) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors(origem), "Content-Type": "application/json" } });

const comTempo = (url: string, init: RequestInit = {}) => fetch(url, { ...init, signal: AbortSignal.timeout(TEMPO_EXTERNO) });

/* Banco, com a chave de serviço (só existe aqui dentro do Supabase). */
const banco = (caminho: string, init: RequestInit = {}) => comTempo(`${SB_URL}/rest/v1/${caminho}`, {
  ...init,
  /* chave nova (sb_secret_...) vai só em "apikey"; a antiga (JWT) também em Authorization */
  headers: { apikey: SB_KEY, ...(SB_KEY.startsWith("eyJ") ? { Authorization: `Bearer ${SB_KEY}` } : {}), "Content-Type": "application/json", ...(init.headers || {}) },
});

/* ---------- YouTube: lista dos vídeos recentes (RSS, sem cota) + 1 consulta à API (1 ponto da cota) ---------- */
async function youtube(canal: string): Promise<Resultado | null> {
  const chave = env("YOUTUBE_API_KEY");
  if (!chave) return null;
  const rss = await comTempo(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(canal)}`);
  if (!rss.ok) throw new Error(`YouTube RSS ${rss.status}`);
  const ids = [...(await rss.text()).matchAll(/<yt:videoId>([\w-]{11})<\/yt:videoId>/g)].map(m => m[1]).slice(0, 8);
  if (!ids.length) return { online: false };
  const r = await comTempo(`https://www.googleapis.com/youtube/v3/videos?part=snippet&fields=items(id,snippet(title,liveBroadcastContent))&id=${ids.join(",")}&key=${encodeURIComponent(chave)}`);
  if (!r.ok) throw new Error(`YouTube API ${r.status}`);
  const no = ((await r.json()).items || []).find((v: { snippet?: { liveBroadcastContent?: string } }) => v.snippet?.liveBroadcastContent === "live");
  return no ? { online: true, video: no.id, titulo: String(no.snippet.title || "").slice(0, 80) } : { online: false };
}

/* ---------- Twitch: token de app (guardado enquanto a função estiver de pé) + consulta de streams ---------- */
let twitchToken = "", twitchValidade = 0;
async function tokenTwitch(id: string, segredo: string) {
  if (twitchToken && Date.now() < twitchValidade) return twitchToken;
  const r = await comTempo("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: segredo, grant_type: "client_credentials" }),
  });
  if (!r.ok) throw new Error(`Twitch token ${r.status}`);
  const t = await r.json();
  twitchToken = t.access_token; twitchValidade = Date.now() + (Number(t.expires_in) - 300) * 1000;
  return twitchToken;
}
async function twitch(canais: string[]): Promise<Map<string, Resultado> | null> {
  const id = env("TWITCH_CLIENT_ID"), segredo = env("TWITCH_CLIENT_SECRET");
  if (!id || !segredo || !canais.length) return null;
  const token = await tokenTwitch(id, segredo);
  const r = await comTempo(`https://api.twitch.tv/helix/streams?${canais.map(c => "user_login=" + encodeURIComponent(c)).join("&")}`,
    { headers: { "Client-Id": id, Authorization: `Bearer ${token}` } });
  if (r.status === 401) { twitchToken = ""; throw new Error("Twitch 401"); }
  if (!r.ok) throw new Error(`Twitch ${r.status}`);
  const res = new Map<string, Resultado>(canais.map(c => [c.toLowerCase(), { online: false }]));
  for (const s of (await r.json()).data || []) if (s.type === "live") res.set(String(s.user_login).toLowerCase(), { online: true, titulo: String(s.title || "").slice(0, 80) });
  return res;
}

Deno.serve(async req => {
  const origem = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origem) });
  if (req.method !== "POST") return json({ erro: "use POST" }, 405, origem);
  if (!SB_URL || !SB_KEY) return json({ erro: "função sem configuração do Supabase" }, 500, origem);

  let motivo = "clique";
  try { const b = await req.json(); if (b && b.motivo === "reteste") motivo = "reteste"; } catch { /* corpo vazio = clique */ }

  const agora = Date.now();
  const r = await banco("lives?select=id,jogador,plataforma,canal,video,titulo,ate,checado_em&limit=30");
  if (!r.ok) { console.error("lives", r.status, (await r.text()).slice(0, 200)); return json({ erro: "não consegui ler os canais" }, 502, origem); }
  const lista: Live[] = await r.json();

  const vencido = (l: Live) => !!l.ate && Date.parse(l.ate) <= agora;
  const vermelho = (l: Live) => !l.ate || vencido(l);
  const descansado = (l: Live) => !l.checado_em || agora - Date.parse(l.checado_em) >= INTERVALO_MIN;
  const alvo = lista.filter(l => l.plataforma !== "kick" && descansado(l) && (motivo === "reteste" ? vencido(l) : vermelho(l)));

  const avisos: string[] = [];
  const resultados = new Map<string, Resultado | null>();
  /* Twitch: uma consulta só para todos os canais */
  const tw = alvo.filter(l => l.plataforma === "twitch");
  if (tw.length) {
    try {
      const m = await twitch(tw.map(l => l.canal));
      if (!m) avisos.push("Twitch sem chave");
      tw.forEach(l => resultados.set(l.id, m ? m.get(l.canal.toLowerCase()) ?? { online: false } : null));
    } catch (e) { avisos.push(String((e as Error).message)); }
  }
  for (const l of alvo.filter(l => l.plataforma === "youtube")) {
    try {
      const res = await youtube(l.canal);
      if (!res) avisos.push("YouTube sem chave");
      resultados.set(l.id, res);
    } catch (e) { avisos.push(String((e as Error).message)); }
  }

  /* Grava o resultado de cada canal testado.
     - erro na consulta: só marca checado_em (espera 1 minuto antes de tentar de novo; o estado não muda);
     - plataforma sem chave: live vencida vira offline (senão o site pediria reteste em toda visita);
     - Kick (não é consultado): live marcada à mão que venceu vira offline. */
  const quando = new Date(agora).toISOString();
  for (const l of lista.filter(l => l.plataforma === "kick" && vencido(l))) alvo.push(l);
  for (const l of alvo) {
    const res = resultados.get(l.id);
    const dados: Record<string, unknown> = { checado_em: quando };
    if (l.plataforma === "kick" || res === null) {
      if (!vencido(l)) continue;
      dados.ate = null; dados.video = null; dados.titulo = "";
    } else if (res === undefined) {
      /* falhou: só registra a tentativa */
    } else if (res.online) {
      dados.ate = new Date(agora + (l.ate ? PRAZO_EXTRA : PRIMEIRO_PRAZO)).toISOString();
      if (l.plataforma === "youtube") dados.video = res.video ?? null;
      if (res.titulo) dados.titulo = res.titulo;
    } else {
      dados.ate = null; dados.video = null; dados.titulo = "";
    }
    const u = await banco(`lives?id=eq.${encodeURIComponent(l.id)}`, { method: "PATCH", body: JSON.stringify(dados), headers: { Prefer: "return=minimal" } });
    if (!u.ok) avisos.push(`não gravei ${l.jogador}`);
    Object.assign(l, dados);
  }

  const publico = lista.map(({ id, jogador, plataforma, canal, video, titulo, ate, checado_em }) => ({ id, jogador, plataforma, canal, video, titulo, ate, checado_em }));
  return json({ motivo, testados: resultados.size, avisos: [...new Set(avisos)], lives: publico }, 200, origem);
});
