// Pelada da Galera — sem servidor: o goleiro robô, o treino, as faltas e o jogo contra bots (IA, carrinhos, pedir a
// bola e a troca de jogador opcional).
import { E, C, $, h, store, clamp, FL, BOT_DIF, molinhoLigado, G, keys, now, locked, local, isCar, myKit, PAD, CARRINHO_CD, trocaLigada } from "./estado.js";
import { show } from "./menus.js";
import { SKINS_CONFIG, makePlayer, descartarJogador, animate, addRag } from "./bonecos.js";
import { Sound, hearing } from "./sons.js";
import { scene } from "./cena.js";
import { startGame, stopGame, SEGURADO_VEL, camTroca, focoCam } from "./jogo.js";
import { viraComABola, myBody } from "./bola.js";
import { flashMsg, pushFeed, scoreTable } from "./hud.js";
import { soltarPad } from "./controles.js";

// goleiro robô (treino e faltas): fica na linha entre a bola e o gol; com a bola vindo, vai para onde ela vai
// cruzar a linha e se joga se não der tempo de chegar andando. Segura a bola que para perto e devolve.
// k.s: de que lado é o gol dele (+1: o da direita, padrão; -1: o da esquerda, contra bots). ativo = false: fica parado.
function keeperBot(k, b, dt, t, ativo = true) {
  const F = G.F, s = k.s || 1, gx = s * (F.L - 0.6);
  k.diveT = Math.max(0, (k.diveT || 0) - dt);
  if (!ativo) { k.model.position.set(k.x, k.y, k.z); animate(k.model, 0, dt, k.st, 0); return { ...k, kind: "pe", dive: false }; }
  const coming = s * b.vx > 5 && s * b.x < s * gx;
  const zc = coming ? b.z + b.vz * (gx - b.x) / b.vx : b.z * (G.falta ? 0.35 : 0.8);
  const tz = clamp(zc, -F.goalW + 0.3, F.goalW - 0.3);
  if (!k.diveT) {
    const tArrive = coming ? (gx - b.x) / b.vx : 9;
    if (coming && tArrive < 0.45 && Math.abs(tz - k.z) > 0.55 && k.onGround) { // não chega andando: se joga
      const sd = Math.sign(tz - k.z); k.vz = sd * 7; k.vy = 3; k.onGround = false; k.diveT = 0.7; k.st.diveSide = -sd * s; Sound.jump();
    } else {
      const want = clamp((tz - k.z) * 7, -6, 6);
      C.movePlayer(k, { x: 0, z: Math.sign(want), speed: Math.abs(want), jump: coming && b.y > 1.3 && tArrive < 0.4 && k.onGround }, dt, F);
    }
  } else C.movePlayer(k, { x: 0, z: 0, speed: 0, free: true }, dt, F);
  k.x = gx;
  const near = Math.hypot(b.x - k.x, b.z - k.z) < 1.2 && Math.hypot(b.vx, b.vz) < 3 && b.y < 1;
  if (near && !G.falta) { k.holdT += dt; if (k.holdT > 0.8) { k.holdT = 0; k.st.kickT = t; reposicao(k, b); Sound.kick(0.5, 0.6); } }
  else k.holdT = 0;
  k.model.position.set(k.x, k.y, k.z); animate(k.model, Math.abs(k.vz), dt, k.st, k.diveT ? FL.dive : 0);
  return { ...k, kind: "pe", dive: k.diveT > 0 };
}
// o goleiro robô devolve a bola: no treino, para o meio; contra bots, rasteiro para um companheiro (ou para a frente)
function reposicao(k, b) {
  const s = k.s || 1, base = s > 0 ? Math.PI / 2 : -Math.PI / 2;
  if (G.mode === "bots" && k.team) {
    const mates = [...(k.team === "A" ? [{ id: "eu", x: G.me.x, z: G.me.z, vx: G.me.vx, vz: G.me.vz }] : []), ...G.bots.filter((x) => x.team === k.team && x.downT <= 0).map((x) => ({ id: x.id, x: x.x, z: x.z, vx: x.vx, vz: x.vz }))];
    const r = C.assistPass(k, base + (Math.random() - 0.5) * 1.2, mates, 0.3 + Math.random() * 0.5, false, G.F);
    C.kick(b, k, r.kind || "passe", r.alvo ? r.power : 0.7, r.yaw, 0, 0, G.F); return;
  }
  C.kick(b, k, "passe", 0.6 + Math.random() * 0.3, base + (Math.random() - 0.5) * 0.8, 0, 0, G.F);
}
// faltas: bola parada num ponto entre 8 e 14 m do gol, barreira de 3 e o goleiro
export function setupFalta() {
  const F = G.F, fz = G.falta, b = local.ball, me = G.me, k = G.keeper;
  let x, z;
  do { x = F.L - 8 - Math.random() * 6; z = (Math.random() * 2 - 1) * 7; } while (Math.hypot(F.L - x, z) < 8);
  Object.assign(b, C.newBall(F), { x, z });
  const dx = F.L - x, dz = -z, d = Math.hypot(dx, dz), ux = dx / d, uz = dz / d, yaw = Math.atan2(-ux, -uz);
  Object.assign(me, { x: x - ux * 1.6, z: z - uz * 1.6, vx: 0, vy: 0, vz: 0, y: 0, onGround: true, facing: yaw });
  G.camYaw = yaw; G.camPitch = 0.05;
  for (const w of fz.wall) descartarJogador(w.model);
  fz.wall = [-0.75, 0, 0.75].map((o, i) => {
    const w = { id: "barreira" + i, x: x + ux * 5 - uz * (o + 0.35), y: 0, z: z + uz * 5 + ux * (o + 0.35), vx: 0, vy: 0, vz: 0, onGround: true, st: {}, model: makePlayer("laranja", 4 + i, "") };
    w.model.rotation.y = yaw + Math.PI; scene.add(w.model); return w;
  });
  Object.assign(k, { z: clamp(z * 0.35, -1.2, 1.2), vz: 0, vy: 0, y: 0, onGround: true, diveT: 0 });
  fz.state = "mirar"; fz.n++;
  flashMsg(`Falta ${fz.n}`, "Q/E: efeito · setas: mirar · K: chute · L: cavadinha", 2600);
}
function faltaResult(msg, color, sound) {
  const fz = G.falta; fz.state = "fim"; fz.t0 = now();
  flashMsg(msg, `${fz.goals} gol${fz.goals === 1 ? "" : "s"} em ${fz.n} falta${fz.n === 1 ? "" : "s"}`, 1800, color, msg.startsWith("GOO"));
  sound();
}
// treino: a bola (e o goleiro robô, a pé) rodam só aqui
export function practiceStep(dt, t) {
  const b = local.ball, me = G.me, k = G.keeper, F = G.F, fz = G.falta;
  const bodies = [myBody()];
  if (k) bodies.push(keeperBot(k, b, dt, t));
  if (fz) {
    for (const w of fz.wall) { // a barreira pula logo depois do chute
      if (fz.state === "voando" && !w.jumped && t - fz.t0 > 0.12) { w.jumped = true; w.vy = 4.2; w.onGround = false; }
      if (fz.state === "mirar") w.jumped = false;
      C.movePlayer(w, { x: 0, z: 0, speed: 0 }, dt, F);
      w.model.position.set(w.x, w.y, w.z); animate(w.model, 0, dt, w.st);
      bodies.push({ ...w, kind: "pe" });
    }
    if (fz.state === "fim") { if (t - fz.t0 > 1.9) setupFalta(); else C.simulate(F, b, [], dt); return; }
    const r = C.simulate(F, b, bodies, dt);
    if (r.hit > 2) { const [kk, pan] = hearing([b.x, b.y, b.z]); Sound.bounce(r.hit, kk, pan); }
    if (r.touch && r.touch !== "eu" && fz.state === "voando") fz.touched = fz.touched || r.touch;
    if (fz.state !== "voando") { if (r.touch === "eu" && Math.hypot(b.vx, b.vz) > 0.5) { fz.state = "voando"; fz.t0 = t; } return; }
    const side = C.goalOf(F, b), slow = Math.hypot(b.vx, b.vy, b.vz) < 0.6;
    if (side === "A") { fz.goals++; G.tGoals++; faltaResult("GOOOL!", "#ffd84a", () => { Sound.net(); Sound.cheer(); }); }
    else if (t - fz.t0 > 3.5 || slow || b.x > F.L + 0.5 || Math.abs(b.z) > F.W - 1) {
      const by = fz.touched || "";
      faltaResult(by === "goleiro" ? "Defendeu!" : by.startsWith("barreira") ? "Na barreira!" : "Pra fora!", "#ffffff", () => Sound.ooh());
    }
    return;
  }
  if (G.practiceGoalAt) {
    if (t - G.practiceGoalAt > 2.2) { G.practiceGoalAt = 0; Object.assign(b, C.newBall(F), isCar() ? { x: clamp(me.x - Math.sin(me.yaw) * 12, -F.L + 4, F.L - 4), z: clamp(me.z - Math.cos(me.yaw) * 12, -F.W + 4, F.W - 4) } : { x: me.x + 1.5 * -Math.sin(G.camYaw), z: me.z + 1.5 * -Math.cos(G.camYaw) }); }
    else C.simulate(F, b, [], dt);
    return;
  }
  viraComABola(b, me);
  const toques = b.toques;
  const r = C.simulate(F, b, bodies, dt);
  if (b.toques !== toques && b.toqueDe === "eu") toqueMeu();
  if (r.hit > 2) { const [kk, pan] = hearing([b.x, b.y, b.z]); Sound.bounce(r.hit, kk, pan, isCar()); }
  const side = C.goalOf(F, b);
  if (side === "A" || (side && isCar())) { G.tGoals++; G.practiceGoalAt = t; Sound.net(); Sound.cheer(); flashMsg("GOOOL!", `${G.tGoals} gol${G.tGoals === 1 ? "" : "s"} no treino`, 2500, "#ffd84a", true); }
  else if (side === "B") { G.practiceGoalAt = t; Sound.ooh(); flashMsg("Gol contra!", "", 2000, "#ff8a8a"); }
}

// ======================================================================
// Contra bots (sozinho, sem servidor): o seu time (A) com bots companheiros contra um time só de bots, cada time com
// um goleiro robô. A bola e os bots rodam só aqui, como no treino. Por padrão o seu jogador é FIXO (como no Pro
// Clubs): passe sem a bola pede a bola, e o bot do seu time que estiver com ela toca para você. A troca de jogador
// do FIFA é opcional (tela inicial): com ela ligada, T troca para o companheiro mais perto da bola e o controle vai
// junto no passe.
// Os bots: o mais perto da bola de cada time vai nela (no seu time, só se você estiver longe), os outros guardam
// posição acompanhando a bola; quem vai receber um passe vai ao encontro da bola; com a bola, conduzem (com toques)
// para o gol desviando de quem vem, passam quando apertados e chutam de perto. Dão carrinho em quem conduz e
// cabeceiam bola alta.
// ======================================================================
// posições de cada um (x para o ataque, z para o lado) com a bola no meio, por tamanho de time (o goleiro é à parte)
const BOT_SLOTS = { 1: [[0, 0]], 2: [[-6, 0], [6, 0]], 3: [[-8, 0], [4, -6], [4, 6]], 4: [[-9, -5], [-9, 5], [5, -5], [5, 5]], 5: [[0, 0], [-10, -6], [-10, 6], [9, -6], [9, 6]] };
const BOT_MIN = 4;
export function setupBots() {
  const n = clamp(store.get("pelada:botSize") || 3, 1, 5), dif = BOT_DIF[store.get("pelada:botDif")] ? store.get("pelada:botDif") : "medio";
  const a = myKit(), kits = { A: a, B: a === "palmeiras" ? "rubronegro" : "palmeiras" };
  G.bm = { n, dif, kits, pedido: -9, score: { A: 0, B: 0 }, left: BOT_MIN * 60000, phase: "ready", until: 0, kicking: "A", trocaT: 0, trocaN: 0 };
  G.bots = []; G.keepers = [];
  const nums = [10, 7, 5, 9, 11];
  for (const team of ["A", "B"]) for (let i = team === "A" ? 1 : 0; i < n; i++) {
    const bot = { id: `bot${team}${i}`, team, slot: i, num: nums[i], name: `#${nums[i]}`, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, onGround: true, facing: 0, yaw: 0,
      sprint: false, slideT: 0, slideCd: 0, downT: 0, lastKick: 0, kickT: 0, think: 0, st: {}, model: makePlayer(kits[team], nums[i], "") };
    scene.add(bot.model); G.bots.push(bot);
  }
  G.me.slot = 0;
  for (const team of ["A", "B"]) {
    const s = team === "A" ? -1 : 1, k = { id: "gk" + team, team, s, x: s * (G.F.L - 0.6), y: 0, z: 0, vx: 0, vy: 0, vz: 0, onGround: true, holdT: 0, st: {}, model: makePlayer(kits[team], 1, "", { gk: true }) };
    k.model.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(k.model); G.keepers.push(k);
  }
  botsKickoff("A");
}
function botsKickoff(kicking) {
  const F = G.F, bm = G.bm;
  bm.pedido = -9;
  Object.assign(local.ball, C.newBall(F));
  for (const team of ["A", "B"]) {
    const list = [...(team === "A" ? [G.me] : []), ...G.bots.filter((x) => x.team === team)];
    const sp = C.spawns(G.F.id, team, list.map(() => ({})), kicking === team);
    list.forEach((p, i) => Object.assign(p, { x: sp[i][0], y: 0, z: sp[i][2], vx: 0, vy: 0, vz: 0, onGround: true, facing: sp[i][3], yaw: sp[i][3], slideT: 0, downT: 0, sprint: false }));
  }
  for (const k of G.keepers) Object.assign(k, { z: 0, vx: 0, vy: 0, vz: 0, y: 0, onGround: true, diveT: 0, holdT: 0 });
  G.camYaw = G.me.facing; G.camPitch = 0.05;
  bm.phase = "ready"; bm.until = now() + 1.6; bm.kicking = kicking;
}
const botBody = (x) => ({ id: x.id, kind: "pe", x: x.x, y: x.y, z: x.z, vx: x.vx, vy: x.vy, vz: x.vz, yaw: x.facing, sprint: x.sprint, slide: x.slideT > 0 || x.downT > 0, dive: false,
  girando: !!x.girando, conduz: true, chutou: now() - x.lastKick < 0.35 });
const timeDe = (id) => (id === "eu" ? "A" : (G.bots.find((x) => x.id === id) || {}).team || null);
// quem do time vai na bola: o bot mais perto (no meu time, só se eu estiver bem mais longe que ele)
function cacador(team) {
  const b = local.ball; let best = null, bd = Infinity;
  for (const x of G.bots) if (x.team === team && x.downT <= 0) { const d = Math.hypot(b.x - x.x, b.z - x.z); if (d < bd) { bd = d; best = x; } }
  if (team === "A" && best && Math.hypot(b.x - G.me.x, b.z - G.me.z) < bd + 2) return null;
  return best;
}
// todo mundo do time (eu incluído no A), onde está agora
const doTime = (team, menos) => [...(team === "A" ? [{ id: "eu", x: G.me.x, z: G.me.z, vx: G.me.vx, vz: G.me.vz, down: G.me.downT > 0 }] : []),
  ...G.bots.filter((x) => x.team === team).map((x) => ({ id: x.id, x: x.x, z: x.z, vx: x.vx, vz: x.vz, down: x.downT > 0 || x.slideT > 0 }))].filter((x) => x.id !== menos && !x.down);
function botChute(bot, t, d, s, power) {
  const F = G.F, b = local.ball, alvoZ = (Math.random() * 2 - 1) * (F.goalW - 0.45);
  const yaw = Math.atan2(-(s * F.L - b.x), -(alvoZ - b.z)) + (Math.random() * 2 - 1) * d.erro;
  if (!C.kick(b, botBody(bot), "chute", power, yaw, 0, 0, G.F)) return false;
  bot.lastKick = t; bot.st.kickT = t; const [k, pan] = hearing([bot.x, 0.5, bot.z]); Sound.kick(power, k, pan); return true;
}
// passe do bot: escolhe o tipo como um jogador faria. Companheiro correndo para o ataque: bola enfiada (ele aposta
// corrida); rival na linha do passe (a menos de 1,2 m do segmento) ou longe: longo, por cima; senão, curto.
function botPasse(bot, t, alvo) {
  const b = local.ball, s = bot.team === "A" ? 1 : -1, rivais = doTime(bot.team === "A" ? "B" : "A");
  const dx = alvo.x - bot.x, dz = alvo.z - bot.z, d = Math.hypot(dx, dz);
  const naLinha = rivais.some((o) => { // distância do rival ao segmento bot→alvo (projeção limitada a [0, 1])
    const u = clamp(((o.x - bot.x) * dx + (o.z - bot.z) * dz) / (d * d), 0, 1);
    return u > 0.1 && u < 0.9 && Math.hypot(bot.x + dx * u - o.x, bot.z + dz * u - o.z) < 1.2;
  });
  const tipo = s * (alvo.vx || 0) > 2.5 && Math.random() < 0.6 ? "profundidade" : naLinha || d > 17 ? "longo" : "curto";
  const colado = rivais.some((o) => Math.hypot(o.x - bot.x, o.z - bot.z) < 1.6), forca = tipo === "profundidade" ? Math.random() * 0.4 : 0;
  const pl = C.planejarPasse(G.F, bot, Math.atan2(-dx, -dz), [alvo], tipo, forca, colado, s, Math.random, { assist: tipo !== "longo" });
  if (!C.kick(b, botBody(bot), pl.kind, 1, pl.yaw, 0, 0, G.F, { vel: pl.vel, elev: pl.elev, alvo: pl.alvo })) return false;
  bot.facing = pl.yaw; bot.lastKick = t; bot.st.kickT = t; G.passeVoo = pl.alvo && bot.team === "A" ? { alvo: pl.alvo, ate: t + 3 } : null; // o anel só no meu time
  const [k, pan] = hearing([bot.x, 0.5, bot.z]); Sound.kick(0.35, k, pan); return true;
}
// pedi a bola: o bot do meu time que está com ela pensa logo (e toca para mim, se der)
export function pedidoBots(t) {
  if (!G.bm) return; G.bm.pedido = t;
  const bot = G.bots.find((x) => x.team === "A" && local.ball.dono === x.id);
  if (bot) bot.think = Math.min(bot.think, t + BOT_DIF[G.bm.dif].reac * 0.4);
}
// com a bola: chuta de perto, passa quando apertado (ou de vez em quando, para a frente), senão conduz
function botDecide(bot, t, d, s) {
  const F = G.F, gx = s * F.L, dGol = Math.hypot(gx - bot.x, bot.z);
  const rivais = doTime(bot.team === "A" ? "B" : "A");
  const perto = (p, r) => rivais.some((o) => Math.hypot(o.x - p.x, o.z - p.z) < r);
  // eu pedi a bola (até 2,5 s atrás): toca para mim, a não ser que esteja na cara do gol ou eu esteja longe/caído
  if (bot.team === "A" && t - G.bm.pedido < 2.5 && !(G.me.downT > 0)) {
    const dm = Math.hypot(G.me.x - bot.x, G.me.z - bot.z);
    if (dm > 2.5 && dm < 32 && !(dGol < 7 && !perto(bot, 2.4)) && botPasse(bot, t, { id: "eu", x: G.me.x, z: G.me.z, vx: G.me.vx, vz: G.me.vz })) { G.bm.pedido = -9; return; }
  }
  if (dGol < 12.5 && s * (gx - bot.x) > 1.5 && Math.random() < 0.85) { if (botChute(bot, t, d, s, 0.72 + Math.random() * 0.28)) return; }
  const apertado = perto(bot, 2.4);
  if (apertado || Math.random() < 0.18) {
    let best = null, bs = -Infinity;
    for (const m of doTime(bot.team, bot.id)) {
      const dd = Math.hypot(m.x - bot.x, m.z - bot.z); if (dd < 3 || dd > 24) continue;
      const sc = s * (m.x - bot.x) * 0.6 - (perto(m, 2.5) ? 12 : 0) - dd * 0.15;
      if (sc > bs) { bs = sc; best = m; }
    }
    if (best && (apertado ? bs > -10 : bs > 1) && botPasse(bot, t, best)) return;
  }
  bot.alvoZ = clamp(bot.z * 0.5 + (Math.random() * 2 - 1) * 5, -F.W + 3, F.W - 3);
}
function stepBot(bot, dt, t, live) {
  const F = G.F, b = local.ball, d = BOT_DIF[G.bm.dif], s = bot.team === "A" ? 1 : -1;
  bot.slideT = Math.max(0, bot.slideT - dt); bot.downT = Math.max(0, bot.downT - dt); bot.slideCd = Math.max(0, bot.slideCd - dt);
  const busy = bot.slideT > 0 || bot.downT > 0;
  let wx = 0, wz = 0, speed = 0, sprint = false, olha = null;
  if (live && !busy) {
    const tem = b.dono === bot.id, donoT = b.dono ? timeDe(b.dono) : null, dB = Math.hypot(b.x - bot.x, b.z - bot.z);
    let tx, tz;
    if (tem) {
      if (t >= bot.think) { bot.think = t + d.reac * (0.6 + Math.random() * 0.8); botDecide(bot, t, d, s); }
      if (b.dono === bot.id) { // ainda com ela: conduz para o gol, desviando de quem está na frente
        const gx = s * F.L; let dx = gx - bot.x, dz = (bot.alvoZ ?? 0) - bot.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        let livre = true;
        for (const o of doTime(bot.team === "A" ? "B" : "A")) {
          const ox = o.x - bot.x, oz = o.z - bot.z, od = Math.hypot(ox, oz), fr = (ox * dx + oz * dz) / (od || 1);
          if (od < 4 && fr > 0.2) { livre = false; const lado = Math.sign(ox * -dz + oz * dx) || 1, k = (4 - od) * 0.35, px = -dz * lado, pz = dx * lado; dx -= px * k; dz -= pz * k; }
        }
        tx = bot.x + dx * 3; tz = bot.z + dz * 3; sprint = livre && Math.random() < 0.97;
      } else { tx = bot.x; tz = bot.z; }
    } else if (b.alvoPasse === bot.id && !b.dono) { // vai receber um passe: vai ao encontro da bola (na linha dela)
      const sp = Math.hypot(b.vx, b.vz), ux = sp > 0.5 ? b.vx / sp : 0, uz = sp > 0.5 ? b.vz / sp : 0;
      const u = Math.max(0, (bot.x - b.x) * ux + (bot.z - b.z) * uz); // onde a bola passa mais perto dele
      tx = b.x + ux * u * 0.85; tz = b.z + uz * u * 0.85; olha = b;
    } else if (donoT !== bot.team && bot === G.bm.cacador[bot.team]) {
      const lead = Math.min(0.6, dB / 10); tx = b.x + b.vx * lead; tz = b.z + b.vz * lead; sprint = dB > 3;
      if (donoT && dB < 1.9 && bot.slideCd <= 0 && bot.onGround && Math.random() < d.carrinho * dt * 2.5) { // carrinho em quem conduz
        const fy = Math.atan2(-(b.x - bot.x), -(b.z - bot.z)); bot.facing = fy;
        const sp = Math.max(Math.hypot(bot.vx, bot.vz), 7.5); bot.vx = -Math.sin(fy) * sp; bot.vz = -Math.cos(fy) * sp; bot.slideT = 0.6; bot.slideCd = CARRINHO_CD; Sound.slide();
      }
      if (!b.dono && t - bot.lastKick > 0.5) { // bola solta: alta cabeceia; no pé e perto do gol, chuta de primeira
        const how = C.canKick(botBody(bot), b, 0);
        if (how === "cabeca" || (how === "pe" && Math.hypot(s * F.L - b.x, b.z) < 9 && Math.random() < 0.5)) botChute(bot, t, d, s, how === "cabeca" ? 0.75 : 0.85);
      }
      olha = b;
    } else { // guarda posição acompanhando a bola (mais para a frente quando o time tem a bola)
      const sl = BOT_SLOTS[G.bm.n][bot.slot % BOT_SLOTS[G.bm.n].length], bxa = s * b.x;
      const xa = clamp(sl[0] * 0.8 + bxa * 0.55 + (donoT === bot.team ? 4 : -2), -F.L + 3, F.L - 3);
      tx = s * xa; tz = clamp(sl[1] + b.z * 0.3, -F.W + 1.5, F.W - 1.5); olha = b;
      if (!b.dono && dB < 1.2 && t - bot.lastKick > 0.5 && C.canKick(botBody(bot), b, 0) === "cabeca") botChute(bot, t, d, s, 0.7);
    }
    if (bot.slideT <= 0) {
      const dx = tx - bot.x, dz = tz - bot.z, dist = Math.hypot(dx, dz);
      if (dist > 0.4) { wx = dx / dist; wz = dz / dist; speed = (sprint ? C.SPRINT : C.RUN) * d.vel * clamp(dist / 2, 0.35, 1); }
      if (G.me.segurando === bot) speed *= SEGURADO_VEL;
    }
  }
  bot.sprint = sprint && speed > 0;
  if (busy) { const k = Math.exp(-dt * (bot.downT > 0 ? 6 : 1.6)); bot.vx *= k; bot.vz *= k; }
  C.movePlayer(bot, { x: wx, z: wz, speed, jump: false, free: busy, molinho: molinhoLigado(), suave: true }, dt, F);
  const outros = [{ x: G.me.x, z: G.me.z, y: G.me.y, vx: G.me.vx, vz: G.me.vz, sprint: G.me.sprint, caido: G.me.slideT > 0 || G.me.downT > 0 }];
  for (const o of G.bots) if (o !== bot) outros.push({ x: o.x, z: o.z, y: o.y, vx: o.vx, vz: o.vz, sprint: o.sprint, caido: o.slideT > 0 || o.downT > 0 });
  for (const k of G.keepers) outros.push({ x: k.x, z: k.z, y: k.y, vx: k.vx, vz: k.vz, caido: !!k.diveT });
  C.corpoACorpo(bot, outros, busy);
  // vira para onde corre (com a bola ou parado, para a bola), com giro limitado como o jogador
  const hsp = Math.hypot(bot.vx, bot.vz);
  if (!busy) {
    const target = speed > 0 ? Math.atan2(-wx, -wz) : olha ? Math.atan2(-(olha.x - bot.x), -(olha.z - bot.z)) : bot.facing;
    const df = Math.atan2(Math.sin(target - bot.facing), Math.cos(target - bot.facing)), rate = hsp < 1.5 ? 11 : bot.sprint ? 6 : 7.5;
    bot.facing += clamp(df * Math.min(1, dt * 14), -rate * dt, rate * dt); bot.girando = Math.abs(df) > 1.2;
  }
  bot.yaw = bot.facing;
}
// carrinho (sem servidor): quem desliza derruba o adversário que estiver logo na frente
function carrinhosLocais() {
  const ents = [{ e: G.me, id: "eu", team: "A", eu: true }, ...G.bots.map((x) => ({ e: x, id: x.id, team: x.team }))];
  for (const a of ents) {
    if (!(a.e.slideT > 0) || a.e.downT > 0) continue;
    const hx = a.e.x - Math.sin(a.e.facing) * 0.6, hz = a.e.z - Math.cos(a.e.facing) * 0.6;
    for (const o of ents) if (o.team !== a.team && !(o.e.downT > 0) && o.e.y < 0.6 && Math.hypot(o.e.x - hx, o.e.z - hz) < 0.85) derrubar(o, a);
  }
}
function derrubar(o, a) {
  const e = o.e; e.downT = 1.4; e.slideT = 0;
  if (local.ball.dono === o.id) local.ball.dono = null;
  Sound.fall();
  const model = o.eu ? G.meModel : e.model;
  if (model && !(o.eu && G.view === "primeira")) {
    const dx = e.x - a.e.x, dz = e.z - a.e.z, l = Math.hypot(dx, dz) || 1, k = SKINS_CONFIG[model.userData.skin]?.queda?.push || 1;
    addRag(model, e.x, e.y || 0, e.z, e.facing, { x: e.vx || 0, y: 0, z: e.vz || 0 }, { x: (dx / l) * 3.5 * k, y: 2.2 * k, z: (dz / l) * 3.5 * k }, 1.15);
  }
  if (o.eu) E.charge = null;
  const nome = (x) => (x.eu ? "Você" : `${x.team === "A" ? "Seu" : "Bot"} ${x.e.name}`);
  pushFeed(`🦵 ${h(nome(a))} derrubou ${h(nome(o))}`);
}
// troca de jogador (opcional, desligada por padrão): passe para um bot do meu time, o controle vai junto com a bola,
// na hora (como no FIFA). Quem passou vira bot. (online, quem decide é o servidor)
export function trocaNoPasse(id) {
  if (G.mode !== "bots" || !id || !trocaLigada()) return;
  const bot = G.bots.find((x) => x.id === id && x.team === "A"); if (!bot) return;
  trocarCom(bot, false);
  const b = local.ball; if (b.alvoPasse === bot.id) b.alvoPasse = "eu"; // a trava do passe segue quem recebe (agora, eu)
  if (G.passeVoo && G.passeVoo.alvo === bot.id) G.passeVoo.alvo = "eu";
}
// troca o controle para o bot: os dois trocam de corpo (posição, velocidade, modelo...), e a bola vai junto
function trocarCom(bot, aviso = true) {
  const me = G.me, b = local.ball;
  camTroca(focoCam(me)); // a câmera desliza do jogador antigo (ou de onde ela já estava indo) até o novo
  for (const k of ["x", "y", "z", "vx", "vy", "vz", "onGround", "facing", "slideT", "slideCd", "downT", "lastKick", "kickT", "st", "slot"]) { const v = me[k]; me[k] = bot[k]; bot[k] = v; }
  const m = G.meModel; G.meModel = bot.model; bot.model = m;
  me.yaw = me.facing; bot.yaw = bot.facing; bot.sprint = false; bot.think = 0; me.segurando = null;
  if (b.dono === bot.id) b.dono = "eu"; else if (b.dono === "eu") b.dono = bot.id;
  if (b.toqueDe === bot.id) b.toqueDe = "eu"; else if (b.toqueDe === "eu") b.toqueDe = bot.id;
  const num = bot.num; bot.num = me.num || 10; me.num = num; bot.name = `#${bot.num}`;
  E.charge = null; G.bm.trocaT = now();
  if (aviso) flashMsg("", "🔁 Trocou de jogador", 700);
}
export function trocarJogador() {
  if (!G.bm || G.bm.phase === "over" || !trocaLigada()) return;
  const b = local.ball, t = now(), lista = G.bots.filter((x) => x.team === "A").sort((p, q) => Math.hypot(b.x - p.x, b.z - p.z) - Math.hypot(b.x - q.x, b.z - q.z));
  if (!lista.length) return;
  G.bm.trocaN = t - G.bm.trocaT < 1.2 ? G.bm.trocaN + 1 : 0; // apertou de novo logo em seguida: o próximo mais perto
  trocarCom(lista[G.bm.trocaN % lista.length]);
}
// toque na bola conduzindo: a perna dá uma batidinha (e, no meu, um somzinho baixo)
function toqueAnim(id) { if (id === "eu") return toqueMeu(); const x = G.bots.find((q) => q.id === id); if (x) x.st.toqueT = now(); }
function toqueMeu() { G.me.st.toqueT = now(); Sound.toque?.(); }
function animarBots(dt) {
  for (const x of G.bots) {
    x.model.position.set(x.x, x.y, x.z); x.model.rotation.y = x.facing;
    animate(x.model, Math.hypot(x.vx, x.vz), dt, x.st, (x.sprint ? FL.sprint : 0) | (x.slideT > 0 ? FL.slide : 0) | (x.downT > 0 ? FL.down : 0));
  }
}
export function botsStep(dt, t) {
  const bm = G.bm, F = G.F, b = local.ball; if (!bm) return;
  if (bm.phase === "over") { animarBots(dt); for (const k of G.keepers) keeperBot(k, b, dt, t, false); return; }
  if (bm.phase === "ready" && locked() && t >= bm.until) { bm.phase = "live"; Sound.start(); }
  if (bm.phase === "goal") {
    C.simulate(F, b, [], dt);
    for (const x of G.bots) C.movePlayer(x, { x: 0, z: 0, speed: 0, suave: true }, dt, F);
    animarBots(dt); for (const k of G.keepers) keeperBot(k, b, dt, t, false);
    if (t >= bm.until) { if (bm.left <= 0) return botsFim(); botsKickoff(bm.kicking); }
    return;
  }
  const live = bm.phase === "live" && locked();
  bm.cacador = { A: cacador("A"), B: cacador("B") };
  for (const x of G.bots) stepBot(x, dt, t, live);
  animarBots(dt);
  const bodies = [myBody(), ...G.bots.map(botBody), ...G.keepers.map((k) => keeperBot(k, b, dt, t, live))];
  if (!live) return;
  bm.left -= dt * 1000;
  carrinhosLocais();
  viraComABola(b, G.me);
  const antes = b.dono, toques = b.toques, r = C.simulate(F, b, bodies, dt);
  if (b.toques !== toques) toqueAnim(b.toqueDe);
  if (r.hit > 2) { const [kk, pan] = hearing([b.x, b.y, b.z]); Sound.bounce(r.hit, kk, pan); }
  // troca ligada: um companheiro dominou a bola e o controle passa para ele (como no FIFA)
  if (trocaLigada() && b.dono && b.dono !== "eu" && b.dono !== antes) { const bot = G.bots.find((x) => x.id === b.dono); if (bot && bot.team === "A") trocarCom(bot, false); }
  const side = C.goalOf(F, b);
  if (side) {
    bm.score[side]++; bm.phase = "goal"; bm.until = t + 2.6; bm.kicking = side === "A" ? "B" : "A";
    Sound.net(); Sound.cheer();
    flashMsg("GOOOL!", side === "A" ? `Você ${bm.score.A} x ${bm.score.B} Bots` : `Gol dos bots · ${bm.score.A} x ${bm.score.B}`, 2500, side === "A" ? "#ffd84a" : "#ff8a8a", true);
    pushFeed(`⚽ ${side === "A" ? "Seu time" : "Bots"}`);
  } else if (bm.left <= 0) { bm.left = 0; botsFim(); }
}
function botsFim() {
  const bm = G.bm; bm.phase = "over"; Sound.end();
  if (document.pointerLockElement) document.exitPointerLock();
  PAD.play = false; soltarPad(); keys.clear(); E.charge = null;
  $("pause").classList.add("hidden");
  const r = bm.score.A === bm.score.B ? "🤝 Empate!" : bm.score.A > bm.score.B ? "🏆 Você venceu!" : "😓 Os bots venceram";
  $("overBox").innerHTML = `<h2>${r}</h2><p class="muted" style="margin:0 0 6px">Contra bots · ${BOT_DIF[bm.dif].nome} · ${bm.n}x${bm.n}</p>${scoreTable()}
    <div class="row" style="margin-top:12px"><button class="primary" id="btnAgain">Jogar de novo</button><button class="ghost" id="btnOut" style="margin-left:auto">Sair</button></div>`;
  $("over").classList.remove("hidden");
  $("btnAgain").onclick = () => { stopGame(); startGame("bots", "pes"); };
  $("btnOut").onclick = () => { stopGame(); show("home"); };
}
