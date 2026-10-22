// Corrida da Galera — o placar da corrida e o resultado.
import { E, PISTAS, $, h, sNow, me, act, fmt, SECTORS, checkpoint } from "./estado.js";
import { Sound } from "./sons.js";
import { race } from "./jogo.js";
import { lapDone, deltaBest, myProg } from "./fantasma.js";
import { drawItemHud } from "./itens.js";

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
  drawItemHud();
  const m = me(), st = standings(), now = sNow(), cfg = E.S.config, tr = race.tr;
  const left = (race.startAt - now) / 1000;
  // contagem 3, 2, 1, VAI!
  let big = "";
  if (left > 0) { const n = Math.ceil(left); big = n <= 3 ? String(n) : ""; if (n <= 3 && race.beeped !== n) { race.beeped = n; Sound.beep(false); } }
  else if (left > -1) { big = "VAI!"; if (race.beeped !== 0) { race.beeped = 0; Sound.beep(true); } }
  if (m && m.finish != null && E.S.phase === "race") big = "";
  $("hBig").textContent = big;
  $("hBig").style.color = left > 0 ? "#ff4d4d" : "#2ecc71";
  // progresso da corrida inteira (como "42% Progresso"), a barra fininha embaixo e a linha de volta, posição e tempo
  const lider = st[0], meuProg = m ? (m.finish != null ? 1 : Math.max(0, myProg()) / (cfg.voltas * tr.n)) : lider ? Math.max(0, lider.prog) / (cfg.voltas * tr.n) : 0;
  const pct = Math.max(0, Math.min(100, Math.floor(meuProg * 100)));
  if (race.hudPct !== pct) { race.hudPct = pct; $("hProg").textContent = pct + "%"; $("hBarra").style.width = pct + "%"; }
  if (m) {
    const pos = st.findIndex((r) => r.id === m.id) + 1;
    $("hPos").innerHTML = `${pos}º<small>/${st.length}</small>`;
    const lap = Math.min(cfg.voltas, (m.started ? m.laps : 0) + 1);
    $("hLap").textContent = m.finish != null ? "Chegada!" : `Volta ${lap}/${cfg.voltas}`;
    const t = m.finish != null ? m.finish : Math.max(0, (now - race.startAt) / 1000);
    $("hTime").textContent = `${fmt(t)}${m.best != null ? ` · melhor ${fmt(m.best)}` : ""}`;
    velocimetro(Math.abs(race.car.v));
    const d = deltaBest(), el = $("hDelta");
    el.textContent = d == null ? (race.best ? `🏆 recorde ${fmt(race.best.t)}` : "") : `${d < 0 ? "−" : "+"}${Math.abs(d).toFixed(2)} s do recorde`;
    el.className = "time num " + (d == null ? "" : d < 0 ? "ahead" : "behind");
  } else { $("hPos").innerHTML = "👀"; $("hLap").textContent = "Assistindo"; $("hTime").textContent = fmt(Math.max(0, (now - race.startAt) / 1000)); velocimetro(Math.abs(lider ? race.ghosts.get(lider.id)?.v || 0 : 0)); }
  const quadro = st.slice(0, 8).map((r, i) => `<div class="${m && r.id === m.id ? "eu" : ""}"><span>${i + 1}</span><i style="background:${r.p.color}"></i>${h(r.p.name)}${r.p.bot ? " <em>CPU</em>" : ""}${r.done != null ? " 🏁" : ""}</div>`).join("");
  if (race.hudQuadro !== quadro) { race.hudQuadro = quadro; $("hBoard").innerHTML = quadro; }
  if (m && race.hudChip !== m.name) { race.hudChip = m.name; $("hChip").innerHTML = `<i style="background:${m.color}"></i>${h(m.name)}<span>${h(PISTAS[cfg.pista].name)}</span>`; }
  // avisos
  let msg = "";
  if (m && m.balaUntil > now) msg = "🚀 BALA! (piloto automático)";
  else if (m && m.spinUntil > now) msg = "💥 ATINGIDO!";
  else if (m && m.shrinkUntil > now) msg = "⚡ ENCOLHIDO PELO RAIO!";
  else if (race.wrong > 1) msg = "⚠️ CONTRAMÃO! (aperte ↺)";
  else if (race.perdeu >= 0 && m && m.finish == null) msg = "⟲ CHECKPOINT PERDIDO: volte nele ou aperte ↺";
  else if (race.cpT > now - 900 && race.sector > 0) msg = `✓ CHECKPOINT ${race.sector}/${SECTORS}`;
  else if (m && m.finish == null && m.started && m.laps === cfg.voltas - 1 && cfg.voltas > 1 && race.lastLapMsg > now - 2500) msg = "ÚLTIMA VOLTA!";
  else if (E.S.endAt && m && m.finish == null) msg = `⏱️ ${Math.max(0, Math.ceil((E.S.endAt - now) / 1000))} s para cruzar`;
  if (!msg && race.newRecord > now - 3000) msg = "🏆 NOVO RECORDE!";
  $("hMsg").textContent = msg;
  // vácuo e estilingue
  const dr = race.sling > 0 ? 1 : race.draft;
  const hd = $("hDraft");
  const star = m && m.starUntil > now;
  hd.innerHTML = star ? "⭐ ESTRELA!" : race.sling > 0 ? "🚀 ESTILINGUE!" : race.draft > 0.15 ? `💨 VÁCUO<i style="width:${Math.round(race.draft * 100)}%"></i>` : race.catchup > 0.025 ? "⚡ PELOTÃO À VISTA" : "";
  hd.style.opacity = star || race.sling > 0 || race.draft > 0.15 || race.catchup > 0.025 ? 1 : 0;
  if ((race.hudVez = (race.hudVez || 0) + 1) % 2 === 0) minimapa(st, m); // o minimapa a cada 2 quadros já basta
}
// minimapa redondo que gira com o carro (a frente é para cima): a pista em cinza e o caminho à frente em azul-claro
function minimapa(st, m) {
  const cv = $("mini"), c = cv.getContext("2d"), S = cv.width, tr = race.tr, eu = m ? race.car : (st[0] && race.ghosts.get(st[0].id)) || race.car;
  const esc = S / 2 / 900, idx = m ? race.idx : eu.idx || 0;
  c.clearRect(0, 0, S, S); c.save();
  c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 3, 0, 7); c.fillStyle = "#0b1016cc"; c.fill(); c.clip();
  c.translate(S / 2, S / 2 + S * 0.12); c.rotate(-eu.a - Math.PI / 2); c.scale(esc, esc); c.translate(-eu.x, -eu.y);
  c.lineCap = c.lineJoin = "round";
  c.beginPath(); for (let i = 0; i <= tr.n; i += 3) { const p = tr.pts[i % tr.n]; i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }
  c.strokeStyle = "#5d6673"; c.lineWidth = 34 / esc / 6; c.stroke();
  c.beginPath(); for (let k = 0; k <= 260; k += 2) { const p = tr.pts[(idx + k) % tr.n]; k ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }
  c.strokeStyle = "#5fe6ff"; c.lineWidth = 34 / esc / 6; c.stroke();
  for (const r of st) {
    if (m && r.id === m.id) continue; const gh = race.ghosts.get(r.id); if (!gh) continue;
    c.beginPath(); c.arc(gh.x, gh.y, 7 / esc / 1.4, 0, 7); c.fillStyle = r.p.color; c.fill(); c.lineWidth = 2 / esc; c.strokeStyle = "#000"; c.stroke();
  }
  c.restore();
  // eu: a setinha no meio, e o "N" do norte girando na borda
  c.save(); c.translate(S / 2, S / 2 + S * 0.12); c.beginPath(); c.moveTo(0, -11); c.lineTo(8, 8); c.lineTo(0, 4); c.lineTo(-8, 8); c.closePath(); c.fillStyle = "#fff"; c.fill(); c.lineWidth = 2; c.strokeStyle = "#0b1016"; c.stroke(); c.restore();
  const na = -eu.a - Math.PI / 2 - Math.PI / 2, nr = S / 2 - 16;
  c.font = "800 15px Figtree, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#fff"; c.fillText("N", S / 2 + Math.cos(na) * nr, S / 2 + Math.sin(na) * nr);
  c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 3, 0, 7); c.lineWidth = 3; c.strokeStyle = "#ffffff55"; c.stroke();
}
// velocímetro em arco: risquinhos, a faixa vermelha no fim, o arco aceso até a velocidade, a marcha e o número grande
function velocimetro(v) {
  const cv = $("velo"), c = cv.getContext("2d"), W = cv.width, H = cv.height, kmh = Math.round(v * 0.75);
  const marcha = race.marcha || 1, manual = E.S.config.cambio === "manual", chave = kmh + ":" + marcha; if (race.hudVelo === chave) return; race.hudVelo = chave;
  const cx = W * 0.56, cy = H * 0.5, r = H * 0.4, a0 = Math.PI * 0.8, a1 = Math.PI * 2.2, max = 300, ang = (k) => a0 + (a1 - a0) * Math.min(1, k / max);
  c.clearRect(0, 0, W, H); c.lineCap = "round";
  c.beginPath(); c.arc(cx, cy, r, a0, a1); c.lineWidth = 3; c.strokeStyle = "#ffffff55"; c.stroke();
  c.beginPath(); c.arc(cx, cy, r, ang(250), a1); c.lineWidth = 6; c.strokeStyle = "#ff3d6e"; c.stroke();
  for (let k = 0; k <= max; k += 20) { const a = ang(k), big = k % 60 === 0; c.beginPath(); c.moveTo(cx + Math.cos(a) * (r - (big ? 14 : 8)), cy + Math.sin(a) * (r - (big ? 14 : 8))); c.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2)); c.lineWidth = big ? 3 : 1.5; c.strokeStyle = "#ffffffcc"; c.stroke(); }
  c.beginPath(); c.arc(cx, cy, r - 6, a0, ang(kmh)); c.lineWidth = 5; c.strokeStyle = kmh > 250 ? "#ff3d6e" : "#ffffff"; c.shadowColor = "#fff"; c.shadowBlur = 8; c.stroke(); c.shadowBlur = 0;
  // a marcha num círculo no meio do arco, e embaixo (no vão do arco) a velocidade grande e "KM/H"
  c.beginPath(); c.arc(cx, cy - 4, 17, 0, 7); c.fillStyle = "#0b1016aa"; c.fill(); c.lineWidth = 2; c.strokeStyle = "#ffffff99"; c.stroke();
  c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "middle"; c.font = "800 20px Figtree, sans-serif"; c.fillText(String(marcha), cx, cy - 3);
  if (manual) { c.font = "800 9px Figtree, sans-serif"; c.fillStyle = "#ffd23f"; c.fillText("MANUAL", cx, cy + 22); }
  { const rpm = Math.min(1, race.rpm || 0); for (let k = 0; k < 10; k++) { c.fillStyle = k / 10 < rpm ? (k < 6 ? "#2ecc71" : k < 8 ? "#ff3d6e" : "#5fc8ff") : "#ffffff22"; c.fillRect(cx - 50 + k * 10.4, cy - r - 12, 8, 5); } } // luzes de troca, como no volante do F1
  c.shadowColor = "#000a"; c.shadowBlur = 6;
  c.fillStyle = "#fff"; c.font = "500 58px Figtree, sans-serif"; c.textBaseline = "alphabetic"; c.fillText(String(kmh), cx, cy + r + 18);
  c.font = "800 12px Figtree, sans-serif"; c.fillStyle = "#ffffffcc"; c.textAlign = "left"; c.fillText("KM/H", cx + r * 0.78, cy + r + 16); c.shadowBlur = 0;
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
