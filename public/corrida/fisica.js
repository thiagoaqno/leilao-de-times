// Corrida da Galera — a física do kart (arcade com aderência e relevo).
import { SECTORS, carOf, socket, sNow, me } from "./estado.js";
import { Sound } from "./sons.js";
import { trackFrame, groundH } from "./pista.js";
import { race, keys, nearest } from "./jogo.js";
import { pad } from "./controles.js";

// Física do kart (arcade com aderência): o carro tem inércia e os pneus só seguram uma certa força de lado.
// Virar gira o bico, mas a velocidade continua indo para onde ia; os pneus puxam o carro para a nova direção até o
// limite de aderência (grip). Entrou rápido demais, o que sobra vira escorregão para fora da curva, que come
// velocidade (scrub) e leva o kart para a grama ou para o muro. Por isso tem que frear antes das curvas fechadas.
// Agora com relevo: subida freia, descida embala, e numa lombada rápida o kart voa (no ar não acelera nem vira muito).
const GRAV = 160;
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
  const boostK = 1 + 0.12 * race.draft + (race.sling > 0 ? 0.08 : 0);
  const vmax = (road ? spec.vmax : spec.offMax) * boostK;
  if (!air) {
    if (keys.gas) vf += (vf < 0 ? spec.brake : spec.acc * (1 + race.draft * 0.6 + (race.sling > 0 ? 0.8 : 0)) * (1 - 0.8 * Math.pow(Math.max(0, vf) / (spec.vmax * boostK), 1.6))) * dt; // arranca forte, demora a chegar no topo
    else if (keys.brake) vf -= (vf > 0 ? spec.brake : 120) * dt;
    else vf -= Math.sign(vf) * Math.min(Math.abs(vf), 70 * dt);
    if (vf > vmax) vf = Math.max(vmax, vf - (road ? 300 : 700) * dt);
    // ladeira: a gravidade puxa para baixo da pista
    const h1 = groundH(tr, c.x + fx * 10, c.y + fy * 10, race.idx), h0 = groundH(tr, c.x, c.y, race.idx);
    vf -= ((h1 - h0) / 10) * GRAV * 0.55 * dt;
  }
  vf = Math.max(-70, vf);
  // volante: gira o bico (só andando); a velocidade fica no mundo e é medida de novo no eixo novo do carro
  const steer = pad.on && pad.steer ? pad.steer : (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  c.steer += (steer - c.steer) * Math.min(1, dt * 10);
  const wx = fx * vf - fy * vl, wy = fy * vf + fx * vl;
  c.a += c.steer * spec.turn * Math.min(1, Math.abs(vf) / 90) * Math.sign(vf || 1) * dt * (air ? 0.35 : 1);
  fx = Math.cos(c.a); fy = Math.sin(c.a);
  vf = wx * fx + wy * fy; vl = wx * -fy + wy * fx;
  // pneus: tiram até grip·dt da velocidade de lado; o resto escorrega e freia o carro (no ar, os pneus não seguram)
  if (!air) {
    const g = spec.grip * (road ? 1 : 0.5) * (c.slip > 30 ? spec.kin : 1) * dt;
    if (Math.abs(vl) <= g) vl = 0;
    else { vl -= Math.sign(vl) * g; vf -= Math.sign(vf) * Math.min(Math.abs(vf), spec.scrub * 3 * Math.abs(vl) * dt); }
  }
  c.vx = fx * vf - fy * vl; c.vy = fy * vf + fx * vl; c.v = vf; c.slip = air ? 0 : Math.abs(vl);
  // anda; no muro escorrega junto dele (o muro fica a uma distância fixa do meio da pista)
  let nx = c.x + c.vx * dt, ny = c.y + c.vy * dt;
  race.idx = nearest(tr, nx, ny, race.idx);
  const fr = trackFrame(tr, nx, ny, race.idx), lim = tr.wallLat - 8;
  if (Math.abs(fr.lat) > lim || nx < 2 || ny < 2 || nx > tr.t.world - 2 || ny > tr.t.world - 2) {
    const p = tr.pts[race.idx], s = Math.sign(fr.lat) || 1, over = Math.abs(fr.lat) - lim;
    if (over > 0) { nx -= p.nx * s * over; ny -= p.ny * s * over; }
    nx = Math.max(2, Math.min(tr.t.world - 2, nx)); ny = Math.max(2, Math.min(tr.t.world - 2, ny));
    const vn = c.vx * p.nx * s + c.vy * p.ny * s, hit = Math.abs(vn);
    if (vn > 0) { c.vx -= p.nx * s * vn * 1.25; c.vy -= p.ny * s * vn * 1.25; }
    c.vx *= spec.wall + (1 - spec.wall) * 0.6; c.vy *= spec.wall + (1 - spec.wall) * 0.6;
    if (hit > 60) { Sound.bump(); race.shake = 0.25; race.bumps = (race.bumps || 0) + 1; }
  }
  c.x = nx; c.y = ny;
  // altura: no chão acompanha o relevo; se o chão some (lombada rápida), voa e cai com a gravidade
  const gh = groundH(tr, c.x, c.y, race.idx);
  if (c.air) {
    c.vz -= GRAV * dt; c.z += c.vz * dt;
    if (c.z <= gh) { const hard = -c.vz; c.z = gh; c.vz = 0; c.air = false; if (hard > 60) { Sound.bump(); race.shake = Math.min(0.35, hard / 400); race.land = 0.3; } }
  } else if (gh < c.z - 2.5) { c.air = true; c.vz = Math.max(0, c.gvz || 0); c.z += c.vz * dt; }
  else { c.gvz = Math.max(-400, Math.min(400, (gh - c.z) / Math.max(dt, 1e-3))); c.z = gh; }
  race.offroad = !road && !c.air && Math.abs(vf) > 30;
  // progresso na pista, setores e contramão
  const sec = Math.floor(race.idx / (tr.n / SECTORS));
  if (sec === (race.sector + 1) % SECTORS) { race.sector = sec; act2("sector", { s: sec }); }
  const p = tr.pts[race.idx], dot = Math.cos(c.a) * p.tx + Math.sin(c.a) * p.ty;
  race.wrong = dot < -0.3 && c.v > 40 ? race.wrong + dt : 0;
}
// setor: manda sem esperar e sem mostrar erro (o servidor ignora o que não vale)
function act2(type, data) { socket.emit("act", { type, ...data }, () => {}); }
