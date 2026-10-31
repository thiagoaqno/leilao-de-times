// Spa-Francorchamps — as barreiras da beira (peça só desta pista). O circuito é cercado de barreira de aço galvanizado (a "armco",
// ondulada, de poste em poste) com a cerca de arame verde atrás, onde a galera assiste de pé nas encostas; nas curvas lentas há muro
// de pneus na frente, e o asfalto de escape é pintado (verde-água em Pouhon e nas curvas rápidas, vermelho e amarelo na Source e
// no Eau Rouge). Tudo acompanha a pista em fitas de uma malha por material, só onde o lugar está livre (um grampo, o trecho
// vizinho, a arquibancada e o prédio cortam a fita), e os postes e os pneus são InstancedMesh. Nada muda a física.
import * as THREE from "three";
import { M, canvasTex } from "../../cena.js";
import { livre, ocupado, lotes, tira, sinalDaCurva, instancias } from "../comum.js";

const FITA_MIN = 6; // uma fita só vale a pena com pelo menos 6 pontos (36 unidades)

// os trechos de i0 a i1 onde o ponto a `lat` do centro (do lado `lado`) fica livre: nada da pista passa mais perto do que o deslocamento
function trechos(tr, lado, lat, de = 0, ate = 1, extra = null) {
  const { pts, n } = tr, out = [];
  const ok = (i) => {
    const p = pts[i % n], x = p.x + p.nx * lado * lat, z = p.y + p.ny * lado * lat;
    if (tr.distAt(x, z) < lat - 3) return false;
    for (const s of [-18, 18]) if (tr.distAt(x + p.tx * s, z + p.ty * s) < lat - 3) return false; // as pontas das peças
    if (tr.noCorredor?.(x, z)) return false;
    return !extra || extra(x, z, i % n);
  };
  let a = null;
  for (let i = Math.floor(de * n); i <= Math.floor(ate * n); i++) {
    if (i < Math.floor(ate * n) && ok(i)) { if (a === null) a = i; } else if (a !== null) { if (i - 1 - a >= FITA_MIN) out.push([a, i - 1]); a = null; }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// A barreira de aço (armco) e a cerca de arame verde
// ---------------------------------------------------------------------------------------------------------------------
/**
 * @param {object} cfg { armco: lat da barreira (W/2 + 27,5), cerca: lat da cerca (W/2 + 31,5), alturaArmco (5,5), alturaCerca (34),
 *   sem: [[f0, f1, lado]] trechos sem barreira (a entrada do corredor dos boxes), semCerca: idem só para a cerca }
 */
export function barreiras(tr, add, cfg = {}) {
  const { pts, n, W } = tr, latA = cfg.armco ?? W / 2 + 27.5, latC = cfg.cerca ?? W / 2 + 31.5, hA = cfg.alturaArmco ?? 5.5, hC = cfg.alturaCerca ?? 34;
  // a entrada e a saída do corredor dos boxes ficam sem barreira (o carro passa por ali)
  const bx = tr.t.boxes && window.F1Regras ? window.F1Regras.corredor(tr.t, n, W) : null;
  const naRampa = (lado, i) => { if (!bx || lado !== bx.lado) return false; const r = (((i - bx.i0) % n) + n) % n, ra = window.F1Regras.RAMPA + 3; return r <= ra || (r >= bx.len - ra && r <= bx.len + 3); };
  const semTrecho = (lado) => (x, z, i) => !naRampa(lado, i) && !(cfg.sem || []).some(([f0, f1, l]) => (l === 0 || l === lado) && i >= Math.floor(f0 * n) && i <= Math.floor(f1 * n));

  // a chapa ondulada da armco: duas ondas (aço galvanizado) e a emenda a cada 24 unidades
  const aco = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.55, metalness: 0.35, map: canvasTex(64, 8, (x, w, h, rr) => { // o x da textura é a altura da chapa (a fita sobe com o u), o y corre ao longo da pista
    x.fillStyle = "#aeb3b6"; x.fillRect(0, 0, w, h);
    for (const [x0, x1] of [[0.08, 0.36], [0.52, 0.8]]) { const g = x.createLinearGradient(w * x0, 0, w * x1, 0); g.addColorStop(0, "#d4d8da"); g.addColorStop(0.5, "#8d9498"); g.addColorStop(1, "#c4c9cc"); x.fillStyle = g; x.fillRect(w * x0, 0, w * (x1 - x0), h); }
    x.fillStyle = "#6c7378"; x.fillRect(0, 0, 2, h); x.fillRect(w - 2, 0, 2, h); x.fillRect(0, 0, w, 1); // as bordas e a emenda
    for (let k = 0; k < 40; k++) { x.fillStyle = rr() < 0.5 ? "#00000012" : "#ffffff14"; x.fillRect(rr() * w, rr() * h, 2, 1); }
  }) });
  aco.map.wrapS = aco.map.wrapT = THREE.RepeatWrapping;
  const arame = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8, transparent: false, alphaTest: 0.35, map: canvasTex(64, 64, (x, w, h) => { // o arame em losangos e a trave de cima e a de baixo, verdes
    x.clearRect(0, 0, w, h); x.strokeStyle = "#4a6a52"; x.lineWidth = 2.2;
    for (let k = -h; k < w + h; k += 16) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + h, h); x.stroke(); x.beginPath(); x.moveTo(k + h, 0); x.lineTo(k, h); x.stroke(); }
    x.fillStyle = "#2f5a3f"; x.fillRect(0, 0, w, 5); x.fillRect(0, h - 5, w, 5);
  }, true) });
  arame.map.wrapS = arame.map.wrapT = THREE.RepeatWrapping;

  const L = lotes(), postesA = [], postesC = [], stats = (tr.barreirasSpa = { armco: 0, cerca: 0, postes: 0 });
  for (const lado of [-1, 1]) {
    const livreA = trechos(tr, lado, latA, cfg.de ?? 0, cfg.ate ?? 1, semTrecho(lado)), livreC = trechos(tr, lado, latC, cfg.de ?? 0, cfg.ate ?? 1, semTrecho(lado));
    for (const [a, b] of livreA) {
      tira(tr, L.de(aco), a, b, lado * latA, lado * latA, 0.4, hA, (a * 6) / 24, (b * 6) / 24, 0, 1); // a chapa, de pé (uma emenda a cada 24 unidades)
      tira(tr, L.de(aco), a, b, lado * (latA - 0.8), lado * (latA + 0.8), hA, hA, (a * 6) / 24, (b * 6) / 24, 0.5, 0.5); // a boca de cima, deitada
      for (let i = a; i <= b; i += 8) { const p = pts[i % n]; postesA.push({ x: p.x + p.nx * lado * (latA + 0.6), y: p.h + hA / 2, z: p.y + p.ny * lado * (latA + 0.6), sx: 0.9, sy: hA + 1, sz: 0.9, r: Math.atan2(-p.nx, -p.ny) }); }
      stats.armco += b - a;
    }
    for (const [a, b] of livreC) {
      tira(tr, L.de(arame), a, b, lado * latC, lado * latC, 0.4, hC, (a * 6) / 16, (b * 6) / 16, 0, hC / 16); // um losango a cada 16 unidades
      for (let i = a; i <= b; i += 6) { const p = pts[i % n]; postesC.push({ x: p.x + p.nx * lado * latC, y: p.h + hC / 2, z: p.y + p.ny * lado * latC, sx: 0.9, sy: hC, sz: 0.9, r: 0 }); }
      stats.cerca += b - a;
    }
  }
  L.montar(add, `${tr.id}-barreiras`);
  const caixa = new THREE.BoxGeometry(1, 1, 1);
  instancias(add, caixa, M(0x7f868b, { roughness: 0.6, metalness: 0.3 }), postesA, { sombra: false, nome: `${tr.id}-postes-armco` });
  instancias(add, caixa, M(0x37503e, { roughness: 0.8 }), postesC, { sombra: false, nome: `${tr.id}-postes-cerca` });
  stats.postes = postesA.length + postesC.length;
  return stats;
}

// ---------------------------------------------------------------------------------------------------------------------
// O muro de pneus na frente da barreira (curvas lentas e saídas de chicane)
// ---------------------------------------------------------------------------------------------------------------------
/** @param {Array} lista [[f0, f1, lado]]: lado 1, -1, 0 (os dois) ou "fora" | "dentro" da curva · @param {object} cfg { lat: onde ficam (W/2 + 21), alto: pneus por pilha (3) } */
export function muroDePneus(tr, add, lista, cfg = {}) {
  const { pts, n, W } = tr, lat = cfg.lat ?? W / 2 + 21, pretos = [], brancos = [], pneu = new THREE.TorusGeometry(3.4, 1.7, 5, 9), alto = cfg.alto ?? 3;
  pneu.rotateX(Math.PI / 2);
  for (const [f0, f1, lado] of lista) {
    const a = Math.floor(f0 * n), b = Math.floor(f1 * n);
    let lados = lado === 0 ? [-1, 1] : [lado];
    if (lado === "fora" || lado === "dentro") { let m = a; for (let k = a; k <= b; k++) if ((pts[k % n].k || 0) > (pts[m % n].k || 0)) m = k; const d = sinalDaCurva(pts, n, m % n); lados = [lado === "dentro" ? d : -d]; }
    for (const s of lados) for (let i = a; i < b; i += 3) {
      if (tr.murosEscape && !tr.murosEscape[s][i % n]) continue;
      const d = tr.murosEscape ? W / 2 + tr.murosEscape[s][i % n] - 4 : lat;
      const p = pts[i % n], x = p.x + p.nx * s * d, z = p.y + p.ny * s * d;
      if (tr.distAt(x, z) < d - 3 || ocupado(tr, x, z, i % n) || tr.noCorredor?.(x, z)) continue;
      for (let k = 0; k < alto; k++) (((i / 2 + k) % 7 | 0) === 0 ? brancos : pretos).push({ x, y: (tr.murosEscape ? tr.chao(x, z) : p.h) + 1.7 + k * 3.6, z, sx: 1, sy: 1, sz: 1 });
    }
  }
  instancias(add, pneu, M(0x16171a, { roughness: 0.95 }), pretos, { nome: `${tr.id}-muro-pneus` });
  instancias(add, pneu, M(0xe4e4de, { roughness: 0.9 }), brancos);
  tr.pneusSpa = pretos.length + brancos.length;
}

// ---------------------------------------------------------------------------------------------------------------------
// O asfalto de escape pintado
// ---------------------------------------------------------------------------------------------------------------------
/**
 * Faixas pintadas no asfalto de escape, depois da zebra: `verde` (verde-água com a linha branca, Pouhon e Blanchimont) e `vermelho`
 * (vermelho e amarelo em listras, La Source e Eau Rouge).
 * @param {object} cfg { verde: [[f0, f1, lado]], vermelho: [[f0, f1, lado]], largura: (26) }
 */
export function escapePintado(tr, add, cfg = {}) {
  const { pts, n, W } = tr, de = W / 2 + 7, ate = de + (cfg.largura ?? 26), L = lotes();
  const tinta = (cor, listras) => new THREE.MeshStandardMaterial({ roughness: 0.88, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, map: canvasTex(32, 64, (x, w, h, rr) => {
    x.fillStyle = cor; x.fillRect(0, 0, w, h);
    if (listras) { x.fillStyle = "#f2c500"; for (let k = -h; k < w + h; k += 16) { x.beginPath(); x.moveTo(0, k); x.lineTo(w, k - w * 0.7); x.lineTo(w, k - w * 0.7 + 8); x.lineTo(0, k + 8); x.closePath(); x.fill(); } }
    for (let k = 0; k < 200; k++) { x.fillStyle = rr() < 0.5 ? "#00000016" : "#ffffff12"; x.fillRect(rr() * w, rr() * h, 2, 2); }
    x.fillStyle = "#f4f4f2"; x.fillRect(0, 0, 2, h); // a linha branca junto da zebra
  }) });
  const verde = tinta("#1ea58e", false), vermelho = tinta("#c8102e", true);
  const lados = (a, b, lado) => {
    if (lado === 1 || lado === -1) return [lado];
    if (lado === 0 || lado === undefined) return [-1, 1];
    let m = a; for (let k = a; k <= b; k++) if ((pts[k % n].k || 0) > (pts[m % n].k || 0)) m = k;
    const d = sinalDaCurva(pts, n, m % n); return [lado === "dentro" ? d : -d];
  };
  let cont = 0;
  for (const [chave, mat] of [["verde", verde], ["vermelho", vermelho]]) for (const [f0, f1, lado] of cfg[chave] || []) {
    const a = Math.floor(f0 * n), b = Math.floor(f1 * n);
    for (const s of lados(a, b, lado)) { tira(tr, L.de(mat), a, b, s * de, s * ate, 0.42, 0.42, (a * 6) / 64, (b * 6) / 64); cont += b - a; }
  }
  L.montar(add, `${tr.id}-escape-pintado`);
  tr.escapePintadoSpa = cont;
}
