// Prisme Fusion — fonction serveur « pf-act » : toutes les décisions du jeu passent ici.
// Le moteur de règles est le même que celui du téléphone, exécuté avec l'heure du serveur.
import { createClient } from "npm:@supabase/supabase-js@2";
// Les règles du jeu (noyau pf_core + moteur v7_engine) sont publiées avec le jeu sur GitHub Pages dans pf_server.js :
// le serveur charge toujours exactement la version que les téléphones utilisent. Mis en cache 10 min par instance.
const RULES_URL = "https://lm-atz.github.io/prisme-fusion/pf_server.js";
// deno-lint-ignore no-explicit-any
let rules: { core: any; engine: string; at: number } | null = null;
// deno-lint-ignore no-explicit-any
async function loadRules(): Promise<{ core: any; engine: string }> {
  if (rules && Date.now() - rules.at < 600_000) return rules;
  const r = await fetch(RULES_URL, { headers: { "cache-control": "no-cache" } });
  if (!r.ok) { if (rules) return rules; throw new Error("rules"); }
  const src = await r.text();
  if (!src.includes("pfApply") || !src.includes("ENGINE_SRC")) { if (rules) return rules; throw new Error("rules"); }
  const mod = new Function("module", "exports", src + "\nreturn module.exports;")({ exports: {} }, {});
  if (typeof mod.pfApply !== "function" || typeof mod.ENGINE_SRC !== "string") { if (rules) return rules; throw new Error("rules"); }
  rules = { core: mod, engine: mod.ENGINE_SRC, at: Date.now() };
  return rules;
}
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, err: "method" }, 405);
  // deno-lint-ignore no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, err: "json" }, 400); }
  const id = String(body.id || ""), secret = String(body.secret || "");
  if (!UUID.test(id) || secret.length < 16 || secret.length > 128) return json({ ok: false, err: "auth" }, 401);
  if (JSON.stringify(body).length > 120000) return json({ ok: false, err: "too_big" }, 413);
  let core, ENGINE_SRC: string;
  try { ({ core, engine: ENGINE_SRC } = await loadRules()); } catch { return json({ ok: false, err: "rules" }, 503); }

  // 1. authentification (et création du joueur au premier contact) via la RPC existante
  const hello = await sb.rpc("pf_hello", { p_id: id, p_secret: secret, p_lang: String(body.lang || "fr").slice(0, 5), p_name: String(body.name || "Prisme").slice(0, 16) });
  if (hello.error) return json({ ok: false, err: hello.error.message === "auth" ? "auth" : "server" }, hello.error.message === "auth" ? 401 : 500);

  // 2. état autoritaire
  const row = await sb.from("players").select("state,ver,banned,anom,save").eq("id", id).single();
  if (row.error || !row.data) return json({ ok: false, err: "player" }, 500);
  if (row.data.banned) return json({ ok: false, err: "banned" }, 403);
  const stateIn = row.data.state ?? (row.data.save && row.data.save.v === 3 ? row.data.save : null); // reprise des anciennes sauvegardes
  const now = Date.now();

  // 3. guilde : création (50 gemmes) et réclamation d'un palier sont verrouillées en base AVANT que le moteur n'accorde quoi que ce soit
  let trusted = false;
  // deno-lint-ignore no-explicit-any
  let guildRes: any = null;
  const pl = (body.payload && typeof body.payload === "object") ? body.payload : {};
  if (body.action === "guild_create") {
    const price = 50;
    if (((stateIn && stateIn.gems) | 0) < price) return json({ ok: false, err: "gems" });
    const c = await sb.rpc("pf_guild_create", { p_id: id, p_secret: secret, p_name: String(pl.name || "").slice(0, 40), p_lang: String(body.lang || "fr").slice(0, 2) });
    if (c.error) return json({ ok: false, err: c.error.message });
    guildRes = c.data; body = { ...body, action: "guild_pay", payload: { gems: price } }; trusted = true;
  } else if (body.action === "guild_claim") {
    const tier = Number(pl.tier) | 0;
    const c = await sb.rpc("pf_guild_claim", { p_id: id, p_tier: tier });
    if (c.error) return json({ ok: false, err: c.error.message });
    guildRes = c.data; body = { ...body, action: "guild_reward", payload: { tier } }; trusted = true;
  } else if (body.action === "guild_pay" || body.action === "guild_reward") return json({ ok: false, err: "trusted" }, 403);

  // 4. application de l'action par le moteur partagé
  let r = core.pfApply(ENGINE_SRC, stateIn, body, now, trusted);
  if (guildRes) r.result.guild = guildRes;
  const effects: unknown[] = [];
  for (const e of (r.result.effects || []) as Record<string, unknown>[]) {
    if (typeof e.gpts === "number") { // quête de guilde validée par le moteur → points dans la jauge de la guilde
      const a = await sb.rpc("pf_guild_add", { p_id: id, p_points: e.gpts });
      if (a.error || !a.data || !a.data.ok) { r.state.day.gq = (r.state.day.gq || []).filter((x: number) => x !== e.i); r.result.ok = false; r.result.err = a.error ? "server" : "no_guild"; }
      else effects.push({ guild: a.data.total });
    }
    if (typeof e.titan === "number") { const t = await sb.rpc("pf_titan", { p_id: id, p_secret: secret, p_score: e.titan, p_best: e.best }); effects.push({ titan: t.error ? t.error.message : t.data }); }
    if (typeof e.name === "string") { const n = await sb.rpc("pf_set_name", { p_id: id, p_secret: secret, p_name: e.name }); effects.push({ name: n.error ? n.error.message : "ok" }); }
    if (typeof e.report === "string" && UUID.test(e.report)) { const n = await sb.rpc("pf_report", { p_id: id, p_secret: secret, p_target: e.report }); effects.push({ report: n.error ? n.error.message : n.data }); }
  }
  // 5. au réveil : résultat de ligue de la semaine passée, accordé par le serveur
  let league: unknown = null;
  if (body.action === "hello") {
    const lr = await sb.rpc("pf_league_result", { p_id: id, p_secret: secret });
    if (!lr.error && lr.data && lr.data.rank) {
      const minutes = core.pfLeagueMinutes(lr.data.rank);
      const r2 = core.pfApply(ENGINE_SRC, r.state, { action: "league", payload: { gems: lr.data.gems, minutes } }, now, true);
      r.state = r2.state; league = { ...lr.data, sparks: r2.result.sparks };
    }
  }
  // 6. persistance avec verrou optimiste
  const anomN = (row.data.anom || 0) + r.anomalies.length;
  const upd = await sb.from("players").update({ state: r.state, ver: row.data.ver + 1, last_act: new Date(now).toISOString(), anom: anomN, best_stage: r.state.bestStage, prestiges: r.state.prestiges })
    .eq("id", id).eq("ver", row.data.ver).select("ver");
  if (upd.error) return json({ ok: false, err: "save" }, 500);
  if (!upd.data || !upd.data.length) return json({ ok: false, err: "busy" }, 409);
  if (r.anomalies.length) await sb.from("anomalies").insert({ player_id: id, action: String(body.action || "sync"), kinds: r.anomalies, info: { stage: r.state.run.stage, best: r.state.bestStage } });

  return json({ ok: true, now, state: r.state, result: r.result, anomalies: r.anomalies, league, effects, hello: body.action === "hello" ? { name: hello.data?.name, flags: hello.data?.flags } : undefined });
});
