// Kit de pista — torre de controle (anéis empilhados, corpo e coroa em velas, como a Torre Al Sakhir) e pórtico de
// publicidade (duas colunas e uma viga com o letreiro dos dois lados). Cor chapada por vértice (montagem.js): poucas
// chamadas de desenho. Origem no chão, centro em x = z = 0; o pórtico atravessa x e o letreiro olha para ±z.
import * as THREE from "three";
import { Montador, solido, vidro, comTextura, tex, letreiro, tom } from "./montagem.js";
import { velaEm } from "./coberturas.js";

/**
 * Torre de controle genérica. De baixo para cima: o pódio, `aneis` andares (núcleo de vidro e laje larga com a grade de
 * varanda, cada anel de um tamanho), o corpo alto e a coroa em velas (ou cúpula, ou plana) com mastro e bandeira.
 * @param {object} o
 * @param {number} [o.raio=22] do núcleo · @param {number} [o.aneis=6] · @param {number} [o.alturaAnel=7] · @param {string} [o.corAneis="#16305f"] as lajes
 * @param {string} [o.corVidro="#27415f"] o núcleo · @param {string} [o.corGrade="#d7dce2"] a borda das lajes · @param {number} [o.corpo=3] andares do corpo alto acima dos anéis (0 = sem)
 * @param {string} [o.corCorpo="#d9a98e"] · @param {"velas"|"cupula"|"plana"} [o.cobertura="velas"] · @param {string} [o.corCobertura="#f2efe7"]
 * @param {string[]|null} [o.bandeira=["#ce1126","#ffffff"]] duas cores (de cima e de baixo; `null` tira o mastro) · @param {string} [o.corPodio="#cfc1a5"] · @param {number} [o.pico=1]
 * @returns {THREE.Group} com userData.alto/raio
 */
export function torreControle({ raio = 22, aneis = 6, alturaAnel = 7, corAneis = "#16305f", corVidro = "#27415f", corGrade = "#d7dce2", corpo = 3, corCorpo = "#d9a98e",
  cobertura = "velas", corCobertura = "#f2efe7", bandeira = ["#ce1126", "#ffffff"], corPodio = "#cfc1a5", pico = 1 } = {}) {
  const m = new Montador(), S = solido(), V = vidro(), seg = 24;
  m.cilindro(S, [0, 1.2, 0], [raio * 1.7, 2.4], { cor: corPodio, seg }); m.cilindro(S, [0, 6, 0], [raio * 1.1, 12], { cor: corPodio, seg });
  let y = 12;
  for (let i = 0; i < aneis; i++) {
    const rl = raio * (1.28 - Math.abs(i - (aneis - 1) / 2) * 0.045); // as lajes engordam no meio, como na torre
    m.cilindro(V, [0, y + alturaAnel / 2, 0], [raio, alturaAnel], { cor: corVidro, seg });
    m.cilindro(S, [0, y + alturaAnel - 0.6, 0], [rl, 1.2], { cor: corAneis, seg });
    m.cilindro(S, [0, y + alturaAnel + 0.25, 0], [rl + 0.15, 0.5], { cor: corGrade, seg, aberto: false });
    y += alturaAnel + 0.5;
  }
  for (let i = 0; i < corpo; i++) {
    m.cilindro(S, [0, y + alturaAnel / 2, 0], [raio * 0.72, alturaAnel], { cor: corCorpo, seg });
    m.cilindro(V, [0, y + alturaAnel / 2, 0], [raio * 0.735, alturaAnel * 0.42], { cor: "#141a21", seg });
    y += alturaAnel;
  }
  m.cilindro(S, [0, y + 1, 0], [raio * 0.9, 2], { cor: tom(corCobertura, 0.9), seg });
  y += 2;
  if (cobertura === "velas") {
    const n = 8, rr = raio * 0.55;
    for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; velaEm(m, Math.cos(a) * rr, y, Math.sin(a) * rr, { w: raio * 0.62, d: raio * 0.62, h: raio * 0.9 * pico, sag: 1.6, cor: corCobertura, mastro: raio * 0.6 * pico, ry: -a }); }
    velaEm(m, 0, y, 0, { w: raio * 0.9, d: raio * 0.9, h: raio * 1.5 * pico, sag: 2.2, cor: corCobertura, mastro: raio * 0.7, ry: Math.PI / 4 });
    y += raio * 1.5 * pico + raio * 0.7;
  } else if (cobertura === "cupula") {
    m.geo(S, new THREE.SphereGeometry(raio * 0.95, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), { y, cor: corCobertura }); y += raio * 0.95;
  } else { m.cilindro(S, [0, y + 0.5, 0], [raio * 1.12, 1], { cor: corCobertura, seg }); y += 1; }
  m.cilindro(S, [0, y + 7, 0], [0.4, 14], { cor: "#c9ced3", seg: 6 });
  const g = m.montar("torre-controle");
  if (bandeira) {
    const f = tex(64, 40, (x, w, h) => { x.fillStyle = bandeira[0]; x.fillRect(0, 0, w, h / 2); x.fillStyle = bandeira[1]; x.fillRect(0, h / 2, w, h / 2); });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), new THREE.MeshBasicMaterial({ map: f, side: THREE.DoubleSide })); p.position.set(5.2, y + 10.5, 0); g.add(p);
  }
  g.userData = { alto: y + 14, raio: raio * 1.7 };
  return g;
}

/**
 * Pórtico de publicidade: duas colunas e uma viga com o letreiro dos dois lados e, se quiser, a fileira de luzes de largada.
 * Atravessa o eixo x (colunas em ±vao/2); o letreiro principal olha para +z e o outro para -z.
 * @param {object} o
 * @param {number} [o.vao=260] distância entre as colunas · @param {number} [o.alto=62] altura livre até a viga · @param {number} [o.viga=14] altura da viga
 * @param {string} [o.cor="#1d9a4a"] a viga · @param {string} [o.corColuna="#1b1b1f"] · @param {string} [o.texto="GULF AIR"] · @param {string} [o.corTexto="#ffffff"]
 * @param {string|null} [o.corFaixa] fundo do letreiro (padrão = `cor`) · @param {boolean} [o.luzes=false] os cinco semáforos de largada · @param {number} [o.largura=8] das colunas
 * @param {THREE.Texture|null} [o.textura] letreiro pronto (substitui `texto`: o desenho é seu, nos dois lados da viga)
 * @returns {THREE.Group} com userData.vao/alto
 */
export function portico({ vao = 260, alto = 62, viga = 14, cor = "#1d9a4a", corColuna = "#1b1b1f", texto = "GULF AIR", corTexto = "#ffffff", corFaixa, luzes = false, largura = 8, textura = null } = {}) {
  const m = new Montador(), S = solido(), prof = 10, topoViga = alto + viga;
  for (const s of [-1, 1]) {
    m.caixa(S, [s * (vao / 2 + largura / 2), topoViga / 2, 0], [largura, topoViga, prof], { cor: corColuna });
    m.caixa(S, [s * (vao / 2 + largura / 2), 1.2, 0], [largura + 3, 2.4, prof + 3], { cor: tom(corColuna, 1.5) }); // o pé
  }
  m.caixa(S, [0, alto + viga / 2, 0], [vao + largura * 2 + 2, viga, prof], { cor });
  m.caixa(S, [0, alto - 0.6, 0], [vao + largura * 2 + 2, 1.2, prof + 1.6], { cor: corColuna }); // a quilha de baixo
  const banda = comTextura(textura || letreiro(texto, { fundo: corFaixa || cor, cor: corTexto, w: 1024, h: 96, vezes: Math.max(1, Math.round(vao / 130)), traco: false }));
  for (const f of [1, -1]) m.plano(banda, [0, alto + viga / 2, f * (prof / 2 + 0.05)], [vao, viga - 1.6], { ry: f > 0 ? 0 : Math.PI });
  if (luzes) for (let k = 0; k < 5; k++) { const x = (k - 2) * 9; m.caixa(S, [x, alto - 5, prof / 2 + 0.8], [6, 8, 1.6], { cor: "#15161a" }); for (const dy of [-1.8, 1.8]) m.cilindro(S, [x, alto - 5 + dy, prof / 2 + 1.7], [1.1, 0.5], { cor: "#e11d1d", rx: Math.PI / 2, seg: 8 }); }
  const g = m.montar("portico"); g.userData = { vao, alto: topoViga };
  return g;
}
