// Miami — o Hard Rock Stadium no meio do circuito (sem o nome da marca no desenho: o letreiro diz só "MIAMI GARDENS"): a fachada branca com as
// nervuras e a faixa de vidro, as arquibancadas em três cores (aqua, laranja e azul-marinho) em três níveis, a faixa de LED que corre em volta
// do anel, o gramado listrado, a cobertura branca em anel e os quatro mastros altos com os cabos que a seguram. Escala do jogo (1 ≈ 10 cm),
// mas encolhido para caber dentro do circuito (o de verdade tem mais de dois mil de comprimento). Origem no chão, eixo comprido em x.
// Tudo é cenário: uma malha por material (o anel é uma fita em volta de uma elipse).
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { Montador, solido, tom } from "../montagem.js";
import { marcaTex } from "../marcas.js";
import { instancias, sorteio, tinta } from "../comum.js";

export const MEDIDAS = { A: 270, B: 215, ALTO: 64, TOPO: 74, MASTRO: 190 };
const AQUA = "#0aa3ad", LARANJA = "#f26a1b", MARINHO = "#0b2a5b", BRANCO = "#f1efe8";

// uma faixa entre duas elipses concêntricas do anel (a elipse a `d` para dentro da parede de fora), uma casa de cor por seção
function anelEl(A, B, d0, y0, d1, y1, { seg = 72, cor = () => "#ffffff", uvU = seg, uvV = 1 } = {}) {
  const pos = [], uv = [], col = [], idx = [], c = new THREE.Color();
  for (let k = 0; k < seg; k++) {
    const t0 = (k / seg) * Math.PI * 2, t1 = ((k + 1) / seg) * Math.PI * 2; c.set(cor(k));
    const base = pos.length / 3;
    for (const [t, u] of [[t0, (k / seg) * uvU], [t1, ((k + 1) / seg) * uvU]]) for (const [d, y, v] of [[d0, y0, 0], [d1, y1, uvV]]) {
      pos.push((A - d) * Math.cos(t), y, (B - d) * Math.sin(t)); uv.push(u, v); col.push(c.r, c.g, c.b);
    }
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// um cabo (cilindro fino) de p0 a p1 num Montador
function cabo(m, mat, p0, p1, r, cor) {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2], L = Math.hypot(dx, dy, dz), hor = Math.hypot(dx, dz);
  m.cilindro(mat, [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2], [r, L], { cor, seg: 5, rx: Math.atan2(hor, dy), ry: Math.atan2(dx, dz) });
}

function texturas() {
  const assentos = canvasTex(128, 128, (x, w, h, rr) => {
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r++) {
      const y0 = r * 32; x.fillStyle = "rgba(0,0,0,0.22)"; x.fillRect(0, y0, w, 3); x.fillStyle = "rgba(0,0,0,0.10)"; x.fillRect(0, y0 + 3, w, 9);
      for (let i = 0; i < 20; i++) if (rr() < 0.72) { x.fillStyle = ["#f4f4f2", "#2a2f3a", "#c93a2e", "#f1c7a5", "#ffd23f", "#1f6fc9"][(rr() * 6) | 0]; x.fillRect(i * 6.4 + rr() * 2, y0 + 12 + rr() * 2, 4, 9); }
    }
  });
  const fachada = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = "#ece9e2"; x.fillRect(0, 0, w, h);
    x.fillStyle = "#c9c6bd"; for (const px of [0, 62, 124]) x.fillRect(px, 0, 4, h); // as nervuras
    x.fillStyle = "#2b4756"; x.fillRect(8, 40, 108, 46); // a faixa de vidro
    x.fillStyle = "#6f94ad"; for (let k = 0; k < 4; k++) x.fillRect(10 + k * 27, 42, 24, 20);
    x.fillStyle = "#ffffff55"; for (let k = 0; k < 4; k++) x.fillRect(10 + k * 27, 42, 24, 4);
    x.fillStyle = AQUA; x.fillRect(0, 100, w, 14); x.fillStyle = LARANJA; x.fillRect(0, 114, w, 6);
  });
  const gramado = canvasTex(256, 160, (x, w, h) => {
    for (let k = 0; k < 14; k++) { x.fillStyle = k % 2 ? "#3f9a3f" : "#4aa84a"; x.fillRect((k * w) / 14, 0, w / 14 + 1, h); }
    x.strokeStyle = "#ffffffcc"; x.lineWidth = 2; x.strokeRect(10, 8, w - 20, h - 16); x.beginPath(); x.moveTo(w / 2, 8); x.lineTo(w / 2, h - 8); x.stroke();
    x.beginPath(); x.arc(w / 2, h / 2, 20, 0, 6.3); x.stroke(); x.strokeRect(10, h / 2 - 34, 34, 68); x.strokeRect(w - 44, h / 2 - 34, 34, 68);
  }, false);
  return { assentos, fachada, gramado };
}
let _tex = null;

/** O estádio inteiro num Group (origem no chão, no centro; eixo comprido em x). `baseY` desce a base até o chão mais baixo. */
export function estadio({ baseY = 8, semente = 11 } = {}) {
  const { A, B, ALTO, TOPO, MASTRO } = MEDIDAS, T = (_tex ||= texturas()), r = sorteio(semente), g = new THREE.Group(); g.name = "miami-estadio";
  const add = (geo, mat, o = {}) => { const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.castShadow = !!o.sombra; g.add(m); return m; };
  const aqui = (A, B) => ({ A, B });
  void aqui;
  // a base: o aterro sob o estádio e a praça de concreto em volta
  const plinto = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, baseY + 1.4, 48), M(0xcfcac0, { roughness: 0.95 }));
  plinto.scale.set(A + 54, 1, B + 54); plinto.position.y = -baseY / 2 + 0.7; plinto.receiveShadow = true; g.add(plinto);
  const praca = new THREE.Mesh(new THREE.CircleGeometry(1, 64), tinta(canvasTex(128, 128, (x, w, h, rr) => { x.fillStyle = "#d8d4ca"; x.fillRect(0, 0, w, h); x.strokeStyle = "#bdb8ac"; x.lineWidth = 1; for (let k = 0; k <= 8; k++) { x.beginPath(); x.moveTo((k * w) / 8, 0); x.lineTo((k * w) / 8, h); x.moveTo(0, (k * h) / 8); x.lineTo(w, (k * h) / 8); x.stroke(); } for (let k = 0; k < 120; k++) { x.fillStyle = `rgba(0,0,0,${rr() * 0.05})`; x.fillRect(rr() * w, rr() * h, 6, 6); } }), { roughness: 1, transparent: false, depthWrite: true }));
  praca.rotation.x = -Math.PI / 2; praca.scale.set(A + 54, B + 54, 1); praca.position.y = 1.5; praca.receiveShadow = true; g.add(praca);
  praca.material.map.repeat.set(14, 11);

  // a fachada: nervuras, faixa de vidro e as listras de aqua e laranja no pé
  add(anelEl(A, B, 0, 0, 0, ALTO - 6, { seg: 72, cor: () => "#ffffff", uvU: 72 }), new THREE.MeshStandardMaterial({ map: T.fachada, vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 }));
  // o topo da parede e o caminho de serviço
  add(anelEl(A, B, -1, ALTO - 6, 3, ALTO - 6), M(0xdedbd2, { side: THREE.DoubleSide }));
  // as arquibancadas: o nível de cima (aqua, laranja e marinho, em seções), a faixa de LED, o corredor e o nível de baixo
  const secoes = (k) => [AQUA, BRANCO, LARANJA, MARINHO, AQUA, MARINHO][Math.floor(k / 4) % 6];
  const matAss = new THREE.MeshStandardMaterial({ map: T.assentos, vertexColors: true, side: THREE.DoubleSide, roughness: 0.85 });
  const dTopo = 14, dFita = 56;
  add(anelEl(A, B, dTopo, ALTO - 4, dFita, 38, { cor: secoes, uvU: 72 * 1.3, uvV: 2.4 }), matAss);
  add(anelEl(A, B, dFita, 38, dFita, 31), M(0x1a2230, { side: THREE.DoubleSide }));
  // a faixa de LED que corre em volta do anel (texto repetido, vira a luz da câmera no fim da tarde)
  const led = new THREE.MeshBasicMaterial({ map: marcaTex("mimiami", 512, 64), side: THREE.DoubleSide, toneMapped: false });
  led.map.wrapS = THREE.RepeatWrapping; led.map.repeat.set(4, 1);
  add(anelEl(A, B, dFita - 0.6, 37, dFita - 0.6, 32.5, { uvU: 1 }), led).userData.bloom = true;
  add(anelEl(A, B, dFita, 31, 64, 30, { cor: () => "#cfcac0" }), M(0xcfcac0, { side: THREE.DoubleSide }));
  add(anelEl(A, B, 64, 30, 106, 5, { cor: (k) => [AQUA, LARANJA, MARINHO, BRANCO, AQUA, LARANJA][Math.floor((k + 2) / 3) % 6], uvU: 72 * 1.3, uvV: 2.2 }), matAss);
  add(anelEl(A, B, 106, 5, 110, 3), M(0x16355c, { side: THREE.DoubleSide }));
  // o gramado listrado, com as marcas do campo
  const campo = add(new THREE.PlaneGeometry(2 * (A - 110 - 6), 2 * (B - 110 - 5)), new THREE.MeshStandardMaterial({ map: T.gramado, roughness: 0.95 }));
  campo.rotation.x = -Math.PI / 2; campo.position.y = 3.2;
  // a cobertura branca em anel: sai da beirada de fora, sobe e fecha em cima das arquibancadas de cima; a borda de dentro leva uma viga
  const branco = new THREE.MeshStandardMaterial({ color: 0xf6f4ee, side: THREE.DoubleSide, roughness: 0.55, emissive: 0x2a2822 });
  add(anelEl(A, B, -10, TOPO + 3, 54, TOPO - 6), branco, { sombra: true });
  add(anelEl(A, B, 54, TOPO - 6, 54, TOPO - 13), M(0xdedbd2, { side: THREE.DoubleSide }));
  add(anelEl(A, B, -10, TOPO + 3, -10, TOPO - 5), M(0xe9e6de, { side: THREE.DoubleSide }));
  add(anelEl(A, B, 20, TOPO - 1, 54, TOPO - 8, { cor: () => "#9aa4ad" }), M(0xffffff, { vertexColors: true, side: THREE.DoubleSide })); // a treliça de baixo da cobertura (vista de dentro)

  // as portas de entrada, a escada das rampas e os mastros com os cabos
  const m = new Montador(), S = solido();
  for (let k = 0; k < 10; k++) {
    const t = ((k + 0.5) / 10) * Math.PI * 2, px = (A + 1.5) * Math.cos(t), pz = (B + 1.5) * Math.sin(t);
    m.caixa(S, [px, 8, pz], [14, 16, 6], { cor: "#26323d", ry: -Math.atan2((B / A) * Math.cos(t), -Math.sin(t)) + Math.PI / 2 });
    m.caixa(S, [px * 1.0, 17.5, pz], [20, 2, 10], { cor: AQUA, ry: -Math.atan2((B / A) * Math.cos(t), -Math.sin(t)) + Math.PI / 2 });
  }
  const cantos = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
  for (const [sx, sz] of cantos) {
    const bx = sx * (A * 0.8 + 18), bz = sz * (B * 0.84 + 12), tx = bx * 0.86, tz = bz * 0.86; // o mastro se inclina para dentro
    const N = 6;
    for (let k = 0; k < N; k++) {
      const f0 = k / N, f1 = (k + 1) / N, w = 16 - 9 * f0, x = bx + (tx - bx) * (f0 + f1) / 2, z = bz + (tz - bz) * (f0 + f1) / 2;
      m.caixa(S, [x, (MASTRO * (f0 + f1)) / 2, z], [w, MASTRO / N + 0.3, w], { cor: k % 2 ? "#ffffff" : "#ece9e2" });
    }
    m.caixa(S, [tx, MASTRO + 4, tz], [6, 8, 6], { cor: AQUA });
    // os cabos: do alto do mastro à borda da cobertura, em leque (e dois estais para o chão, do lado de fora)
    const ang = Math.atan2(sz * B, sx * A);
    for (let q = -3; q <= 3; q++) {
      const t = ang + q * 0.115, px = (A + 6) * Math.cos(t), pz = (B + 6) * Math.sin(t);
      cabo(m, S, [tx, MASTRO - 4 - Math.abs(q) * 3, tz], [px * 0.97, TOPO + 3, pz * 0.97], 0.5, "#e8e6df");
    }
    cabo(m, S, [tx, MASTRO - 6, tz], [bx * 1.25, 0, bz * 1.25], 0.7, "#d4d1c8");
    cabo(m, S, [tx, MASTRO - 14, tz], [bx * 1.12, 0, bz * 1.25], 0.7, "#d4d1c8");
  }
  const g2 = m.montar("miami-estadio-mastros"); g.add(g2);
  g.userData = { A, B, alto: MASTRO + 8 };
  void r;
  return g;
}

// um estacionamento: asfalto com as vagas pintadas e os carros parados em InstancedMesh (carroçaria e vidro, cada um da sua cor)
export function estacionamento(tr, add, { x, z, rot = 0, a = 130, b = 60, semente = 5, lotacao = 0.7 }) {
  const rr = sorteio(semente), hs = [], fil = Math.max(2, Math.round((2 * b) / 36)), nv = Math.round((2 * a) / 17);
  const c = Math.cos(rot), s = Math.sin(rot);
  let hi = -1e9; for (const u of [-a, 0, a]) for (const v of [-b, 0, b]) hi = Math.max(hi, tr.chao(x + c * u - s * v, z + s * u + c * v));
  const asf = new THREE.Mesh(new THREE.PlaneGeometry(2 * a, 2 * b), tinta(canvasTex(512, 256, (cx, w, h, q) => {
    cx.fillStyle = "#3a3b40"; cx.fillRect(0, 0, w, h); for (let k = 0; k < 900; k++) { cx.fillStyle = `rgba(255,255,255,${q() * 0.05})`; cx.fillRect(q() * w, q() * h, 2, 2); }
    cx.strokeStyle = "#e9e6dc"; cx.lineWidth = 2;
    for (let f = 0; f < fil; f++) { const y0 = ((f + 0.1) * h) / fil, y1 = ((f + 0.9) * h) / fil; for (let k = 0; k <= nv; k++) { cx.beginPath(); cx.moveTo((k * w) / nv, y0); cx.lineTo((k * w) / nv, y1); cx.stroke(); } }
  }, false), { roughness: 0.95, transparent: false, depthWrite: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  asf.rotation.x = -Math.PI / 2; asf.rotation.z = -rot; asf.position.set(x, hi + 0.5, z); asf.receiveShadow = true; add(asf);
  // o chão sob o asfalto: um bloco fino que desce até o terreno
  const bloco = new THREE.Mesh(new THREE.BoxGeometry(2 * a, 8, 2 * b), M(0x3a3b40, { roughness: 1 })); bloco.position.set(x, hi - 3.5, z); bloco.rotation.y = -rot; add(bloco);
  const cores = ["#e9e9ec", "#1d1f24", "#b3262e", "#274c8f", "#9aa0a8", "#d9b24a", "#2f6b4a", "#ff5fa2", "#0aa3ad"];
  const corpos = [], vidros = [];
  for (let f = 0; f < fil; f++) for (let k = 0; k < nv; k++) {
    if (rr() > lotacao) continue;
    const u = -a + ((k + 0.5) * 2 * a) / nv, v = -b + ((f + 0.5) * 2 * b) / fil, px = x + c * u - s * v, pz = z + s * u + c * v, py = hi + 0.6;
    const ry = -rot + Math.PI / 2 + (rr() < 0.5 ? 0 : Math.PI), esc = 0.55 + rr() * 0.12;
    hs.push(py);
    corpos.push({ x: px, y: py + 4 * esc, z: pz, sx: esc * 1.0, sy: esc, sz: esc, r: ry, cor: cores[(rr() * cores.length) | 0] });
    vidros.push({ x: px, y: py + 11 * esc, z: pz, sx: esc, sy: esc, sz: esc, r: ry });
  }
  const geoC = new THREE.BoxGeometry(44, 8, 18), geoV = new THREE.BoxGeometry(22, 6.5, 16);
  const mc = instancias(add, geoC, new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2 }), corpos, { sombra: false, nome: "miami-carros" });
  if (mc) { const col = new THREE.Color(); corpos.forEach((o, k) => mc.setColorAt(k, col.set(o.cor))); mc.instanceColor.needsUpdate = true; }
  instancias(add, geoV, M(0x1c2630, { roughness: 0.2, metalness: 0.4 }), vidros, { sombra: false, nome: "miami-vidros" });
  return { carros: corpos.length };
}
