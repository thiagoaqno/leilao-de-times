// Red Bull Ring (GP da Áustria, em Spielberg, na Estíria): o que só o circuito tem, em cima do kit 2. O resto (zebras vermelhas e brancas, brita de escape, painéis,
// placas de frenagem e som) é do kit, na configuração de gps/redbullring.js; as peças exclusivas estão em kit/redbullring/. Aqui, na ordem em que aparecem pela
// volta (frações da volta, a partir da linha de chegada):
// 1. a reta dos boxes (0,94-1,03): o prédio das garagens (reconstruído em 2010) com a torre de controle, do lado dos boxes; do outro lado, a tribuna principal
//    coberta (Start-Ziel) e, atrás dela, no alto, o prédio em forma de asa de carro que olha a reta; o paddock das carretas atrás dos boxes;
// 2. a curva 1 (Niki Lauda, 0,076, a direita que sobe), a subida longa (0,09-0,275, com a curva 2 no meio) e a curva 3 (Remus, 0,29, o grampo no alto);
// 3. a reta de Schönberg (0,305-0,46, em descida), com a tribuna entre a 3 e a 4, a curva 4 (Schlossgold, 0,485) e a 5 (0,51);
// 4. o miolo: a 6 (Rauch, 0,60, a esquerda em descida), a 7 (Würth, 0,675, no fundo do vale) e a 8 (0,715), com o touro de aço de chapas de corten e chifres de
//    ouro no meio do circuito;
// 5. a reta de volta (0,74-0,82), a curva 9 (Rindt, 0,846) e a 10 (0,896, com a tribuna), que fecha a volta na reta dos boxes;
// 6. as placas com o nome e o número de cada curva, os sítios e a capela da Estíria nos pastos, as encostas lotadas e o acampamento;
// 7. a bacia de morros verdes (aberta para o vale do lado dos boxes), a mata de abetos em manchas com os pastos limpos e os fardos de feno, e as montanhas ao fundo.
// O pórtico da largada é o de pista.js (as cinco luzes): atravessa a pista na linha de chegada, e a faixa fica DE FRENTE para os carros. Tudo é cenário: nada fica dentro
// da pista (livre/ocupado) nem entre a pista e a barreira (`tr.murosEscape`).
import * as THREE from "three";
import { canvasTex } from "./cena.js";
import { marcaTex } from "./kit/marcas.js";
import { livre, ocupado, recortar, sinalDaCurva } from "./kit/comum.js";
import { tribunaCoberta, tendaPaddock } from "./kit/coberturas.js";
import { Montador, solido } from "./kit/montagem.js";
import { registrarMarcasAustria } from "./kit/redbullring/marcas.js";
import { indice, pousar, reservar, colocar, somDaTorcida, abertura, dentroDaVolta } from "./kit/redbullring/lugar.js";
import { predioDosBoxes, asaDeAco, casaDaEstiria, sitioDaEstiria, capelaDeBulbo, torreDeCamera, carretas } from "./kit/redbullring/predios.js";
import { touroDeAco } from "./kit/redbullring/touro.js";
import { torcidaNasEncostas, acampamento, bandeirasDaTorcida, CAMISAS_AUSTRIA } from "./kit/redbullring/torcida.js";
import { encostasVerdes, serrasDaEstiria, bosqueDaBeira, florestaDeLonge, fardosNosPastos } from "./kit/redbullring/paisagem.js";

registrarMarcasAustria();

// o vale aberto fica ao sul (z crescente), do lado dos boxes: os três outros lados são de encosta
const ANGULO_DO_VALE = Math.PI / 2;

// tenta pôr o grupo em cada f da lista, em cada deslocamento (para os sítios e as casas, que querem um pasto e não uma mata)
function tentar(tr, add, g, fs, o) {
  for (const f of fs) { const r = colocar(tr, add, g, { ...o, f }); if (r) return r; }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// 1. A reta dos boxes
// ---------------------------------------------------------------------------------------------------------------------
function retaDosBoxes(tr, { add }) {
  const { n, W } = tr, lado = tr.t.boxes?.lado ?? 1, Z = W / 2 + 84, F = 44;
  // o prédio acompanha a reta: onde a curva 10 (ou a 1) chegam perto, ele termina
  const rec = recortar(tr, Math.floor(0.95 * n), Math.floor(1.03 * n), [lado * (Z - 4), lado * (Z + F + 4)], 4);
  if (rec) {
    const comp = Math.min(640, (rec.i1 - rec.i0) * 6 - 24), meio = Math.floor((rec.i0 + rec.i1) / 2);
    const linha = ((n - meio) * 6) * (lado > 0 ? -1 : 1); // onde a linha de chegada cai no prédio (o +x local anda contra a volta do lado +1)
    const predio = predioDosBoxes({ comprimento: comp, fundo: F, torre: Math.max(-comp / 2 + 90, Math.min(comp / 2 - 90, linha)), faixa: "SPIELBERG" });
    const q = pousar(tr, predio, (meio % n) / n, lado, Z); add(predio);
    reservar(tr, q.x, q.z, q.ry, comp, F + 30, 40);
    tr.predioAustria = { f: meio / n, comprimento: comp, lado };
  }
  // a tribuna principal (Start-Ziel), do outro lado: três módulos cobertos de frente para a pista, de torcida laranja, vermelha e branca
  const oposto = -lado, mods = [];
  for (const [ao, sem] of [[-390, 3], [-100, 8], [190, 12]]) {
    const t = tribunaCoberta({
      comprimento: 270, degraus: 12, altura: 5.4, fundo: 8.2, secoes: 7, publico: 0.58, semente: sem, alcance: 0.7, folga: 18, vao: 56, camisas: CAMISAS_AUSTRIA,
      cores: ["#c8102e", "#f4f4f2", "#c8102e", "#f4f4f2", "#c8102e", "#f4f4f2", "#c8102e"], cobertura: "#e8eaec", estrutura: "#8a9096",
    });
    const o = colocar(tr, add, t, { f: 0.998, lado: oposto, lats: [W / 2 + 46, W / 2 + 70, W / 2 + 100, W / 2 + 130, W / 2 + 160, W / 2 + 200], ao, w: 274, d: 12 * 8.2 + 8, folga: 30, reserva: null });
    if (o) mods.push(o);
  }
  for (const o of mods) reservar(tr, o.x, o.z, o.ry, o.w, o.d, 22); // só depois de todos: um módulo não barra o vizinho
  if (mods.length) somDaTorcida(tr, 0.972, 1.024);
  // a asa: atrás da tribuna principal, no alto, de frente para a reta (o centro de imprensa de vidro sob a lâmina inclinada)
  const asa = asaDeAco({ comprimento: 480, fundo: 96, alto: 64 });
  const a = colocar(tr, add, asa, { f: 0.998, lado: oposto, lats: [W / 2 + 46 + 12 * 8.2 + 96, W / 2 + 46 + 12 * 8.2 + 130, W / 2 + 46 + 12 * 8.2 + 170], ao: -100, w: 486, d: 104, folga: 30, reserva: 24 });
  tr.asaAustria = !!a; if (a) tr.vaziosAustria = [...(tr.vaziosAustria || []), { x: a.x, z: a.z, r: 340 }];
  return { oposto, Z, F, lado };
}

// o paddock atrás dos boxes (as carretas das equipes, as tendas e o estacionamento): é onde sobra espaço, atrás do prédio das garagens
function paddock(tr, { add }, lado, Z, F) {
  const { W } = tr, base = 0.998, lat0 = Z + F + 90;
  const row = carretas({}); // 10 carretas
  const o = colocar(tr, add, row, { f: base, lado, lats: [lat0, lat0 + 40, lat0 + 80], ao: -40, w: 540, d: 70, folga: 30, base: false, reserva: 20, ambos: true });
  const quadros = [];
  [["SPIELBERG", "#c8102e"], ["MURTAL", "#1f5a35"], ["STEIERMARK", "#f2f2f2"]].forEach(([texto, corFaixa], k) => {
    const t = tendaPaddock({ modulos: 3, filas: 2, texto, corFaixa, corMesas: "#c8102e" }); t.scale.setScalar(1.6);
    const q = colocar(tr, add, t, { f: base, lado, lats: [lat0 + 150, lat0 + 190, lat0 + 230], ao: (k - 1) * 230, w: 160, d: 110, folga: 30, base: false, reserva: 20, ambos: true });
    if (q) quadros.push(q);
  });
  acampamento(tr, add, [{ f0: base - 0.026, f1: base + 0.03, lado, lat0: lat0 + 290, lat1: lat0 + 540, dens: 3.2 }], { semente: 91, barracas: 0 }); // o estacionamento: carros e motorhomes
  tr.paddockAustria = { carretas: !!o, tendas: quadros.length };
  if (o) tr.vaziosAustria = [...(tr.vaziosAustria || []), { x: o.x, z: o.z, r: 430 }];
}

// ---------------------------------------------------------------------------------------------------------------------
// 2 a 5. O touro, as tribunas das curvas, os sítios e a capela
// ---------------------------------------------------------------------------------------------------------------------
function touro(tr, { add }) {
  // o touro fica no miolo do circuito, no vale que a 7 (Würth) e a 8 abraçam: o ponto de dentro da volta, mais perto do meio dessas curvas, que cabe a 230 da pista
  const { pts, n, W } = tr, alvo = pts[indice(tr, 0.69)], t = touroDeAco();
  let melhor = null, d0 = Infinity;
  for (let f = 0.62; f <= 0.76; f += 0.01) for (const lado of [-1, 1]) for (let lat = W / 2 + 200; lat <= W / 2 + 560; lat += 24) {
    const p = pts[indice(tr, f)], x = p.x + p.nx * lado * lat, z = p.y + p.ny * lado * lat;
    if (!dentroDaVolta(pts, x, z) || tr.distAt(x, z) < W / 2 + 200 || ocupado(tr, x, z)) continue;
    const d = Math.hypot(x - alvo.x, z - alvo.y); if (d < d0) { d0 = d; melhor = { x, z }; }
  }
  if (!melhor) { (tr.faltouAustria ||= []).push({ nome: "touro", f: 0.69 }); return; }
  // de frente para a pista (para quem passa pela 7 e pela 8): o sentido do ponto mais perto da linha central
  const k = tr.indiceAt(melhor.x, melhor.z), q = pts[k], ry = Math.atan2(q.x - melhor.x, q.y - melhor.z);
  t.position.set(melhor.x, tr.chao(melhor.x, melhor.z) - 0.5, melhor.z); t.rotation.y = ry;
  const monte = new THREE.Mesh(new THREE.CylinderGeometry(104, 156, 120, 28), new THREE.MeshStandardMaterial({ color: 0x5f8a3d, roughness: 1, flatShading: true })); // o montículo de grama sob a sapata
  monte.position.set(0, -60.4, 0); t.add(monte);
  add(t); tr.reservado.push([melhor.x, melhor.z, 150]);
  tr.touroAustria = { x: Math.round(melhor.x), z: Math.round(melhor.z), f: k / n, alto: t.userData.alto };
  tr.vaziosAustria = [...(tr.vaziosAustria || []), { x: melhor.x, z: melhor.z, r: 260 }];
}

function tribunasDasCurvas(tr, { add }) {
  const { W } = tr, tribuna = (comprimento, degraus, sem, cores, cobertura) => tribunaCoberta({
    comprimento, degraus, altura: 5.4, fundo: 8.2, secoes: Math.max(3, Math.round(comprimento / 40)), publico: 0.6, semente: sem, alcance: 0.8, folga: 18, vao: 50, camisas: CAMISAS_AUSTRIA, cores, cobertura, estrutura: "#8a9096",
  });
  const verm = ["#c8102e", "#f4f4f2", "#c8102e", "#f4f4f2"], preta = ["#1f1f22", "#f2c500", "#1f1f22", "#c8102e"];
  // a tribuna da reta de Schönberg, entre a 3 e a 4 (por fora; a reta desce)
  const s = tentar(tr, add, tribuna(220, 10, 31, verm, "#e8eaec"), [0.4, 0.37, 0.43], { lado: -1, lats: [W / 2 + 60, W / 2 + 90, W / 2 + 130, W / 2 + 180, W / 2 + 230, W / 2 + 290], w: 224, d: 10 * 8.2 + 8, folga: 34, ambos: true, reserva: 26 });
  if (s) somDaTorcida(tr, 0.37, 0.43);
  // a da curva 10, por fora, na última curva antes da reta dos boxes
  const t10 = tentar(tr, add, tribuna(240, 11, 41, preta, "#b11226"), [0.893, 0.886, 0.9], { lado: -1, lats: [W / 2 + 60, W / 2 + 90, W / 2 + 130, W / 2 + 180, W / 2 + 230, W / 2 + 290], w: 244, d: 11 * 8.2 + 8, folga: 34, ambos: true, reserva: 26 });
  if (t10) somDaTorcida(tr, 0.875, 0.91);
  // a da curva 1, por fora, no alto da subida
  const t1 = tentar(tr, add, tribuna(210, 10, 51, verm, "#e8eaec"), [0.076, 0.07, 0.083], { lado: -1, lats: [W / 2 + 60, W / 2 + 90, W / 2 + 130, W / 2 + 180, W / 2 + 230, W / 2 + 290], w: 214, d: 10 * 8.2 + 8, folga: 34, ambos: true, reserva: 26 });
  if (t1) somDaTorcida(tr, 0.06, 0.1);
  tr.tribunasAustria = { schonberg: !!s, t10: !!t10, t1: !!t1 };
}

function sitios(tr, { add }) {
  const { W } = tr;
  // as torres de câmera (TV), nas retas: na subida, em Schönberg e na reta de volta
  [[0.19, "subida"], [0.34, "schonberg"], [0.78, "volta"]].forEach(([f, nome]) => {
    const o = tentar(tr, add, torreDeCamera({ alto: 150 }), [f, f + 0.01, f - 0.01], { lado: 1, lats: [W / 2 + 170, W / 2 + 230, W / 2 + 300], w: 30, d: 30, folga: 40, ambos: true, base: false, reserva: 18 });
    if (o) (tr.torresAustria ||= []).push(nome);
  });
  // os sítios da Estíria: casa, celeiro e silo num pasto aberto, por fora da pista, e as casas soltas
  const sit = tentar(tr, add, sitioDaEstiria({ semente: 5 }), [0.15, 0.2, 0.55, 0.25, 0.78], { lado: -1, lats: [W / 2 + 330, W / 2 + 400, W / 2 + 470], w: 300, d: 150, folga: 60, ambos: true, reserva: 40 });
  tr.sitioAustria = !!sit;
  [[[0.12, 0.62, 0.47], 1, 7], [[0.36, 0.32, 0.5], -1, 8], [[0.8, 0.84, 0.74], 1, 9], [[0.56, 0.52, 0.66], -1, 10]].forEach(([fs, lado, sem], k) => {
    const c = casaDaEstiria({ comprimento: 80 + (k % 2) * 24, fundo: 46 + (k % 3) * 6, andares: 2, semente: sem });
    tentar(tr, add, c, fs, { lado, lats: [W / 2 + 250, W / 2 + 320, W / 2 + 400], w: 120, d: 70, folga: 40, ambos: true, reserva: 30 });
  });
  // a capela de aldeia, com a torre de cúpula em cebola, num pasto longe
  const cap = tentar(tr, add, capelaDeBulbo({ escala: 1.15 }), [0.22, 0.4, 0.68, 0.5, 0.9, 0.3], { lado: 1, lats: [W / 2 + 420, W / 2 + 500, W / 2 + 580], w: 60, d: 80, folga: 60, ambos: true, reserva: 40 });
  tr.capelaAustria = !!cap;
}

// as encostas onde a galera assiste de pé e sentada (e o camping do alto): atrás da barreira, nos três lados fechados
function encostas(tr, ctx) {
  const { add } = ctx, { W } = tr, z = (f0, f1, lado, lat0, lat1, dens, bandeiras = 0.12) => ({ f0, f1, lado, lat0: W / 2 + lat0, lat1: W / 2 + lat1, dens, bandeiras });
  const zonas = [
    z(0.058, 0.102, -1, 44, 170, 5.5, 0.18), // a curva 1, a encosta de fora, no alto da subida
    z(0.12, 0.2, -1, 44, 120, 1.6), z(0.12, 0.2, 1, 44, 110, 1.2), // a subida: pouca gente atrás da cerca
    z(0.268, 0.312, -1, 44, 190, 6.5, 0.2), z(0.268, 0.312, 1, 44, 120, 2.6), // a curva 3, o grampo do alto: a encosta de fora cheia
    z(0.318, 0.46, -1, 44, 110, 1.5), z(0.318, 0.46, 1, 44, 100, 1.3), // a reta de Schönberg, em descida
    z(0.462, 0.505, -1, 44, 180, 6.5, 0.2), // a curva 4
    z(0.505, 0.54, -1, 44, 130, 3.5), // a curva 5
    z(0.572, 0.626, 1, 44, 150, 5.2, 0.18), // a curva 6, por fora
    z(0.652, 0.74, -1, 44, 130, 3.2), // a 7 e a 8, a beira do miolo
    z(0.828, 0.862, -1, 44, 170, 5.5, 0.2), // a curva 9
    z(0.874, 0.912, -1, 44, 190, 6.5, 0.22), // a curva 10
  ];
  torcidaNasEncostas(tr, add, zonas, { semente: 7771, camisas: CAMISAS_AUSTRIA });
  tr.zonasAustria = [...zonas]; // a mata não cobre a galera: o bosque pula as faixas das encostas e do acampamento
  for (const q of zonas) if (q.dens >= 3) somDaTorcida(tr, q.f0, q.f1);
  const camps = [
    { f0: 0.268, f1: 0.31, lado: -1, lat0: W / 2 + 230, lat1: W / 2 + 380, dens: 2.2 }, // o camping do alto, atrás do grampo da 3
    { f0: 0.872, f1: 0.912, lado: -1, lat0: W / 2 + 240, lat1: W / 2 + 400, dens: 2.4 }, // e atrás da 10
    { f0: 0.46, f1: 0.5, lado: -1, lat0: W / 2 + 220, lat1: W / 2 + 360, dens: 1.8 },
  ];
  acampamento(tr, add, camps, { semente: 3301 });
  tr.zonasAustria.push(...camps);
}

// ---------------------------------------------------------------------------------------------------------------------
// 6. As placas com o número e o nome de cada curva
// ---------------------------------------------------------------------------------------------------------------------
const CURVAS = [["1", "NIKI LAUDA", 0.0755], ["2", "", 0.22], ["3", "REMUS", 0.2925], ["4", "SCHLOSSGOLD", 0.4847], ["5", "", 0.512], ["6", "RAUCH", 0.6011],
  ["7", "WÜRTH", 0.6739], ["8", "", 0.7159], ["9", "RINDT", 0.8463], ["10", "", 0.8962]];
function placasDasCurvas(tr, { add }) {
  const { pts, n, W } = tr, vs = [], uv = [], idx = [], m = new Montador(), S = solido();
  const atlas = canvasTex(1024, 384, (x) => {
    CURVAS.forEach(([num, nome], k) => {
      const c = k % 4, rr = Math.floor(k / 4), x0 = c * 256, y0 = rr * 128;
      x.fillStyle = "#f6f6f2"; x.fillRect(x0, y0, 256, 128); x.fillStyle = "#c8102e"; x.fillRect(x0, y0, 256, 16); x.fillStyle = "#ffffff"; x.fillRect(x0, y0 + 16, 256, 5); x.fillStyle = "#c8102e"; x.fillRect(x0, y0 + 21, 256, 5);
      x.fillStyle = "#15161a"; x.textAlign = "center"; x.textBaseline = "middle";
      if (nome) { x.font = "900 54px Arial, sans-serif"; x.fillText(num, x0 + 40, y0 + 74); x.font = "900 29px Arial, sans-serif"; x.fillText(nome, x0 + 150, y0 + 76, 160); } else { x.font = "900 66px Arial, sans-serif"; x.fillText(`CURVA ${num}`, x0 + 128, y0 + 76, 230); }
      x.strokeStyle = "#15161a"; x.lineWidth = 4; x.strokeRect(x0 + 2, y0 + 2, 252, 124);
    });
  }, false);
  CURVAS.forEach(([, , f], k) => {
    const i = indice(tr, f), p = pts[i], fora = -sinalDaCurva(pts, n, i);
    let escolhido = null;
    for (const lado of [fora, -fora]) {
      for (const d of [W / 2 + 56, W / 2 + 78, W / 2 + 100, W / 2 + 130, W / 2 + 170, W / 2 + 220]) {
        const x = p.x + p.nx * lado * d, z = p.y + p.ny * lado * d, rm = tr.murosEscape?.[lado]?.[i] || 0;
        if (d < W / 2 + rm + 10) continue; // a placa fica atrás da barreira
        const gx = -lado * p.nx - 0.55 * p.tx, gz = -lado * p.ny - 0.55 * p.ty, gl = Math.hypot(gx, gz), qx = (gz / gl) * 48, qz = (-gx / gl) * 48; // as pontas da placa (96 de largura) também têm que ficar fora da pista
        if (tr.distAt(x, z) >= d - 8 && tr.distAt(x + qx, z + qz) >= W / 2 + 16 && tr.distAt(x - qx, z - qz) >= W / 2 + 16 && !ocupado(tr, x, z)) { escolhido = [lado, x, z]; break; }
      }
      if (escolhido) break;
    }
    if (!escolhido) return;
    const [lado, x, z] = escolhido, y = tr.chao(x, z) - 1.5;
    // a placa gira um pouco para quem vem de trás (a frente aponta para a pista e um pouco contra o sentido da corrida)
    const nx = -lado * p.nx - 0.55 * p.tx, nz = -lado * p.ny - 0.55 * p.ty, len = Math.hypot(nx, nz), ex = nz / len, ez = -nx / len;
    const w = 96, h = 36, y0 = y + 22, c = k % 4, rr = Math.floor(k / 4), base = vs.length / 3;
    for (const [a, b] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) { vs.push(x + ex * a * w / 2, y0 + b * h, z + ez * a * w / 2); uv.push(((a + 1) / 2 + c) / 4, 1 - (rr + 1 - b) / 3); }
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    for (const s of [-1, 1]) m.caixa(S, [x + ex * s * (w / 2 - 6), y + 13, z + ez * s * (w / 2 - 6)], [2.4, 28, 2.4], { cor: "#d9dbdd", ry: Math.atan2(ex, ez) });
    tr.reservado.push([x, z, 28]);
  });
  if (!idx.length) return;
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const placa = add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.6, side: THREE.DoubleSide }))); placa.castShadow = true; placa.name = `${tr.id}-placas-curvas`;
  add(m.montar("redbullring-placas-curvas-postes"));
  tr.placasAustria = idx.length / 6;
}

// ---------------------------------------------------------------------------------------------------------------------
// O antes (cenario) e o depois (depois) do GP
// ---------------------------------------------------------------------------------------------------------------------
export function cenarioRedBullRing(tr, ctx) {
  tr.reservado ||= [];
  tr.camisasGP = CAMISAS_AUSTRIA; // a torcida solta de vida.js também veste laranja, vermelho e branco
  const { lado, Z, F } = retaDosBoxes(tr, ctx);
  paddock(tr, ctx, lado, Z, F);
  touro(tr, ctx);
  tribunasDasCurvas(tr, ctx);
  sitios(tr, ctx);
  encostas(tr, ctx);
  placasDasCurvas(tr, ctx);
}

export function depoisRedBullRing(tr, ctx) {
  const { add } = ctx, ab = abertura(tr, ANGULO_DO_VALE);
  // a mata de abetos em manchas (o pasto fica limpo), com a borda de lariços e bétulas; depois os morros verdes, a mata de longe e as montanhas
  bosqueDaBeira(tr, add, { recuo: 74, fundo: 320, alturas: [170, 300], densidade: 1.9, semente: 4242, evitar: tr.zonasAustria });
  const rel = encostasVerdes(tr, add, { fecho: ab.fecho, vazio: (tr.vaziosAustria || []).map((v) => [v.x, v.z, v.r]) });
  florestaDeLonge(tr, add, rel, { fecho: ab.fecho });
  serrasDaEstiria(tr, add, { fecho: ab.fecho });
  fardosNosPastos(tr, add, {});
  // a faixa do circuito no pórtico da largada (o de pista.js): uma de cada lado da viga, a da frente com a normal contra o sentido da volta
  const p = tr.pts[0], L = tr.W / 2 + 14, rot = -Math.atan2(p.ny, p.nx);
  for (const s of [1, -1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(2 * L - 6, 8.4), new THREE.MeshBasicMaterial({ map: marcaTex("pistas", 1024, 64), side: THREE.FrontSide }));
    f.position.set(p.x, p.h + 62, p.y); f.rotation.y = rot + (s > 0 ? 0 : Math.PI); f.translateZ(1.7); add(f);
  }
  // as bandeiras da Áustria e da Estíria em hastes altas ao lado da linha de chegada
  const bandeiras = [];
  for (const lado of [-1, 1]) for (const ao of [-110, 110]) {
    const x = p.x + p.nx * lado * (tr.W / 2 + 40) + p.tx * ao, zz = p.y + p.ny * lado * (tr.W / 2 + 40) + p.ty * ao;
    if (livre(tr, x, zz, 30) && !ocupado(tr, x, zz)) bandeiras.push({ x, y: tr.chao(x, zz) - 1.5, z: zz, tipo: lado > 0 ? 0 : 1, r: -Math.atan2(p.ty, p.tx) + Math.PI / 2, s: 2.4, alto: 70 });
  }
  bandeirasDaTorcida(tr, add, bandeiras);
}
