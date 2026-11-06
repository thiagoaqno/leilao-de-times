// Calcula a linha de corrida de cada pista de GP (corrida-piloto.js, `calcularLinha`) e guarda os nós em corrida-linhas-f1.json, para o servidor e os
// testes não refazerem a conta. Rodar de novo só quando um traçado, os muros ou o piloto mudarem: `node ferramentas/gerar-linhas-f1.js [pistas...]`
"use strict";
const fs = require("fs"), path = require("path");
const T = require("../public/corrida/pistas.js"), F1 = require("../public/corrida/f1-regras.js"), Equipes = require("../public/corrida/f1-equipes.js");
const Piloto = require("../corrida-piloto.js");
const ARQ = path.join(__dirname, "..", "corrida-linhas-f1.json"), FANTASIA = new Set(["serra", "deserto", "nurburgring", "arcoiris"]), PASSO_NO = 8;
const salvo = fs.existsSync(ARQ) ? JSON.parse(fs.readFileSync(ARQ, "utf8")) : {};
const spec = Equipes.specDaEquipe("mclaren"), ref = F1.aderencia({ composto: "medio", desgaste: 0, temp: 1 });
const pedidas = process.argv.slice(2), pistas = pedidas.length ? pedidas : Object.keys(T.PISTAS).filter((id) => !FANTASIA.has(id));
for (const id of pistas) {
  const t = T.PISTAS[id], pts = T.pontos(t, 6), n = pts.length, inicio = Date.now();
  const lat = Piloto.calcularLinha(t, pts, spec, ref), m = Math.floor(n / PASSO_NO);
  salvo[id] = { n, nos: Array.from({ length: m }, (_, a) => Math.round(lat[Math.round((a * n) / m) % n] * 10) / 10) };
  fs.writeFileSync(ARQ, "{\n" + Object.keys(salvo).sort().map((k) => JSON.stringify(k) + ":" + JSON.stringify(salvo[k])).join(",\n") + "\n}\n");
  console.log(id, n, "pontos", ((Date.now() - inicio) / 1000).toFixed(1) + " s");
}
