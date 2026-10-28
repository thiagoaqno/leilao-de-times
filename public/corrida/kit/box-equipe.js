// Kit de pista — boxes de equipe e o que mora neles (kit 2): `boxEquipe` (o prédio vermelho de 2 andares com faixa de
// letreiro, vidros inclinados e garagens de enrolar abertas), `retaDosBoxes` (o prédio longo de 2 níveis, garagens com
// toldo por equipe e arquibancada coberta em cima), `pilhaPneus`, `rackPneus`, `carrinhoFerramentas`, `carroF1`, `muretaPit`.
// Tudo é cor chapada por vértice (montagem.js): um box inteiro fica em ~4 chamadas de desenho. Só cenário. Origem no chão,
// frente do prédio virada para +z (o lado da pit lane), centro em x = 0. 1 unidade ≈ 10 cm.
import * as THREE from "three";
import { Montador, solido, vidro, comTextura, tex, letreiro, tom } from "./montagem.js";
import { tribunaCoberta } from "./coberturas.js";

const ripas = (cor) => tex(8, 32, (x, w, h) => { x.fillStyle = cor; x.fillRect(0, 0, w, h); for (let k = 0; k < 4; k++) { x.fillStyle = "#00000040"; x.fillRect(0, k * 8 + 6, w, 2); x.fillStyle = "#ffffff30"; x.fillRect(0, k * 8, w, 1); } }, { repeat: true });
const friso = (cor) => tex(32, 16, (x, w, h) => { x.fillStyle = cor; x.fillRect(0, 0, w, h); x.fillStyle = "#00000055"; x.beginPath(); x.moveTo(8, h); x.lineTo(16, 0); x.lineTo(24, 0); x.lineTo(16, h); x.fill(); }, { repeat: true });

// ---- peças pequenas (cada uma tem a versão `...Em(m, ...)`, que põe num Montador já aberto, e a versão que devolve o grupo) ----

/** Pilha vertical de pneus (eixo y). `faixa` é a cor do composto (mole vermelho, médio amarelo, duro branco). */
export function pilhaPneusEm(m, x, z, { n = 4, faixa = "#e10600", raio = 5.5, y = 0 } = {}) {
  for (let k = 0; k < n; k++) {
    m.cilindro(solido(), [x, y + 1.8 + k * 3.6, z], [raio, 3.6], { cor: "#1b1c1f", seg: 10 });
    m.cilindro(solido(), [x, y + 1.8 + k * 3.6, z], [raio + 0.12, 0.7], { cor: faixa, seg: 10 });
  }
}
/** @param {{n?:number, faixa?:string, raio?:number}} o */
export function pilhaPneus(o = {}) { const m = new Montador(); pilhaPneusEm(m, 0, 0, o); return m.montar("pilha-pneus"); }

/** Estante de aço com pneus deitados de lado (como na foto: duas prateleiras de 2 a 3 pneus). `largura` ao longo de x. */
export function rackPneusEm(m, x, z, { largura = 22, niveis = 2, faixa = "#e10600", ry = 0, aco = "#d7dadd" } = {}) {
  const c = Math.cos(ry), s = Math.sin(ry), p = (dx, dy, dz) => [x + dx * c + dz * s, dy, z - dx * s + dz * c]; // gira em volta de (x, z)
  const alto = niveis * 11.5 + 1, prof = 12;
  for (const dx of [-largura / 2, largura / 2]) for (const dz of [-prof / 2, prof / 2]) m.caixa(solido(), p(dx, alto / 2, dz), [0.8, alto, 0.8], { cor: aco, ry });
  for (let k = 0; k <= niveis; k++) m.caixa(solido(), p(0, 0.6 + k * 11.5, 0), [largura + 0.8, 0.7, prof], { cor: aco, ry });
  const por = Math.max(2, Math.floor(largura / 7.5));
  for (let k = 0; k < niveis; k++) for (let j = 0; j < por; j++) {
    const dx = -largura / 2 + (j + 0.5) * (largura / por), [px, py, pz] = p(dx, 6.8 + k * 11.5, 0);
    m.cilindro(solido(), [px, py, pz], [5.4, 4.8], { cor: "#1b1c1f", rz: Math.PI / 2, ry, seg: 10 });
    m.cilindro(solido(), [px, py, pz], [5.55, 0.8], { cor: faixa, rz: Math.PI / 2, ry, seg: 10 });
  }
}
/** @param {{largura?:number, niveis?:number, faixa?:string}} o */
export function rackPneus(o = {}) { const m = new Montador(); rackPneusEm(m, 0, 0, o); return m.montar("rack-pneus"); }

/** Carrinho de ferramentas (caixa com gavetas, tampo e o cruz branca da foto). */
export function carrinhoFerramentasEm(m, x, z, { cor = "#c8102e", ry = 0 } = {}) {
  const c = Math.cos(ry), s = Math.sin(ry), p = (dx, dy, dz) => [x + dx * c + dz * s, dy, z - dx * s + dz * c];
  m.caixa(solido(), p(0, 7, 0), [13, 12, 9], { cor, ry }); m.caixa(solido(), p(0, 13.4, 0), [14, 1.2, 10], { cor: "#2a2d33", ry });
  m.caixa(solido(), p(0, 7, 4.6), [0.5, 11, 0.4], { cor: "#f4f4f4", ry }); m.caixa(solido(), p(0, 8, 4.6), [12, 0.5, 0.4], { cor: "#f4f4f4", ry });
  m.caixa(solido(), p(0, 0.9, 0), [14, 1.8, 10], { cor: "#2a2d33", ry }); // rodinhas
}
export function carrinhoFerramentas(o = {}) { const m = new Montador(); carrinhoFerramentasEm(m, 0, 0, o); return m.montar("carrinho"); }

/** Carro de F1 de brinquedo (low poly, ~14 caixas) parado de nariz para +z: só enfeite de garagem. */
export function carroF1Em(m, x, z, { cor = "#c8102e", detalhe = "#15161a", ry = 0, y = 0 } = {}) {
  const c = Math.cos(ry), s = Math.sin(ry), p = (dx, dy, dz) => [x + dx * c + dz * s, y + dy, z - dx * s + dz * c], S = solido();
  m.caixa(S, p(0, 4.2, -2), [7, 4.6, 26], { cor, ry }); m.caixa(S, p(0, 3.6, 17), [4, 2.8, 16], { cor, ry }); // monocoque e nariz
  m.caixa(S, p(0, 6.6, -4), [5, 2, 7], { cor: detalhe, ry }); m.caixa(S, p(0, 8.4, -4), [0.7, 1.2, 7], { cor: detalhe, ry }); // cockpit e halo
  m.caixa(S, p(0, 1.6, 26), [22, 0.7, 5], { cor: detalhe, ry }); m.caixa(S, p(0, 8.4, -17), [16, 0.8, 4.5], { cor, ry }); // asa dianteira e traseira
  for (const sx of [-1, 1]) {
    m.caixa(S, p(sx * 8.2, 8, -17), [0.6, 6, 4.5], { cor: detalhe, ry }); m.caixa(S, p(sx * 4.5, 4, -6), [3, 3.4, 12], { cor, ry }); // pontões
    m.cilindro(S, p(sx * 9.5, 3.7, 14), [3.6, 4], { cor: "#1b1c1f", rz: Math.PI / 2, ry, seg: 10 }); m.cilindro(S, p(sx * 9.8, 3.7, 14), [3.7, 0.7], { cor: "#ffd400", rz: Math.PI / 2, ry, seg: 10 });
    m.cilindro(S, p(sx * 9.8, 3.9, -12), [4.1, 5.4], { cor: "#1b1c1f", rz: Math.PI / 2, ry, seg: 10 }); m.cilindro(S, p(sx * 10.2, 3.9, -12), [4.2, 0.8], { cor: "#ffd400", rz: Math.PI / 2, ry, seg: 10 });
  }
}
export function carroF1(o = {}) { const m = new Montador(); carroF1Em(m, 0, 0, o); return m.montar("carro-f1"); }

/** Muretinha da pit lane com o logo repetido (a vermelha da foto). Corre ao longo de x, centrada; face principal para +z. */
export function muretaPit({ comprimento = 130, alto = 11, espessura = 2, cor = "#d62a1f", logo = "3D", corLogo = "#15161a", topo = "#f2f2f2" } = {}) {
  const m = new Montador(), S = solido(), mat = comTextura(letreiro(logo, { fundo: cor, cor: corLogo, w: 512, h: 64, vezes: Math.max(2, Math.round(comprimento / 32)), traco: false }));
  m.caixa(S, [0, alto / 2, 0], [comprimento, alto, espessura], { cor }); m.caixa(S, [0, alto + 0.3, 0], [comprimento + 0.6, 0.6, espessura + 0.6], { cor: topo });
  for (const f of [1, -1]) m.plano(mat, [0, alto / 2, f * (espessura / 2 + 0.05)], [comprimento, alto * 0.7], { ry: f > 0 ? 0 : Math.PI });
  return m.montar("mureta-pit");
}

// ---- o box de equipe ----

/**
 * O prédio de box de uma equipe, como a foto: dois andares, vidros escuros inclinados em cima sob o beiral (platibanda com
 * frisos e luminárias), faixa larga com o letreiro e garagens com porta de enrolar. Dentro: pneus em rack, carrinho de
 * ferramentas e, se quiser, o carro.
 * @param {object} o
 * @param {string} [o.cor="#d62a1f"] parede e teto · @param {string} [o.corFaixa="#ffd400"] a faixa · @param {string} [o.corTexto] o letreiro
 * @param {string} [o.texto="RACE"] · @param {number} [o.portas=2] garagens · @param {number} [o.larguraPorta=46] · @param {number} [o.altoPorta=30]
 * @param {number|number[]} [o.abertura=0.65] 0 fecha a porta, 1 abre toda (um número ou um por garagem)
 * @param {number} [o.profundidade=80] · @param {number} [o.altoAndar=34] · @param {string} [o.corPorta="#d9cfa6"]
 * @param {number} [o.carros=1] quantas garagens têm carro (na cor `corCarro`) · @param {string} [o.corCarro] · @param {boolean} [o.interior=true]
 * @param {boolean|{logo?:string,cor?:string,distancia?:number}} [o.mureta=false] muretinha na frente (`distancia`: 120)
 * @returns {THREE.Group} com userData.largura/profundidade/alto
 */
export function boxEquipe({ cor = "#d62a1f", corFaixa = "#ffd400", corTexto = "#c8102e", texto = "RACE", portas = 2, larguraPorta = 46, altoPorta = 30, abertura = 0.65,
  profundidade = 80, altoAndar = 34, corPorta = "#d9cfa6", carros = 1, corCarro, interior = true, mureta = false } = {}) {
  const m = new Montador(), S = solido(), pil = 8, W = portas * larguraPorta + (portas + 1) * pil, P = profundidade, H1 = altoAndar, H2 = altoAndar - 4, escuro = tom(cor, 0.62);
  const ab = (i) => Math.max(0, Math.min(1, Array.isArray(abertura) ? abertura[i] ?? 0.65 : abertura));
  // chão, paredes, pilares entre as garagens (a profundidade toda: cada garagem é uma baia), fundo e teto da térrea
  m.caixa(S, [0, -0.5, -P / 2 + 3], [W + 6, 1, P + 6], { cor: "#7a7570" });
  for (let i = 0; i <= portas; i++) m.caixa(S, [-W / 2 + pil / 2 + i * (larguraPorta + pil), H1 / 2, -P / 2], [pil, H1, P], { cor });
  m.caixa(S, [0, H1 / 2, -P + 1], [W, H1, 2], { cor }); m.caixa(S, [0, H1 + 0.5, -P / 2], [W, 1, P], { cor: tom(cor, 0.85) });
  // o andar de cima: o miolo maciço atrás do vidro, as laterais, o fundo e o teto com o beiral para a frente
  m.caixa(S, [0, H1 + H2 / 2 + 0.5, -P / 2 - 4], [W, H2, P - 8], { cor });
  for (const sx of [-1, 1]) m.caixa(S, [sx * (W / 2 - 1.5), H1 + H2 / 2 + 0.5, -4], [3, H2, 8 + 6], { cor });
  m.caixa(S, [0, H1 + H2 + 1.5, -P / 2 + 3], [W + 2, 3, P + 10], { cor: tom(cor, 1.12) });
  // vidros inclinados (a base mais à frente, o alto recuado) com os caixilhos brancos
  const hv = H2 - 8, th = 0.2, zb = 1.5; // th: a inclinação em rad (~11°)
  const zc = zb - Math.sin(th) * hv / 2, yc = H1 + 4 + Math.cos(th) * hv / 2;
  m.caixa(vidro(), [0, yc, zc], [W - 3, hv / Math.cos(th) * 0.995, 0.6], { cor: "#2b323a", rx: -th });
  const nj = Math.max(5, portas * 4);
  for (let k = 0; k <= nj; k++) m.caixa(S, [-(W - 3) / 2 + k * (W - 3) / nj, yc, zc + 0.4], [0.6, hv / Math.cos(th), 0.5], { cor: "#f2f2f2", rx: -th });
  // beiral: a platibanda escura com os frisos em diagonal e as luminárias pretas
  const fr = comTextura(friso(escuro), {});
  fr.map.repeat.set(Math.round(W / 10), 1);
  m.plano(fr, [0, H1 + H2 - 1.5, -3.2], [W, 7], { cor: "#fff" });
  for (let k = 0; k < portas * 3 + 2; k++) { const lx = -W / 2 + 6 + k * ((W - 12) / (portas * 3 + 1)); m.caixa(S, [lx, H1 + H2 + 4.2, -3], [2.4, 0.8, 0.8], { cor: "#15161a" }); m.caixa(S, [lx, H1 + H2 + 3.2, -3], [0.5, 1.6, 0.5], { cor: "#15161a" }); }
  // a faixa larga de letreiro, saindo um pouco da parede, e as portas
  const faixaMat = comTextura(letreiro(texto, { fundo: corFaixa, cor: corTexto, w: 768, h: 96, vezes: Math.max(2, portas + 1) }));
  m.caixa(S, [0, H1 - 2.5, 1.2], [W + 1, 12.4, 2.4], { cor: corFaixa }); m.plano(faixaMat, [0, H1 - 2.5, 2.45], [W + 1, 12.4]);
  const slat = comTextura(ripas(corPorta));
  for (let i = 0; i < portas; i++) {
    const x = -W / 2 + pil + larguraPorta / 2 + i * (larguraPorta + pil), a = ab(i), fechada = altoPorta * (1 - a);
    if (fechada > 1) { m.plano(slat, [x, altoPorta - fechada / 2, 0.4], [larguraPorta, fechada], { uv: [1, fechada / 8.8] }); }
    m.caixa(S, [x, altoPorta + 0.7, 0.6], [larguraPorta + 0.4, 1.8, 1.2], { cor: tom(corPorta, 0.8) }); // a caixa do rolo, em cima
    if (a < 1) m.caixa(S, [x, altoPorta - fechada - 0.5, 0.9], [larguraPorta - 1, 1, 1.4], { cor: tom(corPorta, 0.7) }); // a barra de baixo da porta
    // o interior de cada baia
    if (interior) {
      m.plano(solido(), [x, H1 / 2 - 1, -P + 2.1], [larguraPorta, H1 - 2], { cor: "#ece8df" });
      rackPneusEm(m, x + larguraPorta / 2 - 14, -P + 10, { largura: 22, faixa: i % 2 ? "#ffd400" : "#e10600" });
      carrinhoFerramentasEm(m, x - larguraPorta / 2 + 11, -P + 10, { cor: tom(cor, 1) });
      if (i < carros) carroF1Em(m, x, -P / 2 + 12, { cor: corCarro || (i === 0 ? tom(cor, 0.9) : "#f2c200"), ry: 0 });
    }
  }
  const g = m.montar("box-equipe");
  if (mureta) { const o = typeof mureta === "object" ? mureta : {}, mu = muretaPit({ comprimento: W, cor: o.cor || cor, logo: o.logo || "3D" }); mu.position.set(0, 0, o.distancia ?? 120); g.add(mu); }
  g.userData = { largura: W, profundidade: P, alto: H1 + H2 + 3 };
  return g;
}

// ---- a reta dos boxes de 2 níveis ----

/**
 * O prédio longo da reta dos boxes (foto 17): embaixo, garagens abertas com um toldo (aleta triangular + braço) na cor de
 * cada equipe, a muretinha cinza com a faixa amarela; em cima, a arquibancada em degraus azul/roxa com a cobertura de painéis
 * brancos. Corre ao longo de x, de frente para +z.
 * @param {object} o
 * @param {string[]} [o.equipes] uma cor por equipe (padrão: vermelho, laranja, azul, verde, rosa...) · @param {number} [o.baiasPorEquipe=2]
 * @param {number} [o.larguraBaia=34] · @param {number} [o.profundidade=60] · @param {number} [o.altoAndar=26]
 * @param {string[]} [o.cores=["#2f5fd0","#6a45c8"]] os assentos, alternando a cada 4 baias · @param {boolean} [o.tribuna=true] · @param {boolean} [o.cobertura=true]
 * @param {string} [o.corFaixa="#f2c400"] a faixa amarela da mureta · @param {string} [o.estrutura="#8a9096"] o aço · @param {number} [o.publico=0.2] gente nos degraus (0 a 1)
 * @returns {THREE.Group} com userData.comprimento/profundidade/alto
 */
export function retaDosBoxes({ equipes = ["#d62a1f", "#ff7a1a", "#1d4fd8", "#13804a", "#e873a8", "#1aa3c4"], baiasPorEquipe = 2, larguraBaia = 34, profundidade = 60, altoAndar = 26,
  cores = ["#2f5fd0", "#6a45c8"], tribuna = true, cobertura = true, corFaixa = "#f2c400", estrutura = "#8a9096", publico = 0.2 } = {}) {
  const m = new Montador(), S = solido(), nb = equipes.length * baiasPorEquipe, L = nb * larguraBaia, P = profundidade, H1 = altoAndar, pil = 3;
  const x0 = -L / 2;
  m.caixa(S, [0, -0.5, -P / 2], [L + 4, 1, P + 4], { cor: "#7c7e80" }); // chão
  m.caixa(S, [0, H1 / 2, -P + 1], [L, H1, 2], { cor: "#a6aaae" }); // fundo
  m.caixa(S, [0, H1 + 0.7, -P / 2], [L + 2, 1.6, P], { cor: tom(estrutura, 1.1) }); // laje do 2º nível
  for (let i = 0; i <= nb; i++) m.caixa(S, [x0 + i * larguraBaia, H1 / 2, -P / 2], [pil, H1, P], { cor: i % baiasPorEquipe === 0 ? "#6d7278" : estrutura });
  for (const [k, c] of equipes.entries()) for (let j = 0; j < baiasPorEquipe; j++) {
    const i = k * baiasPorEquipe + j, xc = x0 + (i + 0.5) * larguraBaia;
    m.plano(solido(), [xc, H1 / 2, -P + 2.1], [larguraBaia - pil, H1 - 1], { cor: tom(c, 0.8) }); // o fundo da baia na cor da equipe
    m.caixa(S, [xc, H1 - 3, -P / 2 + 2], [larguraBaia - pil, 5, P - 6], { cor: tom(c, 1.05) }); // o teto interno
    // toldo: a aleta triangular (alta junto à parede, descendo para fora) e o braço
    const aleta = new THREE.Shape(); aleta.moveTo(0, 0); aleta.lineTo(14, 0); aleta.lineTo(0, H1 - 4); aleta.closePath();
    const g = new THREE.ExtrudeGeometry(aleta, { depth: 1.4, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(0, 0, 0); // x do shape → +z; extrusão → x
    m.geo(S, g, { x: xc - larguraBaia / 2 + pil / 2 + 0.2, y: 0, z: 0.3, cor: c });
    m.caixa(S, [xc - larguraBaia / 2 + pil / 2 + 0.9, H1 - 6, 8], [1.4, 1.4, 16], { cor: c });
    m.caixa(S, [xc, H1 - 0.8, 0.2], [larguraBaia - pil, 1.4, 1.4], { cor: c });
  }
  // a frente: friso cinza do 1º nível e a muretinha da pit lane com a faixa amarela
  m.caixa(S, [0, H1 + 1.8, 0.8], [L + 2, 1.2, 1.6], { cor: "#5b6066" });
  const dist = 34;
  m.caixa(S, [0, 3.4, dist], [L, 6.8, 2], { cor: "#a1a5a9" }); m.caixa(S, [0, 0.6, dist + 1.1], [L, 1.2, 0.5], { cor: corFaixa }); m.caixa(S, [0, 7.1, dist], [L + 0.6, 0.7, 2.6], { cor: "#d8dadd" });
  for (let k = 0; k <= nb; k++) m.caixa(S, [x0 + k * larguraBaia, 3.4, dist + 1.2], [0.9, 6, 0.4], { cor: "#7d8186" });
  const g = m.montar("reta-dos-boxes");
  if (tribuna) {
    const t = tribunaCoberta({ comprimento: L, degraus: 6, altura: 4.6, fundo: 6.4, cores, secoes: Math.max(2, Math.round(nb / 4)), cobertura: cobertura ? "#f6f6f4" : null, estrutura, publico });
    t.position.set(0, H1 + 1.5, 0); g.add(t);
  }
  g.userData = { comprimento: L, profundidade: P, alto: H1 + 1.5 + 6 * 4.6 + 14, distanciaMureta: dist };
  return g;
}
