// Zandvoort (Circuit Zandvoort, GP da Holanda, nas dunas do mar do Norte): o que só o circuito tem, em cima do kit 2. O resto (zebras vermelhas e
// brancas, escape de areia, arquibancadas de curva, painéis, passarelas e som) é do kit, na configuração de gps/zandvoort.js; as peças exclusivas
// estão em kit/zandvoort/. Aqui, na ordem em que aparecem pela volta (frações da volta, a partir da linha de chegada, que fica NO MEIO da reta,
// em frente aos boxes: o corredor dos boxes é o de `boxes` em pistas.js, com a parada no 0):
// 1. a reta dos boxes (0,955-1,045): o prédio das garagens de dois andares com a torre de controle na linha de chegada, do lado esquerdo (o do mar),
//    com o Paddock Club, as tendas brancas e a roda-gigante do fan zone atrás; do outro lado, a tribuna principal em três módulos de torcida laranja;
// 2. a Tarzanbocht (0,09-0,125, a curva 1, o grampo à direita no fim da reta): a arquibancada grande por fora, cheia de laranja, com o telão e os
//    sinalizadores, e a tribuna da frenagem na reta;
// 3. a Hugenholtz (0,185-0,24, a curva 3, o grampo inclinado à esquerda): a rampa de concreto, o paredão e a cerca alta por fora, o terraço com as
//    arquibancadas em volta e a encosta laranja do lado de dentro;
// 4. Hunserug (0,42), Scheivlak (0,51) e Hans Ernst (0,605) com as encostas de torcida, o muro holandês e as placas com o nome de cada curva;
// 5. a Arie Luyendyk (0,835-0,935, a última curva, inclinada à direita antes da reta): a rampa, o paredão, o terraço e as arquibancadas em volta;
// 6. as dunas com capim-de-praia, moitas e pinheiros baixos, o mar do Norte e a praia a oeste, a vila de Zandvoort e os prédios da orla ao longe,
//    a faixa do circuito no pórtico da largada e a fumaça laranja dos sinalizadores (kit/zandvoort/dunas.js, vila.js e torcida.js).
// O pórtico da largada é o de pista.js (as cinco luzes): atravessa a pista (pela normal) na linha de chegada, e a faixa fica DE FRENTE para os
// carros. Tudo é cenário: nada fica dentro da pista (livre/ocupado) e a física é a de sempre.
import * as THREE from "three";
import { marcaTex } from "./kit/marcas.js";
import { livre, ocupado, recortar } from "./kit/comum.js";
import { tribunaCoberta, tendaPaddock } from "./kit/coberturas.js";
import { registrarMarcasZandvoort } from "./kit/zandvoort/marcas.js";
import { indice, pousar, cabe, reservar, colocar, somDaTorcida, eixoDaCosta } from "./kit/zandvoort/lugar.js";
import { predioDosBoxes, telao, pavilhao, rodaGigante, CORES_TRIBUNA } from "./kit/zandvoort/predios.js";
import { curvaInclinada, muroHolandes, placasDasCurvas } from "./kit/zandvoort/curvas.js";
import { torcidaLaranja, bandeirasLaranja, fumacaLaranja, CAMISAS_NL } from "./kit/zandvoort/torcida.js";
import { terrenoDeDunas, marEPraia, capimDePraia, moitas, pinheirosBravos } from "./kit/zandvoort/dunas.js";
import { planejarVila, construirVila } from "./kit/zandvoort/vila.js";

registrarMarcasZandvoort();

const novaTribuna = (comprimento, degraus, semente, o = {}) => tribunaCoberta({ comprimento, degraus, altura: 5.4, fundo: 8, secoes: Math.max(2, Math.round(comprimento / 45)), publico: 0.55, semente, camisas: CAMISAS_NL, cores: CORES_TRIBUNA, estrutura: "#8a9096", cobertura: null, folga: 18, vao: 56, ...o });

// ---------------------------------------------------------------------------------------------------------------------
// 1. A reta dos boxes
// ---------------------------------------------------------------------------------------------------------------------
function retaDosBoxes(tr, { add }) {
  const { n, W } = tr, lado = tr.t.boxes?.lado ?? -1, Z = W / 2 + 84, F = 44;
  // o prédio acompanha a reta: onde outro trecho da pista chegar perto, ele termina; a linha de chegada (índice 0) fica no meio dele
  const rec = recortar(tr, Math.floor(0.955 * n), Math.floor(1.045 * n), [lado * (Z - 4), lado * (Z + F + 4)], 4);
  if (rec) {
    const comp = Math.min(640, (rec.i1 - rec.i0) * 6 - 24), meio = Math.floor((rec.i0 + rec.i1) / 2);
    const linha = (n - meio) * 6 * (lado > 0 ? -1 : 1); // onde a linha de chegada cai no prédio (o +x local anda a favor da volta do lado -1)
    const predio = predioDosBoxes({ comprimento: comp, fundo: F, torre: Math.max(-comp / 2 + 90, Math.min(comp / 2 - 90, linha)) });
    const q = pousar(tr, predio, (meio % n) / n, lado, Z); add(predio);
    reservar(tr, q.x, q.z, q.ry, comp, F + 30, 40);
    tr.predioZandvoort = { f: (meio % n) / n, comprimento: comp, lado, torreX: linha };
  }
  // a tribuna principal, do outro lado: módulos de frente para a pista, laranja de ponta a ponta. A Hugenholtz chega a ~200 da reta (a pista do
  // jogo é compacta), então a tribuna é mais funda longe da linha e vai encolhendo (menos degraus) onde a curva se aproxima
  const oposto = -lado, mods = [];
  [[-600, 3], [-400, 8], [-210, 12], [-30, 15]].forEach(([ao, sem]) => {
    for (const degraus of [12, 10, 8, 6, 5, 4, 3]) {
      const t = novaTribuna(190, degraus, sem, { cobertura: degraus >= 6 ? "#e9ecee" : null, alcance: 0.7, publico: 0.6 });
      const o = colocar(tr, add, t, { f: 0, lado: oposto, lats: [W / 2 + 46, W / 2 + 36], ao, w: 194, d: degraus * 8 + 8, folga: 14, reserva: null });
      if (o) { mods.push(o); break; }
      (tr.faltouZandvoort ||= []).pop();
    }
  });
  for (const o of mods) reservar(tr, o.x, o.z, o.ry, o.w, o.d, 22);
  if (mods.length) somDaTorcida(tr, 0.955, 1.01);
  return { oposto, Z, F };
}

// o que fica atrás dos boxes, do lado do mar: o Paddock Club, as tendas brancas do fan zone e a roda-gigante
function paddock(tr, { add }, lado, Z, F) {
  const { W } = tr, lat0 = Z + F + 50, quadros = [];
  const clube = colocar(tr, add, pavilhao({ largura: 100, fundo: 40 }), { f: 0.0, lado, lats: [lat0, lat0 + 40], ao: -160, w: 106, d: 46, folga: 30, base: false, reserva: 20 });
  [["ZANDVOORT", "#ff6a13"], ["HOLLAND", "#21468b"], ["ORANJE", "#ae1c28"]].forEach(([texto, corFaixa], k) => {
    const t = tendaPaddock({ modulos: 3, filas: 2, texto, corFaixa, corMesas: "#ff6a13" }); t.scale.setScalar(1.5);
    const q = colocar(tr, add, t, { f: 0.0, lado, lats: [lat0 + 8, lat0 + 50], ao: 20 + k * 190, w: 156, d: 102, folga: 30, base: false, reserva: 20 });
    if (q) quadros.push(q);
  });
  const roda = rodaGigante({ raio: 120 });
  const r = colocar(tr, add, roda, { f: 0.04, lado, lats: [lat0 + 200, lat0 + 260], ao: 0, w: 120, d: 60, folga: 40, base: false, reserva: 30 });
  tr.paddockZandvoort = { clube: !!clube, tendas: quadros.length, roda: !!r };
  void W;
}

// ---------------------------------------------------------------------------------------------------------------------
// 2. A Tarzanbocht e a frenagem
// ---------------------------------------------------------------------------------------------------------------------
function tarzan(tr, { add }) {
  const { W } = tr;
  // o telão por fora do grampo, virado para a reta, e a tribuna da frenagem do lado de fora, no fim da reta (a arquibancada grande da curva é do kit)
  const tela = colocar(tr, add, telao({ largura: 70, altura: 34, alto: 86, texto: "TARZAN" }), { f: 0.092, lado: -1, lats: [W / 2 + 230, W / 2 + 290, W / 2 + 350], w: 80, d: 14, folga: 60, ambos: true, reserva: 30 });
  let k = 0;
  for (const [f, sem] of [[0.062, 21], [0.08, 22]]) {
    const t = novaTribuna(210, 11, sem, { alcance: 0.5 });
    if (colocar(tr, add, t, { f, lado: -1, lats: [W / 2 + 46, W / 2 + 70], w: 214, d: 11 * 8 + 8, folga: 30, reserva: 22 })) k++;
  }
  tr.tarzanZandvoort = { telao: !!tela, tribunas: k };
  somDaTorcida(tr, 0.06, 0.135);
}

// ---------------------------------------------------------------------------------------------------------------------
// 3 e 5. As curvas inclinadas, com as arquibancadas em cima do terraço
// ---------------------------------------------------------------------------------------------------------------------
function tribunasNoTerraco(tr, add, info, { comp = 130, degraus = 9, sem = 40, de = 0, ate = 1 } = {}) {
  const { pts, n } = tr, { i0, i1, lado, l1, alto } = info, passoI = Math.round((comp + 10) / 6), lat = l1 + 26, falta = [];
  let k = 0;
  for (let i = i0 + Math.round((i1 - i0) * de) + Math.round(comp / 12); i <= i0 + Math.round((i1 - i0) * ate) - Math.round(comp / 12); i += passoI, k++) {
    const p = pts[i % n], x = p.x + p.nx * lado * lat, z = p.y + p.ny * lado * lat, ry = Math.atan2(-lado * p.nx, -lado * p.ny);
    if (!cabe(tr, x, z, ry, comp + 4, degraus * 8, W2(tr, l1) )) { falta.push(i); continue; }
    const t = novaTribuna(comp, degraus, sem + k, { alcance: 0.4, publico: 0.6 });
    t.position.set(x, p.h + alto - 0.4, z); t.rotation.y = ry; add(t);
    reservar(tr, x, z, ry, comp + 4, degraus * 8, 10);
  }
  (tr.tribunasTerraco ||= []).push({ nome: info.nome, modulos: k - falta.length, falta: falta.length });
}
const W2 = (tr, l1) => l1 + 10 - tr.W / 2; // a folga que a `cabe` conta a partir da meia largura: a peça fica depois do paredão

function curvas(tr, { add }) {
  // a Hugenholtz é um grampo apertado, com a reta dos boxes e a Hunserug a ~200 dela: a rampa e o paredão são mais baixos e não há terraço; as
  // tribunas ficam logo atrás do paredão, onde cabem, de poucos degraus (a galera vê por cima do muro)
  const hug = curvaInclinada(tr, add, { de: 0.18, ate: 0.245, lado: "fora", nome: "hugenholtz", l0: 94, l1: 114, subida: 7, parede: 6, terraco: 0, berma: 0 });
  if (hug) {
    let k = 0;
    for (let f = 0.186; f <= 0.24; f += 0.0085) for (const degraus of [6, 5, 4, 3]) {
      const t = novaTribuna(100, degraus, 60 + k, { alcance: 0.4, publico: 0.6 });
      if (colocar(tr, add, t, { f, lado: hug.lado, lats: [tr.W / 2 + 74, tr.W / 2 + 66], w: 104, d: degraus * 8 + 8, folga: 10, base: true, reserva: 14 })) { k++; break; }
      (tr.faltouZandvoort ||= []).pop();
    }
    tr.hugenholtzZandvoort = { tribunas: k }; somDaTorcida(tr, 0.19, 0.236);
  }
  const arie = curvaInclinada(tr, add, { de: 0.838, ate: 0.934, lado: "fora", nome: "arie-luyendyk", l0: 94, l1: 128 });
  if (arie) { tribunasNoTerraco(tr, add, arie, { sem: 80, de: 0.04, ate: 0.96 }); somDaTorcida(tr, 0.845, 0.93); }
  tr.inclinadasZandvoort = { hugenholtz: !!hug, arie: !!arie };
}

// ---------------------------------------------------------------------------------------------------------------------
// 4. As encostas, a fumaça e as bandeiras
// ---------------------------------------------------------------------------------------------------------------------
function encostas(tr, ctx) {
  const { add } = ctx, { W } = tr, z = (f0, f1, lado, lat0, lat1, dens, bandeiras = 0.14) => ({ f0, f1, lado, lat0: W / 2 + lat0, lat1: W / 2 + lat1, dens, bandeiras });
  const zonas = [
    z(0.075, 0.135, 1, 44, 150, 6, 0.2), z(0.098, 0.13, -1, 44, 110, 3), // o Tarzan: a encosta de dentro e o que sobra por fora
    z(0.186, 0.24, -1, 44, 130, 6, 0.2), z(0.28, 0.34, -1, 44, 100, 1.5), // dentro da Hugenholtz (o miolo é a encosta mais lotada)
    z(0.396, 0.446, 1, 44, 140, 5, 0.16), z(0.42, 0.44, -1, 44, 100, 3), // o Hunserug
    z(0.484, 0.56, 1, 44, 150, 6, 0.18), z(0.592, 0.628, -1, 44, 120, 4), // o Scheivlak e a Hans Ernst
    z(0.838, 0.934, 1, 44, 160, 4, 0.14), // dentro da Arie Luyendyk
    z(0.93, 0.98, 1, 44, 110, 3), z(0.03, 0.074, 1, 44, 100, 3), // a reta dos boxes, atrás da cerca
  ];
  torcidaLaranja(tr, add, zonas, { semente: 7771 });
  tr.zonasZandvoort = zonas;
  for (const q of zonas) somDaTorcida(tr, q.f0, q.f1);
  // os sinalizadores: onde a galera mais se concentra (o foco fica por cima da cabeça de quem está na encosta)
  const focos = [];
  [[0.098, 1, 90, 1.2], [0.115, 1, 120, 1.4], [0.205, -1, 100, 1.2], [0.225, -1, 110, 1], [0.43, 1, 100, 1], [0.52, 1, 110, 1.1], [0.87, 1, 120, 1.2], [0.9, 1, 110, 1], [0.06, 1, 80, 1.1], [0.5, 1, 120, 0.9], [0.95, 1, 90, 1], [0.12, 1, 140, 1.3]].forEach(([f, lado, lat, tam]) => {
    const p = tr.pts[indice(tr, f)], x = p.x + p.nx * lado * (W / 2 + lat), zz = p.y + p.ny * lado * (W / 2 + lat);
    if (tr.distAt(x, zz) < W / 2 + lat - 8 || ocupado(tr, x, zz)) return;
    focos.push({ x, y: tr.chao(x, zz) + 2, z: zz, tam });
  });
  tr.focosZandvoort = focos;
}

// ---------------------------------------------------------------------------------------------------------------------
// O antes (cenario) e o depois (depois) do GP
// ---------------------------------------------------------------------------------------------------------------------
export function cenarioZandvoort(tr, ctx) {
  tr.reservado ||= [];
  tr.camisasGP = CAMISAS_NL; // a torcida solta de vida.js também veste laranja
  const { oposto, Z, F } = retaDosBoxes(tr, ctx);
  paddock(tr, ctx, -oposto, Z, F);
  tarzan(tr, ctx);
  curvas(tr, ctx);
  muroHolandes(tr, ctx.add, [[0.93, 1.09, 1], [0.935, 0.972, -1], [0.03, 0.088, -1], [0.14, 0.18, 0], [0.26, 0.38, 0], [0.64, 0.72, 0], [0.78, 0.83, 0]]);
  encostas(tr, ctx);
  placasDasCurvas(tr, ctx.add);
}

export function depoisZandvoort(tr, ctx) {
  const { add } = ctx;
  // o mar e a praia primeiro (`tr.ocupado` passa a dizer "é mar"), depois a vila (reserva o chão), as dunas por cima de tudo e a vegetação nelas
  marEPraia(tr, ctx);
  const plano = planejarVila(tr);
  const rel = terrenoDeDunas(tr, add, {});
  construirVila(tr, add, rel, plano);
  capimDePraia(tr, add, rel, {});
  moitas(tr, add, rel, {});
  pinheirosBravos(tr, add, rel, {});
  // a faixa do circuito no pórtico da largada (o de pista.js): uma de cada lado da viga, a da frente com a normal contra o sentido da volta
  const p = tr.pts[0], L = tr.W / 2 + 14, rot = -Math.atan2(p.ny, p.nx);
  for (const s of [1, -1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(2 * L - 6, 8.4), new THREE.MeshBasicMaterial({ map: marcaTex("nlzandvoort", 1024, 64), side: THREE.FrontSide }));
    f.position.set(p.x, p.h + 62, p.y); f.rotation.y = rot + (s > 0 ? 0 : Math.PI); f.translateZ(1.7); add(f);
  }
  // as bandeiras da Holanda e a laranja nos mastros altos ao lado da linha de chegada
  const bandeiras = [];
  for (const lado of [-1, 1]) for (const ao of [-110, 110, -230, 230]) { const x = p.x + p.nx * lado * (tr.W / 2 + 40) + p.tx * ao, zz = p.y + p.ny * lado * (tr.W / 2 + 40) + p.ty * ao; if (livre(tr, x, zz, 30) && !ocupado(tr, x, zz)) bandeiras.push({ x, y: tr.chao(x, zz) - 1.5, z: zz, tipo: (ao > 0 ? 0 : 1) + (lado > 0 ? 0 : 2) * 0, r: -Math.atan2(p.ty, p.tx) + Math.PI / 2, s: 2.4, alto: 70 }); }
  bandeirasLaranja(tr, add, bandeiras);
  // a fumaça laranja dos sinalizadores anda com o vento: encadeia no laço de animação que vidaGP definiu
  const fumaca = tr.focosZandvoort?.length ? fumacaLaranja(tr, add, tr.focosZandvoort, {}) : null;
  const anterior = tr.animarPista;
  if (fumaca) tr.animarPista = (dt, foco, t) => { anterior?.(dt, foco, t); fumaca.animar(dt, foco); };
  tr.eixoZandvoort = eixoDaCosta(tr);
}
