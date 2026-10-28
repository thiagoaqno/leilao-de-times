// Jeddah — o Mar Vermelho, a corniche e a lagoa. O circuito fica numa faixa de terra: mar a oeste (o lado dos boxes), ao norte
// (depois do retão do T13) e ao sul (depois do grampo final), terra firme a leste. A costa é o contorno de tudo que fica a
// menos de COSTA da pista, então ela segue o traçado sozinha. Dentro da laçada do sul fica a lagoa (a água dos dois lados da
// reta de trás, T23 a T27), atrás do prédio dos boxes.
//
// Tudo é uma malha por material (água, orla, calçada, parapeito, raso): a água anda sozinha (tr.agua) e o resto é parado.
//   marJeddah(tr, { add, aguaTex }) → { mar(x, z), lagoa(x, z), costa, lagoaPoly, nivel }
//   tr.ocupado passa a dizer "é água" (os enfeites soltos e os GPs não nascem no mar).
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { lotes } from "../comum.js";

export const COSTA = 440;       // da linha central da pista até a costa
export const NIVEL_MAR = 0.5;   // a água do mar (o terreno lá fora fica em -1,5)
const LESTE = 14000;

// ponto dentro do polígono [[x, z], ...]
export function dentroDe(poly, x, z) {
  let d = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) d = !d;
  }
  return d;
}
// reamostra uma polilinha para ter um ponto a cada `passo`, no máximo
function reamostrar(lista, passo) {
  const out = [];
  for (let i = 0; i < lista.length - 1; i++) {
    const [ax, az] = lista[i], [bx, bz] = lista[i + 1], d = Math.hypot(bx - ax, bz - az), k = Math.max(1, Math.ceil(d / passo));
    for (let j = 0; j < k; j++) out.push([ax + ((bx - ax) * j) / k, az + ((bz - az) * j) / k]);
  }
  out.push(lista[lista.length - 1]);
  return out;
}

export function marJeddah(tr, { add, aguaTex }) {
  const { pts, n, W } = tr;
  // ---- a costa: por linhas de 60 de altura (z), o x mais a oeste que ainda fica a COSTA da pista ----
  const P = 60;
  let zMin = Infinity, zMax = -Infinity;
  for (const p of pts) { zMin = Math.min(zMin, p.y); zMax = Math.max(zMax, p.y); }
  const z0 = Math.floor((zMin - COSTA) / P) * P, linhas = Math.ceil((zMax + COSTA - z0) / P) + 1, xw = new Float32Array(linhas).fill(Infinity);
  for (let i = 0; i < n; i += 2) {
    const p = pts[i], a = Math.max(0, Math.floor((p.y - COSTA - z0) / P)), b = Math.min(linhas - 1, Math.ceil((p.y + COSTA - z0) / P));
    for (let k = a; k <= b; k++) { const dz = z0 + k * P - p.y; if (Math.abs(dz) <= COSTA) xw[k] = Math.min(xw[k], p.x - Math.sqrt(COSTA * COSTA - dz * dz)); }
  }
  let k0 = 0, k1 = linhas - 1; while (!isFinite(xw[k0])) k0++; while (!isFinite(xw[k1])) k1--;
  const suave = Float32Array.from(xw); // dois passes de média de 5 linhas: a costa não tem canto vivo
  for (let passe = 0; passe < 2; passe++) {
    const base = Float32Array.from(suave);
    for (let k = k0; k <= k1; k++) { let s = 0, c = 0; for (let d = -2; d <= 2; d++) { const q = Math.min(k1, Math.max(k0, k + d)); s += base[q]; c++; } suave[k] = s / c; }
  }
  const zTopo = z0 + k0 * P, zFundo = z0 + k1 * P, oeste = []; // o contorno: da ponta norte para o sul, de x = suave
  for (let k = k0; k <= k1; k++) oeste.push([suave[k], z0 + k * P]);
  const xCosta = (z) => { const f = (z - z0) / P, k = Math.min(k1 - 1, Math.max(k0, Math.floor(f))), t = Math.min(1, Math.max(0, f - k)); return suave[k] * (1 - t) + suave[k + 1] * t; };
  const mar = (x, z) => z < zTopo || z > zFundo || x < xCosta(z);
  // o contorno da terra, de leste a leste, com a costa norte e a sul retas
  const terra = [[LESTE, zTopo], ...oeste, [LESTE, zFundo]];
  // ---- a lagoa: na laçada do sul, entre a reta dos boxes (o prédio fica do lado oeste dela) e a reta de trás ----
  const ioeste = [Math.floor(0.735 * n), Math.floor(0.885 * n)], iBox = []; // a reta de trás (vai para o sul) e a dos boxes (vai para o norte)
  for (let i = Math.floor(0.905 * n); i < n; i++) iBox.push(i); for (let i = 0; i <= Math.floor(0.045 * n); i++) iBox.push(i);
  const LAGOA_Z = [5950, 7120], dentroZ = (z) => z >= LAGOA_Z[0] && z <= LAGOA_Z[1];
  const ladoO = [], ladoL = [];
  for (let i = ioeste[0]; i <= ioeste[1]; i += 5) {
    const p = pts[i], s = p.nx > 0 ? 1 : -1, d = W / 2 + 66 + 56; // para dentro da laçada (para leste)
    if (dentroZ(p.y)) ladoO.push([p.x + p.nx * s * d, p.y + p.ny * s * d]);
  }
  for (const i of iBox.filter((_, j) => j % 5 === 0)) {
    const p = pts[i], d = 262; // atrás do prédio dos boxes (150 + 62 + 50 de calçada)
    if (dentroZ(p.y)) ladoL.push([p.x - p.nx * d, p.y - p.ny * d]);
  }
  ladoO.sort((a, b) => a[1] - b[1]); ladoL.sort((a, b) => b[1] - a[1]);
  const lagoaPoly = ladoO.length > 3 && ladoL.length > 3 ? [...ladoO, ...ladoL] : null;
  const lagoa = (x, z) => !!lagoaPoly && dentroDe(lagoaPoly, x, z);
  tr.ocupado = (x, z) => mar(x, z) || lagoa(x, z);
  tr.costaJeddah = { mar, lagoa, xCosta, zTopo, zFundo };
  // a lagoa também fica reservada (os enfeites que só olham tr.reservado): um disco a cada 90 pelo meio dela
  tr.reservado ||= [];
  if (lagoaPoly) for (let i = 0; i < ladoO.length; i += 2) {
    const a = ladoO[i], b = ladoL[ladoL.length - 1 - Math.min(ladoL.length - 1, Math.round((i / ladoO.length) * ladoL.length))] || a;
    const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2, raio = Math.hypot(a[0] - b[0], a[1] - b[1]) / 2 + 30; tr.reservado.push([cx, cz, raio]);
  }

  // ---- materiais ----
  const mat = (cor, o = {}) => { const m = new THREE.MeshStandardMaterial({ map: aguaTex(cor), roughness: 0.14, metalness: 0.28, ...o }); tr.agua.push(m); return m; };
  const L = lotes();
  const pedra = (cor, linha) => new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide, map: canvasTex(64, 64, (x, w, hh, rr) => {
    x.fillStyle = cor; x.fillRect(0, 0, w, hh); for (let i = 0; i < 160; i++) { x.fillStyle = rr() < 0.5 ? "#0000000c" : "#ffffff18"; x.fillRect(rr() * w, rr() * hh, 3, 3); }
    x.fillStyle = linha; x.fillRect(0, 0, w, 2); x.fillRect(0, 0, 2, hh); x.fillRect(0, hh / 2, w, 1);
  }) });
  const calcada = pedra("#e6dcc6", "#c9bda2"), parapeito = pedra("#f0e9d7", "#d3c8ae");
  const talude = new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide, map: canvasTex(64, 64, (x, w, hh, rr) => { x.fillStyle = "#d9c79a"; x.fillRect(0, 0, w, hh); for (let i = 0; i < 400; i++) { x.fillStyle = rr() < 0.5 ? "#c9b685" : "#e6d6ac"; x.fillRect(rr() * w, rr() * hh, 2, 2); } }) });
  const raso = new THREE.MeshStandardMaterial({ map: aguaTex("#3fc0c8"), roughness: 0.14, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, transparent: true, opacity: 0.8 }); tr.agua.push(raso);

  // ---- o mar: um plano enorme com a terra recortada ----
  const forma = new THREE.Shape([[-7000, -7000], [LESTE + 1500, -7000], [LESTE + 1500, 16000], [-7000, 16000]].map(([x, z]) => new THREE.Vector2(x, z)));
  forma.holes.push(new THREE.Path(terra.map(([x, z]) => new THREE.Vector2(x, z))));
  const geoMar = new THREE.ShapeGeometry(forma); geoMar.rotateX(Math.PI / 2);
  const aguaMar = mat("#1d7fb0", { side: THREE.DoubleSide }); aguaMar.map.repeat.set(60, 60);
  const mm = new THREE.Mesh(geoMar, aguaMar); mm.position.y = NIVEL_MAR; mm.name = `${tr.id}-mar`; mm.receiveShadow = true; add(mm);

  // ---- a orla (corniche): talude de areia, calçada de pedra, parapeito branco e o raso turquesa na frente ----
  const borda = reamostrar([[7600, zTopo], ...oeste, [7600, zFundo]], 90), orla = [];
  borda.forEach(([x, z], i) => {
    const a = borda[Math.max(0, i - 1)], b = borda[Math.min(borda.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], m = Math.hypot(dx, dz) || 1;
    orla.push({ x, z, ix: dz / m, iz: -dx / m }); // o lado da terra
  });
  tr.orla = orla;
  const fita = (material, l0, l1, y0, y1, vEscala = 60) => {
    const l = L.de(material), base = l.vs.length / 3; let acc = 0;
    orla.forEach((o, i) => {
      if (i) acc += Math.hypot(o.x - orla[i - 1].x, o.z - orla[i - 1].z);
      l.vs.push(o.x + o.ix * l0, y0, o.z + o.iz * l0, o.x + o.ix * l1, y1, o.z + o.iz * l1); l.uv.push(0, acc / vEscala, 1, acc / vEscala);
      if (i < orla.length - 1) { const q = base + i * 2; l.idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
    });
  };
  fita(talude, 64, 22, -1.2, 1.0);
  fita(calcada, 22, 3, 1.0, 1.0, 40);
  fita(parapeito, 3, 3, 1.0, 2.4, 40);
  fita(parapeito, 3, 0, 2.4, 2.4, 40);
  fita(parapeito, 0, 0, 2.4, 0.2, 40);
  L.montar(add, `${tr.id}-orla`);
  const rasoL = lotes(), lr = rasoL.de(raso), baseR = lr.vs.length / 3; let acc = 0;
  orla.forEach((o, i) => {
    if (i) acc += Math.hypot(o.x - orla[i - 1].x, o.z - orla[i - 1].z);
    const largo = 150 + 40 * Math.sin(i * 0.7); // a faixa rasa não é uma régua
    lr.vs.push(o.x, 0.62, o.z, o.x - o.ix * largo, 0.62, o.z - o.iz * largo); lr.uv.push(0, acc / 120, 1, acc / 120);
    if (i < orla.length - 1) { const q = baseR + i * 2; lr.idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
  });
  rasoL.montar(add, `${tr.id}-raso`);

  // ---- a lagoa: água num nível só, com muro de pedra em volta ----
  let nivelLagoa = null;
  if (lagoaPoly) {
    const alturas = lagoaPoly.map(([x, z]) => tr.chao(x, z)).sort((a, b) => a - b);
    nivelLagoa = Math.max(1.4, alturas[Math.floor(alturas.length * 0.7)] + 0.7);
    const shape = new THREE.Shape(lagoaPoly.map(([x, z]) => new THREE.Vector2(x, z))), g = new THREE.ShapeGeometry(shape); g.rotateX(Math.PI / 2);
    const aguaL = mat("#1b9ab8", { side: THREE.DoubleSide }); aguaL.map.repeat.set(5, 9);
    const ml = new THREE.Mesh(g, aguaL); ml.position.y = nivelLagoa; ml.name = `${tr.id}-lagoa`; ml.receiveShadow = true; add(ml);
    // o muro de contenção em volta (a calçada fica no nível da água + 1,2) e o declive de fora até o chão
    const LL = lotes(), loop = reamostrar([...lagoaPoly, lagoaPoly[0]], 40), cx = lagoaPoly.reduce((s, p) => s + p[0], 0) / lagoaPoly.length, cz = lagoaPoly.reduce((s, p) => s + p[1], 0) / lagoaPoly.length;
    const lv = LL.de(parapeito), lc = LL.de(calcada), base = lv.vs.length / 3, base2 = lc.vs.length / 3; let a2 = 0;
    loop.forEach(([x, z], i) => {
      if (i) a2 += Math.hypot(x - loop[i - 1][0], z - loop[i - 1][1]);
      const A = loop[Math.max(0, i - 1)], B = loop[Math.min(loop.length - 1, i + 1)], dx = B[0] - A[0], dz = B[1] - A[1], m = Math.hypot(dx, dz) || 1;
      let nx = dz / m, nz = -dx / m; if ((x - cx) * nx + (z - cz) * nz < 0) { nx = -nx; nz = -nz; } // para fora da lagoa
      const topo = nivelLagoa + 1.2;
      // muro: da água ao topo; calçada: 14 para fora, no topo
      lv.vs.push(x, nivelLagoa - 0.5, z, x, topo, z); lv.uv.push(0, a2 / 40, 1, a2 / 40);
      lc.vs.push(x, topo, z, x + nx * 16, topo, z + nz * 16); lc.uv.push(0, a2 / 40, 1, a2 / 40);
      if (i < loop.length - 1) { const q = base + i * 2, q2 = base2 + i * 2; lv.idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); lc.idx.push(q2, q2 + 2, q2 + 1, q2 + 1, q2 + 2, q2 + 3); }
    });
    LL.montar(add, `${tr.id}-lagoa-orla`);
  }
  void M;
  return { mar, lagoa, orla, lagoaPoly, nivelLagoa, xCosta, zTopo, zFundo };
}
