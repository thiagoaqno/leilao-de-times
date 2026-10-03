// Pelada da Galera — controles: teclado e mouse (remapeáveis, teclas.js), controle (Gamepad API, no estilo FIFA),
// toque no celular, a mira, o chute/passe (doKick) e o "pedir a bola".
import { E, C, $, store, clamp, FL, toast, socket, relogio, sNow, myP, canvas, G, VIEWS, VIEW_NAMES, ctrlYaw, keys, now, TOUCH, locked, ballS, local, isCar, offline, PAD, myAttackTeam, trocaLigada } from "./estado.js";
import { Sound } from "./sons.js";
import { leaveGame } from "./jogo.js";
import { flashMsg, scoreTable, renderPauseSb } from "./hud.js";
import { trocaNoPasse, trocarJogador, pedidoBots } from "./bots.js";
import { traduzir } from "./teclas.js";

// ======================================================================
// Controles
// ======================================================================
canvas.addEventListener("click", () => { if (G.active && !locked() && $("over").classList.contains("hidden")) canvas.requestPointerLock?.(); });
$("btnResume").onclick = () => { Sound.unlock(); if (TOUCH) { setupTouch(); E.touchPlay = true; $("pause").classList.add("hidden"); Toque.fullscreen(); } else canvas.requestPointerLock?.(); };
// botões na tela (celular): a pé, chute/passe/enfiada/cavadinha (segure para carregar a força), pique, carrinho e
// pulo; de carro, turbo, pulo (duas vezes: mortal) e derrapagem. O joystick anda (ou acelera e vira).
function setupTouch() {
  const pause = { icon: "⏸", down: () => { E.touchPlay = false; keys.clear(); E.charge = null; $("pause").classList.remove("hidden"); renderPauseSb(); } };
  if (isCar()) Toque.setup({
    buttons: [{ icon: "💨", label: "derrapar", code: "KeyQ" }, { icon: "⬆", label: "pular", code: "Space" }, { icon: "🔥", label: "turbo", code: "ShiftLeft", big: true }],
    top: [pause, { icon: "🎥", code: "KeyC" }, { icon: "📺", code: "KeyV" }, { icon: "📋", code: "Tab" }],
  });
  else Toque.setup({
    look: (dx, dy) => { if (!locked() || G.view === "tv") return; const k = 0.0028 * E.sens; G.camYaw -= dx * k; G.camPitch = clamp(G.camPitch - dy * k, ...pitchRange()); },
    buttons: [
      { icon: "🌙", label: "cavadinha", code: "KeyZ" }, { icon: "🎯", label: "enfiada", code: "KeyL" }, { icon: "🦵", label: "carrinho", code: "Wheel" },
      { icon: "↗", label: "cruzar", code: "KeyU" }, ...(trocaLigada() ? [{ icon: "🔁", label: "trocar", code: "KeyT" }] : []),
      { icon: "✋", label: "segurar", code: "KeyF" }, { icon: "🏃", label: "pique", code: "ShiftLeft" }, { icon: "⬆", label: "pular", code: "Space" },
      { icon: "👟", label: "passe", code: "KeyJ" }, { icon: "⚽", label: "chute", code: "KeyK", big: true },
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
// teclas de fábrica de cada chute: K chute, J passe, L bola enfiada, Z cavadinha (o mouse chega aqui já traduzido)
const KICK_KEY = { KeyK: "chute", KeyJ: "passe", KeyL: "enfiada", KeyZ: "cavadinha" };
// a tecla (ou botão) de verdade vira a tecla de fábrica da ação escolhida (teclas.js). Teclado e mouse de verdade
// passam pela tradução; o controle e os botões de toque já mandam a tecla de fábrica. No carro, nada muda.
const codigo = (e, fisico) => (e.isTrusted && !isCar() ? traduzir(fisico) : fisico);
document.addEventListener("mousedown", (e) => {
  if (!locked() || !G.meModel || isCar()) return;
  const code = codigo(e, "Mouse" + e.button); if (!code) return;
  e.preventDefault(); apertar(code, false);
});
document.addEventListener("mouseup", (e) => { const code = codigo(e, "Mouse" + e.button); if (code) soltar(code); });
document.addEventListener("wheel", (e) => {
  if (!locked() || !G.meModel || isCar()) return;
  e.preventDefault();
  const code = codigo(e, "Wheel"); if (!code || keys.has(code)) return;
  apertar(code, false); setTimeout(() => soltar(code), 90); // a rodinha é um toque: aperta e solta
}, { passive: false });
// soltou o botão: o passe segurado por 1 s (ou mais) vira passe longo
function releaseKick() { const c = E.charge; E.charge = null; if (!c) return; doKick(c.kind, powerOf(c)); }

// ======================================================================
// Controle (Xbox, PlayStation e parecidos, pela Gamepad API do navegador), no estilo FIFA. Os botões apertam as
// mesmas teclas do teclado (o jogo nem percebe a diferença); o analógico esquerdo também dá a direção exata (em vez
// das 8 direções do WASD) e a velocidade (empurrou pouco, anda devagar). Start pausa e volta.
// ======================================================================
// botões no layout padrão: 0 A/✕, 1 B/○, 2 X/□, 3 Y/△, 4 LB, 5 RB, 6 LT, 7 RT, 8 Select, 9 Start, 12-15 direcional
// a pé, no layout clássico do FIFA (Xbox): A passe (toque; segurado 1 s: longo; sem a bola: pede a bola), B chute,
// X cruzamento alto (sem a bola: carrinho), Y bola enfiada, LB cavadinha, RB colocado (RB + B chute colocado, RB + A
// passe colocado), RT pique, LT segurar, R3 (apertar o analógico direito) pula/cabeceia (goleiro: R3 + lado se joga),
// ↑ troca de jogador (se a troca estiver ligada), View câmera, Menu pausa
const PAD_PE = { 0: "KeyJ", 1: "KeyK", 2: "acaoX", 3: "KeyL", 4: "KeyZ", 5: "KeyR", 6: "KeyF", 7: "ShiftLeft", 11: "Space", 8: "KeyC", 12: "KeyT", 13: "Tab", 14: "KeyQ", 15: "KeyE", 10: "KeyV", 9: "start" };
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
      if (v && G.meModel && !isCar() && !temBola()) { padTecla("Wheel", "b" + i, true); padTecla("Wheel", "b" + i, false); return; }
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
  const team = myAttackTeam() || "A", gx = (team === "B" ? -1 : 1) * G.F.L;
  const b = bolaAqui(), a = aimYaw();
  const meio = Math.atan2(-(gx - b.x), -(0 - b.z)), d = Math.atan2(Math.sin(a - meio), Math.cos(a - meio));
  return Math.sign(d || 1) * Math.max(0.55, Math.min(1, Math.abs(d) * 4)); // mirou à esquerda do meio: curva para a direita
}
// força pela barra (0 a 1): o passe enche em 1 s (cheio = passe longo); os outros, em ~0,9 s
export const PASSE_LONGO_S = 1;
export const powerOf = (c) => clamp((now() - c.t0) / (c.kind === "passe" ? PASSE_LONGO_S : c.kind === "enfiada" ? 0.8 : 0.9), 0, 1);
// que passe sai: passe segurado 1 s é o longo; o resto é o curto (toque); a bola enfiada é em profundidade
export const tipoPasse = (kind, power) => (kind === "passe" ? (power >= 1 ? "longo" : "curto") : kind === "enfiada" ? "profundidade" : null);
// a bola como eu vejo agora (offline, a bola local; online, a do meu pé ou a prevista)
export const bolaAqui = () => (offline() ? local.ball : ballS.mine || ballS.view);
// "estou com a bola": conduzindo (dono) ou com ela no alcance do pé/cabeça. Sem a bola: carrinho, e o passe pede a bola.
export function souDono() { if (offline()) return !!local.ball && local.ball.dono === "eu"; return !!ballS.mine || !!(ballS.snap && ballS.snap.dono === "eu"); }
export function temBola() { const b = bolaAqui(); return !!G.me && !!b && (souDono() || !!C.canKick({ ...G.me, id: "eu" }, b, 0.1)); }
const modificador = () => keys.has("KeyR"); // RB no controle: chute/passe colocado
function chuteColocado(kind) { if (E.charge) return; doKick(kind, 1, { colocado: true }); } // sai na hora, sem barra
document.addEventListener("contextmenu", (e) => { if (G.active) e.preventDefault(); });
// teclado: a tecla de verdade é traduzida (teclas.js) e vira a tecla de fábrica da ação
document.addEventListener("keydown", (e) => {
  if (!G.active) return;
  const code = codigo(e, e.code);
  if (code === null) { if (locked()) e.preventDefault(); return; } // tecla tirada de uma ação: não faz nada
  if (locked() && (code !== e.code || code.startsWith("Arrow") || code === "Space")) e.preventDefault();
  apertar(code, e.repeat);
});
document.addEventListener("keyup", (e) => { const code = codigo(e, e.code); if (code) soltar(code); });
// apertou uma ação (código de fábrica)
function apertar(code, repeat) {
  if (code === "Tab") { $("tab").classList.remove("hidden"); $("tab").innerHTML = scoreTable(); return; }
  if (!locked()) return;
  if (code === "Space" && !repeat) E.jumpQueued = true;
  if (code === "KeyC" && !repeat) {
    if (isCar()) G.ballCam = !G.ballCam;
    else { G.view = VIEWS[(VIEWS.indexOf(G.view) + 1) % VIEWS.length]; store.set("pelada:view", G.view); G.camPitch = clamp(G.camPitch, ...pitchRange()); flashMsg("", VIEW_NAMES[G.view], 1200); }
  }
  if (code === "KeyV" && !repeat && isCar()) G.tv = !G.tv;
  if (code === "Wheel" && G.meModel && !isCar() && !souDono()) E.wheelQueued = true; // carrinho (só sem a bola)
  if (KICK_KEY[code] && !repeat && !E.charge && !isCar() && G.meModel) {
    const kind = KICK_KEY[code];
    if (kind === "passe" && !temBola() && !segurandoNaMao()) pedirBola(); // sem a bola: pede (como no Pro Clubs)
    else if (modificador() && (kind === "chute" || kind === "passe")) chuteColocado(kind); // R/RB + chute/passe: colocado, na hora
    else E.charge = { kind, t0: now(), src: code };
  }
  if (code === "KeyU" && !repeat && !E.charge && !isCar() && G.meModel) doKick("cruzamento", 0); // cruzamento alto
  if ((code === "KeyQ" || code === "KeyE") && !repeat && !E.charge && !isCar() && souDono()) E.drible = code === "KeyQ" ? "esq" : "dir"; // arrastada (no chute, Q/E é efeito)
  if (code === "KeyV" && !repeat && !isCar() && souDono()) E.drible = "corte"; // corte seco
  if (code === "KeyT" && !repeat && !isCar() && trocaLigada() && !souDono()) { // troca de jogador (só se estiver ligada)
    if (G.mode === "bots") trocarJogador(); else if (G.mode === "online") socket.emit("trocar");
  }
  keys.add(code);
}
function soltar(code) {
  keys.delete(code);
  if (code === "Tab") $("tab").classList.add("hidden");
  if (E.charge && E.charge.src === code) releaseKick();
}
window.addEventListener("blur", () => { keys.clear(); E.charge = null; });
// goleiro com a bola na mão (online)
const segurandoNaMao = () => !!(ballS.snap && E.ME && ballS.snap.holder === E.ME.id);

// ---------- pedir a bola (como no Pro Clubs): o passe sem a bola chama quem está com ela ----------
// Contra bots, o bot do meu time que estiver com a bola toca para mim logo em seguida (bots.js); online, o servidor
// avisa os bots do amistoso (peladaBots.js) e todo mundo vê a mãozinha 🙋 em cima de quem pediu (FL.pede).
export const PEDE_T = 1.8;
export function pedirBola() {
  const t = now(); if (t - (G.me.pedeT0 || -9) < 0.7) return;
  G.me.pedeT0 = t; G.me.pedeT = PEDE_T;
  flashMsg("", "🙋 Pediu a bola!", 900);
  Sound.pede?.();
  if (G.mode === "bots") pedidoBots(t);
  else if (G.mode === "online") socket.emit("pedir");
}

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
// tem adversário colado (a menos de 1,6 m)? O passe sai com mais erro
function rivalColado(p) {
  if (G.mode === "bots") return G.bots.some((x) => x.team === "B" && x.downT <= 0 && Math.hypot(x.x - p.x, x.z - p.z) < 1.6);
  if (G.mode !== "online") return false;
  const mine = myP(); if (!mine) return false;
  return [...G.remotes.values()].some((r) => r.team && r.team !== mine.team && Math.hypot((r.px ?? r.x) - p.x, (r.pz ?? r.z) - p.z) < 1.6);
}
// o passe planejado (curto, longo ou enfiada) para a mira e a força de agora (também desenha o anel na mira)
export function planoPasse(me, yaw, tipo, power, colocado = false, rnd = Math.random) {
  const forca = colocado ? 1 : tipo === "profundidade" ? power * 0.6 : 0; // o curto e o longo saem na medida; a enfiada fica mais forte segurando
  return C.planejarPasse(G.F, me, yaw, mates(), tipo, forca, rivalColado(me), myAttackTeam() === "B" ? -1 : 1, rnd, { assist: tipo !== "longo" });
}
// efeito: segurar Q (curva para a esquerda) ou E (para a direita) na hora do chute
export const curveNow = () => (keys.has("KeyE") ? 1 : 0) - (keys.has("KeyQ") ? 1 : 0);
// o = { colocado }: chute colocado (força máxima + curva para o gol) ou passe colocado (tenso, no mais alinhado)
// Conduzindo com toques, a bola pode estar um pouco à frente do pé: o chute fica "na fila" por até meio segundo e
// sai quando o jogador alcança a bola (tentarFila, a cada quadro).
export function doKick(kind, power, o = {}) {
  const me = G.me, t = now();
  if (!canPlay() || t - me.lastKick < C.KICK_CD || me.downT > 0) return;
  const ball = bolaAqui();
  const body = { ...me, id: E.ME && G.mode === "online" ? E.ME.id : "eu" };
  const how = C.canKick(body, ball, offline() ? 0 : 0.2);
  if (!how && souDono() && !o.daFila) { G.filaChute = { kind, power, o: { ...o, daFila: true }, ate: t + 0.5 }; return; }
  me.kickT = t; me.lastKick = t; me.st.kickT = t; // a perna balança mesmo se errar
  if (!how) return;
  G.filaChute = null;
  let yaw = aimYaw(), opt = null, receptor = null; // receptor: o companheiro que o passe procurou
  // passe: toque = curto (assistido), segurado 1 s = longo (pelo alto), bola enfiada = em profundidade. O plano dá a
  // direção, a velocidade, a altura e quem recebe (a bola "trava" perto dele).
  const tipo = how !== "mao" && (o.colocado && kind === "passe" ? "curto" : tipoPasse(kind, power)); // passe colocado: curto e tenso
  if (tipo) {
    const pl = planoPasse(me, yaw, tipo, power, !!o.colocado);
    yaw = pl.yaw; kind = tipo; opt = { vel: pl.vel * (o.colocado ? 1.08 : 1), elev: pl.elev, alvo: pl.alvo }; receptor = pl.alvo;
    G.passeVoo = pl.alvo ? { alvo: pl.alvo, ate: t + 3 } : null;
  } else if (how === "mao" && kind === "enfiada") kind = "passe"; // goleiro: arremesso
  if (kind === "cruzamento" && how === "pe") { const r = C.assistCross(me, yaw, myAttackTeam() || "A", mates(), G.F); yaw = r.yaw; power = r.power; }
  else if (kind === "cruzamento") { kind = "cavadinha"; power = 0.7; } // de cabeça ou com a mão: vai alto
  const curve = opt ? 0 : o.colocado && kind === "chute" && how === "pe" ? curvaColocada() : curveNow();
  if (kind === "chute" && how === "pe" && !isCar()) yaw = C.assistShot(me, yaw, myAttackTeam() || "A", G.F, curve, ball); // assistência estilo FIFA (último terço)
  me.facing = yaw;
  Sound.kick(opt ? 0.35 : power);
  if (offline()) { C.kick(local.ball, { ...me, id: "eu" }, kind, power, yaw, 0, curve, G.F, opt); trocaNoPasse(receptor); G.tKicks = (G.tKicks || 0) + 1; if (G.falta && G.falta.state === "mirar") { G.falta.state = "voando"; G.falta.t0 = t; G.falta.touched = null; } return; }
  const mine = ballS.mine; ballS.mine = null;
  socket.emit("kick", { kind, power, yaw, curve, ...(opt || {}), ...(receptor ? { rec: receptor } : {}), ...(mine ? { bola: [mine.x, mine.y, mine.z] } : {}) }); // conduzindo: chuta a bola que eu vejo
  // previsão: a bola já sai do meu pé aqui; o servidor confirma em seguida
  const b = { ...(mine || ballS.view) }; C.kick(b, body, kind, power, yaw, 0.2, curve, G.F, opt);
  ballS.snap = { t: sNow(), x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, sp: b.sp, wx: b.wx || 0, wy: b.wy || 0, wz: b.wz || 0, holder: null }; ballS.off = { x: 0, y: 0, z: 0 };
  ballS.ignoreUntil = performance.now() + relogio.rtt + 60;
}
// o chute na fila sai assim que a bola estiver no alcance (ou é esquecido depois de meio segundo / sem a bola)
export function tentarFila() {
  const f = G.filaChute; if (!f) return;
  if (now() > f.ate || !souDono()) { G.filaChute = null; return; }
  const b = bolaAqui(); if (b && C.canKick({ ...G.me, id: "eu" }, b, offline() ? 0 : 0.2)) doKick(f.kind, f.power, f.o);
}
