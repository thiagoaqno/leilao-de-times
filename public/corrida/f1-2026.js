// Corrida da Galera — o carro de F1 de 2026 (public/corrida/f1/2026/carro.glb e carro-leve.glb, o "2026 Audi R26" de Dave Love, CC-BY-4.0;
// ver f1/2026/LICENCA.txt). O modelo vem com 31 malhas e 28 materiais; aqui, UMA vez por arquivo, ele vira poucas peças (menos chamadas de
// desenho que o carro clássico): o corpo todo num material só (a pintura de equipe de f1-pintura.js), o flap da asa traseira (gira com o
// DRS), cada roda inteira (pneu, aro e disco, com cor por vértice), o volante e as luzes. f1.js usa o que sai daqui (`construir2026`).
// Os decalques de patrocinadores do modelo (marcas de verdade) e o número 27 NÃO entram: a pintura das equipes tem os patrocínios inventados.
// Medidas em metros do carro (o comprimento fica igual ao do modelo clássico, TAM); a frente é −z, como em todo o jogo.
import * as THREE from "three";
import { aroDaRoda } from "./f1-pintura.js";

// Onde as coisas estão no modelo original (em metros do ARQUIVO: a frente é +z e o chão é y = 0)
export const CFG_2026 = {
  eixoTras: -0.15,      // z que separa as rodas da frente das de trás: o meio da distância entre os eixos
  asa: { z: -2.15, y: 0.78, x: 0.57 }, // o flap: o que fica atrás de z, acima de y e dentro de ±x (a asa traseira, fora as placas das pontas)
  escapamento: [0, 0.5, -1.77],        // a ponta do escapamento dourado (x, y, z)
  // abaixo, já em metros do carro (depois da escala)
  olho: { dz: 0.62, dy: 0.32, baixo: 0.13 }, // o capacete do piloto em relação ao centro do volante e quanto o olhar desce (rad), para a câmera de cockpit pegar o volante
  numPos: [3.2, 0.55, 4.17, 0.52],    // os números do piloto: (s, y) na lateral da tampa do motor e (s, y) na asa traseira
  drs: 0.5,                            // quanto o flap abre (rad)
  disco: { dx: -0.03, k: 0.6 },        // o brilho do freio: deslocamento lateral e tamanho em relação ao do carro clássico
};

// cores de cada coisa pequena que vira cor por vértice (sRGB)
const COR = {
  glass: "#2b434d", sauber_mirror_right: "#20252b", chrome: "#2a2d33", black_s: "#101113", driver_color: "#dcec1c", gp21_cinture: "#202329",
  whitelight: "#cfd2d6", chrome_ao: "#8d9298", kers_red: "#c81414", kers_yellow: "#e6dc20", kers_green: "#12c035",
  indicator_lights: "#a4a8ac", vehicle_revs_type2: "#0a0b0d",
  tread_medium: "#111113", sauber_wheel_hub: "#34373d", discs: "#55504a",
};
const SEM_NOME = (m) => m.name.replace(/\.\d+$/, "");
const DESCARTA = new Set(["sauber_decals", "sauber_number_27", "sw_decals"]); // patrocinadores de verdade e o número 27 do modelo
const CORPO = new Set(["sauber_paint", "sauber_carbon1", "sauber_carbon3"]);
const MIUDEZAS = new Set(["glass", "sauber_mirror_right", "chrome", "black_s", "gp21_cinture", "whitelight"]);
const PILOTO = new Set(["driver_color"]); // o que o modelo tem do piloto (a faixa da cor dele, em cima da entrada de ar): some na câmera de cockpit (f1.js: k.piloto)
const VOLANTE_DET = new Set(["chrome_ao", "kers_red", "kers_yellow", "kers_green", "indicator_lights", "vehicle_revs_type2"]);
export const N_LEDS = 15; // as luzes de troca de marcha em cima do volante (o modelo traz 15, cada uma em dobro: base e lente)
const RODA = new Set(["tread_medium", "sauber_wheel_hub", "discs"]);

// ---------- triângulos soltos: { pos, nor, uv, idx } em Float32 (o arquivo guarda tudo quantizado) ----------
function extrair(o) {
  const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, n = P.count, v = new THREE.Vector3();
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = U ? new Float32Array(n * 2) : null;
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    if (N) { v.fromBufferAttribute(N, i).transformDirection(o.matrixWorld); nor[i * 3] = v.x; nor[i * 3 + 1] = v.y; nor[i * 3 + 2] = v.z; }
    if (U) { uv[i * 2] = U.getX(i); uv[i * 2 + 1] = U.getY(i); }
  }
  const idx = g.index ? Uint32Array.from(g.index.array) : Uint32Array.from({ length: n }, (_, i) => i);
  return { pos, nor, uv, idx };
}
function reindexar(f, tris) {
  const mapa = new Map(), pos = [], nor = [], uv = [], idx = [];
  for (const i of tris) {
    let n = mapa.get(i);
    if (n === undefined) { n = mapa.size; mapa.set(i, n); pos.push(f.pos[i * 3], f.pos[i * 3 + 1], f.pos[i * 3 + 2]); nor.push(f.nor[i * 3], f.nor[i * 3 + 1], f.nor[i * 3 + 2]); if (f.uv) uv.push(f.uv[i * 2], f.uv[i * 2 + 1]); }
    idx.push(n);
  }
  return { pos: Float32Array.from(pos), nor: Float32Array.from(nor), uv: f.uv ? Float32Array.from(uv) : null, idx: Uint32Array.from(idx), nome: f.nome, rgb: f.rgb };
}
// separa os triângulos pelo centro de cada um: [os que passam no teste, os outros]
function fatiar(f, teste) {
  const a = [], b = [], c = [0, 0, 0];
  for (let t = 0; t < f.idx.length; t += 3) {
    const i = f.idx[t], j = f.idx[t + 1], k = f.idx[t + 2];
    for (let e = 0; e < 3; e++) c[e] = (f.pos[i * 3 + e] + f.pos[j * 3 + e] + f.pos[k * 3 + e]) / 3;
    (teste(c) ? a : b).push(i, j, k);
  }
  return [reindexar(f, a), reindexar(f, b)];
}
// põe as listas numa geometria só; o `rgb` de cada uma vira cor por vértice
function juntar(lista, { uv = false, cor = false } = {}) {
  let nv = 0, ni = 0; for (const f of lista) { nv += f.pos.length / 3; ni += f.idx.length; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = new Uint32Array(ni), U = uv ? new Float32Array(nv * 2) : null, C = cor ? new Float32Array(nv * 3) : null;
  let ov = 0, oi = 0;
  for (const f of lista) {
    const n = f.pos.length / 3; pos.set(f.pos, ov * 3); nor.set(f.nor, ov * 3);
    if (U && f.uv) U.set(f.uv, ov * 2);
    if (C) { const c = new THREE.Color(f.rgb || "#202020"); for (let i = 0; i < n; i++) { C[(ov + i) * 3] = c.r; C[(ov + i) * 3 + 1] = c.g; C[(ov + i) * 3 + 2] = c.b; } }
    for (let i = 0; i < f.idx.length; i++) idx[oi + i] = f.idx[i] + ov;
    ov += n; oi += f.idx.length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  if (U) g.setAttribute("uv", new THREE.BufferAttribute(U, 2));
  if (C) g.setAttribute("color", new THREE.BufferAttribute(C, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1)); return g;
}
const caixaDe = (lista) => { const b = new THREE.Box3(), v = new THREE.Vector3(); for (const f of lista) for (let i = 0; i < f.pos.length; i += 3) b.expandByPoint(v.set(f.pos[i], f.pos[i + 1], f.pos[i + 2])); return b; };
const centrar = (g, c) => { g.translate(-c.x, -c.y, -c.z); g.computeBoundingSphere(); return g; };

// o quaternion que leva o eixo da roda (o menor autovetor da dispersão dos pontos do pneu, sinal com x > 0) para o X do carro: desfaz a cambagem
function quaternioDoEixo(lista, centro) {
  const m = new THREE.Vector3(), v = new THREE.Vector3(); let n = 0;
  for (const f of lista) for (let i = 0; i < f.pos.length; i += 3) { m.add(v.set(f.pos[i], f.pos[i + 1], f.pos[i + 2])); n++; }
  m.multiplyScalar(1 / Math.max(1, n)); const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const f of lista) for (let i = 0; i < f.pos.length; i += 3) { const d = [f.pos[i] - m.x, f.pos[i + 1] - m.y, f.pos[i + 2] - m.z]; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) C[a][b] += d[a] * d[b] / n; }
  const tr = C[0][0] + C[1][1] + C[2][2], e = new THREE.Vector3(1, 0.3, 0.2).normalize(); // (a potência de tr·I − C acha o menor autovetor: o pneu é largo e fino, o eixo é o lado curto)
  for (let k = 0; k < 120; k++) e.set(tr * e.x - (C[0][0] * e.x + C[0][1] * e.y + C[0][2] * e.z), tr * e.y - (C[1][0] * e.x + C[1][1] * e.y + C[1][2] * e.z), tr * e.z - (C[2][0] * e.x + C[2][1] * e.y + C[2][2] * e.z)).normalize();
  if (e.x < 0) e.negate();
  return new THREE.Quaternion().setFromUnitVectors(e, new THREE.Vector3(1, 0, 0));
}
// a face de trás de um espelho (a face grande da carcaça, que olha para o piloto): o centro, a normal (para trás), os eixos e o tamanho dela, no quadro do carro
function faceDoEspelho(f) {
  const P = f.pos, I = f.idx, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nm = new THREE.Vector3(), tris = [], baldes = new Map();
  for (let t = 0; t < I.length; t += 3) {
    a.fromArray(P, I[t] * 3); b.fromArray(P, I[t + 1] * 3); c.fromArray(P, I[t + 2] * 3);
    nm.crossVectors(b.clone().sub(a), c.clone().sub(a)); const area = nm.length() / 2; if (area < 1e-9) continue; nm.normalize();
    if (nm.x * f.nor[I[t] * 3] + nm.y * f.nor[I[t] * 3 + 1] + nm.z * f.nor[I[t] * 3 + 2] < 0) nm.negate(); // (o sentido de fora pelas normais do vértice)
    if (nm.z <= 0.3) continue; // só o que olha para trás
    const t3 = { n: nm.clone(), area, c: a.clone().add(b).add(c).multiplyScalar(1 / 3), ia: I[t], ib: I[t + 1], ic: I[t + 2] }; tris.push(t3);
    const k = [nm.x, nm.y, nm.z].map((x) => Math.round(x * 5)).join(","); baldes.set(k, (baldes.get(k) || 0) + area);
  }
  if (!tris.length) return null;
  const melhor = [...baldes.entries()].sort((x, y) => y[1] - x[1])[0][0].split(",").map((x) => +x / 5), alvo = new THREE.Vector3(...melhor).normalize();
  const dom = new THREE.Vector3(); for (const t of tris) if (t.n.dot(alvo) > 0.9) dom.addScaledVector(t.n, t.area); dom.normalize();
  const face = tris.filter((t) => t.n.dot(dom) > 0.95); if (!face.length) return null;
  const cen = new THREE.Vector3(); let at = 0; for (const t of face) { cen.addScaledVector(t.c, t.area); at += t.area; } cen.multiplyScalar(1 / at);
  const cima = new THREE.Vector3(0, 1, 0).addScaledVector(dom, -dom.y).normalize(), dir = new THREE.Vector3().crossVectors(cima, dom).normalize();
  let r0 = 1e9, r1 = -1e9, u0 = 1e9, u1 = -1e9, w = new THREE.Vector3();
  for (const t of face) for (const i of [t.ia, t.ib, t.ic]) { w.fromArray(P, i * 3).sub(cen); const rr = w.dot(dir), uu = w.dot(cima); r0 = Math.min(r0, rr); r1 = Math.max(r1, rr); u0 = Math.min(u0, uu); u1 = Math.max(u1, uu); }
  const centro = cen.clone().addScaledVector(dir, (r0 + r1) / 2).addScaledVector(cima, (u0 + u1) / 2);
  return { centro: centro.toArray(), n: dom.toArray(), r: dir.toArray(), u: cima.toArray(), w: r1 - r0, h: u1 - u0 };
}

// ---------- o carro: tudo o que f1.js precisa, pronto e no quadro do carro ----------
// `raiz`: a cena do arquivo; `tam`: o comprimento do carro (m); `leve`: o modelo dos outros carros (sem o cockpit)
export function construir2026(raiz, tam, leve) {
  const C = CFG_2026;
  raiz.updateMatrixWorld(true);
  const fontes = [], mats = {};
  raiz.traverse((o) => {
    if (!o.isMesh) return; const nome = SEM_NOME(o.material); if (DESCARTA.has(nome)) return;
    const f = extrair(o); f.nome = nome; f.rgb = COR[nome]; fontes.push(f);
    if (!mats[nome]) mats[nome] = o.material;
  });
  // o quadro do carro: centro do comprimento e da largura, rodas no chão, comprimento = tam, a frente para −z (vira meia-volta)
  const todos = caixaDe(fontes), c0 = todos.getCenter(new THREE.Vector3()), s = tam / (todos.max.z - todos.min.z), yMin = todos.min.y;
  const F = (x, y, z) => [-(x - c0.x) * s, (y - yMin) * s, -(z - c0.z) * s];
  for (const f of fontes) for (let i = 0; i < f.pos.length; i += 3) {
    f.pos[i] = -(f.pos[i] - c0.x) * s; f.pos[i + 1] = (f.pos[i + 1] - yMin) * s; f.pos[i + 2] = -(f.pos[i + 2] - c0.z) * s; f.nor[i] = -f.nor[i]; f.nor[i + 2] = -f.nor[i + 2];
  }
  const de = (conj) => fontes.filter((f) => conj.has(f.nome));
  const D = { mats, rodas: [], flap: null, volante: null, volanteDet: null, miudezas: null, luz: null, detalhes: null, mecanica: null, corpo: null };

  // --- o corpo: pintura, carbono das asas e da tampa do motor, num material só. O flap sai da asa traseira.
  const [ax, ay, az] = F(C.asa.x, C.asa.y, C.asa.z), asaTeste = (c) => c[2] > az && c[1] > ay && Math.abs(c[0]) < Math.abs(ax);
  // o aro do volante: no arquivo ele vem dentro do carbono do corpo (sauber_carbon3), não no material do volante; sai do corpo e vai para o volante (gira junto)
  const rA = F(-0.16, 0.5, 0.44), rB = F(0.16, 0.7, 0.55), rMin = rA.map((v, i) => Math.min(v, rB[i])), rMax = rA.map((v, i) => Math.max(v, rB[i]));
  const noAro = (c) => c[0] > rMin[0] && c[0] < rMax[0] && c[1] > rMin[1] && c[1] < rMax[1] && c[2] > rMin[2] && c[2] < rMax[2];
  const flapFontes = [], restoFontes = [], aroFontes = [];
  for (let f of de(CORPO)) {
    if (!leve && f.nome === "sauber_carbon3") { const [aro, resto] = fatiar(f, noAro); if (aro.idx.length) { aro.rgb = "#101216"; aroFontes.push(aro); } f = resto; }
    // (o carbono do arquivo, `sauber_carbon1/3`, fica preto: só o que é `sauber_paint` leva a cor da equipe; o rgb vira a cor do vértice e entra na máscara)
    const tinta = f.nome === "sauber_paint" ? "#ffffff" : "#000000";
    const [dentro, fora] = fatiar(f, asaTeste); dentro.rgb = fora.rgb = tinta; if (dentro.idx.length) flapFontes.push(dentro); restoFontes.push(fora);
  }
  // para a pintura (f1-pintura.js): `pcar` = (x, y, s) com s = distância desde a ponta do bico, `ncar` = a normal e `mcar` = quanto vale a pintura
  // (0 = carbono: a barriga e o assoalho)
  let zNariz = 1e9; for (const f of restoFontes) for (let i = 2; i < f.pos.length; i += 3) if (f.pos[i] < zNariz) zNariz = f.pos[i];
  // o miolo do volante também é "pintura" no arquivo, mas o volante é de carbono: fica fora (caixa em metros do arquivo)
  const vA = F(-0.16, 0.5, 0.44), vB = F(0.16, 0.7, 0.64), vMin = vA.map((v, i) => Math.min(v, vB[i])), vMax = vA.map((v, i) => Math.max(v, vB[i]));
  const noVolante = (x, y, z) => x > vMin[0] && x < vMax[0] && y > vMin[1] && y < vMax[1] && z > vMin[2] && z < vMax[2];
  const comPintura = (g) => {
    const p = g.attributes.position, n = g.attributes.normal, tinta = g.attributes.color, N = p.count, P = new Float32Array(N * 3), M = new Float32Array(N), NN = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const y = p.getY(i), ny = n.getY(i), sv = p.getZ(i) - zNariz;
      P[i * 3] = p.getX(i); P[i * 3 + 1] = y; P[i * 3 + 2] = sv; NN[i * 3] = n.getX(i); NN[i * 3 + 1] = ny; NN[i * 3 + 2] = n.getZ(i);
      let m = Math.min(1, Math.max(0, (ny + 0.45) / 0.3)); // de baixo para cima: a barriga é de carbono
      if (y < 0.1 && sv > 1.15 && sv < 4.05) m = 0;         // o assoalho, entre os eixos
      if (noVolante(p.getX(i), y, p.getZ(i))) m = 0;
      if (tinta) m *= tinta.getX(i); // o carbono do arquivo
      M[i] = m;
    }
    if (tinta) g.deleteAttribute("color");
    g.setAttribute("pcar", new THREE.BufferAttribute(P, 3)); g.setAttribute("ncar", new THREE.BufferAttribute(NN, 3)); g.setAttribute("mcar", new THREE.BufferAttribute(M, 1)); return g;
  };
  D.corpo = comPintura(juntar(restoFontes, { cor: true }));
  if (flapFontes.length) {
    const g = comPintura(juntar(flapFontes, { cor: true })), p = g.attributes.position, b = new THREE.Box3().setFromBufferAttribute(p), ys = [];
    for (let i = 0; i < p.count; i++) if (p.getZ(i) < b.min.z + 0.04) ys.push(p.getY(i));
    const pos = new THREE.Vector3(0, ys.reduce((a, c) => a + c, 0) / Math.max(1, ys.length), b.min.z); // a dobradiça: a borda da frente do flap
    D.flap = { geo: centrar(g, pos), pos };
  }

  // --- peças com a textura do arquivo (sem os patrocinadores)
  const unir = (conj, opc) => { const l = de(conj); return l.length ? juntar(l, opc) : null; };
  // o anel de LEDs do modelo (rear_light_2, no meio do difusor, abaixo da asa) só marca ONDE fica a lanterna do jogo (carros.js): ela não muda de jeito
  const [ra, rb] = fatiar(de(new Set(["rear_light_2"]))[0], (c) => Math.abs(c[0]) < 0.08 && c[1] < (0.5 - yMin) * s && c[2] > 1.8);
  if (ra.idx.length) { const b = caixaDe([ra]), t = b.getCenter(new THREE.Vector3()); D.lanterna = { x: 0, y: t.y, z: b.max.z + 0.03 }; }
  D.detalhes = unir(new Set(["sauber_detail"]), { uv: true }); D.mecanica = unir(new Set(["generics"]), { uv: true }); D.luz = unir(new Set(["rear_light_2"]), { uv: true });

  // --- as rodas: o arquivo traz as quatro juntas em cada malha; aqui cada roda vira UMA malha (pneu + aro + disco), com o centro na origem
  const meio = F(0, 0, C.eixoTras)[2];
  const quad = (c) => (c[0] < 0 ? 0 : 1) + (c[2] < meio ? 2 : 0); // 0 = esquerda atrás, 1 = direita atrás, 2 = esquerda frente, 3 = direita frente
  const rodas = [[], [], [], []], pneuQ = [[], [], [], []];
  for (const f of de(RODA)) {
    let resto = f;
    for (let q = 0; q < 4; q++) {
      const [dentro, fora] = fatiar(resto, (c) => quad(c) === q); resto = fora;
      if (!dentro.idx.length) continue; rodas[q].push(dentro); if (f.nome === "tread_medium") pneuQ[q].push(dentro);
    }
  }
  rodas.forEach((lista, q) => {
    if (!lista.length) return;
    const bp = caixaDe(pneuQ[q].length ? pneuQ[q] : lista), centro = bp.getCenter(new THREE.Vector3()), r = (bp.max.y - bp.min.y) / 2;
    // o eixo REAL da roda: as da frente do modelo têm cambagem (~3°), então girar em torno do X do carro as faria balançar. A malha é desinclinada (o eixo vai para o X)
    // e a inclinação volta no pivô (`camber`, f1.js), FORA do giro: a roda gira em torno do próprio eixo, que passa pelo centro do cubo, e parada fica como no modelo.
    const discos = lista.filter((f) => f.nome === "discs"); // (o disco é uma chapa fina: a normal dela dá o eixo com limpeza; sem ele, vale o pneu)
    const Q = quaternioDoEixo(discos.length ? discos : pneuQ[q].length ? pneuQ[q] : lista, centro);
    const g = centrar(juntar(lista, { cor: true }), centro); g.applyQuaternion(Q); g.computeBoundingSphere();
    const a = aroDaRoda(g.attributes.position, g.index.array);
    g.setAttribute("aro", a.aro); g.setAttribute("pneuLat", a.lat);
    D.rodas.push({ geo: g, centro, r, frente: q >= 2, lado: q % 2 ? 1 : -1, camber: Q.clone().invert() });
  });

  if (!leve) {
    D.miudezas = unir(MIUDEZAS, { cor: true }); D.piloto = unir(PILOTO, { cor: true });
    // os retrovisores (espelhos.js): onde fica a face de trás de cada um, no quadro do carro (z maior = mais para trás) e a largura da peça
    D.espelhos = de(new Set(["sauber_mirror_right"])).map(faceDoEspelho).filter(Boolean);
    // --- o volante (as luzes e os mostradores dele giram junto): o centro é o da malha do volante; vira em torno do eixo z (o rosto olha para trás)
    const vol = de(new Set(["audi_steeringwheel"]));
    if (vol.length) {
      const centro = caixaDe(vol).getCenter(new THREE.Vector3());
      D.volante = { geo: centrar(juntar(vol, { uv: true }), centro), centro };
      const det = [...de(VOLANTE_DET), ...aroFontes]; if (det.length) D.volanteDet = centrar(juntar(det, { cor: true }), centro);
      // a tela do meio (generic_lcd): o uv vira o retângulo da tela inteiro, para a textura de canvas de f1.js (atualizarVolante)
      const lcd = de(new Set(["generic_lcd"]))[0];
      if (lcd) {
        const b = caixaDe([lcd]), w = b.max.x - b.min.x, h = b.max.y - b.min.y, uv = new Float32Array(lcd.pos.length / 3 * 2);
        for (let i = 0; i < uv.length / 2; i++) { uv[i * 2] = (lcd.pos[i * 3] - b.min.x) / w; uv[i * 2 + 1] = (lcd.pos[i * 3 + 1] - b.min.y) / h; } // (visto de trás, o +x do carro é a direita)
        D.tela = { geo: centrar(juntar([{ ...lcd, uv }], { uv: true }), centro), prop: w / h };
      }
      // as 15 luzes de troca (CLEARLED): cada vértice sabe de qual luz é (da esquerda para a direita de quem dirige) e a cor muda por vértice
      const led = de(new Set(["CLEARLED"]));
      if (led.length) {
        const g = centrar(juntar(led, { cor: true }), centro), p = g.attributes.position, b = new THREE.Box3().setFromBufferAttribute(p), larg = (b.max.x - b.min.x) / N_LEDS * 0.7, idx = new Uint8Array(p.count);
        for (let i = 0; i < p.count; i++) idx[i] = Math.max(0, Math.min(N_LEDS - 1, Math.round((p.getX(i) - b.min.x - larg / 2) / ((b.max.x - b.min.x - larg) / (N_LEDS - 1)))));
        g.userData.led = idx; D.leds = { geo: g };
      }
    }
  }
  const [ex, ey, ez] = F(...C.escapamento); D.escapamento = { x: Math.max(0.05, Math.abs(ex)), y: ey, z: ez };
  D.olho = C.olho; D.numPos = C.numPos; D.drs = C.drs; D.disco = C.disco;
  return D;
}
