// Pelada da Galera — controles: teclado, mouse, controle (Gamepad API, no estilo FIFA), toque no celular, a mira
// e o chute/passe (doKick).
import { E, C, $, store, clamp, FL, toast, socket, relogio, sNow, myP, canvas, G, VIEWS, VIEW_NAMES, ctrlYaw, keys, now, TOUCH, locked, ballS, local, isCar, offline, PAD, myAttackTeam } from "./estado.js";
import { Sound } from "./sons.js";
import { leaveGame } from "./jogo.js";
import { flashMsg, scoreTable, renderPauseSb } from "./hud.js";
import { superArmado, iniciarBarra, pararBarra } from "./strikers.js";
import { trocaNoPasse, trocarJogador } from "./bots.js";

// ======================================================================
// Controles
// ======================================================================
canvas.addEventListener("click", () => { if (G.active && !locked() && $("over").classList.contains("hidden")) canvas.requestPointerLock?.(); });
$("btnResume").onclick = () => { Sound.unlock(); if (TOUCH) { setupTouch(); E.touchPlay = true; $("pause").classList.add("hidden"); Toque.fullscreen(); } else canvas.requestPointerLock?.(); };
// botões na tela (celular): a pé, chute/passe/cavadinha (segure para carregar a força), pique, carrinho e pulo;
// de carro, turbo, pulo (duas vezes: mortal) e derrapagem. O joystick anda (ou acelera e vira).
function setupTouch() {
  const pause = { icon: "⏸", down: () => { E.touchPlay = false; keys.clear(); E.charge = null; $("pause").classList.remove("hidden"); renderPauseSb(); } };
  if (isCar()) Toque.setup({
    buttons: [{ icon: "💨", label: "derrapar", code: "KeyQ" }, { icon: "⬆", label: "pular", code: "Space" }, { icon: "🔥", label: "turbo", code: "ShiftLeft", big: true }],
    top: [pause, { icon: "🎥", code: "KeyC" }, { icon: "📺", code: "KeyV" }, { icon: "📋", code: "Tab" }],
  });
  else Toque.setup({
    look: (dx, dy) => { if (!locked() || G.view === "tv") return; const k = 0.0028 * E.sens; G.camYaw -= dx * k; G.camPitch = clamp(G.camPitch - dy * k, ...pitchRange()); },
    buttons: [
      ...(G.F.strikers ? [{ icon: "🎁", label: "item", code: "KeyG" }] : []), { icon: "🌙", label: G.F.strikers ? "profundo" : "cavadinha", code: "KeyL" }, { icon: "🎯", label: G.F.strikers ? "curto" : "passe", code: "KeyJ" }, { icon: "🦵", label: "carrinho", down: () => { if (locked() && G.meModel && !souDono()) E.wheelQueued = true; } },
      { icon: "↗", label: G.F.strikers ? "longo" : "cruzar", code: "KeyU" }, ...(G.mode === "bots" ? [{ icon: "🔁", label: "trocar", code: "KeyT" }] : []),
      { icon: "✋", label: "segurar", code: "KeyF" }, { icon: "🏃", label: "pique", code: "ShiftLeft" }, { icon: "⬆", label: "pular", code: "Space" }, { icon: "⚽", label: "chute", code: "KeyK", big: true },
    ],
    top: [pause, { icon: "🎥", code: "KeyC" }, { icon: "📋", code: "Tab" }],
  });
}
$("btnLeave").onclick = leaveGame;
document.addEventListener("pointerlockchange", () => {
  const on = locked();
  $("pause").classList.toggle("hidden", on || !G.active || !$("over").classList.contains("hidden"));
  if (!on) { keys.clear(); E.charge = null; renderPauseSb(); }
});
$("sens").value = E.sens; $("sensV").textContent = E.sens.toFixed(2);
$("sens").oninput = (e) => { E.sens = +e.target.value; $("sensV").textContent = E.sens.toFixed(2); store.set("pelada:sens", E.sens); };
$("vol").value = Sound.vol; $("volV").textContent = Math.round(Sound.vol * 100) + "%";
$("vol").oninput = (e) => { Sound.setVol(+e.target.value); $("volV").textContent = Math.round(Sound.vol * 100) + "%"; };
document.addEventListener("mousemove", (e) => {
  if (!locked() || isCar() || G.view === "tv") return;
  const k = E.sens * 0.022 * (Math.PI / 180);
  G.camYaw -= e.movementX * k; G.camPitch = clamp(G.camPitch - e.movementY * k, ...pitchRange());
});
const KICK_BTN = { 0: "chute", 2: "passe", 1: "cavadinha" }, KICK_KEY = { KeyK: "chute", KeyJ: "passe", KeyL: "cavadinha" };
document.addEventListener("mousedown", (e) => { if (!locked() || !G.meModel || isCar()) return; if (KICK_BTN[e.button] && !E.charge) { e.preventDefault(); if (modificador() && KICK_BTN[e.button] !== "cavadinha") return chuteColocado(KICK_BTN[e.button]); E.charge = { kind: KICK_BTN[e.button], t0: now(), src: "m" + e.button }; } });
document.addEventListener("mouseup", (e) => { if (E.charge && E.charge.src === "m" + e.button) releaseKick(); });
document.addEventListener("wheel", (e) => { if (locked() && G.meModel && !isCar()) { e.preventDefault(); if (!souDono()) E.wheelQueued = true; } }, { passive: false });
function releaseKick() { const armado = superArmado(), c = E.charge; E.charge = null; if (!c) return; if (armado) iniciarBarra(); else doKick(c.kind, powerOf(c)); } // Strikers: chute armado vira o Super Chute

// ======================================================================
// Controle (Xbox, PlayStation e parecidos, pela Gamepad API do navegador), no estilo FIFA. Os botões apertam as
// mesmas teclas do teclado (o jogo nem percebe a diferença); o analógico esquerdo também dá a direção exata (em vez
// das 8 direções do WASD) e a velocidade (empurrou pouco, anda devagar). Start pausa e volta.
// ======================================================================
// botões no layout padrão: 0 A/✕, 1 B/○, 2 X/□, 3 Y/△, 4 LB, 5 RB, 6 LT, 7 RT, 8 Select, 9 Start, 12-15 direcional
// a pé, no layout clássico do FIFA (Xbox): A passe, B chute, X cruzamento alto (sem a bola: carrinho), Y cavadinha,
// RB colocado (RB + B chute colocado, RB + A passe colocado), LB troca de jogador, RT pique, LT segurar,
// R3 (apertar o analógico direito) pula/cabeceia (goleiro: R3 + lado se joga), View câmera, Menu pausa
const PAD_PE = { 0: "KeyJ", 1: "KeyK", 2: "acaoX", 3: "KeyL", 4: "KeyT", 5: "KeyR", 6: "KeyF", 7: "ShiftLeft", 11: "Space", 8: "KeyC", 12: "KeyG", 13: "Tab", 9: "start" }; // ↑ (12): item do Strikers
const PAD_CARRO = { 0: "Space", 1: "ShiftLeft", 2: "KeyQ", 3: "KeyC", 7: "KeyW", 6: "KeyS", 8: "KeyV", 13: "Tab", 9: "start" };
// a mesma tecla pode vir de duas fontes (RT e o analógico apertam W no carro): só solta quando as duas soltarem
function padTecla(code, fonte, down) {
  const set = PAD.fontes.get(code) || new Set(), antes = set.size > 0;
  if (down) set.add(fonte); else set.delete(fonte);
  PAD.fontes.set(code, set);
  if (antes !== set.size > 0) document.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }));
}
export function soltarPad() { for (const [code, set] of PAD.fontes) if (set.size) { set.clear(); document.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true })); } }
export function padPausa(jogar) {
  if (!G.active) return;
  if (jogar) { PAD.play = true; Sound.unlock(); $("pause").classList.add("hidden"); if (document.pointerLockElement) document.exitPointerLock(); }
  else { PAD.play = false; soltarPad(); keys.clear(); E.charge = null; $("pause").classList.remove("hidden"); renderPauseSb(); }
}
export function lerPad(dt) {
  const gp = [...(navigator.getGamepads?.() || [])].find((g) => g && g.connected);
  if (!gp) { if (PAD.on) { soltarPad(); if (PAD.play) padPausa(false); } PAD.on = false; return; }
  if (!PAD.on) { PAD.on = true; toast("🎮 Controle conectado! Aperte Start (ou A na pausa) para jogar."); }
  const dz = (v) => (Math.abs(v || 0) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82); // zona morta (o analógico nunca fica no zero exato)
  PAD.lx = dz(gp.axes[0]); PAD.ly = dz(gp.axes[1]); PAD.rx = dz(gp.axes[2]); PAD.ry = dz(gp.axes[3]);
  const map = isCar() ? PAD_CARRO : PAD_PE;
  gp.buttons.forEach((b, i) => {
    const v = b.pressed || b.value > 0.4, era = !!PAD.prev[i]; PAD.prev[i] = v;
    if (v === era) return;
    const m = map[i]; if (!m) return;
    if (m === "start") { if (v) padPausa(!PAD.play); return; }
    if (!PAD.play) { if (v && i === 0 && G.active && $("over").classList.contains("hidden")) padPausa(true); return; } // pausado: A volta
    if (m === "acaoX") { // X: com a bola (ou ela no pé), cruzamento alto; sem a bola, carrinho (como no FIFA)
      if (v && G.meModel && !isCar() && !temBola()) { E.wheelQueued = true; return; }
      padTecla("KeyU", "b" + i, v); return;
    }
    padTecla(m, "b" + i, v);
  });
  if (!PAD.play || !G.active) return;
  // analógico esquerdo também aperta W/A/S/D (o carro, o mergulho do goleiro e quem mais lê as teclas)
  const t = 0.45;
  padTecla("KeyW", "ax", PAD.ly < -t); padTecla("KeyS", "ax", PAD.ly > t); padTecla("KeyA", "ax", PAD.lx < -t); padTecla("KeyD", "ax", PAD.lx > t);
  // analógico direito: câmera (a pé)
  if (!isCar() && G.view !== "tv" && (PAD.rx || PAD.ry)) { G.camYaw -= PAD.rx * 2.6 * dt * (E.sens / 1.6); G.camPitch = clamp(G.camPitch - PAD.ry * 1.8 * dt, ...pitchRange()); }
}
// chute colocado (RB/R + chute): sai na hora, com força máxima e efeito automático: a bola faz a curva de volta para o
// meio do gol (o "chute colocado" do FIFA)
function curvaColocada() {
  const me = G.me, team = myAttackTeam() || "A", gx = (team === "B" ? -1 : 1) * G.F.L;
  const b = bolaAqui(), a = aimYaw();
  const meio = Math.atan2(-(gx - b.x), -(0 - b.z)), d = Math.atan2(Math.sin(a - meio), Math.cos(a - meio));
  return Math.sign(d || 1) * Math.max(0.55, Math.min(1, Math.abs(d) * 4)); // mirou à esquerda do meio: curva para a direita
}
export const powerOf = (c) => clamp((now() - c.t0) / (c.kind === "passe" || (G.F.strikers && c.kind !== "chute") ? 0.8 : 0.9), 0, 1);
// a bola como eu vejo agora (offline, a bola local; online, a do meu pé ou a prevista)
export const bolaAqui = () => (offline() ? local.ball : ballS.mine || ballS.view);
// "estou com a bola": conduzindo (dono) ou com ela no alcance do pé/cabeça. Sem a bola: B dá carrinho e LB troca de jogador.
export function souDono() { if (offline()) return !!local.ball && local.ball.dono === "eu"; return !!ballS.mine || !!(ballS.snap && ballS.snap.dono === "eu"); }
export function temBola() { const b = bolaAqui(); return !!G.me && !!b && (souDono() || !!C.canKick({ ...G.me, id: "eu" }, b, 0.1)); }
const modificador = () => keys.has("KeyR"); // RB no controle: chute/passe colocado
function chuteColocado(kind) { if (E.charge) return; doKick(kind, 1, { colocado: true }); } // sai na hora, sem barra
document.addEventListener("contextmenu", (e) => { if (G.active) e.preventDefault(); });
document.addEventListener("keydown", (e) => {
  if (!G.active) return;
  if (e.code === "Tab") { e.preventDefault(); $("tab").classList.remove("hidden"); $("tab").innerHTML = scoreTable(); return; }
  if (!locked()) return;
  if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
  if (e.code === "Space" && !e.repeat) E.jumpQueued = true;
  if (e.code === "KeyC" && !e.repeat) {
    if (isCar()) G.ballCam = !G.ballCam;
    else { G.view = VIEWS[(VIEWS.indexOf(G.view) + 1) % VIEWS.length]; store.set("pelada:view", G.view); G.camPitch = clamp(G.camPitch, ...pitchRange()); flashMsg("", VIEW_NAMES[G.view], 1200); }
  }
  if (e.code === "KeyV" && !e.repeat && isCar()) G.tv = !G.tv;
  if (e.code === "KeyG" && !e.repeat && !isCar()) E.itemQueued = true; // Strikers: usa o item
  if (G.superBarra && KICK_KEY[e.code] === "chute" && !e.repeat) { pararBarra(); keys.add(e.code); return; } // Super Chute: para o ponteiro
  if (KICK_KEY[e.code] && !e.repeat && !E.charge && !isCar()) {
    if (modificador() && KICK_KEY[e.code] !== "cavadinha") chuteColocado(KICK_KEY[e.code]); // R/LB + chute/passe: colocado, na hora
    else E.charge = { kind: KICK_KEY[e.code], t0: now(), src: e.code };
  }
  if (e.code === "KeyU" && !e.repeat && !E.charge && !isCar() && G.meModel) { // cruzamento alto (Strikers: passe longo, com barra de força)
    if (G.F.strikers) E.charge = { kind: "cruzamento", t0: now(), src: e.code }; else doKick("cruzamento", 0);
  }
  if (e.code === "KeyT" && !e.repeat && !isCar() && G.mode === "bots" && !souDono()) trocarJogador(); // T/LB: troca de jogador
  if (e.code === "KeyT" && !e.repeat && !isCar() && G.mode === "online" && E.S && E.S.config.bots && !souDono()) socket.emit("trocar"); // amistoso: o servidor troca
  keys.add(e.code);
});
document.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (e.code === "Tab") $("tab").classList.add("hidden");
  if (E.charge && E.charge.src === e.code) releaseKick();
});
window.addEventListener("blur", () => { keys.clear(); E.charge = null; });

function canPlay() { if (G.mode === "treino") return true; if (G.mode === "bots") return !!G.bm && G.bm.phase === "live"; const m = E.S && E.S.match; return E.S && E.S.phase === "play" && m && m.phase === "live"; }
// direção da bola: as setas (em relação à câmera); sem seta, para onde o jogador está virado
// quanto dá para olhar para baixo e para cima: em primeira pessoa dá para olhar o chão (e a bola no pé)
const pitchRange = () => (G.view === "primeira" ? [-1.35, 0.9] : [-0.45, 0.7]);
export function aimYaw() {
  let f = (keys.has("ArrowUp") ? 1 : 0) - (keys.has("ArrowDown") ? 1 : 0), s = (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
  if (!f && !s && PAD.play && Math.hypot(PAD.lx, PAD.ly) > 0.3) { f = -PAD.ly; s = PAD.lx; } // controle: mira com o analógico esquerdo (como no FIFA)
  if (!f && !s) return G.me.facing;
  const yaw = ctrlYaw(), wx = -Math.sin(yaw) * f + Math.cos(yaw) * s, wz = -Math.cos(yaw) * f - Math.sin(yaw) * s;
  return Math.atan2(-wx, -wz);
}
export function mates() {
  if (G.mode === "bots") return G.bots.filter((x) => x.team === "A" && x.downT <= 0 && x.slideT <= 0).map((x) => ({ id: x.id, x: x.x, z: x.z, vx: x.vx, vz: x.vz }));
  if (G.mode !== "online") return [];
  const mine = myP(); if (!mine) return [];
  return [...G.remotes.values()].filter((r) => r.team === mine.team && !(r.f & (FL.slide | FL.down))).map((r) => ({ id: r.id, x: r.px ?? r.x, z: r.pz ?? r.z, vx: r.pvx ?? r.vx ?? 0, vz: r.pvz ?? r.vz ?? 0 })); // onde estão agora
}
// Strikers: qual tecla vira qual passe (J/A curto, U/X longo, L/Y profundidade)
export const PASSE_TIPO = { passe: "curto", cruzamento: "longo", cavadinha: "profundidade" };
// tem adversário colado (a menos de 1,6 m)? O passe sai com mais erro
function rivalColado(p) {
  if (G.mode === "bots") return G.bots.some((x) => x.team === "B" && x.downT <= 0 && Math.hypot(x.x - p.x, x.z - p.z) < 1.6);
  if (G.mode !== "online") return false;
  const mine = myP(); if (!mine) return false;
  return [...G.remotes.values()].some((r) => r.team && r.team !== mine.team && Math.hypot((r.px ?? r.x) - p.x, (r.pz ?? r.z) - p.z) < 1.6);
}
// efeito: segurar Q (curva para a esquerda) ou E (para a direita) na hora do chute
export const curveNow = () => (keys.has("KeyE") ? 1 : 0) - (keys.has("KeyQ") ? 1 : 0);
// o = { colocado }: chute colocado (força máxima + curva para o gol) ou passe colocado (tenso, no mais alinhado)
function doKick(kind, power, o = {}) {
  const me = G.me, t = now();
  if (!canPlay() || t - me.lastKick < C.KICK_CD || me.downT > 0) return;
  const ball = bolaAqui();
  const body = { ...me, id: E.ME && G.mode === "online" ? E.ME.id : "eu" };
  const how = C.canKick(body, ball, offline() ? 0 : 0.2);
  me.kickT = t; me.lastKick = t; me.st.kickT = t; // a perna balança mesmo se errar
  if (!how) return;
  let yaw = aimYaw(), opt = null, receptor = null; // receptor: o companheiro que o passe procurou (para a troca automática)
  // Strikers: J curto, U longo (cavado), L profundidade; o plano dá direção, velocidade, altura e quem recebe
  const tipoS = G.F.strikers && how !== "mao" && PASSE_TIPO[kind];
  if (tipoS) {
    const pl = C.planejarPasse(G.F, me, yaw, mates(), tipoS, o.colocado ? 1 : power, rivalColado(me), myAttackTeam() === "B" ? -1 : 1);
    yaw = pl.yaw; kind = tipoS; opt = { vel: pl.vel, elev: pl.elev, alvo: pl.alvo }; receptor = pl.alvo;
    G.passeVoo = pl.alvo ? { alvo: pl.alvo, ate: t + 3 } : null;
  }
  if (kind === "passe" && how !== "mao") { const r = C.assistPass(me, yaw, mates(), power, !!o.colocado, G.F); yaw = r.yaw; power = r.power; if (r.kind) kind = r.kind; receptor = r.alvo ? r.alvo.id : null; } // longe: lançamento pelo alto
  if (kind === "cruzamento" && how === "pe") { const r = C.assistCross(me, yaw, myAttackTeam() || "A", mates(), G.F); yaw = r.yaw; power = r.power; }
  else if (kind === "cruzamento") { kind = "cavadinha"; power = 0.7; } // de cabeça ou com a mão: vai alto
  const curve = opt ? 0 : o.colocado && kind === "chute" && how === "pe" ? curvaColocada() : curveNow();
  if (kind === "chute" && how === "pe" && !isCar()) yaw = C.assistShot(me, yaw, myAttackTeam() || "A", G.F, curve, ball); // assistência estilo FIFA (último terço)
  me.facing = yaw;
  Sound.kick(power);
  if (offline()) { C.kick(local.ball, { ...me, id: "eu" }, kind, power, yaw, 0, curve, G.F, opt); trocaNoPasse(receptor); G.tKicks = (G.tKicks || 0) + 1; if (G.falta && G.falta.state === "mirar") { G.falta.state = "voando"; G.falta.t0 = t; G.falta.touched = null; } return; }
  const mine = ballS.mine; ballS.mine = null;
  socket.emit("kick", { kind, power, yaw, curve, ...(opt || {}), ...(receptor ? { rec: receptor } : {}), ...(mine ? { bola: [mine.x, mine.y, mine.z] } : {}) }); // conduzindo: chuta a bola que eu vejo
  // previsão: a bola já sai do meu pé aqui; o servidor confirma em seguida
  const b = { ...(mine || ballS.view) }; C.kick(b, body, kind, power, yaw, 0.2, curve, G.F, opt);
  ballS.snap = { t: sNow(), x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, sp: b.sp, wx: b.wx || 0, wy: b.wy || 0, wz: b.wz || 0, holder: null }; ballS.off = { x: 0, y: 0, z: 0 };
  ballS.ignoreUntil = performance.now() + relogio.rtt + 60;
}
