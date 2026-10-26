// Corrida da Galera — a física do kart (arcade com aderência e relevo).
import { SECTORS, E, carOf, socket, sNow, me, P, checkpoint } from "./estado.js";
import { Sound } from "./sons.js";
import { trackFrame, groundH } from "./pista.js";
import { race, keys, nearest } from "./jogo.js";
import { pad } from "./controles.js";
import { baterNoOutro, MASSA } from "./colisao.js";
import { CARS3, KS } from "./carros.js";
import { myProg } from "./fantasma.js";
import { ajudaDePelotao } from "./equilibrio.js";
import { marchaAuto, rotacao, torque, topo, NUM } from "./cambio.js";

// Física do kart (arcade com aderência): o carro tem inércia e os pneus só seguram uma certa força de lado.
// Virar gira o bico, mas a velocidade continua indo para onde ia; os pneus puxam o carro para a nova direção até o
// limite de aderência (grip). Entrou rápido demais, o que sobra vira escorregão para fora da curva, que come
// velocidade (scrub) e leva o kart para a grama ou para o muro. Por isso tem que frear antes das curvas fechadas.
// Agora com relevo: subida freia, descida embala, e numa lombada rápida o kart voa (no ar não acelera nem vira muito).
const GRAV = 160;
// os poderes do Mario Kart (corrida-itens.js): encolhido pelo raio, o carro fica com 72% da velocidade final e menos
// força; de bala, segue a pista sozinho a 145% dela (os mesmos números dos robôs, em corrida-robos.js)
const ENCOLHIDO = 0.72, BALA = 1.45;
export function physics(dt, spec = carOf(me())) {
  const c = race.car, tr = race.tr, go = sNow() >= race.startAt && !!me();
  if (!go) { c.v = c.vx = c.vy = 0; return; }
  const fr0 = trackFrame(tr, c.x, c.y, race.idx), road = Math.abs(fr0.lat) <= tr.W / 2 + 6, air = c.air;
  let fx = Math.cos(c.a), fy = Math.sin(c.a);
  let vf = c.vx * fx + c.vy * fy, vl = c.vx * -fy + c.vy * fx; // velocidade para a frente e de lado
  // VÁCUO: logo atrás de outro carro (até ~17 m, na mesma linha e mesma direção) o ar empurra menos e o carro anda
  // mais. Ficou no vácuo mais de 1 s e saiu de trás dele (para ultrapassar)? Ganha o ESTILINGUE, um empurrão curto.
  let draft = 0;
  if (!air && vf > 120) for (const gh of race.ghosts.values()) {
    const dx = gh.x - c.x, dy = gh.y - c.y, along = dx * fx + dy * fy, lat = Math.abs(-dx * fy + dy * fx);
    if (along < 22 || along > 170 || lat > 24 || Math.abs((gh.z || 0) - c.z) > 15 || Math.cos(gh.a - c.a) < 0.9) continue;
    draft = Math.max(draft, 1 - (along - 22) / 148);
  }
  race.draft += (draft - race.draft) * Math.min(1, dt * 4);
  if (race.draft > 0.35) race.draftT += dt; else { if (race.draftT > 1 && race.draft < 0.2) { race.sling = 1.2; Sound.sling(); } race.draftT = 0; }
  race.sling = Math.max(0, race.sling - dt);
  const outros = [...race.ghosts.values()].filter((gh) => Number.isFinite(gh.prog));
  const lider = Math.max(myProg(), ...outros.map((gh) => gh.prog));
  const m = me(), ultima = m && E.S && m.laps >= E.S.config.voltas - 1;
  const catchup = outros.length ? ajudaDePelotao(myProg() / tr.n, lider / tr.n, ultima ? race.idx / tr.n : 0, E.S.config.equilibrio !== false) : 0;
  race.catchup = catchup;
  const boostAtivo = (m && m.boostUntil > sNow()) || race.boostUntil > sNow();
  const estrelaAtiva = m && m.starUntil > sNow();
  const bala = (m && m.balaUntil > sNow()) || race.balaUntil > sNow(), pequeno = !bala && m && m.shrinkUntil > sNow();
  const boostK = bala ? BALA : (1 + 0.12 * race.draft + (race.sling > 0 ? 0.08 : 0) + catchup + (boostAtivo ? 0.18 : 0) + (estrelaAtiva ? 0.12 : 0)) * (pequeno ? ENCOLHIDO : 1);
  const vmax = (road ? spec.vmax : spec.offMax) * boostK;
  // câmbio: no automático a marcha só acompanha (som e painel); no manual ela manda na força e no corte de giro
  const manual = E.S && E.S.config.cambio === "manual", vmaxF1 = spec.vmax * boostK;
  race.marcha = manual ? Math.max(1, Math.min(NUM, race.marcha || 1)) : marchaAuto(vf, vmaxF1, race.marcha);
  race.rpm = rotacao(vf, vmaxF1, race.marcha);
  const forca = manual ? torque(race.rpm) : 1;
  if (!air) {
    if (keys.gas) vf += (vf < 0 ? spec.brake : forca * spec.acc * (1 + race.draft * 0.6 + (race.sling > 0 ? 0.8 : 0) + catchup * 2 + (boostAtivo ? 0.8 : 0) + (estrelaAtiva ? 0.4 : 0)) * (1 - 0.8 * Math.pow(Math.max(0, vf) / (spec.vmax * boostK), 1.6))) * dt; // arranca forte, demora a chegar no topo
    else if (keys.brake) vf -= (vf > 0 ? spec.brake : 120) * dt;
    else vf -= Math.sign(vf) * Math.min(Math.abs(vf), (70 + (manual && vf > 0 ? (NUM + 1 - race.marcha) * 18 : 0)) * dt); // no manual, marcha baixa segura o carro (freio-motor)
    if (vf > vmax) vf = Math.max(vmax, vf - (road ? window.Pistas.TURBO_SOLTA : 700) * dt); // acabou o turbo: solta aos poucos (fora da pista, na hora)
    if (manual && vf > topo(race.marcha, vmaxF1)) vf = Math.max(topo(race.marcha, vmaxF1), vf - 260 * dt); // corte de giro
    // ladeira: a gravidade puxa para baixo da pista
    const h1 = groundH(tr, c.x + fx * 10, c.y + fy * 10, race.idx), h0 = groundH(tr, c.x, c.y, race.idx);
    vf -= ((h1 - h0) / 10) * GRAV * 0.55 * dt;
  }
  vf = Math.max(-70, vf);
  if (!bala && (race.spinUntil > sNow() || (m && m.spinUntil > sNow()))) vf *= Math.exp(-dt * 2.2);
  // volante: gira o bico (só andando); a velocidade fica no mundo e é medida de novo no eixo novo do carro
  const steer = bala || race.spinUntil > sNow() || (m && m.spinUntil > sNow()) ? 0 : pad.on && pad.steer ? pad.steer : (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  c.steer += (steer - c.steer) * Math.min(1, dt * 10);
  const wx = fx * vf - fy * vl, wy = fy * vf + fx * vl;
  c.a += c.steer * spec.turn * Math.min(1, Math.abs(vf) / 90) * Math.sign(vf || 1) * dt * (air ? 0.35 : 1);
  fx = Math.cos(c.a); fy = Math.sin(c.a);
  vf = wx * fx + wy * fy; vl = wx * -fy + wy * fx;
  // de bala: o bico mira um ponto do meio da pista lá na frente e a velocidade vai para 145% da final, sem escorregar
  if (bala) {
    const alvo = tr.pts[(race.idx + 14) % tr.n];
    let d = Math.atan2(alvo.y - c.y, alvo.x - c.x) - c.a; d = Math.atan2(Math.sin(d), Math.cos(d));
    c.a += Math.max(-7 * dt, Math.min(7 * dt, d * 6 * dt)); c.steer = Math.max(-1, Math.min(1, d * 2));
    fx = Math.cos(c.a); fy = Math.sin(c.a);
    vf += (spec.vmax * BALA - vf) * Math.min(1, dt * 2.5); vl = 0;
  }
  // pneus: tiram até grip·dt da velocidade de lado; o resto escorrega e freia o carro (no ar, os pneus não seguram).
  // Nas regras de F1 o pneu gasta e esfria (f1-regras.js): a aderência dele multiplica a do carro.
  const pn = race.pneu ? window.F1Regras.aderencia(race.pneu) : null;
  if (!air && !bala) {
    const g = spec.grip * (pn ? pn.grip : 1) * (road ? 1 : 0.5) * (c.slip > 30 ? spec.kin * (pn ? pn.kin : 1) : 1) * dt;
    if (Math.abs(vl) <= g) vl = 0;
    else { vl -= Math.sign(vl) * g; vf -= Math.sign(vf) * Math.min(Math.abs(vf), spec.scrub * 3 * Math.abs(vl) * dt); }
  }
  c.vx = fx * vf - fy * vl; c.vy = fy * vf + fx * vl; c.v = vf; c.slip = air ? 0 : Math.abs(vl);
  // anda; no muro escorrega junto dele (o muro fica a uma distância fixa do meio da pista)
  let nx = c.x + c.vx * dt, ny = c.y + c.vy * dt;
  race.idx = nearest(tr, nx, ny, race.idx);
  const fr = trackFrame(tr, nx, ny, race.idx), lim = tr.wallLat - 8;
  // barreira de pneus: só do lado de fora das curvas fechadas (tr.pneus diz o lado de cada ponto)
  const pneu = tr.pneus && tr.pneus[race.idx], limite = pneu && Math.sign(fr.lat) === pneu ? tr.W / 2 + 26 : lim;
  if (Math.abs(fr.lat) > limite || nx < 2 || ny < 2 || nx > tr.t.world - 2 || ny > tr.t.world - 2) {
    const p = tr.pts[race.idx], s = Math.sign(fr.lat) || 1, over = Math.abs(fr.lat) - limite;
    if (over > 0) { nx -= p.nx * s * over; ny -= p.ny * s * over; }
    nx = Math.max(2, Math.min(tr.t.world - 2, nx)); ny = Math.max(2, Math.min(tr.t.world - 2, ny));
    const vn = c.vx * p.nx * s + c.vy * p.ny * s, hit = Math.abs(vn);
    // a batida tira a velocidade que ia contra o muro (com um quiquezinho) e, do resto, perde mais quanto mais de frente
    // bateu: de raspão segue quase igual. Encostado, só um atrito leve por segundo (antes era um tanto a cada quadro,
    // e raspar o muro parava o carro)
    if (vn > 0) { c.vx -= p.nx * s * vn * 1.2; c.vy -= p.ny * s * vn * 1.2; }
    const pancada = 1 - (1 - spec.wall) * 0.5 * Math.min(1, hit / 260) * (vn > 0 ? 1 : 0), raspa = Math.exp(-(1 - spec.wall) * 0.7 * dt);
    c.vx *= pancada * raspa; c.vy *= pancada * raspa;
    if (hit > 60) { Sound.bump(); race.shake = 0.25; race.bumps = (race.bumps || 0) + 1; }
  }
  if (race.pneu) window.F1Regras.gastarPneu(race.pneu, { dist: Math.hypot(nx - c.x, ny - c.y), total: (E.S.config.voltas || 1) * tr.n * 6, slip: c.slip, v: vf, vmax: spec.vmax, dt });
  c.x = nx; c.y = ny;
  // Balizadores flexíveis reagem ao toque e voltam sozinhos; não bloqueiam o carro.
  if (tr.cones && Math.abs(c.v) > 25) for (const cone of tr.cones) {
    if (cone.cooldown > sNow() || Math.hypot(c.x - cone.x, c.y - cone.y) > 16 || Math.abs(c.z - cone.h) > 14) continue;
    cone.hit = 1; cone.dir = c.a; cone.cooldown = sNow() + 3000; Sound.pop();
  }
  // batida com os outros carros (cada um empurra o outro; quem está em outro nível, viaduto ou no ar, passa por cima)
  if (!air) for (const [id, gh] of race.ghosts) {
    if (Math.abs((gh.z || 0) - c.z) > 12 || !me()) continue;
    const pl = P(id), outro = CARS3[pl && pl.car] || CARS3.equilibrado;
    const eu = { x: c.x, y: c.y, a: c.a, vx: c.vx, vy: c.vy, L: (CARS3[me().car] || CARS3.equilibrado).L * KS, W: (CARS3[me().car] || CARS3.equilibrado).W * KS, massa: MASSA[me().car] || 1 };
    const forca = baterNoOutro(eu, { x: gh.x, y: gh.y, a: gh.a, v: gh.v || 0, L: outro.L * KS, W: outro.W * KS, massa: MASSA[pl && pl.car] || 1 });
    if (forca > 0 || eu.x !== c.x || eu.y !== c.y) {
      c.x = eu.x; c.y = eu.y; c.vx = eu.vx; c.vy = eu.vy;
      const f = Math.cos(c.a), g = Math.sin(c.a); c.v = c.vx * f + c.vy * g;
      if (forca > 40 && (race.hitT || 0) <= 0) { Sound.crash(forca); race.shake = Math.max(race.shake, Math.min(0.3, forca / 500)); race.hitT = 0.25; }
    }
  }
  race.hitT = Math.max(0, (race.hitT || 0) - dt);
  // altura: no chão acompanha o relevo; se o chão some (lombada rápida), voa e cai com a gravidade
  const gh = groundH(tr, c.x, c.y, race.idx);
  if (c.air) {
    c.vz -= GRAV * dt; c.z += c.vz * dt;
    if (c.z <= gh) { const hard = -c.vz; c.z = gh; c.vz = 0; c.air = false; if (hard > 60) { Sound.bump(); race.shake = Math.min(0.35, hard / 400); race.land = 0.3; } }
  } else if (gh < c.z - 2.5) { c.air = true; c.vz = Math.max(0, c.gvz || 0); c.z += c.vz * dt; }
  else { c.gvz = Math.max(-400, Math.min(400, (gh - c.z) / Math.max(dt, 1e-3))); c.z = gh; }
  race.offroad = !road && !c.air && Math.abs(vf) > 30;
  // checkpoints (como no Forza): o próximo só vale passando por ele, perto da pista e na ordem. Passou direto (cortou
  // caminho)? Fica "perdido" até voltar nele, e o "↺ Pista" leva de volta para ele.
  const prox = (race.sector + 1) % SECTORS, gi = checkpoint(prox, tr.n), depois = (race.idx - gi + tr.n) % tr.n;
  if (depois < 30 && Math.abs(fr.lat) < tr.W / 2 + 70) {
    race.sector = prox; race.cpT = sNow(); act2("sector", { s: prox });
    if (prox === 0) { if (race.largou) race.voltaLocal = (race.voltaLocal || 0) + 1; race.largou = true; } // a volta já conta aqui (o servidor confirma depois)
  }
  race.perdeu = depois >= 30 && depois < tr.n / 3 ? prox : -1;
  const p = tr.pts[race.idx], dot = Math.cos(c.a) * p.tx + Math.sin(c.a) * p.ty;
  race.wrong = dot < -0.3 && c.v > 40 ? race.wrong + dt : 0;
}
// setor: manda sem esperar e sem mostrar erro (o servidor ignora o que não vale)
function act2(type, data) { socket.emit("act", { type, ...data }, () => {}); }
