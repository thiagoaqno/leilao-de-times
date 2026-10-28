// Suzuka — o que faz a pista parecer o Japão (peças novas, só desta pista): as marcas com texto em japonês, o torii vermelho
// do portão do parque, os fios de lanternas (chochin), os estandartes verticais (nobori), o estacionamento cheio de carros
// (os kei-cars brancos e os sedãs), o hotel do circuito, as atrações do parque e os pavilhões com telhado em velas.
// Tudo em cor chapada por vértice (kit/montagem.js) ou InstancedMesh; só os letreiros usam canvas pequeno.
//
// Cada função recebe `ref`: o ponto da pista onde ela se apoia como { x, z, ry } no mundo, e põe a peça lá (origem no chão).
import * as THREE from "three";
import { Montador, solido, vidro, comTextura, tex, tom } from "../montagem.js";
import { MARCAS } from "../marcas.js";
import { sorteio } from "../comum.js";

const FONTE_JP = "'Yu Gothic', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', Meiryo, 'MS Gothic', Arial, sans-serif";

// as marcas de Suzuka entram na lista do kit (kit/marcas.js) sem mexer nele
export function registrarMarcasSuzuka() {
  Object.assign(MARCAS, {
    suzuka: { fundo: "#ffffff", cor: "#c8102e", texto: "鈴鹿サーキット SUZUKA", fonte: `900 {s}px ${FONTE_JP}`, moldura: "#c8102e" },
    japangp: { fundo: "#c8102e", cor: "#ffffff", texto: "日本グランプリ JAPANESE GP", fonte: `italic 900 {s}px ${FONTE_JP}`, moldura: "#ffffff" },
    honda: { fundo: "#e60012", cor: "#ffffff", texto: "HONDA", fonte: "900 {s}px Arial, sans-serif" },
    dunlop: { fundo: "#ffd100", cor: "#111111", texto: "DUNLOP", fonte: "italic 900 {s}px 'Arial Black', Arial, sans-serif" },
    parque: { fundo: "#12408f", cor: "#ffd23f", texto: "モビリティリゾート", fonte: `900 {s}px ${FONTE_JP}`, moldura: "#ffd23f" },
    casio: { fundo: "#111111", cor: "#ffffff", texto: "CASIO", fonte: "900 {s}px Arial, sans-serif", moldura: "#e60012" },
    yokohama: { fundo: "#0b2f6b", cor: "#ffffff", texto: "YOKOHAMA", fonte: "900 {s}px Arial, sans-serif", moldura: "#e60012" },
    ganbare: { fundo: "#ffffff", cor: "#c8102e", texto: "頑張れ! GANBARE", fonte: `900 {s}px ${FONTE_JP}`, moldura: "#c8102e" },
  });
}

const girar = (ref, dx, dz) => [ref.x + dx * Math.cos(ref.ry) + dz * Math.sin(ref.ry), ref.z - dx * Math.sin(ref.ry) + dz * Math.cos(ref.ry)]; // (dx, dz) locais → mundo

/** Um torii vermelho (dois pilares, o kasagi curvo preto em cima e o nuki). De frente para +z. `k`: a escala (1 = 90 de altura). */
export function torii({ k = 1, cor = "#c8281e", topo = "#1b1b1f" } = {}) {
  const m = new Montador(), S = solido(), alt = 90 * k, vao = 76 * k, r = 4.4 * k;
  for (const s of [-1, 1]) {
    m.cilindro(S, [s * vao / 2, alt / 2, 0], [r, alt], { cor, seg: 10 });
    m.cilindro(S, [s * vao / 2, 3 * k, 0], [r * 1.35, 6 * k], { cor: topo, seg: 10 }); // a base preta
  }
  m.caixa(S, [0, alt * 0.76, 0], [vao + 14 * k, 4.6 * k, 4 * k], { cor }); // o nuki (a barra do meio)
  m.caixa(S, [0, alt * 0.8 + 3 * k, 0], [3 * k, 8 * k, 4.4 * k], { cor: "#d9b24a" }); // a plaquinha do meio
  m.caixa(S, [0, alt + 1.5 * k, 0], [vao + 36 * k, 4 * k, 9 * k], { cor: topo }); // o kasagi (a viga de cima), com as pontas subindo
  for (const s of [-1, 1]) m.caixa(S, [s * (vao + 30 * k) / 2, alt + 4.2 * k, 0], [12 * k, 3 * k, 9 * k], { cor: topo, rz: s * -0.28 });
  m.caixa(S, [0, alt - 3.4 * k, 0], [vao + 14 * k, 3 * k, 6.4 * k], { cor }); // o shimaki, a viga de baixo
  const g = m.montar("torii"); g.userData = { alto: alt + 8 * k, vao };
  return g;
}

/**
 * Fios de lanternas vermelhas (chochin): para cada trecho `[x0, z0, x1, z1]` um fio caindo de leve no meio, com uma lanterna a cada
 * `passo`. Duas malhas instanciadas (as lanternas e a faixa branca de cada uma) e o fio todo numa linha só.
 */
export function lanternas(add, trechos, { alto = 52, passo = 15, queda = 5, tam = 5.2, cor = "#d8201f" } = {}) {
  const lista = [], fio = [];
  for (const [x0, z0, x1, z1] of trechos) {
    const dist = Math.hypot(x1 - x0, z1 - z0), nn = Math.max(1, Math.floor(dist / passo));
    for (let k = 0; k <= nn; k++) {
      const t = k / nn, y = alto - 4 * queda * t * (1 - t);
      lista.push([x0 + (x1 - x0) * t, y - tam * 0.9, z0 + (z1 - z0) * t]);
      if (k < nn) { const t2 = (k + 1) / nn; fio.push(x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t, x1 * t2 + x0 * (1 - t2), alto - 4 * queda * t2 * (1 - t2), z1 * t2 + z0 * (1 - t2)); }
    }
  }
  if (!lista.length) return;
  const geo = new THREE.SphereGeometry(tam, 8, 6), d = new THREE.Object3D();
  const luz = add(new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: cor, emissive: 0xaa1510, emissiveIntensity: 0.55, roughness: 0.6 }), lista.length)), tampa = add(new THREE.InstancedMesh(new THREE.CylinderGeometry(tam * 0.55, tam * 0.55, tam * 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x1b1b1f }), lista.length * 2));
  lista.forEach(([x, y, z], k) => {
    d.position.set(x, y, z); d.scale.set(0.85, 1.12, 0.85); d.updateMatrix(); luz.setMatrixAt(k, d.matrix);
    d.scale.set(1, 1, 1); d.position.set(x, y + tam * 1.05, z); d.updateMatrix(); tampa.setMatrixAt(k * 2, d.matrix);
    d.position.set(x, y - tam * 1.05, z); d.updateMatrix(); tampa.setMatrixAt(k * 2 + 1, d.matrix);
  });
  luz.castShadow = tampa.castShadow = false; luz.name = "suzuka-lanternas";
  const linhas = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(fio, 3)), new THREE.LineBasicMaterial({ color: 0x2b2b30 }));
  add(linhas);
}

// ---- os estandartes (nobori): mastro de bambu, pano vertical com um texto grande ----
const NOBORI = [
  { fundo: "#c8102e", cor: "#ffffff", texto: "日本GP" },
  { fundo: "#ffffff", cor: "#c8102e", texto: "鈴鹿" },
  { fundo: "#0b3d91", cor: "#ffffff", texto: "祭" },
  { fundo: "#ffd100", cor: "#c8102e", texto: "F1" },
];
const texNobori = ({ fundo, cor, texto }) => tex(64, 192, (x, w, h) => {
  x.fillStyle = fundo; x.fillRect(0, 0, w, h); x.strokeStyle = cor; x.lineWidth = 3; x.strokeRect(4, 4, w - 8, h - 8);
  x.fillStyle = cor; x.font = `900 ${texto.length > 2 ? 30 : 46}px ${FONTE_JP}`; x.textAlign = "center"; x.textBaseline = "middle";
  const letras = Array.from(texto); letras.forEach((c, i) => x.fillText(c, w / 2, h / 2 + (i - (letras.length - 1) / 2) * (texto.length > 2 ? 40 : 56)));
});
/** Estandartes verticais nos pontos `[x, z, ry]` (o pano olha para ry), cada um de um desenho, balançando só na imaginação. */
export function nobori(add, lugares, { hAt, alto = 88, largura = 22 } = {}) {
  const por = NOBORI.map(() => []);
  lugares.forEach(([x, z, ry], k) => por[k % NOBORI.length].push({ x, z, ry }));
  const d = new THREE.Object3D(), hastes = [];
  NOBORI.forEach((def, j) => {
    if (!por[j].length) return;
    const m = add(new THREE.InstancedMesh(new THREE.PlaneGeometry(largura, alto * 0.78), new THREE.MeshStandardMaterial({ map: texNobori(def), side: THREE.DoubleSide, roughness: 0.8 }), por[j].length));
    por[j].forEach((o, i) => { const y = hAt(o.x, o.z); d.position.set(o.x, y + alto * 0.58, o.z); d.rotation.set(0, o.ry, 0); d.updateMatrix(); m.setMatrixAt(i, d.matrix); hastes.push([o.x, y, o.z, o.ry]); });
    m.castShadow = false; m.name = "suzuka-nobori";
  });
  const poste = add(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.7, 0.9, alto, 5), new THREE.MeshStandardMaterial({ color: 0xc8b27a, roughness: 0.8 }), hastes.length));
  hastes.forEach(([x, y, z], i) => { d.position.set(x, y + alto / 2, z); d.rotation.set(0, 0, 0); d.updateMatrix(); poste.setMatrixAt(i, d.matrix); });
  poste.castShadow = false;
  return hastes.length;
}

// ---- o estacionamento: o piso com as vagas e os carros ----
const CARROS = ["#f4f4f2", "#f4f4f2", "#f4f4f2", "#d9dadd", "#2a2c31", "#2a2c31", "#b9bcc2", "#c8102e", "#1f4fa8", "#e8e2d0", "#ffd23f", "#3f8a58"];
/**
 * Um estacionamento retangular de `filas` × `vagas` baias, com o piso pintado e os carros (80% das vagas, cores sorteadas).
 * `ref`: o centro { x, y (o chão), z, ry }. As malhas: o piso (1), as carrocerias (1 InstancedMesh) e as cabines (1).
 */
export function estacionamento(add, ref, { filas = 4, vagas = 20, semente = 11 } = {}) {
  const r = sorteio(semente), larg = 22, comp = 46, W = vagas * larg, D = filas * comp * 1.0 + (filas / 2) * 26;
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(W + 16, D + 16), new THREE.MeshStandardMaterial({ map: pisoVagas(vagas, filas), roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  piso.rotation.x = -Math.PI / 2; piso.rotation.z = 0; piso.position.set(ref.x, ref.y + 0.5, ref.z);
  const grupo = new THREE.Group(); grupo.position.set(ref.x, 0, ref.z); grupo.rotation.y = ref.ry; piso.position.set(0, ref.y + 0.5, 0); grupo.add(piso); add(grupo);
  const corpos = [], cabines = [];
  const filaZ = (f) => -D / 2 + comp / 2 + 8 + Math.floor(f / 2) * (comp * 2 + 26) + (f % 2) * comp;
  for (let f = 0; f < filas; f++) for (let v = 0; v < vagas; v++) {
    if (r() > 0.82) continue;
    const x = -W / 2 + (v + 0.5) * larg, z = filaZ(f), c = CARROS[(r() * CARROS.length) | 0], kei = r() < 0.35, l = kei ? 34 : 42;
    const frente = f % 2 ? 1 : -1; // de ré ou de frente, como na vida real: metade para cada lado
    corpos.push({ x, z, c, sx: 15, sy: kei ? 14 : 11, sz: l, ry: 0 }); cabines.push({ x, z: z - frente * 2, sx: 13.5, sy: kei ? 10 : 8, sz: l * 0.52, y: kei ? 14 : 11 });
  }
  const corpoMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2 }), vidroMat = new THREE.MeshStandardMaterial({ color: 0x2c3844, roughness: 0.2, metalness: 0.3 }), cubo = new THREE.BoxGeometry(1, 1, 1), d = new THREE.Object3D();
  const a = new THREE.InstancedMesh(cubo, corpoMat, corpos.length), b = new THREE.InstancedMesh(cubo, vidroMat, cabines.length);
  corpos.forEach((o, k) => { d.position.set(o.x, ref.y + 2.2 + o.sy / 2, o.z); d.scale.set(o.sx, o.sy, o.sz); d.updateMatrix(); a.setMatrixAt(k, d.matrix); a.setColorAt(k, new THREE.Color(o.c)); });
  cabines.forEach((o, k) => { d.position.set(o.x, ref.y + 2.2 + o.y + o.sy / 2, o.z); d.scale.set(o.sx, o.sy, o.sz); d.updateMatrix(); b.setMatrixAt(k, d.matrix); });
  a.instanceColor.needsUpdate = true; a.castShadow = b.castShadow = false; a.name = "suzuka-carros"; grupo.add(a, b);
  return { largura: W + 16, profundidade: D + 16, carros: corpos.length };
}
function pisoVagas(vagas, filas) {
  const t = tex(256, 128, (x, w, h) => {
    x.fillStyle = "#54565b"; x.fillRect(0, 0, w, h); x.fillStyle = "#d8d8d4";
    for (let i = 0; i <= vagas; i++) x.fillRect(Math.round(i * (w - 2) / vagas), 0, 2, h);
    x.fillStyle = "#5e6065"; for (let k = 0; k < 120; k++) x.fillRect(Math.random() * w, Math.random() * h, 3, 2);
  });
  return t;
}

// ---- o hotel do circuito e as atrações do parque ----
/** O Suzuka Circuit Hotel: bloco branco de seis andares com as janelas em fita, a faixa vermelha no alto e o letreiro. De frente para +z. */
export function hotel({ largura = 300, andares = 6, alturaAndar = 22, profundidade = 90, cor = "#efece6", faixa = "#c8102e" } = {}) {
  const m = new Montador(), S = solido(), H = andares * alturaAndar;
  const janelas = comTextura(tex(128, 64, (x, w, h) => {
    x.fillStyle = cor; x.fillRect(0, 0, w, h); x.fillStyle = "#35506a"; x.fillRect(4, 14, w - 8, 36); x.fillStyle = "#ffffff55"; for (let k = 0; k < 6; k++) x.fillRect(4 + k * 20, 14, 2, 36);
    x.fillStyle = "#c9c5bb"; x.fillRect(0, 0, w, 6); x.fillRect(0, h - 4, w, 4);
  }, { repeat: true }), { side: THREE.FrontSide });
  janelas.map.repeat.set(largura / 64, andares);
  m.caixa(S, [0, H / 2, -profundidade / 2], [largura, H, profundidade], { cor });
  m.plano(janelas, [0, H / 2, 0.15], [largura, H], { uv: [largura / 64, andares] });
  m.caixa(S, [0, H + 3, -profundidade / 2], [largura + 6, 6, profundidade + 6], { cor: "#d9d5cb" });
  m.caixa(S, [0, H - 5, 1.4], [largura + 2, 9, 3], { cor: faixa });
  m.caixa(S, [largura * 0.34, H + 20, -profundidade * 0.4], [largura * 0.22, 28, profundidade * 0.4], { cor: "#cfd2d6" }); // a casa de máquinas
  const portao = comTextura(tex(512, 64, (x, w, h) => { x.fillStyle = faixa; x.fillRect(0, 0, w, h); x.fillStyle = "#fff"; x.font = `900 36px ${FONTE_JP}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("鈴鹿サーキットホテル", w / 2, h / 2 + 2, w - 20); }));
  m.plano(portao, [0, H - 5, 3.2], [largura * 0.62, 9]);
  m.caixa(S, [0, 7, 14], [largura * 0.36, 3, 30], { cor: "#d9d5cb" }); // a marquise da entrada
  for (const s of [-1, 1]) m.caixa(S, [s * largura * 0.17, 3.5, 26], [3, 7, 3], { cor: "#b9b5ab" });
  const g = m.montar("hotel-suzuka"); g.userData = { largura, alto: H + 40, profundidade };
  return g;
}

/** Uma torre de queda livre (parque de diversões): mastro, dois anéis de assentos e as faixas de cor. */
export function torreDeQueda({ alto = 290, cor = "#e8212b" } = {}) {
  const m = new Montador(), S = solido();
  m.caixa(S, [0, alto / 2, 0], [14, alto, 14], { cor: "#cfd3d8" });
  for (const [dx, dz] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) m.caixa(S, [dx, alto / 2, dz], [2.2, alto, 2.2], { cor: "#9aa0a8" });
  for (let k = 1; k < 8; k++) m.caixa(S, [0, k * alto / 8, 0], [22, 6, 22], { cor: k % 2 ? cor : "#ffd23f" });
  m.cilindro(S, [0, alto * 0.78, 0], [32, 7], { cor: "#2b6fd6", seg: 14 }); // o anel de assentos, no alto
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; m.caixa(S, [Math.cos(a) * 32, alto * 0.78 - 9, Math.sin(a) * 32], [8, 11, 8], { cor: "#f4f4f2", ry: -a }); }
  m.cilindro(S, [0, alto + 8, 0], [11, 16], { cor }); m.cilindro(S, [0, alto + 22, 0], [1.2, 28], { cor: "#9aa0a8", seg: 6 });
  m.cilindro(S, [0, 2, 0], [60, 4], { cor: "#b9bcc0", seg: 16 });
  return m.montar("torre-de-queda");
}

/** Um carrossel: o piso, o mastro, o teto cônico listrado e cavalinhos de cores. */
export function carrossel({ raio = 56, cores = ["#e8212b", "#f4f4f2"] } = {}) {
  const m = new Montador(), S = solido();
  m.cilindro(S, [0, 2, 0], [raio, 4], { cor: "#d9b24a", seg: 18 });
  m.cilindro(S, [0, 28, 0], [5, 56], { cor: "#d9d5cb", seg: 8 });
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; m.cilindro(S, [Math.cos(a) * raio * 0.9, 28, Math.sin(a) * raio * 0.9], [1.3, 56], { cor: "#e8e2d0", seg: 6 }); m.caixa(S, [Math.cos(a) * raio * 0.62, 14 + (k % 2) * 4, Math.sin(a) * raio * 0.62], [9, 11, 18], { cor: ["#ff7ad9", "#ffd23f", "#2b6fd6", "#ffffff"][k % 4], ry: -a + Math.PI / 2 }); }
  const cone = new THREE.ConeGeometry(raio * 1.04, 26, 10);
  m.geo(S, cone, { y: 69, cor: cores[0] });
  for (let k = 0; k < 10; k += 2) { const a = (k / 10) * Math.PI * 2 + Math.PI / 10; m.caixa(S, [Math.cos(a) * raio * 0.55, 66, Math.sin(a) * raio * 0.55], [3, 3, raio * 0.9], { cor: cores[1], ry: -a + Math.PI / 2, rz: 0 }); }
  m.cilindro(S, [0, 86, 0], [1, 14], { cor: "#d9b24a", seg: 6 });
  return m.montar("carrossel");
}
void vidro; void tom;
