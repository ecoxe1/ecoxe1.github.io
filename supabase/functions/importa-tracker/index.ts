// =====================================================================
// importa-tracker: atualização automática das estatísticas (roda todo dia às 06:00 de Brasília pelo pg_cron).
// Lê a API pública do Pro Clubs Tracker (a mesma que a página do clube usa; ela busca na EA na hora) e grava:
//   - partidas (as 10 últimas de cada tipo que a EA guarda; o banco acumula o histórico),
//   - temporada (V/E/D, gols, SR) e os totais da temporada de cada jogador.
// A divisão NÃO é alterada aqui (o número que o tracker mostra não é o "currentDivision" da EA); o favorito do
// painel continua atualizando a divisão quando usado.
// Proteção: se a temporada foi atualizada há menos de 10 minutos, não faz nada (chamadas repetidas não
// sobrecarregam o tracker). Não usa segredo nenhum além da chave de serviço que o Supabase fornece.
// =====================================================================

const CLUBE = "2210096", PLATAFORMA = "common-gen5";
const FONTE = `https://proclubstracker.com/api/clubs/${CLUBE}?platform=${PLATAFORMA}`;
const INTERVALO_MIN = 10 * 60 * 1000;
const env = (k: string) => Deno.env.get(k) ?? "";
const SB_URL = env("SUPABASE_URL"), SB_KEY = env("SUPABASE_SERVICE_ROLE_KEY");

const banco = (caminho: string, init: RequestInit = {}) => fetch(`${SB_URL}/rest/v1/${caminho}`, {
  ...init,
  signal: AbortSignal.timeout(10000),
  headers: { apikey: SB_KEY, ...(SB_KEY.startsWith("eyJ") ? { Authorization: `Bearer ${SB_KEY}` } : {}), "Content-Type": "application/json", ...(init.headers || {}) },
});
const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

/* posição do jogador na EA (proPos) -> sigla que o tracker mostra */
const POS: Record<string, string> = { "0": "GK", "1": "SW", "2": "RWB", "3": "RB", "4": "RCB", "5": "CB", "6": "LCB", "7": "LB", "8": "LWB", "9": "RDM", "10": "CDM", "11": "LDM", "12": "RM", "13": "RCM", "14": "CM", "15": "LCM", "16": "LM", "17": "RAM", "18": "CAM", "19": "LAM", "20": "RF", "21": "CF", "22": "LF", "23": "RW", "24": "RS", "25": "ST", "26": "LS", "27": "LW" };
const POS_PARTIDA: Record<string, string> = { goalkeeper: "GK", defender: "ZAG", midfielder: "MEI", forward: "ATA" };
const COMP: Record<string, string> = { league: "Liga", playoff: "Playoff", friendly: "Amistoso" };
const n = (v: unknown) => Number(v) || 0;

// deno-lint-ignore no-explicit-any
type Qualquer = any;

Deno.serve(async () => {
  if (!SB_URL || !SB_KEY) return resposta({ erro: "função sem configuração do Supabase" }, 500);

  /* não repete em menos de 10 minutos */
  const atual = await banco("temporada?select=atualizado_em,divisao&id=eq.1");
  if (!atual.ok) return resposta({ erro: "não consegui ler a temporada", status: atual.status }, 502);
  const [linha] = await atual.json();
  if (linha && Date.now() - Date.parse(linha.atualizado_em) < INTERVALO_MIN) return resposta({ pulou: "atualizado há menos de 10 minutos", em: linha.atualizado_em });

  /* dados do tracker */
  let j: Qualquer;
  try {
    const r = await fetch(FONTE, { headers: { "User-Agent": "ECOXE-site/1.0 (+https://ecoxe.club; atualizacao diaria)", Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) return resposta({ erro: "tracker respondeu " + r.status }, 502);
    j = await r.json();
  } catch (e) { return resposta({ erro: "não consegui falar com o tracker: " + String((e as Error).message) }, 502); }

  /* partidas */
  const partidas: Qualquer[] = [];
  for (const [tipo, lista] of Object.entries(j.matches || {})) {
    for (const m of (Array.isArray(lista) ? lista : []) as Qualquer[]) {
      const nos = m.clubs?.[CLUBE]; if (!nos) continue;
      const [, advClube] = Object.entries(m.clubs).find(([k]) => k !== CLUBE) as [string, Qualquer] || [null, {}];
      const jogs = Object.values(m.players?.[CLUBE] || {}) as Qualquer[];
      const gols: string[] = [], assist: string[] = []; let mvp = "";
      for (const p of jogs) {
        for (let i = 0; i < n(p.goals); i++) gols.push(String(p.playername));
        for (let i = 0; i < n(p.assists); i++) assist.push(String(p.playername));
        if (String(p.mom) === "1") mvp = String(p.playername);
      }
      const gp = n(nos.goals), gc = n(nos.goalsAgainst);
      const obs = String(nos.winnerByDnf) === "1" ? `Vitória por W.O.: o adversário abandonou a partida${gols.length !== gp ? ` quando estava ${gols.length}–${gc}` : ""}.`
        : String(advClube?.winnerByDnf) === "1" ? "Derrota por W.O.: o EC OXE abandonou a partida." : "";
      partidas.push({
        id: String(m.matchId).slice(-6), data: new Date(n(m.timestamp) * 1000).toISOString(),
        adv: String(advClube?.details?.name || "Adversário").slice(0, 60), comp: COMP[tipo] || tipo,
        gp, gc, gols, assist, mvp: mvp.slice(0, 40), obs,
        jogadores: jogs.slice(0, 11).map(p => ({ psn: String(p.playername).slice(0, 40), pos: POS_PARTIDA[p.pos] || "", nota: Number(p.rating) || null })),
        atualizado_em: new Date().toISOString(),
      });
    }
  }

  /* temporada e totais de cada jogador */
  const o = j.overallStats || {};
  const jogadores = ((j.memberStats?.members || []) as Qualquer[]).slice(0, 40).map(x => ({
    psn: String(x.name).slice(0, 40), nome_jogo: String(x.proName || x.name).slice(0, 40), pos: POS[String(x.proPos)] || "",
    ovr: n(x.proOverall), jogos: n(x.gamesPlayed), gols: n(x.goals), assist: n(x.assists), mvp: n(x.manOfTheMatch), nota: Number(x.ratingAve) || 0,
  })).filter(x => x.psn);
  const v = n(o.wins), e = n(o.ties), d = n(o.losses);
  const temporada: Qualquer = { id: 1, jogos: v + e + d, v, e, d, gp: n(o.goals), gc: n(o.goalsAgainst), sr: n(o.skillRating) || null, jogadores, atualizado_em: new Date().toISOString() };
  if (!linha) temporada.divisao = null; /* primeira vez: sem divisão até alguém importar pelo favorito */

  /* grava */
  const avisos: string[] = [];
  if (partidas.length) {
    const r = await banco("partidas?on_conflict=id", { method: "POST", body: JSON.stringify(partidas), headers: { Prefer: "resolution=merge-duplicates,return=minimal" } });
    if (!r.ok) avisos.push("partidas: " + r.status + " " + (await r.text()).slice(0, 160));
  }
  if (temporada.jogos > 0) {
    const r = await banco("temporada?on_conflict=id", { method: "POST", body: JSON.stringify(temporada), headers: { Prefer: "resolution=merge-duplicates,return=minimal" } });
    if (!r.ok) avisos.push("temporada: " + r.status + " " + (await r.text()).slice(0, 160));
  } else avisos.push("tracker sem V/E/D; temporada não alterada");

  return resposta({ ok: avisos.length === 0, partidas: partidas.length, jogadores: jogadores.length, temporada: { jogos: temporada.jogos, v, e, d, gp: temporada.gp, gc: temporada.gc, sr: temporada.sr }, divisao_ea: o.currentDivision ?? null, avisos }, avisos.length ? 207 : 200);
});
