// Corrida da Galera — as regras de Fórmula 1 (planos/temporada-f1.md), as mesmas no servidor e no navegador.
// Só contas, sem desenho: liga com `config.regras === "f1"` na sala. Os pneus: três compostos secos, o desgaste e a
// temperatura. A física (fisica.js) multiplica a aderência do carro pela do pneu, e os robôs (corrida-robos.js) usam as
// mesmas funções. E o pit stop: o corredor dos boxes (`corredor`), o tempo da parada (`tempoDeParada`), a regra dos dois
// compostos e a estratégia de parada dos robôs (`estrategia`).
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

// ---------- o pit stop ----------
// No corredor dos boxes o carro anda sozinho no limitador (LIMITADOR da velocidade final), para na garagem, troca os
// pneus e volta para a pista. A parada leva PARADA_BASE s mais o erro dos mecânicos (de 0 a PARADA_ERRO s, sorteado
// com a semente do GP: recarregar a página nunca muda o resultado). Quem termina a corrida sem ter usado dois
// compostos leva UM_COMPOSTO s no resultado; passar do limitador leva RAPIDO s.
const LIMITADOR = 0.40, PARADA_BASE = 2.4, PARADA_ERRO = 1.5, UM_COMPOSTO = 10, RAPIDO = 5;
const RAMPA = 14, LARGURA_CORREDOR = 34, FOLGA_CORREDOR = 12, GARAGENS = 10; // a rampa é em pontos da pista (6 unidades cada)
const hashTexto = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
// gerador com semente (mulberry32): a mesma semente dá sempre a mesma sequência
function sorteio(semente) { let a = hashTexto(semente) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// quanto dura a n-ésima parada de `quem` neste GP: a maioria sai limpa, de vez em quando o mecânico erra
function tempoDeParada(semente, quem, n) {
  const r = sorteio(`${semente}:${quem}:${n}`)();
  return Math.round((PARADA_BASE + PARADA_ERRO * r * r) * 100) / 100;
}
// O corredor da pista `t` (que tem `boxes: { entra, para, sai, lado }`, frações da volta): faixa paralela à reta, do lado
// de dentro, atrás de uma mureta. `n` é o número de pontos da pista (de 6 em 6 unidades) e `W` a largura. Os pontos do
// corredor vão de 0 (a entrada, `i0`) a `len` (a saída); `lat(u, lat0)` é o lado em que o carro está no ponto u, saindo
// de onde estava (lat0) e entrando na faixa na rampa; no fim a rampa leva de volta para a beira da pista.
function corredor(t, n, W) {
  const b = t && t.boxes; if (!b || !n) return null;
  const i0 = Math.round(b.entra * n) % n, rel = (f) => (((Math.round(f * n) - i0) % n) + n) % n;
  const len = rel(b.sai), ip = rel(b.para), lado = b.lado < 0 ? -1 : 1, D = lado * (W / 2 + FOLGA_CORREDOR + LARGURA_CORREDOR / 2), fim = lado * (W / 2 - 22);
  const gap = Math.max(2, Math.min(7, Math.min(ip - RAMPA - 2, len - RAMPA - 2 - ip) / 5)); // pontos entre garagens
  const garagens = Array.from({ length: GARAGENS }, (_, k) => ip + (k - (GARAGENS - 1) / 2) * gap);
  const suave = (x) => { x = limite(x, 0, 1); return x * x * (3 - 2 * x); };
  const lat = (u, lat0 = fim) => u >= len - RAMPA ? D + (fim - D) * suave((u - (len - RAMPA)) / RAMPA) : lat0 + (D - lat0) * suave(u / RAMPA);
  return { i0, ip, len, lado, D, fim, garagens, gap, lat, larguraCorredor: LARGURA_CORREDOR, folga: FOLGA_CORREDOR, comprimento: len * 6 };
}
// a garagem do piloto de número `k` no grid (cada um tem a sua, até GARAGENS)
const garagemDe = (c, k) => c.garagens[((k % GARAGENS) + GARAGENS) % GARAGENS];
// o tempo que uma parada deixa o carro no corredor: andar nele no limitador mais a parada
const tempoNoBox = (c, vmax, parada) => c.comprimento / (LIMITADOR * vmax) + parada;
// registra a parada de `p` (volta em que entrou, quanto ficou, composto novo) e o composto passa a valer
function registrarParada(p, { volta, tempo, composto }) {
  (p.paradas = p.paradas || []).push({ volta, tempo, composto });
  p.compostos = Array.from(new Set([...(p.compostos || [p.pneu || COMPOSTO_PADRAO]), composto]));
  p.pneuAtual = composto;
  return p.paradas.length;
}
// o que a regra dos dois compostos tira de quem terminou com um só (corrida de uma volta não tem onde parar)
const usouDoisCompostos = (p) => new Set(p.compostos || [p.pneu || COMPOSTO_PADRAO]).size >= 2;
const acrescimoDeFinal = (p, voltas) => (voltas >= 2 && !usouDoisCompostos(p) ? UM_COMPOSTO : 0);
// A estratégia de um robô: o composto da largada e as paradas { volta, composto } (`volta` = a volta, de 1 a voltas − 1,
// no fim da qual ele entra no corredor: nunca na última). Cada trecho tem que caber na vida do composto, e dois
// trechos seguidos nunca usam o mesmo, então a corrida sempre tem dois compostos. Os difíceis, com a corrida longa,
// às vezes fazem duas paradas.
function estrategia(voltas, nivel = "medio", semente = 1) {
  const r = sorteio(`estrategia:${semente}`), compostos = Object.keys(PNEUS);
  const escolher = (trecho, anterior) => {
    const cabem = compostos.filter((c) => c !== anterior && PNEUS[c].vida * 1.15 >= trecho);
    const lista = cabem.length ? cabem : compostos.filter((c) => c !== anterior).sort((a, b) => PNEUS[b].vida - PNEUS[a].vida).slice(0, 1);
    return lista[Math.floor(r() * lista.length)];
  };
  if (voltas < 2) return { largada: escolher(1, null), paradas: [] };
  const duas = nivel === "dificil" && voltas >= 5 && r() < 0.4;
  const folga = nivel === "facil" ? 0.2 : nivel === "dificil" ? 0.08 : 0.14;
  let voltasDasParadas;
  if (duas) {
    const v1 = limite(Math.round(voltas * (0.27 + folga * r() * 0.5)), 1, voltas - 2);
    voltasDasParadas = [v1, limite(Math.round(voltas * (0.62 + folga * r() * 0.5)), v1 + 1, voltas - 1)];
  } else voltasDasParadas = [limite(Math.round(voltas * (0.38 + folga * (r() * 2 - 1))), 1, voltas - 1)];
  const marcos = [0, ...voltasDasParadas, voltas], paradas = [];
  let anterior = null, largada = null;
  for (let k = 0; k + 1 < marcos.length; k++) {
    const c = escolher((marcos[k + 1] - marcos[k]) / voltas, anterior);
    if (k === 0) largada = c; else paradas.push({ volta: marcos[k], composto: c });
    anterior = c;
  }
  return { largada, paradas };
}

const api = { PNEUS, COMPOSTO_PADRAO, PENHASCO, pneuNovo, gastarPneu, aderencia, frio,
  LIMITADOR, PARADA_BASE, PARADA_ERRO, UM_COMPOSTO, RAPIDO, RAMPA, GARAGENS, sorteio, tempoDeParada, corredor, garagemDe, tempoNoBox, registrarParada, usouDoisCompostos, acrescimoDeFinal, estrategia };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.F1Regras = api;
})(typeof window !== "undefined" ? window : globalThis);
