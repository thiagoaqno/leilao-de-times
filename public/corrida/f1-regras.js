// Corrida da Galera — as regras de Fórmula 1 (planos/temporada-f1.md), as mesmas no servidor e no navegador.
// Só contas, sem desenho: liga com `config.regras === "f1"` na sala. Por enquanto, os pneus: três compostos secos,
// o desgaste e a temperatura. A física (fisica.js) multiplica a aderência do carro pela do pneu, e os robôs
// (corrida-robos.js) usam as mesmas funções.
(function (root) {

// Cada composto: a aderência no auge (sobre o grip do carro), quanto da corrida ele dura até o "penhasco" (a fração da
// distância total em que o desgaste chega a PENHASCO) e quão rápido esquenta. As cores são as da Pirelli.
const PNEUS = {
  macio: { nome: "Macio", cor: "#e8202a", pico: 1.06, vida: 0.35, aquece: 1.6 },
  medio: { nome: "Médio", cor: "#ffd100", pico: 1.03, vida: 0.6, aquece: 1.0 },
  duro: { nome: "Duro", cor: "#f4f4f4", pico: 1.0, vida: 0.9, aquece: 0.6 },
};
const COMPOSTO_PADRAO = "medio";
// Até o penhasco o pneu perde pouco (até PERDA_ANTES); depois dele, despenca até PERDA_FIM com o pneu acabado.
const PENHASCO = 0.8, PERDA_ANTES = 0.06, PERDA_FIM = 0.26;
// Pneu frio (saindo do box ou na largada) segura FRIO do normal; fica bom a partir de TEMP_BOA.
const TEMP_SAIDA = 0.6, TEMP_BOA = 0.75, FRIO = 0.92;
const limite = (v, a, b) => Math.max(a, Math.min(b, v));

function pneuNovo(composto = COMPOSTO_PADRAO) {
  return { composto: PNEUS[composto] ? composto : COMPOSTO_PADRAO, desgaste: 0, temp: TEMP_SAIDA };
}
// Um passo do pneu. O desgaste anda pela distância (fração da corrida inteira), então 3 ou 8 voltas gastam a mesma
// fração do pneu: a estratégia é a mesma em qualquer tamanho de corrida. Escorregar gasta mais; andar limpo, um pouco
// menos que o normal. A temperatura vai para um alvo pela velocidade e pelo escorregão, mais rápido no macio.
// d: { dist (andado neste passo), total (a corrida inteira), slip, v, vmax, dt }
function gastarPneu(pneu, d) {
  const pn = PNEUS[pneu.composto] || PNEUS[COMPOSTO_PADRAO];
  const escorrega = limite((d.slip || 0) / 60, 0, 1);
  if (d.total > 0 && d.dist > 0) pneu.desgaste = Math.min(1, pneu.desgaste + (d.dist / d.total) * (PENHASCO / pn.vida) * (0.85 + 0.6 * escorrega));
  const vel = d.vmax > 0 ? limite(Math.abs(d.v || 0) / d.vmax, 0, 1) : 0;
  const alvo = Math.min(1, 0.5 + 0.45 * vel + 0.15 * escorrega);
  pneu.temp += (alvo - pneu.temp) * Math.min(1, (d.dt || 0) * 0.25 * pn.aquece);
  return pneu;
}
// Quanto o pneu segura agora: `grip` multiplica o grip do carro e `kin` o quanto sobra escorregando.
function aderencia(pneu) {
  const pn = PNEUS[pneu && pneu.composto] || PNEUS[COMPOSTO_PADRAO], d = pneu ? pneu.desgaste : 0, temp = pneu ? pneu.temp : TEMP_BOA;
  const perda = d <= PENHASCO ? PERDA_ANTES * d / PENHASCO : PERDA_ANTES + (PERDA_FIM - PERDA_ANTES) * (d - PENHASCO) / (1 - PENHASCO);
  const quente = FRIO + (1 - FRIO) * limite((temp - TEMP_SAIDA) / (TEMP_BOA - TEMP_SAIDA), 0, 1);
  return { grip: limite(pn.pico * (1 - perda) * quente, 0.7, 1.1), kin: limite(1 - perda * 0.5, 0.85, 1) };
}
const frio = (pneu) => !!pneu && pneu.temp < TEMP_BOA - 0.02;

const api = { PNEUS, COMPOSTO_PADRAO, PENHASCO, pneuNovo, gastarPneu, aderencia, frio };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.F1Regras = api;
})(typeof window !== "undefined" ? window : globalThis);
