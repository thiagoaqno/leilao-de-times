// Zandvoort — a vila e os prédios à beira-mar, ao longe (peça só desta pista). Zandvoort aan Zee fica a noroeste do circuito, colada na praia: uma
// fileira de blocos de apartamentos e hotéis de dez a quinze andares na orla (o que se vê no horizonte, do outro lado dos boxes), ruas de
// casinhas de tijolo e telhado de telha atrás deles, a igreja de torre fina, e os quiosques de praia (strandpaviljoens) na areia. Tudo em
// InstancedMesh (a janela é uma textura que repete: cada tipo de bloco tem a própria geometria, com o UV na medida dele).
//   `planejarVila(tr)` põe as reservas (as dunas cedem ali) e devolve o plano; `construirVila(tr, add, rel, plano)` faz a vila.
import * as THREE from "three";
import { canvasTex } from "../../cena.js";
import { livre, ocupado, sorteio, instancias } from "../comum.js";
import { Montador, solido } from "../montagem.js";
import { eixoDaCosta } from "./lugar.js";

const cor = (c) => new THREE.Color(c);
const colorir = (m, lista) => { if (m) { lista.forEach((o, k) => m.setColorAt(k, cor(o.c))); if (m.instanceColor) m.instanceColor.needsUpdate = true; } return m; };

// ---- os blocos de apartamentos: um tipo = uma caixa com janelas na medida ----
const CELULA = 12, ANDAR = 15; // o passo da janela e a altura de um andar
let _janelas = null;
const janelas = () => (_janelas ||= canvasTex(64, 64, (x, w, hh, rr) => {
  x.fillStyle = "#f3f1ea"; x.fillRect(0, 0, w, hh);
  x.fillStyle = "#3b4f61"; x.fillRect(10, 14, 44, 34); x.fillStyle = "#6f879b"; x.fillRect(10, 14, 44, 8); // a vidraça e o reflexo do céu
  x.fillStyle = "#cfcbc0"; x.fillRect(6, 48, 52, 5); // a varanda
  for (let i = 0; i < 40; i++) { x.fillStyle = rr() < 0.5 ? "#0000000a" : "#ffffff0c"; x.fillRect(rr() * w, rr() * hh, 3, 3); }
}));
function geoBloco(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const face = Math.floor(i / 4); // +x, -x, +y, -y, +z, -z
    let su = 0.02, sv = 0.02;
    if (face < 2) { su = d / CELULA; sv = h / ANDAR; } else if (face >= 4) { su = w / CELULA; sv = h / ANDAR; }
    uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  }
  g.translate(0, h / 2, 0); // a base no chão
  return g;
}
const TIPOS = [
  { w: 170, h: 255, d: 54, nome: "laje" }, { w: 120, h: 330, d: 52, nome: "alta" }, { w: 70, h: 390, d: 70, nome: "torre" },
  { w: 150, h: 180, d: 60, nome: "baixa" }, { w: 96, h: 225, d: 48, nome: "media" },
];
const PAREDES = ["#f3f1ea", "#e6dcc8", "#d9d3c7", "#efe5d0", "#cfd6d9", "#e8d2b6", "#f6f4ee", "#c9b9a0"];

// uma casa de tijolo: corpo e telhado separados (duas InstancedMesh), com a cumeeira ao longo de x
function geoTelhado() { // prisma de duas águas, de 1 × 1 × 1: base no chão (y = 0), a cumeeira ao longo de x em y = 1; faces planas
  const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], C = [0.5, 0, 0.5], D = [-0.5, 0, 0.5], E = [-0.5, 1, 0], F = [0.5, 1, 0], pos = [];
  for (const t of [[A, F, B], [A, E, F], [D, C, F], [D, F, E], [A, D, E], [B, F, C]]) for (const v of t) pos.push(...v);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}

/** A igreja de tijolo com a torre e a flecha fina, de frente para +z (peça solta, em Montador). */
export function igreja() {
  const m = new Montador(), S = solido(), tijolo = "#a5502f", telha = "#4a4f57", claro = "#e8e2d2";
  m.caixa(S, [0, 14, 0], [34, 28, 70], { cor: tijolo });
  m.geo(S, new THREE.ConeGeometry(0.7, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0), { y: 28, sx: 35, sy: 14, sz: 72, cor: telha });
  for (let k = -2; k <= 2; k++) m.caixa(S, [0, 14, k * 14], [35, 1, 1.2], { cor: claro }); // os contrafortes (friso)
  m.caixa(S, [0, 30, 40], [22, 60, 22], { cor: tijolo }); // a torre
  m.caixa(S, [0, 60.4, 40], [24, 1.6, 24], { cor: claro });
  m.geo(S, new THREE.ConeGeometry(0.62, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0), { y: 61, sx: 25, sy: 58, sz: 25, cor: "#566069" }); // a flecha
  m.caixa(S, [0, 40, 51.2], [7, 14, 0.8], { cor: "#2c3338" }); // a janela da torre
  m.cilindro(S, [0, 123, 40], [0.5, 12], { cor: "#d6b24a", seg: 5 });
  return m.montar("zandvoort-igreja");
}

const posicao = (eixo, s, u) => eixo.mundo(s, u);
// onde ficam as coisas (em s e u): o plano é só uma lista, para as reservas e a construção usarem os mesmos números
export function planejarVila(tr) {
  const eixo = eixoDaCosta(tr), r = sorteio(8801), blocos = [], casas = [], quiosques = [], reservas = [];
  const ok = (x, z, folga) => livre(tr, x, z, folga) && !ocupado(tr, x, z);
  // a orla: blocos altos e hotéis ao longo da praia, mais densos a noroeste (a vila) e esparsos ao sul
  for (let u = -400; u <= 3700; u += 70 + r() * 80) {
    const norte = u > 1200, tipo = Math.floor(r() * (norte ? 5 : 3)), t = TIPOS[tipo], s = eixo.costa(u) + 190 + r() * 40, [x, z] = posicao(eixo, s, u);
    if (!ok(x, z, 90)) continue;
    if (!norte && r() < 0.35) continue;
    blocos.push({ tipo, x, z, s, u, c: PAREDES[(r() * PAREDES.length) | 0] }); reservas.push([x, z, Math.max(t.w, t.d) * 0.6 + 24]);
  }
  // a segunda fileira, mais baixa, e as ruas de casinhas atrás
  for (let u = 1500; u <= 3700; u += 52) for (let q = 0, s = eixo.costa(u) + 300; s < eixo.costa(u) + 760; s += 78, q++) {
    if (r() < 0.22) continue;
    const [x, z] = posicao(eixo, s + (r() - 0.5) * 10, u + (r() - 0.5) * 12);
    if (!ok(x, z, 50)) continue;
    if (q === 0 && r() < 0.5) { blocos.push({ tipo: 4, x, z, s, u, c: PAREDES[(r() * PAREDES.length) | 0] }); reservas.push([x, z, 66]); continue; }
    casas.push({ x, z, w: 34 + r() * 18, d: 28 + r() * 10, h: 22 + r() * 14, c: ["#a5502f", "#b55e3a", "#c9a37a", "#9a4630", "#d8c9a8", "#8c8a82"][(r() * 6) | 0], tc: ["#6a3a2e", "#7b4334", "#4a4f57", "#8a5a3c"][(r() * 4) | 0] });
    reservas.push([x, z, 34]);
  }
  // os quiosques de praia na areia (strandpaviljoens)
  for (let u = -200; u <= 2400; u += 130 + r() * 90) {
    const [x, z] = posicao(eixo, eixo.costa(u) + 138, u);
    if (!livre(tr, x, z, 60)) continue;
    quiosques.push({ x, z, u, c: ["#ffffff", "#ff6a13", "#1b6b8f", "#f2c230", "#ae1c28"][(r() * 5) | 0] });
  }
  const sIgreja = eixo.costa(2380) + 360, [ix, iz] = posicao(eixo, sIgreja, 2380), igrejas = ok(ix, iz, 60) ? [{ x: ix, z: iz }] : [];
  for (const q of igrejas) reservas.push([q.x, q.z, 70]);
  tr.reservado ||= []; for (const q of reservas) tr.reservado.push(q);
  return { eixo, blocos, casas, quiosques, igrejas };
}

export function construirVila(tr, add, rel, plano) {
  const { eixo, blocos, casas, quiosques, igrejas } = plano, r = sorteio(4411);
  const yEm = (x, z) => Math.max(rel.alturaEm(x, z), tr.chao(x, z) - 1.5), giro = -Math.atan2(eixo.p.ty, eixo.p.tx); // a face comprida paralela à praia
  // os blocos: um InstancedMesh por tipo
  const mat = new THREE.MeshStandardMaterial({ map: janelas(), roughness: 0.85 }); janelas().wrapS = janelas().wrapT = THREE.RepeatWrapping;
  TIPOS.forEach((t, k) => {
    const lista = blocos.filter((b) => b.tipo === k).map((b) => ({ x: b.x, y: yEm(b.x, b.z) - 0.5, z: b.z, r: giro + (r() < 0.12 ? Math.PI / 2 : 0), c: b.c }));
    colorir(instancias(add, geoBloco(t.w, t.h, t.d), mat, lista, { sombra: false, nome: `${tr.id}-blocos-${t.nome}` }), lista);
  });
  // os telhados planos dos blocos têm uma caixa de máquinas e o tanque: uma malha só
  const teto = [];
  for (const b of blocos) { const t = TIPOS[b.tipo], y = yEm(b.x, b.z) + t.h; teto.push({ x: b.x, y: y + 4, z: b.z, sx: t.w * 0.18, sy: 8, sz: t.d * 0.4, r: giro, c: "#aeb3b6" }); }
  colorir(instancias(add, new THREE.BoxGeometry(1, 1, 1), M0(), teto, { sombra: false, nome: `${tr.id}-blocos-teto` }), teto);
  // as casas: o corpo e o telhado de duas águas
  const corpos = casas.map((c) => ({ x: c.x, y: yEm(c.x, c.z) + c.h / 2 - 0.5, z: c.z, sx: c.w, sy: c.h, sz: c.d, r: giro, c: c.c }));
  const telhados = casas.map((c) => ({ x: c.x, y: yEm(c.x, c.z) + c.h - 0.5, z: c.z, sx: c.w * 1.12, sy: c.d * 0.62, sz: c.d * 1.2, r: giro, c: c.tc }));
  colorir(instancias(add, new THREE.BoxGeometry(1, 1, 1), M0(), corpos, { sombra: false, nome: `${tr.id}-casas` }), corpos);
  colorir(instancias(add, geoTelhado(), M0(true), telhados, { sombra: false, nome: `${tr.id}-telhados` }), telhados);
  // os quiosques: um caixote de madeira sobre estacas, com o toldo da cor da casa
  const caixas = [], toldos = [], estacas = [];
  for (const q of quiosques) {
    const y = yEm(q.x, q.z), a = giro;
    caixas.push({ x: q.x, y: y + 11, z: q.z, sx: 44, sy: 16, sz: 22, r: a, c: "#cdbb94" }); toldos.push({ x: q.x, y: y + 20.5, z: q.z, sx: 50, sy: 3, sz: 28, r: a, c: q.c });
    for (const dx of [-18, 18]) for (const dz of [-8, 8]) estacas.push({ x: q.x + Math.cos(a) * dx - Math.sin(a) * dz, y: y + 1.5, z: q.z - Math.sin(a) * dx - Math.cos(a) * dz, sx: 1.4, sy: 6, sz: 1.4, r: 0, c: "#6b5a43" });
  }
  colorir(instancias(add, new THREE.BoxGeometry(1, 1, 1), M0(), caixas.concat(toldos, estacas), { sombra: false, nome: `${tr.id}-quiosques` }), caixas.concat(toldos, estacas));
  for (const q of igrejas) { const g = igreja(); g.position.set(q.x, yEm(q.x, q.z) - 0.5, q.z); g.rotation.y = giro + Math.PI / 2; add(g); }
  tr.vilaZandvoort = { blocos: blocos.length, casas: casas.length, quiosques: quiosques.length, igrejas: igrejas.length };
}
const _mats = {};
function M0(plano = false) { return (_mats[plano] ||= new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: plano, side: plano ? THREE.DoubleSide : THREE.FrontSide })); }
