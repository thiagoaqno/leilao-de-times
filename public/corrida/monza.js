// Monza (Autodromo Nazionale Monza, dentro do Parco di Monza): o que só o autódromo tem, em cima do kit 2. O resto (zebras vermelhas e
// brancas, escape de asfalto pintado nas chicanes e de brita nas Lesmo, pneus, arquibancadas de curva, painéis, passarelas, serra e som)
// é do kit, na configuração de gps/monza.js. Aqui, na ordem em que aparecem pela volta:
// 1. a reta dos boxes (um quadro só, com o x ao longo da pista e o z para o lado dos boxes): o prédio dos boxes com o Paddock Club, o pódio
//    suspenso que avança sobre a reta, a Tribuna Centrale de frente para ele (kit 2: tribunaCoberta, de torcida vermelha), as duas torres de
//    cronometragem de 1955, as torres de luz e o paddock atrás (motorhomes, tendas e carretas);
// 2. a Sopraelevata, o velho anel inclinado de concreto, visível no parque (kit/monza/sopraelevata.js);
// 3. as placas com o nome de cada curva (Rettifilo, Curva Grande, Roggia, Lesmo 1 e 2, Serraglio, Ascari e Parabolica);
// 4. o parque: o bosque alto e denso, as moitas, as folhas caídas, o gramado em faixas e o velho carvalho do Ascari (kit/monza/parque.js);
// 5. as bandeiras da Itália e dos tifosi nas arquibancadas e a faixa "AUTODROMO NAZIONALE MONZA" no pórtico da largada.
// O pórtico da largada é o de pista.js (as cinco luzes): atravessa a pista na linha de chegada e a faixa fica DE FRENTE para os carros
// (a normal aponta contra o sentido da volta), como a de Suzuka e Silverstone. Tudo é cenário: nada fica dentro da pista (livre/ocupado).
import * as THREE from "three";
import { canvasTex, M } from "./cena.js";
import { marcaTex } from "./kit/marcas.js";
import { instancias, lotes, tira, sorteio, sinalDaCurva, ocupado } from "./kit/comum.js";
import { tribunaCoberta, tendaPaddock } from "./kit/coberturas.js";
import { boxEquipe } from "./kit/box-equipe.js";
import { Montador, solido } from "./kit/montagem.js";
import { sopraelevata } from "./kit/monza/sopraelevata.js";
import { complexoDosBoxes, podioMonza, torreCronometragem, torreDeLuz, bandeiraItalia, bandeiraTifosi } from "./kit/monza/pecas.js";
import { bosque, folhasCaidas, gramado, carvalhoDoAscari } from "./kit/monza/parque.js";

// a torcida da Ferrari: quase tudo vermelho, com o branco e o amarelo da Scuderia e o verde da bandeira
export const TIFOSI = ["#d4001a", "#d4001a", "#c8102e", "#e63946", "#d4001a", "#ffffff", "#ffd23f", "#009246", "#111111", "#d4001a"];
const VERMELHO = "#c8102e", BRANCO = "#f4f4f2", VERDE = "#0a8a3c";
const ry0 = (p, lado) => Math.atan2(-lado * p.nx, -lado * p.ny); // rotation.y de quem está do lado `lado`, com a frente (+z) virada para a pista
const aoLongo = (p) => Math.atan2(-p.ty, p.tx); // rotation.y que põe o +x do objeto ao longo da pista, a favor da volta
const ponto = (p, lado, d, t = 0) => [p.x + p.nx * lado * d + p.tx * t, p.y + p.ny * lado * d + p.ty * t];
const CORES_EQUIPE = ["#e8002d", "#ff8700", "#27f4d2", "#3671c6", "#229971", "#37bedd", "#ff87bc", "#6692ff"];
const flagsTorcida = []; // { x, y, z, ry, s }: postas aqui por quem monta uma tribuna e desenhadas todas de uma vez em bandeirasTorcida

// ---------------------------------------------------------------------------------------------------------------------
// 1. A reta dos boxes
// ---------------------------------------------------------------------------------------------------------------------
// O quadro da reta: um grupo na linha de chegada, com o +x ao longo da pista (a favor da volta) e o +z para o lado dos boxes (o leste). A
// reta é reta de verdade (o rumo é o mesmo de 0,92 a 0,10 da volta), então tudo o que está a menos de uns 800 da linha cabe nele.
function quadroDaReta(tr, add) {
  const p = tr.pts[0], g = new THREE.Group(); g.name = "monza-reta";
  g.position.set(p.x, p.h, p.y); g.rotation.y = aoLongo(p); add(g);
  const mundo = (x, z) => [p.x + p.tx * x + p.nx * z, p.y + p.ty * x + p.ny * z];
  const reservar = (x, z, raio) => tr.reservado.push([...mundo(x, z), raio]);
  return { g, p, mundo, reservar };
}

function reta(tr, { add }) {
  const { g, p, mundo, reservar } = quadroDaReta(tr, add), { n } = tr;
  const Z = tr.W / 2 + 86, zT = -(tr.W / 2 + 36); // a frente do prédio dos boxes (depois do corredor e das garagens do kit) e a da Tribuna Centrale
  // o prédio dos boxes com o Paddock Club, e o pódio suspenso que sai dele e avança sobre a reta (as duas peças viram de costas: a frente olha a pista)
  const predio = complexoDosBoxes({ comprimento: 864, fundo: 62 });
  predio.position.set(0, -0.3, Z); predio.rotation.y = Math.PI; g.add(predio);
  const podio = podioMonza({ largura: 340, alcance: 128, alto0: 98, fundo: 62 });
  podio.position.set(150, -0.3, Z); podio.rotation.y = Math.PI; g.add(podio);
  tr.podioGP = { x: 150, z: Z, alcance: podio.userData.alcance, ponta: podio.userData.ponta, alto0: 98 };
  // a Tribuna Centrale, do outro lado: quatro módulos cobertos (kit 2) de concreto, de torcida vermelha, em frente ao prédio dos boxes
  for (let k = 0; k < 4; k++) {
    const t = tribunaCoberta({
      comprimento: 300, degraus: 11, altura: 6, fundo: 8.5, secoes: 6, publico: 0.42, semente: 17 + k * 5, alcance: 0.62, folga: 16, vao: 60,
      cores: k % 2 ? [VERMELHO, BRANCO, VERMELHO, VERDE, BRANCO, VERMELHO] : [VERMELHO, VERMELHO, BRANCO, VERMELHO, VERDE, BRANCO],
      cobertura: "#f6f6f4", estrutura: "#8a9096", camisas: TIFOSI,
    });
    t.position.set((k - 1.5) * 306, -2.4, zT); g.add(t);
    for (let j = 0; j < 7; j++) { // as bandeiras nos degraus de cima
      const u = (k - 1.5) * 306 + (j - 3) * 40 + ((j * 37 + k * 11) % 17) - 8, fila = 5 + ((j * 3 + k) % 5), [fx, fz] = mundo(u, zT - 3 - fila * 8.5);
      flagsTorcida.push({ x: fx, y: p.h + (fila + 1) * 6 + 5, z: fz, ry: aoLongo(p) + (((j * 13 + k * 7) % 10) - 5) * 0.08, s: 0.9 + ((j + k) % 5) * 0.12 });
    }
  }
  const m = new Montador(), S = solido();
  m.caixa(S, [0, -3.4, zT - 46], [1240, 6, 106], { cor: "#a9a59c" }); // a laje de concreto sob a Tribuna
  g.add(m.montar("monza-tribuna-laje"));
  const i0 = Math.floor(0.9595 * n), i1 = Math.floor(1.0405 * n) % n;
  tr.arquibancadas ||= []; tr.arquibancadas.push([i0, n - 1], [0, i1]); // o som da torcida
  for (let x = -640; x <= 640; x += 48) reservar(x, zT - 50, 112);
  // as duas torres de cronometragem de 1955 atrás da Tribuna, com o placar luminoso virado para a pista, e as torres de luz
  for (const x of [-668, 668]) { const t = torreCronometragem({ alto: 340 }); t.position.set(x, 0, zT - 148); g.add(t); reservar(x, zT - 148, 74); }
  for (const x of [-470, 470]) { const t = torreDeLuz({ alto: 190 }); t.position.set(x, 0, zT - 112); g.add(t); reservar(x, zT - 112, 20); }
  for (const x of [-390, 390]) { const t = torreDeLuz({ alto: 190 }); t.position.set(x, 0, Z + 62 + 34); t.rotation.y = Math.PI; g.add(t); reservar(x, Z + 62 + 34, 20); }
  // o paddock atrás do prédio dos boxes: os motorhomes das equipes, as tendas e as carretas, e tudo isso reservado (as árvores ficam de fora)
  paddock(tr, g, Z + 62);
  for (const z of [Z + 30, Z + 120, Z + 210, Z + 300, Z + 390]) for (let x = -480; x <= 480; x += 160) reservar(x, z, 96);
  tr.retaMonza = { g, Z, zT };
  return g;
}

function paddock(tr, g, z0) {
  const textos = ["FERRARI", "MCLAREN", "MERCEDES", "RED BULL", "ASTON MARTIN"], cores = ["#d62a1f", "#ff7a1a", "#2fb8a3", "#1d4fd8", "#13804a"];
  for (let k = 0; k < 5; k++) { // os motorhomes, de costas para o prédio dos boxes (a frente olha para ele)
    const b = boxEquipe({ portas: 2, cor: cores[k], texto: textos[k], corTexto: "#ffffff", corFaixa: "#15161a", abertura: 0.8, carros: 1, interior: false });
    b.position.set((k - 2) * 210, 0.4, z0 + 24); b.rotation.y = Math.PI; g.add(b);
  }
  const tendas = [["MONZA", "#c8102e"], ["PIRELLI", "#111111"], ["ROLEX", "#00603a"]];
  tendas.forEach(([texto, corFaixa], k) => {
    const t = tendaPaddock({ modulos: 3, filas: 2, texto, corFaixa, corMesas: "#c8102e" });
    t.scale.setScalar(1.7); t.position.set((k - 1) * 300, 0.4, z0 + 210); t.rotation.y = Math.PI; g.add(t);
  });
  const m = new Montador(), S = solido();
  for (let k = 0; k < 8; k++) { // as carretas das equipes, enfileiradas lá no fundo
    const x = (k - 3.5) * 124, z = z0 + 330, cor = CORES_EQUIPE[k % CORES_EQUIPE.length];
    m.caixa(S, [x, 21, z], [78, 32, 28], { cor: "#eceeef" }); m.caixa(S, [x, 21, z - 14.3], [78, 10, 0.6], { cor });
    m.caixa(S, [x + 46, 15, z], [16, 24, 24], { cor }); m.caixa(S, [x + 50.4, 20, z], [8, 9, 21], { cor: "#26323d" });
    for (const dx of [-26, -10, 36, 48]) for (const s of [-1, 1]) m.cilindro(S, [x + dx, 6, z + s * 12], [6, 5], { cor: "#1b1b1f", rx: Math.PI / 2, seg: 8 });
  }
  g.add(m.montar("monza-paddock-carretas"));
}

// ---------------------------------------------------------------------------------------------------------------------
// 2b. A Parabolica (Curva Alboreto): a grande área de escape de asfalto e as tribunas por fora
// ---------------------------------------------------------------------------------------------------------------------
const PARABOLICA = [0.848, 0.925, 0.885]; // [começo, fim, ápice]: frações da volta
function escapeDaParabolica(tr, { add }) {
  const { pts, n, W } = tr, [f0, f1, fa] = PARABOLICA, a = Math.floor(f0 * n), b = Math.floor(f1 * n), fora = -sinalDaCurva(pts, n, Math.floor(fa * n)), de = W / 2 + 7, ate = de + 46;
  // o asfalto cinza da área de escape (desde 2014 a Parabolica não tem mais brita), com a linha branca junto da zebra e as emendas das placas
  const asfalto = new THREE.MeshStandardMaterial({ roughness: 0.92, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, map: canvasTex(64, 64, (x, w, h, rr) => {
    x.fillStyle = "#74767b"; x.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { x.fillStyle = rr() < 0.5 ? "#0000001a" : "#ffffff14"; x.fillRect(rr() * w, rr() * h, 2, 2); }
    x.fillStyle = "#f4f4f2"; x.fillRect(0, 0, 2, h); x.fillStyle = "#62646a"; x.fillRect(0, h - 2, w, 2); x.fillStyle = "#c8102e55"; x.fillRect(w * 0.55, 0, 3, h); // a linha, a emenda e uma faixa vermelha apagada
  }) });
  const L = lotes(); tira(tr, L.de(asfalto), a, b, fora * de, fora * ate, 0.3, 0.2, (a * 6) / 64, (b * 6) / 64); L.montar(add, `${tr.id}-parabolica-escape`);
  // o muro de pneus no fim do asfalto
  const pneu = new THREE.TorusGeometry(3.4, 1.7, 6, 12); pneu.rotateX(Math.PI / 2); const pretos = [], brancos = [];
  for (let i = a; i < b; i += 4) {
    const p = pts[i % n], x = p.x + p.nx * fora * (ate - 4), z = p.y + p.ny * fora * (ate - 4);
    if (!ocupado(tr, x, z, i % n) && tr.distAt(x, z) >= ate - 8) for (let k = 0; k < 3; k++) (((i / 2 + k) % 7 | 0) === 0 ? brancos : pretos).push({ x, y: p.h + 1.7 + k * 3.6, z });
  }
  instancias(add, pneu, M(0x16171a, { roughness: 0.95 }), pretos, { nome: `${tr.id}-parabolica-pneus` });
  instancias(add, pneu, M(0xe4e4de, { roughness: 0.9 }), brancos);
}

// as tribunas por fora da Parabolica, depois do asfalto: módulos curtos de tribuna (kit 2), um deles coberto (como a Tribuna 22)
function tribunasDaParabolica(tr, { add }) {
  const { pts, n, W } = tr, [f0, f1, fa] = PARABOLICA, L = W / 2 + 128, r = sorteio(4242), fora = -sinalDaCurva(pts, n, Math.floor(fa * n)), reservar = [];
  const i0 = Math.floor((f0 + 0.008) * n), i1 = Math.floor((f1 - 0.006) * n), comp = (i1 - i0) * 6, nm = Math.max(1, Math.round(comp / 150)), len = comp / nm, fundo = 9 * 8.5 + 22;
  tr.arquibancadas ||= [];
  for (let k = 0; k < nm; k++) {
    const ic = Math.round(i0 + ((k + 0.5) * len) / 6), p = pts[ic % n], [x, z] = ponto(p, fora, L);
    // a pista (qualquer trecho) não pode chegar perto de nenhum canto da tribuna
    const ok = [[-len / 2, 0], [len / 2, 0], [-len / 2, fundo], [len / 2, fundo], [0, fundo], [0, 0]].every(([u, d]) => { const [qx, qz] = ponto(p, fora, L + d, u); return tr.distAt(qx, qz) >= L - 5 && !ocupado(tr, qx, qz); });
    if (!ok) continue;
    const t = tribunaCoberta({
      comprimento: len - 8, degraus: 9, altura: 6, fundo: 8.5, secoes: Math.max(3, Math.round(len / 50)), cores: k % 2 ? [VERMELHO, BRANCO, VERMELHO] : [VERMELHO, VERMELHO, BRANCO],
      cobertura: k === 1 ? "#f6f6f4" : null, publico: 0.45, semente: 70 + k, alcance: 0.7, folga: 16, vao: 50, camisas: TIFOSI,
    });
    t.position.set(x, p.h - 5, z); t.rotation.y = ry0(p, fora); add(t);
    for (let j = 0; j < 6; j++) { // as bandeiras nos degraus de cima
      const u = (r() - 0.5) * (len - 30), row = 4 + Math.floor(r() * 4), [fx, fz] = ponto(p, fora, L + 4 + row * 8.5, u);
      flagsTorcida.push({ x: fx, y: p.h - 5 + (row + 1) * 6 + 5, z: fz, ry: aoLongo(p) + (r() - 0.5) * 0.6, s: 0.9 + r() * 0.5 });
    }
    for (let i = ic - Math.floor(len / 12); i <= ic + Math.floor(len / 12); i += 3) { const q = pts[((i % n) + n) % n]; reservar.push([q.x + q.nx * fora * (L + 45), q.y + q.ny * fora * (L + 45), 80]); }
    tr.arquibancadas.push([(ic - Math.floor(len / 12) + n) % n, (ic + Math.floor(len / 12)) % n]); // o som da torcida
  }
  tr.reservado.push(...reservar); // só depois de todas, para uma tribuna não barrar a vizinha
}

// ---------------------------------------------------------------------------------------------------------------------
// 3. As placas com o nome de cada curva
// ---------------------------------------------------------------------------------------------------------------------
const CURVAS = [["VARIANTE DEL RETTIFILO", 1, 0.125], ["CURVA GRANDE", 3, 0.2], ["VARIANTE DELLA ROGGIA", 4, 0.338], ["CURVA DI LESMO 1", 5, 0.405], ["CURVA DI LESMO 2", 6, 0.458],
  ["CURVA DEL SERRAGLIO", 7, 0.53], ["VARIANTE ASCARI", 8, 0.655], ["PARABOLICA - C. ALBORETO", 11, 0.885]];
function placasDasCurvas(tr, { add }) {
  const { pts, n, W } = tr, vs = [], uv = [], idx = [], m = new Montador(), S = solido();
  const atlas = canvasTex(1024, 512, (x) => {
    CURVAS.forEach(([nome, num], k) => {
      const c = k % 4, rr = Math.floor(k / 4), x0 = c * 256, y0 = rr * 128;
      x.fillStyle = "#f4f4f2"; x.fillRect(x0, y0, 256, 128); x.strokeStyle = VERMELHO; x.lineWidth = 6; x.strokeRect(x0 + 4, y0 + 4, 248, 120);
      x.fillStyle = VERMELHO; x.fillRect(x0 + 10, y0 + 10, 54, 108); x.fillStyle = "#ffffff"; x.font = "900 44px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(num), x0 + 37, y0 + 66);
      x.fillStyle = "#15161a"; x.font = "900 28px Arial, sans-serif"; x.fillText(nome, x0 + 160, y0 + 66, 176);
    });
  }, false);
  CURVAS.forEach(([, , f], k) => {
    const i = Math.floor(f * n), p = pts[i], fora = -sinalDaCurva(pts, n, i);
    let escolhido = null;
    for (const lado of k === 7 ? [-fora, fora] : [fora, -fora]) { // a da Parabolica vai por dentro: por fora é só asfalto de escape, pneus e as tribunas
      for (const d of [W / 2 + 52, W / 2 + 74]) {
        const [x, z] = ponto(p, lado, d);
        if (tr.distAt(x, z) >= d - 8 && !ocupado(tr, x, z)) { escolhido = [lado, x, z]; break; }
      }
      if (escolhido) break;
    }
    if (!escolhido) return;
    const [lado, x, z] = escolhido, y = tr.chao(x, z);
    // a placa gira um pouco para quem vem de trás (a frente aponta para a pista e um pouco contra o sentido da corrida)
    const nx = -lado * p.nx - 0.55 * p.tx, nz = -lado * p.ny - 0.55 * p.ty, len = Math.hypot(nx, nz), ex = nz / len, ez = -nx / len; // (ex, ez): o eixo largo da placa
    const w = 104, h = 52, y0 = y + 26, c = k % 4, rr = Math.floor(k / 4), base = vs.length / 3;
    for (const [a, b] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) { vs.push(x + ex * a * w / 2, y0 + b * h, z + ez * a * w / 2); uv.push(((a + 1) / 2 + c) / 4, 1 - (rr + 1 - b) / 4); }
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    for (const s of [-1, 1]) m.caixa(S, [x + ex * s * (w / 2 - 6), y + 13, z + ez * s * (w / 2 - 6)], [2.6, 28, 2.6], { cor: "#d9dbdd", ry: Math.atan2(ex, ez) });
    tr.reservado.push([x, z, 26]);
  });
  if (!idx.length) return;
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const placa = add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.6, side: THREE.DoubleSide }))); placa.castShadow = true; placa.name = `${tr.id}-placas-curvas`;
  add(m.montar("monza-placas-curvas-postes"));
  tr.placasMonza = idx.length / 6;
}

// ---------------------------------------------------------------------------------------------------------------------
// 5. As bandeiras da torcida (a Itália e a dos tifosi) nos degraus das tribunas e das arquibancadas do kit
// ---------------------------------------------------------------------------------------------------------------------
function bandeirasTorcida(tr, { add }) {
  const { pts, n } = tr, r = sorteio(6113), lista = flagsTorcida.slice();
  for (const q of tr.arqDegraus || []) {
    for (let i = q.i0; i <= q.i1; i += 6) {
      if (r() < 0.4) continue;
      const p = pts[i % n], fila = Math.floor(r() * q.degraus), [x, z] = ponto(p, q.lado, Math.abs(q.l0) + 4.5 + fila * 9);
      lista.push({ x, y: p.h + 4 + (fila + 1) * 6 + 3, z, ry: aoLongo(p) + (r() - 0.5) * 0.7, s: 0.8 + r() * 0.5 });
    }
  }
  if (!lista.length) return;
  const hastes = lista.map((o) => ({ x: o.x, y: o.y + 5, z: o.z, sx: 1, sy: 10, sz: 1 }));
  instancias(add, new THREE.CylinderGeometry(0.4, 0.4, 1, 4), M(0xd9d9d9), hastes, { sombra: false, nome: `${tr.id}-hastes` });
  const italianas = lista.filter((o, k) => k % 5 < 3), tifosi = lista.filter((o, k) => k % 5 >= 3), d = new THREE.Object3D();
  for (const [l, mapa, nome] of [[italianas, bandeiraItalia(), "italia"], [tifosi, bandeiraTifosi(), "tifosi"]]) {
    if (!l.length) continue;
    const flag = add(new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: mapa, roughness: 0.8, side: THREE.DoubleSide }), l.length));
    l.forEach((o, k) => { d.position.set(o.x + Math.cos(-o.ry) * 4.6 * o.s, o.y + 8.6, o.z + Math.sin(-o.ry) * 4.6 * o.s); d.rotation.set(0, o.ry, (r() - 0.5) * 0.3); d.scale.set(9.2 * o.s, 5.8 * o.s, 1); d.updateMatrix(); flag.setMatrixAt(k, d.matrix); });
    flag.name = `${tr.id}-flags-${nome}`;
  }
  tr.bandeirasMonza = lista.length;
}

// ---------------------------------------------------------------------------------------------------------------------
// O antes (cenario) e o depois (depois) do GP
// ---------------------------------------------------------------------------------------------------------------------
export function cenarioMonza(tr, ctx) {
  tr.reservado ||= [];
  tr.camisasGP = TIFOSI; // a torcida solta de vida.js também veste vermelho
  reta(tr, ctx);
  sopraelevata(tr, ctx.add);
  escapeDaParabolica(tr, ctx);
  tribunasDaParabolica(tr, ctx);
  placasDasCurvas(tr, ctx);
}

export function depoisMonza(tr, ctx) {
  const { add } = ctx;
  // o parque: o gramado em faixas junto da pista, o bosque (copas em dois lóbulos, árvores altas e grossas, as mais fundas encostadas na frente
  // e uma cortina de longe, numa malha só por tipo), as folhas caídas junto das fileiras e o velho carvalho do Ascari.
  gramado(tr, add, {});
  bosque(tr, add, { recuo: 22, fundo: 280, alturas: [170, 320], densidade: 2.0, semente: 2025, coniferas: 0.12 });
  folhasCaidas(tr, add, {});
  carvalhoDoAscari(tr, add, 0.646);
  bandeirasTorcida(tr, ctx);
  // a faixa do autódromo no pórtico da largada (o de pista.js): uma de cada lado da viga, a da frente com a normal contra o sentido da volta
  const p = tr.pts[0], L = tr.W / 2 + 14, rot = -Math.atan2(p.ny, p.nx);
  for (const s of [1, -1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(2 * L - 6, 8.4), new THREE.MeshBasicMaterial({ map: marcaTex("monza", 1024, 64), side: THREE.FrontSide }));
    f.position.set(p.x, p.h + 62, p.y); f.rotation.y = rot + (s > 0 ? 0 : Math.PI); f.translateZ(1.7); add(f);
  }
}
