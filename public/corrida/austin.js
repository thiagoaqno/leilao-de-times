// Austin (Circuit of the Americas, GP dos Estados Unidos, no Texas): o que só o circuito tem, em cima do kit 2. O resto (zebras vermelhas e brancas, o asfalto de
// escape, os painéis, as passarelas e o som) é do kit, na configuração de gps/austin.js; as peças exclusivas estão em kit/austin/. Aqui, na ordem em que
// aparecem pela volta (frações da volta, a partir da chegada; o circuito corre no sentido anti-horário):
// 1. a reta dos boxes (0,94-1,06): o prédio das garagens com a torre de controle, do lado de dentro, e a tribuna principal coberta de membrana branca do
//    outro lado, com o paddock atrás;
// 2. a subida até a curva 1, "Big Red" (0,06, o ponto mais alto da volta, 11% de rampa): a arquibancada vermelha e a colina de torcida por fora, o nome pintado
//    no escape e a bandeira gigante dos Estados Unidos no alto do morro;
// 3. a Torre de Observação vermelha, o anfiteatro aos pés dela e a Grande Praça (espelho d'água e gramado), no miolo dos S rápidos (curvas 3 a 6, 0,15-0,24),
//    com a arquibancada da curva 4 por fora e as duas passarelas (curvas 3 e 16);
// 4. a curva 11 (o grampo no fim dos S de Suzuka e Silverstone, 0,41) e a reta de trás, de 1 km, com o palco do miolo e a galera diante dele;
// 5. a seção do estádio (curvas 12 a 15, 0,63-0,73), com as arquibancadas das curvas 12 e 15 e as tendas do Fan Zone; as curvas 16 a 18 em volta do miolo e a
//    arquibancada da 19 (0,858), até a 20 (0,91), a última, que entra nos boxes;
// 6. a paisagem seca do Texas: carvalhos-vivos, cedros, mesquites, nopais, pedras de calcário, manchas de bluebonnet e os morros baixos do Hill Country.
// Tudo é cenário: nada fica dentro da pista (livre/ocupado) e a física é a de sempre.
import * as THREE from "three";
import { marcaTex } from "./kit/marcas.js";
import { livre, ocupado } from "./kit/comum.js";
import { prediosDosBoxes } from "./kit/boxes.js";
import { tribunaCoberta, tendaPaddock } from "./kit/coberturas.js";
import { registrarMarcasAustin } from "./kit/austin/marcas.js";
import { indice, colocar, reservar, dentroDaVolta, somDaTorcida, recuoDoMuro, aterro } from "./kit/austin/lugar.js";
import { torreDeObservacao, anfiteatro, pracaGrande, palcoDoMiolo } from "./kit/austin/torre.js";
import { corDoChao, vegetacaoTexas, colinas, matoDeLonge } from "./kit/austin/terra.js";
import { bandeirasEmHastes } from "./kit/austin/bandeiras.js";
import { torcidaNosGramados, CAMISAS_TEXAS } from "./kit/austin/torcida.js";
import { bigRedNoAsfalto, placasDasCurvas } from "./kit/austin/pintura.js";

registrarMarcasAustin();

export { corDoChao };
const VERMELHO = "#bf0a30", AZUL = "#002868", BRANCO = "#f4f4f2";
const CORES_TRIBUNA = [VERMELHO, BRANCO, AZUL, BRANCO, VERMELHO, BRANCO, AZUL];
const tribuna = (comprimento, degraus, semente, o = {}) => tribunaCoberta({
  comprimento, degraus, altura: 5.4, fundo: 8.2, secoes: Math.max(3, Math.round(comprimento / 38)), publico: 0.6, semente, alcance: 0.7, folga: 18, vao: 56,
  camisas: CAMISAS_TEXAS, cores: CORES_TRIBUNA, cobertura: "#f4f5f2", estrutura: "#8a9096", ...o,
});
// o lado de dentro da volta na fração f (o lado do miolo)
const ladoDeDentro = (tr, f) => { const p = tr.pts[indice(tr, f)]; return dentroDaVolta(tr.pts, p.x + p.nx * 260, p.y + p.ny * 260) ? 1 : -1; };

// ---------------------------------------------------------------------------------------------------------------------
// 1. A reta dos boxes
// ---------------------------------------------------------------------------------------------------------------------
function retaDosBoxes(tr, { add }) {
  const { W } = tr, lado = tr.t.boxes?.lado ?? -1, oposto = -lado;
  prediosDosBoxes(tr, add, { de: 0.984, ate: 1.062, lado, recuo: 62, torre: true, paineis: ["txgp", "txaustin", "txhill", "txlonestar"], cores: { friso: VERMELHO } });
  // a tribuna principal, do outro lado: três módulos cobertos de membrana branca, de frente para a pista
  const mods = [];
  for (const [ao, sem] of [[-330, 3], [-40, 8], [250, 12]]) {
    const t = tribuna(270, 12, sem);
    const o = colocar(tr, add, t, { f: 0.998, lado: oposto, lats: [W / 2 + 46, W / 2 + 70], ao, w: 274, d: 12 * 8.2 + 8, folga: 30, reserva: null });
    if (o) mods.push(o);
  }
  for (const o of mods) reservar(tr, o.x, o.z, o.ry, o.w, o.d, 22);
  if (mods.length) somDaTorcida(tr, 0.968, 1.03);
  // as tendas do paddock, atrás do prédio dos boxes
  [["PADDOCK", VERMELHO], ["HILL COUNTRY", AZUL]].forEach(([texto, corFaixa], k) => {
    const t = tendaPaddock({ modulos: 3, filas: 2, texto, corFaixa, corMesas: VERMELHO }); t.scale.setScalar(1.5);
    colocar(tr, add, t, { f: 0.998, lado, lats: [W / 2 + 62 + 46 + 90, W / 2 + 62 + 46 + 140], ao: (k - 0.5) * 300, w: 150, d: 110, folga: 30, ambos: false, reserva: 20 });
  });
  tr.retaAustin = { tribunaPrincipal: mods.length };
}

// ---------------------------------------------------------------------------------------------------------------------
// 2. A curva 1, Big Red
// ---------------------------------------------------------------------------------------------------------------------
function curva1(tr, { add }) {
  const { W } = tr, i1 = indice(tr, 0.06), fora = 1, rec = recuoDoMuro(tr, fora, 0.06);
  bigRedNoAsfalto(tr, add, { f0: 0.054, f1: 0.073, lado: fora });
  // a arquibancada vermelha de Big Red, por fora da curva, atrás da barreira
  const lats = [W / 2 + rec + 16, W / 2 + rec + 40, W / 2 + rec + 70];
  const mods = [];
  for (const [f, sem, comp] of [[0.052, 21, 230], [0.0705, 22, 230]]) {
    const t = tribuna(comp, 10, sem, { cores: [VERMELHO, BRANCO, VERMELHO, BRANCO], cobertura: null });
    const o = colocar(tr, add, t, { f, lado: fora, lats, w: comp + 4, d: 10 * 8.2 + 8, folga: 34, reserva: 24 });
    if (o) mods.push(o);
  }
  if (mods.length) somDaTorcida(tr, 0.044, 0.08);
  // a bandeira dos Estados Unidos no alto do morro: a haste mais alta de lá, e uma do Texas ao lado
  const alvo = [[0.064, 330, 150], [0.0575, 240, 110]];
  let gigante = null;
  for (const [f, lat, tam] of alvo) {
    const p = tr.pts[indice(tr, f)];
    for (const extra of [0, 60, 120, 180]) {
      const d = W / 2 + rec + lat + extra, x = p.x + p.nx * fora * d, z = p.y + p.ny * fora * d;
      if (!livre(tr, x, z, 60) || ocupado(tr, x, z)) continue;
      bandeirasEmHastes(tr, add, [{ x, z, tipo: f === 0.064 ? 0 : 1, alto: f === 0.064 ? 300 : 210, larg: tam, rot: Math.atan2(p.tx, p.ty) + Math.PI / 2 }]);
      if (f === 0.064) gigante = { x, z };
      tr.reservado.push([x, z, 40]); break;
    }
  }
  tr.curva1Austin = { arquibancadas: mods.length, bandeira: !!gigante, rec, i1 };
}

// ---------------------------------------------------------------------------------------------------------------------
// 3. A torre, o anfiteatro e a Grande Praça, no miolo dos S
// ---------------------------------------------------------------------------------------------------------------------
// procura, em espiral em volta de (cx, cz) e em 16 giros, o lugar onde todos os `locais` ([lx, lz, raio], no sistema de um grupo de frente para +z) ficam livres
function acharConjunto(tr, cx, cz, locais, { folga = 50, raio = 560, passo = 30 } = {}) {
  const mundo = (x, z, ry, lx, lz) => [x + Math.cos(ry) * lx + Math.sin(ry) * lz, z - Math.sin(ry) * lx + Math.cos(ry) * lz];
  let melhor = null;
  for (let rr = 0; rr <= raio; rr += passo) {
    const k = Math.max(1, Math.round(rr / passo) * 6);
    for (let q = 0; q < k; q++) {
      const ang = (q / k) * Math.PI * 2, x = cx + Math.cos(ang) * rr, z = cz + Math.sin(ang) * rr;
      for (let g = 0; g < 16; g++) {
        const ry = (g / 16) * Math.PI * 2;
        let ok = true;
        for (const [lx, lz, r] of locais) { const [px, pz] = mundo(x, z, ry, lx, lz); if (tr.distAt(px, pz) < tr.W / 2 + folga + r || ocupado(tr, px, pz)) { ok = false; break; } }
        if (ok) { const pr = Math.hypot(x - cx, z - cz) + Math.abs(((ry - (melhor?.ref ?? ry)) % 6.28)) * 0; if (!melhor || pr < melhor.pr) melhor = { x, z, ry, pr }; }
      }
      if (melhor) return melhor;
    }
  }
  return null;
}
function torreEAnfiteatro(tr, { add }) {
  // a pegada local: o palco em (0, 0), a plateia em +z (meio-círculo de ~170) e a torre atrás do palco, em (0, -105)
  const pegada = [[0, 0, 70], [0, 70, 60], [-70, 90, 60], [70, 90, 60], [0, 140, 60], [-100, 130, 50], [100, 130, 50], [0, -105, 60]];
  const lugar = acharConjunto(tr, 2850, 3560, pegada, { folga: 60 });
  if (!lugar) { (tr.faltouAustin ||= []).push({ nome: "torre-anfiteatro" }); return; }
  const { x, z, ry } = lugar, mundoDe = (lx, lz) => [x + Math.cos(ry) * lx + Math.sin(ry) * lz, z - Math.sin(ry) * lx + Math.cos(ry) * lz];
  const a = anfiteatro({ raio0: 72, degraus: 7, degrauFundo: 7.4, gramado: 8, abertura: 2.4 }), t = torreDeObservacao({ alto: 430 });
  // o texto na frente do palco e o nome da torre
  a.position.set(x, tr.chao(x, z) - 1, z); a.rotation.y = ry; aterro(a, 340, 230, 160).position.set(0, -80, 40);
  add(a);
  const [tx, tz] = mundoDe(0, -105); t.position.set(tx, tr.chao(tx, tz) - 1, tz); t.rotation.y = ry;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(58, 70, 150, 20), new THREE.MeshStandardMaterial({ color: 0x8f8a5c, roughness: 1 })); base.position.set(0, -75, 0); t.add(base);
  add(t);
  for (const [lx, lz, r] of pegada) { const [px, pz] = mundoDe(lx, lz); tr.reservado.push([px, pz, r + 20]); }
  somDaTorcida(tr, 0.15, 0.19);
  tr.torreAustin = { x: Math.round(tx), z: Math.round(tz), anfiteatro: { x: Math.round(x), z: Math.round(z) }, ry };
}
function pracaGrandeNoMiolo(tr, { add }) {
  const w = 340, d = 220, local = [[-w / 2, -d + 30, 50], [w / 2, -d + 30, 50], [0, -d / 2, 70], [-w / 2, -20, 50], [w / 2, -20, 50]];
  const lugar = acharConjunto(tr, 2480, 3880, local, { folga: 40 });
  if (!lugar) { (tr.faltouAustin ||= []).push({ nome: "praca" }); return; }
  const g = pracaGrande({ w, d }), { x, z, ry } = lugar;
  g.position.set(x, tr.chao(x, z) - 1, z); g.rotation.y = ry; aterro(g, w, d, 120);
  add(g);
  for (const [lx, lz, r] of local) tr.reservado.push([x + Math.cos(ry) * lx + Math.sin(ry) * lz, z - Math.sin(ry) * lx + Math.cos(ry) * lz, r + 20]);
  tr.pracaAustin = { x: Math.round(x), z: Math.round(z) };
}

// ---------------------------------------------------------------------------------------------------------------------
// 4. O palco do miolo (reta de trás)
// ---------------------------------------------------------------------------------------------------------------------
function palcoEReta(tr, { add }) {
  const { W } = tr, f = 0.5, lado = ladoDeDentro(tr, f);
  const telao = marcaTex("txmusica", 512, 128);
  const p = palcoDoMiolo({ largura: 130, profundidade: 50, telao });
  const o = colocar(tr, add, p, { f, lado, lats: [W / 2 + 360, W / 2 + 420, W / 2 + 300], w: 140, d: 56, folga: 40, reserva: 30 });
  tr.palcoAustin = !!o;
  if (o) somDaTorcida(tr, f - 0.012, f + 0.012);
  return o;
}

// ---------------------------------------------------------------------------------------------------------------------
// 5. As arquibancadas de curva e o Fan Zone
// ---------------------------------------------------------------------------------------------------------------------
function tribunasDeCurva(tr, { add }) {
  const { W } = tr;
  const lista = [ // [nome, fração, lado, comprimento, degraus, semente, cobertura]
    ["curva 4", 0.17, -1, 200, 9, 31, true], ["curva 12", 0.631, 1, 240, 10, 32, false], ["curva 15", 0.714, 1, 260, 10, 33, true], ["curva 19", 0.858, 1, 250, 10, 34, true],
  ];
  const feitas = [];
  for (const [nome, f0, lado, comp, degraus, sem, coberta] of lista) {
    // tenta a fração pedida e, se a pegada não cabe, as vizinhas (e uma versão mais curta)
    let o = null, f = f0;
    for (const [df, k] of [[0, 1], [0.008, 1], [-0.008, 1], [0.016, 1], [-0.016, 1], [0, 0.7], [0.01, 0.7], [-0.01, 0.7]]) {
      f = f0 + df; const c2 = Math.round(comp * k), rec = recuoDoMuro(tr, lado, f);
      const t = tribuna(c2, degraus, sem, { cobertura: coberta ? "#f4f5f2" : null });
      o = colocar(tr, add, t, { nome, f, lado, lats: [W / 2 + rec + 14, W / 2 + rec + 40, W / 2 + rec + 80, W / 2 + rec + 130], w: c2 + 4, d: degraus * 8.2 + 8, folga: 34, ambos: false, reserva: 24 });
      if (o) break;
    }
    if (o) { somDaTorcida(tr, f - 0.012, f + 0.012); feitas.push(nome); tr.faltouAustin = (tr.faltouAustin || []).filter((q) => q.nome !== nome); }
  }
  tr.tribunasAustin = feitas;
  // o Fan Zone: tendas no miolo, entre as curvas 12 e 15
  const nomes = [["FAN ZONE", VERMELHO], ["TEXAS BBQ", AZUL], ["LIVE MUSIC", VERMELHO]], dentro = ladoDeDentro(tr, 0.67);
  nomes.forEach(([texto, corFaixa], k) => {
    const t = tendaPaddock({ modulos: 3, filas: 2, texto, corFaixa, corMesas: AZUL }); t.scale.setScalar(1.4);
    colocar(tr, add, t, { f: 0.665 + k * 0.012, lado: dentro, lats: [W / 2 + 120, W / 2 + 170, W / 2 + 230], w: 140, d: 100, folga: 30, ambos: true, reserva: 18 });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// 6. A galera nos gramados
// ---------------------------------------------------------------------------------------------------------------------
function gramados(tr) {
  const { W } = tr, rec = (l, f) => recuoDoMuro(tr, l, f), z = (f0, f1, lado, lat0, lat1, dens, chapeus = 0.35, bandeiras = 0.06) => ({ f0, f1, lado, lat0: W / 2 + lat0, lat1: W / 2 + lat1, dens, chapeus, bandeiras });
  const zonas = [
    z(0.038, 0.088, 1, rec(1, 0.06) + 10, rec(1, 0.06) + 330, 6, 0.4, 0.1), // a colina da curva 1
    z(0.1, 0.16, 1, 36, 160, 2), z(0.15, 0.2, -1, 36, 150, 3), // a descida e os S
    z(0.22, 0.31, -1, 36, 140, 1.4), z(0.26, 0.3, 1, 36, 120, 1.4), // as curvas 7 a 9
    z(0.4, 0.425, 1, 36, 160, 2.4), // o grampo da 11
    z(0.488, 0.512, ladoDeDentro(tr, 0.5), 60, 340, 8, 0.45, 0.08), // diante do palco do miolo
    z(0.64, 0.7, -1, 36, 140, 2), // o estádio
    z(0.84, 0.88, 1, rec(1, 0.86) + 10, rec(1, 0.86) + 200, 5, 0.4, 0.08), // a curva 19
    z(0.9, 0.93, 1, 40, 180, 3), // a curva 20
  ];
  torcidaNosGramados(tr, tr.add, zonas, { semente: 8812 });
  tr.zonasAustin = zonas;
  for (const q of zonas) if (q.dens >= 4) somDaTorcida(tr, q.f0, q.f1);
}

const CURVAS = [["1 · BIG RED", 0.06], ["4", 0.17], ["11", 0.412], ["12", 0.63], ["15", 0.716], ["19", 0.858], ["20", 0.912]];

// ---------------------------------------------------------------------------------------------------------------------
// O antes (cenario) e o depois (depois) do GP
// ---------------------------------------------------------------------------------------------------------------------
export function cenarioAustin(tr, ctx) {
  tr.reservado ||= []; tr.add = ctx.add;
  tr.camisasGP = CAMISAS_TEXAS; // a torcida solta de vida.js também veste vermelho, branco e azul
  retaDosBoxes(tr, ctx);
  curva1(tr, ctx);
  torreEAnfiteatro(tr, ctx);
  pracaGrandeNoMiolo(tr, ctx);
  palcoEReta(tr, ctx);
  tribunasDeCurva(tr, ctx);
  gramados(tr);
  placasDasCurvas(tr, ctx.add, CURVAS);
}

export function depoisAustin(tr, ctx) {
  const { add } = ctx, { W } = tr;
  // a vegetação seca do Texas e os morros do Hill Country (kit/austin/terra.js); a mata não cobre a galera nem as peças
  vegetacaoTexas(tr, add, { recuo: 110, fundo: 560, semente: 6161, evitar: (tr.zonasAustin || []).map((q) => ({ f0: q.f0, f1: q.f1, lado: q.lado, lat0: q.lat0, lat1: q.lat1 })) });
  const rel = colinas(tr, add, {});
  matoDeLonge(tr, add, rel, {});
  // as bandeiras dos Estados Unidos e do Texas em hastes ao lado do pórtico da largada
  const p = tr.pts[0], lista = [];
  for (const lado of [-1, 1]) for (const ao of [-110, 110]) {
    const x = p.x + p.nx * lado * (W / 2 + 44) + p.tx * ao, zz = p.y + p.ny * lado * (W / 2 + 44) + p.ty * ao;
    if (livre(tr, x, zz, 30) && !ocupado(tr, x, zz)) lista.push({ x, z: zz, tipo: ao < 0 ? 0 : 1, alto: 130, larg: 62, rot: Math.atan2(p.tx, p.ty) + Math.PI / 2 });
  }
  bandeirasEmHastes(tr, add, lista);
}
