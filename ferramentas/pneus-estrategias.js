#!/usr/bin/env node
// Imprime, para cada pista pedida, o tempo de planos de pneus típicos e os melhores de cada família (pela tabela medida):
//   node ferramentas/pneus-estrategias.js interlagos monaco monza 5
// (o último número, se houver, é a quantidade de voltas; sem ele, 3, 5 e 10)
"use strict";
const R = require("../public/corrida/f1-pneus-ritmo.js");
const letra = { macio: "S", medio: "M", duro: "H" };
const nome = (p, tab) => { const ts = R.trechos(tab, 99, p); return ts.map((t) => letra[t.composto]).join("-"); };
const args = process.argv.slice(2), voltasPedidas = args.filter((a) => /^\d+$/.test(a)).map(Number), ids = args.filter((a) => !/^\d+$/.test(a));
for (const id of ids.length ? ids : Object.keys(R.TABELAS)) {
  const tab = R.tabelaDe(id); if (!tab) continue;
  for (const voltas of voltasPedidas.length ? voltasPedidas : [3, 5, 10]) {
    const todos = R.planos(tab, voltas), melhor = todos[0].tempo, fam = new Map();
    for (const p of todos) { const k = p.largada[0] + "/" + p.paradas.map((q) => q.composto[0]).join("") + "/" + p.paradas.length; if (!fam.has(k)) fam.set(k, p); }
    const resumo = (p) => `${p.trechos.map((n, i) => letra[i ? p.paradas[i - 1].composto : p.largada] + n).join(" ")} +${(p.tempo - melhor).toFixed(1)}`;
    console.log(`${id} ${voltas} voltas (volta ${tab.volta.toFixed(1)} s, parada ${tab.parada.toFixed(1)} s): melhor ${melhor.toFixed(1)} s`);
    console.log("   " + todos.slice(0, 10).map(resumo).join(" | "));
  }
}
