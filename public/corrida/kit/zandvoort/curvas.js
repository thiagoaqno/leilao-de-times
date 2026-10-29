// Zandvoort — as curvas (peças só desta pista):
// · `curvaInclinada`: a Hugenholtz (curva 3) e a Arie Luyendyk (a última) são inclinadas de verdade no circuito (~19°). A pista do jogo é plana
//   (a física não muda), então o cenário conta a inclinação por fora: do lado de fora da curva, depois da área de escape, uma rampa de
//   concreto sobe até um paredão branco com a cerca alta de proteção, e em cima fica o terraço onde ficam as arquibancadas "em volta";
//   o terraço cai atrás numa berma de areia e capim até o chão. `terraco` devolve onde ele está, para pôr as tribunas e a torcida;
// · `muroHolandes`: o muro de proteção em painéis laranja, brancos, azuis e vermelhos (as cores da casa) ao longo da beira;
// · `placasDasCurvas`: as placas com o nome de cada curva (Tarzan, Hugenholtz, Hunserug, Scheivlak, Hans Ernst, Arie Luyendyk).
// Tudo respeita `livre`/`ocupado` (nada entra na pista) e `recortar` (onde um trecho vizinho chega perto, a rampa para).
import * as THREE from "three";
import { canvasTex, M } from "../../cena.js";
import { lotes, tira, recortar, sinalDaCurva, ocupado } from "../comum.js";
import { Montador, solido } from "../montagem.js";
import { indice } from "./lugar.js";

const LARANJA = "#ff6a13", VERMELHO = "#ae1c28", AZUL = "#21468b", BRANCO = "#f4f4f2";

// ---------------------------------------------------------------------------------------------------------------------
// A curva inclinada: rampa de concreto, paredão, cerca alta, terraço e berma
// ---------------------------------------------------------------------------------------------------------------------
const matConcreto = () => new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide, map: canvasTex(64, 128, (x, w, hh, rr) => {
  x.fillStyle = "#a3a5a8"; x.fillRect(0, 0, w, hh);
  for (let i = 0; i < 380; i++) { x.fillStyle = rr() < 0.5 ? "#00000012" : "#ffffff14"; x.fillRect(rr() * w, rr() * hh, 3, 3); }
  x.fillStyle = "#8d9094"; x.fillRect(0, 0, w, 2); x.fillRect(0, hh / 2, w, 1); x.fillRect(w / 2, 0, 1, hh); // as juntas das placas
  x.fillStyle = "#ff6a13"; x.fillRect(0, 0, w, 10); x.fillStyle = "#f4f4f2"; x.fillRect(0, 10, w, 5); // a listra laranja e branca pintada na borda de baixo
}) });
const matParedao = () => new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide, map: canvasTex(256, 64, (x, w, hh) => {
  x.fillStyle = "#f2f2ee"; x.fillRect(0, 0, w, hh); const cores = [LARANJA, BRANCO, AZUL, BRANCO, VERMELHO, BRANCO];
  cores.forEach((c, k) => { x.fillStyle = c; x.fillRect((k * w) / 6, hh * 0.3, w / 6, hh * 0.42); });
  x.fillStyle = "#00000022"; x.fillRect(0, hh - 4, w, 4); x.fillRect(0, 0, w, 3);
}) });
const matCerca = () => new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide, transparent: true, alphaTest: 0.35, depthWrite: false, map: canvasTex(64, 64, (x, w, hh) => {
  x.clearRect(0, 0, w, hh); x.strokeStyle = "#cfd3d6"; x.lineWidth = 2;
  for (let k = -hh; k < w + hh; k += 8) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + hh, hh); x.stroke(); x.beginPath(); x.moveTo(k + hh, 0); x.lineTo(k, hh); x.stroke(); } // a malha de arame
}) });
const matBerma = (cor) => new THREE.MeshStandardMaterial({ color: cor, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });

/**
 * @param {object} o { de, ate: frações da volta, lado: 1, -1 ou "fora" (o lado de fora da curva), nome, rampa: [l0, l1] (do centro da pista), alto (do paredão), terraco: [l1, l2] }
 * @returns {{ i0, i1, lado, lat0, alto, ok }|null} onde o terraço ficou (os índices dos pontos, o lado e a distância do paredão)
 */
export function curvaInclinada(tr, add, { de, ate, lado = "fora", nome = "curva", l0 = 88, l1 = 124, subida = 9, parede = 6, cerca = 22, terraco = 170, berma = 50 } = {}) {
  const { pts, n } = tr;
  let i0 = Math.floor(de * n), i1 = Math.floor(ate * n); if (i1 < i0) i1 += n;
  let sinal = lado;
  if (lado === "fora") { let k = i0, kmax = -1; for (let i = i0; i <= i1; i++) { const q = pts[i % n], c = q.k ?? 0; if (c > kmax) { kmax = c; k = i; } } sinal = -sinalDaCurva(pts, n, k % n); }
  const topo = l1 + terraco + berma;
  const rec = recortar(tr, i0, i1, [sinal * l0, sinal * topo], 6); if (!rec) { (tr.faltouZandvoort ||= []).push({ nome, f: de }); return null; }
  ({ i0, i1 } = rec);
  // não sobe no que já está tomado (o corredor dos boxes, peças reservadas na rampa)
  const L = lotes(), conc = matConcreto(), pare = matParedao(), terr = matBerma("#c3b77e"), flanco = matBerma("#a99f6c");
  const alturaTerraco = subida + parede;
  const lt = (mat, a, b, y0, y1, v0 = 0, v1 = 1, u0 = 0, u1 = 1) => tira(tr, L.de(mat), i0, i1, sinal * a, sinal * b, y0, y1, v0 * (i1 - i0) / 22, v1 * (i1 - i0) / 22, u0, u1);
  lt(conc, l0, l1, -0.15, subida, 0, 1, 0, 1); // a rampa inclinada de concreto
  lt(pare, l1, l1, subida, alturaTerraco, 0, 1); // o paredão branco com as cores da casa
  if (terraco > 0) lt(terr, l1, l1 + terraco, alturaTerraco, alturaTerraco, 0, 1); // o terraço (onde ficam as tribunas)
  if (terraco > 0) lt(flanco, l1 + terraco, topo, alturaTerraco, -8, 0, 1); // a berma que desce até o chão, atrás
  L.montar(add, `${tr.id}-curva-${nome}`);
  // a cerca alta de proteção sobre o paredão: uma malha de arame com os postes
  const Lc = lotes(); tira(tr, Lc.de(matCerca()), i0, i1, sinal * (l1 + 0.6), sinal * (l1 + 0.6), alturaTerraco, alturaTerraco + cerca, 0, (i1 - i0) / 5, 0, 1); Lc.montar(add, `${tr.id}-cerca-${nome}`);
  const m = new Montador(), S = solido(), poste = [];
  for (let i = i0; i <= i1; i += 5) { const p = pts[i % n]; m.caixa(S, [p.x + p.nx * sinal * (l1 + 0.6), p.h + alturaTerraco + cerca / 2, p.y + p.ny * sinal * (l1 + 0.6)], [0.7, cerca + 2, 0.7], { cor: "#b9bec3" }); poste.push(i); }
  add(m.montar(`${tr.id}-postes-${nome}`));
  // o que o resto do cenário precisa saber: a faixa do terraço fica reservada às tribunas (as árvores e a torcida solta não entram na rampa)
  for (let i = i0; i <= i1; i += 4) { const p = pts[i % n]; tr.reservado.push([p.x + p.nx * sinal * ((l0 + l1) / 2), p.y + p.ny * sinal * ((l0 + l1) / 2), 34]); }
  const info = { i0, i1, lado: sinal, l1, alto: alturaTerraco, terraco, nome };
  (tr.curvasInclinadas ||= []).push(info);
  return info;
}

// ---------------------------------------------------------------------------------------------------------------------
// O muro de proteção holandês
// ---------------------------------------------------------------------------------------------------------------------
/**
 * O muro de concreto de 7 de altura, pintado em painéis laranja, brancos, azuis e vermelhos; os painéis de patrocínio de `ambienteGP` ficam por fora dele.
 * @param {Array} trechos [[f0, f1, lado]] (lado 1, -1 ou 0 = os dois)
 */
export function muroHolandes(tr, add, trechos, { lat = 87.5, alto = 7 } = {}) {
  const { n } = tr, L = lotes();
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.75, side: THREE.DoubleSide, map: canvasTex(256, 32, (x, w, hh) => {
    const cores = [LARANJA, BRANCO, AZUL, BRANCO, VERMELHO, BRANCO, LARANJA, BRANCO];
    cores.forEach((c, k) => { x.fillStyle = c; x.fillRect((k * w) / 8, 0, w / 8, hh); });
    x.fillStyle = "#00000026"; x.fillRect(0, hh - 3, w, 3); x.fillStyle = "#ffffff55"; x.fillRect(0, 0, w, 2);
  }) });
  const topo = new THREE.MeshStandardMaterial({ color: 0xcfd2d4, roughness: 0.8 });
  let pedacos = 0;
  for (const [f0, f1, lado] of trechos) for (const l of lado === 0 ? [-1, 1] : [lado]) {
    let a = Math.floor(f0 * n), b = Math.floor(f1 * n); if (b < a) b += n;
    const rec = recortar(tr, a, b, [l * lat, l * (lat + 3)], 3); if (!rec) continue;
    // sem o muro na entrada e na saída do corredor dos boxes (o carro passa) nem onde há outra peça
    tira(tr, L.de(mat), rec.i0, rec.i1, l * lat, l * lat, -0.2, alto, 0, (rec.i1 - rec.i0) / 8, 0, 1);
    tira(tr, L.de(topo), rec.i0, rec.i1, l * (lat - 1.4), l * (lat + 1.4), alto, alto);
    pedacos++;
  }
  L.montar(add, `${tr.id}-muro`); tr.muroZandvoort = pedacos; void M; void ocupado; void indice;
}

// ---------------------------------------------------------------------------------------------------------------------
// As placas com o nome das curvas
// ---------------------------------------------------------------------------------------------------------------------
export const CURVAS = [["TARZAN", 0.108], ["HUGENHOLTZ", 0.215], ["HUNSERUG", 0.42], ["SCHEIVLAK", 0.51], ["HANS ERNST", 0.605], ["ARIE LUYENDYK", 0.885]];
export function placasDasCurvas(tr, add) {
  const { pts, n, W } = tr, vs = [], uv = [], idx = [], m = new Montador(), S = solido();
  const atlas = canvasTex(1024, 256, (x) => {
    CURVAS.forEach(([nome], k) => {
      const c = k % 4, rr = Math.floor(k / 4), x0 = c * 256, y0 = rr * 128;
      x.fillStyle = "#f6f6f2"; x.fillRect(x0, y0, 256, 128); x.fillStyle = LARANJA; x.fillRect(x0, y0, 256, 16); x.fillStyle = BRANCO; x.fillRect(x0, y0 + 16, 256, 7); x.fillStyle = AZUL; x.fillRect(x0, y0 + 23, 256, 9);
      x.fillStyle = "#15161a"; x.font = "900 32px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(nome, x0 + 128, y0 + 82, 232);
      x.strokeStyle = "#15161a"; x.lineWidth = 4; x.strokeRect(x0 + 2, y0 + 2, 252, 124);
    });
  }, false);
  CURVAS.forEach(([, f], k) => {
    const i = indice(tr, f), p = pts[i], fora = -sinalDaCurva(pts, n, i);
    let escolhido = null;
    for (const lado of [fora, -fora]) {
      for (const d of [W / 2 + 60, W / 2 + 82]) {
        const x = p.x + p.nx * lado * d, z = p.y + p.ny * lado * d;
        if (tr.distAt(x, z) >= d - 8 && !ocupado(tr, x, z)) { escolhido = [lado, x, z]; break; }
      }
      if (escolhido) break;
    }
    if (!escolhido) return;
    const [lado, x, z] = escolhido, y = tr.chao(x, z) - 1.5;
    const nx = -lado * p.nx - 0.55 * p.tx, nz = -lado * p.ny - 0.55 * p.ty, len = Math.hypot(nx, nz), ex = nz / len, ez = -nx / len; // (ex, ez): o eixo largo da placa
    const w = 100, h = 38, y0 = y + 22, c = k % 4, rr = Math.floor(k / 4), base = vs.length / 3;
    for (const [a, b] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) { vs.push(x + ex * a * w / 2, y0 + b * h, z + ez * a * w / 2); uv.push(((a + 1) / 2 + c) / 4, 1 - (rr + 1 - b) / 2); }
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    for (const s of [-1, 1]) m.caixa(S, [x + ex * s * (w / 2 - 6), y + 13, z + ez * s * (w / 2 - 6)], [2.4, 28, 2.4], { cor: "#d9dbdd", ry: Math.atan2(ex, ez) });
    tr.reservado.push([x, z, 30]);
  });
  if (!idx.length) return;
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const placa = add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.6, side: THREE.DoubleSide }))); placa.castShadow = true; placa.name = `${tr.id}-placas-curvas`;
  add(m.montar("zandvoort-placas-curvas-postes"));
  tr.placasZandvoort = idx.length / 6;
}
