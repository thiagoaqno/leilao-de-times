// Suzuka — o viaduto do cruzamento em "8" (peça nova, só desta pista). A reta de trás passa por cima do trecho depois da Degner:
// o traçado e a altura são os de pistas.js (`cruza`), isto é só o cenário em volta do tabuleiro: laje de concreto sobre vigas,
// mureta branca com a grade de aço por cima, postes de luz, pilares com a viga de apoio, os muros de arrimo dos dois lados do
// trecho de baixo (com a faixa vermelha e branca) e as faixas penduradas do lado de fora. Uma malha por material (montagem.js).
// Nada entra na pista: tudo fica a mais de meia largura + 1 m do trecho de baixo, e o tabuleiro só existe em cima da pista de cima.
import * as THREE from "three";
import { Montador, solido } from "../montagem.js";
import { marcaTex } from "../marcas.js";

export function viaduto(tr, { add }, { marcas = ["suzuka", "japangp"], extensao = 46 } = {}) {
  const { pts, n, W, t } = tr, cruz = t.cruza?.[0]; if (!cruz) return null;
  const [baixo, cima] = cruz, ib = Math.floor(baixo * n), ic = Math.floor(cima * n), S = solido(), m = new Montador();
  const CONCRETO = "#b9b5ab", ESCURO = "#8f8c84", BRANCO = "#ece9e2", ACO = "#8a9199", PRETO = "#2c3036";
  // ---- o tabuleiro, ponto a ponto da pista de cima ----
  for (let k = -extensao; k <= extensao; k++) {
    const p = pts[(ic + k + n) % n], q = pts[(ic + k + 1 + n) % n], comp = Math.hypot(q.x - p.x, q.y - p.y) + 0.5, a = Math.atan2(q.y - p.y, q.x - p.x), ry = -a;
    const cx = (p.x + q.x) / 2, cz = (p.y + q.y) / 2, ph = (p.h + q.h) / 2, no = (l, y) => [cx + p.nx * l, ph + y, cz + p.ny * l];
    m.caixa(S, no(0, -3.4), [comp, 6, W + 30], { cor: CONCRETO, ry }); // a laje
    for (let v = -2; v <= 2; v++) m.caixa(S, no(v * 30, -10.4), [comp, 8, 5], { cor: ESCURO, ry }); // as vigas por baixo
    for (const s of [-1, 1]) {
      m.caixa(S, no(s * (W / 2 + 13), 3.4), [comp, 8.4, 2.6], { cor: BRANCO, ry }); // a mureta
      m.caixa(S, no(s * (W / 2 + 13), 8.1), [comp, 1, 3.4], { cor: "#d4d1c9", ry }); // o capeamento
      m.caixa(S, no(s * (W / 2 + 13), -6.4), [comp, 2, 4], { cor: ESCURO, ry }); // a aba da laje, mais escura
      // a grade de aço: dois tubos corridos e um poste a cada 5 pontos
      m.caixa(S, no(s * (W / 2 + 13), 15), [comp, 0.7, 0.7], { cor: ACO, ry }); m.caixa(S, no(s * (W / 2 + 13), 11.5), [comp, 0.5, 0.5], { cor: ACO, ry });
      if (k % 5 === 0) m.caixa(S, no(s * (W / 2 + 13), 12), [0.8, 8, 0.8], { cor: ACO, ry });
      // o poste de luz de 8 em 8 pontos, com o braço virado para a pista
      if (k % 8 === 0 && Math.abs(k) < extensao - 4) { m.caixa(S, no(s * (W / 2 + 14), 28), [1.3, 40, 1.3], { cor: PRETO, ry }); m.caixa(S, no(s * (W / 2 + 9), 47), [10, 1, 1], { cor: PRETO, ry }); m.caixa(S, no(s * (W / 2 + 5), 46), [3.5, 1.6, 2.4], { cor: "#fff4d2", ry }); }
    }
  }
  // ---- os pilares e a viga de apoio, dos dois lados do trecho de baixo ----
  const pb = pts[ib], pc = pts[ic], topo = pc.h - 14.4, hb = pb.h;
  const angB = -Math.atan2(pb.ty, pb.tx), px = (s, d, y) => [pb.x + pb.nx * s * (W / 2 + 22) + pb.tx * d, y, pb.y + pb.ny * s * (W / 2 + 22) + pb.ty * d];
  for (const s of [-1, 1]) {
    for (const d of [-40, 40]) m.caixa(S, px(s, d, (hb - 6 + topo) / 2), [10, topo - hb + 6, 10], { cor: CONCRETO, ry: angB });
    m.caixa(S, px(s, 0, topo - 2), [12, 4, 106], { cor: ESCURO, ry: angB }); // a viga de apoio por cima dos dois pilares
    m.caixa(S, px(s, 0, hb - 5), [14, 3, 106], { cor: ESCURO, ry: angB }); // a sapata
  }
  // ---- os muros de arrimo dos dois lados do trecho de baixo: concreto com a faixa vermelha e branca no topo ----
  const alturaMuro = 26;
  for (let k = -34; k <= 34; k++) {
    const p = pts[(ib + k + n) % n], q = pts[(ib + k + 1 + n) % n], comp = Math.hypot(q.x - p.x, q.y - p.y) + 0.4, ry = -Math.atan2(q.y - p.y, q.x - p.x), cx = (p.x + q.x) / 2, cz = (p.y + q.y) / 2, ph = (p.h + q.h) / 2;
    for (const s of [-1, 1]) {
      const l = s * (W / 2 + 12);
      m.caixa(S, [cx + p.nx * l, ph + alturaMuro / 2 - 3, cz + p.ny * l], [comp, alturaMuro, 3], { cor: CONCRETO, ry });
      m.caixa(S, [cx + p.nx * l, ph + alturaMuro - 1.2, cz + p.ny * l], [comp, 2.4, 3.6], { cor: k % 2 ? "#d8312b" : "#f4f2ec", ry });
    }
  }
  const g = m.montar(`${tr.id}-viaduto`); add(g);
  // ---- as faixas penduradas do lado de fora da mureta, no meio do tabuleiro: de frente para quem vem pela pista de baixo ----
  marcas.forEach((nome, j) => {
    const p = pts[(ic + (j ? 18 : -18) + n) % n];
    for (const s of [-1, 1]) {
      const faixa = new THREE.Mesh(new THREE.PlaneGeometry(64, 11), new THREE.MeshBasicMaterial({ map: marcaTex(nome, 1024, 176), side: THREE.FrontSide }));
      faixa.position.set(p.x + p.nx * s * (W / 2 + 14.9), p.h + 3.6, p.y + p.ny * s * (W / 2 + 14.9)); faixa.rotation.y = Math.atan2(p.nx * s, p.ny * s); add(faixa); // a face (+z local) olha para o lado de fora da mureta
    }
  });
  tr.reservado ||= [];
  for (let k = -extensao; k <= extensao; k += 6) { const p = pts[(ic + k + n) % n]; tr.reservado.push([p.x, p.y, W / 2 + 70]); }
  tr.viadutoSuzuka = { baixo: ib, cima: ic };
  return g;
}
