// Zandvoort — as dunas do mar do Norte (peça só desta pista). O circuito corre dentro de um parque de dunas de areia clara cobertas de
// capim-de-praia (Ammophila), moitas de espinheiro-marítimo e pinheiros baixos entortados pelo vento, com a praia e o mar a oeste, do lado
// dos boxes. Aqui:
// 1. `terrenoDeDunas`: o relevo de dunas (uma malha só, cor por vértice: areia nas cristas, capim nas encostas, moitas escuras e manchas
//    de areia solta) que começa longe do asfalto e cresce com a distância, e a praia que desce para o mar; o chão da pista continua
//    sendo o de pista.js (o relevo da pista não muda). `alturaEm(x, z)` devolve a altura da duna;
// 2. `marEPraia`: o mar (água que anda, tr.agua), a espuma da arrebentação e a faixa de areia molhada; `tr.ocupado` passa a dizer "é mar";
// 3. `capimDePraia`, `moitas` e `pinheirosBravos`: a vegetação em InstancedMesh, só onde `livre` e `ocupado` deixam, em manchas por ruído.
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { livre, ocupado, sorteio, instancias } from "../comum.js";
import { ruido, passo01, lim, eixoDaCosta } from "./lugar.js";

const cor = (c) => new THREE.Color(c);
const AREIA = cor("#dccd9c"), AREIA_CLARA = cor("#ebdfb8"), CAPIM = cor("#aab067"), CAPIM_VERDE = cor("#86a050"), MOITA = cor("#69744a"), MOITA_ESCURA = cor("#4b5c3a"), TERRA = cor("#b4aa70");

// ---- o terreno ----
export function terrenoDeDunas(tr, add, { inicio = 150, fim = 640, altura = 150, passo = 70, margem = 1400 } = {}) {
  const { pts } = tr, mundo = tr.t.world, eixo = eixoDaCosta(tr), x0 = -margem, nn = Math.ceil((mundo + margem * 2) / passo), lado = nn + 1;
  const alt = new Float32Array(lado * lado), pos = new Float32Array(lado * lado * 3), cores = new Float32Array(lado * lado * 3), uso = new Uint8Array(lado * lado), dist = new Float32Array(lado * lado);
  const c = new THREE.Color();
  // quanto o lugar está tomado por uma peça (arquibancada, prédio...): as dunas cedem ali, para não furar nada
  const reservas = tr.reservado || [];
  const folga = (x, z) => { let m = 1e9; for (const [cx, cz, r] of reservas) { const d = Math.hypot(x - cx, z - cz) - r; if (d < m) m = d; } return m; };
  for (let j = 0; j < lado; j++) for (let i = 0; i < lado; i++) {
    const x = x0 + i * passo, z = x0 + j * passo, k = j * lado + i, d = tr.distAt(x, z), s = eixo.s(x, z), uu = eixo.u(x, z), terra = s - eixo.costa(uu);
    let m = passo01(inicio, fim, d); // cresce com a distância da pista
    if (m > 0 && d < 2600 && dentroDaVolta(pts, x, z)) m *= 0.55; // dentro da volta (o miolo): as dunas são mais baixas
    const praia = passo01(0, 160, terra); // zero na linha d'água
    const r1 = ruido(x / 560, z / 560, 3), r2 = ruido(x / 240, z / 240, 4), r3 = ruido(x / 96, z / 96, 5), crista = 1 - Math.abs(ruido(x / 360, z / 360, 9) * 2 - 1); // cristas alongadas de duna
    const bruto = r1 * 0.45 + r2 * 0.25 + r3 * 0.1 + crista * crista * 0.3; // 0 a 1
    const bump = (10 + altura * bruto * bruto) * m * praia * passo01(-10, 80, folga(x, z));
    const base = Math.max(tr.chao(x, z) - 1.5, -1.2 + 5.2 * passo01(0, 240, terra)); // a praia sobe da água até as dunas
    const y = base + bump - 0.8; // 0,8 abaixo do terreno de pista.js: só aparece onde a duna passa dele
    alt[k] = bump; dist[k] = d; pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; uso[k] = terra > -40 ? 1 : 0;
    // a cor: capim nas encostas e nas baixadas, areia limpa nas cristas e perto da praia, moitas escuras em manchas
    const alto = lim(bump / (altura * 0.55)), mancha = ruido(x / 130, z / 130, 21), solta = ruido(x / 210, z / 210, 33), moita = ruido(x / 170, z / 170, 41);
    c.copy(CAPIM).lerp(CAPIM_VERDE, passo01(0.4, 0.75, mancha) * (1 - alto)).lerp(AREIA, passo01(0.25, 0.85, alto) * 0.9);
    if (solta > 0.62) c.lerp(AREIA_CLARA, (solta - 0.62) * 2.8);
    if (moita > 0.66 && alto < 0.7) c.lerp(moita > 0.8 ? MOITA_ESCURA : MOITA, (moita - 0.66) * 2.6);
    c.lerp(AREIA_CLARA, 1 - passo01(0, 120, terra)); // a praia
    c.lerp(TERRA, 1 - passo01(inicio * 0.6, inicio * 1.6, d)); // junto da pista: a cor do chão de sempre
    c.multiplyScalar(0.92 + ruido(x / 40, z / 40, 7) * 0.14);
    cores[k * 3] = c.r; cores[k * 3 + 1] = c.g; cores[k * 3 + 2] = c.b;
  }
  const idx = [];
  for (let j = 0; j < nn; j++) for (let i = 0; i < nn; i++) {
    const a = j * lado + i, b = a + 1, cc = a + lado, dd = cc + 1;
    if (!(uso[a] || uso[b] || uso[cc] || uso[dd])) continue; // dentro do mar não há duna
    if (Math.max(alt[a], alt[b], alt[cc], alt[dd]) < 1.2 && Math.min(dist[a], dist[b], dist[cc], dist[dd]) < inicio * 1.15) continue; // sem duna perto da pista não há triângulo
    if (Math.abs(alt[a] - alt[dd]) < Math.abs(alt[b] - alt[cc])) idx.push(a, cc, dd, a, dd, b); else idx.push(a, cc, b, b, cc, dd); // a diagonal acompanha o relevo
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(cores, 3)); g.setIndex(idx); g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const malha = add(new THREE.Mesh(g, mat)); malha.name = `${tr.id}-dunas`; malha.receiveShadow = true; malha.castShadow = false;
  const alturaEm = (x, z) => { // a altura (y absoluta) da duna em qualquer ponto (bilinear na mesma grade): sobre ela nascem o capim e as moitas
    const u = (x - x0) / passo, v = (z - x0) / passo; if (u < 0 || v < 0 || u >= nn || v >= nn) return 0;
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, h = (a, b) => pos[(a * lado + b) * 3 + 1];
    const a0 = h(j, i), b0 = h(j, i + 1), c0 = h(j + 1, i), d0 = h(j + 1, i + 1);
    return a0 + (b0 - a0) * fu + (c0 - a0) * fv + (a0 - b0 - c0 + d0) * fu * fv + 0.8;
  };
  tr.dunasZandvoort = { triangulos: idx.length / 3, alturaEm };
  return { alturaEm, malha };
}
function dentroDaVolta(pts, x, z) {
  let d = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a.y > z) !== (b.y > z) && x < ((b.x - a.x) * (z - a.y)) / (b.y - a.y) + a.x) d = !d; }
  return d;
}

// ---- o mar e a espuma ----
export const NIVEL_MAR = -0.9;
export function marEPraia(tr, { add, aguaTex }) {
  const eixo = eixoDaCosta(tr);
  const u0 = -4200, u1 = 8200, N = 130, longe = -5200;
  const agua = new THREE.MeshStandardMaterial({ map: aguaTex("#5d8c96"), roughness: 0.22, metalness: 0.22, side: THREE.DoubleSide }); tr.agua.push(agua);
  const vs = [], uv = [], idx = [];
  for (let k = 0; k <= N; k++) {
    const uu = u0 + ((u1 - u0) * k) / N, c = eixo.costa(uu) + 6;
    for (const s of [longe, c]) { const [x, z] = eixo.mundo(s, uu); vs.push(x, NIVEL_MAR, z); uv.push(x / 520, z / 520); }
    if (k < N) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const mar = add(new THREE.Mesh(g, agua)); mar.name = `${tr.id}-mar`; mar.receiveShadow = false;
  // a espuma da arrebentação (duas linhas de onda) e a areia molhada, mais escura, na beira
  const espumaTex = canvasTex(256, 64, (x, w, h, rr) => {
    const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#ffffff00"); gr.addColorStop(0.35, "#ffffffcc"); gr.addColorStop(0.7, "#ffffff40"); gr.addColorStop(1, "#ffffff00"); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = "destination-out"; for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(0,0,0,${0.3 + rr() * 0.5})`; x.fillRect(rr() * w, rr() * h, 6 + rr() * 22, 2 + rr() * 6); } x.globalCompositeOperation = "source-over";
  });
  const espuma = new THREE.MeshBasicMaterial({ map: espumaTex, transparent: true, depthWrite: false, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide });
  const molhada = new THREE.MeshStandardMaterial({ color: 0xb9a97c, roughness: 0.55, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide });
  const fita = (mat, a, b, y, vEsc) => {
    const vs2 = [], uv2 = [], ix = []; let acc = 0;
    for (let k = 0; k <= 160; k++) {
      const uu = u0 + ((u1 - u0) * k) / 160, c = eixo.costa(uu); if (k) acc += (u1 - u0) / 160;
      for (const [q, v] of [[c + a, 0], [c + b, 1]]) { const [x, z] = eixo.mundo(q, uu); vs2.push(x, y, z); uv2.push(acc / vEsc, v); }
      if (k < 160) { const i = k * 2; ix.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); }
    }
    const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(vs2, 3)); gg.setAttribute("uv", new THREE.Float32BufferAttribute(uv2, 2)); gg.setIndex(ix); gg.computeVertexNormals();
    const m = add(new THREE.Mesh(gg, mat)); m.name = `${tr.id}-praia`; return m;
  };
  fita(molhada, 4, 52, -0.55, 200); fita(espuma, -34, 22, -0.45, 230); fita(espuma, -78, -30, -0.6, 310);
  // tudo que olha `ocupado` (árvores, torcida, arquibancadas) não nasce no mar nem na faixa da praia
  const antes = tr.ocupado;
  tr.ocupado = (x, z, i) => !!antes?.(x, z, i) || eixo.s(x, z) < eixo.costa(eixo.u(x, z)) + 130;
  tr.costaZandvoort = { eixo, nivel: NIVEL_MAR };
  return { eixo };
}

// ---- a vegetação ----
function geoCapim() { // uma touceira: seis folhas finas e curvas saindo do mesmo ponto
  const pos = [], idx = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + (k % 2) * 0.4, ca = Math.cos(a), sa = Math.sin(a), alto = 0.7 + (k % 3) * 0.15, tomba = 0.28 + (k % 2) * 0.2, b = pos.length / 3;
    const bx = ca * 0.16, bz = sa * 0.16, tx = -sa * 0.07, tz = ca * 0.07; // a base fica um pouco aberta; a ponta cai para fora, ao vento
    pos.push(bx - tx, 0, bz - tz, bx + tx, 0, bz + tz, bx * 1.4 + ca * tomba + tx * 0.2, alto, bz * 1.4 + sa * tomba + tz * 0.2);
    idx.push(b, b + 1, b + 2);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const PALHAS = ["#c9c07a", "#b9b66c", "#a8b068", "#d3c98a", "#98a85c", "#bdb572"], MOITAS = ["#6b7a46", "#7a8450", "#566a3d", "#8a8b52", "#5f6f3f", "#9a8f4e"], PINHOS = ["#2f4a2b", "#35502f", "#28402a", "#3b5532"];
const colorir = (m, lista) => { if (m) { lista.forEach((o, k) => m.setColorAt(k, cor(o.c))); if (m.instanceColor) m.instanceColor.needsUpdate = true; } return m; };
// pontos de semeadura ao longo da pista, dos dois lados, em manchas de ruído (`ruidoMin` deixa de fora o vazio entre as manchas)
function semear(tr, { passo = 3, dMin = 40, dMax = 380, densidade = 3, semente = 1, ruidoMin = 0, folga = 12 }) {
  const { pts, n, W } = tr, r = sorteio(semente), out = [];
  for (let i = 0; i < n; i += passo) {
    const p = pts[i];
    for (const lado of [-1, 1]) for (let k = 0, q = Math.floor(densidade) + (r() < densidade % 1 ? 1 : 0); k < q; k++) {
      const d = W / 2 + dMin + (dMax - dMin) * r() * r(), x = p.x + p.nx * lado * d + (r() - 0.5) * 40, z = p.y + p.ny * lado * d + (r() - 0.5) * 40;
      if (ruido(x / 150, z / 150, semente) < ruidoMin) continue;
      if (!livre(tr, x, z, folga + 10) || ocupado(tr, x, z, i)) continue;
      out.push({ x, z });
    }
  }
  return out;
}
/** O capim-de-praia: touceiras pálidas em manchas, junto da pista e pelas dunas. */
export function capimDePraia(tr, add, rel, { densidade = 5, semente = 5151, dMax = 420 } = {}) {
  const r = sorteio(semente), lista = [];
  for (const o of semear(tr, { passo: 2, dMin: 30, dMax, densidade, semente, ruidoMin: 0.28, folga: 14 })) {
    const y = Math.max(rel.alturaEm(o.x, o.z), tr.chao(o.x, o.z) - 1.5) - 0.2, t = 6 + r() * 7;
    lista.push({ x: o.x, y, z: o.z, sx: t, sy: 7 + r() * 11, sz: t, r: r() * 6.28, c: PALHAS[(r() * PALHAS.length) | 0] });
  }
  const m = instancias(add, geoCapim(), new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide }), lista, { sombra: false, nome: `${tr.id}-capim` });
  colorir(m, lista); tr.capimZandvoort = lista.length; return lista.length;
}
/** As moitas de espinheiro-marítimo e de rosa-brava: bolas baixas e densas, verde-acinzentadas, algumas com frutos alaranjados. */
export function moitas(tr, add, rel, { densidade = 1.6, semente = 6262, dMax = 480 } = {}) {
  const r = sorteio(semente), lista = [], frutos = [];
  for (const o of semear(tr, { passo: 3, dMin: 46, dMax, densidade, semente, ruidoMin: 0.42, folga: 18 })) {
    const y = Math.max(rel.alturaEm(o.x, o.z), tr.chao(o.x, o.z) - 1.5), w = 11 + r() * 16, h = 6 + r() * 8;
    lista.push({ x: o.x, y: y + h * 0.18, z: o.z, sx: w, sy: h, sz: w * (0.8 + r() * 0.5), r: r() * 6.28, c: MOITAS[(r() * MOITAS.length) | 0] });
    if (r() < 0.22) frutos.push({ x: o.x + (r() - 0.5) * w * 0.5, y: y + h * 0.9, z: o.z + (r() - 0.5) * w * 0.5, sx: w * 0.55, sy: h * 0.25, sz: w * 0.55, r: 0, c: "#e9902f" });
  }
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
  colorir(instancias(add, new THREE.IcosahedronGeometry(0.5, 1), mat, lista, { sombra: false, nome: `${tr.id}-moitas` }), lista);
  colorir(instancias(add, new THREE.IcosahedronGeometry(0.5, 0), mat, frutos, { sombra: false, nome: `${tr.id}-frutos` }), frutos);
  tr.moitasZandvoort = lista.length; return lista.length;
}
/** Os pinheiros-bravos baixos, de copa chata entortada pelo vento, em bosquetes escuros entre as dunas. */
export function pinheirosBravos(tr, add, rel, { densidade = 0.6, semente = 7373, dMax = 800 } = {}) {
  const r = sorteio(semente), troncos = [], copas = [];
  for (const o of semear(tr, { passo: 4, dMin: 70, dMax, densidade, semente, ruidoMin: 0.55, folga: 26 })) {
    const y = Math.max(rel.alturaEm(o.x, o.z), tr.chao(o.x, o.z) - 1.5), alto = 22 + r() * 24, w = alto * (0.55 + r() * 0.25), giro = r() * 6.28;
    troncos.push({ x: o.x, y: y + alto * 0.3, z: o.z, sx: alto * 0.045, sy: alto * 0.62, sz: alto * 0.045, r: 0, c: "#5a4636" });
    copas.push({ x: o.x + Math.cos(giro) * w * 0.12, y: y + alto * 0.74, z: o.z + Math.sin(giro) * w * 0.12, sx: w, sy: alto * 0.3, sz: w * 0.8, r: giro, c: PINHOS[(r() * PINHOS.length) | 0] });
  }
  colorir(instancias(add, new THREE.CylinderGeometry(0.7, 1, 1, 5), M(0xffffff, { roughness: 1 }), troncos, { sombra: false, nome: `${tr.id}-pinhos-troncos` }), troncos);
  colorir(instancias(add, new THREE.IcosahedronGeometry(0.5, 1), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), copas, { sombra: false, nome: `${tr.id}-pinhos-copas` }), copas);
  tr.pinhosZandvoort = copas.length; return copas.length;
}
