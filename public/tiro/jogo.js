// Tiro da Galera — o jogo no navegador: menus, 3D (Three.js), movimento, armas, sons e rede.
// O movimento do meu boneco roda aqui (física em arena.js) e vai para o servidor ~30x por segundo.
// Os outros aparecem 100 ms "no passado", interpolados entre as posições recebidas (fica liso mesmo com ping).
// O servidor confere os tiros voltando no tempo esses mesmos 100 ms + meio ping, então o que você vê é o que vale.
// Este é o módulo de entrada: começa e termina o jogo, roda o laço principal e a câmera. O resto fica nos outros
// módulos desta pasta (estado, rede, menus, sons, cena, bonecos, efeitos, bots, controles e hud).
import { E, AR, WP, $, h, store, setH, clamp, socket, myP, G, keys, now, TOUCH, locked } from "./estado.js";
import { syncFromState, updateRemotes } from "./rede.js";
import { show, renderLobby } from "./menus.js";
import { Sound } from "./sons.js";
import { renderer, scene, cam, BASE_FOV, ZOOM_FOV } from "./cena.js";
import { vScene, vCam, vm, VM, vFlash, flashLight } from "./bonecos.js";
import { rags, updateRags, clearRags, updateFx } from "./efeitos.js";
import { hud } from "./hud.js";
import { spawnBots, updateBots, botHit } from "./bots.js";
import { setVM, canFire, tryFire, flashUntil } from "./controles.js";

export function newMe(spawn, prim) {
  const W = WP[prim];
  return { x: spawn[0], y: spawn[1], z: spawn[2], vx: 0, vy: 0, vz: 0, onGround: true, yaw: spawn[3], pitch: 0, alive: true, hp: 100, w: prim, prim, last: "deagle",
    inv: { deagle: { ammo: WP.deagle.mag, reserve: WP.deagle.reserve } }, swingT: 0, heavy: false,
    ammo: W.mag, reserve: W.reserve, reloadUntil: 0, nextShot: 0, scope: 0, scopeAt: 0, rec: { n: 0, px: 0, py: 0, last: 0 }, punch: 0, kick: 0, deployAt: performance.now() / 1000, stepT: 0, wasGround: true };
}
export function startGame(mode) {
  if (G.active && G.mode === mode) return;
  stopGame();
  G.active = true; G.mode = mode; G.roundKey = null; G.spec = null; G.kills = 0; G.hs = 0; G.shots = 0; G.feed = [];
  show("game"); resize();
  const spawn = AR.SPAWNS.A[0];
  G.me = newMe(spawn, (myP() && myP().w) || store.get("tiro:w") || "ak");
  if (mode === "treino") spawnBots();
  else syncFromState(null, E.S);
  setVM(G.me.w);
  $("pause").classList.remove("hidden"); E.touchPlay = false;
  requestAnimationFrame(loop);
}
export function stopGame() {
  if (!G.active) return;
  G.active = false;
  for (const r of G.remotes.values()) scene.remove(r.model);
  G.remotes.clear(); G.bots = []; clearRags();
  if (document.pointerLockElement) document.exitPointerLock();
  E.touchPlay = false; if (TOUCH) Toque.show(false);
  $("over").classList.add("hidden"); $("pause").classList.add("hidden"); $("tab").classList.add("hidden");
}
export function leaveGame() {
  if (G.mode === "treino") { stopGame(); if (E.S) { show(E.S.phase === "lobby" ? "lobby" : "game"); if (E.S.phase !== "lobby") startGame("online"); else renderLobby(); } else show("home"); return; }
  if (confirm("Sair da arena? A partida continua sem você.")) { socket.disconnect(); E.urlCode = null; E.ME = null; E.S = null; stopGame(); history.replaceState(null, "", "/tiro/"); $("roomTag").classList.add("hidden"); show("home"); socket.connect(); }
}

// ======================================================================
// Laço principal
// ======================================================================
function resize() {
  const w = innerWidth, hh = innerHeight;
  renderer.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix(); vCam.aspect = w / hh; vCam.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
let lastT = now();
function loop() {
  if (!G.active) return;
  requestAnimationFrame(loop);
  if (TOUCH) { const want = E.touchPlay && $("over").classList.contains("hidden"); if (Toque.on !== want) Toque.show(want); }
  const t = now(), dt = Math.min(0.05, t - lastT); lastT = t;
  try { frame(dt, t); } catch (e) { console.error(e); }
}
function frame(dt, t) {
  const me = G.me, r = E.S && E.S.round, online = G.mode === "online";
  const mine = online ? myP() : { team: "A" };
  const frozen = online && r && r.phase === "freeze";
  // recarga terminou?
  if (me.reloadUntil && t >= me.reloadUntil) { const W = WP[me.w], n = Math.min(W.mag - me.ammo, me.reserve); me.ammo += n; me.reserve -= n; me.reloadUntil = 0; }
  // movimento
  if (me.alive) {
    const W = WP[me.w], f = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0), s = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    let wx = -Math.sin(me.yaw) * f + Math.cos(me.yaw) * s, wz = -Math.cos(me.yaw) * f - Math.sin(me.yaw) * s;
    const len = Math.hypot(wx, wz); if (len > 0) { wx /= len; wz /= len; }
    const walk = keys.has("ShiftLeft") || keys.has("ShiftRight");
    let speed = (me.w === "awp" && me.scope ? W.scopedSpeed : W.speed) * (walk ? 0.52 : 1);
    if (frozen || !len) speed = 0;
    const jump = E.jumpQueued && !frozen; E.jumpQueued = false;
    if (frozen) { me.vx = 0; me.vz = 0; }
    AR.move(me, { x: wx, z: wz, speed, jump }, dt);
    if (me.onGround && !me.wasGround) Sound.land();
    me.wasGround = me.onGround;
    // passos (andando devagar não faz barulho)
    const hs = Math.hypot(me.vx, me.vz);
    if (me.onGround && hs > 3 && !walk) { me.stepT -= dt; if (me.stepT <= 0) { me.stepT = 0.36; Sound.step(0.35); } }
    if (E.mouseDown && locked() && canFire()) tryFire();
  }
  // o recuo volta ao normal quando você para de atirar
  const rec = me.rec;
  if (t - rec.last > WP[me.w].interval * 1.3) { const k = Math.exp(-dt * 13); rec.px *= k; rec.py *= k; rec.n = Math.max(0, rec.n - dt * 22); }
  me.punch *= Math.exp(-dt * 10); me.kick *= Math.exp(-dt * 14);
  // envia minha posição
  if (online && me.alive && mine && mine.team && t - G.lastSend > 1 / 30) {
    G.lastSend = t;
    const q = (v) => Math.round(v * 1000) / 1000;
    socket.volatile.emit("st", { x: q(me.x), y: q(me.y), z: q(me.z), yaw: q(me.yaw), pitch: q(me.pitch), sc: me.scope, g: me.onGround ? 1 : 0, wk: keys.has("ShiftLeft") ? 1 : 0 });
  }
  if (G.mode === "treino") updateBots(dt, t);
  updateRemotes(dt, t);
  updateRags(dt);
  updateCamera(dt, t);
  updateFx(dt);
  // clarão
  const fl = t < flashUntil;
  flashLight.intensity = fl ? 30 : 0;
  if (fl) { const d = AR.dirOf(me.yaw, me.pitch); flashLight.position.set(me.x + d[0] * 1.2, me.y + AR.EYE + d[1] * 1.2, me.z + d[2] * 1.2); }
  hud(t);
  renderer.clear(); renderer.render(scene, cam);
  if (vm.visible) { renderer.clearDepth(); renderer.render(vScene, vCam); }
}

function updateCamera(dt, t) {
  const me = G.me;
  G.spec = null;
  let x, y, z, yaw, pitch, w = me.w, showVM = true;
  if (!Number.isFinite(me.rec.px) || !Number.isFinite(me.rec.py)) { me.rec.px = 0; me.rec.py = 0; me.rec.n = 0; } // proteção: mira nunca NaN
  if (!Number.isFinite(me.punch)) me.punch = 0;
  if (me.alive) {
    x = me.x; y = me.y + AR.EYE; z = me.z; yaw = me.yaw + me.rec.px * 0.5; pitch = me.pitch + me.rec.py * 0.5 + me.punch;
  } else {
    // morto ou no banco: assiste alguém vivo (time primeiro). Clique para trocar.
    const mine = myP();
    const alive = [...G.remotes.values()].filter((o) => o.alive).sort((a, b) => (mine && b.team === mine.team) - (mine && a.team === mine.team));
    if (alive.length) {
      const o = alive[G.specIdx % alive.length]; G.spec = o;
      x = o.x; y = o.y + AR.EYE; z = o.z; yaw = o.yaw; pitch = o.pitch; w = o.w;
      setH("hSpec", `Assistindo <b style="color:${o.team === "A" ? "#8dbbff" : "#ffb27a"}">${h(o.name)}</b> · clique para trocar`); $("hSpec").classList.remove("hidden");
    } else { x = 0; y = 16; z = 26; yaw = 0; pitch = -0.55; showVM = false; $("hSpec").classList.add("hidden"); }
  }
  if (me.alive) $("hSpec").classList.add("hidden");
  cam.position.set(x, y, z); cam.rotation.set(pitch, yaw, 0);
  // zoom da AWP
  const scoped = me.alive && me.w === "awp" && me.scope > 0;
  const fov = scoped ? ZOOM_FOV[me.scope] : BASE_FOV;
  if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
  $("scope").classList.toggle("hidden", !scoped);
  vm.visible = showVM && !scoped && (me.alive || !!G.spec);
  setVM(w);
  // arma na mão: balanço ao andar, coice e recarga
  const sp = me.alive ? Math.hypot(me.vx, me.vz) : 0, bob = me.alive && me.onGround ? sp / 5.5 : 0;
  G.bobT = (G.bobT || 0) + dt * sp * 1.5;
  const rl = me.reloadUntil ? 1 - (me.reloadUntil - t) / WP[me.w].reload : 0, rdip = me.reloadUntil ? Math.sin(Math.PI * clamp(rl, 0, 1)) : 0;
  const dep = clamp((t - me.deployAt) / 0.35, 0, 1), depOff = (1 - dep) * (1 - dep);
  const base = { awp: [0.2, -0.26, -0.6], deagle: [0.16, -0.2, -0.42], faca: [0.2, -0.22, -0.4] }[w] || [0.2, -0.25, -0.58];
  const sw = w === "faca" && me.swingT ? clamp((t - me.swingT) / (me.heavy ? 0.45 : 0.25), 0, 1) : 1, slash = Math.sin(sw * Math.PI);
  vm.position.set(base[0] + Math.sin(G.bobT) * 0.012 * bob - slash * 0.12, base[1] + Math.abs(Math.cos(G.bobT)) * 0.012 * bob - rdip * 0.12 - depOff * 0.3 + slash * 0.04, base[2] + me.kick * 0.045 - slash * 0.12);
  vm.rotation.set(me.kick * 0.06 - rdip * 0.6 + depOff * -0.6 - slash * (me.heavy ? 0.9 : 0.3), 0.03 + slash * 0.9, rdip * 0.3 + slash * (me.heavy ? -0.4 : 0.6));
  // clarão na ponta da arma
  const vis = VM[w];
  vFlash.visible = t < flashUntil && me.alive;
  if (vFlash.visible) { vis.updateMatrixWorld(true); const p = vis.userData.muzzle.clone(); vis.localToWorld(p); vFlash.position.copy(p); vFlash.scale.setScalar(w === "awp" ? 0.35 : 0.22); }
}

if (location.hash === "#debug") window.__tiro = { scene, G, cam, botHit, rags }; // para testes
