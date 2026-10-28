// Jeddah — o prédio dos boxes e do paddock (Pit & Team Building). Na vida real é uma "paisagem composta de prédios
// escalonados" de quatro andares, projetada pelo escritório do Hermann Tilke: caixas brancas que recuam de andar em andar,
// vidro em fita com brise-soleil (as aletas verticais), lajes com a borda iluminada em verde e, no alto, o terraço do Paddock
// Club sob velas brancas e a torre de vidro do Race Control. A frente olha para a pista (+z), o fundo para a lagoa.
//
// predioBoxesJeddah(o) → THREE.Group (origem no chão, no meio da frente; x ao longo da pista, y para cima, z para a pista)
//   o: comprimento (540), profundidade (62), verde ("#0a7f45"), branco, texto (o letreiro do terraço)
//   userData: { comprimento, profundidade, alto, mastros: [[x, y, z]] }   (onde ficam as bandeiras)
import * as THREE from "three";
import { Montador, solido, comTextura, tex, letreiro } from "../montagem.js";
import { velaEm } from "../coberturas.js";

// o vidro em fita: azul-petróleo com o reflexo do céu, montantes brancos e a linha do piso
function texturaVidro() {
  return tex(64, 64, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#5f8ea3"); g.addColorStop(0.55, "#2c5368"); g.addColorStop(1, "#1d3a4b"); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = "#ffffff26"; x.beginPath(); x.moveTo(0, h); x.lineTo(w * 0.55, 0); x.lineTo(w * 0.8, 0); x.lineTo(w * 0.25, h); x.fill(); // o reflexo na diagonal
    x.fillStyle = "#e9ecee"; x.fillRect(0, 0, 3, h); x.fillRect(0, h * 0.5, w, 2); // montante e travessa
  }, { repeat: true });
}
// a bandeira da Arábia Saudita: verde, a profissão de fé em branco (um traço ondulado) e a espada
export function texturaBandeiraSaudita() {
  return tex(192, 128, (x, w, h) => {
    x.fillStyle = "#006c35"; x.fillRect(0, 0, w, h);
    x.strokeStyle = "#ffffff"; x.lineWidth = 6; x.lineCap = "round"; x.lineJoin = "round";
    x.beginPath(); x.moveTo(30, h * 0.40); for (let k = 0; k < 14; k++) x.quadraticCurveTo(30 + k * 9 + 3, h * (k % 2 ? 0.26 : 0.52), 30 + (k + 1) * 9, h * 0.40); x.stroke();
    x.lineWidth = 3; x.beginPath(); x.moveTo(36, h * 0.52); x.quadraticCurveTo(w / 2, h * 0.58, w - 36, h * 0.52); x.stroke();
    x.lineWidth = 7; x.beginPath(); x.moveTo(34, h * 0.74); x.lineTo(w - 34, h * 0.74); x.stroke(); // a lâmina da espada
    x.fillStyle = "#ffffff"; x.fillRect(w - 52, h * 0.70, 4, 18); x.fillRect(w - 62, h * 0.72, 14, 5); x.beginPath(); x.moveTo(30, h * 0.74); x.lineTo(40, h * 0.69); x.lineTo(40, h * 0.79); x.fill(); // o punho e a ponta
  }, {});
}

export function predioBoxesJeddah({ comprimento = 540, profundidade = 62, verde = "#0a7f45", branco = "#f3f1ea", cinza = "#d9d6cd", texto = "SAUDI ARABIAN GRAND PRIX" } = {}) {
  const m = new Montador(), S = solido(), L2 = comprimento / 2, P = profundidade;
  const vidro = comTextura(texturaVidro(), { roughness: 0.25, metalness: 0.35 });
  const led = new THREE.MeshBasicMaterial({ color: 0x38e8a0 }), ledBranco = new THREE.MeshBasicMaterial({ color: 0xfff2cf });
  // os andares: cada um recua e encurta; a frente do 1º andar avança em balanço
  const andares = [
    { x0: -L2, x1: L2, frente: 0, y0: -6, h: 15 },          // o pódio
    { x0: -L2 + 8, x1: L2 - 8, frente: 10, y0: 9, h: 12 },  // o balanço sobre os boxes
    { x0: -L2 + 40, x1: L2 - 70, frente: 0, y0: 21, h: 12 },
    { x0: -L2 + 100, x1: L2 - 130, frente: -12, y0: 33, h: 12 },
    { x0: -60, x1: 70, frente: -26, y0: 45, h: 10 },        // o Race Control
  ];
  const mastros = [];
  andares.forEach((a, k) => {
    const larg = a.x1 - a.x0, cx = (a.x0 + a.x1) / 2, fundo = -P + (k > 2 ? 8 : 0), prof = a.frente - fundo, topo = a.y0 + a.h;
    m.caixa(S, [cx, a.y0 + a.h / 2, (a.frente + fundo) / 2], [larg, a.h, prof], { cor: k === 4 ? "#2d3b45" : branco }); // o volume
    // a fita de vidro com a faixa branca em cima e embaixo
    const hv = a.h - 4.5, yv = a.y0 + 2.2 + hv / 2;
    m.plano(vidro, [cx, yv, a.frente + 0.25], [larg - 4, hv], { uv: [(larg - 4) / 14, hv / 9] });
    for (const lado of [-1, 1]) m.plano(vidro, [lado > 0 ? a.x1 + 0.25 : a.x0 - 0.25, yv, (a.frente + fundo) / 2], [prof - 2, hv], { ry: lado * Math.PI / 2, uv: [prof / 14, hv / 9] }); // as pontas
    m.caixa(S, [cx, topo - 1, (a.frente + fundo) / 2 + 1.2], [larg + 1.4, 2.2, prof + 3.4], { cor: cinza });      // a laje de cima, com a beirada saindo
    m.caixa(S, [cx, a.y0 + 1, a.frente + 1.6], [larg + 0.6, 2, 3.4], { cor: branco });                              // e a de baixo
    m.caixa(led, [cx, topo - 0.4, a.frente + 3.4], [larg + 1.2, 0.5, 0.35]);                                         // o filete de LED verde na beirada
    // as aletas verticais (brise-soleil): saem 5 para a frente, a cada 7
    for (let x = a.x0 + 5; x <= a.x1 - 4; x += 7) m.caixa(S, [x, a.y0 + 2.2 + hv / 2, a.frente + 2.8], [0.9, hv, 5.4], { cor: branco });
    // o terraço do andar de baixo, com parapeito de vidro (o que sobra de laje à frente do andar de cima)
    if (k > 0) {
      const ant = andares[k - 1], recuo = ant.frente - a.frente;
      if (recuo > 1) m.caixa(vidro, [cx, ant.y0 + ant.h + 1.3, ant.frente - 0.6], [larg, 2.2, 0.3]);
    }
    // casas de máquinas e antenas no alto de cada andar
    if (k === 3) for (let x = a.x0 + 14; x < a.x1 - 10; x += 34) m.caixa(S, [x, topo + 2.5, fundo + 8], [10, 5, 7], { cor: "#b8b5ac" });
  });
  // o letreiro do terraço (T2): uma fileira de painéis verdes de "SAUDI ARABIAN GRAND PRIX" sobre a laje, olhando para a pista
  const ter = andares[2], tx0 = ter.x0 + 14, tx1 = andares[3].x1 + 30, nPain = 3, pLarg = (tx1 - tx0) / nPain;
  const letreiros = [];
  for (let k = 0; k < nPain; k++) {
    const mat = new THREE.MeshBasicMaterial({ map: letreiro(texto, { fundo: verde, cor: "#ffffff", w: 1024, h: 128, traco: false }) });
    const cx = tx0 + pLarg * (k + 0.5);
    m.plano(mat, [cx, ter.y0 + ter.h + 5.2, ter.frente - 3.6], [pLarg - 3, 7.5]); // sem sombra no letreiro
    for (const s of [-1, 1]) m.caixa(S, [cx + s * (pLarg / 2 - 4), ter.y0 + ter.h + 2.4, ter.frente - 3.8], [0.9, 4.8, 0.9], { cor: "#5b6168" });
    letreiros.push(mat);
  }
  // o terraço do pódio com guarda-sóis brancos e verdes (cones em cima de uma haste)
  const guarda = new THREE.ConeGeometry(3.4, 1.6, 8);
  for (let x = -L2 + 30; x < L2 - 30; x += 18) {
    m.cilindro(S, [x, 21 + 1.4, 5], [0.18, 2.8], { cor: "#80858b", seg: 5 });
    m.geo(S, guarda, { x, y: 21 + 3.4, z: 5, cor: ((x / 18) | 0) % 3 ? "#f4f1e8" : verde });
  }
  // as velas brancas do Paddock Club (kit 2) sobre o terraço do 3º andar
  const t3 = andares[3];
  for (let x = t3.x0 + 30; x < t3.x1 - 20; x += 46) velaEm(m, x, t3.y0 + t3.h, t3.frente - 16, { w: 40, d: 36, h: 10, sag: 2, cor: "#f6f3ea", mastro: 8, ry: 0 });
  // o Race Control: a caixa de vidro escuro no alto, o telhado, o mastro com a bandeira
  const rc = andares[4];
  m.caixa(S, [(rc.x0 + rc.x1) / 2, rc.y0 + rc.h + 1, (rc.frente - P + 8) / 2 + 3], [rc.x1 - rc.x0 + 6, 2.4, rc.frente - (-P + 8) + 7], { cor: branco });
  for (const [dx, h] of [[-52, 56], [0, 70], [56, 56]]) { m.cilindro(S, [(rc.x0 + rc.x1) / 2 + dx, rc.y0 + rc.h + 2.2 + h / 2, rc.frente - 14], [0.5, h], { cor: "#d9dde0", seg: 6 }); mastros.push([(rc.x0 + rc.x1) / 2 + dx, rc.y0 + rc.h + 2.2 + h, rc.frente - 14]); }
  // as torres de câmera e o telão na ponta do prédio
  const g = m.montar("predio-boxes-jeddah");
  g.userData = { comprimento, profundidade, alto: 70, mastros, letreiros, recuo3: t3.frente };
  g.traverse((o) => { if (o.isMesh && (o.material === vidro || o.material === led)) o.castShadow = false; });
  void ledBranco;
  return g;
}
