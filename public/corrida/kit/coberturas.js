// Kit de pista — coberturas (kit 2): `velas` (cobertura tensionada em velas, a assinatura de Sakhir e dos paddocks),
// `tendaPaddock` (as tendas brancas do paddock, com mesas) e `tribunaCoberta` (arquibancada em degraus coloridos com a
// cobertura de painéis brancos e a estrutura de aço). Cor chapada por vértice (montagem.js): um asset inteiro fica em 2 ou
// 3 chamadas de desenho. Origem no chão; a tribuna e a tenda ficam de frente para +z.
import * as THREE from "three";
import { Montador, solido, comTextura, letreiro, tom } from "./montagem.js";

const tela = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide });
const cacheVela = new Map();
// uma vela: a base quadrada (w × d) com o meio de cada beirada mais baixo (`sag`) e o pico no alto: 8 triângulos
function geoVela(w, d, h, sag) {
  const chave = [w, d, h, sag].join(); if (cacheVela.has(chave)) return cacheVela.get(chave);
  const a = [[-w / 2, 0, -d / 2], [w / 2, 0, -d / 2], [w / 2, 0, d / 2], [-w / 2, 0, d / 2]], p = [];
  for (let k = 0; k < 4; k++) {
    const c0 = a[k], c1 = a[(k + 1) % 4], mid = [(c0[0] + c1[0]) / 2, -sag, (c0[2] + c1[2]) / 2], pico = [0, h, 0];
    p.push(...c0, ...mid, ...pico, ...mid, ...c1, ...pico);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(new Array(p.length / 3 * 2).fill(0), 2)); g.computeVertexNormals();
  cacheVela.set(chave, g); return g;
}
/**
 * Põe uma vela (pirâmide de beirada côncava) num Montador, com o pico em y + h e a base em y. `mastro`: a ponta fina em cima.
 */
export function velaEm(m, x, y, z, { w = 36, d = 36, h = 14, sag = 2.5, cor = "#f2efe7", mastro = 8, corMastro = "#c9ced3", ry = 0 } = {}) {
  m.geo(tela, geoVela(w, d, h, sag), { x, y, z, ry, cor });
  if (mastro > 0) m.cilindro(solido(), [x, y + h + mastro / 2, z], [0.35, mastro], { cor: corMastro, seg: 6 });
}

/**
 * Cobertura em velas: uma fileira de módulos (`modulos` × `filas`), cada um com a beirada nos postes e o pico no alto com o
 * mastro. Serve de teto de paddock, de plataforma, de entrada ou de coroa de torre (ver `torreControle`).
 * @param {object} o
 * @param {number} [o.modulos=4] ao longo de x · @param {number} [o.filas=1] ao longo de z · @param {number} [o.vao=36] largura de cada vela · @param {number} [o.profundidade=36]
 * @param {number} [o.alturaBeiral=12] onde a vela encosta nos postes · @param {number} [o.alturaPico=14] quanto ela sobe acima disso · @param {number} [o.mastro=8] a ponta do pico
 * @param {string} [o.cor="#f2efe7"] · @param {boolean} [o.postes=true] · @param {string} [o.corPostes="#b9bec4"] · @param {number} [o.sag=2.5] o quanto a beirada afunda
 * @returns {THREE.Group} centrada em x e z, base no chão
 */
export function velas({ modulos = 4, filas = 1, vao = 36, profundidade = 36, alturaBeiral = 12, alturaPico = 14, mastro = 8, cor = "#f2efe7", postes = true, corPostes = "#b9bec4", sag = 2.5 } = {}) {
  const m = new Montador(), x0 = -(modulos * vao) / 2, z0 = -(filas * profundidade) / 2;
  for (let i = 0; i < modulos; i++) for (let j = 0; j < filas; j++) velaEm(m, x0 + (i + 0.5) * vao, alturaBeiral, z0 + (j + 0.5) * profundidade, { w: vao, d: profundidade, h: alturaPico, sag, cor, mastro });
  if (postes) for (let i = 0; i <= modulos; i++) for (let j = 0; j <= filas; j++) m.cilindro(solido(), [x0 + i * vao, alturaBeiral / 2, z0 + j * profundidade], [0.7, alturaBeiral], { cor: corPostes, seg: 6 });
  const g = m.montar("velas"); g.userData = { largura: modulos * vao, profundidade: filas * profundidade, alto: alturaBeiral + alturaPico + mastro };
  return g;
}

/**
 * Tenda de paddock: velas brancas sobre postes, chão claro, faixa com o nome da marca na frente (+z) e mesas com cadeiras.
 * @param {object} o
 * @param {number} [o.modulos=3] · @param {number} [o.filas=2] · @param {string} [o.cor="#f4f2ec"] · @param {string} [o.texto=""] o nome na faixa
 * @param {string} [o.corFaixa="#c8102e"] · @param {string} [o.corTexto="#ffffff"] · @param {boolean} [o.mesas=true] · @param {string} [o.corMesas="#c8102e"]
 */
export function tendaPaddock({ modulos = 3, filas = 2, cor = "#f4f2ec", texto = "", corFaixa = "#c8102e", corTexto = "#ffffff", mesas = true, corMesas = "#c8102e", vao = 34, profundidade = 34 } = {}) {
  const m = new Montador(), S = solido(), W = modulos * vao, D = filas * profundidade, x0 = -W / 2, z0 = -D / 2, beiral = 12;
  m.caixa(S, [0, -0.4, 0], [W + 4, 0.8, D + 4], { cor: "#cfc9bd" });
  for (let i = 0; i < modulos; i++) for (let j = 0; j < filas; j++) velaEm(m, x0 + (i + 0.5) * vao, beiral, z0 + (j + 0.5) * profundidade, { w: vao, d: profundidade, h: 12, cor, mastro: 6 });
  for (let i = 0; i <= modulos; i++) for (let j = 0; j <= filas; j++) m.cilindro(S, [x0 + i * vao, beiral / 2, z0 + j * profundidade], [0.7, beiral], { cor: "#b9bec4", seg: 6 });
  if (texto) m.plano(comTextura(letreiro(texto, { fundo: corFaixa, cor: corTexto, w: 512, h: 64, traco: false })), [0, beiral - 2.4, D / 2 + 0.2], [W, 4.4]);
  if (mesas) for (let i = 0; i < modulos; i++) for (let j = 0; j < filas; j++) {
    const x = x0 + (i + 0.5) * vao, z = z0 + (j + 0.5) * profundidade;
    m.cilindro(S, [x, 4, z], [0.6, 8], { cor: "#d9d9d9", seg: 6 }); m.cilindro(S, [x, 8.2, z], [5, 0.7], { cor: corMesas, seg: 12 });
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; m.caixa(S, [x + Math.cos(a) * 7.5, 2.6, z + Math.sin(a) * 7.5], [3.4, 5.2, 3.4], { cor: "#e9e7e1", ry: -a }); }
  }
  const g = m.montar("tenda-paddock"); g.userData = { largura: W, profundidade: D, alto: beiral + 18 };
  return g;
}

// ---- a arquibancada coberta ----
const rnd = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const CAMISAS = ["#ffffff", "#e63946", "#ffd23f", "#1b1b1b", "#ff7ad9", "#43a047", "#f4f4f4", "#ff8a1f"], PELES = ["#f1c7a5", "#d9a37a", "#a8714a", "#7a4a2a"];

/**
 * Arquibancada em degraus coloridos (seções que alternam de cor) com os corredores, a torcida e a cobertura de painéis brancos
 * sobre estrutura de aço, subindo para trás. De frente para +z; o primeiro degrau fica em z = 0 e ela cresce para -z.
 * @param {object} o
 * @param {number} [o.comprimento=200] · @param {number} [o.degraus=8] · @param {number} [o.altura=5] subida de cada degrau · @param {number} [o.fundo=7.5] profundidade de cada degrau
 * @param {string[]} [o.cores=["#2f5fd0","#6a45c8"]] assentos, alternando a cada seção · @param {number} [o.secoes=4]
 * @param {string|null} [o.cobertura="#f6f6f4"] cor dos painéis (`null` deixa aberta) · @param {string} [o.estrutura="#8a9096"] o aço · @param {number} [o.vao=40] distância entre colunas
 * @param {number} [o.publico=0.3] de 0 (vazia) a 1 (lotada) · @param {boolean} [o.colunas=true] · @param {number} [o.semente=7] · @param {number} [o.alcance=0.7] fração de trás coberta (1 = tudo) · @param {number} [o.folga=14] altura livre da cobertura acima dos degraus
 * @returns {THREE.Group} com userData.largura/profundidade/alto
 */
export function tribunaCoberta({ comprimento = 200, degraus = 8, altura = 5, fundo = 7.5, cores = ["#2f5fd0", "#6a45c8"], secoes = 4, cobertura = "#f6f6f4", estrutura = "#8a9096",
  vao = 40, publico = 0.3, colunas = true, semente = 7, alcance = 0.7, folga = 14 } = {}) {
  const m = new Montador(), S = solido(), r = rnd(semente), L = comprimento, D = degraus * fundo, sL = L / secoes, x0 = -L / 2;
  for (let k = 0; k < degraus; k++) {
    const top = (k + 1) * altura, zc = -(k + 0.5) * fundo;
    for (let s = 0; s < secoes; s++) {
      const cor = cores[s % cores.length], xc = x0 + (s + 0.5) * sL;
      m.caixa(S, [xc, top / 2, zc], [sL - 0.4, top, fundo], { cor: tom(cor, 0.78) }); // o espelho
      m.caixa(S, [xc, top + 0.15, zc + fundo * 0.12], [sL - 0.4, 0.4, fundo * 0.7], { cor: tom(cor, 1.18) }); // o assento
      if (publico > 0) for (let q = 0; q < sL - 3; q += 2.6) if (r() < publico) {
        const px = xc - sL / 2 + 1.6 + q + r() * 0.6, pz = zc - fundo * 0.15;
        m.caixa(S, [px, top + 1.9, pz], [1.9, 2.8, 1.5], { cor: CAMISAS[(r() * CAMISAS.length) | 0] }); m.caixa(S, [px, top + 3.9, pz], [1.3, 1.3, 1.3], { cor: PELES[(r() * 4) | 0] });
      }
    }
    for (let s = 1; s < secoes; s++) m.caixa(S, [x0 + s * sL, top / 2 + 0.2, zc], [1, top + 0.4, fundo], { cor: "#e6e8ea" }); // os corredores entre as seções
    if (k === 0) m.caixa(S, [0, 0.5, 0.6], [L, 1, 1.2], { cor: tom(estrutura, 0.9) });
  }
  // a cobertura sobe com os degraus e cobre só o fundo (`alcance`: a fração de trás); o resto fica a céu aberto, como na foto
  const alto0 = degraus * altura, zf = Math.min(4, -D * (1 - alcance) + 2), degrauEm = (z) => Math.max(0, Math.min(degraus, -z / fundo)) * altura;
  const yf = degrauEm(zf) + folga, yb = alto0 + folga;
  if (cobertura) {
    // painéis brancos em tiras ao longo da subida, com o vão de aço entre eles
    const zb = -D - 3, len = Math.hypot(zf - zb, yb - yf), ang = Math.atan2(yb - yf, zf - zb), zc = (zf + zb) / 2, yc = (yf + yb) / 2, nt = Math.max(3, Math.round(L / 22)), w = L / nt;
    m.caixa(S, [0, yc - 0.7, zc], [L + 1, 0.5, len], { cor: tom(estrutura, 0.8), rx: ang });
    for (let i = 0; i < nt; i++) m.caixa(S, [x0 + (i + 0.5) * w, yc + 0.1, zc], [w - 1.2, 0.9, len], { cor: cobertura, rx: ang });
    m.caixa(S, [0, yf - 0.3, zf + 0.2], [L + 1, 1.6, 1], { cor: "#ffffff" }); // a testeira do beiral
  }
  if (colunas) {
    const nc = Math.max(1, Math.round(L / vao));
    for (let i = 0; i <= nc; i++) {
      const x = x0 + (L * i) / nc;
      if (cobertura) m.caixa(S, [x, (degrauEm(zf) + yf) / 2, zf], [1.2, yf - degrauEm(zf), 1.2], { cor: estrutura });
      m.caixa(S, [x, yb / 2 + 2, -D - 2.5], [1.4, yb + 4, 1.4], { cor: estrutura });
    }
  }
  const g = m.montar("tribuna-coberta"); g.userData = { largura: L, profundidade: D, alto: yb + 2 };
  return g;
}
