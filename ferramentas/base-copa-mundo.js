// Gera as 48 seleções da Copa 2026 a partir do CSV local do EA FC 27.
// Quando o CSV não traz 26 atletas de um país, completa o elenco com jogadores locais identificados como base.
const fs = require("node:fs");
const path = require("node:path");
const { jogadoresDoCSV, jogadorDe, slug } = require("./base-mundo.js");

const grupos = [
  ["Mexico", "South Africa", "Korea Republic", "Czech Republic"],
  ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
  ["Brazil", "Morocco", "Haiti", "Scotland"],
  ["United States", "Paraguay", "Australia", "Turkey"],
  ["Germany", "Curaçao", "Côte d'Ivoire", "Ecuador"],
  ["Holland", "Japan", "Sweden", "Tunisia"],
  ["Belgium", "Egypt", "Iran", "New Zealand"],
  ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  ["France", "Senegal", "Iraq", "Norway"],
  ["Argentina", "Algeria", "Austria", "Jordan"],
  ["Portugal", "Congo DR", "Uzbekistan", "Colombia"],
  ["England", "Croatia", "Ghana", "Panama"],
];
const dados = [
  ["Mexico", "México", "MEX", "#006847", "#ce1126"], ["South Africa", "África do Sul", "RSA", "#007749", "#ffb81c"],
  ["Korea Republic", "Coreia do Sul", "KOR", "#cd2e3a", "#0047a0"], ["Czech Republic", "Tchéquia", "CZE", "#d7141a", "#11457e"],
  ["Canada", "Canadá", "CAN", "#d80621", "#ffffff"], ["Bosnia and Herzegovina", "Bósnia e Herzegovina", "BIH", "#002395", "#fecb00"],
  ["Qatar", "Catar", "QAT", "#8d1b3d", "#ffffff"], ["Switzerland", "Suíça", "SUI", "#da291c", "#ffffff"],
  ["Brazil", "Brasil", "BRA", "#009739", "#ffdf00"], ["Morocco", "Marrocos", "MAR", "#c1272d", "#006233"],
  ["Haiti", "Haiti", "HAI", "#00209f", "#d21034"], ["Scotland", "Escócia", "SCO", "#005eb8", "#ffffff"],
  ["United States", "Estados Unidos", "USA", "#002868", "#bf0a30"], ["Paraguay", "Paraguai", "PAR", "#d52b1e", "#0038a8"],
  ["Australia", "Austrália", "AUS", "#00843d", "#ffcd00"], ["Turkey", "Turquia", "TUR", "#e30a17", "#ffffff"],
  ["Germany", "Alemanha", "GER", "#111111", "#dd0000"], ["Curaçao", "Curaçao", "CUW", "#002b7f", "#f9e814"],
  ["Côte d'Ivoire", "Costa do Marfim", "CIV", "#f77f00", "#009e60"], ["Ecuador", "Equador", "ECU", "#ffdd00", "#0033a0"],
  ["Holland", "Holanda", "NED", "#ff5f00", "#ffffff"], ["Japan", "Japão", "JPN", "#14236d", "#ffffff"],
  ["Sweden", "Suécia", "SWE", "#006aa7", "#fecc00"], ["Tunisia", "Tunísia", "TUN", "#e70013", "#ffffff"],
  ["Belgium", "Bélgica", "BEL", "#e30613", "#fdda24"], ["Egypt", "Egito", "EGY", "#ce1126", "#111111"],
  ["Iran", "Irã", "IRN", "#239f40", "#da0000"], ["New Zealand", "Nova Zelândia", "NZL", "#111111", "#ffffff"],
  ["Spain", "Espanha", "ESP", "#aa151b", "#f1bf00"], ["Cape Verde", "Cabo Verde", "CPV", "#003893", "#cf2027"],
  ["Saudi Arabia", "Arábia Saudita", "KSA", "#006c35", "#ffffff"], ["Uruguay", "Uruguai", "URU", "#75aadb", "#ffffff"],
  ["France", "França", "FRA", "#002395", "#ed2939"], ["Senegal", "Senegal", "SEN", "#00853f", "#fdef42"],
  ["Iraq", "Iraque", "IRQ", "#ce1126", "#007a3d"], ["Norway", "Noruega", "NOR", "#ba0c2f", "#00205b"],
  ["Argentina", "Argentina", "ARG", "#75aadb", "#ffffff"], ["Algeria", "Argélia", "ALG", "#006233", "#d21034"],
  ["Austria", "Áustria", "AUT", "#ed2939", "#ffffff"], ["Jordan", "Jordânia", "JOR", "#007a3d", "#ce1126"],
  ["Portugal", "Portugal", "POR", "#006600", "#ff0000"], ["Congo DR", "RD Congo", "COD", "#007fff", "#ce1021"],
  ["Uzbekistan", "Uzbequistão", "UZB", "#1eb53a", "#0099b5"], ["Colombia", "Colômbia", "COL", "#fcd116", "#003893"],
  ["England", "Inglaterra", "ENG", "#ffffff", "#ce1126"], ["Croatia", "Croácia", "CRO", "#ff0000", "#ffffff"],
  ["Ghana", "Gana", "GHA", "#ce1126", "#fcd116"], ["Panama", "Panamá", "PAN", "#d21034", "#005293"],
];
const porPais = new Map(dados.map((d) => [d[0], d]));
const posicoes = ["GOL", "GOL", "GOL", "ZAG", "ZAG", "ZAG", "ZAG", "LD", "LD", "LE", "LE", "VOL", "VOL", "MC", "MC", "MC", "MEI", "MEI", "PE", "PE", "PD", "PD", "ATA", "ATA", "ATA", "ATA"];
const defesa = new Set(["ZAG", "LD", "LE"]), meio = new Set(["VOL", "MC", "MEI"]), ataque = new Set(["PE", "PD", "ATA"]);
const grupoPos = (p) => p === "GOL" ? 0 : defesa.has(p) ? 1 : meio.has(p) ? 2 : ataque.has(p) ? 3 : 2;

function gerar() {
  const raiz = path.join(__dirname, ".."), linhas = jogadoresDoCSV(fs.readFileSync(path.join(raiz, "dados/ea_fc27/ea_fc27_players.csv"), "utf8"));
  const clubes = dados.map(([pais, nome, curto, cor, cor2]) => {
    const id = `sel-${slug(nome)}`, disponiveis = linhas.filter((l) => l.nationality === pais && l.gender === "Men's Football")
      .sort((a, b) => Number(b.overallRating) - Number(a.overallRating) || Number(a.id) - Number(b.id)).slice(0, 44);
    const reais = disponiveis.map((l, i) => ({ ...jogadorDe(l, id, i), id: `copa-${l.id}` }));
    const media = reais.length ? Math.round(reais.slice(0, 11).reduce((s, j) => s + j.nota, 0) / Math.min(11, reais.length)) : 65;
    const faltantes = Math.max(0, 26 - reais.length), extras = Array.from({ length: faltantes }, (_, i) => {
      const pos = i < Math.max(0, 3 - reais.filter((j) => j.pos === "GOL").length) ? "GOL" : posicoes[(i + reais.length) % posicoes.length];
      const nota = Math.max(55, Math.min(75, media - 5 - Math.floor(i / 8)));
      return { id: `${id}-local-${i + 1}`, nome: `Atleta local ${i + 1}`, pos, nat: nome, idade: 22 + i % 10, nota, est: false, origemLocal: true,
        atr: { rit: nota, fin: pos === "GOL" ? 25 : nota, pas: nota, dri: nota, def: nota, fis: nota, gol: pos === "GOL" ? nota : 20 }, valor: 0, salario: 0, contrato: null };
    });
    const jogadores = [...reais, ...extras];
    // Os 26 melhores começam convocados, respeitando goleiros e setores. O técnico pode trocar antes da estreia.
    const limites = [3, 8, 8, 7], convocados = [];
    for (let g = 0; g < 4; g++) convocados.push(...jogadores.filter((j) => grupoPos(j.pos) === g).slice(0, limites[g]));
    for (const j of jogadores) if (convocados.length < 26 && !convocados.includes(j)) convocados.push(j);
    return { id, nome, curto, pais: nome, nacionalidade: pais, cores: [cor, cor2], estadio: "Copa do Mundo 2026", tamanho: 3, formacao: "4-3-3", liga: "copa-do-mundo-2026", escudo: { forma: "escudo", fundo: cor, borda: cor2, texto: curto, corTexto: cor2 }, jogadores, convocados: convocados.slice(0, 26).map((j) => j.id), atletasReais: reais.length };
  });
  const ids = Object.fromEntries(clubes.map((c) => [c.nacionalidade, c.id]));
  const base = { id: "copa-do-mundo-2026", nome: "Copa do Mundo 2026", ano: 2026, fonte: "EA FC 27", grupos: grupos.map((g, i) => ({ id: String.fromCharCode(65 + i), clubes: g.map((pais) => ids[pais]) })), clubes };
  if (base.grupos.some((g) => g.clubes.some((id) => !id))) throw Error("Grupo com seleção desconhecida.");
  const destino = path.join(raiz, "public/carreira/base/copa-do-mundo-2026.js");
  fs.writeFileSync(destino, `// Base da Copa 2026. Gerada por ferramentas/base-copa-mundo.js a partir do EA FC 27.\n(function (root, factory) { const base = factory(); if (typeof module === "object" && module.exports) module.exports = base; else { root.BasesCarreira = root.BasesCarreira || {}; root.BasesCarreira[base.id] = base; } })(typeof self !== "undefined" ? self : this, function () { return ${JSON.stringify(base)}; });\n`);
  console.log(`Copa: ${clubes.length} seleções, ${clubes.reduce((s, c) => s + c.atletasReais, 0)} atletas do FC 27 no elenco disponível.`);
}
if (require.main === module) gerar();
module.exports = { gerar, grupos, dados };
