#!/usr/bin/env node
// Mede a tabela de pneus de cada pista com o simulador de stint (ferramentas/pneus-fisica.js: o piloto ideal com a física do
// carro) e grava public/corrida/f1-pneus-tabela.js, que os robôs leem (public/corrida/f1-pneus-ritmo.js) para escolher a
// estratégia. Roda de novo sempre que os pneus (f1-regras.js) ou a física mudam: o teste de tests/corrida-f1-estrategia.test.js
// confere se a tabela ainda bate com a física.
//
//   node ferramentas/pneus-tabela.js                  (todas as pistas)
//   node ferramentas/pneus-tabela.js interlagos monza (só essas; as outras ficam como estão)
"use strict";
const fs = require("fs");
const path = require("path");
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");

const ARQUIVO = path.join(__dirname, "..", "public", "corrida", "f1-pneus-tabela.js");

if (!isMainThread) {
  const P = require("./pneus-fisica.js");
  const feito = {}, falhas = [];
  for (const id of workerData.ids) {
    if (!P.temBox(id)) { falhas.push(id); continue; } // pista sem corredor dos boxes não tem parada: os robôs usam a conta padrão
    try { feito[id] = P.tabelaDaPista(id); } catch (e) { console.warn(e.message); falhas.push(id); }
  }
  parentPort.postMessage({ feito, falhas });
} else {
  const T = require("../public/corrida/pistas.js");
  const pedidas = process.argv.slice(2), ids = pedidas.length ? pedidas : Object.keys(T.PISTAS);
  const filas = Array.from({ length: Math.min(4, ids.length) }, () => []);
  ids.forEach((id, i) => filas[i % filas.length].push(id));
  let atual = {};
  try { atual = require(ARQUIVO).TABELAS; } catch (e) { /* primeira vez */ }
  const novas = {}, semTabela = [];
  Promise.all(filas.map((fila) => new Promise((ok, erro) => {
    const w = new Worker(__filename, { workerData: { ids: fila } });
    w.on("message", (m) => { Object.assign(novas, m.feito); semTabela.push(...m.falhas); ok(); }); w.on("error", erro);
  }))).then(() => {
    const todas = { ...atual, ...novas }; for (const id of semTabela) delete todas[id];
    const ordem = Object.keys(T.PISTAS).filter((id) => todas[id]);
    const linhas = ordem.map((id) => `  ${id}: ${JSON.stringify(todas[id])},`);
    const txt = `// GERADO por ferramentas/pneus-tabela.js (o simulador de stint com a física do carro): não edite à mão. Para cada pista, o
// tempo da volta de cada composto a cada desgaste (GRADE de f1-pneus-ritmo.js), quanto o piloto ideal gasta o pneu por volta, o
// que o pneu frio perde e o que uma parada custa de verdade.
(function (root) {
const TABELAS = {
${linhas.join("\n")}
};
const api = { TABELAS };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.F1PneusTabela = api;
})(typeof window !== "undefined" ? window : globalThis);
`;
    fs.writeFileSync(ARQUIVO, txt.replace(/\r?\n/g, "\r\n"));
    console.log(`gravou ${ordem.length} pistas em ${path.relative(process.cwd(), ARQUIVO)} (${Object.keys(novas).length} medidas agora)`);
  }).catch((e) => { console.error(e); process.exit(1); });
}
