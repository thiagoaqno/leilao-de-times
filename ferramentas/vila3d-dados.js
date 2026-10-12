// Gera public/vila3d/dados.js a partir da Vila de public/index.html (só os prédios, com as coordenadas da vila, sem OX/OY).
// Uso: node ferramentas/vila3d-dados.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const html = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");
const a = html.indexOf("const GAMES = ["), b = html.indexOf("Lideres.GINASIOS");
const c = html.indexOf("const FOUNTAIN"), d = html.indexOf("// leva a vila para o meio do mapa grande");
const ctx = vm.createContext({});
const pre = (html.slice(a, b)).replace(/^const /gm, "var ");
vm.runInContext(pre, ctx);
vm.runInContext(html.slice(c, d).replace(/^const /gm, "var "), ctx);
const jogos = ctx.GAMES.filter((g) => g.bairro !== "ginasios" && !g.npc).map((g) => ({ id: g.id, url: g.url, nome: g.name || g.sign, sinal: g.sign, x: g.x, y: g.y, w: g.w, h: g.h, portas: g.doors, bairro: g.bairro, telhado: g.roof, parede: g.wall }));
const dados = { jogos, fonte: ctx.FOUNTAIN, telao: ctx.TELAO, terrenos: ctx.TERRENOS, postes: ctx.LAMPS, bancos: ctx.BENCHES, arvores: ctx.TREES };
fs.mkdirSync(path.join(__dirname, "../public/vila3d"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "../public/vila3d/dados.js"), "// GERADO por ferramentas/vila3d-dados.js (coordenadas da vila, 58x52)\nwindow.VILA3D_DADOS = " + JSON.stringify(dados) + ";\n");
console.log(jogos.length, "prédios");
