// O simulador de stint da Corrida (regras de F1): o piloto ideal (o mesmo perfil de velocidade de `Dinamica.perfilIdeal` e o
// mesmo piloto automático de `Sim.pilotoAutomatico`) dá a volta com a física de verdade, com cada composto em cada estado
// de desgaste. Daqui saem os números que calibram os pneus e a tabela que os robôs usam para escolher a estratégia
// (`ferramentas/pneus-tabela.js` grava `public/corrida/f1-pneus-ritmo.js`); os testes de `tests/corrida-f1-estrategia.test.js`
// conferem a tabela contra esta física.
//
//   voltaFixa(pista, { composto, desgaste, temp })   o tempo de uma volta lançada com o pneu parado nesse estado
//   medirFrio(pista, composto)                       quanto a primeira volta com o pneu frio perde para a quente
//   medirParada(pista)                               quanto uma parada custa de verdade (entrada + limitador + parada + saída)
//   corridaCompleta(pista, voltas, plano)            a corrida inteira, com as trocas de pneu: o tempo de cada volta
//   tabelaDaPista(pista)                             tudo isso junto, no formato da tabela
"use strict";
const D = require("../public/corrida/dinamica.js");
const S = require("../public/corrida/sim.js");
const T = require("../public/corrida/pistas.js");
const F1 = require("../public/corrida/f1-regras.js");
const Equipes = require("../public/corrida/f1-equipes.js");

const SPEC = Equipes.specDaEquipe("mclaren");
const MARGEM = 0.92;           // a margem do piloto ideal sobre o limite de curva (a mesma dos robôs e dos testes de física)
const PARADA_MEDIA = F1.PARADAS.reduce((s, q, i, a) => s + q.tempo * (q.ate - (i ? a[i - 1].ate : 0)), 0); // o tempo esperado parado
const limite = (v, a, b) => (v < a ? a : v > b ? b : v);

// o que a análise (perfil ideal, limite de curva) precisa saber do pneu
const extDoPneu = (pneu) => { const a = F1.aderencia(pneu); return { grip: a.grip, freio: a.freio, tracao: a.tracao, potencia: a.final ** 3 }; };

// O piloto ideal de um carro numa pista: o perfil de velocidade refeito quando a aderência do pneu muda (pneu frio que
// esquenta, pneu que gasta), o alvo olhando um pouco à frente, e a entrada do passo.
function pilotoIdeal(tr, spec) {
  const ent = {}; let perfil = null, gripPerfil = 0, freioPerfil = 0, passos = 0;
  const refazer = (pneu) => { const e = extDoPneu(pneu); perfil = D.perfilIdeal(tr.pts, spec, 6, MARGEM, e); gripPerfil = e.grip; freioPerfil = e.freio; };
  return (c) => {
    if (!perfil || (passos++ % 24 === 0 && (Math.abs(F1.aderencia(c.pneu).grip / gripPerfil - 1) > 0.012 || Math.abs(F1.aderencia(c.pneu).freio / freioPerfil - 1) > 0.012))) refazer(c.pneu);
    let alvo = 1e9; const K = Math.ceil(Math.max(c.v, 30) * 0.3 / 6);
    for (let k = 0; k <= K; k++) alvo = Math.min(alvo, perfil[(c.idx + 1 + k) % tr.n]);
    S.pilotoAutomatico(c, tr, spec, alvo, 0, ent);
    ent.gas = c.v < alvo ? 1 : 0; ent.brake = c.v > alvo * 1.03 ? 1 : 0; if (ent.brake) ent.gas = 0;
    return ent;
  };
}
const pistaDe = (id) => S.preparar(S.criarPista(T.PISTAS[id], id));

// Uma volta lançada (da segunda à terceira cruzada da linha, saindo do grid: a primeira ainda é a arrancada) com o pneu parado no estado `pn`: o tempo, o desgaste
// que o piloto ia gastar nela e o estresse médio dele (para a calibração do ritmo de desgaste).
function voltaFixa(pista, pn, { spec = SPEC } = {}) {
  const tr = pistaDe(pista), t = T.PISTAS[pista], estado = { composto: pn.composto, desgaste: pn.desgaste, temp: pn.temp == null ? 1 : pn.temp };
  const c = S.novo(tr, { grid: 0, f1: true, pneu: { ...estado } }), amb = { spec, voltas: 99, laps: 0, f1: true, outros: [] }, ev = [], pilota = pilotoIdeal(tr, spec);
  let setores = 0, tempo = 0, t0 = 0, ganho = 0, muros = 0, passos = 0, dist = 0;
  for (let i = 0; i < 120 * 400; i++) {
    const ent = pilota(c);
    ev.length = 0; const xa = c.x, ya = c.y; S.passo(c, ent, amb, tr, ev); tempo += S.PASSO;
    if (setores >= 2) { ganho += c.pneu.desgaste - estado.desgaste; dist += Math.hypot(c.x - xa, c.y - ya); passos++; }
    c.pneu.composto = estado.composto; c.pneu.desgaste = estado.desgaste; c.pneu.temp = estado.temp;
    for (const e of ev) {
      if (e.t === "muro" && setores >= 2) muros++;
      if (e.t === "setor" && e.s === 0) { setores++; amb.laps++; if (setores < 2) continue; if (setores === 2) { t0 = tempo; ganho = 0; } else return { tempo: tempo - t0, desgaste: ganho, dist, muros }; }
    }
  }
  return { tempo: null, desgaste: ganho, muros, dist };
}

// Uma corrida inteira com o piloto ideal e o pneu de verdade (gasta e esquenta sozinho). `plano`: { largada, paradas: [{ volta,
// composto }] }, a mesma estrutura de `F1.estrategia`; `parada` é o tempo parado no box (a média esperada, por padrão).
// Devolve o tempo total, o de cada volta e o desgaste em que cada pneu chegou ao fim.
function corridaCompleta(pista, voltas, plano, { spec = SPEC, parada = PARADA_MEDIA, estresse = 1 } = {}) {
  const tr = pistaDe(pista), c = S.novo(tr, { grid: 0, f1: true, pneu: F1.pneuNovo(plano.largada), box: true });
  const amb = { spec, voltas, laps: 0, paradas: 0, semente: 1, id: "ideal", grid: 0, f1: true, outros: [] }, ev = [], pilota = pilotoIdeal(tr, spec);
  const largada = c.pneu.composto; let setores = 0, tempo = 0, anterior = 0, falta = plano.paradas.slice(); const voltasTempo = [], pneus = [{ composto: largada }];
  for (let i = 0; i < 120 * 60 * 30; i++) {
    const ent = pilota(c), prox = falta[0];
    ent.pedido = prox && amb.laps + 1 >= prox.volta && amb.laps + 1 < voltas ? prox.composto : null;
    ev.length = 0; S.passo(c, ent, amb, tr, ev); tempo += S.PASSO;
    if (c.box && c.box.fase === "entra" && c.box.parada !== parada) { c.box.parada = parada; pneus[pneus.length - 1].desgaste = c.pneu.desgaste; }
    for (const e of ev) {
      if (e.t === "box" && e.fase === "sai") { falta.shift(); amb.paradas++; pneus.push({ composto: c.pneu.composto }); }
      if (e.t === "setor" && e.s === 0) {
        setores++;
        if (setores > 1) { amb.laps++; voltasTempo.push(tempo - anterior); if (amb.laps >= voltas) { pneus[pneus.length - 1].desgaste = c.pneu.desgaste; return { tempo, voltas: voltasTempo, pneus, paradas: amb.paradas }; } }
        anterior = tempo;
      }
    }
  }
  return { tempo: null, voltas: voltasTempo, pneus, paradas: amb.paradas };
}
// o tempo de "todas as voltas" de uma corrida que NÃO conta a largada parada: tira a primeira volta (igual em qualquer plano)
const semAPrimeira = (r) => r.tempo - r.voltas[0];

// A primeira volta com o pneu frio perde quanto sobre a mesma volta com o pneu quente? (saída do box ou largada)
function medirFrio(pista, composto, { spec = SPEC } = {}) {
  const tr = pistaDe(pista), amb = { spec, voltas: 99, laps: 0, f1: true, outros: [] }, ev = [];
  const rodar = (frio) => {
    const pn = F1.pneuNovo(composto); if (!frio) pn.temp = 1;
    const c = S.novo(tr, { grid: 0, f1: true, pneu: pn }), pilota = pilotoIdeal(tr, spec); let tempo = 0, setores = 0, t0 = 0;
    for (let i = 0; i < 120 * 300; i++) {
      const ent = pilota(c); ev.length = 0; S.passo(c, ent, amb, tr, ev); tempo += S.PASSO;
      if (!frio) { c.pneu.temp = 1; c.pneu.desgaste = 0; }
      for (const e of ev) if (e.t === "setor" && e.s === 0) { setores++; if (setores === 1) t0 = tempo; else return tempo - t0; }
    }
    return null;
  };
  // a primeira volta lançada: sai do grid em repouso, então o pneu frio esquenta já na primeira volta; a diferença para a
  // quente é o que o pneu frio custa em qualquer saída
  return rodar(true) - rodar(false);
}

// Quanto custa uma parada de verdade: o tempo que o carro leva do ponto `-0,05 volta` (antes da entrada) a `+0,12 volta` depois
// da saída, passando pelo corredor, contra o mesmo trecho sem parar, com o pneu quente nos dois casos. Soma o tempo parado.
function medirParada(pista, { spec = SPEC, parado = PARADA_MEDIA } = {}) {
  const tr = pistaDe(pista), cor = tr.corredor, n = tr.n, amb = { spec, voltas: 99, laps: 0, paradas: 0, semente: 1, id: "ideal", grid: 0, f1: true, outros: [] };
  const antes = Math.round(n * 0.05), depois = Math.round(n * 0.12);
  const ref0 = (cor.i0 - antes + n) % n, ref1 = (cor.i0 + cor.len + depois) % n;
  const rodar = (parar) => {
    const pn = F1.pneuNovo("medio"); pn.temp = 1;
    const c = S.novo(tr, { grid: 0, f1: true, pneu: pn, box: true }), pilota = pilotoIdeal(tr, spec), ev = [];
    let tempo = 0, t0 = null, cruzou0 = 0, fase = 0, feito = false;
    for (let i = 0; i < 120 * 600; i++) {
      const ent = pilota(c); ent.pedido = parar && fase === 1 && !feito ? "medio" : null;
      ev.length = 0; S.passo(c, ent, amb, tr, ev); tempo += S.PASSO;
      c.pneu.composto = "medio"; c.pneu.temp = 1; c.pneu.desgaste = 0;
      if (c.box && c.box.fase === "entra" && c.box.parada !== 0) c.box.parada = 0;
      for (const e of ev) { if (e.t === "box" && e.fase === "sai") feito = true; if (e.t === "setor" && e.s === 0) amb.laps++; }
      const pos = c.idx;
      if (fase === 0 && tempo > 8 && pos === ref0) { fase = 1; t0 = tempo; } // já na volta lançada, passando por ref0
      else if (fase === 1 && ((!parar || feito) && pos === ref1) && tempo - t0 > 1) return tempo - t0;
    }
    return null;
  };
  const sem = rodar(false), com = rodar(true);
  return { perda: com - sem + parado, semParar: sem, comParar: com, corredor: cor.comprimento / (F1.LIMITADOR * spec.vmax), parado };
}

// a tabela de uma pista: o tempo da volta lançada de cada composto em cada estado de desgaste (pneu quente), quanto o piloto
// ideal gasta por volta, o que o pneu frio perde na primeira volta e o que uma parada custa
const GRADE_DESGASTE = [0, 0.2, 0.4, 0.6, 0.8, 0.85, 0.9, 0.95, 1];
function tabelaDaPista(pista, { spec = SPEC } = {}) {
  const t = T.PISTAS[pista], tab = { pista, volta: 0, antes: !!(t.boxes && t.boxes.entra > 0.5), compostos: {}, parada: 0 };
  for (const composto of Object.keys(F1.PNEUS)) {
    const tempos = [], gastos = [];
    for (const d of GRADE_DESGASTE) {
      const r = voltaFixa(pista, { composto, desgaste: d, temp: 1 }, { spec });
      tempos.push(Math.round(r.tempo * 1000) / 1000); gastos.push(r.desgaste);
    }
    const dc = gastos.slice(0, 5).reduce((a, b) => a + b, 0) / 5; // o desgaste por volta até o penhasco
    tab.compostos[composto] = { tempos, gasto: Math.round(dc * 100000) / 100000, frio: Math.round(medirFrio(pista, composto, { spec }) * 1000) / 1000 };
  }
  tab.volta = tab.compostos.medio.tempos[0];
  const p = medirParada(pista, { spec }); tab.parada = Math.round(p.perda * 1000) / 1000; tab.semParada = Math.round((p.perda - p.parado) * 1000) / 1000;
  // o piloto ideal não fecha a volta em toda pista (as de kart saem da linha com o pneu no fim): sem número bom, sem tabela
  const m = tab.compostos.medio.tempos, ruim = Object.values(tab.compostos).some((c) => c.tempos.some((x, i) => !(x > 0) || !isFinite(x) || (i && x < c.tempos[i - 1] - 1.5) || x > m[0] * 1.6)) || !(tab.parada > 3 && tab.parada < 12);
  if (ruim) throw new Error(`${pista}: o piloto ideal não deu um tempo confiável`);
  return tab;
}

const temBox = (pista) => !!(T.PISTAS[pista] && T.PISTAS[pista].boxes);

module.exports = { temBox, SPEC, PARADA_MEDIA, GRADE_DESGASTE, extDoPneu, pilotoIdeal, voltaFixa, corridaCompleta, semAPrimeira, medirFrio, medirParada, tabelaDaPista };
