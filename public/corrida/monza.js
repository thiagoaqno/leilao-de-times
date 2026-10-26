// Monza — o que só o autódromo tem: a velha pista oval inclinada (a Sopraelevata) aparecendo ao lado da Curva Grande, do
// Serraglio e da Parabolica, e o pódio pendurado sobre a reta dos boxes. O resto vem do kit (gps/monza.js).
import * as THREE from "three";
import { canvasTex, M } from "./cena.js";
import { desenharMarca, marcaTex } from "./kit/marcas.js";

// a linha central do anel de alta velocidade (OpenStreetMap), nas coordenadas do traçado (quadrado de 1600): as duas
// curvas inclinadas (a norte, que passa por cima do Serraglio, e a sul, ao lado da Parabolica) e a reta de leste
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

// a Sopraelevata: concreto velho com as lajes, mato nas juntas, a borda de fora levantada nas curvas e o muro de arrimo
// embaixo; onde o anel cruza a pista (o Serraglio) ele sobe numa ponte
export function sopraelevata(tr, add) {
  const { pts, n, W } = tr, K = tr.t.scale, meia = 76, passo = 36;
  const curva = new THREE.CatmullRomCurve3(ANEL.map(([x, y]) => new THREE.Vector3(x * K, 0, y * K)), false, "centripetal");
  const P = curva.getSpacedPoints(Math.round(curva.getLength() / passo)), m = P.length;
  const rumo = P.map((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(m - 1, i + 1)]; return Math.atan2(b.z - a.z, b.x - a.x); });
  const dist = P.map((p) => { let d = 1e9; for (let k = 0; k < n; k += 2) d = Math.min(d, Math.hypot(pts[k].x - p.x, pts[k].y - p.z)); return d; });
  const cruz = dist.indexOf(Math.min(...dist)); // onde o anel passa por cima da pista (o Serraglio)
  const giro = P.map((p, i) => { const a = Math.max(0, i - 3), b = Math.min(m - 1, i + 3); let dh = rumo[b] - rumo[a]; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); return Math.abs(dh) / ((b - a) * passo); });
  const topo = [], lateralD = [], lateralE = [], parapeito = [];
  P.forEach((p, i) => {
    const tx = Math.cos(rumo[i]), tz = Math.sin(rumo[i]), nx = -tz, nz = tx; // nx, nz: a direita de quem anda; a borda de fora das curvas (à direita) sobe
    const chao = tr.chao(p.x, p.z), vao = Math.abs(i - cruz) * passo, sobe = 78 * (1 - suave(150, 520, vao)), banco = 84 * suave(0.35, 1, giro[i] * 1100), ponte = vao < 230;
    const yi = chao + sobe + 1.5, ye = yi + banco, ex = p.x + nx * meia, ez = p.z + nz * meia, ix = p.x - nx * meia, iz = p.z - nz * meia; // e: a borda de fora (direita), i: a de dentro
    const fundoE = ponte ? ye - 14 : tr.chao(ex, ez) - 3, fundoI = ponte ? yi - 14 : tr.chao(ix, iz) - 3;
    topo.push([ix, yi, iz, ex, ye, ez]);
    lateralD.push([ex, fundoE, ez, ex, ye + 9, ez]); // o muro de fora, com o parapeito
    lateralE.push([ix, fundoI, iz, ix, yi + 2, iz]);
    if (ponte && dist[i] > W / 2 + 40 && dist[i] < 400) parapeito.push({ x: ex - nx * 8, z: ez - nz * 8, y0: tr.chao(ex, ez), y1: ye - 14 }, { x: ix + nx * 8, z: iz + nz * 8, y0: tr.chao(ix, iz), y1: yi - 14 });
    tr.reservado.push([p.x, p.z, meia + 70]);
  });
  const concreto = new THREE.MeshStandardMaterial({ roughness: 0.95, side: THREE.DoubleSide, map: canvasTex(128, 256, (x, w, hh, rr) => {
    x.fillStyle = "#a3a29a"; x.fillRect(0, 0, w, hh);
    for (let i = 0; i < 1800; i++) { x.fillStyle = rr() < 0.5 ? "#8d8c84" : "#b4b3aa"; x.fillRect(rr() * w, rr() * hh, 2 + rr() * 3, 2); }
    x.fillStyle = "#6f6f69"; for (let yy = 0; yy < hh; yy += 64) x.fillRect(0, yy, w, 2); x.fillRect(w / 2 - 1, 0, 2, hh); // as lajes e a junta do meio
    x.fillStyle = "#5c7a3a99"; for (let i = 0; i < 70; i++) x.fillRect(rr() * w, rr() * hh, 3 + rr() * 8, 2 + rr() * 5); // mato nas juntas
    x.fillStyle = "#4a483f55"; for (let i = 0; i < 16; i++) x.fillRect(rr() * w, rr() * hh, 1, 10 + rr() * 30); // manchas de chuva
  }) });
  const muro = new THREE.MeshStandardMaterial({ color: 0x9d9c94, roughness: 0.95, side: THREE.DoubleSide });
  const g = new THREE.Group(); add(g);
  const pista = new THREE.Mesh(fita(topo, 60), concreto); pista.receiveShadow = true; g.add(pista);
  for (const lateral of [lateralD, lateralE]) { const f = new THREE.Mesh(fita(lateral, 40), muro); f.castShadow = f.receiveShadow = true; g.add(f); }
  // as colunas da ponte, fora do vão da pista
  const colunas = parapeito.filter((c, i) => i % 4 < 2).map((c) => ({ x: c.x, y: (c.y0 + c.y1) / 2, z: c.z, sx: 9, sy: c.y1 - c.y0, sz: 9 }));
  const geo = new THREE.BoxGeometry(1, 1, 1), cs = new THREE.InstancedMesh(geo, muro, Math.max(1, colunas.length)), o = new THREE.Object3D();
  colunas.forEach((c, k) => { o.position.set(c.x, c.y, c.z); o.scale.set(c.sx, Math.max(1, c.sy), c.sz); o.updateMatrix(); cs.setMatrixAt(k, o.matrix); }); cs.count = colunas.length; cs.castShadow = true; g.add(cs);
  tr.sopraelevataGP = { pontos: m, cruz, colunas: colunas.length };
}

// o pódio sobre a reta dos boxes: uma passarela de ponta a ponta da pista, com as faixas do GP da Itália, as bandeiras da
// Itália nas duas torres e, pendurada embaixo, a sacada do pódio com os três degraus
export function podio(tr, { add }, f = 0.02) {
  const { pts, n, W } = tr, i = Math.floor(f * n), p = pts[i], g = new THREE.Group(), aco = M(0x3a4048, { roughness: 0.5, metalness: 0.4 }), branco = M(0xf1efe8, { roughness: 0.6 });
  g.position.set(p.x, p.h, p.y); g.rotation.y = Math.atan2(p.nx, p.ny); add(g); // z do grupo = lado da pista (o dos boxes é +z)
  const zE = -(W / 2 + 46), zD = W / 2 + 62 + 26, vao = zD - zE, centro = (zD + zE) / 2, alto = 88;
  const faixas = canvasTex(2048, 128, (x) => { ["gpit", "ferrari", "pirelli", "gpit", "monza", "heineken", "ferrari", "gpit"].forEach((nome, k) => desenharMarca(x, nome, k * 256, 0, 256, 128)); }, false);
  const fx = new THREE.MeshBasicMaterial({ map: faixas });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(16, 14, vao), [fx, fx, aco, aco, aco, aco]); deck.position.set(0, alto + 7, centro); deck.castShadow = true; g.add(deck);
  const vidro = M(0x9fb8c8, { roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.5 });
  const guarda = new THREE.Mesh(new THREE.BoxGeometry(12, 9, vao - 4), vidro); guarda.position.set(0, alto + 18.5, centro); g.add(guarda);
  // as duas torres (a da direita, sobre o prédio dos boxes, é maior e leva o nome do autódromo)
  for (const [z, larg, nome] of [[zE, 18, null], [zD - 12, 48, "monza"]]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(larg, alto + 14, larg), nome ? branco : aco); t.position.set(0, (alto + 14) / 2, z); t.castShadow = true; g.add(t);
    if (nome) { const placa = new THREE.Mesh(new THREE.PlaneGeometry(larg * 0.9, 12), new THREE.MeshBasicMaterial({ map: marcaTex(nome, 512, 128), side: THREE.DoubleSide })); placa.position.set(0, alto - 14, z - larg / 2 - 0.3); placa.rotation.y = Math.PI; g.add(placa); }
    const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 46, 6), M(0xd9d9d9)); mastro.position.set(larg / 2 - 3, alto + 14 + 23, z); g.add(mastro);
    [0x009246, 0xf4f4f4, 0xce2b37].forEach((cor, k) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9, 5), M(cor, { side: THREE.DoubleSide })); b.position.set(larg / 2 - 3, alto + 14 + 38, z + 3 + k * 5); g.add(b); }); // a bandeira da Itália, com as faixas de pé
    tr.reservado.push([p.x + p.nx * z, p.y + p.ny * z, larg + 30]);
  }
  // a sacada do pódio, pendurada embaixo da passarela: piso, vidro atrás, e os três degraus com as taças
  const sacada = new THREE.Group(); sacada.position.set(0, alto - 18, centro - 20); g.add(sacada);
  const piso = new THREE.Mesh(new THREE.BoxGeometry(22, 2, 76), branco); sacada.add(piso);
  const fundo = new THREE.Mesh(new THREE.BoxGeometry(1.4, 18, 76), vidro); fundo.position.set(-10, 10, 0); sacada.add(fundo);
  for (const s of [-1, 1]) { const lado = new THREE.Mesh(new THREE.BoxGeometry(22, 18, 1.4), vidro); lado.position.set(0, 10, s * 37.5); sacada.add(lado); }
  for (const [z, h, cor] of [[0, 12, 0xc8102e], [-16, 8, 0xe9e9e6], [16, 5, 0xe9e9e6]]) { const d = new THREE.Mesh(new THREE.BoxGeometry(10, h, 14), M(cor, { roughness: 0.6 })); d.position.set(2, 1 + h / 2, z); sacada.add(d); }
  const cabos = [[-9, -36], [-9, 36], [9, -36], [9, 36]];
  for (const [x, z] of cabos) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.8, 18, 0.8), aco); c.position.set(x, 9, z); sacada.add(c); }
  tr.podioGP = { i, vao };
}
