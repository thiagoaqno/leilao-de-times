// Jeddah (Jeddah Corniche Circuit): o que só o circuito tem. O resto (zebras, escape, arquibancadas, painéis, postos, placas,
// passarelas, serra e som) é do kit, na configuração de gps/jeddah.js. Aqui, de oeste para leste:
// 1. o Mar Vermelho, a corniche de pedra com palmeiras e postes, a lagoa da laçada do sul e a marina com dhows (kit/jeddah/mar.js e barcos.js);
// 2. a Fonte do Rei Fahd (o jato de 300 m, no mar) e a Mesquita Al-Rahma (a mesquita flutuante) (kit/jeddah/fonte.js e mesquita.js);
// 3. o prédio dos boxes de quatro andares escalonados com o Paddock Club sob velas, as tendas do paddock e as bandeiras (kit/jeddah/predio-boxes.js);
// 4. as torres de holofotes da corrida noturna (kit/holofotes.js), as palmeiras e os postes da corniche;
// 5. a cidade a leste, com a Jeddah Tower e os guindastes (kit/jeddah/cidade.js).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import "./kit/jeddah/marcas.js";
import { marcaTex } from "./kit/marcas.js";
import { marJeddah } from "./kit/jeddah/mar.js";
import { barcosJeddah } from "./kit/jeddah/barcos.js";
import { fonteReiFahd } from "./kit/jeddah/fonte.js";
import { mesquitaFlutuante } from "./kit/jeddah/mesquita.js";
import { predioBoxesJeddah, texturaBandeiraSaudita } from "./kit/jeddah/predio-boxes.js";
import { cidadeJeddah } from "./kit/jeddah/cidade.js";
import { palmeiras, arbustos, semearPalmeiras } from "./kit/jeddah/palmeiras.js";
import { holofotes } from "./kit/holofotes.js";
import { tendaPaddock, tribunaCoberta } from "./kit/coberturas.js";
import { Montador, solido, letreiro } from "./kit/montagem.js";
import { livre, ocupado, sorteio, instancias } from "./kit/comum.js";

const ESCALA = 1.35; // o prédio de verdade é bem maior que o desenho
// uma tribuna coberta do kit 2 ao lado da pista: só nasce onde a frente e o fundo dela ficam livres do asfalto e de outras peças
function tribunaEm(tr, add, [fa, fb], lado, { comprimento = 170, degraus = 8, lat = null, cores = ["#0a7f45", "#f4f4f4"] } = {}) {
  const { pts, n, W } = tr, L = lat ?? (tr.wallLat + 40), prof = degraus * 7.5 + 16;
  let f = null;
  for (let q = fa; q <= fb && f === null; q += 0.004) {
    const p = pts[Math.floor(q * n) % n]; let ok = true;
    for (const dx of [-comprimento / 2, -comprimento / 4, 0, comprimento / 4, comprimento / 2]) for (const d of [0, prof / 2, prof]) {
      const x = p.x + p.nx * lado * (L + d) + p.tx * dx, z = p.y + p.ny * lado * (L + d) + p.ty * dx;
      if (!livre(tr, x, z, L + d - W / 2 - 14) || ocupado(tr, x, z) || tr.noCorredor?.(x, z)) ok = false;
    }
    if (ok) f = q;
  }
  if (f === null) return null;
  const p = pts[Math.floor(f * n) % n], t = tribunaCoberta({ comprimento, degraus, cores, secoes: 4, publico: 0.55, cobertura: "#f6f6f4" });
  const pos = colocar(tr, t, Math.floor(f * n), lado * L, { paraPista: true }); add(t);
  for (let dx = -comprimento / 2; dx <= comprimento / 2; dx += 40) tr.reservado.push([p.x + p.nx * lado * (L + prof / 2) + p.tx * dx, p.y + p.ny * lado * (L + prof / 2) + p.ty * dx, prof / 2 + 26]);
  (tr.arquibancadas ||= []); const i0 = Math.floor(f * n) - Math.floor(comprimento / 12), i1 = Math.floor(f * n) + Math.floor(comprimento / 12); tr.arquibancadas.push([i0, i1]); // o som da torcida
  return pos;
}
// um telão de LED na beira (a moldura, as duas pernas e a tela acesa virada para a pista)
function telao(tr, add, f0, lado, { lat = null, w = 90, h = 38, texto = "SAUDI ARABIAN GRAND PRIX", fundo = "#0a7f45" } = {}) {
  const { pts, n, W } = tr, L = lat ?? (tr.wallLat + 34);
  let f = null;
  for (let q = f0; q < f0 + 0.06 && f === null; q += 0.004) { const p = pts[Math.floor(q * n) % n]; if ([-w / 2, 0, w / 2].every((dx) => { const x = p.x + p.nx * lado * L + p.tx * dx, z = p.y + p.ny * lado * L + p.ty * dx; return livre(tr, x, z, L - W / 2 - 14) && !ocupado(tr, x, z); })) f = q; }
  if (f === null) return false;
  const p = pts[Math.floor(f * n) % n];
  const m = new Montador(), S = solido(), tela = new THREE.MeshBasicMaterial({ map: letreiro(texto, { fundo, cor: "#ffffff", w: 1024, h: 432, vezes: 1, traco: true }) });
  m.caixa(S, [0, 25 + h / 2, -1.6], [w + 4, h + 4, 3], { cor: "#20242a" });
  m.plano(tela, [0, 25 + h / 2, 0.1], [w, h]);
  for (const s of [-1, 1]) m.caixa(S, [s * (w / 2 - 6), 12.5, -2], [4, 25, 4], { cor: "#8a9096" });
  const g = m.montar("telao-jeddah"); colocar(tr, g, Math.floor(f * n), lado * L, { paraPista: true }); add(g);
  tr.reservado.push([p.x + p.nx * lado * L, p.y + p.ny * lado * L, w / 2 + 14]);
  return true;
}

const PREDIO = { lat: 158, comprimento: 540, profundidade: 54 }; // a frente do prédio fica a 158 da linha central (as garagens do corredor terminam em ~137)

// põe um grupo no ponto i da pista, a `lat` da linha central (negativo = lado -1); a frente (+z do grupo) olha para a pista ou para longe dela
function colocar(tr, g, i, lat, { paraPista = true, dx = 0, y = null } = {}) {
  const p = tr.pts[((i % tr.n) + tr.n) % tr.n], s = Math.sign(lat) * (paraPista ? -1 : 1);
  const x = p.x + p.nx * lat + p.tx * dx, z = p.y + p.ny * lat + p.ty * dx;
  g.position.set(x, y ?? tr.chao(x, z) - 1.5, z); g.rotation.y = Math.atan2(p.nx * s, p.ny * s);
  return { x, z };
}

// postes de luz da corniche: haste, braço e a cabeça de lâmpada, numa geometria só (uma chamada de desenho)
function geoPoste() {
  const col = (g, hex) => { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute("color", new THREE.BufferAttribute(a, 3)); return g; };
  const haste = new THREE.CylinderGeometry(0.7, 1.1, 30, 6); haste.translate(0, 15, 0);
  const braco = new THREE.BoxGeometry(11, 0.8, 0.8); braco.translate(4.5, 30, 0);
  const cabeca = new THREE.BoxGeometry(4, 1.2, 2.4); cabeca.translate(9.5, 29.4, 0);
  return mergeGeometries([col(haste, "#e9ebec"), col(braco, "#e9ebec"), col(cabeca, "#fff2c8")]);
}

export function cenarioJeddah(tr, ctx) {
  const { add, hAt } = ctx, { pts, n, W } = tr, r = sorteio(2026);
  tr.reservado ||= [];
  const mar = (tr.marJeddah = marJeddah(tr, ctx));

  // ---- o prédio dos boxes, na linha de chegada, atrás das garagens do corredor ----
  const predio = predioBoxesJeddah({ comprimento: PREDIO.comprimento, profundidade: PREDIO.profundidade });
  const posPredio = colocar(tr, predio, 0, -PREDIO.lat); predio.scale.setScalar(ESCALA); add(predio);
  tr.predioJeddah = { ...posPredio, ...predio.userData };
  for (let dx = -PREDIO.comprimento * ESCALA / 2; dx <= PREDIO.comprimento * ESCALA / 2; dx += 50) { const p = pts[0], lat = -(PREDIO.lat + PREDIO.profundidade * ESCALA / 2 + 14); tr.reservado.push([p.x + p.nx * lat + p.tx * dx, p.y + p.ny * lat + p.ty * dx, PREDIO.profundidade * ESCALA / 2 + 40]); }
  // as bandeiras da Arábia Saudita nos mastros do alto do prédio (pano de duas faces, sem luz)
  const bandMat = new THREE.MeshBasicMaterial({ map: texturaBandeiraSaudita(), side: THREE.DoubleSide });
  for (const [mx, my, mz] of predio.userData.mastros) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(26, 17), bandMat); f.position.set(mx + 13.5, my - 9, mz); predio.add(f);
  }
  // as tendas do paddock (kit 2) atrás do prédio, do lado do norte, viradas para a lagoa
  for (const dx of [150, 285]) {
    const t = tendaPaddock({ modulos: 3, filas: 1, texto: dx > 200 ? "STC" : "SAUDIA", corFaixa: dx > 200 ? "#4f008c" : "#006c35", corMesas: "#006c35", profundidade: 30, vao: 34 });
    colocar(tr, t, 0, -(PREDIO.lat + PREDIO.profundidade * ESCALA + 22), { paraPista: false, dx }); add(t);
    tr.reservado.push([tr.pts[0].x - tr.pts[0].nx * (PREDIO.lat + PREDIO.profundidade * ESCALA + 22) + tr.pts[0].tx * dx, tr.pts[0].y - tr.pts[0].ny * (PREDIO.lat + PREDIO.profundidade * ESCALA + 22) + tr.pts[0].ty * dx, 60]);
  }

  // ---- tribunas cobertas e telões (kit 2) ----
  for (const [f, lado] of [[[0.09, 0.14], 1], [[0.29, 0.35], -1], [[0.42, 0.46], 1], [[0.52, 0.6], -1], [[0.61, 0.67], 1], [[0.76, 0.86], -1], [[0.2, 0.235], -1]]) tribunaEm(tr, add, f, lado);
  for (const [f, lado, txt, fundo] of [[0.915, -1, "SAUDI ARABIAN GRAND PRIX", "#0a7f45"], [0.075, -1, "stc", "#4f008c"], [0.2, 1, "JEDDAH CORNICHE CIRCUIT", "#0a7f45"], [0.39, -1, "ARAMCO", "#0d6b8a"], [0.5, 1, "stc", "#4f008c"], [0.7, -1, "SAUDI ARABIAN GRAND PRIX", "#0a7f45"]]) telao(tr, add, f, lado, { texto: txt, fundo });

  // ---- as palmeiras: pela corniche, em volta do prédio e nas duas beiradas da pista ----
  const lista = [], baixas = [];
  mar.orla.forEach((o, i) => {
    if (i % 2 || o.ix < 0.5) return; // só a costa oeste (e as pontas)
    for (const d of [30, 46]) { const x = o.x + o.ix * d + (r() - 0.5) * 8, z = o.z + o.iz * d; if (!livre(tr, x, z, 40) || ocupado(tr, x, z)) continue; lista.push({ x, y: tr.chao(x, z) - 1.5 + 0.5, z, s: 1 + r() * 0.5, r: r() * 6.28 }); }
  });
  lista.push(...semearPalmeiras(tr, { dMin: 98, dMax: 240, passo: 6, chance: 0.55, semente: 71 }));
  lista.push(...semearPalmeiras(tr, { de: 0.86, ate: 1.06, lados: [1], dMin: 200, dMax: 330, passo: 5, chance: 0.8, semente: 72 })); // atrás da arquibancada principal
  for (const p of semearPalmeiras(tr, { dMin: 80, dMax: 130, passo: 5, chance: 0.5, semente: 73, tipo: "arbusto", folga: 22 })) baixas.push(p);
  palmeiras(add, lista, { nome: `${tr.id}-palmeiras` }); arbustos(add, baixas, { nome: `${tr.id}-arbustos` });

  // ---- os postes de luz da corniche ----
  const postes = [];
  mar.orla.forEach((o, i) => { if (i % 2 || o.ix < 0.5) return; const x = o.x + o.ix * 12, z = o.z + o.iz * 12; if (!ocupado(tr, x, z) && livre(tr, x, z, 40)) postes.push({ x, y: 1.0, z, r: Math.atan2(-o.ix, -o.iz) + Math.PI / 2 * 0 - Math.PI / 2 }); });
  if (postes.length) instancias(add, geoPoste(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), postes, { sombra: false, nome: `${tr.id}-postes-corniche` });

  // ---- o mar: a fonte, a mesquita, a marina e os barcos ----
  const zF = 3500, xF = mar.xCosta(zF) - 700;
  const fonte = fonteReiFahd({ altura: 820 }); fonte.grupo.position.set(xF, 0.5, zF); add(fonte.grupo); tr.fonteJeddah = { x: xF, z: zF };
  const zM = 2560, xM = mar.xCosta(zM) - 285, mesq = mesquitaFlutuante({}); mesq.position.set(xM, 0.5, zM); mesq.rotation.y = Math.PI / 2; mesq.scale.setScalar(2.2); add(mesq);
  const pier = new THREE.Mesh(new THREE.BoxGeometry(18, 2, 175), new THREE.MeshStandardMaterial({ color: 0xd9d0b8, roughness: 0.9 })); pier.position.set(xM + 215, 1.4, zM); pier.rotation.y = Math.PI / 2; add(pier);
  tr.mesquitaJeddah = { x: xM, z: zM };
  const barcos = barcosJeddah(tr, ctx, mar);

  // ---- as torres de holofotes (corrida noturna) e a cidade ----
  holofotes(tr, add, { passo: 62, recuo: 56, alto: 78 });
  cidadeJeddah(tr, ctx);
  tr.animarJeddah = (dt, foco, t) => { fonte.animar(t); barcos.animar(dt, foco, t); };
}

// o depois: a animação do mar entra na de vida.js (que só existe depois do cenário) e a faixa da stc no pórtico da largada (o de
// pista.js, que já atravessa a pista na linha de chegada)
export function depoisJeddah(tr, { add }) {
  const anterior = tr.animarPista;
  tr.animarPista = (dt, foco, t) => { anterior?.(dt, foco, t); tr.animarJeddah?.(dt, foco, t); };
  const p = tr.pts[0], L = tr.W / 2 + 14, rot = -Math.atan2(p.ny, p.nx);
  for (const s of [1, -1]) {
    const faixa = new THREE.Mesh(new THREE.PlaneGeometry(2 * L - 6, 8.4), new THREE.MeshBasicMaterial({ map: marcaTex("saudigp", 1024, 64), side: THREE.FrontSide }));
    faixa.position.set(p.x, p.h + 62, p.y); faixa.rotation.y = rot + (s > 0 ? 0 : Math.PI); faixa.translateZ(s * 1.7); add(faixa);
  }
}
