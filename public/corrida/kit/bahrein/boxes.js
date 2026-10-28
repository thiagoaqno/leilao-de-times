// Bahrein — o prédio dos boxes de Sakhir: dois andares cor de areia rosada com as portas das garagens (a testeira de cada uma
// na cor de uma equipe), a laje branca com a faixa vermelha, o andar de vidro do hospitality e, por cima de tudo, a cobertura em
// VELAS brancas enfileiradas ao longo do prédio inteiro, com os mastros de treliça. De noite as janelas e as garagens acendem.
// Tudo em cor chapada por vértice (kit/montagem.js), dividido em regiões: algumas chamadas de desenho para o prédio inteiro.
import * as THREE from "three";
import { vidro } from "../montagem.js";
import { recortar } from "../comum.js";
import { moldura, Regiao, pintor, materialDaNoite } from "./base.js";

const EQUIPES = ["#e10600", "#27f4d2", "#ff8700", "#3671c6", "#229971", "#64c4ff", "#b6babd", "#6692ff", "#52e252", "#fd4bc7"];
const PAREDE = "#e7cbb6", LAJE = "#f6f3ec", VERMELHO = "#ce1126";

export function predioDosBoxes(tr, add, { de = 0.972, ate = 1.07, v0 = 136, fundo = 64 } = {}) {
  const { n } = tr;
  let i0 = Math.floor(de * n), i1 = Math.floor(ate * n);
  const rec = recortar(tr, i0, i1, [v0 - 8, v0 + fundo + 4]); if (!rec) return null;
  ({ i0, i1 } = rec);
  const F = moldura(tr, i0, i1, 1), reg = new Regiao(340), P = pintor(F, reg), S = P.S, V = vidro();
  const janela = materialDaNoite(tr, "#5f87a6", "#ffd98c", { side: THREE.DoubleSide }), porta = materialDaNoite(tr, "#262b33", "#efe5c6");
  const L = F.comprimento, nb = Math.max(2, 2 * Math.round(L / 48)), baia = L / nb; // as baías vêm em pares: uma vela cobre duas
  const alto1 = 22, alto2 = 42, tetoY = 44.2;
  for (let k = 0; k < nb; k++) {
    const s = (k + 0.5) * baia, w = baia + 0.2;
    P.caixa(S, s, v0 + fundo / 2, -30, [w, 30, fundo], "#b8a58c"); // a fundação, que desce até o chão
    P.caixa(S, s, v0 + fundo / 2, 0, [w, alto1, fundo], PAREDE); // o térreo
    P.caixa(porta, s, v0 - 0.35, 0.2, [baia * 0.7, 18, 0.5], "#ffffff"); // a porta da garagem
    P.caixa(S, s, v0 - 0.6, 18.2, [baia * 0.7, 2.4, 1], EQUIPES[k % EQUIPES.length]); // a testeira, na cor da equipe
    P.caixa(S, s, v0 + fundo / 2 - 3, alto1, [w, 2.2, fundo + 6], LAJE); // a laje do andar de cima, saindo para a pista
    P.caixa(S, s, v0 - 6.3, alto1 + 0.4, [w, 1.4, 0.8], VERMELHO); // a faixa vermelha da beirada
    P.caixa(S, s, v0 - 5.6, alto1 + 2.2, [w, 3, 0.4], "#d5dce2"); // o guarda-corpo do terraço
    P.caixa(S, s, v0 + (10 + fundo - 6) / 2, alto1 + 2.2, [w, alto2 - alto1 - 2.2, fundo - 16], PAREDE); // o andar do hospitality, recuado
    for (const d of [-0.23, 0.23]) P.caixa(janela, s + d * baia, v0 + 9.7, alto1 + 5.2, [baia * 0.36, 12.4, 0.4], "#ffffff"); // as vidraças
    P.caixa(S, s, v0 + fundo / 2 - 1, alto2, [w, 2.2, fundo + 10], LAJE); // a laje do teto, que as velas cobrem
  }
  // a cobertura em velas: uma vela por duas baías e três fileiras de frente para o fundo; os mastros dão o ar de tenda de corrida
  const nv = nb / 2, vao = baia * 2, d = (fundo + 10) / 3, alturas = [20, 27, 23];
  for (let j = 0; j < nv; j++) for (let r = 0; r < 3; r++) {
    const s = (j + 0.5) * vao, v = v0 - 6 + (r + 0.5) * d;
    P.vela(s, v, tetoY, { w: vao - 0.6, d: d - 0.6, h: alturas[r] });
    P.mastro(s, v, tetoY + alturas[r] - 1, 14 + (r === 1 ? 10 : 0), "#f2f4f6", 1.2);
  }
  reg.montar(add, "bahrein-boxes");
  // o prédio entra em tr.reservado (as palmeiras, a pista de fora e os enfeites soltos não nascem em cima)
  tr.reservado ||= [];
  for (let s = 0; s <= L; s += 40) { const q = F.at(s, v0 + fundo / 2); tr.reservado.push([q.x, q.z, fundo / 2 + 36]); }
  tr.predioBoxes = { i0, i1, v0, fundo, comprimento: L };
  return { ...tr.predioBoxes, F };
}
