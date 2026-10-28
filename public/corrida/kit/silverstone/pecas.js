// Silverstone — as peças que só este circuito tem (assets exclusivos), cada uma um THREE.Group com a origem no chão e a
// frente (a porta, a fachada) para +z, no mesmo molde do kit 2 (kit/montagem.js: cor chapada por vértice, uma malha por
// material, só um canvas pequeno para o que precisa de letra). 1 unidade ≈ 10 cm.
//   hangarRAF       o hangar em arco do antigo aeródromo da RAF (e, pequeno, a barraca Nissen)
//   torreRAF        a torre de controle de tijolo, com a cabine de vidro, que sobrou do campo de pouso
//   torreCorrida    a torre da direção de prova, atrás do The Wing (vidro, mastro com a Union Jack)
//   igreja          a igrejinha de pedra com a torre quadrada e a flecha (as aldeias em volta do autódromo)
//   turbina         a turbina de vento branca de longe
//   telao           o telão de LED sobre pernas de aço
//   bandeiraUK      a textura da Union Jack (as bandeiras da torcida, dos mastros e do acampamento)
//   prismaGeo       o telhado de duas águas de 1 × 1 × 1 (para as casinhas em InstancedMesh)
import * as THREE from "three";
import { Montador, solido, vidro, comTextura, tex, tom } from "../montagem.js";

let _uk = null;
/** A Union Jack desenhada no canvas (a cruz de São Jorge por cima da de Santo André e da de São Patrício). */
export const bandeiraUK = () => (_uk ||= tex(96, 48, (x, w, h) => {
  x.fillStyle = "#012169"; x.fillRect(0, 0, w, h);
  x.strokeStyle = "#ffffff"; x.lineWidth = h * 0.22; x.beginPath(); x.moveTo(0, 0); x.lineTo(w, h); x.moveTo(w, 0); x.lineTo(0, h); x.stroke();
  x.strokeStyle = "#c8102e"; x.lineWidth = h * 0.08; x.beginPath(); x.moveTo(0, 0); x.lineTo(w, h); x.moveTo(w, 0); x.lineTo(0, h); x.stroke();
  x.fillStyle = "#ffffff"; x.fillRect(w / 2 - h * 0.17, 0, h * 0.34, h); x.fillRect(0, h / 2 - h * 0.17, w, h * 0.34);
  x.fillStyle = "#c8102e"; x.fillRect(w / 2 - h * 0.1, 0, h * 0.2, h); x.fillRect(0, h / 2 - h * 0.1, w, h * 0.2);
}));

let _prisma = null;
/** Telhado de duas águas de lado 1: a cumeeira em x = 0, y = 1, ao longo de z; os beirais em y = 0 (x = ±0,5). */
export function prismaGeo() {
  if (_prisma) return _prisma;
  const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], C = [0.5, 0, 0.5], D = [-0.5, 0, 0.5], R1 = [0, 1, -0.5], R2 = [0, 1, 0.5], p = [];
  const tri = (a, b, c) => p.push(...a, ...b, ...c);
  tri(A, D, R2); tri(A, R2, R1); tri(B, R1, R2); tri(B, R2, C); tri(A, R1, B); tri(D, C, R2);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(new Array(p.length / 3 * 2).fill(0), 2)); g.computeVertexNormals();
  return (_prisma = g);
}

/**
 * Hangar em arco (tipo T2): o meio cilindro de chapa ondulada em gomos de dois tons, a mureta de tijolo, as duas cabeceiras com a
 * porta de correr. O eixo corre ao longo de x; a porta principal olha para +z (de lado) e as cabeceiras para ±x.
 * @param {{comprimento?:number, largura?:number, altura?:number, corTeto?:string, corParede?:string, corPorta?:string}} o
 */
export function hangarRAF({ comprimento = 340, largura = 180, altura = 78, corTeto = "#8f969c", corParede = "#a8624a", corPorta = "#3f444b" } = {}) {
  const m = new Montador(), S = solido(), c = comprimento, a = largura / 2, base = 12, h = altura - base;
  const arco = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true, 0, Math.PI), gomos = Math.max(4, Math.round(c / 42));
  for (let k = 0; k < gomos; k++) m.geo(S, arco, { rz: Math.PI / 2, x: -c / 2 + (k + 0.5) * (c / gomos), y: base, sx: h, sy: c / gomos + 0.2, sz: a, cor: tom(corTeto, k % 2 ? 0.9 : 1.04) });
  for (const s of [-1, 1]) m.caixa(S, [0, base / 2, s * a], [c, base, 1.6], { cor: corParede });
  const disco = new THREE.CircleGeometry(1, 20, 0, Math.PI);
  for (const s of [-1, 1]) {
    m.geo(S, disco, { x: s * (c / 2), y: base, ry: s * Math.PI / 2, sx: a, sy: h, cor: tom(corTeto, 0.82) });
    m.caixa(S, [s * (c / 2 + 0.8), base / 2, 0], [1.6, base, a * 2], { cor: corParede });
    const ph = base + h * 0.5; // a porta de correr: duas folhas, a fresta no meio e a viga em cima
    for (const f of [-1, 1]) m.caixa(S, [s * (c / 2 + 1.4), ph / 2, f * a * 0.38], [1.4, ph, a * 0.75], { cor: corPorta });
    m.caixa(S, [s * (c / 2 + 2.2), ph / 2, 0], [0.8, ph, 1.2], { cor: tom(corPorta, 0.6) });
    m.caixa(S, [s * (c / 2 + 1.6), ph + 1.4, 0], [1.8, 2.8, a * 1.58], { cor: tom(corPorta, 1.4) });
  }
  // a faixa amarela e preta da base da porta e a luminária
  for (const s of [-1, 1]) for (let k = -3; k < 3; k++) m.caixa(S, [s * (c / 2 + 2.4), 2, (k + 0.5) * a * 0.24], [0.4, 3.6, a * 0.12], { cor: k % 2 ? "#e8c20a" : "#1b1c1f" });
  const g = m.montar("hangar-raf"); g.userData = { comprimento: c, largura, altura };
  return g;
}

/** Torre de controle do aeródromo: dois andares de tijolo claro, a laje, a cabine de vidro com a varanda, o radar e o mastro. */
export function torreRAF() {
  const m = new Montador(), S = solido(), V = vidro();
  m.caixa(S, [0, 2, 0], [92, 4, 60], { cor: "#8b8d8c" });
  m.caixa(S, [0, 24, 0], [84, 40, 52], { cor: "#d4c6a4" });
  m.caixa(S, [0, 46, 0], [90, 4, 58], { cor: "#7f8286" }); // a laje e a varanda
  m.caixa(S, [0, 50, 29], [90, 5, 1], { cor: "#bfc3c7" }); m.caixa(S, [-45, 50, 0], [1, 5, 58], { cor: "#bfc3c7" }); m.caixa(S, [45, 50, 0], [1, 5, 58], { cor: "#bfc3c7" });
  m.caixa(V, [0, 62, 0], [56, 20, 38], { cor: "#2c3f50" }); // a cabine de vidro, com os caixilhos
  for (let k = -3; k <= 3; k++) m.caixa(S, [k * 9.3, 62, 19.4], [1, 20, 1], { cor: "#e9ebec" });
  m.caixa(S, [0, 74, 0], [62, 4, 44], { cor: "#b4b8bc" });
  for (const dx of [-24, 0, 24]) { m.caixa(V, [dx, 30, 26.3], [16, 14, 0.6], { cor: "#33485a" }); m.caixa(V, [dx, 14, 26.3], [14, 12, 0.6], { cor: "#33485a" }); }
  m.caixa(S, [0, 10, 26.4], [10, 20, 0.8], { cor: "#6a4b33" }); // a porta
  m.cilindro(S, [-20, 92, 0], [0.7, 36], { cor: "#d9d9d9", seg: 6 }); m.caixa(S, [18, 80, 0], [16, 4, 1.4], { cor: "#cfd2d4" }); m.caixa(S, [18, 83, 0], [1.4, 4, 4], { cor: "#cfd2d4" });
  const g = m.montar("torre-raf"); g.userData = { alto: 110 };
  const asta = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshBasicMaterial({ map: bandeiraUK(), side: THREE.DoubleSide })); asta.position.set(-13, 106, 0); g.add(asta);
  return g;
}

/** A torre da direção de prova: o pé de concreto, cinco andares de vidro com a laje branca, a cabine de comando, o mastro com a Union Jack. */
export function torreCorrida({ andares = 5 } = {}) {
  const m = new Montador(), S = solido(), V = vidro(), L = 64, P = 44;
  m.caixa(S, [0, 14, 0], [L - 8, 28, P - 8], { cor: "#d5d7d9" });
  let y = 28;
  for (let k = 0; k < andares; k++) {
    m.caixa(V, [0, y + 8, 0], [L - 4, 16, P - 4], { cor: "#2b3f55" });
    m.caixa(S, [0, y + 17, 0], [L, 3, P], { cor: "#f4f5f6" });
    for (let j = -3; j <= 3; j++) m.caixa(S, [j * (L / 7), y + 8, P / 2 - 1.5], [0.8, 16, 0.8], { cor: "#aeb4b9" });
    y += 19;
  }
  m.caixa(S, [0, y + 1.5, 0], [L + 6, 4, P + 6], { cor: "#cfd3d6" });
  m.caixa(V, [0, y + 12, 0], [L - 14, 18, P - 10], { cor: "#1f3142" }); m.caixa(S, [0, y + 23, 0], [L - 8, 3, P - 4], { cor: "#e9ebec" });
  m.cilindro(S, [L / 2 - 6, y + 50, 0], [0.9, 54], { cor: "#d4d6d8", seg: 6 }); m.cilindro(S, [-L / 2 + 8, y + 40, 0], [0.5, 36], { cor: "#c3c6c9", seg: 6 });
  const g = m.montar("torre-corrida"); g.userData = { alto: y + 80, largura: L, profundidade: P };
  const f = new THREE.Mesh(new THREE.PlaneGeometry(22, 11), new THREE.MeshBasicMaterial({ map: bandeiraUK(), side: THREE.DoubleSide })); f.position.set(L / 2 + 5, y + 72, 0); g.add(f);
  return g;
}

/** Igreja de pedra: a nave com o telhado de duas águas, a torre quadrada com as ameias e a flecha, a janela da frente. */
export function igreja() {
  const m = new Montador(), S = solido();
  m.caixa(S, [0, 16, 0], [64, 32, 30], { cor: "#cbbd9d" });
  m.geo(S, prismaGeo(), { y: 32, sx: 30, sy: 15, sz: 66, ry: Math.PI / 2, cor: "#6f5a50" }); // o telhado ao longo do comprimento
  m.caixa(S, [-40, 30, 0], [24, 60, 24], { cor: "#c3b490" });
  for (const [dx, dz] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) m.caixa(S, [-40 + dx, 62, dz], [4, 5, 4], { cor: "#b5a781" });
  m.geo(S, new THREE.ConeGeometry(1, 1, 4), { x: -40, y: 60 + 24, sx: 12.5, sy: 48, sz: 12.5, ry: Math.PI / 4, cor: "#5f6d73" });
  m.cilindro(S, [-40, 120, 0], [0.5, 14], { cor: "#caa43a", seg: 5 });
  m.caixa(S, [-40, 44, 12.4], [7, 12, 0.8], { cor: "#26323d" }); m.caixa(S, [-40, 44, -12.4], [7, 12, 0.8], { cor: "#26323d" });
  for (const dx of [-14, 0, 14]) { m.caixa(S, [dx, 18, 15.2], [6, 14, 0.8], { cor: "#2b3945" }); m.caixa(S, [dx, 18, -15.2], [6, 14, 0.8], { cor: "#2b3945" }); }
  m.caixa(S, [-40, 6, 12.4], [9, 12, 0.8], { cor: "#5a3d2a" });
  const g = m.montar("igreja"); g.userData = { raio: 60 }; return g;
}

/** Turbina de vento: torre cônica, a cabine, o cubo e as três pás (as pás giram de leve de um lugar para o outro via `giro`). */
export function turbina({ altura = 520, pa = 210, giro = 0 } = {}) {
  const m = new Montador(), S = solido(), hy = altura;
  m.geo(S, new THREE.CylinderGeometry(0.55, 1, 1, 10), { sx: altura * 0.012, sy: altura, sz: altura * 0.012, y: altura / 2, cor: "#eceeef" });
  m.caixa(S, [0, hy + 4, 4], [10, 10, 30], { cor: "#e3e6e8" }); m.cilindro(S, [0, hy + 4, 20], [5.5, 8], { cor: "#d4d8db", rx: Math.PI / 2, seg: 8 });
  for (let k = 0; k < 3; k++) {
    const f = giro + (k * Math.PI * 2) / 3;
    m.caixa(S, [Math.sin(f) * pa / 2, hy + 4 + Math.cos(f) * pa / 2, 23], [pa * 0.045, pa, 1.8], { cor: "#f3f5f6", rz: -f });
  }
  const g = m.montar("turbina"); g.userData = { alto: hy + pa }; return g;
}

/** Telão de LED: a moldura escura, as duas pernas de aço e a tela acesa com o letreiro (a tela não recebe luz: MeshBasic). */
export function telao({ w = 150, h = 84, texto = "BRITISH GRAND PRIX", altura = 58 } = {}) {
  const m = new Montador(), S = solido();
  const tela = new THREE.MeshBasicMaterial({ side: THREE.FrontSide, map: tex(256, 144, (x, cw, ch) => {
    const g = x.createLinearGradient(0, 0, cw, ch); g.addColorStop(0, "#0b2a5b"); g.addColorStop(1, "#c8102e");
    x.fillStyle = g; x.fillRect(0, 0, cw, ch);
    x.fillStyle = "#ffffff22"; for (let k = 0; k < ch; k += 6) x.fillRect(0, k, cw, 1);
    x.fillStyle = "#ffffff"; x.font = "italic 900 30px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(texto, cw / 2, ch * 0.44);
    x.fillStyle = "#ffd100"; x.fillRect(cw * 0.14, ch * 0.62, cw * 0.72, 4); x.fillStyle = "#ffffff"; x.font = "700 16px Arial, sans-serif"; x.fillText("SILVERSTONE", cw / 2, ch * 0.78);
  }) });
  m.caixa(S, [0, altura + h / 2, 0], [w + 6, h + 6, 5], { cor: "#1c1f24" });
  m.plano(tela, [0, altura + h / 2, 2.7], [w, h]);
  for (const s of [-1, 1]) { m.caixa(S, [s * (w / 2 - 12), altura / 2, -1], [5, altura, 5], { cor: "#7c828a" }); m.caixa(S, [s * (w / 2 - 12), 1.5, -1], [14, 3, 14], { cor: "#4a4f56" }); }
  m.caixa(S, [0, altura + h + 5, -2], [w, 2, 8], { cor: "#2d3036" });
  const g = m.montar("telao"); g.userData = { largura: w, alto: altura + h + 8 }; return g;
}
