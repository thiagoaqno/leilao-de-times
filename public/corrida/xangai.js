// Xangai (Shanghai International Circuit, GP da China, em Jiading): o que só o circuito tem, em cima do kit 2. O resto (zebras, escape de brita,
// arquibancadas de curva, painéis, passarelas e som) é do kit, na configuração de gps/xangai.js; as peças exclusivas estão em kit/xangai/. Aqui, na
// ordem em que aparecem pela volta (frações da volta, a partir da linha de chegada, que fica NO MEIO da reta dos boxes, onde o corredor de `boxes` em
// pistas.js tem a parada no 0; o traçado vai para oeste e a curva 1 é à direita):
// 1. a reta dos boxes (de -0,03 a 0,05): o prédio das garagens, comprido e baixo, do lado esquerdo (o lado de fora, sul), com a torre de controle
//    sobre o teto no meio e uma torre de vidro em cada ponta; as duas asas em forma de folha, que atravessam a reta dos boxes à tribuna do outro lado
//    (a ponte branca de ventre de vidro, com os mastros e os estais), e a tribuna principal coberta, de torcida vermelha e amarela, entre as torres;
// 2. o paddock atrás dos boxes: o lago, com os pavilhões das equipes em forma de folha de lótus sobre palafitas, ligados por passadiços e pelos
//    caminhos até a porta de trás do prédio (kit/xangai/lotus.js, água em kit/xangai/agua.js);
// 3. o caracol das curvas 1 e 2 (0,05-0,105): a arquibancada enorme por fora do giro, de 16 degraus, com o telão;
// 4. as outras curvas de grampo com a sua arquibancada por fora, e a curva 14 (o grampo no fim da reta de trás de 1,2 km, 0,79-0,835), com a
//    arquibancada grande, o telão e as placas de frenagem;
// 5. os lagos e canais em volta, a vegetação baixa do parque (arbustos, canforeiras, salgueiros, juncos, bambu) e o skyline de Xangai no horizonte,
//    na névoa: a Torre da Pérola Oriental, o Jin Mao, o Shanghai World Financial Center e a Shanghai Tower (kit/xangai/cidade.js).
// Tudo é cenário: nada fica dentro da pista (livre/ocupado) e a física é a de sempre.
import * as THREE from "three";
import { marcaTex } from "./kit/marcas.js";
import { tribunaCoberta } from "./kit/coberturas.js";
import { arquibancadas } from "./kit/arquibancadas.js";
import { registrarMarcasXangai } from "./kit/xangai/marcas.js";
import { pousar, reservar, colocar, somDaTorcida, aterro, mundoDe, indice } from "./kit/xangai/lugar.js";
import { predioDosBoxes, torreDeVidro, asa, telao } from "./kit/xangai/predios.js";
import { lamina } from "./kit/xangai/agua.js";
import { paddockSobreOLago } from "./kit/xangai/lotus.js";
import { vegetacaoDoParque } from "./kit/xangai/vegetacao.js";
import { cidadeDeXangai } from "./kit/xangai/cidade.js";

registrarMarcasXangai();

export const CAMISAS_CN = ["#c8102e", "#ffd34a", "#ffffff", "#c8102e", "#b5121b", "#f2a33a", "#e9eef2"];
const CORES_ARQ = ["#c8102e", "#f4f4f2", "#1d3b5c", "#c8102e", "#e8b62c", "#f4f4f2"];

const novaTribuna = (comprimento, degraus, semente, o = {}) => tribunaCoberta({ comprimento, degraus, altura: 5.4, fundo: 8, secoes: Math.max(2, Math.round(comprimento / 45)), publico: 0.7, semente, camisas: CAMISAS_CN, cores: CORES_ARQ, estrutura: "#8a9096", cobertura: "#e9ecee", alcance: 0.7, folga: 18, vao: 56, ...o });

// a pegada cabe fora da pista? (sem olhar o que foi reservado: o corredor dos boxes reserva a faixa onde fica a frente do prédio das garagens)
function cabeNaPista(tr, x, z, ry, w, d, folga) {
  for (const u of [-w / 2, 0, w / 2]) for (const v of [0, d / 2, d]) { const [px, pz] = mundoDe(x, z, ry, u, v); if (tr.distAt(px, pz) < tr.W / 2 + folga) return false; }
  return true;
}
// põe uma peça e reserva o lugar; devolve onde ficou (ou null)
function pousarSe(tr, add, g, f, lado, lat, ao, w, d, { folga = 24, base = true, reserva = 22 } = {}) {
  const q = pousar(tr, g, f, lado, lat, ao);
  if (!cabeNaPista(tr, q.x, q.z, q.ry, w, d, folga)) return null;
  if (base) aterro(g, w, d, 140);
  add(g); reservar(tr, q.x, q.z, q.ry, w, d, reserva);
  (tr.pecasXangai ||= []).push({ nome: g.name, f: +f.toFixed(4), lado, lat: Math.round(lat), x: Math.round(q.x), z: Math.round(q.z), w, d });
  return q;
}

// ---------------------------------------------------------------------------------------------------------------------
// 1. A reta dos boxes
// ---------------------------------------------------------------------------------------------------------------------
function retaDosBoxes(tr, { add }) {
  const { n, W } = tr, lado = tr.t.boxes?.lado ?? -1, Z = W / 2 + 88, F = 44, aoF = (ao) => ao / (6 * n), sinal = lado < 0 ? 1 : -1, LAT_TRIBUNA = W / 2 + 44;
  // (o outro lado da reta só é livre atrás da linha de chegada: à frente dela a curva 1 volta e passa colada) a tribuna principal, entre as torres das asas
  const mods = [];
  for (const [ao, comp, degraus, sem] of [[-150, 170, 12, 1], [-380, 190, 12, 2], [-570, 190, 11, 3]]) {
    const t = novaTribuna(comp, degraus, sem);
    const o = colocar(tr, add, t, { f: aoF(ao), lado: -lado, lats: [LAT_TRIBUNA], w: comp + 4, d: degraus * 8 + 8, folga: 14, reserva: 20 });
    if (o) mods.push(o);
  }
  if (mods.length) somDaTorcida(tr, aoF(-640), aoF(-40));
  // as torres das pontas do prédio dos boxes (as duas primeiras com a asa que cruza a pista) e o prédio entre elas
  const torres = [[-262, true], [-40, true], [268, false]], asas = [];
  for (const [ao, comAsa] of torres) {
    let ok = true, far = null;
    if (comAsa) { // a torre da tribuna, do outro lado: se não couber, não há asa
      const t2 = torreDeVidro({ largura: 44, fundo: 50, alto: 200 });
      far = pousarSe(tr, add, t2, aoF(ao), -lado, LAT_TRIBUNA, 0, 48, 52, { folga: 14, base: true, reserva: 10 });
      ok = !!far;
    }
    const t = torreDeVidro({ largura: 44, fundo: 50, alto: 200 });
    const q = pousarSe(tr, add, t, aoF(ao), lado, Z - 6, 0, 48, 54, { folga: 40, reserva: 18 });
    if (q && ok && comAsa) { const vao = (Z - 6) + (LAT_TRIBUNA + 25) - 6; t.add(asa({ vao, alturaTorre: 200 })); asas.push({ ao, vao }); }
  }
  const lista = [[-151, 174], [49, 130], [179, 130]];
  lista.forEach(([ao, comp], k) => {
    const torre = k === 1 ? sinal * (20 - ao) : null; // a torre de controle de prova, quase em cima da linha de chegada
    const g = predioDosBoxes({ comprimento: comp + 6, fundo: F, torre, semente: k + 1, texto: k === 1 ? "CHINA GRAND PRIX" : "SHANGHAI CIRCUIT" });
    pousarSe(tr, add, g, aoF(ao), lado, Z, 0, comp + 10, F + 6, { folga: 40, reserva: 28 });
  });
  somDaTorcida(tr, aoF(-300), aoF(300));
  tr.retaXangai = { tribunas: mods.length, asas: asas.length, lado, Z, torres: torres.length };
  return { lado, Z, F };
}

// ---------------------------------------------------------------------------------------------------------------------
// as arquibancadas das curvas: as do caracol e do grampo da curva 14 à mão; as outras, onde a pista de verdade faz uma curva fechada
// ---------------------------------------------------------------------------------------------------------------------
function curvasFechadas(tr) {
  const { pts, n } = tr, runs = [];
  let ini = -1, ult = -99;
  const k = (i) => { const p = pts[i % n], q = pts[(i + 3) % n]; return { k: Math.abs(p.tx * q.ty - p.ty * q.tx) / 18, s: p.tx * q.ty - p.ty * q.tx > 0 ? 1 : -1 }; };
  for (let i = 0; i < n; i++) {
    if (k(i).k > 1 / 330) { if (ini < 0) ini = i; ult = i; }
    else if (ini >= 0 && i - ult > 10) { runs.push([ini, ult]); ini = -1; }
  }
  if (ini >= 0) runs.push([ini, ult]);
  return runs.filter(([a, b]) => b - a >= 16).map(([a, b]) => ({ a, b, comp: b - a, lado: -k(Math.floor((a + b) / 2)).s })); // o lado de fora: o contrário do de dentro
}
function arquibancadasDasCurvas(tr, add) {
  const proprias = [[0, 0.04], [0.04, 0.115], [0.78, 0.845], [0.92, 1.0]]; // o caracol, o grampo da curva 14 e a reta dos boxes: ficam por conta das peças próprias
  const livres = curvasFechadas(tr).filter((c) => { const f0 = c.a / tr.n, f1 = c.b / tr.n; return !proprias.some(([a, b]) => f0 < b && f1 > a); }).sort((a, b) => b.comp - a.comp).slice(0, 7);
  const cores = [["#c8102e", "#f4f4f2"], ["#1d3b5c", "#f4f4f2"], ["#e8b62c", "#1d3b5c"], ["#f4f4f2", "#c8102e"]];
  const trechos = livres.map((c, j) => ({ de: Math.max(0, c.a / tr.n - 0.004), ate: (c.b / tr.n) + 0.004, lado: c.lado, degraus: 7 + Math.min(4, Math.round(c.comp / 24)), cor: cores[j % 4][0], encosto: cores[j % 4][1], cobertura: j % 3 === 0, torcida: CAMISAS_CN }));
  if (trechos.length) arquibancadas(tr, add, { trechos });
  tr.curvasXangai = livres.map((c) => ({ f: +((c.a + c.b) / 2 / tr.n).toFixed(3), lado: c.lado, comp: c.comp }));
}

// ---------------------------------------------------------------------------------------------------------------------
// 3 e 4. O caracol e o grampo da curva 14: os teloes
// ---------------------------------------------------------------------------------------------------------------------
function teloes(tr, { add }) {
  const { W } = tr;
  let a = null; // o do caracol: por fora do giro, depois das arquibancadas, no primeiro ponto onde cabe
  for (const f of [0.055, 0.045, 0.075]) { a = colocar(tr, add, telao({ largura: 74, altura: 36, alto: 92, texto: "SHANGHAI" }), { f, lado: -1, lats: [W / 2 + 250, W / 2 + 290, W / 2 + 330], w: 84, d: 14, folga: 60, reserva: 30 }); if (a) break; (tr.faltouXangai ||= []).pop(); }
  const b = colocar(tr, add, telao({ largura: 74, altura: 36, alto: 92, texto: "CHINA GP", fundo: "#1d3b5c" }), { f: 0.812, lado: -1, lats: [W / 2 + 280, W / 2 + 330, W / 2 + 240], w: 84, d: 14, folga: 60, ambos: true, reserva: 30 });
  tr.telaoXangai = { caracol: !!a, grampo: !!b };
}

// ---------------------------------------------------------------------------------------------------------------------
// O antes (cenario) e o depois (depois) do GP
// ---------------------------------------------------------------------------------------------------------------------
export function cenarioXangai(tr, ctx) {
  tr.reservado ||= [];
  tr.camisasGP = CAMISAS_CN; // a torcida solta de vida.js também veste vermelho e amarelo
  lamina(tr, ctx); // a água primeiro: `tr.ocupado` passa a dizer "é água" para tudo que vem depois
  arquibancadasDasCurvas(tr, ctx.add);
  const { lado, Z, F } = retaDosBoxes(tr, ctx);
  paddockSobreOLago(tr, ctx.add, { lado, atras: Z + F });
  teloes(tr, ctx);
}

export function depoisXangai(tr, ctx) {
  const { add } = ctx;
  vegetacaoDoParque(tr, add, {});
  cidadeDeXangai(tr, add, {});
  // a faixa do circuito no pórtico da largada (o de pista.js): uma de cada lado da viga, a da frente com a normal contra o sentido da volta
  const p = tr.pts[0], L = tr.W / 2 + 14, rot = -Math.atan2(p.ny, p.nx);
  for (const s of [1, -1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(2 * L - 6, 8.4), new THREE.MeshBasicMaterial({ map: marcaTex("xgcircuito", 1024, 64), side: THREE.FrontSide }));
    f.position.set(p.x, p.h + 62, p.y); f.rotation.y = rot + (s > 0 ? 0 : Math.PI); f.translateZ(1.7); add(f);
  }
  void indice;
}
