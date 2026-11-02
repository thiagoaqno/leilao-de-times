// Miami — a "marina" falsa do paddock: o chão de asfalto pintado de água em volta de dois píeres de madeira, com os iates (superiates de
// três conveses, de dois, veleiros e lanchas) atracados dos dois lados, tudo em InstancedMesh (uma geometria por tipo de barco). Em volta,
// a mureta de concreto, o calçadão, os postes de luz e as bandeiras de flâmula. O barco não flutua de verdade: é um chão pintado (como no GP).
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { Montador, solido, tom, letreiro, comTextura } from "../montagem.js";
import { marcaTex } from "../marcas.js";
import { instancias, sorteio } from "../comum.js";

// o casco: a planta em ponta de seta, extrudada para cima (x comprido, y para cima, a proa em +x)
function plantaDoCasco(L, B, bico = 0.28) {
  const s = new THREE.Shape();
  s.moveTo(-L / 2, -B * 0.46); s.lineTo(L / 2 - bico * L, -B / 2); s.quadraticCurveTo(L / 2 - bico * L * 0.2, -B * 0.4, L / 2, -B * 0.06); s.lineTo(L / 2, B * 0.06);
  s.quadraticCurveTo(L / 2 - bico * L * 0.2, B * 0.4, L / 2 - bico * L, B / 2); s.lineTo(-L / 2, B * 0.46); s.closePath();
  return s;
}
const extrusao = (shape, H) => { const g = new THREE.ExtrudeGeometry(shape, { depth: H, bevelEnabled: false, curveSegments: 4 }); g.rotateX(-Math.PI / 2); return g; };
const retPlanta = (L, B) => { const s = new THREE.Shape(); s.moveTo(-L / 2, -B / 2); s.lineTo(L / 2, -B / 2); s.lineTo(L / 2, B / 2); s.lineTo(-L / 2, B / 2); s.closePath(); return s; };

// os três tipos de barco, cada um numa geometria só (cor por vértice): devolve { geo, L, B }
function geoDoBarco(tipo) {
  const m = new Montador(), S = solido(), BRANCO = "#f7f6f1", AZUL = "#0f2a4a", VIDRO = "#16222d", AQUA = "#0aa3ad", ROSA = "#ff5fa2";
  let L, B;
  if (tipo === "super") {
    L = 132; B = 30;
    m.geo(S, extrusao(plantaDoCasco(L, B), 12), { cor: BRANCO });
    m.geo(S, extrusao(plantaDoCasco(L * 1.004, B * 1.01), 2.6), { cor: AZUL });
    m.geo(S, extrusao(plantaDoCasco(L * 0.62, B * 0.78, 0.2), 10), { y: 12, x: -L * 0.1, cor: BRANCO });
    m.caixa(S, [-L * 0.1, 16.5, 0], [L * 0.6, 3.6, B * 0.78 + 0.4], { cor: VIDRO });
    m.geo(S, extrusao(plantaDoCasco(L * 0.42, B * 0.62, 0.2), 9), { y: 22, x: -L * 0.16, cor: BRANCO });
    m.caixa(S, [-L * 0.16, 26, 0], [L * 0.4, 3.2, B * 0.62 + 0.4], { cor: VIDRO });
    m.geo(S, extrusao(retPlanta(L * 0.24, B * 0.46), 3), { y: 31, x: -L * 0.2, cor: AQUA });
    m.caixa(S, [-L * 0.2, 36, 0], [L * 0.16, 1.4, B * 0.4], { cor: BRANCO }); // o teto do convés de cima
    for (const s of [-1, 1]) m.caixa(S, [-L * 0.2 + s * L * 0.07, 34, 0], [0.8, 6, 0.8], { cor: "#cfd3d6" });
    m.cilindro(S, [-L * 0.14, 46, 0], [0.9, 20], { cor: "#d9dde0", seg: 6 }); m.caixa(S, [-L * 0.14, 56, 0], [1, 1.2, 11], { cor: "#9aa3aa" }); // o mastro e o radar
    m.caixa(S, [L * 0.28, 12.6, 0], [L * 0.1, 1.4, B * 0.5], { cor: tom(ROSA, 0.95) }); // o toldo da proa
    m.caixa(S, [-L * 0.46, 6, 0], [1.2, 5, B * 0.5], { cor: AZUL }); // a plataforma de popa
  } else if (tipo === "medio") {
    L = 84; B = 22;
    m.geo(S, extrusao(plantaDoCasco(L, B), 8), { cor: BRANCO });
    m.geo(S, extrusao(plantaDoCasco(L * 1.004, B * 1.01), 2), { cor: "#8a1f2d" });
    m.geo(S, extrusao(plantaDoCasco(L * 0.6, B * 0.74, 0.2), 8), { y: 8, x: -L * 0.1, cor: BRANCO });
    m.caixa(S, [-L * 0.1, 11.5, 0], [L * 0.58, 3, B * 0.74 + 0.4], { cor: VIDRO });
    m.geo(S, extrusao(retPlanta(L * 0.3, B * 0.5), 2.4), { y: 16, x: -L * 0.14, cor: BRANCO });
    m.cilindro(S, [-L * 0.1, 26, 0], [0.7, 14], { cor: "#d9dde0", seg: 6 }); m.caixa(S, [-L * 0.1, 33, 0], [0.8, 1, 8], { cor: "#9aa3aa" });
    m.caixa(S, [L * 0.24, 8.4, 0], [L * 0.1, 1.2, B * 0.44], { cor: AQUA });
  } else if (tipo === "vela") {
    L = 62; B = 16;
    m.geo(S, extrusao(plantaDoCasco(L, B, 0.34), 5.5), { cor: BRANCO });
    m.geo(S, extrusao(plantaDoCasco(L * 1.004, B * 1.01, 0.34), 1.6), { cor: AZUL });
    m.geo(S, extrusao(retPlanta(L * 0.34, B * 0.56), 3.4), { y: 5.5, x: -L * 0.05, cor: "#e7e2d4" });
    m.caixa(S, [-L * 0.05, 8, 0], [L * 0.3, 1.4, B * 0.56 + 0.3], { cor: VIDRO });
    m.cilindro(S, [L * 0.08, 48, 0], [0.7, 86], { cor: "#d9dde0", seg: 6 }); // o mastro
    m.caixa(S, [-L * 0.08, 12, 0], [L * 0.34, 0.8, 0.8], { cor: "#cfd3d6" }); // a retranca
    // a vela grande e a buja: triângulos finos, de duas faces
    const vela = (pontos, cor) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pontos.flat(), 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(new Array(6).fill(0), 2)); g.setIndex([0, 1, 2, 0, 2, 1]); g.computeVertexNormals(); return [g, cor]; };
    for (const [g, cor] of [vela([[L * 0.06, 12, 0.3], [L * 0.06, 86, 0.3], [-L * 0.36, 12, 0.3]], "#fbf9f2"), vela([[L * 0.1, 10, -0.3], [L * 0.1, 78, -0.3], [L * 0.44, 9, -0.3]], tom(ROSA, 1.05))]) m.geo(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 }), g, { cor });
  } else { // lancha
    L = 40; B = 12;
    m.geo(S, extrusao(plantaDoCasco(L, B, 0.3), 4), { cor: BRANCO });
    m.geo(S, extrusao(plantaDoCasco(L * 1.005, B * 1.02, 0.3), 1.2), { cor: "#0aa3ad" });
    m.caixa(S, [-L * 0.1, 7, 0], [L * 0.22, 4, B * 0.5], { cor: "#e9edf0" }); m.caixa(S, [-L * 0.1, 9.6, 0], [L * 0.24, 0.8, B * 0.56], { cor: "#0aa3ad" });
    for (const s of [-1, 1]) m.caixa(S, [-L * 0.46, 5.5, s * B * 0.18], [3, 5, 2.6], { cor: "#1a1d22" }); // os motores de popa
  }
  const grupo = m.montar("barco");
  return { grupos: grupo.children.map((c) => ({ geo: c.geometry, mat: c.material })), L, B };
}

export const texAgua = () => canvasTex(256, 128, (x, w, h, rr) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#14b6c9"); g.addColorStop(1, "#0a7fae"); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.strokeStyle = "rgba(255,255,255,0.28)"; x.lineWidth = 1.6;
  for (let k = 0; k < 90; k++) { const px = rr() * w, py = rr() * h, l = 10 + rr() * 22; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + l / 2, py - 3, px + l, py); x.stroke(); }
  x.strokeStyle = "rgba(0,60,110,0.18)"; for (let k = 0; k < 40; k++) { const px = rr() * w, py = rr() * h; x.beginPath(); x.moveTo(px, py); x.lineTo(px + 14 + rr() * 16, py + 1); x.stroke(); }
});
export const texMadeira = () => canvasTex(64, 64, (x, w, h, rr) => { x.fillStyle = "#b58b5c"; x.fillRect(0, 0, w, h); for (let k = 0; k < 8; k++) { x.fillStyle = k % 2 ? "#a47b4d" : "#c19869"; x.fillRect(0, k * 8, w, 7); x.fillStyle = "rgba(0,0,0,0.18)"; x.fillRect(0, k * 8 + 7, w, 1); } for (let k = 0; k < 30; k++) { x.fillStyle = "rgba(0,0,0,0.08)"; x.fillRect(rr() * w, rr() * h, 6, 1); } });

/** A marina inteira: `x, z, rot` o centro e a rotação do retângulo `a × b` (meias medidas). Devolve a contagem de barcos. */
export function marina(tr, add, { x, z, rot = 0, a = 180, b = 100, semente = 21 }) {
  const rr = sorteio(semente), c = Math.cos(rot), s = Math.sin(rot);
  let hi = -1e9; for (const u of [-a, 0, a]) for (const v of [-b, 0, b]) hi = Math.max(hi, tr.chao(x + c * u - s * v, z + s * u + c * v));
  hi += 0.4;
  const g = new THREE.Group(); g.name = "miami-marina"; g.position.set(x, hi, z); g.rotation.y = -rot; add(g); // (o grupo gira para o x local coincidir com o ângulo `rot`)
  const mad = new THREE.MeshStandardMaterial({ map: texMadeira(), roughness: 0.85 }); mad.map.repeat.set(1, 1);
  const concreto = M(0xd6d2c8, { roughness: 0.9 }), S = solido(), m = new Montador();
  // o chão pintado de água: um bloco de asfalto que vai até o terreno e, por cima, a tinta
  const base = new THREE.Mesh(new THREE.BoxGeometry(2 * a + 30, 14, 2 * b + 30), M(0x3b3d43, { roughness: 1 })); base.position.y = -7.2; base.receiveShadow = true; g.add(base);
  const agua = new THREE.Mesh(new THREE.PlaneGeometry(2 * a, 2 * b), new THREE.MeshStandardMaterial({ map: texAgua(), roughness: 0.22, metalness: 0.15, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  agua.material.map.repeat.set(a / 40, b / 40); agua.rotation.x = -Math.PI / 2; agua.position.y = 0.3; agua.receiveShadow = true; agua.name = "miami-marina-agua"; g.add(agua);
  // a mureta de concreto e o calçadão de madeira em volta (o chão sobe uns 3 acima da água)
  const Q = 15;
  for (const [cx, cz, sx, sz] of [[0, -b - Q / 2, 2 * a + 2 * Q, Q], [0, b + Q / 2, 2 * a + 2 * Q, Q], [-a - Q / 2, 0, Q, 2 * b], [a + Q / 2, 0, Q, 2 * b]]) {
    m.caixa(S, [cx, 1.4, cz], [sx, 2.8, sz], { cor: "#d6d2c8" });
  }
  const qMad = new Montador();
  for (const [cx, cz, sx, sz] of [[0, -b - Q / 2, 2 * a + 2 * Q - 2, Q - 4], [0, b + Q / 2, 2 * a + 2 * Q - 2, Q - 4], [-a - Q / 2, 0, Q - 4, 2 * b], [a + Q / 2, 0, Q - 4, 2 * b]]) qMad.caixa(mad, [cx, 2.9, cz], [sx, 0.5, sz], { cor: "#ffffff", uv: [sx / 24, sz / 24] });
  // os dois píeres de madeira, presos ao calçadão do oeste, com os cabeços e os postes
  const pierV = [-b * 0.46, b * 0.46], pierL = 2 * a - 26;
  for (const v of pierV) {
    qMad.caixa(mad, [-a + pierL / 2 + 4, 1.4, v], [pierL, 1.1, 9], { cor: "#ffffff", uv: [pierL / 24, 0.4] });
    for (let px = -a + 10; px < a - 14; px += 34) for (const sd of [-1, 1]) m.cilindro(S, [px, 2.4, v + sd * 4.8], [0.9, 3.2], { cor: "#5a4630", seg: 6 });
    for (let px = -a + 18; px < a - 14; px += 68) { m.cilindro(S, [px, 6, v], [0.7, 8], { cor: "#555b62", seg: 6 }); }
  }
  const lamp = []; // os postes de luz das duas beiradas
  for (let px = -a + 6; px <= a - 6; px += 52) for (const sz of [-1, 1]) { m.cilindro(S, [px, 8, sz * (b + Q / 2 - 1)], [0.6, 11], { cor: "#454b52", seg: 6 }); lamp.push([px, 14.4, sz * (b + Q / 2 - 1)]); }
  // a casinha do capitão do porto e o painel com o nome
  m.caixa(S, [a + Q / 2, 11, -b * 0.4], [9, 16, 12], { cor: "#f2efe6" }); m.caixa(S, [a + Q / 2, 20.5, -b * 0.4], [11, 1.6, 14], { cor: "#0aa3ad" });
  // as flâmulas: um cordão entre os postes, em aqua, rosa e branco
  for (let px = -a + 6; px < a - 58; px += 52) for (let t = 0; t < 8; t++) { const fx = px + 4 + t * 6, fy = 14.4 - Math.sin((t / 7) * Math.PI) * 1.4; for (const sz of [-1, 1]) m.caixa(S, [fx, fy - 1.3, sz * (b + Q / 2 - 1)], [2.6, 2.6, 0.2], { cor: ["#0aa3ad", "#ff5fa2", "#ffffff"][t % 3], ry: 0 }); }
  g.add(m.montar("marina-peças")); g.add(qMad.montar("marina-madeira"));
  const luz = new THREE.MeshBasicMaterial({ color: 0xfff1c9, toneMapped: false });
  instancias((o) => { g.add(o); return o; }, new THREE.SphereGeometry(1.6, 6, 4), luz, lamp.map(([x0, y0, z0]) => ({ x: x0, y: y0, z: z0 })), { sombra: false });
  // o letreiro na mureta do lado de dentro
  const painel = new THREE.Mesh(new THREE.PlaneGeometry(88, 12), new THREE.MeshBasicMaterial({ map: marcaTex("mimarina", 512, 64), side: THREE.DoubleSide }));
  painel.position.set(0, 9, -b - Q + 2); g.add(painel); const painel2 = painel.clone(); painel2.position.z = b + Q - 2; painel2.rotation.y = Math.PI; g.add(painel2);

  // os barcos: uma lista por tipo; atracados dos dois lados dos píeres, de proa para um lado ou para o outro
  const tipos = ["super", "medio", "vela", "lancha"], geos = Object.fromEntries(tipos.map((t) => [t, geoDoBarco(t)])), listas = { super: [], medio: [], vela: [], lancha: [] };
  const filas = [[pierV[0], -1], [pierV[0], 1], [pierV[1], -1], [pierV[1], 1]];
  for (const [v, lado] of filas) {
    let px = -a + 36;
    while (px < a - 30) {
      const escolha = rr(), tipo = escolha < 0.3 ? "super" : escolha < 0.58 ? "medio" : escolha < 0.82 ? "vela" : "lancha", gi = geos[tipo];
      const sc = 0.9 + rr() * 0.2, L = gi.L * sc;
      if (px + L > a - 22) break;
      const vv = v + lado * (4.5 + (gi.B * sc) / 2 + 1);
      listas[tipo].push({ x: px + L / 2, y: 0.9, z: vv, sx: sc, sy: sc, sz: sc, r: rr() < 0.5 ? 0 : Math.PI });
      px += L + 8 + rr() * 10;
    }
  }
  let nBarcos = 0;
  for (const tipo of tipos) {
    if (!listas[tipo].length) continue; nBarcos += listas[tipo].length;
    const d = new THREE.Object3D();
    for (const { geo, mat } of geos[tipo].grupos) {
      const im = new THREE.InstancedMesh(geo, mat, listas[tipo].length); im.castShadow = true; im.receiveShadow = true; im.name = "miami-barcos-" + tipo;
      listas[tipo].forEach((o, k) => { d.position.set(o.x, o.y, o.z); d.rotation.set(0, o.r, 0); d.scale.set(o.sx, o.sy, o.sz); d.updateMatrix(); im.setMatrixAt(k, d.matrix); });
      g.add(im);
    }
  }
  // a casa do clube e os guarda-sóis ficam por conta do Beach Club; aqui o que importa é o chão não ser pisável: reserva o retângulo
  const r2 = Math.max(a, b) + 30;
  for (let u = -a; u <= a + 1; u += 70) for (let v = -b; v <= b + 1; v += 70) tr.reservado.push([x + c * u - s * v, z + s * u + c * v, 80]);
  void r2; void letreiro; void comTextura;
  tr.marinaMiami = { x, z, rot, a, b, barcos: nBarcos };
  return { barcos: nBarcos, hi };
}
