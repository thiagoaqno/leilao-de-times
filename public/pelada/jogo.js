// Pelada da Galera — o jogo no navegador: menus, 3D (Three.js), jogador a pé ou carro, bola, sons e rede.
// Eu mexo o meu jogador/carro aqui e mando a posição ~30x por segundo. O servidor manda UM pacote 20x por segundo
// com a bola e todo mundo; os outros aparecem 100 ms "no passado", interpolados. A bola é PREVISTA a partir do último
// pacote (rodando a mesma física de campo.js) e a diferença é corrigida aos poucos.
// Este é o módulo de entrada: começa e termina o jogo, roda o laço principal (frame), mexe o meu jogador e a câmera.
// O resto fica nos outros módulos desta pasta (estado, rede, menus, cena, arenas, bonecos, bola, controles, teclas,
// bots, hud e sons).
import * as THREE from "three";
import { E, C, $, h, store, clamp, lerp, angLerp, FL, BASE, socket, myP, molinhoLigado, G, ctrlYaw, keys, now, TOUCH, locked, ballS, local, isCar, offline, myKit, mySkin, PAD, myAttackTeam, CARRINHO_CD, DRIBLE } from "./estado.js";
import { show, renderLobby } from "./menus.js";
import { syncFromState, updateRemotes } from "./rede.js";
import { makePlayer, mudarSkinJogador, descartarJogador, balaoPede, animate, makeCar, animateCar, carO, poseCar, rags, addRag, updateRags, clearRags } from "./bonecos.js";
import { Sound } from "./sons.js";
import { renderer, scene, cam, ballMesh, aim, passMark, meMark, resize } from "./cena.js";
import { pads, ensureArena, updateGoalSigns } from "./arenas.js";
import { updateBall } from "./bola.js";
import { flashMsg, hud, renderPauseSb } from "./hud.js";
import { soltarPad, padPausa, lerPad, powerOf, bolaAqui, souDono, temBola, aimYaw, curveNow, tipoPasse, planoPasse, tentarFila } from "./controles.js";
import { setupFalta, practiceStep, setupBots, botsStep } from "./bots.js";

export function newMe(spawn) {
  return { x: spawn[0], y: 0, z: spawn[2], vx: 0, vy: 0, vz: 0, onGround: true, facing: spawn[3], yaw: spawn[3], pitch: 0, stamina: 1, sprint: false,
    kickT: 0, lastKick: 0, slideT: 0, slideCd: 0, diveT: 0, downT: 0, jumps: 0, jumpT: 9, flipT: 0, boost: 34, boosting: false, st: {}, up: null, fw: null }; // up/fw: orientação do carro (parede, teto)
}
export function startGame(mode, game, falta = false) {
  if (G.active && G.mode === mode && G.game === game && !!G.falta === falta) return;
  stopGame();
  G.active = true; G.mode = mode; G.game = game; G.F = C.campoDe(game); G.kickoffKey = null; G.feed = [];
  ensureArena(game);
  show("game"); resize();
  const sp = C.spawns(G.F.id, "A", [{}], false)[0];
  G.me = newMe(sp); G.camYaw = sp[3]; G.camPitch = 0.05; G.camCarYaw = sp[3];
  rebuildMyModel();
  if (mode === "treino") {
    local.ball = C.newBall(G.F);
    if (game === "pes") {
      local.ball.x = 3; G.me.x = -2;
      G.keeper = { id: "goleiro", x: G.F.L - 0.6, y: 0, z: 0, vx: 0, vy: 0, vz: 0, onGround: true, holdT: 0, model: makePlayer("laranja", 1, "Goleiro", { gk: true }), st: {} };
      G.keeper.model.rotation.y = Math.PI / 2; scene.add(G.keeper.model);
    } else { local.ball.x = -10; G.me.x = -26; }
    G.tKicks = 0; G.tGoals = 0;
    G.falta = falta ? { n: 0, goals: 0, state: "mirar", t0: 0, wall: [] } : null;
    if (falta) setupFalta();
  } else if (mode === "bots") { local.ball = C.newBall(G.F); setupBots(); }
  else syncFromState(null, E.S);
  $("pause").classList.remove("hidden"); renderPauseSb(); E.touchPlay = false;
  requestAnimationFrame(loop);
}
export function stopGame() {
  if (!G.active) return;
  G.active = false;
  clearRags();
  for (const r of G.remotes.values()) descartarJogador(r.model);
  G.remotes.clear();
  if (G.keeper) { descartarJogador(G.keeper.model); G.keeper = null; }
  if (G.falta) { for (const w of G.falta.wall) descartarJogador(w.model); G.falta = null; }
  for (const bt of G.bots || []) descartarJogador(bt.model);
  for (const k of G.keepers || []) descartarJogador(k.model);
  G.bots = []; G.keepers = []; G.bm = null; meMark.visible = false;
  if (G.meModel) { descartarJogador(G.meModel); G.meModel = null; }
  local.ball = null; ballS.mine = null; E.charge = null; Sound.engine(0, false);
  if (document.pointerLockElement) document.exitPointerLock();
  E.touchPlay = false; if (TOUCH) Toque.show(false); soltarPad(); PAD.play = false;
  $("over").classList.add("hidden"); $("pause").classList.add("hidden"); $("tab").classList.add("hidden");
}
export function rebuildMyModel() {
  if (G.meModel) descartarJogador(G.meModel);
  const m = myP(), playing = offline() || (m && m.team);
  const car = (m && m.car) || store.get("pelada:car") || "godzilla";
  G.meModel = !playing ? null : isCar() ? makeCar(car, myKit(), "") : makePlayer(myKit(), m ? m.num || 10 : 10, "", { gk: !!(m && m.gk), skin: mySkin() });
  G.meKey = `${G.game}|${myKit()}|${m && m.gk}|${car}|${m && m.num}`;
  if (G.meModel) scene.add(G.meModel);
}
export function leaveGame() {
  if (offline()) { stopGame(); if (E.S) { if (E.S.phase !== "lobby") startGame("online", E.S.config.mode); else { show("lobby"); renderLobby(); } } else show("home"); return; }
  if (confirm("Sair da quadra? O jogo continua sem você.")) { socket.disconnect(); E.urlCode = null; E.ME = null; E.S = null; stopGame(); history.replaceState(null, "", BASE); $("roomTag").classList.add("hidden"); show("home"); socket.connect(); }
}

// ======================================================================
// Laço principal
// ======================================================================
let lastT = now();
function loop() {
  if (!G.active) return;
  requestAnimationFrame(loop);
  if (TOUCH) { const want = E.touchPlay && $("over").classList.contains("hidden"); if (Toque.on !== want) Toque.show(want); }
  const t = now(), dt = Math.min(0.05, t - lastT); lastT = t;
  try { lerPad(dt); frame(dt, t); } catch (e) { console.error(e); }
}
function myFlags() {
  const me = G.me; let f = 0;
  if (me.sprint) f |= FL.sprint; if (E.charge) f |= FL.charge; if (me.slideT > 0) f |= FL.slide; if (me.diveT > 0) f |= FL.dive;
  if (me.flipT > 0) f |= FL.flip; if (me.boosting) f |= FL.boost; if (me.segurando) f |= FL.grab;
  if (me.downT > 0) f |= FL.down; if (me.pedeT > 0) f |= FL.pede; // os outros veem a mãozinha de quem pediu a bola
  return f;
}
function frame(dt, t) {
  const online = G.mode === "online", m = E.S && E.S.match;
  const frozen = (online && (!m || m.phase === "ready" || E.S.phase !== "play")) || (G.mode === "bots" && (!G.bm || G.bm.phase !== "live" || !locked()));
  if (G.meModel) (isCar() ? stepCar : stepFoot)(dt, t, frozen);
  // envia minha posição
  if (G.meModel && online && t - G.lastSend > 1 / 30) {
    const me = G.me; G.lastSend = t; const q = (v) => Math.round(v * 100) / 100;
    socket.volatile.emit("st", { x: q(me.x), y: q(me.y), z: q(me.z), vx: q(me.vx), vy: q(me.vy), vz: q(me.vz), yaw: q(isCar() ? me.yaw : me.facing), p: q(me.pitch || 0), f: myFlags(), tq: G.trocaSeq || 0, ...(isCar() && carO(me) ? { o: carO(me).map(q) } : {}),
      ...(ballS.mine ? { bola: [q(ballS.mine.x), q(ballS.mine.y), q(ballS.mine.z), q(ballS.mine.vx), q(ballS.mine.vy), q(ballS.mine.vz)] } : {}) }); // conduzindo: a bola vai junto
  }
  if (G.mode === "treino") practiceStep(dt, t);
  if (G.mode === "bots") botsStep(dt, t);
  meMark.visible = G.mode === "bots" && !!G.meModel && G.view !== "primeira";
  if (meMark.visible) meMark.position.set(G.me.x, G.me.y + 2.55 + Math.sin(t * 5) * 0.06, G.me.z);
  updateRemotes(dt);
  updateRags(dt);
  updateBall(dt);
  updateCamera(dt); if (camHook) camHook(cam);
  hud(t);
  updateGoalSigns();
  renderer.render(scene, cam);
}
// ---------- a pé ----------
function stepFoot(dt, t, frozen) {
  const me = G.me, F = G.F, yaw = ctrlYaw(), mine = myP(), isGK = G.mode === "online" && mine && mine.gk;
  const f = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0), s = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
  let wx = -Math.sin(yaw) * f + Math.cos(yaw) * s, wz = -Math.cos(yaw) * f - Math.sin(yaw) * s;
  let len = Math.hypot(wx, wz); if (len > 0) { wx /= len; wz /= len; }
  const padMag = PAD.play ? Math.min(1, Math.hypot(PAD.lx, PAD.ly)) : 0;
  if (padMag > 0.15) { // controle: a direção exata do analógico (não só as 8 do WASD)
    wx = -Math.sin(yaw) * -PAD.ly + Math.cos(yaw) * PAD.lx; wz = -Math.cos(yaw) * -PAD.ly - Math.sin(yaw) * PAD.lx;
    const l = Math.hypot(wx, wz) || 1; wx /= l; wz /= l; len = 1;
  }
  me.slideT = Math.max(0, me.slideT - dt); me.diveT = Math.max(0, me.diveT - dt); me.downT = Math.max(0, me.downT - dt); me.slideCd = Math.max(0, me.slideCd - dt);
  me.pedeT = Math.max(0, (me.pedeT || 0) - dt);
  if (!frozen) tentarFila(); // chute que esperava a bola (conduzindo com toques)
  const busy = me.slideT > 0 || me.diveT > 0 || me.downT > 0;
  const holding = ballS.snap && E.ME && ballS.snap.holder === E.ME.id;
  // carrinho (rodinha do mouse): desliza para onde está virado e derruba quem estiver na frente
  if (E.wheelQueued && !frozen && !busy && me.onGround && me.slideCd <= 0 && !holding && !souDono()) { // carrinho só sem a bola
    const sp = Math.max(Math.hypot(me.vx, me.vz), 7.5); me.vx = -Math.sin(me.facing) * sp; me.vz = -Math.cos(me.facing) * sp;
    me.slideT = 0.6; me.slideCd = CARRINHO_CD; E.charge = null; Sound.slide();
  }
  E.wheelQueued = false;
  // mergulho do goleiro: Espaço com A/D (ou ←/→) apertado
  const side = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
  if (E.jumpQueued && isGK && side && me.onGround && !busy && !frozen && !holding) {
    const ry = me.facing, rx = Math.cos(ry), rz = -Math.sin(ry);
    me.vx = rx * side * 7.5; me.vz = rz * side * 7.5; me.vy = 3.2; me.onGround = false; me.diveT = 0.75; me.st.diveSide = side; E.jumpQueued = false; Sound.jump();
  }
  // segurar (F, com ou sem bola): perto de um adversário, puxa a camisa dele e ele corre bem mais devagar (55%).
  // Quem segura também fica mais lento (85%) e sem pique. Cada puxão dura no máximo 1,5 s; depois, 2 s de espera.
  me.segCd = Math.max(0, (me.segCd || 0) - dt);
  // F (LT) com a bola: protege (corpo entre a bola e o marcador, anda devagar e toca bem curto); sem a bola, segura
  me.protege = keys.has("KeyF") && souDono() && !busy && !frozen;
  const alvo = keys.has("KeyF") && !me.protege && !busy && !frozen && !E.charge && me.segCd <= 0 ? alvoSegurar(me) : null;
  if (alvo) { me.segT = (me.segT || 0) + dt; if (me.segT > SEGURA_MAX) { me.segCd = 2; me.segT = 0; } }
  else if (me.segT > 0) { me.segCd = Math.max(me.segCd, 0.5); me.segT = 0; }
  const antes = !!me.segurando, antesV = !!me.seguradoPor;
  me.segurando = alvo && me.segT > 0 ? alvo : null;
  me.seguradoPor = busy ? null : quemMeSegura(me); // algum adversário colado com a mão em mim
  if (me.segurando && !antes) { flashMsg("", `✋ Segurando ${h(me.segurando.name)}`, 900); Sound.puxao(); }
  if (me.seguradoPor && !antesV) { flashMsg("", `✋ ${h(me.seguradoPor.name)} está te segurando!`, 1200, "#ffb4a8"); Sound.puxao(); }
  const carregaChute = E.charge && (E.charge.kind === "chute" || E.charge.kind === "cavadinha"); // carregando o chute, anda devagar (o passe não freia)
  const wantSprint = keys.has("ShiftLeft") && len > 0 && !carregaChute && !busy && !me.segurando;
  me.sprint = wantSprint && me.stamina > 0.02;
  me.stamina = clamp(me.stamina + (me.sprint ? -0.24 : 0.14) * dt, 0, 1);
  let speed = carregaChute ? C.CHARGING : me.sprint ? C.SPRINT : C.RUN;
  if (me.seguradoPor) speed *= SEGURADO_VEL; if (me.segurando) speed *= 0.85; if (me.protege) speed *= 0.55;
  driblar(me, wx, wz, len, frozen || busy);
  if (padMag > 0.15 && !me.sprint) speed *= clamp(padMag * 1.5, 0.35, 1); // empurrou pouco o analógico: anda devagar
  if (frozen || !len) speed = 0;
  if (frozen) { me.vx = 0; me.vz = 0; }
  if (busy) { const k = Math.exp(-dt * (me.downT > 0 ? 6 : 1.6)); me.vx *= k; me.vz *= k; }
  const jumping = E.jumpQueued && !frozen && !busy && me.onGround;
  C.movePlayer(me, { x: wx, z: wz, speed, jump: jumping, free: busy, molinho: molinhoLigado(), suave: true }, dt, F);
  if (jumping) Sound.jump();
  E.jumpQueued = false;
  // goleiro com a bola: não sai da área
  if (isGK && holding && !C.inArea(G.F.id, mine.team, me.x, me.z)) { const gx = mine.team === "A" ? -F.L : F.L, d = Math.hypot(me.x - gx, me.z) || 1; me.x = gx + (me.x - gx) / d * (F.areaR - 0.05); me.z = me.z / d * (F.areaR - 0.05); }
  // corpo a corpo: ninguém atravessa ninguém (os outros jogadores, o goleiro robô e a barreira da falta).
  // Os outros chegam atrasados (100 ms de interpolação + metade do ping deles): a conta usa onde cada um está AGORA
  // (rm.px/pz, calculado em updateRemotes), senão dois jogadores cruzando rápido passam um pelo outro.
  const outros = [];
  for (const rm of G.remotes.values()) outros.push({ x: rm.px ?? rm.x, z: rm.pz ?? rm.z, y: rm.y, vx: rm.pvx || 0, vz: rm.pvz || 0, sprint: rm.f & FL.sprint, caido: rm.f & (FL.slide | FL.dive | FL.down) });
  if (G.keeper) { G.keeper.local = true; G.keeper.caido = !!G.keeper.diveT; outros.push(G.keeper); }
  for (const o of G.bots || []) outros.push({ x: o.x, z: o.z, y: o.y, vx: o.vx, vz: o.vz, sprint: o.sprint, caido: o.slideT > 0 || o.downT > 0 });
  for (const k of G.keepers || []) outros.push({ x: k.x, z: k.z, y: k.y, vx: k.vx, vz: k.vz, caido: !!k.diveT });
  if (G.falta) for (const w of G.falta.wall) outros.push({ x: w.x, z: w.z, y: w.y, fixo: true });
  C.corpoACorpo(me, outros, busy);
  // o corpo vira para onde está correndo; carregando o chute, vira para a mira
  const hsp = Math.hypot(me.vx, me.vz);
  // o corpo vira para onde você está mandando (não para onde a velocidade aponta: na meia-volta a velocidade inverte de
  // uma vez e o corpo girava 180° num piscar). O giro tem velocidade máxima: devagar vira rápido; correndo, uma
  // meia-volta leva ~0,4 s (no pique, mais). A bola não vira junto: o próximo toque é que puxa ela para o lado novo.
  if (!busy) {
    const target = carregaChute ? aimYaw() : len > 0 ? Math.atan2(-wx, -wz) : hsp > 0.5 ? Math.atan2(-me.vx, -me.vz) : me.facing;
    const d = Math.atan2(Math.sin(target - me.facing), Math.cos(target - me.facing));
    const maxRate = carregaChute ? 16 : hsp < 1.5 ? 11 : me.sprint ? 6 : 7.5; // rad/s: parado, meia-volta em ~0,3 s
    me.facing += clamp(d * Math.min(1, dt * 14), -maxRate * dt, maxRate * dt);
    me.girando = Math.abs(d) > 1.2; // virada grande: a bola vem para perto do pé
  } else me.girando = false;
  me.st.holding = holding; me.st.segura = !!me.segurando;
  G.meModel.position.set(me.x, me.y, me.z); G.meModel.rotation.y = me.facing;
  balaoPede(G.meModel, me.pedeT > 0 && G.view !== "primeira");
  animate(G.meModel, hsp, dt, me.st, myFlags() | (me.downT > 0 ? FL.down : 0));
}
// ---------- dribles (com a bola no pé) ----------
// arrastada (Q/E, ←/→ no direcional): um tranco curto de lado e a bola vai junto (toque na hora);
// corte seco (V, L3): para, vira para onde você está mandando (ou para trás) e puxa a bola para o lado novo.
function driblar(me, wx, wz, len, parado) {
  const d = E.drible; E.drible = null;
  if (!d || parado || !souDono()) return;
  const fx = -Math.sin(me.facing), fz = -Math.cos(me.facing);
  if (d === "esq" || d === "dir") { // lado direito do corpo: (−fz, fx)
    const s = d === "dir" ? 1 : -1; me.vx += -fz * s * DRIBLE.arrastada; me.vz += fx * s * DRIBLE.arrastada;
  } else if (d === "corte") {
    let nx = -fx, nz = -fz; // sem direção mandada: para trás
    if (len > 0 && wx * fx + wz * fz < 0.5) { nx = wx; nz = wz; }
    me.facing = Math.atan2(-nx, -nz); me.vx = nx * DRIBLE.corteVel; me.vz = nz * DRIBLE.corteVel; me.st.kickT = now();
  }
  me.forcaAte = now() + 0.05; // o próximo toque sai agora, já para o lado novo
}
// segurar: o adversário mais perto (até 1,3 m, em pé). Quem está segurando eu: adversário com a mão (FL.grab)
// a até 1,6 m de mim (um pouco mais de folga por causa do atraso da internet). Posições "de agora" (rm.px/pz).
export const SEGURA_R = 1.3, SEGURA_MAX = 1.5, SEGURADO_VEL = 0.55;
function adversarios() {
  if (G.mode === "bots") return G.bots.filter((x) => x.team === "B" && x.slideT <= 0 && x.downT <= 0);
  const eu = myP(); if (G.mode !== "online" || !eu || !eu.team) return [];
  return [...G.remotes.values()].filter((rm) => rm.team && rm.team !== eu.team && !(rm.f & (FL.slide | FL.dive | FL.down)));
}
function alvoSegurar(me) {
  let best = null, bd = SEGURA_R;
  for (const rm of adversarios()) { const d = Math.hypot((rm.px ?? rm.x) - me.x, (rm.pz ?? rm.z) - me.z); if (d < bd) { bd = d; best = rm; } }
  return best;
}
function quemMeSegura(me) {
  for (const rm of adversarios()) if ((rm.f & FL.grab) && Math.hypot((rm.px ?? rm.x) - me.x, (rm.pz ?? rm.z) - me.z) < SEGURA_R + 0.3) return rm;
  return null;
}
// ---------- de carro ----------
function stepCar(dt, t, frozen) {
  const me = G.me, F = G.F;
  const thr = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
  const steer = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
  const boost = keys.has("ShiftLeft") || keys.has("ShiftRight");
  if (frozen) { me.vx = 0; me.vz = 0; me.vy = Math.min(me.vy, 0); }
  const wasGround = me.onGround, wasBoost = me.boosting;
  me.boosting = boost && me.boost > 0 && !frozen;
  C.moveCar(me, { thr: frozen ? 0 : thr, steer, boost: me.boosting, jump: E.jumpQueued && !frozen, drift: keys.has("KeyQ") }, dt, F);
  if (E.jumpQueued && !frozen) Sound.jump();
  E.jumpQueued = false;
  if (me.boosting && !wasBoost) Sound.boost();
  if (me.onGround && !wasGround) Sound.bounce(6, 0.6, 0, true);
  // almofadas de turbo
  for (const pd of pads) {
    pd.orb.visible = t >= pd.until;
    if (pd.orb.visible) { pd.orb.rotation.y += dt * 2; if (Math.hypot(me.x - pd.x, me.z - pd.z) < (pd.big ? 2.2 : 1.4) && me.y < 1.5 && me.boost < 100) { me.boost = Math.min(100, me.boost + (pd.big ? 100 : 15)); pd.until = t + (pd.big ? 10 : 5); Sound.pad(); } }
  }
  // batida leve entre carros
  for (const o of G.remotes.values()) { const dx = me.x - o.x, dz = me.z - o.z, d = Math.hypot(dx, dz); if (d < 2.6 && d > 1e-4 && Math.abs(me.y - o.y) < 1.4) { me.x += (dx / d) * (2.6 - d) * 0.5; me.z += (dz / d) * (2.6 - d) * 0.5; } }
  const sp = Math.hypot(me.vx, me.vz);
  me.st.steer = steer;
  if (me.flipT > 0) me.st.flipDir = me.flipDir; else me.st.flipDir = null;
  poseCar(G.meModel, me.x, me.y, me.z, me.yaw, carO(me));
  animateCar(G.meModel, me.st, dt, me.fw ? me.vx * me.fw[0] + me.vy * me.fw[1] + me.vz * me.fw[2] : (me.vx * -Math.sin(me.yaw) + me.vz * -Math.cos(me.yaw)), myFlags(), me.fw ? 0 : me.pitch);
  Sound.engine(sp, true);
}

// a câmera nunca sai da quadra (senão o alambrado tapa tudo): se o "braço" da câmera passar da parede, ele encolhe
// (a câmera chega mais perto do jogador) e sobe um pouco. Atrás do goleiro, ela pode entrar no gol (como no FIFA).
function keepInside(F, tgt, m = 0.3) {
  const p = cam.position, lz = F.W - m;
  const inMouth = Math.abs(p.z) < F.goalW - 0.25 && !isCar();
  const lx = inMouth ? F.L + F.goalD - 0.2 : F.L - m;
  const dx = p.x - tgt.x, dz = p.z - tgt.z;
  let s = 1;
  if (Math.abs(p.x) > lx && Math.abs(dx) > 1e-6) s = Math.min(s, (Math.sign(p.x) * lx - tgt.x) / dx);
  if (Math.abs(p.z) > lz && Math.abs(dz) > 1e-6) s = Math.min(s, (Math.sign(p.z) * lz - tgt.z) / dz);
  s = clamp(s, 0, 1);
  const over = (1 - s) * Math.hypot(dx, dz);
  p.x = tgt.x + dx * s; p.z = tgt.z + dz * s; p.y += over * 0.9;
  if (inMouth && Math.abs(p.x) > F.L - 0.2) p.y = Math.min(p.y, F.goalH - 0.3); // embaixo do travessão
  if (F.rc) { const sd = C.arenaSDF(F, p.x, p.y, p.z), lim = -0.8; if (sd.d > lim && !(Math.abs(p.x) > F.L - 1 && Math.abs(p.z) < F.goalW && p.y < F.goalH)) { const k = sd.d - lim; p.x -= sd.nx * k; p.y -= sd.ny * k; p.z -= sd.nz * k; } } // arena arredondada: não sai pela curva
  return over;
}
// trocou de jogador: em vez de a câmera pular para o outro corpo (parecia que o jogo tinha travado), ela desliza do
// jogador antigo até o novo em ~0,45 s (com aceleração e freada suaves)
const CAM_TROCA = 0.45;
export function camTroca(de) { G.camDe = { x: de.x, y: de.y || 0, z: de.z, t0: now() }; }
export function focoCam(me) {
  const d = G.camDe; if (!d) return me;
  const u = clamp((now() - d.t0) / CAM_TROCA, 0, 1), k = u * u * (3 - 2 * u); // smoothstep
  if (u >= 1) { G.camDe = null; return me; }
  return { x: lerp(d.x, me.x, k), y: lerp(d.y, me.y, k), z: lerp(d.z, me.z, k) };
}
function updateCamera(dt) {
  const me0 = G.me, b = ballMesh.position, F = G.F, tvOn = isCar() ? G.tv : G.view === "tv";
  const me = isCar() ? me0 : { ...me0, ...focoCam(me0) }; // a pé: a câmera segue o foco (que desliza na troca)
  if (G.meModel) G.meModel.visible = (isCar() || G.view !== "primeira" || !!G.camDe) && !rags.some((r) => r.model === G.meModel); // caído: quem aparece é o boneco de pano
  if (!G.meModel || tvOn) { // câmera de TV: do alto da lateral, seguindo o MEU jogador (com um pouco da bola)
    const fx0 = G.meModel ? lerp(me.x, b.x, 0.25) : b.x, fz0 = G.meModel ? lerp(me.z, b.z, 0.25) : b.z;
    const tx = clamp(fx0, -F.L + 4, F.L - 4), hgt = isCar() ? 22 : 10;
    cam.position.lerp(new THREE.Vector3(tx, hgt, F.W - 0.6), Math.min(1, dt * 4));
    cam.lookAt(tx, 0, fz0 - (isCar() ? 6 : 2.5));
    if (cam.fov !== 58) { cam.fov = 58; cam.updateProjectionMatrix(); }
    if (G.meModel && !isCar()) showAim(me0); else { aim.visible = false; passMark.visible = false; }
    return;
  }
  if (isCar()) { // atrás do carro; com a câmera da bola, a bola fica sempre na tela
    const fov = 75 + (me.boosting ? 6 : 0); if (Math.abs(cam.fov - fov) > 0.1) { cam.fov = lerp(cam.fov, fov, 0.15); cam.updateProjectionMatrix(); }
    let dx = -Math.sin(me.yaw), dz = -Math.cos(me.yaw);
    if (G.ballCam) { const bx = b.x - me.x, bz = b.z - me.z, d = Math.hypot(bx, bz); if (d > 2) { dx = bx / d; dz = bz / d; } }
    G.camCarYaw = angLerp(G.camCarYaw, Math.atan2(-dx, -dz), Math.min(1, dt * 6));
    const fx = -Math.sin(G.camCarYaw), fz = -Math.cos(G.camCarYaw);
    const target = new THREE.Vector3(me.x - fx * 8.5, Math.max(1, me.y + 3.4), me.z - fz * 8.5);
    cam.position.lerp(target, Math.min(1, dt * 10));
    keepInside(F, me, 1);
    if (G.ballCam) cam.lookAt(lerp(me.x, b.x, 0.5), lerp(me.y + 1, b.y, 0.4), lerp(me.z, b.z, 0.5));
    else cam.lookAt(me.x + fx * 6, me.y + 1.2, me.z + fz * 6);
    aim.visible = false; passMark.visible = false; return;
  }
  const yaw = G.camYaw, pitch = G.camPitch, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  if (G.view === "primeira") { // primeira pessoa: os olhos do jogador
    if (cam.fov !== 80) { cam.fov = 80; cam.updateProjectionMatrix(); }
    const low = me.slideT > 0 || me.downT > 0 || me.diveT > 0;
    cam.position.set(me.x + fx * 0.15, me.y + (low ? 0.45 : 1.62), me.z + fz * 0.15);
    cam.lookAt(cam.position.x + fx * Math.cos(pitch), cam.position.y + Math.sin(pitch) - 0.08, cam.position.z + fz * Math.cos(pitch));
    showAim(me0); return;
  }
  const fovQuer = 70 + (G.me.sprint ? 4 : 0); if (Math.abs(cam.fov - fovQuer) > 0.05) { cam.fov += (fovQuer - cam.fov) * Math.min(1, dt * 4); cam.updateProjectionMatrix(); } // zoom leve no pique
  const elev = clamp(0.32 - pitch * 0.8, -0.05, 1.1), dist = 4.6;
  const tgt = new THREE.Vector3(me.x, me.y + 1.5, me.z);
  cam.position.set(tgt.x - fx * dist * Math.cos(elev), Math.max(0.35, tgt.y + dist * Math.sin(elev)), tgt.z - fz * dist * Math.cos(elev));
  // encostado na parede (goleiro, escanteio): a câmera chega perto e olha mais para o jogador, para ele não sumir da tela
  const over = keepInside(F, tgt), w = clamp(over / 4.6, 0, 0.8);
  cam.lookAt(lerp(tgt.x + fx * 6, me.x, w), lerp(tgt.y + pitch * 6 - 0.3, me.y + 0.6, w), lerp(tgt.z + fz * 6, me.z, w));
  showAim(me0);
}
function showAim(me) {
  let ay = aimYaw();
  if (E.charge && E.charge.kind === "chute" && !isCar()) ay = C.assistShot(me, ay, myAttackTeam() || "A", G.F, curveNow(), bolaAqui()); // a seta já mostra a ajudinha
  // carregando o passe: anel no ponto onde a bola vai encontrar quem recebe (toque: curto; 1 s: longo; enfiada)
  let alvo = null;
  const tp = E.charge && !isCar() && tipoPasse(E.charge.kind, powerOf(E.charge));
  if (tp) { const pl = planoPasse(me, ay, tp, powerOf(E.charge), false, () => 0.5); alvo = pl.ponto; ay = pl.yaw; } // o anel vai onde a bola encontra quem recebe
  else if (G.passeVoo && now() < G.passeVoo.ate && !(bolaAqui() || {}).dono) { // a bola a caminho: o anel fica embaixo de quem recebe
    const r = G.passeVoo.alvo === "eu" ? G.me : G.mode === "bots" ? G.bots.find((x) => x.id === G.passeVoo.alvo) : G.remotes.get(G.passeVoo.alvo);
    if (r) alvo = { x: r.px ?? r.x, z: r.pz ?? r.z };
  } else G.passeVoo = null;
  passMark.visible = !!alvo;
  if (alvo) { passMark.position.set(alvo.x, 0.04, alvo.z); passMark.material.opacity = 0.55 + 0.35 * Math.abs(Math.sin(now() * 8)); }
  aim.visible = true; aim.position.set(me.x - Math.sin(ay) * 1.1, 0.03, me.z - Math.cos(ay) * 1.1); aim.rotation.z = ay + Math.PI / 2;
  aim.material.opacity = E.charge ? 0.9 : 0.4;
}

let camHook = null; // só para testes (#debug): reposiciona a câmera depois do jogo
if (location.hash === "#debug") window.__pelada = { scene, G, cam, ballS, local, keys, now, addRag, rags, makePlayer, animate, mudarSkinJogador, jogar: () => padPausa(true), avancar: (seg) => { for (let i = 0; i < seg * 60; i++) { E.adiantado += 1 / 60; frame(1 / 60, now()); } }, setCamHook: (f) => (camHook = f), get S() { return E.S; }, get socket() { return socket; } }; // para testes
