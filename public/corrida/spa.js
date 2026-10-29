// Spa-Francorchamps (Circuit de Spa-Francorchamps, GP da Bélgica, nas Ardenas): o que só o circuito tem, em cima do kit 2. O resto
// (zebras vermelhas e brancas, escape de brita, arquibancadas de curva, painéis, passarelas e som) é do kit, na configuração de
// gps/spa.js; as peças exclusivas estão em kit/spa/. Aqui, na ordem em que aparecem pela volta (frações da volta, a partir da chegada):
// 1. a reta dos boxes (0,965-1,015): o prédio das garagens com o Paddock Club e a torre de controle de vidro (kit/spa/predios.js), do lado de
//    dentro da La Source, e a tribuna principal coberta do outro lado, de torcida laranja e belga, com o paddock e o estacionamento atrás;
// 2. La Source (0,037): o grampo, com as arquibancadas por fora, a casa de enxaimel (o "hotel") e o asfalto de escape vermelho e amarelo;
// 3. a descida até o Eau Rouge (0,055-0,125), o riacho que dá o nome à curva (água avermelhada de ferro, sob a pista) e a subida do Raidillon
//    (0,125-0,185), com a tribuna gigante de três andares por fora, a arquibancada e as encostas de torcida por dentro e a casa branca do topo;
// 4. a reta de Kemmel (0,19-0,31) entre o abetal alto; Les Combes (0,32-0,36), Malmedy (0,365) e a torre de TV;
// 5. a Bruxelles (0,42, o grampo à direita), a descida de Pouhon (0,515-0,575, a dupla à esquerda, com o asfalto verde-água e a encosta cheia
//    de gente), Fagnes (0,625), Stavelot (0,69, com o sítio) e a reta até Blanchimont (0,82-0,88, o acampamento laranja);
// 6. o Bus Stop (0,945-0,96), as placas com o nome de cada curva, o muro de pneus, a barreira de aço com a cerca verde e a faixa do circuito
//    no pórtico da largada;
// 7. o abetal que fecha a pista dos dois lados, as folhosas, os morros verdes e a mata de longe (kit/spa/floresta.js).
// O pórtico da largada é o de pista.js (as cinco luzes): atravessa a pista (perpendicular, pela normal) na linha de chegada, e a faixa fica DE
// FRENTE para os carros (a normal do plano aponta contra o sentido da volta). Tudo é cenário: nada fica dentro da pista (livre/ocupado).
import * as THREE from "three";
import { canvasTex, M } from "./cena.js";
import { marcaTex } from "./kit/marcas.js";
import { livre, ocupado, recortar, sorteio, sinalDaCurva } from "./kit/comum.js";
import { tribunaCoberta, tendaPaddock } from "./kit/coberturas.js";
import { Montador, solido } from "./kit/montagem.js";
import { registrarMarcasSpa } from "./kit/spa/marcas.js";
import { predioDosBoxes, tribunaDoRaidillon, chaleArdenas, fazenda, carretas, torreDeTV } from "./kit/spa/predios.js";
import { barreiras, muroDePneus, escapePintado } from "./kit/spa/barreiras.js";
import { torcidaNasEncostas, acampamento, bandeirasDaTorcida, CAMISAS_SPA } from "./kit/spa/torcida.js";
import { colinas, bosqueDaBeira, florestaDeLonge } from "./kit/spa/floresta.js";

registrarMarcasSpa();

const indice = (tr, f) => ((Math.floor(f * tr.n) % tr.n) + tr.n) % tr.n;

// Põe um grupo (origem no meio da frente, frente para +z) a `lat` do eixo, do lado `lado`, em f e `ao` ao longo da pista, de frente para a pista.
function pousar(tr, g, f, lado, lat, ao = 0) {
  const p = tr.pts[indice(tr, f)], x = p.x + p.nx * lado * lat + p.tx * ao, z = p.y + p.ny * lado * lat + p.ty * ao, ry = Math.atan2(-lado * p.nx, -lado * p.ny);
  g.position.set(x, tr.chao(x, z) - 1, z); g.rotation.y = ry;
  return { x, z, ry, p };
}
// o ponto (u para o lado da peça, v para trás a partir da frente) de um grupo de frente `ry` posto em (x, z)
const mundo = (x, z, ry, u, v) => [x + Math.cos(ry) * u - Math.sin(ry) * v, z - Math.sin(ry) * u - Math.cos(ry) * v];
// a pegada w × d cabe? Nove pontos (cantos, meios e centro) a mais de `folga` da borda da pista e fora do que já foi reservado
function cabe(tr, x, z, ry, w, d, folga = 24) {
  for (const u of [-w / 2, 0, w / 2]) for (const v of [0, d / 2, d]) {
    const [px, pz] = mundo(x, z, ry, u, v);
    if (tr.distAt(px, pz) < tr.W / 2 + folga || ocupado(tr, px, pz)) return false;
  }
  return true;
}
// reserva a pegada (círculos ao longo da largura): as árvores, a torcida e o resto não entram
function reservar(tr, x, z, ry, w, d, folga = 22) {
  const r = d / 2 + folga, passo = Math.max(20, d * 0.7);
  for (let u = -w / 2; u <= w / 2 + 0.1; u += passo) { const [px, pz] = mundo(x, z, ry, u, d / 2); tr.reservado.push([px, pz, r]); }
}
// o aterro de terra verde sob a peça: o chão desce para longe da pista e a peça não pode ficar flutuando
function aterro(g, w, d, fundo = 130) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w + 4, fundo, d + 4), M(0x56703c, { roughness: 1 })); b.position.set(0, -fundo / 2 - 0.4, -d / 2); g.add(b); return b;
}
// tenta em cada deslocamento da lista, do lado `lado` e depois do outro (se `ambos`); põe, reserva e devolve onde ficou (ou null)
function colocar(tr, add, g, { nome = g.name, f, lado, lats, ao = 0, w, d, folga = 24, ambos = false, base = true, reserva = 22 }) {
  for (const l of ambos ? [lado, -lado] : [lado]) for (const lat of lats) {
    const p = tr.pts[indice(tr, f)], x = p.x + p.nx * l * lat + p.tx * ao, z = p.y + p.ny * l * lat + p.ty * ao, ry = Math.atan2(-l * p.nx, -l * p.ny);
    if (!cabe(tr, x, z, ry, w, d, folga)) continue;
    pousar(tr, g, f, l, lat, ao); if (base) aterro(g, w, d); add(g); if (reserva !== null) reservar(tr, x, z, ry, w, d, reserva);
    (tr.pecasSpa ||= []).push({ nome, f: +f.toFixed(4), ao, lado: l, lat: Math.round(lat), x: Math.round(x), z: Math.round(z), ry, w, d });
    return { x, z, ry, w, d, lado: l, lat };
  }
  (tr.faltouSpa ||= []).push({ nome, f });
  return null;
}
// o som da torcida (kit/som.js): de f0 a f1
const somDaTorcida = (tr, f0, f1) => (tr.arquibancadas ||= []).push([indice(tr, f0), indice(tr, f1)]);

// ---------------------------------------------------------------------------------------------------------------------
// 1. A reta dos boxes
// ---------------------------------------------------------------------------------------------------------------------
function retaDosBoxes(tr, { add }) {
  const { n, W } = tr, lado = tr.t.boxes?.lado ?? 1, Z = W / 2 + 84, F = 46;
  // o prédio acompanha a reta: onde La Source (ou o Bus Stop) chegam perto, ele termina
  const rec = recortar(tr, Math.floor(0.958 * n), Math.floor(1.016 * n), [lado * (Z - 4), lado * (Z + F + 4)], 4);
  if (rec) {
    const comp = Math.min(660, (rec.i1 - rec.i0) * 6 - 24), meio = Math.floor((rec.i0 + rec.i1) / 2);
    const linha = ((n - meio) * 6) * (lado > 0 ? -1 : 1); // onde a linha de chegada cai no prédio (o +x local anda contra a volta do lado +1)
    const predio = predioDosBoxes({ comprimento: comp, fundo: F, torre: Math.max(-comp / 2 + 90, Math.min(comp / 2 - 90, linha)) });
    const q = pousar(tr, predio, (meio % n) / n, lado, Z); add(predio);
    reservar(tr, q.x, q.z, q.ry, comp, F + 30, 40);
    tr.predioSpa = { f: meio / n, comprimento: comp, lado };
  }
  // a tribuna principal, do outro lado: três módulos cobertos de frente para a pista, de torcida laranja e belga
  const oposto = -lado, mods = [];
  for (const [ao, sem] of [[-390, 3], [-100, 8], [190, 12]]) {
    const t = tribunaCoberta({
      comprimento: 270, degraus: 12, altura: 5.4, fundo: 8.2, secoes: 7, publico: 0.55, semente: sem, alcance: 0.7, folga: 18, vao: 56, camisas: CAMISAS_SPA,
      cores: ["#1f1f22", "#f2c500", "#c8102e", "#1f1f22", "#f2c500", "#c8102e", "#f4f4f2"], cobertura: "#b11226", estrutura: "#8a9096",
    });
    const o = colocar(tr, add, t, { f: 0.998, lado: oposto, lats: [W / 2 + 46, W / 2 + 70], ao, w: 274, d: 12 * 8.2 + 8, folga: 30, reserva: null });
    if (o) mods.push(o);
  }
  for (const o of mods) reservar(tr, o.x, o.z, o.ry, o.w, o.d, 22); // só depois de todos: um módulo não barra o vizinho
  if (mods.length) somDaTorcida(tr, 0.972, 1.024);
  return { oposto, Z };
}

// o paddock atrás da tribuna principal (as carretas das equipes, as tendas e o estacionamento): é onde sobra espaço, do lado de fora da reta
function paddock(tr, { add }, lado) {
  const { W } = tr, base = 0.998, lat0 = W / 2 + 46 + 12 * 8.2 + 110;
  const row = carretas({}); // 10 carretas
  const o = colocar(tr, add, row, { f: base, lado, lats: [lat0, lat0 + 40], ao: 0, w: 540, d: 70, folga: 30, base: false, reserva: 20 });
  const quadros = [];
  [["SPA", "#c8102e"], ["ARDENNES", "#1f4f2c"], ["WALLONIE", "#fdda24"]].forEach(([texto, corFaixa], k) => {
    const t = tendaPaddock({ modulos: 3, filas: 2, texto, corFaixa, corMesas: "#c8102e" }); t.scale.setScalar(1.6);
    const q = colocar(tr, add, t, { f: base, lado, lats: [lat0 + 130, lat0 + 170], ao: (k - 1) * 230, w: 160, d: 110, folga: 30, base: false, reserva: 20 });
    if (q) quadros.push(q);
  });
  // o estacionamento: carros e motorhomes em fileiras, atrás de tudo
  acampamento(tr, add, [{ f0: base - 0.026, f1: base + 0.03, lado, lat0: lat0 + 270, lat1: lat0 + 520, dens: 3.2 }], { semente: 91, barracas: 0 });
  tr.paddockSpa = { carretas: !!o, tendas: quadros.length };
  if (o) tr.vaziosSpa = [...(tr.vaziosSpa || []), { x: o.x, z: o.z, r: 520 }];
}

// ---------------------------------------------------------------------------------------------------------------------
// 2. La Source, o Eau Rouge e o Raidillon
// ---------------------------------------------------------------------------------------------------------------------
function laSource(tr, { add }) {
  const { W } = tr;
  // a casa de enxaimel (o "hotel" da curva), atrás da arquibancada do grampo, e outra mais para trás
  const hotel = chaleArdenas({ comprimento: 150, fundo: 70, andares: 3, semente: 1 });
  const a = colocar(tr, add, hotel, { f: 0.0375, lado: -1, lats: [W / 2 + 280, W / 2 + 330, W / 2 + 390], w: 156, d: 80, folga: 40, ambos: false, reserva: 30 });
  const casa = chaleArdenas({ comprimento: 100, fundo: 54, andares: 2, semente: 4 });
  const b = colocar(tr, add, casa, { f: 0.052, lado: -1, lats: [W / 2 + 330, W / 2 + 400], ao: 40, w: 104, d: 62, folga: 40, reserva: 30 });
  tr.laSourceSpa = { hotel: !!a, casa: !!b };
}

function eauRouge(tr, { add }) {
  const { W, pts } = tr;
  // a tribuna gigante do Raidillon, por fora da subida, de frente para a pista
  const g = tribunaDoRaidillon({ comprimento: 230, degraus: 12, camisas: CAMISAS_SPA, semente: 21 });
  const o = colocar(tr, add, g, { f: 0.153, lado: -1, lats: [W / 2 + 56, W / 2 + 84, W / 2 + 120], w: 236, d: 12 * 8 + 30, folga: 34, reserva: 30 });
  if (o) somDaTorcida(tr, 0.14, 0.17);
  // a casa branca do topo (o café do Raidillon), onde a pista sai da subida
  const casa = chaleArdenas({ comprimento: 96, fundo: 52, andares: 2, semente: 7, teto: "#5a4a3c" });
  colocar(tr, add, casa, { f: 0.184, lado: -1, lats: [W / 2 + 150, W / 2 + 190, W / 2 + 240], w: 100, d: 60, folga: 36, ambos: true, reserva: 30 });
  // o riacho Eau Rouge: a água avermelhada de ferro que passa sob a pista no fundo do vale (só se vê dos dois lados)
  const agua = new THREE.MeshStandardMaterial({ color: 0x7a4636, roughness: 0.2, metalness: 0.15, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const vs = [], idx = [], i0 = indice(tr, 0.1255), p = pts[i0];
  for (const lado of [-1, 1]) {
    const base = vs.length / 3, passos = 24;
    for (let k = 0; k <= passos; k++) {
      const lat = W / 2 + 36 + (k / passos) * 330, ao = Math.sin(k * 0.7) * 22, lar = 6 + Math.sin(k * 0.45 + 1) * 1.6;
      const cx = p.x + p.nx * lado * lat + p.tx * ao, cz = p.y + p.ny * lado * lat + p.ty * ao;
      if (tr.distAt(cx, cz) < lat - 6) { if (k) break; else continue; } // não atravessa outro trecho da pista
      for (const s of [-1, 1]) { const x = cx + p.tx * s * lar, z = cz + p.ty * s * lar; vs.push(x, tr.chao(x, z) - 0.9, z); }
      const q = vs.length / 3 - 2; if (q - 2 >= base) idx.push(q - 2, q, q - 1, q - 1, q, q + 1);
    }
  }
  if (idx.length) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = add(new THREE.Mesh(geo, agua)); m.name = `${tr.id}-riacho`; tr.riachoSpa = idx.length / 3;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// 3. Torres de TV, o sítio de Stavelot, as casas e as encostas de torcida
// ---------------------------------------------------------------------------------------------------------------------
function torresEsitios(tr, { add }) {
  const { W } = tr;
  for (const [f, lado, nome] of [[0.34, 1, "combes"], [0.512, 1, "pouhon"], [0.215, -1, "kemmel"]]) {
    const t = torreDeTV({ alto: 170 });
    const o = colocar(tr, add, t, { f, lado, lats: [W / 2 + 170, W / 2 + 230, W / 2 + 300], w: 30, d: 30, folga: 40, ambos: true, base: false, reserva: 18 });
    if (o) (tr.torresSpa ||= []).push(nome);
  }
  // o sítio de Stavelot: casa, celeiro e silo num pasto aberto por fora da curva
  const faz = fazenda({ semente: 5 });
  const s = colocar(tr, add, faz, { f: 0.7, lado: -1, lats: [W / 2 + 330, W / 2 + 400, W / 2 + 470], w: 300, d: 150, folga: 60, ambos: true, reserva: 40 });
  tr.fazendaSpa = !!s;
  // casas de enxaimel espalhadas atrás das curvas famosas
  [[0.405, -1, 5], [0.34, -1, 8], [0.8, 1, 9], [0.545, 1, 10]].forEach(([f, lado, sem], k) => {
    const c = chaleArdenas({ comprimento: 80 + (k % 2) * 24, fundo: 46 + (k % 3) * 6, andares: 2, semente: sem });
    colocar(tr, add, c, { f, lado, lats: [W / 2 + 250, W / 2 + 320, W / 2 + 400], w: 110, d: 66, folga: 40, ambos: true, reserva: 30 });
  });
}

// as encostas onde a galera assiste de pé e sentada (e o camping laranja de Blanchimont e do Eau Rouge)
function encostas(tr, ctx) {
  const { add } = ctx, { W } = tr, z = (f0, f1, lado, lat0, lat1, dens, bandeiras = 0.12) => ({ f0, f1, lado, lat0: W / 2 + lat0, lat1: W / 2 + lat1, dens, bandeiras });
  const zonas = [
    z(0.065, 0.118, -1, 44, 150, 5), z(0.118, 0.14, 1, 44, 150, 7, 0.2), z(0.138, 0.178, 1, 44, 130, 7, 0.2), // a descida e o Eau Rouge (a encosta de dentro)
    z(0.2, 0.3, -1, 44, 110, 1.4), z(0.215, 0.3, 1, 44, 110, 1.4), // Kemmel: pouca gente atrás da cerca
    z(0.318, 0.36, -1, 44, 140, 5, 0.2), z(0.318, 0.36, 1, 44, 130, 4), // Les Combes
    z(0.402, 0.44, -1, 44, 150, 6, 0.18), // Bruxelles
    z(0.515, 0.575, 1, 44, 170, 8, 0.2), z(0.52, 0.568, -1, 44, 100, 3), // Pouhon: a encosta cheia
    z(0.62, 0.66, -1, 44, 120, 3), z(0.66, 0.7, 1, 44, 120, 3), // Fagnes e Stavelot
    z(0.82, 0.875, 1, 44, 160, 8, 0.25), // Blanchimont
    z(0.935, 0.962, 1, 44, 100, 3), z(0.935, 0.962, -1, 44, 100, 3), // o Bus Stop
  ];
  torcidaNasEncostas(tr, add, zonas, { semente: 7771, camisas: CAMISAS_SPA });
  // a mata não cobre a galera: o abetal pula as faixas das encostas e do acampamento (tr.zonasSpa, lidas por bosqueDaBeira)
  tr.zonasSpa = [...zonas];
  for (const q of zonas) somDaTorcida(tr, q.f0, q.f1);
  // o acampamento laranja: Blanchimont (por fora da curva) e o alto do Eau Rouge
  const camps = [
    { f0: 0.83, f1: 0.87, lado: 1, lat0: W / 2 + 190, lat1: W / 2 + 330, dens: 2.6 },
    { f0: 0.155, f1: 0.2, lado: 1, lat0: W / 2 + 160, lat1: W / 2 + 300, dens: 2 },
    { f0: 0.532, f1: 0.57, lado: 1, lat0: W / 2 + 200, lat1: W / 2 + 330, dens: 1.8 },
  ];
  acampamento(tr, add, camps, { semente: 3301 });
  tr.zonasSpa.push(...camps);
}

// ---------------------------------------------------------------------------------------------------------------------
// 4. As placas com o nome de cada curva
// ---------------------------------------------------------------------------------------------------------------------
const CURVAS = [["LA SOURCE", 0.0375], ["EAU ROUGE", 0.1255], ["RAIDILLON", 0.147], ["LES COMBES", 0.327], ["MALMEDY", 0.367], ["BRUXELLES", 0.418],
  ["POUHON", 0.54], ["FAGNES", 0.627], ["STAVELOT", 0.693], ["BLANCHIMONT", 0.848], ["BUS STOP", 0.95]];
function placasDasCurvas(tr, { add }) {
  const { pts, n, W } = tr, vs = [], uv = [], idx = [], m = new Montador(), S = solido();
  const atlas = canvasTex(1024, 384, (x) => {
    CURVAS.forEach(([nome], k) => {
      const c = k % 4, rr = Math.floor(k / 4), x0 = c * 256, y0 = rr * 128;
      x.fillStyle = "#f6f6f2"; x.fillRect(x0, y0, 256, 128); x.fillStyle = "#15161a"; x.fillRect(x0, y0, 256, 14); x.fillStyle = "#fdda24"; x.fillRect(x0, y0 + 14, 256, 8); x.fillStyle = "#ef3340"; x.fillRect(x0, y0 + 22, 256, 8);
      x.fillStyle = "#15161a"; x.font = "900 34px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(nome, x0 + 128, y0 + 78, 232);
      x.strokeStyle = "#15161a"; x.lineWidth = 4; x.strokeRect(x0 + 2, y0 + 2, 252, 124);
    });
  }, false);
  CURVAS.forEach(([, f], k) => {
    const i = indice(tr, f), p = pts[i], fora = -sinalDaCurva(pts, n, i);
    let escolhido = null;
    for (const lado of [fora, -fora]) {
      for (const d of [W / 2 + 56, W / 2 + 78]) {
        const x = p.x + p.nx * lado * d, z = p.y + p.ny * lado * d;
        if (tr.distAt(x, z) >= d - 8 && !ocupado(tr, x, z)) { escolhido = [lado, x, z]; break; }
      }
      if (escolhido) break;
    }
    if (!escolhido) return;
    const [lado, x, z] = escolhido, y = tr.chao(x, z) - 1.5;
    // a placa gira um pouco para quem vem de trás (a frente aponta para a pista e um pouco contra o sentido da corrida)
    const nx = -lado * p.nx - 0.55 * p.tx, nz = -lado * p.ny - 0.55 * p.ty, len = Math.hypot(nx, nz), ex = nz / len, ez = -nx / len; // (ex, ez): o eixo largo da placa
    const w = 96, h = 36, y0 = y + 22, c = k % 4, rr = Math.floor(k / 4), base = vs.length / 3;
    for (const [a, b] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) { vs.push(x + ex * a * w / 2, y0 + b * h, z + ez * a * w / 2); uv.push(((a + 1) / 2 + c) / 4, 1 - (rr + 1 - b) / 3); }
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    for (const s of [-1, 1]) m.caixa(S, [x + ex * s * (w / 2 - 6), y + 13, z + ez * s * (w / 2 - 6)], [2.4, 28, 2.4], { cor: "#d9dbdd", ry: Math.atan2(ex, ez) });
    tr.reservado.push([x, z, 28]);
  });
  if (!idx.length) return;
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const placa = add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.6, side: THREE.DoubleSide }))); placa.castShadow = true; placa.name = `${tr.id}-placas-curvas`;
  add(m.montar("spa-placas-curvas-postes"));
  tr.placasSpa = idx.length / 6;
}

// ---------------------------------------------------------------------------------------------------------------------
// O antes (cenario) e o depois (depois) do GP
// ---------------------------------------------------------------------------------------------------------------------
export function cenarioSpa(tr, ctx) {
  tr.reservado ||= [];
  tr.camisasGP = CAMISAS_SPA; // a torcida solta de vida.js também veste laranja, preto, amarelo e vermelho
  const { oposto } = retaDosBoxes(tr, ctx);
  paddock(tr, ctx, oposto);
  laSource(tr, ctx);
  eauRouge(tr, ctx);
  torresEsitios(tr, ctx);
  escapePintado(tr, ctx.add, { // o asfalto pintado: verde-água em Pouhon, Stavelot e Blanchimont; vermelho e amarelo na La Source e na saída do Eau Rouge
    verde: [[0.514, 0.578, "fora"], [0.684, 0.714, "fora"], [0.828, 0.874, "fora"]],
    vermelho: [[0.026, 0.052, "fora"], [0.118, 0.16, 1]],
  });
  muroDePneus(tr, ctx.add, [[0.027, 0.05, "fora"], [0.324, 0.35, "fora"], [0.41, 0.432, "fora"], [0.943, 0.963, 0], [0.62, 0.645, "fora"]]);
  barreiras(tr, ctx.add, {});
  encostas(tr, ctx);
  placasDasCurvas(tr, ctx);
}

export function depoisSpa(tr, ctx) {
  const { add } = ctx;
  // o abetal que fecha a pista dos dois lados, com as folhosas na borda, e depois os morros e a mata de longe (kit/spa/floresta.js)
  bosqueDaBeira(tr, add, { recuo: 74, fundo: 320, alturas: [170, 310], densidade: 2.0, semente: 4242, evitar: tr.zonasSpa });
  const rel = colinas(tr, add, { vazio: (tr.vaziosSpa || []).map((v) => [v.x, v.z, v.r]) });
  florestaDeLonge(tr, add, rel, {});
  // a faixa do circuito no pórtico da largada (o de pista.js): uma de cada lado da viga, a da frente com a normal contra o sentido da volta
  const p = tr.pts[0], L = tr.W / 2 + 14, rot = -Math.atan2(p.ny, p.nx);
  for (const s of [1, -1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(2 * L - 6, 8.4), new THREE.MeshBasicMaterial({ map: marcaTex("spa", 1024, 64), side: THREE.FrontSide }));
    f.position.set(p.x, p.h + 62, p.y); f.rotation.y = rot + (s > 0 ? 0 : Math.PI); f.translateZ(1.7); add(f);
  }
  // as bandeiras da Bélgica e da Holanda nos mastros do pórtico: duas hastes altas ao lado da linha de chegada
  const bandeiras = [];
  for (const lado of [-1, 1]) for (const ao of [-90, 90]) { const x = p.x + p.nx * lado * (tr.W / 2 + 40) + p.tx * ao, zz = p.y + p.ny * lado * (tr.W / 2 + 40) + p.ty * ao; if (livre(tr, x, zz, 30) && !ocupado(tr, x, zz)) bandeiras.push({ x, y: tr.chao(x, zz) - 1.5, z: zz, tipo: lado > 0 ? 0 : 1, r: -Math.atan2(p.ty, p.tx) + Math.PI / 2, s: 2.4, alto: 70 }); }
  bandeirasDaTorcida(tr, add, bandeiras);
}
