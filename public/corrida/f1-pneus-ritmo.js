// Corrida da Galera — a conta da estratégia de pneus (UMD, só contas). A partir da tabela de uma pista (`f1-pneus-tabela.js`,
// que o simulador de stint de `ferramentas/pneus-fisica.js` mede com a física do carro e o piloto ideal), calcula o tempo de
// uma corrida inteira para um plano de pneus e acha os melhores planos. É o que os robôs usam em `F1.estrategia` e o que os
// testes conferem contra a física.
//
// A tabela de uma pista: { volta (s, médio novo), antes (o corredor dos boxes começa antes da linha de chegada), parada (s, o
// que uma parada custa de verdade: entrada, limitador, tempo parado e saída), compostos: { <composto>: { tempos (o tempo da
// volta com o pneu quente, a cada GRADE de desgaste), gasto (desgaste por volta do piloto ideal), frio (o que a primeira volta
// com pneu frio perde) } } }.
//
// Um plano é { largada, paradas: [{ volta, composto }] } (a mesma forma de `F1.estrategia`): `volta` é a volta em que o carro
// entra no corredor, no fim dela se a entrada fica antes da linha (Interlagos), ou no começo, se fica depois (Monza).
(function (root) {

const GRADE = [0, 0.2, 0.4, 0.6, 0.8, 0.85, 0.9, 0.95, 1]; // os desgastes em que a tabela mede o tempo da volta
const UM_COMPOSTO = 10;                                      // teto da penalidade por terminar com um composto só
const penalidadeUmComposto = (voltas) => voltas >= 2 ? Math.min(UM_COMPOSTO, voltas) : 0;
let TABELAS = null;
try { TABELAS = (root.F1PneusTabela || require("./f1-pneus-tabela.js")).TABELAS; } catch (e) { TABELAS = {}; }

const tabelaDe = (pista) => (pista && TABELAS[pista]) || null;

// o tempo da volta de um composto no desgaste d (interpolado na tabela)
function tempoNoDesgaste(comp, d) {
  d = Math.max(0, Math.min(1, d));
  let i = 1; while (i < GRADE.length - 1 && GRADE[i] < d) i++;
  const f = (d - GRADE[i - 1]) / (GRADE[i] - GRADE[i - 1]);
  return comp.tempos[i - 1] + (comp.tempos[i] - comp.tempos[i - 1]) * f;
}
// o tempo médio de uma volta que começa com desgaste d0 e termina em d1
function tempoDaVolta(comp, d0, d1) {
  const N = 8; let s = 0;
  for (let k = 0; k < N; k++) s += tempoNoDesgaste(comp, d0 + (d1 - d0) * (k + 0.5) / N);
  return s / N;
}

// Os trechos de um plano em voltas inteiras: [{ composto, voltas }]. Com a entrada do corredor antes da linha, parar "na volta v"
// é correr v voltas e entrar; com ela depois da linha, são v − 1.
function trechos(tab, voltas, plano) {
  const out = []; let ult = 0, composto = plano.largada;
  for (const p of [...plano.paradas].sort((a, b) => a.volta - b.volta)) {
    const fim = p.volta - (tab.antes ? 0 : 1);
    out.push({ composto, voltas: fim - ult }); ult = fim; composto = p.composto;
  }
  out.push({ composto, voltas: voltas - ult });
  return out;
}
// O tempo de uma corrida (sem a largada parada, igual em qualquer plano): a soma das voltas, mais o que cada parada custa,
// mais a penalidade proporcional se terminou com um composto só (voltas ≥ 2). `fator` é o gasto de pneu do carro; devolve também cada volta
// e o desgaste em que cada pneu terminou.
function simular(tab, voltas, plano, { fator = 1, parada = null } = {}) {
  const ts = trechos(tab, voltas, plano), laps = [], fins = [];
  let valido = ts.every((t) => t.voltas >= 1 && tab.compostos[t.composto]);
  for (const t of ts) {
    const comp = tab.compostos[t.composto]; if (!comp) continue;
    let d = 0;
    for (let k = 0; k < t.voltas; k++) {
      const d1 = Math.min(1, d + comp.gasto * fator);
      laps.push(tempoDaVolta(comp, d, d1) + (k === 0 ? comp.frio : 0)); d = d1;
    }
    fins.push(d);
  }
  const paradas = plano.paradas.length, doisCompostos = new Set(ts.map((t) => t.composto)).size >= 2 || voltas < 2;
  const tempo = laps.reduce((s, x) => s + x, 0) + paradas * (parada == null ? tab.parada : parada) + (doisCompostos ? 0 : penalidadeUmComposto(voltas));
  return { tempo, voltas: laps, desgaste: fins, valido, doisCompostos };
}

// O tempo de um trecho de `n` voltas com um composto novo (a primeira volta com o pneu frio): é o que os planos somam.
function tempoDoTrecho(tab, composto, n, fator = 1) {
  const comp = tab.compostos[composto]; let d = 0, t = 0;
  for (let k = 0; k < n; k++) { const d1 = Math.min(1, d + comp.gasto * fator); t += tempoDaVolta(comp, d, d1) + (k === 0 ? comp.frio : 0); d = d1; }
  return t;
}
// Todos os planos com até `maxParadas` paradas, do melhor para o pior (o composto pode se repetir em dois trechos seguidos: um
// pneu novo do mesmo composto). Quem termina com um só composto leva penalidade proporcional; a entrada do
// corredor nunca é na última volta (nem, com o corredor depois da linha, na penúltima). `janela` (s) guarda só os planos até
// esse tanto do melhor, e `max` os `max` primeiros (as corridas longas têm milhões de planos). Cada plano traz `trechos` (as
// voltas de cada composto) e `tempo`.
function planos(tab, voltas, { maxParadas = voltas >= 15 ? 4 : voltas >= 6 ? 3 : 2, fator = 1, janela = Infinity, max = Infinity, exigirDois = false } = {}) {
  const compostos = ["macio", "medio", "duro"].filter((c) => tab.compostos[c]), desloc = tab.antes ? 0 : 1, memo = new Map(), out = [];
  const piso = Math.min(...compostos.flatMap((c) => tab.compostos[c].tempos)); // nenhuma volta é mais rápida que isso: corta os planos que já não têm chance
  const trecho = (c, n) => { const k = c + n; let t = memo.get(k); if (t === undefined) { t = tempoDoTrecho(tab, c, n, fator); memo.set(k, t); } return t; };
  let melhor = Infinity; const atual = [];
  const fecha = (tempo, usados, k) => {
    if (exigirDois && voltas >= 2 && (usados & (usados - 1)) === 0) return;
    const total = tempo + k * tab.parada + ((usados & (usados - 1)) !== 0 ? 0 : penalidadeUmComposto(voltas));
    if (total > melhor + janela) return;
    if (total < melhor) melhor = total;
    out.push({ tempo: total, trechos: atual.map((x) => x[1]), composto: atual.map((x) => x[0]) });
  };
  const rec = (restante, tempo, usados, k) => {
    for (const c of compostos) for (let n = 1; n <= restante; n++) {
      if (atual.filter((x) => x[0] === c).length >= 2) continue; // só dois jogos de cada composto
      const t = tempo + trecho(c, n), us = usados | (1 << compostos.indexOf(c));
      atual.push([c, n]);
      if (n === restante) { if (!(desloc && k > 0 && n < 2)) fecha(t, us, k); }
      else if (k < maxParadas && t + (k + 1) * tab.parada + (restante - n) * piso <= melhor + janela) rec(restante - n, t, us, k + 1);
      atual.pop();
    }
  };
  rec(voltas, 0, 0, 0);
  let acumulado;
  const lista = out.filter((p) => p.tempo <= melhor + janela).sort((a, b) => a.tempo - b.tempo).slice(0, max).map((p) => {
    acumulado = 0;
    const paradas = p.composto.slice(1).map((c, i) => { acumulado += p.trechos[i]; return { volta: acumulado + desloc, composto: c }; });
    return { largada: p.composto[0], paradas, tempo: p.tempo, trechos: p.trechos };
  });
  return lista;
}

const api = { GRADE, UM_COMPOSTO, penalidadeUmComposto, tabelaDe, tempoNoDesgaste, tempoDaVolta, tempoDoTrecho, trechos, simular, planos, get TABELAS() { return TABELAS; } };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.F1PneusRitmo = api;
})(typeof window !== "undefined" ? window : globalThis);
