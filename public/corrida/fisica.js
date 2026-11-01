// Corrida da Galera — a física do carro. Nas regras de F1 vale a dinâmica nova (dinamica.js e sim.js, a 120 passos por segundo,
// prevista aqui e mandada pelo servidor; o fim deste arquivo); nas outras salas, a física arcade de sempre (`physics`, abaixo),
// agora também em passo fixo, para quem tem mais quadros por segundo não andar mais rápido.
import { SECTORS, E, carOf, socket, sNow, tempoReal, me, P, checkpoint, toast } from "./estado.js";
import { Sound } from "./sons.js";
import { atualizarClima } from "./clima.js";
import { trackFrame, groundH } from "./pista.js";
import { race, keys, nearest } from "./jogo.js";
import { pad, direcao } from "./controles.js";
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
  // nas regras de F1 o carro já anda antes das luzes apagarem (a largada queimada: o servidor dá +5 s); nas outras, só depois da contagem
  const c = race.car, tr = race.tr, go = sNow() >= race.startAt && !!me();
  if (!go) { c.v = c.vx = c.vy = 0; return; } // (o carro só anda depois das luzes apagarem; queimar a largada é punido pelo servidor)
  // regras de F1: a perda total retira o carro da disputa e o torna não sólido para os demais
  if (me().dnf) { c.v = c.vx = c.vy = 0; return; }
  const fr0 = trackFrame(tr, c.x, c.y, race.idx), superficie = tr.t.superficieEscape ? window.Pistas.superficieEscape(tr, race.idx, fr0.lat) : (Math.abs(fr0.lat) <= tr.W / 2 + 6 ? "asfalto" : "grama"), road = superficie === "asfalto", air = c.air;
  let fx = Math.cos(c.a), fy = Math.sin(c.a);
  let vf = c.vx * fx + c.vy * fy, vl = c.vx * -fy + c.vy * fx; // velocidade para a frente e de lado
  // VÁCUO: logo atrás de outro carro (até ~17 m, na mesma linha e mesma direção) o ar empurra menos e o carro anda
  // mais. Ficou no vácuo mais de 1 s e saiu de trás dele (para ultrapassar)? Ganha o ESTILINGUE, um empurrão curto.
  let draft = 0;
  if (!air && vf > 120) for (const [id, gh] of race.ghosts) {
    if (P(id)?.dnf) continue;
    const dx = gh.x - c.x, dy = gh.y - c.y, along = dx * fx + dy * fy, lat = Math.abs(-dx * fy + dy * fx);
    if (along < 22 || along > 170 || lat > 24 || Math.abs((gh.z || 0) - c.z) > 15 || Math.cos(gh.a - c.a) < 0.9) continue;
    draft = Math.max(draft, 1 - (along - 22) / 148);
  }
  race.draft += (draft - race.draft) * Math.min(1, dt * 4);
  // o estilingue é do modo arcade: nas regras de F1 o vácuo é o de verdade (F1Regras.vacuoF1) e quem decide é o DRS
  if (race.pneu) race.draftT = 0;
  else if (race.draft > 0.35) race.draftT += dt; else { if (race.draftT > 1 && race.draft < 0.2) { race.sling = 1.2; Sound.sling(); } race.draftT = 0; }
  race.sling = Math.max(0, race.sling - dt);
  const outros = [...race.ghosts].filter(([id, gh]) => !P(id)?.dnf && Number.isFinite(gh.prog)).map(([, gh]) => gh);
  const lider = Math.max(myProg(), ...outros.map((gh) => gh.prog));
  const m = me(), ultima = m && E.S && m.laps >= E.S.config.voltas - 1;
  const catchup = outros.length ? ajudaDePelotao(myProg() / tr.n, lider / tr.n, ultima ? race.idx / tr.n : 0, E.S.config.equilibrio !== false) : 0;
  race.catchup = catchup;
  const boostAtivo = (m && m.boostUntil > sNow()) || race.boostUntil > sNow();
  const estrelaAtiva = m && m.starUntil > sNow();
  const bala = (m && m.balaUntil > sNow()) || race.balaUntil > sNow(), pequeno = !bala && m && m.shrinkUntil > sNow();
  const F1 = window.F1Regras, pn = race.pneu ? F1.aderencia(race.pneu) : null;
  const dano = pn ? F1.efeitoDoDano(m && m.dano) : null; // cada 1% de dano reduz os atributos do carro em 1%
  const dirProva = E.S?.direcao, setor = Math.floor(race.idx / (tr.n / SECTORS));
  const zona = F1.zonaDRS(race.idx / tr.n, tr.t.drs), amarela = dirProva?.amarelo?.setor === setor;
  const drs = !!(pn && m && m.drsZona === zona && zona >= 0 && !keys.brake && !amarela && !dirProva?.safety);
  const ers = race.ers;
  if (ers) F1.carregarErs(ers, dt, keys.brake && vf > 40, !keys.gas, m?.laps || 0);
  const ersAuto = E.S?.config.ers !== "manual";
  const usarErs = !!(ers && keys.gas && !dirProva?.safety && (ersAuto ? F1.usarErsAuto(ers.carga, vf, spec.vmax, (tr.pts[race.idx].k || 0) < 1e-4, race.draft > 0.25) : keys.ers));
  const ersAtivo = ers ? F1.gastarErs(ers, dt, usarErs, !ersAuto || race.draft > 0.25) : false;
  race.drsAtivo = drs; race.ersAtivo = ersAtivo;
  const curva = (tr.pts[race.idx].k || 0) > 1 / 600, vac = pn ? F1.vacuoF1(race.draft, curva) : null; // nas regras de F1: vácuo na reta, ar sujo na curva
  race.arSujo = vac ? 1 - vac.aderencia : 0;
  const aero = pn ? Math.min(F1.AERO_MAX, vac.final + (drs ? 0.05 * (spec.drs ?? 1) : 0) + (ersAtivo ? 0.03 : 0)) : 0.12 * race.draft + (race.sling > 0 ? 0.08 : 0);
  const boostK = bala ? BALA : (1 + aero + catchup + (boostAtivo ? 0.18 : 0) + (estrelaAtiva ? 0.12 : 0)) * (pequeno ? ENCOLHIDO : 1);
  const bandeiraLimite = dirProva?.safety ? 0.54 : amarela ? 0.82 : 1;
  const vmax = (road ? spec.vmax * (pn?.final || 1) * (dano?.final || 1) : spec.offMax) * Math.min(boostK, bandeiraLimite);
  // câmbio: no automático a marcha só acompanha (som e painel); no manual ela manda na força e no corte de giro
  const manual = E.S && E.S.config.cambio === "manual", vmaxF1 = spec.vmax * boostK * (pn?.final || 1) * (dano?.final || 1);
  race.marcha = manual ? Math.max(1, Math.min(NUM, race.marcha || 1)) : marchaAuto(vf, vmaxF1, race.marcha);
  race.rpm = rotacao(vf, vmaxF1, race.marcha);
  const forca = manual ? torque(race.rpm) : 1;
  if (!air) {
    if (keys.gas) vf += (vf < 0 ? spec.brake : forca * spec.acc * (pn?.tracao || 1) * (dano?.tracao || 1) * (1 + (vac ? vac.acel : race.draft * 0.6 + (race.sling > 0 ? 0.8 : 0)) + catchup * 2 + (boostAtivo ? 0.8 : 0) + (estrelaAtiva ? 0.4 : 0) + (ersAtivo ? 0.25 : 0)) * (1 - 0.8 * Math.pow(Math.max(0, vf) / (spec.vmax * boostK), 1.6))) * dt; // arranca forte, demora a chegar no topo
    else if (keys.brake) vf -= (vf > 0 ? spec.brake * (pn?.freio || 1) * (dano?.freio || 1) : 120) * dt;
    else vf -= Math.sign(vf) * Math.min(Math.abs(vf), (70 + (manual && vf > 0 ? (NUM + 1 - race.marcha) * 18 : 0)) * dt); // no manual, marcha baixa segura o carro (freio-motor)
    if (vf > vmax) vf = dirProva?.safety || amarela ? Math.max(vmax, vf - spec.brake * dt) : Math.max(vmax, vf - (road ? window.Pistas.TURBO_SOLTA : 700) * dt); // sob bandeira reduz de verdade
    if (manual && vf > topo(race.marcha, vmaxF1)) vf = Math.max(topo(race.marcha, vmaxF1), vf - 260 * dt); // corte de giro
    // ladeira: a gravidade puxa para baixo da pista
    const h1 = groundH(tr, c.x + fx * 10, c.y + fy * 10, race.idx), h0 = groundH(tr, c.x, c.y, race.idx);
    vf -= ((h1 - h0) / 10) * GRAV * 0.55 * dt;
  }
  vf = Math.max(-70, vf);
  if (!bala && (race.spinUntil > sNow() || (m && m.spinUntil > sNow()))) vf *= Math.exp(-dt * 2.2);
  // volante: gira o bico (só andando); a velocidade fica no mundo e é medida de novo no eixo novo do carro
  const steer = bala || race.spinUntil > sNow() || (m && m.spinUntil > sNow()) ? 0 : direcao();
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
  if (!air && !bala) {
    const g = spec.grip * (pn ? pn.grip : 1) * (dano?.grip || 1) * (1 - (race.arSujo || 0)) * (road ? 1 : superficie === "brita" ? 0.35 : 0.5) * (c.slip > 30 ? spec.kin * (pn ? pn.kin : 1) : 1) * dt;
    if (Math.abs(vl) <= g) vl = 0;
    else { vl -= Math.sign(vl) * g; vf -= Math.sign(vf) * Math.min(Math.abs(vf), spec.scrub * 3 * Math.abs(vl) * dt); }
  }
  c.vx = fx * vf - fy * vl; c.vy = fy * vf + fx * vl; c.v = vf; c.slip = air ? 0 : Math.abs(vl);
  // anda; no muro escorrega junto dele (o muro fica a uma distância fixa do meio da pista)
  let nx = c.x + c.vx * dt, ny = c.y + c.vy * dt;
  race.idx = nearest(tr, nx, ny, race.idx);
  const fr = trackFrame(tr, nx, ny, race.idx), lim = tr.wallLat - (tr.t.muroFolga ?? 8);
  // barreira de pneus: só do lado de fora das curvas fechadas (tr.pneus diz o lado de cada ponto)
  const pneu = tr.pneus && tr.pneus[race.idx], ladoMuro = Math.sign(fr.lat) || 1;
  const limite = Math.min(window.Pistas.limiteViaduto(tr.t, tr.n, race.idx, tr.W), tr.murosEscape?.[ladoMuro]?.[race.idx] ? tr.W / 2 + tr.murosEscape[ladoMuro][race.idx] - (tr.t.muroFolga ?? 8) : pneu && ladoMuro === pneu ? tr.W / 2 + 26 : lim);
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
    if (vn > 0) avisarBatida(hit, "muro");
  }
  for (const o of tr.obstaculos || []) { // os obstáculos sólidos da pista (o canteiro do grampo de Mônaco): a mesma conta de sim.js, para o jogo clássico
    const dx = nx - o.x, dy = ny - o.y, d = Math.hypot(dx, dy) || 1, R = o.r + 11;
    if (d >= R) continue;
    const ux = dx / d, uy = dy / d, contra = -(c.vx * ux + c.vy * uy), hit = Math.abs(contra);
    nx = o.x + ux * R; ny = o.y + uy * R;
    if (contra > 0) { c.vx += ux * contra * 1.2; c.vy += uy * contra * 1.2; }
    const pancada = 1 - (1 - spec.wall) * 0.5 * Math.min(1, hit / 260) * (contra > 0 ? 1 : 0), raspa = Math.exp(-(1 - spec.wall) * 0.7 * dt);
    c.vx *= pancada * raspa; c.vy *= pancada * raspa;
    if (hit > 60) { Sound.bump(); race.shake = 0.25; race.bumps = (race.bumps || 0) + 1; }
    if (contra > 0) avisarBatida(hit, "muro");
  }
  if (race.pneu) window.F1Regras.gastarPneu(race.pneu, { dist: Math.hypot(nx - c.x, ny - c.y), volta: tr.n * 6, slip: c.slip, travada: c.travada, patina: c.patina, v: vf, vmax: spec.vmax, dt, fator: spec.desgaste });
  c.x = nx; c.y = ny;
  // Balizadores flexíveis reagem ao toque e voltam sozinhos; não bloqueiam o carro.
  if (tr.cones && Math.abs(c.v) > 25) for (const cone of tr.cones) {
    if (cone.cooldown > sNow() || Math.hypot(c.x - cone.x, c.y - cone.y) > 16 || Math.abs(c.z - cone.h) > 14) continue;
    cone.hit = 1; cone.dir = c.a; cone.cooldown = sNow() + 3000; Sound.pop();
  }
  // batida com os outros carros (cada um empurra o outro; quem está em outro nível, viaduto ou no ar, passa por cima)
  // quem já recebeu a bandeirada é fantasma: não bate em ninguém, ninguém bate nele, e o carro desacelera sozinho
  const acabou = !!(me() && me().finish != null);
  if (acabou && vf > spec.vmax * 0.25) { c.vx -= (c.vx / Math.max(1, Math.hypot(c.vx, c.vy))) * spec.brake * 0.25 * dt; c.vy -= (c.vy / Math.max(1, Math.hypot(c.vx, c.vy))) * spec.brake * 0.25 * dt; c.v = c.vx * Math.cos(c.a) + c.vy * Math.sin(c.a); }
  if (!air && !race.quali && !acabou) for (const [id, gh] of race.ghosts) { // na classificação não tem batida (cada um faz a sua volta)
    if (P(id)?.dnf || P(id)?.finish != null) continue;
    if (Math.abs((gh.z || 0) - c.z) > 12 || !me()) continue;
    const pl = P(id), outro = CARS3[pl && pl.car] || CARS3.equilibrado;
    const eu = { x: c.x, y: c.y, a: c.a, vx: c.vx, vy: c.vy, L: (CARS3[me().car] || CARS3.equilibrado).L * KS, W: (CARS3[me().car] || CARS3.equilibrado).W * KS, massa: MASSA[me().car] || 1 };
    const forca = baterNoOutro(eu, { x: gh.x, y: gh.y, a: gh.a, v: gh.v || 0, L: outro.L * KS, W: outro.W * KS, massa: MASSA[pl && pl.car] || 1 });
    if (forca > 0 || eu.x !== c.x || eu.y !== c.y) {
      c.x = eu.x; c.y = eu.y; c.vx = eu.vx; c.vy = eu.vy;
      const f = Math.cos(c.a), g = Math.sin(c.a); c.v = c.vx * f + c.vy * g;
      avisarBatida(forca, "carro");
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
  setores(tr, fr, dt);
}
// regras de F1: diz ao servidor que bati e com que força (a punição e o dano saem de lá; o servidor confere e segura
// um intervalo entre uma batida e outra, o mesmo daqui)
function avisarBatida(forca, tipo) {
  const F1 = window.F1Regras;
  if (!race.pneu || !(forca >= F1.BATIDA_MIN) || (race.batidaT || 0) > sNow()) return;
  race.batidaT = sNow() + F1.BATIDA_INTERVALO;
  act2("batida", { forca: Math.round(forca), tipo });
}
// checkpoints (como no Forza): o próximo só vale passando por ele, perto da pista e na ordem. Passou direto (cortou
// caminho)? Fica "perdido" até voltar nele, e o "↺ Pista" leva de volta para ele.
function setores(tr, fr, dt) {
  const c = race.car, prox = (race.sector + 1) % SECTORS, gi = checkpoint(prox, tr.n), depois = (race.idx - gi + tr.n) % tr.n;
  // passou pelo checkpoint: pelo índice perto dele ou, mais firme, cruzando o portão (o índice dá pulos na beirada e nos grampos)
  const ant = race.spAnt; race.spAnt = { x: c.x, y: c.y };
  const cruzou = ant && window.Pistas.cruzouSetor(tr.pts, tr.n, prox, ant.x, ant.y, c.x, c.y, c.z, tr.W / 2 + 70);
  if ((depois < 30 && Math.abs(fr.lat) < tr.W / 2 + 70) || cruzou) {
    race.sector = prox; race.cpT = sNow(); act2("sector", { s: prox });
    if (prox === 0) { if (race.largou) race.voltaLocal = (race.voltaLocal || 0) + 1; race.largou = true; } // a volta já conta aqui (o servidor confirma depois)
  }
  race.perdeu = !cruzou && depois >= 30 && depois < tr.n / 3 ? prox : -1;
  const p = tr.pts[race.idx], dot = Math.cos(c.a) * p.tx + Math.sin(c.a) * p.ty;
  race.wrong = dot < -0.3 && c.v > 40 ? race.wrong + dt : 0;
}
// setor: manda sem esperar e sem mostrar erro (o servidor ignora o que não vale)
function act2(type, data) { socket.emit("act", { type, ...data }, () => {}); }

// ====================================================================================================================
// A física nova (regras de F1): dinamica.js e sim.js, a 120 passos por segundo.
// O navegador PREVÊ o próprio carro com a mesma física do servidor, para o volante responder na hora, e o servidor é a
// AUTORIDADE: ele recebe as entradas de cada passo (`inp`), anda o carro e devolve o estado verdadeiro (`ack`). Quando o
// `ack` chega, o navegador volta ao estado do servidor naquele passo e reaplica as entradas que o servidor ainda não
// confirmou; a diferença entre onde o carro estava e onde ele fica vira um desvio só do desenho, que se apaga em ~0,15 s
// (nada de tranco). Só um erro enorme (mais de Sim.ERRO_SALTO unidades) faz o carro saltar.
// Nada aqui depende do tempo do quadro: o acumulador gasta o tempo em passos de 1/120 s.
// ====================================================================================================================
export const PASSO = 1 / 120, MAX_ACUM = 0.25, MASCARA = 1023; // guarda as últimas 1024 entradas (8,5 s) para reaplicar
export function criarRede() {
  return { cod: new Int32Array(MASCARA + 1), hx: new Float64Array(MASCARA + 1), hy: new Float64Array(MASCARA + 1), enviado: 0, ack: 0, ultimoEnvio: 0, ex: 0, ey: 0, ea: 0, erro: 0, acks: 0, saltos: 0,
    tf: new Float64Array(MASCARA + 1), // a hora do servidor (ms) em que cada passo terminou, pelo relógio NTP (rede.js): vai no `inp` e é a hora em que os outros carros são lidos
    ct: [] };     // as batidas que previ e o servidor ainda não confirmou: { id, k, k0, reg, carry }
}
// A HORA DOS PASSOS. O meu carro anda no tempo real (a física gasta o relógio em passos de 1/120 s), então a hora do servidor em que o passo
// terminou é o relógio NTP (estado.js, tempoReal) menos o que sobrou no acumulador. Os outros carros são lidos NESSA hora (pose.js, a mesma conta
// do desenho em rede.js, updateGhosts) e o servidor também olha o meu carro e os outros nela (`tt` do `inp`): os dois lados veem o mesmo
// instante, qualquer que seja o ping de cada piloto.
const AMB = { outros: [] }, ENT = {}, ENT_C = {}, EV = [];
// o ambiente do passo: tudo o que a física precisa saber do jogo (o servidor monta o mesmo)
function montarAmbiente(R) {
  const S = E.S, m = me(), d = S.direcao;
  AMB.spec = carOf(m); AMB.manual = S.config.cambio === "manual"; AMB.dano = m.dano || 0; AMB.drsZona = m.drsZona ?? -1;
  AMB.safety = !!(d && d.safety); AMB.setorAmarelo = d && d.amarelo ? d.amarelo.setor : -1; AMB.ersAuto = S.config.ers !== "manual";
  AMB.voltas = S.config.voltas; AMB.laps = m.laps || 0; AMB.paradas = m.paradas || 0; AMB.semente = S.semente; AMB.id = m.id; AMB.grid = m.grid;
  AMB.finish = m.finish; AMB.dnf = !!m.dnf; AMB.quali = S.phase === "quali"; AMB.fantasma = m.finish != null; AMB.f1 = true;
  AMB.jogos = m.jogos || null; // (os jogos de pneu: a recomendação do menu do box)
  AMB.stopGo = m.stopGo ? m.stopGo.s : 0; // stop-and-go pendente: a próxima visita ao box é só ele (o servidor usa a mesma conta)
  AMB.agua = atualizarClima().agua; // a água na pista agora (o servidor usa a mesma conta, pelo mesmo relógio)
  // a batida só vale para quem corre (nada na classificação, sob safety car, no box, depois da bandeirada ou fora da corrida)
  AMB.batida = S.phase === "race" && !AMB.safety && !AMB.segurar && m.finish == null && !m.dnf && !(R.car.box && R.car.box.fase) && !m.fantBox;
  { const [L, W] = window.Sim.dimensoes(m.car); EU.L = L; EU.W = W; EU.massa = window.Sim.massaDe(AMB.spec); }
  const outros = AMB.outros; outros.length = 0;
  for (const [id, gh] of R.ghosts) { const p = P(id); outros.push({ x: gh.x, y: gh.y, z: gh.z, a: gh.a, dnf: !!(p && p.dnf), fant: !!(p && p.finish != null) }); }
  return AMB;
}
// os outros carros como o fim do meu passo os vê: a mesma pose do desenho (pose.js, Outro.pose), lida na hora do servidor em que o passo termina.
// `folga`: a previsão de batida só vale com os carros enterrados mais que isto (u), tanto quanto o erro que a previsão do outro carro costuma ter
// com o atraso desta rede (2 m por segundo de atraso, entre 10 e 40 cm): o navegador nunca bate onde o servidor, que vê a pose de verdade, não bateria.
const MODELOS = [], EU = { L: 44, W: 26, massa: 800 }, POSE = {}, M_POR_U = 0.75 / 3.6;
function outrosDoPasso(R, T) {
  let n = 0;
  for (const [id, gh] of R.ghosts) {
    const p = P(id); if (!p || p.dnf || p.finish != null || !gh.mod || !gh.mod.buf.length || p.fantBox) continue; // (fantBox: no box ou nos 2 s antes e depois dele, fantasma)
    const m = MODELOS[n] || (MODELOS[n] = {}); n++, gh.mod.pose(T, POSE);
    m.id = id; m.x = POSE.x; m.y = POSE.y; m.z = POSE.z; m.a = POSE.a; m.vx = POSE.vx; m.vy = POSE.vy; m.r = POSE.r;
    const [L, W] = window.Sim.dimensoes(p.car); m.L = L; m.W = W; m.massa = window.Sim.massaDe(carOf(p)); m.dnf = false; m.fant = false;
    m.folga = Math.max(0.1, Math.min(0.4, 2 * gh.mod.hz)) / M_POR_U;
  }
  MODELOS.length = n;
  return MODELOS;
}
// as batidas que previ e ainda não valeram no estado do servidor: reaplicadas quando o passo é refeito (emReplay) ou, se o servidor já
// passou do passo em que bati, no primeiro passo vivo depois (carry)
function agendadas(net, k, c, emReplay) {
  for (const e of net.ct) if (e.k === k && (emReplay || e.carry)) { window.Sim.aplicarContato(c, e.reg); e.carry = false; }
}
// as teclas (e o controle) deste passo
function lerEntrada(R) {
  ENT.gas = keys.gas ? 1 : 0; ENT.brake = keys.brake ? 1 : 0; ENT.ers = keys.ers ? 1 : 0;
  ENT.steer = direcao();
  ENT.pedido = R.pedidoBox || null; ENT.marcha = AMB.manual ? Math.max(1, Math.min(NUM, R.marcha || 1)) : 0;
  ENT.respawn = R.respawnPend ? 1 : 0; R.respawnPend = false;
  return ENT;
}
// um passo previsto
function passoF1(R) {
  const c = R.car, tr = R.tr, net = R.net, k = c.tick, S = window.Sim;
  const code = S.empacotar(lerEntrada(R));
  net.cod[k & MASCARA] = code;
  const ent = S.desempacotar(code, ENT_C); // a mesma entrada que o servidor vai ver (volante em 1/255)
  AMB.amarela = AMB.setorAmarelo === Math.floor(c.idx / (tr.n / SECTORS));
  AMB.segurar = sNow() < R.startAt;
  if (AMB.segurar) AMB.batida = false;
  EV.length = 0;
  S.passo(c, ent, AMB, tr, EV);
  // a batida com os outros carros, prevista na hora (empurrão e perda de velocidade imediatos; o servidor decide e corrige depois)
  if (AMB.batida) {
    const reg = S.novoRegistro(), n0 = EV.length;
    S.contatoPasso(c, EU, outrosDoPasso(R, net.tPasso), EV, reg);
    for (let i = n0; i < EV.length; i++) if (EV[i].t === "carro" && reg.forca >= window.Sim.FORCA_EV) { net.ct.push({ id: EV[i].id, k, k0: k, reg: { ...reg }, carry: false }); break; }
  }
  if (net.ct.length) agendadas(net, k, c, false);
  net.hx[(k + 1) & MASCARA] = c.x; net.hy[(k + 1) & MASCARA] = c.y; net.tf[(k + 1) & MASCARA] = net.tPasso;
  for (const e of EV) aoEvento(R, e);
  // Balizadores flexíveis reagem ao toque e voltam sozinhos; não bloqueiam o carro.
  if (tr.cones && Math.abs(c.v) > 25) for (const cone of tr.cones) {
    if (cone.cooldown > sNow() || Math.hypot(c.x - cone.x, c.y - cone.y) > 16 || Math.abs(c.z - cone.h) > 14) continue;
    cone.hit = 1; cone.dir = c.a; cone.cooldown = sNow() + 3000; Sound.pop();
  }
}
// o que o passo contou: som, tremida de câmera e as voltas que o navegador já sabe (o servidor confirma depois)
function aoEvento(R, e) {
  if (e.t === "bump") { Sound.bump(); R.shake = 0.25; R.bumps = (R.bumps || 0) + 1; }
  else if (e.t === "pouso") { Sound.bump(); R.shake = Math.min(0.35, e.forca / 400); R.land = 0.3; }
  else if (e.t === "setor") { R.cpT = sNow(); if (e.s === 0) { if (R.largou) R.voltaLocal = (R.voltaLocal || 0) + 1; R.largou = true; } }
  else if (e.t === "respawn") Sound.pop();
  else if (e.t === "boxParou" || e.t === "boxTrocou") Sound.pop();
  else if (e.t === "box" && e.fase === "sai") { R.pedidoBox = null; toast(`🔧 ${window.F1Regras.textoDaParada(R.car.box.parada)}`, 2400); }
  else if (e.t === "carro" && e.forca > 40 && (R.hitT || 0) <= 0) { Sound.crash(e.forca); R.shake = Math.max(R.shake, Math.min(0.3, e.forca / 500)); R.hitT = 0.25; }
}
// o que o resto do jogo (HUD, câmera, som) lê de `race`
function sincronizar(R) {
  const c = R.car;
  R.idx = c.idx; R.sector = c.sector; R.rpm = c.rpm; R.draft = c.draft; R.arSujo = c.arSujo; R.drsAtivo = c.drsAtivo; R.ersAtivo = c.ersAtivo;
  R.offroad = c.offroad; R.perdeu = c.perdeu; R.wrong = c.wrong; R.catchup = 0; R.sling = 0; R.draftT = 0;
  if (!AMB.manual) R.marcha = c.marcha;
  R.hitT = Math.max(0, (R.hitT || 0) - PASSO);
}
// os dados do passo anterior, para desenhar entre um passo e outro (sem isso, 144 quadros por segundo desenhariam o mesmo
// passo duas vezes e o carro andaria aos soquinhos)
function guardarAnterior(R) { const c = R.car, p = R.prev || (R.prev = {}); p.x = c.x; p.y = c.y; p.z = c.z; p.a = c.a; }
// o laço da física, uma vez por quadro: gasta o tempo `dt` em passos fixos
export function quadroDeFisica(dt) {
  const R = race, f1 = !!R.net, g = window.Sim.gastarTempo(R.acc || 0, dt, MAX_ACUM);
  R.acc = g.acc;
  if (f1) {
    montarAmbiente(R);
    const net = R.net, fim = tempoReal() - g.acc * 1000; // a hora do servidor em que o último passo deste quadro termina
    for (let i = 0; i < g.passos; i++) { net.tPasso = fim - (g.passos - 1 - i) * (PASSO * 1000); guardarAnterior(R); passoF1(R); }
    sincronizar(R); enviarEntradas(performance.now());
  } else for (let i = 0; i < g.passos; i++) { guardarAnterior(R); physics(PASSO); }
  atualizarVisual(dt, R.acc / PASSO);
}
// parado (fora da pista, resultados): o desenho só acompanha o estado
export function quadroParado(dt) { const R = race; R.acc = 0; if (R.net) sincronizar(R); atualizarVisual(dt, 1); }
// o carro como é DESENHADO: entre o passo anterior e o atual, mais o desvio que a correção do servidor deixou
export function atualizarVisual(dt, alpha) {
  const R = race, c = R.car, v = R.vis || (R.vis = {}), p = R.prev, net = R.net;
  Object.assign(v, c);
  if (p) {
    const k = Math.max(0, Math.min(1, alpha)); let da = c.a - p.a; da = Math.atan2(Math.sin(da), Math.cos(da));
    v.x = p.x + (c.x - p.x) * k; v.y = p.y + (c.y - p.y) * k; v.z = p.z + (c.z - p.z) * k; v.a = p.a + da * k;
  }
  if (net) {
    window.Sim.decairDesvio(net, dt);
    v.x += net.ex; v.y += net.ey; v.a += net.ea;
  }
}
// as entradas que o servidor ainda não recebeu, a cada ~30 ms, em pacotes de até 120 passos
export function enviarEntradas(agora) {
  const R = race, net = R.net, c = R.car; if (!net || !socket.connected) return;
  if (agora - net.ultimoEnvio < 30 && c.tick - net.enviado < 6) return;
  if (c.tick - net.enviado > MASCARA - 8) net.enviado = c.tick - (MASCARA - 8); // atrasado demais: o servidor pula o que não dá mais
  while (net.enviado < c.tick) {
    const n = Math.min(120, c.tick - net.enviado), k = new Array(n);
    for (let i = 0; i < n; i++) k[i] = net.cod[(net.enviado + i) & MASCARA];
    const tt = net.tf[(net.enviado + n) & MASCARA]; // (a hora do servidor em que o último passo do pacote terminou; sem ela o servidor usa a da chegada)
    socket.emit("inp", tt > 0 ? { s: R.startAt, t0: net.enviado, k, tt } : { s: R.startAt, t0: net.enviado, k });
    net.enviado += n;
  }
  net.ultimoEnvio = agora;
}
// a conexão voltou: reenvia tudo o que o servidor ainda não confirmou (ele ignora o que já tinha)
export function reenviarEntradas() { const R = race; if (R && R.net) R.net.enviado = R.net.ack; }
// O `ack` do servidor: o estado verdadeiro do meu carro depois de `st.tk` passos. Volta a ele e reaplica as entradas que
// o servidor ainda não tinha (as de st.tk até agora). O desenho não pula: a diferença vira um desvio que se apaga sozinho.
export function reconciliar(d) {
  const R = race, net = R && R.net, S = window.Sim;
  if (!net || !d || d.s !== R.startAt || !d.st || !E.S || !me()) return;
  const c = R.car, tk = d.st.tk;
  if (net.acks && tk <= net.ack) return; // um `ack` velho (chegou fora de ordem)
  net.acks++; net.ack = tk;
  // as batidas que o servidor confirmou saem da lista (já estão no estado dele); as que ele ainda não viu continuam
  const conf = [];
  if (d.ev) for (const e of d.ev) if (e.t === "carro") {
    const i = net.ct.findIndex((x) => x.id === e.id && x.k0 <= (e.k ?? tk) + 40);
    if (i >= 0) { net.ct.splice(i, 1); conf.push(e); }
  }
  for (let i = net.ct.length - 1; i >= 0; i--) { const e = net.ct[i]; if (tk - e.k0 > 40) net.ct.splice(i, 1); else if (e.k < tk) { e.k = tk; e.carry = true; } } // (o servidor já passou do passo em que bati: reaplica no primeiro passo daqui)
  montarAmbiente(R);
  const r = S.reconciliar(c, d.st, R.tr, { mascara: MASCARA, hx: net.hx, hy: net.hy, passo: (carro, k) => { // reaplica o que o servidor ainda não viu (sem som e sem eventos: já aconteceram)
    const ent = S.desempacotar(net.cod[k & MASCARA], ENT_C);
    AMB.amarela = AMB.setorAmarelo === Math.floor(carro.idx / (R.tr.n / SECTORS));
    AMB.segurar = sNow() < R.startAt;
    S.passo(carro, ent, AMB, R.tr, null);
    if (net.ct.length) agendadas(net, k, carro, true);
  } });
  net.erro = r.erro;
  if (!r.dentro) net.enviado = c.tick; // o servidor está fora do que lembramos (a página recarregou?): segue dele
  // o desvio do desenho: onde o carro aparecia menos onde ele ficou (se o erro for enorme, salta)
  if (r.erro > S.ERRO_SALTO) {
    net.ex = net.ey = net.ea = 0; net.saltos++;
    if (R.prev) { R.prev.x = c.x; R.prev.y = c.y; R.prev.z = c.z; R.prev.a = c.a; }
  } else {
    net.ex += r.dx; net.ey += r.dy; net.ea += r.da;
    if (R.prev) { R.prev.x -= r.dx; R.prev.y -= r.dy; R.prev.a -= r.da; } // (o passo anterior acompanha: o desenho entre os passos não pula)
  }
  sincronizar(R);
  if (d.ev) for (const e of d.ev) if (!conf.includes(e)) aoEvento(R, e); // (a batida que eu já previ já tocou e tremeu)
}
