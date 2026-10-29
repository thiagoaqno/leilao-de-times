// Monza — as peças soltas que só o autódromo tem (kit 2: uma malha por material, cor chapada por vértice, canvas pequeno só para
// letreiros). Origem no chão, frente para +z, 1 unidade ≈ 10 cm. Quem usa é ../../monza.js.
//   complexoDosBoxes     o prédio dos boxes: térreo de garagens, andar do Paddock Club em vidro e o terraço coberto de velas brancas
//   podioMonza           a torre sobre o prédio e o pódio suspenso: a grande caixa de concreto que avança sobre a reta, presa por estais
//   torreCronometragem   as torres de 1955 da reta (as "torrette"): fuste de concreto e a lanterna do placar luminoso
//   torreDeLuz           o refletor alto das arquibancadas de curva · bandeiraItalia, bandeiraTifosi: as texturas das bandeiras da torcida
import * as THREE from "three";
import { Montador, solido, vidro, comTextura, tex, tom } from "../montagem.js";
import { velaEm } from "../coberturas.js";
import { marcaTex } from "../marcas.js";

let _italia = null, _tifosi = null;
/** A bandeira da Itália: verde, branco e vermelho em faixas verticais. */
export const bandeiraItalia = () => (_italia ||= tex(96, 64, (x, w, h) => { ["#009246", "#f4f4f2", "#ce2b37"].forEach((c, k) => { x.fillStyle = c; x.fillRect(Math.floor((k * w) / 3), 0, Math.ceil(w / 3) + 1, h); }); }));
/** A bandeira dos tifosi: vermelha com o escudo amarelo e um cavalinho preto (desenhado à mão, só uma silhueta). */
export const bandeiraTifosi = () => (_tifosi ||= tex(96, 64, (x, w, h) => {
  x.fillStyle = "#d4001a"; x.fillRect(0, 0, w, h);
  x.fillStyle = "#ffd100"; x.fillRect(w * 0.3, h * 0.12, w * 0.4, h * 0.76); x.fillStyle = "#009246"; x.fillRect(w * 0.3, h * 0.12, w * 0.4, h * 0.1);
  x.fillStyle = "#111"; x.beginPath(); x.moveTo(w * 0.38, h * 0.74); x.lineTo(w * 0.44, h * 0.46); x.lineTo(w * 0.52, h * 0.3); x.lineTo(w * 0.58, h * 0.34); x.lineTo(w * 0.56, h * 0.46); x.lineTo(w * 0.64, h * 0.62); x.lineTo(w * 0.58, h * 0.74); x.lineTo(w * 0.52, h * 0.56); x.lineTo(w * 0.46, h * 0.76); x.closePath(); x.fill();
}));

const placa = (nome, w = 1024, h = 64) => new THREE.MeshBasicMaterial({ map: marcaTex(nome, w, h), side: THREE.DoubleSide });
const bandeiraMat = (mapa) => new THREE.MeshBasicMaterial({ map: mapa, side: THREE.DoubleSide });

/**
 * O prédio dos boxes de Monza, de frente para +z: o térreo com as portas das garagens e a marquise, o andar do Paddock Club em vidro com a
 * faixa tricolore, o terraço com a fileira de velas brancas, os letreiros no parapeito e as duas caixas de escada atrás.
 * @param {object} o · @param {number} [o.comprimento=864] ao longo de x (um múltiplo de 144: o desenho das portas se repete a cada 4)
 * @param {number} [o.fundo=62] profundidade (para -z) · @param {string[]} [o.letreiros] marcas de marcas.js no parapeito
 * @returns {THREE.Group} com userData.largura/fundo/alto/topo (a altura do terraço)
 */
export function complexoDosBoxes({ comprimento: C = 864, fundo = 62, letreiros = ["gpit", "monza", "ferrari", "pirelli", "rolex", "heineken"] } = {}) {
  const m = new Montador(), S = solido(), V = vidro(), H1 = 38, H2 = 76, esq = -C / 2;
  m.caixa(S, [0, -2, -fundo / 2], [C + 12, 4, fundo + 12], { cor: "#a8a59c" }); // a laje de concreto do piso
  m.caixa(S, [0, H1 / 2, -fundo / 2], [C, H1, fundo], { cor: "#e9e7e1" }); // o térreo
  m.caixa(S, [0, (H1 + H2) / 2, -fundo / 2 - 4], [C - 8, H2 - H1, fundo - 8], { cor: "#d9d7d0" }); // o andar do Paddock Club, recuado
  m.caixa(S, [0, H1 + 1.2, 3], [C + 4, 2.4, 12], { cor: "#f4f4f2" }); // a marquise sobre as portas
  for (const [k, cor] of ["#009246", "#f4f4f2", "#ce2b37"].entries()) m.caixa(S, [0, H1 + 3.4 + k * 1.1, 8.6], [C + 4, 1.1, 0.6], { cor }); // a faixa tricolore na ponta da marquise
  // as portas das garagens: quatro portas de cores diferentes por desenho, repetidas ao longo do prédio
  const portas = comTextura(tex(256, 64, (x, w, h) => {
    x.fillStyle = "#e9e7e1"; x.fillRect(0, 0, w, h);
    ["#e8002d", "#1e41ff", "#ffd100", "#f4f4f2"].forEach((c, k) => {
      const x0 = k * 64 + 4; x.fillStyle = "#2a2e35"; x.fillRect(x0, 8, 56, h - 8); x.fillStyle = "#454b55"; for (let yy = 12; yy < h - 4; yy += 6) x.fillRect(x0, yy, 56, 2);
      x.fillStyle = c; x.fillRect(x0, 8, 56, 6);
    });
  }, { repeat: true }));
  m.plano(portas, [0, H1 / 2, 0.2], [C, H1], { uv: [C / 144, 1] });
  // a faixa de vidro do Paddock Club, com os montantes brancos
  const vidros = comTextura(tex(64, 64, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#3f6d8c"); g.addColorStop(1, "#1f3447"); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = "#e8eef2"; x.fillRect(0, 0, 3, h); x.fillRect(0, 0, w, 3); x.fillStyle = "#ffffff30"; x.fillRect(8, 8, 18, h - 16);
  }, { repeat: true }));
  m.plano(vidros, [0, (H1 + H2) / 2 + 0.5, -8 + 0.2], [C - 8, H2 - H1 - 8], { uv: [(C - 8) / 36, 1] });
  // a cobertura do terraço: a laje, o parapeito com os letreiros e a fileira de velas brancas
  m.caixa(S, [0, H2 + 1.2, -fundo / 2 - 2], [C - 2, 2.4, fundo - 4], { cor: "#cfcdc6" });
  m.caixa(S, [0, H2 + 9.4, -7], [C - 2, 14, 3], { cor: "#f1efe9" });
  letreiros.forEach((nome, k) => m.plano(placa(nome), [esq + ((k + 0.5) * C) / letreiros.length, H2 + 9.4, -5.4], [Math.min(150, C / letreiros.length - 14), 11]));
  const vao = C / 12;
  for (let i = 0; i < 12; i++) velaEm(m, esq + (i + 0.5) * vao, H2 + 13, -fundo / 2 - 4, { w: vao, d: 44, h: 12, sag: 2.2, cor: "#f4f2ec", mastro: 6 });
  for (let i = 0; i <= 12; i++) for (const z of [-fundo / 2 - 26, -fundo / 2 + 18]) m.cilindro(S, [esq + i * vao, H2 + 8, z], [0.8, 12], { cor: "#b9bec4", seg: 6 });
  for (const s of [-1, 1]) { // as caixas de escada e elevador, atrás
    m.caixa(S, [s * (C / 2 - 44), (H2 + 22) / 2, -fundo + 14], [30, H2 + 22, 28], { cor: "#d6d3cb" });
    m.caixa(S, [s * (C / 2 - 44), H2 + 6, -fundo + 14 + 14.2], [20, 40, 0.8], { cor: "#2b4258" });
  }
  const g = m.montar("monza-predio-boxes"); g.userData = { largura: C, fundo, alto: H2 + 16, topo: H2 + 2.4 };
  return g;
}

/**
 * O pódio suspenso de Monza (de 2002): uma torre de concreto branco sobre o prédio dos boxes e, saindo dela, a grande caixa que avança
 * sobre a reta, com a faixa de vidro, o letreiro "GRAN PREMIO D'ITALIA" e, na ponta, o palco do pódio (piso vermelho, os três degraus,
 * o painel de patrocínio atrás) pendurado à frente. Os estais de aço seguram a ponta. A origem é a frente do prédio dos boxes (z = 0): a
 * torre fica para -z, o pódio avança para +z e fica a `alto0` do chão (nada passa por baixo da altura de um carro).
 * @param {object} o · @param {number} [o.largura=340] ao longo de x · @param {number} [o.alcance=128] quanto avança sobre a pista
 * @param {number} [o.alto0=98] altura do fundo da caixa · @param {number} [o.fundo=62] profundidade da torre (a do prédio)
 * @returns {THREE.Group} com userData.largura/alcance/alto/ponta (a distância da frente do prédio até a ponta do palco)
 */
export function podioMonza({ largura: L = 340, alcance = 128, alto0 = 98, fundo = 62 } = {}) {
  const m = new Montador(), S = solido(), V = vidro(), topoPredio = 78, alto = 178, palco = 34, esp = 40;
  // a torre sobre o prédio, com a faixa de vidro de cada andar
  m.caixa(S, [0, (topoPredio + alto) / 2, -fundo / 2 - 3], [L, alto - topoPredio, fundo - 6], { cor: "#eceae4" });
  m.caixa(S, [0, alto + 1.5, -fundo / 2 - 3], [L + 4, 3, fundo], { cor: "#d4d1c9" }); // a laje do teto
  m.caixa(V, [0, alto - 20, -3.4], [L - 16, 18, 0.8], { cor: "#26394b" });
  // a caixa do pódio, saindo da torre: o concreto, o fundo mais escuro e a faixa de vidro em volta da ponta
  m.caixa(S, [0, alto0 + esp / 2, (alcance - 4) / 2], [L, esp, alcance + 4], { cor: "#f0eee8" });
  m.caixa(S, [0, alto0 + 1, (alcance - 4) / 2], [L - 2, 2, alcance + 3], { cor: "#a9a79f" }); // o fundo da caixa, na sombra
  m.caixa(V, [0, alto0 + 19, alcance + 0.3], [L - 14, 20, 0.8], { cor: "#2b4258" });
  for (const s of [-1, 1]) m.caixa(V, [s * (L / 2 + 0.3), alto0 + 19, alcance / 2], [0.8, 20, alcance - 16], { cor: "#2b4258" });
  for (let x = -L / 2 + 20; x <= L / 2 - 19; x += 40) m.caixa(S, [x, alto0 + 19, alcance + 0.9], [1.4, 20, 1.2], { cor: "#f6f6f4" }); // os montantes
  for (const [k, cor] of ["#009246", "#f4f4f2", "#ce2b37"].entries()) m.caixa(S, [0, alto0 + esp - 3.4 - k * 1.2, alcance + 1], [L, 1.2, 1.4], { cor }); // a faixa tricolore do beiral
  m.plano(placa("gpit"), [0, alto0 + esp - 10, alcance + 1.8], [Math.min(260, L * 0.76), 16]);
  // o terraço no topo da caixa, com o guarda-corpo de vidro
  m.caixa(V, [0, alto0 + esp + 4, alcance - 1], [L - 6, 8, 0.8], { cor: "#9fc0d4" });
  // os estais de aço: da laje da torre até a ponta da caixa
  for (const x of [-L / 2 + 14, -L / 4, L / 4, L / 2 - 14]) {
    const a = [-24, alto + 3], b = [alcance - 10, alto0 + esp + 8], dz = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dz, dy);
    m.caixa(S, [x, (a[1] + b[1]) / 2 + 1.5, (a[0] + b[0]) / 2], [2.6, 2.6, len], { cor: "#98a0a8", rx: Math.atan2(-dy, dz) });
    m.caixa(S, [x, alto + 8, a[0]], [5, 14, 5], { cor: "#7f878f" }); // o mastro de onde o estai sai
  }
  // o palco do pódio: o piso vermelho pendurado à frente da caixa, o guarda-corpo de vidro, os três degraus e o painel atrás
  const zp = alcance + palco / 2;
  m.caixa(S, [0, alto0 - 1.6, zp - 1], [170, 3.2, palco + 2], { cor: "#a31220" });
  m.caixa(S, [0, alto0 - 3.4, zp - 1], [172, 0.8, palco + 3], { cor: "#f1f1ee" });
  m.caixa(V, [0, alto0 + 4, alcance + palco], [170, 11, 0.6], { cor: "#aed0e2" });
  for (const s of [-1, 1]) m.caixa(V, [s * 85, alto0 + 4, zp - 1], [0.6, 11, palco], { cor: "#aed0e2" });
  for (const [x, h, cor] of [[-24, 5, "#e9e9e6"], [0, 8, "#d4aa2f"], [24, 3.4, "#e9e9e6"]]) { m.caixa(S, [x, alto0 + h / 2, zp + 6], [22, h, 16], { cor }); m.caixa(S, [x, alto0 + h + 0.2, zp + 6], [22.4, 0.4, 16.4], { cor: "#ffffff" }); }
  for (const [x, cor] of [[-36, "#e63946"], [-12, "#ffd100"], [12, "#3a86ff"], [36, "#ffffff"]]) m.cilindro(S, [x, alto0 + 3.6, zp - 8], [1.4, 3.6], { cor, seg: 8 }); // as taças
  m.plano(placa("pirelli", 512, 64), [0, alto0 + 14, alcance + 0.9], [132, 12]);
  m.cilindro(S, [-88, alto0 + 8, alcance + 4], [0.5, 22], { cor: "#98a0a8", seg: 6 }); // os pendurais do palco
  // os mastros com as bandeiras da Itália, no teto da torre
  for (const x of [-L / 2 + 22, 0, L / 2 - 22]) {
    m.cilindro(S, [x, alto + 3 + 26, -fundo / 2 - 3], [0.7, 52], { cor: "#d9d9d9", seg: 6 });
    m.plano(bandeiraMat(bandeiraItalia()), [x + 12, alto + 3 + 44, -fundo / 2 - 3], [24, 15]);
  }
  const g = m.montar("monza-podio"); g.userData = { largura: L, alcance, alto, ponta: alcance + palco };
  return g;
}

/**
 * A torre de cronometragem de 1955: o fuste de concreto afunilado em três lances, com as quinas mais claras e as lajes, e no alto a lanterna
 * escura com o placar luminoso (a classificação, com a cor de cada equipe) nos dois lados, o teto vermelho, a antena e a bandeira.
 * @param {object} o · @param {number} [o.alto=340]
 * @returns {THREE.Group} com userData.alto/raio
 */
export function torreCronometragem({ alto = 340 } = {}) {
  const m = new Montador(), S = solido(), yp = alto - 64;
  m.caixa(S, [0, 3, 0], [58, 6, 58], { cor: "#8f8c84" });
  for (const [y0, y1, l, cor] of [[6, 150, 34, "#bdb9ae"], [150, 260, 29, "#c6c2b8"], [260, yp, 24, "#cfcbc1"]]) {
    m.caixa(S, [0, (y0 + y1) / 2, 0], [l, y1 - y0, l], { cor });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) m.caixa(S, [sx * l / 2, (y0 + y1) / 2, sz * l / 2], [3.4, y1 - y0, 3.4], { cor: tom(cor, 0.8) });
  }
  for (const y of [150, 260]) m.caixa(S, [0, y, 0], [y === 150 ? 44 : 38, 3, y === 150 ? 44 : 38], { cor: "#e4e1d8" });
  m.caixa(S, [0, yp + 30, 0], [70, 64, 26], { cor: "#2b2d31" });
  const cores = ["#ff8700", "#e8002d", "#27f4d2", "#3671c6", "#229971", "#6692ff", "#ff87bc", "#37bedd", "#d7172f", "#c6cbd0"];
  const quadro = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: tex(128, 256, (x, w, h) => {
    x.fillStyle = "#07090c"; x.fillRect(0, 0, w, h); x.fillStyle = "#c8102e"; x.fillRect(0, 0, w, 24); x.fillStyle = "#fff"; x.font = "900 18px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("CLASSIFICA", w / 2, 13);
    for (let k = 0; k < 10; k++) {
      const y0 = 28 + k * 22.5; x.fillStyle = cores[k]; x.fillRect(6, y0, 6, 18); x.fillStyle = "#ffd100"; x.font = "900 15px monospace"; x.textAlign = "left"; x.fillText(String(k + 1).padStart(2, " "), 16, y0 + 10);
      x.fillStyle = "#e8eef2"; x.fillText(k ? `+${(0.3 + k * 0.7).toFixed(3)}` : "1:21.046", 44, y0 + 10);
    }
  }) });
  for (const s of [-1, 1]) m.plano(quadro, [0, yp + 30, s * 13.3], [62, 58], { ry: s > 0 ? 0 : Math.PI });
  m.caixa(S, [0, yp + 65, 0], [76, 5, 32], { cor: "#c8102e" });
  m.cilindro(S, [0, yp + 92, 0], [0.8, 52], { cor: "#c9ced3", seg: 6 });
  m.plano(bandeiraMat(bandeiraItalia()), [9, yp + 108, 0], [18, 11]);
  const g = m.montar("monza-torre-cronometragem"); g.userData = { alto: yp + 118, raio: 29 };
  return g;
}

/** O poste de refletores das curvas (a torre alta com o painel de lâmpadas virado para as arquibancadas). */
export function torreDeLuz({ alto = 190 } = {}) {
  const m = new Montador(), S = solido();
  m.cilindro(S, [0, alto / 2, 0], [1.6, alto], { cor: "#a9afb5", seg: 6 });
  m.caixa(S, [0, 2, 0], [8, 4, 8], { cor: "#8f8c84" });
  m.caixa(S, [0, alto + 4, 0], [30, 14, 3], { cor: "#2b2d31" });
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) m.caixa(S, [-12.5 + i * 5, alto + 1 + j * 6, 1.8], [3.6, 4.4, 0.8], { cor: "#fff4cf" });
  const g = m.montar("monza-torre-de-luz"); g.userData = { alto: alto + 12 };
  return g;
}
