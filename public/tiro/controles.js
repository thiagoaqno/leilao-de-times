// Tiro da Galera — controles (teclado, mouse, toque), troca de arma, mira, recarga e o tiro.
import { E, AR, WP, $, store, clamp, lerp, toast, socket, myP, act, canvas, G, keys, now, TOUCH, locked } from "./estado.js";
import { Sound } from "./sons.js";
import { BASE_FOV, ZOOM_FOV } from "./cena.js";
import { VM, vFlash } from "./bonecos.js";
import { tracer, impact } from "./efeitos.js";
import { leaveGame } from "./jogo.js";
import { renderTab, renderPauseSb } from "./hud.js";
import { botHit } from "./bots.js";

// ======================================================================
// Controles
// ======================================================================
canvas.addEventListener("click", () => { if (G.active && !locked() && $("over").classList.contains("hidden")) canvas.requestPointerLock?.(); });
$("btnResume").onclick = () => { Sound.unlock(); if (TOUCH) { E.touchPlay = true; $("pause").classList.add("hidden"); Toque.fullscreen(); } else canvas.requestPointerLock?.(); };
// botões na tela (celular)
if (TOUCH) Toque.setup({
  look: (dx, dy) => {
    const me = G.me; if (!locked() || !me || !me.alive) return;
    const zoomK = me.scope ? Math.tan((ZOOM_FOV[me.scope] * Math.PI) / 360) / Math.tan((BASE_FOV * Math.PI) / 360) : 1, k = 0.0028 * E.sens * zoomK;
    me.yaw -= dx * k; me.pitch = clamp(me.pitch - dy * k, -1.55, 1.55);
  },
  buttons: [
    { icon: "🔁", label: "arma", down: () => { const me = G.me; if (!me) return; const order = [me.prim, "deagle", "faca"], next = order[(order.indexOf(me.w) + 1) % 3]; const code = next === "deagle" ? "Digit2" : next === "faca" ? "Digit3" : "Digit1"; Toque.press(code); Toque.release(code); } },
    { icon: "↻", label: "recarregar", code: "KeyR" },
    { icon: "🎯", label: "mira", down: () => { if (!locked() || !G.me) return; if (WP[G.me.w].melee) { if (canFire()) tryFire(true); } else toggleScope(); } },
    { icon: "🚶", label: "devagar", code: "ShiftLeft" },
    { icon: "⬆", label: "pular", code: "Space" },
    { icon: "🔫", label: "atirar", big: true, down: () => { if (!locked() || !G.me) return; E.mouseDown = true; if (!G.me.alive) G.specIdx++; }, up: () => { E.mouseDown = false; E.triggerUp = true; } },
  ],
  top: [
    { icon: "⏸", down: () => { E.touchPlay = false; keys.clear(); E.mouseDown = false; $("pause").classList.remove("hidden"); renderPauseSb(); } },
    { icon: "📋", code: "Tab" },
  ],
});
$("btnLeave").onclick = leaveGame;
document.addEventListener("pointerlockchange", () => {
  const on = locked();
  $("pause").classList.toggle("hidden", on || !G.active || !$("over").classList.contains("hidden"));
  if (!on) { keys.clear(); E.mouseDown = false; renderPauseSb(); }
});
$("sens").value = E.sens; $("sensV").textContent = E.sens.toFixed(2);
$("sens").oninput = (e) => { E.sens = +e.target.value; $("sensV").textContent = E.sens.toFixed(2); store.set("tiro:sens", E.sens); };
$("vol").value = Sound.vol; $("volV").textContent = Math.round(Sound.vol * 100) + "%";
$("vol").oninput = (e) => { Sound.setVol(+e.target.value); $("volV").textContent = Math.round(Sound.vol * 100) + "%"; };
document.addEventListener("mousemove", (e) => {
  if (!locked() || !G.me) return;
  const me = G.me, zoomK = me.scope ? Math.tan((ZOOM_FOV[me.scope] * Math.PI) / 360) / Math.tan((BASE_FOV * Math.PI) / 360) : 1;
  const k = E.sens * 0.022 * (Math.PI / 180) * zoomK; // mesma conta do CS: sensibilidade x 0,022 grau por contagem do mouse
  if (me.alive) { me.yaw -= e.movementX * k; me.pitch = clamp(me.pitch - e.movementY * k, -1.55, 1.55); }
});
document.addEventListener("mousedown", (e) => {
  if (!locked() || !G.me) return;
  if (e.button === 0) { E.mouseDown = true; if (!G.me.alive) G.specIdx++; }
  if (e.button === 2) { if (WP[G.me.w].melee) { if (canFire()) tryFire(true); } else toggleScope(); }
});
document.addEventListener("mouseup", (e) => { if (e.button === 0) { E.mouseDown = false; E.triggerUp = true; } });
document.addEventListener("contextmenu", (e) => { if (G.active) e.preventDefault(); });
document.addEventListener("keydown", (e) => {
  if (!G.active) return;
  if (e.code === "Tab") { e.preventDefault(); $("tab").classList.remove("hidden"); renderTab(); return; }
  if (!locked()) return;
  if (e.code === "Space" && !e.repeat) E.jumpQueued = true;
  if (e.code === "KeyR") reload();
  // 1 principal (no começo da rodada, apertar de novo troca AK <-> AWP), 2 Deagle, 3 faca, Q a anterior
  if (e.code === "Digit1") { if (G.me.w === G.me.prim && canSwitch()) setPrimary(G.me.prim === "ak" ? "awp" : "ak"); else switchTo(G.me.prim); }
  if (e.code === "Digit2") switchTo("deagle");
  if (e.code === "Digit3") switchTo("faca");
  if (e.code === "KeyQ") switchTo(G.me.last);
  keys.add(e.code);
});
document.addEventListener("keyup", (e) => { keys.delete(e.code); if (e.code === "Tab") $("tab").classList.add("hidden"); });
window.addEventListener("blur", () => { keys.clear(); E.mouseDown = false; });
document.querySelectorAll("#pick button").forEach((b) => b.addEventListener("click", () => setPrimary(b.dataset.w)));

function canSwitch() { return G.mode === "treino" || (E.S && E.S.round && E.S.round.phase === "freeze"); }
// troca a arma na mão (a munição de cada uma fica guardada)
function switchTo(w) {
  const me = G.me; if (!me || !me.alive || !w || me.w === w || ![me.prim, "deagle", "faca"].includes(w)) return;
  if (me.w && !WP[me.w].melee) me.inv[me.w] = { ammo: me.ammo, reserve: me.reserve };
  const a = me.inv[w] || { ammo: 0, reserve: 0 };
  Object.assign(me, { last: me.w || me.last, w, ammo: a.ammo, reserve: a.reserve, reloadUntil: 0, scope: 0, deployAt: now(), nextShot: 0 });
  me.rec.n = 0; me.rec.px = 0; me.rec.py = 0;
  setVM(w);
  if (G.mode === "online") socket.emit("cur", { w });
}
// arma principal (AK ou AWP): só no começo da rodada (ou no treino)
export function setPrimary(w, tell = true) {
  const me = G.me; if (!me || !me.alive || !["ak", "awp"].includes(w)) return;
  if (tell && !canSwitch()) return toast("Só dá para trocar a arma principal no começo da rodada.", 1800);
  delete me.inv[me.prim]; me.prim = w; me.inv[w] = { ammo: WP[w].mag, reserve: WP[w].reserve };
  if (me.w === "ak" || me.w === "awp") { me.w = null; switchTo(w); } else switchTo(w);
  store.set("tiro:w", w);
  if (tell && G.mode === "online") act("weapon", { w });
}
export function setVM(w) { for (const k of Object.keys(VM)) VM[k].visible = k === w; }
function toggleScope() {
  const me = G.me; if (!me || !me.alive || me.w !== "awp" || me.reloadUntil) return;
  me.scope = (me.scope + 1) % 3; me.scopeAt = now(); Sound.zoom();
}
function reload() {
  const me = G.me, W = WP[me.w]; if (W.melee || !me.alive || me.reloadUntil || me.ammo >= W.mag || me.reserve <= 0) return;
  me.reloadUntil = now() + W.reload; me.scope = 0; Sound.reload(me.w);
  if (G.mode === "online") socket.emit("reload");
}

// ---------- tiro ----------
export function spreadOf(me) {
  const W = WP[me.w], sp = Math.hypot(me.vx, me.vz), mv = clamp((sp - W.speed * 0.34) / (W.speed * 0.66), 0, 1), air = me.onGround ? 0 : 1;
  if (me.w === "awp") {
    const scoped = me.scope ? clamp((now() - me.scopeAt) / 0.25, 0, 1) : 0; // a mira leva um instante para "assentar"
    return lerp(0.085, 0.0004, scoped) + mv * 0.12 + air * 0.35;
  }
  if (me.w === "faca") return 0;
  if (me.w === "deagle") return 0.002 + mv * 0.07 + air * 0.18 + Math.min(me.rec.n * 0.011, 0.05); // atirar rápido demais espalha
  // AK: o 1º tiro é certeiro; numa rajada, a bala abre aos poucos
  return 0.003 + mv * 0.09 + air * 0.2 + Math.min(Math.max(0, me.rec.n - 1) * 0.0025, 0.03);
}
// recuo da AK (quanto a mira sobe a cada tiro, em radianos): sobe suave nos primeiros e depois só "dança" um pouco
const AK_UP = [0, 0.004, 0.0055, 0.0065, 0.007, 0.007, 0.0065, 0.006, 0.005, 0.004];
export function canFire() {
  if (G.mode === "treino") return true;
  return E.S && E.S.phase === "play" && E.S.round && E.S.round.phase === "live";
}
export function tryFire(heavy = false) {
  const me = G.me, W = WP[me.w], t = now();
  if (W.melee) return knifeAttack(heavy, t);
  if (me.reloadUntil || t < me.nextShot || t - me.deployAt < 0.35) return;
  if (!W.auto && !E.triggerUp) return;
  if (me.ammo <= 0) { if (E.triggerUp) { Sound.dry(); reload(); } E.triggerUp = false; return; }
  E.triggerUp = false; me.nextShot = t + W.interval; me.ammo--; G.shots++;
  // recuo da AK: sobe nos primeiros tiros e depois puxa para os lados
  const rec = me.rec;
  if (me.w === "ak") {
    // rec.n volta aos poucos (fracionado) quando você para de atirar: o índice da tabela tem que ser inteiro,
    // senão AK_UP[2.4] = undefined deixava a mira NaN e a tela ficava toda preta até trocar de arma
    const i = Math.floor(rec.n);
    rec.py += i < AK_UP.length ? AK_UP[i] : 0.0012;
    rec.px += rec.n >= 8 ? Math.sin(rec.n * 0.55) * 0.0035 : (Math.random() - 0.5) * 0.0012;
    rec.n++; rec.last = t; me.kick = 0.7;
  } else if (me.w === "deagle") { rec.py += 0.022; rec.px += (Math.random() - 0.5) * 0.006; rec.n++; rec.last = t; me.punch = 0.035; me.kick = 1.4; }
  else { me.punch = 0.05; me.kick = 1.6; }
  const s = spreadOf(me), a = Math.random() * Math.PI * 2, r = s * Math.sqrt(Math.random());
  const yaw = me.yaw + rec.px + Math.cos(a) * r, pitch = me.pitch + rec.py + Math.sin(a) * r;
  const d = AR.dirOf(yaw, pitch), eye = [me.x, me.y + AR.EYE, me.z];
  // efeitos na hora (o servidor confirma o acerto)
  const targets = [...G.remotes.values()].filter((o) => o.alive && o.team && (!myP() || o.team !== myP().team || G.mode === "treino")).map((o) => ({ id: o.id, x: o.x, y: o.y, z: o.z }));
  const hit = AR.hitScan(eye, d, targets);
  const right = [Math.cos(me.yaw), 0, -Math.sin(me.yaw)], fwd = AR.dirOf(me.yaw, me.pitch);
  const muzzle = [eye[0] + right[0] * 0.14 + fwd[0] * 0.7, eye[1] - 0.1 + fwd[1] * 0.7, eye[2] + right[2] * 0.14 + fwd[2] * 0.7];
  tracer(muzzle, hit.point, me.w);
  if (!hit.id) impact(hit.point, hit.normal);
  muzzleFlash();
  Sound.shot(me.w, 1, 0);
  if (me.w === "awp") me.scope = 0; // a AWP sai da mira depois do tiro
  if (G.mode === "treino") { if (hit.id) botHit(G.bots.find((b) => b.id === hit.id), hit.part, hit.point); }
  else socket.emit("fire", { o: eye, d });
  if (me.ammo === 0 && me.reserve > 0) setTimeout(() => G.me === me && reload(), W.auto ? 250 : 900);
}
// faca: golpe rápido (esquerdo) ou forte (direito), alcance curto. Pelas costas o dano é bem maior.
function knifeAttack(heavy, t) {
  const me = G.me, W = WP.faca;
  if (t < me.nextShot || t - me.deployAt < 0.3) return;
  me.nextShot = t + (heavy ? W.heavyInterval : W.interval); me.swingT = t; me.heavy = heavy;
  const d = AR.dirOf(me.yaw, me.pitch), eye = [me.x, me.y + AR.EYE, me.z];
  const targets = [...G.remotes.values()].filter((o) => o.alive && o.team && (!myP() || o.team !== myP().team || G.mode === "treino")).map((o) => ({ id: o.id, x: o.x, y: o.y, z: o.z }));
  const hit = AR.hitScan(eye, d, targets, W.reach);
  Sound.shot("faca");
  if (hit.id) Sound.stab(); else if (hit.t < W.reach) impact(hit.point, hit.normal);
  if (G.mode === "treino") { if (hit.id) { const b = G.bots.find((x) => x.id === hit.id); const back = Math.cos(b.yaw - me.yaw) > 0.4; botHit(b, hit.part, hit.point, back ? (heavy ? 180 : 90) : AR.damage("faca", hit.part, heavy)); } }
  else socket.emit("fire", { o: eye, d, heavy });
}
export let flashUntil = 0;
function muzzleFlash() { flashUntil = now() + 0.045; vFlash.material.rotation = Math.random() * Math.PI; }
