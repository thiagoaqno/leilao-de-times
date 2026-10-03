// Tiro da Galera — o que fica por cima do jogo: abates, mensagens, marcador de acerto, placar e fim de jogo.
import { E, WP, $, h, setH, TEAM, sNow, myP, P, act, G, now } from "./estado.js";
import { Sound } from "./sons.js";
import { cam } from "./cena.js";
import { leaveGame } from "./jogo.js";
import { spreadOf } from "./controles.js";

// ---------- abates (canto de cima) ----------
export function pushFeed(k) {
  const by = G.mode === "treino" ? { name: k.byName, team: "A" } : P(k.by), to = G.mode === "treino" ? { name: k.toName, team: "B" } : P(k.to);
  if (!by || !to) return;
  G.feed.push({ at: now(), html: `<span class="${by.team}">${h(by.name)}</span><span class="wx">${WP[k.w].name}${k.head ? " 🎯" : ""}</span><span class="${to.team}">${h(to.name)}</span>`, mine: E.ME && (k.by === E.ME.id || k.to === E.ME.id) || G.mode === "treino" });
  if (G.feed.length > 5) G.feed.shift();
}
let msgT = 0;
export function flashMsg(big, small = "", ms = 2500, color = "#fff") { setH("hMsg", `<span style="color:${color}">${h(big)}</span>${small ? `<small>${h(small)}</small>` : ""}`); msgT = now() + ms / 1000; }

let hitT = 0;
export function hitMarker(kill) { const e = $("hitm"); e.classList.toggle("kill", !!kill); e.style.opacity = 1; hitT = now() + 0.18; }
export function hurt() { $("dmg").style.transition = "none"; $("dmg").style.opacity = 0.85; requestAnimationFrame(() => { $("dmg").style.transition = "opacity .5s"; $("dmg").style.opacity = 0; }); Sound.hurt(); }

// ======================================================================
// HUD
// ======================================================================
const fmtT = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
export function hud(t) {
  const me = G.me, W = WP[me.w], online = G.mode === "online", r = E.S && E.S.round;
  // vida e munição
  const hp = Math.max(0, me.hp);
  setH("hHp", me.alive ? `<span>✚ ${hp}</span><div class="bar"><i style="width:${hp}%"></i></div>` : "");
  $("hHp").classList.toggle("low", hp <= 25);
  setH("hAmmo", !me.alive ? "" : W.melee ? `<div class="n">🔪</div><div class="wn">${W.name} · esquerdo rápido, direito forte</div>`
    : `<div class="n num">${me.reloadUntil ? "…" : me.ammo}<small> / ${me.reserve}</small></div><div class="wn">${me.reloadUntil ? "Recarregando" : W.name}</div>`);
  // placar e relógio
  if (online && r && E.S.phase !== "lobby") {
    const alive = (tm) => E.S.players.filter((p) => p.team === tm).map((p) => `<i class="${p.alive ? "" : "dead"}"></i>`).join("");
    const left = r.phase === "freeze" ? r.freezeUntil - sNow() : r.phase === "live" ? r.endsAt - sNow() : r.nextAt - sNow();
    setH("hTop", `<div class="alive">${alive("A")}</div><div class="sc A">${E.S.score.A}</div><div class="clock num ${r.phase === "live" && left < 10000 ? "hot" : ""}">${r.phase === "freeze" ? "⏳ " : ""}${fmtT(left)}</div><div class="sc B">${E.S.score.B}</div><div class="alive">${alive("B")}</div>`);
    const mp = myP(); $("hPing").textContent = mp && mp.ping != null ? `ping ${mp.ping} ms` : "";
  } else {
    setH("hTop", `<div class="clock" style="font-size:18px">🎯 TREINO · ${G.kills} abate${G.kills === 1 ? "" : "s"}${G.kills ? ` · ${Math.round((100 * G.hs) / G.kills)}% na cabeça` : ""}</div>`);
    $("hPing").textContent = "1 principal (de novo: AK/AWP) · 2 Deagle · 3 faca · Esc = menu";
  }
  // escolher arma no começo da rodada
  const showPick = online && me.alive && r && r.phase === "freeze";
  $("pick").classList.toggle("hidden", !showPick);
  if (showPick) document.querySelectorAll("#pick button").forEach((b) => b.classList.toggle("on", b.dataset.w === me.prim));
  // mensagens
  if (t > msgT) setH("hMsg", online && r && r.phase === "freeze" && me.alive ? `<small>A rodada começa em ${Math.ceil((r.freezeUntil - sNow()) / 1000)}…</small>` : "");
  // abates
  G.feed = G.feed.filter((f) => t - f.at < 7);
  setH("hFeed", G.feed.map((f) => `<div class="${f.mine ? "mine" : ""}">${f.html}</div>`).join(""));
  // mira: abre conforme a bala espalha
  const showCross = me.alive && !(me.w === "awp" && me.scope);
  if (showCross) {
    const s = spreadOf(me), px = Math.min(70, s * (innerHeight / 2) / Math.tan((cam.fov * Math.PI) / 360));
    const gap = Math.round(3 + px), L = 7;
    setH("cross", me.w === "awp" || me.w === "faca" ? `<i class="dot"></i>` : `<i style="left:${gap}px;top:-1px;width:${L}px;height:2px"></i><i style="left:${-gap - L}px;top:-1px;width:${L}px;height:2px"></i><i style="top:${gap}px;left:-1px;height:${L}px;width:2px"></i><i style="top:${-gap - L}px;left:-1px;height:${L}px;width:2px"></i>`);
  } else setH("cross", "");
  if (t > hitT) $("hitm").style.opacity = 0;
}
function scoreTable() {
  if (G.mode === "treino") return `<p>Abates: <b>${G.kills}</b> · Na cabeça: <b>${G.hs}</b> · Tiros: <b>${G.shots}</b></p>`;
  if (!E.S) return "";
  const rows = ["A", "B"].flatMap((tm) => E.S.players.filter((p) => p.team === tm).sort((a, b) => b.kills - a.kills))
    .map((p) => `<tr class="${p.team} ${p.alive ? "" : "dead"} ${E.ME && p.id === E.ME.id ? "me" : ""}"><td>${h(p.name)}</td><td class="n">${p.kills}</td><td class="n">${p.deaths}</td><td class="n">${p.kills ? Math.round((100 * p.hs) / p.kills) + "%" : "—"}</td><td class="n">${p.dmg}</td><td class="n">${p.ping ?? "—"}</td></tr>`).join("");
  return `<div class="row" style="justify-content:space-between;font-family:var(--display);font-size:20px"><span style="color:var(--blue)">Azul ${E.S.score.A}</span><span class="muted" style="font-size:14px;font-family:var(--body)">primeiro a ${E.S.config.rounds}</span><span style="color:var(--orange)">${E.S.score.B} Laranja</span></div>
    <table class="sb"><tr><th>Jogador</th><th class="n">Abates</th><th class="n">Mortes</th><th class="n">Cabeça</th><th class="n">Dano</th><th class="n">Ping</th></tr>${rows}</table>`;
}
export function renderTab() { $("tab").innerHTML = scoreTable(); }
export function renderPauseSb() { $("pauseSb").innerHTML = G.active ? `<div style="margin-top:16px">${scoreTable()}</div>` : ""; $("pauseHint").textContent = G.mode === "treino" ? "Treino: só você vê os alvos." : ""; }
export function showOver() {
  if (document.pointerLockElement) document.exitPointerLock();
  $("pause").classList.add("hidden");
  const w = E.S.winner, mine = myP(), isHost = E.ME && E.S.host === E.ME.id;
  $("overBox").innerHTML = `<h2 style="color:${w === "A" ? "var(--blue)" : "var(--orange)"}">🏆 Time ${TEAM[w]} venceu!</h2>
    <p class="muted" style="margin:0 0 6px">${mine && mine.team ? (mine.team === w ? "Boa! Você ganhou." : "Não foi dessa vez.") : ""}</p>${scoreTable()}
    <div class="row" style="margin-top:12px">${isHost ? `<button class="primary" id="btnAgain">Revanche</button><button id="btnToLobby">Voltar pra sala</button>` : `<span class="muted">Esperando o organizador…</span>`}<button class="ghost" id="btnOut" style="margin-left:auto">Sair</button></div>`;
  $("over").classList.remove("hidden");
  if ($("btnAgain")) $("btnAgain").onclick = () => act("start");
  if ($("btnToLobby")) $("btnToLobby").onclick = () => act("lobby");
  $("btnOut").onclick = leaveGame;
}