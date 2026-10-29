// Monza — a Sopraelevata (o anel de alta velocidade de 1955): a velha pista inclinada de concreto, que aparece no parque ao lado da
// Curva Grande, do Serraglio e da Parabolica. Concreto craquelado com as juntas das lajes, mato nas frestas, a borda de fora levantada nas
// curvas (a inclinação chega a uns 38° no meio, aqui um pouco menos para caber no mundo), o muro de arrimo com o parapeito, o mato que
// cresceu em volta, as torrinhas de sinalização e, onde o anel passa por cima da pista (o Serraglio), a ponte com os pilares de concreto.
// Fica fora da pista: tudo o que passa do vão é reservado em tr.reservado e as colunas só entram longe do asfalto.
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { instancias, sorteio } from "../comum.js";

// a linha central do anel (OpenStreetMap), nas coordenadas do traçado (quadrado de 1600): as duas curvas inclinadas (a norte, que passa
// por cima do Serraglio, e a sul, ao lado da Parabolica) e a reta de leste
const ANEL = [[500, 539], [514, 527], [528, 517], [547, 505], [562, 497], [587, 486], [605, 481], [621, 478], [637, 476], [654, 476], [673, 477], [690, 479], [713, 485], [733, 490], [748, 495], [765, 504], [784, 514], [796, 523], [809, 535], [825, 552], [843, 578], [858, 610], [869, 641], [875, 676], [878, 712], [878, 749], [875, 783], [872, 817], [868, 851], [863, 890], [858, 930], [854, 969], [849, 1009], [844, 1048], [839, 1087], [835, 1127], [830, 1166], [825, 1206], [820, 1245], [816, 1283], [811, 1321], [807, 1358], [802, 1396], [798, 1433], [794, 1462], [789, 1493], [780, 1530], [768, 1566], [752, 1600], [731, 1632], [705, 1660], [675, 1678], [643, 1693], [609, 1705], [574, 1707], [541, 1707], [526, 1706]];

const suave = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

// uma fita de quadriláteros: cada passo é [x0, y0, z0, x1, y1, z1] (as duas pontas da seção)
function fita(passos, vLen = 60) {
  const vs = [], uv = [], idx = []; let d = 0;
  passos.forEach((s, i) => {
    if (i) d += Math.hypot(s[0] - passos[i - 1][0], s[2] - passos[i - 1][2]);
    vs.push(...s); uv.push(0, d / vLen, 1, d / vLen);
    if (i < passos.length - 1) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export function sopraelevata(tr, add) {
  const { pts, n, W } = tr, K = tr.t.scale, meia = 76, passo = 36, r = sorteio(1955);
  const curva = new THREE.CatmullRomCurve3(ANEL.map(([x, y]) => new THREE.Vector3(x * K, 0, y * K)), false, "centripetal");
  const P = curva.getSpacedPoints(Math.round(curva.getLength() / passo)), m = P.length;
  const rumo = P.map((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(m - 1, i + 1)]; return Math.atan2(b.z - a.z, b.x - a.x); });
  const dist = P.map((p) => { let d = 1e9; for (let k = 0; k < n; k += 2) d = Math.min(d, Math.hypot(pts[k].x - p.x, pts[k].y - p.z)); return d; });
  const cruz = dist.indexOf(Math.min(...dist)); // onde o anel passa por cima da pista (o Serraglio)
  const giro = P.map((p, i) => { const a = Math.max(0, i - 3), b = Math.min(m - 1, i + 3); let dh = rumo[b] - rumo[a]; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); return Math.abs(dh) / ((b - a) * passo); });
  const topo = [], lateralD = [], lateralE = [], parapeito = [], base = [], torrinhas = [], mato = [];
  P.forEach((p, i) => {
    const tx = Math.cos(rumo[i]), tz = Math.sin(rumo[i]), nx = -tz, nz = tx; // nx, nz: a direita de quem anda; a borda de fora das curvas (à direita) sobe
    const chao = tr.chao(p.x, p.z), vao = Math.abs(i - cruz) * passo, sobe = 78 * (1 - suave(150, 520, vao)), banco = 84 * suave(0.35, 1, giro[i] * 1100), ponte = vao < 230;
    const yi = chao + sobe + 1.5, ye = yi + banco, ex = p.x + nx * meia, ez = p.z + nz * meia, ix = p.x - nx * meia, iz = p.z - nz * meia; // e: a borda de fora (direita), i: a de dentro
    const fundoE = ponte ? ye - 14 : tr.chao(ex, ez) - 3, fundoI = ponte ? yi - 14 : tr.chao(ix, iz) - 3;
    topo.push([ix, yi, iz, ex, ye, ez]);
    lateralD.push([ex, fundoE, ez, ex, ye + 9, ez]); // o muro de fora, com o parapeito
    lateralE.push([ix, fundoI, iz, ix, yi + 2, iz]);
    if (ponte && dist[i] > W / 2 + 40 && dist[i] < 400) parapeito.push({ x: ex - nx * 8, z: ez - nz * 8, y0: tr.chao(ex, ez), y1: ye - 14 }, { x: ix + nx * 8, z: iz + nz * 8, y0: tr.chao(ix, iz), y1: yi - 14 });
    if (!ponte && i % 4 === 0) { // mato que cresceu junto do muro de arrimo, dos dois lados
      for (const s of [-1, 1]) if (r() < 0.8) { const d = meia + 6 + r() * 26, x = p.x + nx * s * d + (r() - 0.5) * 20, z = p.z + nz * s * d + (r() - 0.5) * 20; if (tr.distAt(x, z) > W / 2 + 30) mato.push({ x, y: tr.chao(x, z) + 3 + r() * 5, z, sx: 10 + r() * 14, sy: 7 + r() * 9, sz: 10 + r() * 14, r: r() * 6 }); }
    }
    if (!ponte && i % 9 === 4) torrinhas.push({ x: ix + nx * 4, y: yi + 14, z: iz + nz * 4, sx: 6, sy: 28, sz: 6, r: -rumo[i] }); // as torrinhas de sinalização, na borda de dentro
    base.push(p);
    tr.reservado.push([p.x, p.z, meia + 70]);
  });
  // o concreto: lajes com as juntas, o mato nas frestas, as manchas de chuva e as marcas de pneu gastas
  const concreto = new THREE.MeshStandardMaterial({ roughness: 0.95, side: THREE.DoubleSide, map: canvasTex(128, 256, (x, w, hh, rr) => {
    x.fillStyle = "#a3a29a"; x.fillRect(0, 0, w, hh);
    for (let i = 0; i < 1800; i++) { x.fillStyle = rr() < 0.5 ? "#8d8c84" : "#b4b3aa"; x.fillRect(rr() * w, rr() * hh, 2 + rr() * 3, 2); }
    x.fillStyle = "#6f6f69"; for (let yy = 0; yy < hh; yy += 64) x.fillRect(0, yy, w, 2); x.fillRect(w / 2 - 1, 0, 2, hh); // as lajes e a junta do meio
    x.fillStyle = "#5c7a3a99"; for (let i = 0; i < 70; i++) x.fillRect(rr() * w, rr() * hh, 3 + rr() * 8, 2 + rr() * 5); // mato nas juntas
    x.fillStyle = "#4a483f55"; for (let i = 0; i < 16; i++) x.fillRect(rr() * w, rr() * hh, 1, 10 + rr() * 30); // manchas de chuva
    x.fillStyle = "#35342f40"; x.fillRect(w * 0.22, 0, 6, hh); x.fillRect(w * 0.62, 0, 6, hh); // a marca dos pneus, quase apagada
  }) });
  const muro = new THREE.MeshStandardMaterial({ color: 0x9d9c94, roughness: 0.95, side: THREE.DoubleSide });
  const g = new THREE.Group(); g.name = `${tr.id}-sopraelevata`; add(g);
  const pista = new THREE.Mesh(fita(topo, 60), concreto); pista.receiveShadow = true; g.add(pista);
  for (const lateral of [lateralD, lateralE]) { const f = new THREE.Mesh(fita(lateral, 40), muro); f.castShadow = f.receiveShadow = true; g.add(f); }
  // as colunas da ponte, fora do vão da pista
  const colunas = parapeito.filter((c, i) => i % 4 < 2).map((c) => ({ x: c.x, y: (c.y0 + c.y1) / 2, z: c.z, sx: 9, sy: Math.max(1, c.y1 - c.y0), sz: 9 }));
  instancias(add, new THREE.BoxGeometry(1, 1, 1), muro, colunas, { nome: `${tr.id}-sopraelevata-colunas` });
  instancias(add, new THREE.BoxGeometry(1, 1, 1), M(0x8f8e86, { roughness: 0.95 }), torrinhas, { sombra: false, nome: `${tr.id}-sopraelevata-torrinhas` });
  // o mato do entorno: moitas baixas e escuras (uma malha instanciada só)
  const moitas = instancias(add, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), mato, { sombra: false, nome: `${tr.id}-sopraelevata-mato` });
  if (moitas) { const verdes = ["#3e6a2c", "#4d7a33", "#35582a", "#5b8a3a", "#6f7f33"]; mato.forEach((o, k) => moitas.setColorAt(k, new THREE.Color(verdes[(r() * verdes.length) | 0]))); moitas.instanceColor.needsUpdate = true; }
  tr.sopraelevataGP = { pontos: m, cruz, colunas: colunas.length, torrinhas: torrinhas.length, mato: mato.length };
}
