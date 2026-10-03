// Corrida da Galera — o placar da corrida e o resultado.
import { E, PISTAS, $, h, sNow, me, act, fmt } from "./estado.js";
import { Sound } from "./sons.js";
import { race } from "./jogo.js";
import { lapDone, deltaBest, myProg } from "./fantasma.js";

// ---------- placar da corrida ----------
export function standings() {
  if (!E.S || !race) return [];
  const rows = E.S.players.map((p) => {
    const gh = race.ghosts.get(p.id), prog = E.ME && p.id === E.ME.id ? myProg() : gh ? gh.prog : -1e9;
    return { id: p.id, p, prog, done: p.finish };
  });
  return rows.sort((a, b) => (a.done != null || b.done != null ? (a.done ?? 1e9) - (b.done ?? 1e9) : b.prog - a.prog));
}
export function hud() {
  if (!E.S) return;
  const m = me(), st = standings(), now = sNow(), cfg = E.S.config, tr = race.tr;
  const left = (race.startAt - now) / 1000;
  // contagem 3, 2, 1, VAI!
  let big = "";
  if (left > 0) { const n = Math.ceil(left); big = n <= 3 ? String(n) : ""; if (n <= 3 && race.beeped !== n) { race.beeped = n; Sound.beep(false); } }
  else if (left > -1) { big = "VAI!"; if (race.beeped !== 0) { race.beeped = 0; Sound.beep(true); } }
  if (m && m.finish != null && E.S.phase === "race") big = "";
  $("hBig").textContent = big;
  $("hBig").style.color = left > 0 ? "#ff4d4d" : "#2ecc71";
  if (m) {
    const pos = st.findIndex((r) => r.id === m.id) + 1;
    $("hPos").innerHTML = `${pos}º<small>/${st.length}</small>`;
    const lap = Math.min(cfg.voltas, (m.started ? m.laps : 0) + 1);
    $("hLap").textContent = m.finish != null ? "CHEGADA!" : `VOLTA ${lap}/${cfg.voltas}`;
    const t = m.finish != null ? m.finish : Math.max(0, (now - race.startAt) / 1000);
    $("hTime").textContent = `${fmt(t)}${m.best != null ? ` · melhor ${fmt(m.best)}` : ""}`;
    $("hSpeed").textContent = `${Math.round(Math.abs(race.car.v) * 0.75)} km/h`;
    const d = deltaBest(), el = $("hDelta");
    el.textContent = d == null ? (race.best ? `🏆 recorde ${fmt(race.best.t)}` : "") : `${d < 0 ? "−" : "+"}${Math.abs(d).toFixed(2)} s do recorde`;
    el.className = "time num " + (d == null ? "" : d < 0 ? "ahead" : "behind");
  } else { $("hPos").innerHTML = "👀"; $("hLap").textContent = "ASSISTINDO"; $("hTime").textContent = fmt(Math.max(0, (now - race.startAt) / 1000)); $("hSpeed").textContent = ""; }
  $("hBoard").innerHTML = st.slice(0, 8).map((r, i) => `<div><span>${i + 1}.</span><i style="background:${r.p.color}"></i>${h(r.p.name)}${r.done != null ? " 🏁" : ""}</div>`).join("");
  // avisos
  let msg = "";
  if (race.wrong > 1) msg = "⚠️ CONTRAMÃO! (aperte ↺)";
  else if (m && m.finish == null && m.started && m.laps === cfg.voltas - 1 && cfg.voltas > 1 && race.lastLapMsg > now - 2500) msg = "ÚLTIMA VOLTA!";
  else if (E.S.endAt && m && m.finish == null) msg = `⏱️ ${Math.max(0, Math.ceil((E.S.endAt - now) / 1000))} s para cruzar`;
  if (!msg && race.newRecord > now - 3000) msg = "🏆 NOVO RECORDE!";
  $("hMsg").textContent = msg;
  // vácuo e estilingue
  const dr = race.sling > 0 ? 1 : race.draft;
  $("wind").style.opacity = Math.min(0.85, dr * 1.1).toFixed(2);
  const hd = $("hDraft"); hd.style.opacity = dr > 0.15 ? 1 : 0;
  hd.innerHTML = race.sling > 0 ? "🚀 ESTILINGUE!" : `💨 VÁCUO<i style="width:${Math.round(race.draft * 100)}%"></i>`;
  // minimapa
  const mc = $("mini").getContext("2d"), k = 240 / race.tr.t.world;
  mc.drawImage(tr.mini, 0, 0);
  for (const r of st) {
    const gh = E.ME && r.id === E.ME.id ? race.car : race.ghosts.get(r.id); if (!gh) continue;
    mc.fillStyle = r.p.color; mc.strokeStyle = "#000"; mc.lineWidth = 2; mc.beginPath(); mc.arc(gh.x * k, gh.y * k, E.ME && r.id === E.ME.id ? 7 : 5, 0, 7); mc.fill(); mc.stroke();
  }
}
// volta nova: bipe e "última volta"
export function checkMyLap(old) {
  const m = me(), o = old && E.ME && old.players.find((p) => p.id === E.ME.id);
  if (!m || !o || !race) return;
  if (m.laps > o.laps) { lapDone(m); if (m.finish != null) Sound.finish(); else { Sound.lap(); race.lastLapMsg = sNow(); } }
}
export function renderResults() {
  const el = $("results");
  if (!E.S || E.S.phase !== "results") { el.classList.add("hidden"); return; }
  const m = me(), isHost = m && E.S.host === m.id, rows = standings();
  el.classList.remove("hidden");
  el.innerHTML = `<div class="placa"><div class="chk"></div><div class="in"><h2 style="font-size:28px;margin-bottom:10px">🏆 Resultado · ${h(PISTAS[E.S.config.pista].name)}</h2>
    <table>${rows.map((r, i) => `<tr><td>${r.done != null ? i + 1 + "º" : "—"}</td><td>${r.p.pawn} <b style="color:${r.p.color}">${h(r.p.name)}</b></td><td class="num">${r.done != null ? fmt(r.done) : "não terminou"}</td><td class="num muted">${r.p.best != null ? "melhor " + fmt(r.p.best) : ""}</td></tr>`).join("")}</table>
    <div class="row" style="margin-top:14px;justify-content:center">${isHost ? `<button class="primary" id="rAgain">🏁 Correr de novo</button><button id="rLobby">Trocar pista</button>` : `<span class="muted">Esperando o organizador…</span>`}<button class="ghost" onclick="location.href='/'">🏠 Vila</button></div></div></div>`;
  if ($("rAgain")) $("rAgain").onclick = () => act("start");
  if ($("rLobby")) $("rLobby").onclick = () => act("lobby");
}
