// Corrida da Galera — a câmera aérea (id "cima"): um helicóptero de TV.
// Ela fica alta e atrás do carro, presa a ele por uma mola amortecida (sem tremer, sem chicotear), olha um ponto à frente na
// pista e gira devagar com as curvas. A altura e a distância crescem com a velocidade, e a lente é fechada o bastante para
// o quadro ficar na pista e nos carros por perto (o olhar nunca chega perto do horizonte, então o cenário longe não entra).
//
// Oclusão (algo entre a câmera e o carro): nada de raycast contra a cena inteira. Na primeira vez que a aérea é usada numa
// pista, um mapa de alturas do cenário alto (arquibancadas, prédios, passarelas, coberturas...) é montado aos poucos, uns
// 2,5 ms por quadro, a partir das malhas de `tr.grp` (os tetos dos triângulos e as caixas das instâncias; o chão e o asfalto
// ficam de fora). Cada quadro testa a linha da câmera até o carro nesse mapa, em poucos pontos. Só conta o que passa de 4 m
// acima do chão: gradil, grade, cerca, cone, poste e placa baixa são ignorados (e o que é fino demais nem entra no mapa).
// Se algo tapa, a câmera sobe e se aproxima, em degraus de uma tabela; ela só desce de novo depois de a linha ficar livre por
// 0,7 s, então não pisca. Uma malha pode se excluir com `userData.camIgnora = true`.
import * as THREE from "three";
import { cam, V3 } from "./cena.js";

const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const CEL = 20, HMIN = 40, FOLGA = 3, ORCAMENTO_MS = 2.5, MAX_CEL = 40;
// (distância, altura) em relação ao normal, do livre ao mais tapado
const DEGRAUS = [[1, 1], [0.85, 1.35], [0.7, 1.8], [0.55, 2.3], [0.4, 2.9], [0.25, 3.7]];
const W_POS = 3.2, W_ALVO = 4.2; // a rigidez das molas (1/s): a câmera leva uns 0,6 s para alcançar

// ---------- o mapa do cenário alto ----------
function criarMapa(tr) {
  const mundo = tr.t?.world || 1600, ini = -1600, N = Math.ceil((mundo + 3200) / CEL);
  const m = { ini, N, topo: new Float32Array(N * N).fill(-1e9), chao: new Float32Array(N * N).fill(NaN), fila: [], pronto: false, gen: null };
  if (!tr.grp) { m.pronto = true; return m; }
  tr.grp.updateMatrixWorld(true);
  tr.grp.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position || o.userData?.camIgnora) return;
    for (let p = o; p; p = p.parent) if (!p.visible) return;
    if (/-(terreno|faixa)$/.test(o.name)) return; // o chão e o asfalto: a altura do chão vem de `tr.chao`
    const mat = [].concat(o.material)[0];
    if (!mat || mat.side === THREE.BackSide || mat.alphaTest > 0 || mat.alphaMap || (mat.transparent && mat.opacity < 0.6)) return; // céu, cercas de tela e vidro
    const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
    const e = o.matrixWorld.elements, esc = Math.max(Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10]));
    if (g.boundingSphere.radius * esc > 4500) return;
    m.fila.push(o);
  });
  m.gen = varrer(m);
  return m;
}
// um ponto do mapa: a coluna do cenário vai do chão até `y`
function colocar(m, c, r, y) { if (c < 0 || r < 0 || c >= m.N || r >= m.N) return; const k = r * m.N + c; if (y > m.topo[k]) m.topo[k] = y; }
// um triângulo (em coordenadas do mundo): os centros de célula que caem dentro dele ganham a altura ali; parede em pé (sem
// área vista de cima) e peça menor que uma célula não marcam nada
function triangulo(m, x0, y0, z0, x1, y1, z1, x2, y2, z2) {
  const minx = Math.min(x0, x1, x2), maxx = Math.max(x0, x1, x2), minz = Math.min(z0, z1, z2), maxz = Math.max(z0, z1, z2);
  const c0 = Math.max(0, Math.ceil((minx - m.ini) / CEL - 0.5)), c1 = Math.min(m.N - 1, Math.floor((maxx - m.ini) / CEL - 0.5));
  const r0 = Math.max(0, Math.ceil((minz - m.ini) / CEL - 0.5)), r1 = Math.min(m.N - 1, Math.floor((maxz - m.ini) / CEL - 0.5));
  if (c1 < c0 || r1 < r0 || c1 - c0 > MAX_CEL || r1 - r0 > MAX_CEL) return;
  const den = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2); if (Math.abs(den) < 1e-6) return;
  for (let r = r0; r <= r1; r++) {
    const pz = m.ini + (r + 0.5) * CEL;
    for (let c = c0; c <= c1; c++) {
      const px = m.ini + (c + 0.5) * CEL, a = ((z1 - z2) * (px - x2) + (x2 - x1) * (pz - z2)) / den, b = ((z2 - z0) * (px - x2) + (x0 - x2) * (pz - z2)) / den;
      if (a >= 0 && b >= 0 && a + b <= 1) colocar(m, c, r, a * y0 + b * y1 + (1 - a - b) * y2);
    }
  }
}
function caixa(m, bx) {
  if (bx.isEmpty()) return;
  const c0 = Math.max(0, Math.ceil((bx.min.x - m.ini) / CEL - 0.5)), c1 = Math.min(m.N - 1, Math.floor((bx.max.x - m.ini) / CEL - 0.5));
  const r0 = Math.max(0, Math.ceil((bx.min.z - m.ini) / CEL - 0.5)), r1 = Math.min(m.N - 1, Math.floor((bx.max.z - m.ini) / CEL - 0.5));
  if (c1 < c0 || r1 < r0 || c1 - c0 > MAX_CEL || r1 - r0 > MAX_CEL) return;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) colocar(m, c, r, bx.max.y);
}
// o trabalho em fatias: devolve de tempos em tempos para o quadro poder medir o orçamento
function* varrer(m) {
  const im = new THREE.Matrix4(), mm = new THREE.Matrix4(), bx = new THREE.Box3();
  for (const o of m.fila) {
    const g = o.geometry, pos = g.attributes.position;
    if (o.isInstancedMesh) {
      if (!g.boundingBox) g.computeBoundingBox();
      for (let k = 0; k < o.count; k++) { o.getMatrixAt(k, im); mm.multiplyMatrices(o.matrixWorld, im); bx.copy(g.boundingBox).applyMatrix4(mm); caixa(m, bx); if ((k & 127) === 127) yield; }
      continue;
    }
    const e = o.matrixWorld.elements, ix = g.index, nT = Math.floor((ix ? ix.count : pos.count) / 3), V = new Float64Array(9);
    for (let t = 0; t < nT; t++) {
      for (let q = 0; q < 3; q++) {
        const v = ix ? ix.getX(t * 3 + q) : t * 3 + q, px = pos.getX(v), py = pos.getY(v), pz = pos.getZ(v);
        V[q * 3] = e[0] * px + e[4] * py + e[8] * pz + e[12]; V[q * 3 + 1] = e[1] * px + e[5] * py + e[9] * pz + e[13]; V[q * 3 + 2] = e[2] * px + e[6] * py + e[10] * pz + e[14];
      }
      triangulo(m, V[0], V[1], V[2], V[3], V[4], V[5], V[6], V[7], V[8]);
      if ((t & 255) === 255) yield;
    }
  }
}
function andarMapa(m) {
  if (m.pronto) return;
  const t0 = performance.now();
  while (performance.now() - t0 < ORCAMENTO_MS) if (m.gen.next().done) { m.pronto = true; m.gen = null; m.fila = []; return; }
}
// o chão da célula, só quando alguém pergunta (a maioria das células nunca é consultada)
function chaoDe(m, tr, c, r) {
  const k = r * m.N + c; let g = m.chao[k];
  if (g !== g) { g = tr.chao ? tr.chao(m.ini + (c + 0.5) * CEL, m.ini + (r + 0.5) * CEL) : 0; m.chao[k] = g; }
  return g;
}
// a linha de A (a câmera) até B (o carro) bate em cenário alto ou no relevo? Poucos pontos: um a cada meia célula
function tapado(m, tr, ax, ay, az, bx, by, bz) {
  const L = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.ceil(L / (CEL * 0.5)));
  for (let k = 1; k < n; k++) {
    const u = k / n; if (u > 0.93) break; // o chão e os muros ao lado do próprio carro não contam
    const x = ax + (bx - ax) * u, z = az + (bz - az) * u, y = ay + (by - ay) * u;
    if ((k & 3) === 0 && tr.chao && y < tr.chao(x, z) + 6) return true; // um morro no caminho
    const c = Math.floor((x - m.ini) / CEL), r = Math.floor((z - m.ini) / CEL);
    if (c < 0 || r < 0 || c >= m.N || r >= m.N) continue;
    const top = m.topo[r * m.N + c];
    if (top > -1e8 && y - FOLGA < top && top - chaoDe(m, tr, c, r) >= HMIN) return true;
  }
  return false;
}

// ---------- a mola ----------
// segue `alvo` com amortecimento crítico (vale para qualquer dt, sem passar do ponto); v guarda a velocidade
function mola(p, v, alvo, w, dt) {
  const x = w * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let d = p.x - alvo.x, t = (v.x + w * d) * dt; v.x = (v.x - w * t) * e; p.x = alvo.x + (d + t) * e;
  d = p.y - alvo.y; t = (v.y + w * d) * dt; v.y = (v.y - w * t) * e; p.y = alvo.y + (d + t) * e;
  d = p.z - alvo.z; t = (v.z + w * d) * dt; v.z = (v.z - w * t) * e; p.z = alvo.z + (d + t) * e;
}
const angDif = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

// ---------- o quadro ----------
// x: o contexto de cameras.js (R, C, dt, tr, src, rm, speedK, fovStep, nearest)
export function aereaHeli(x) {
  const { R, C, tr, src, rm, fovStep, nearest } = x, dt = Math.min(x.dt, 0.05), sk = Math.min(1, x.speedK);
  let H = C.heli;
  const M = tr.camMapa || (tr.camMapa = criarMapa(tr)); andarMapa(M);
  const n = tr.n, pts = tr.pts, ca = Math.cos(src.a), sa = Math.sin(src.a);
  const i = nearest(tr, src.x, src.y, H ? H.i : R.idx), idx = (k) => ((i + k) % n + n) % n;
  // a direção do traçado um pouco à frente (o carro rodando ou de lado não vira a câmera): vale o traçado, com o rumo do carro a ajudar
  const Ld = 130 + sk * 250, nA = Math.max(8, Math.round(Ld / 6)), pM = pts[idx(nA >> 1)], pL = pts[idx(Math.round(nA * 0.8))];
  const wT = 0.7 * lim(0.2 + ca * pM.tx + sa * pM.ty, 0, 1), yawAlvo = Math.atan2(pM.ty * wT + sa * (1 - wT), pM.tx * wT + ca * (1 - wT));
  // o carro e o ponto que a câmera mira (à frente, na pista), ambos com a velocidade para a mola não deixar a câmera para trás
  const vx = Number.isFinite(src.vx) ? src.vx : ca * (src.v || 0), vy = Number.isFinite(src.vy) ? src.vy : sa * (src.v || 0), lagP = 2 / W_POS, lagA = 2 / W_ALVO;
  const z0 = src.z || 0;
  const alvoDe = (lag) => V3(src.x + vx * lag * 0.9 + (pL.x - src.x) * 0.45, z0 + 6 + (pL.h - z0) * 0.4, src.y + vy * lag * 0.9 + (pL.y - src.y) * 0.45);
  if (!H) {
    H = C.heli = { i, yaw: yawAlvo, cand: 0, av: 0, livreT: 0, tun: 0, pos: null, vel: V3(0, 0, 0), alvo: alvoDe(0), vAlvo: V3(0, 0, 0) };
  }
  H.i = i;
  H.yaw += angDif(H.yaw, yawAlvo) * (1 - Math.exp(-dt * (rm ? 1 : 1.4))); // gira devagar nas curvas
  // dentro do túnel (Mônaco) o teto é opaco: a câmera desce e chega perto, como na perseguição
  const noTunel = !!tr.coberto && (tr.coberto(i) || tr.coberto(idx(12)) || tr.coberto(idx(-12)) || tr.coberto(idx(-30)));
  H.tun += ((noTunel ? 1 : 0) - H.tun) * (1 - Math.exp(-dt * 1.6));
  const cy = Math.cos(H.yaw), sy = Math.sin(H.yaw), base = { x: src.x + vx * lagP * 0.9, z: src.y + vy * lagP * 0.9 };
  const querer = (dg, ag) => { // onde a câmera ficaria com esse degrau
    const B = (90 + 110 * sk) * dg, h = (105 + 95 * sk) * ag, bt = 66, ht = 22, t = H.tun;
    const px = base.x - cy * (B + (bt - B) * t), pz = base.z - sy * (B + (bt - B) * t);
    let py = z0 + h + (ht - h) * t;
    const g = tr.chao ? tr.chao(px, pz) : 0; py = Math.max(py, g + 55 * (1 - t) + 14 * t); // nunca rente ao chão
    return V3(px, py, pz);
  };
  const alvoCarro = V3(src.x, z0 + 8, src.y);
  const livre = (k) => { const p = querer(DEGRAUS[k][0], DEGRAUS[k][1]); return !tapado(M, tr, p.x, p.y, p.z, alvoCarro.x, alvoCarro.y, alvoCarro.z); };
  if (H.tun < 0.5) { // sobe e chega perto se tapar; só desce de novo com a linha livre por 0,7 s
    let c = H.cand; while (c < DEGRAUS.length - 1 && !livre(c)) c++;
    if (c === H.cand && c > 0) { if (livre(c - 1)) { H.livreT += dt; if (H.livreT > 0.7) { c--; H.livreT = 0; } } else H.livreT = 0; } else H.livreT = 0;
    H.cand = c;
  } else H.livreT = 0;
  H.av += (H.cand - H.av) * (1 - Math.exp(-dt * (H.cand > H.av ? 3.2 : 0.9))); // sobe depressa, desce devagar
  const f = Math.floor(H.av), g = Math.min(f + 1, DEGRAUS.length - 1), q = H.av - f;
  const want = querer(DEGRAUS[f][0] + (DEGRAUS[g][0] - DEGRAUS[f][0]) * q, DEGRAUS[f][1] + (DEGRAUS[g][1] - DEGRAUS[f][1]) * q);
  if (!H.pos || H.pos.distanceTo(want) > 2500) { H.pos = want.clone(); H.vel.set(0, 0, 0); H.alvo = alvoDe(0); H.vAlvo.set(0, 0, 0); } // primeira vez, ou o carro foi para outro lugar
  mola(H.pos, H.vel, want, W_POS, dt);
  mola(H.alvo, H.vAlvo, alvoDe(lagA), W_ALVO, dt);
  cam.position.copy(H.pos); cam.lookAt(H.alvo);
  if (R.shake > 0) R.shake -= dt; // a batida não sacode a aérea: o helicóptero fica firme
  const asp = cam.aspect || 1.78, fovAlvo = (46 + sk * 3 + (asp < 1.2 ? 8 : 0)) + H.tun * 12;
  cam.fov += (fovAlvo - cam.fov) * fovStep; cam.updateProjectionMatrix();
}
