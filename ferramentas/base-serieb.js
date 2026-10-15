// Monta public/carreira/base/serieb-2026.js (o Brasileirão Série B da Carreira de Treinador).
//   node ferramentas/base-serieb.js             tenta baixar os elencos da Wikipédia (inglês); quem não vier sai com elenco fictício
//   node ferramentas/base-serieb.js --cache     usa o último download (ferramentas/.elencos-serieb.json)
//   node ferramentas/base-serieb.js --ficticio  não baixa nada: todos os elencos fictícios
// Os 20 clubes são os da Série B 2026 (os 4 que caíram da Série A 2025, os 12 que ficaram e os 4 que subiram da Série C).
// As notas ficam na escala da base brasileira (brasileirao-2026.js, já calibrada): a Série B fica abaixo da Série A.
// Os elencos fictícios (ficticio: true) têm nomes inventados, sorteados pelo id do clube (sempre os mesmos); os poucos
// nomes de verdade da tabela CONHECIDOS são estimativas. Para trocar por elencos reais, rode com internet.
const fs = require("fs");
const path = require("path");
const Orcamentos = require("../public/carreira/orcamentos.js");

// id, nome na tela, sigla, cidade, cores, estádio, tamanho (1 a 5), nota-base, formação, página da Wikipédia, escudo
const CLUBES = [
  ["fortaleza", "Fortaleza", "FOR", "Fortaleza", ["#0033a0", "#d0021b"], "Castelão", 4, 70, "4-2-3-1", "Fortaleza Esporte Clube", { forma: "escudo", listras: ["h", "#0033a0", "#ffffff", "#d0021b"], texto: "FEC", corTexto: "#ffffff", fundoTexto: "#0033a0" }],
  ["ceara", "Ceará", "CEA", "Fortaleza", ["#111111", "#ffffff"], "Castelão", 4, 69, "4-3-3", "Ceará Sporting Club", { forma: "escudo", listras: ["v", "#111111", "#ffffff"], texto: "CSC", corTexto: "#111111", fundoTexto: "#ffffff" }],
  ["sport", "Sport", "SPT", "Recife", ["#d0021b", "#111111"], "Ilha do Retiro", 4, 68, "4-3-3", "Sport Club do Recife", { forma: "tabua", listras: ["h", "#d0021b", "#111111", 4], texto: "SCR", corTexto: "#ffd200", fundoTexto: "#111111" }],
  ["juventude", "Juventude", "JUV", "Caxias do Sul", ["#00843d", "#ffffff"], "Alfredo Jaconi", 3, 67, "4-4-2", "Esporte Clube Juventude", { forma: "redondo", fundo: "#00843d", anel: "#ffffff", texto: "ECJ", corTexto: "#ffffff" }],
  ["goias", "Goiás", "GOI", "Goiânia", ["#00703c", "#ffffff"], "Serrinha", 3, 66, "4-3-3", "Goiás Esporte Clube", { forma: "escudo", fundo: "#00703c", borda: "#ffffff", texto: "GEC", corTexto: "#ffffff" }],
  ["americamg", "América-MG", "AME", "Belo Horizonte", ["#00843d", "#111111"], "Independência", 3, 66, "4-3-3", "América Futebol Clube (MG)", { forma: "escudo", fundo: "#00843d", faixa: "#111111", texto: "AFC", corTexto: "#ffffff" }],
  ["cuiaba", "Cuiabá", "CUI", "Cuiabá", ["#00843d", "#ffd200"], "Arena Pantanal", 3, 66, "4-3-3", "Cuiabá Esporte Clube", { forma: "ponta", fundo: "#ffd200", diagonal: "#00843d", texto: "CEC", corTexto: "#ffffff", fundoTexto: "#00843d" }],
  ["atleticogo", "Atlético-GO", "ACG", "Goiânia", ["#d0021b", "#111111"], "Antônio Accioly", 3, 66, "4-3-3", "Atlético Clube Goianiense", { forma: "escudo", listras: ["v", "#d0021b", "#111111"], texto: "ACG", corTexto: "#ffffff", fundoTexto: "#d0021b" }],
  ["novorizontino", "Novorizontino", "NOV", "Novo Horizonte", ["#ffd200", "#111111"], "Jorge Ismael de Biasi", 2, 66, "4-3-3", "Grêmio Novorizontino", { forma: "escudo", fundo: "#ffd200", borda: "#111111", simbolo: "estrela", corSimbolo: "#111111", texto: "GN", corTexto: "#111111" }],
  ["criciuma", "Criciúma", "CRI", "Criciúma", ["#ffd200", "#111111"], "Heriberto Hülse", 3, 65, "4-4-2", "Criciúma Esporte Clube", { forma: "tabua", listras: ["v", "#ffd200", "#111111", "#ffffff"], texto: "CEC", corTexto: "#111111", fundoTexto: "#ffd200" }],
  ["avai", "Avaí", "AVA", "Florianópolis", ["#0057b8", "#ffffff"], "Ressacada", 3, 64, "4-3-3", "Avaí FC", { forma: "escudo", listras: ["v", "#0057b8", "#ffffff"], texto: "AFC", corTexto: "#0057b8", fundoTexto: "#ffffff" }],
  ["crb", "CRB", "CRB", "Maceió", ["#d0021b", "#ffffff"], "Rei Pelé", 2, 64, "4-3-3", "Clube de Regatas Brasil", { forma: "redondo", listras: ["h", "#d0021b", "#ffffff", 4], anel: "#d0021b", texto: "CRB", corTexto: "#ffffff", fundoTexto: "#d0021b" }],
  ["vilanova", "Vila Nova", "VIL", "Goiânia", ["#d0021b", "#ffffff"], "OBA", 2, 64, "4-3-3", "Vila Nova Futebol Clube", { forma: "escudo", fundo: "#d0021b", borda: "#ffffff", texto: "VN", corTexto: "#ffffff", estrelasTopo: 1, corEstrelas: "#ffffff" }],
  ["operario", "Operário-PR", "OPE", "Ponta Grossa", ["#111111", "#ffffff"], "Germano Krüger", 2, 64, "4-4-2", "Operário Ferroviário Esporte Clube", { forma: "redondo", fundo: "#111111", anel: "#ffffff", texto: "OFEC", corTexto: "#ffffff" }],
  ["nautico", "Náutico", "NAU", "Recife", ["#d0021b", "#ffffff"], "Aflitos", 3, 64, "4-3-3", "Clube Náutico Capibaribe", { forma: "escudo", listras: ["v", "#d0021b", "#ffffff"], simbolo: "remos", corSimbolo: "#111111" }],
  ["pontepreta", "Ponte Preta", "PON", "Campinas", ["#111111", "#ffffff"], "Moisés Lucarelli", 3, 64, "4-2-3-1", "Associação Atlética Ponte Preta", { forma: "escudo", fundo: "#ffffff", diagonal: "#111111", texto: "AAPP", corTexto: "#ffffff", fundoTexto: "#111111", borda: "#111111" }],
  ["botafogosp", "Botafogo-SP", "BFC", "Ribeirão Preto", ["#d0021b", "#ffffff"], "Santa Cruz", 2, 63, "4-3-3", "Botafogo Futebol Clube (SP)", { forma: "escudo", fundo: "#d0021b", simbolo: "estrela", corSimbolo: "#ffffff", borda: "#111111" }],
  ["londrina", "Londrina", "LEC", "Londrina", ["#00aeef", "#ffffff"], "Estádio do Café", 2, 63, "4-3-3", "Londrina Esporte Clube", { forma: "tabua", fundo: "#00aeef", borda: "#ffffff", texto: "LEC", corTexto: "#ffffff" }],
  ["saobernardo", "São Bernardo", "SBF", "São Bernardo do Campo", ["#ffd200", "#111111"], "Primeiro de Maio", 1, 62, "4-4-2", "São Bernardo Futebol Clube", { forma: "ponta", fundo: "#111111", faixa: "#ffd200", texto: "SB", corTexto: "#111111" }],
  ["athletic", "Athletic", "ATH", "São João del-Rei", ["#111111", "#ffffff"], "Joaquim Portugal", 1, 62, "4-4-2", "Athletic Club (Minas Gerais)", { forma: "escudo", listras: ["v", "#111111", "#ffffff"], texto: "AC", corTexto: "#ffffff", fundoTexto: "#111111" }],
];

// os poucos nomes de verdade (estimativas, como a tabela NOTAS de base-brasileirao.js): "Nome": [nota, posição]
const CONHECIDOS = {
  fortaleza: { "João Ricardo": [74, "GOL"], "Juan Martín Lucero": [74, "ATA"] },
  ceara: { "Pedro Raul": [73, "ATA"], "Lucas Mugni": [73, "MEI"] },
  juventude: { "Nenê": [70, "MEI"] },
  goias: { "Tadeu": [70, "GOL"] },
};
const POS_WIKI = { GK: "GOL", DF: "ZAG", MF: "MC", FW: "ATA" };
const PAISES = { Brazil: "Brasil", BRA: "Brasil", Argentina: "Argentina", ARG: "Argentina", Uruguay: "Uruguai", URU: "Uruguai", Paraguay: "Paraguai", PAR: "Paraguai",
  Colombia: "Colômbia", COL: "Colômbia", Chile: "Chile", CHI: "Chile", Ecuador: "Equador", ECU: "Equador", Venezuela: "Venezuela", VEN: "Venezuela", Peru: "Peru", PER: "Peru", Portugal: "Portugal", POR: "Portugal" };
// quanto cada posição soma em cada atributo (o mesmo de base-brasileirao.js)
const PERFIL = {
  GOL: { rit: -25, fin: -40, pas: -15, dri: -30, def: -20, fis: -5, gol: 4 },
  ZAG: { rit: -8, fin: -20, pas: -8, dri: -14, def: 5, fis: 4, gol: -50 },
  LD: { rit: 4, fin: -14, pas: -2, dri: -4, def: 0, fis: 0, gol: -50 }, LE: { rit: 4, fin: -14, pas: -2, dri: -4, def: 0, fis: 0, gol: -50 },
  VOL: { rit: -4, fin: -10, pas: 2, dri: -4, def: 3, fis: 3, gol: -50 },
  MC: { rit: -2, fin: -4, pas: 5, dri: 2, def: -4, fis: 0, gol: -50 },
  MEI: { rit: 2, fin: 1, pas: 5, dri: 5, def: -16, fis: -6, gol: -50 },
  PE: { rit: 7, fin: 0, pas: 0, dri: 6, def: -22, fis: -6, gol: -50 }, PD: { rit: 7, fin: 0, pas: 0, dri: 6, def: -22, fis: -6, gol: -50 },
  ATA: { rit: 3, fin: 6, pas: -6, dri: 2, def: -26, fis: 3, gol: -50 },
};
// o elenco fictício: 26 jogadores, de cada posição e a diferença para a nota-base (os titulares acima, os reservas abaixo)
const MOLDE = [["GOL", 2], ["GOL", -5], ["GOL", -9], ["ZAG", 2], ["ZAG", 1], ["ZAG", -2], ["ZAG", -4], ["ZAG", -7], ["LD", 1], ["LD", -5], ["LE", 1], ["LE", -5],
  ["VOL", 2], ["VOL", -1], ["VOL", -5], ["MC", 1], ["MC", -3], ["MC", -7], ["MEI", 3], ["MEI", -3], ["PE", 2], ["PE", -4], ["PD", 1], ["PD", -4], ["ATA", 3], ["ATA", -3]];
const APELIDOS = ["Thiaguinho", "Rodrigão", "Juninho", "Danilinho", "Pedrinho", "Netinho", "Marcão", "Cristiano", "Wellington", "Jefferson", "Edinho", "Fabrício",
  "Robinho", "Diego", "Léo", "Renan", "Wesley", "Alisson", "Everaldo", "Gilberto", "Ramon", "Tiago", "Douglas", "Jean", "Ronaldo", "Kauê", "Matheusinho",
  "Paulinho", "Rafinha", "Vinícius", "Elton", "Anderson", "Igor", "Luan", "Sandro", "Caio", "Murilo", "Fernandão", "Bruninho", "Zé Ricardo", "Toninho", "Lucão"];
const NOMES = ["Gabriel", "Lucas", "Matheus", "Pedro", "Rafael", "Gustavo", "Felipe", "João", "Bruno", "André", "Vitor", "Carlos", "Henrique", "Eduardo", "Daniel",
  "Leandro", "Marcelo", "Rodrigo", "Diogo", "Fábio", "Thiago", "Ricardo", "Willian", "Alex", "Yago", "Emerson", "Renato", "Kaio", "Davi", "Samuel"];
const SOBRENOMES = ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Costa", "Pereira", "Ferreira", "Almeida", "Ribeiro", "Carvalho", "Rocha", "Teixeira", "Moura",
  "Barros", "Nunes", "Gomes", "Martins", "Araújo", "Cardoso", "Mendes", "Pinto", "Vieira", "Batista", "Freitas", "Machado", "Dias", "Campos", "Rezende", "Brandão"];
const ESTRANGEIROS = [["Argentina", ["Facundo", "Nahuel", "Matías", "Lautaro", "Franco"], ["Benítez", "Ojeda", "Ríos", "Acosta", "Peralta"]],
  ["Uruguai", ["Agustín", "Joaquín", "Mathías", "Rodrigo"], ["Olivera", "Suárez", "Píriz", "Cabrera"]],
  ["Paraguai", ["Robert", "Óscar", "Derlis", "Junior"], ["Cáceres", "Benítez", "Villalba", "Giménez"]],
  ["Colômbia", ["Jhon", "Yerson", "Brayan", "Kevin"], ["Mosquera", "Valencia", "Murillo", "Palacios"]]];

function sorteDe(txt) {
  let a = 2166136261;
  for (const ch of String(txt)) a = Math.imul(a ^ ch.charCodeAt(0), 16777619);
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const valorDe = (nota) => Math.round(Math.pow(1.14, nota - 60) * 1e5 / 1e4) * 1e4;
const limpar = (s) => s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").replace(/\{\{[^}]*\}\}/g, "").replace(/<[^>]*>/g, "").trim();
function campo(l, k) {
  const m = l.match(new RegExp("\\|\\s*" + k + "\\s*=\\s*((?:\\[\\[[^\\]]*\\]\\]|\\{\\{[^}]*\\}\\}|[^|}])*)", "i"));
  return m && m[1] != null ? m[1].trim() : "";
}
async function baixar() {
  const out = {};
  for (const c of CLUBES) {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(c[9])}&prop=wikitext&redirects=1&format=json&formatversion=2`;
      const j = await (await fetch(url, { headers: { "User-Agent": "VilaDaGalera/1.0 (base da Carreira de Treinador)" } })).json();
      const linhas = j.parse.wikitext.split("\n"), ini = linhas.findIndex((l) => /\{\{\s*fs start/i.test(l)), fim = linhas.findIndex((l, i) => i > ini && /\{\{\s*fs end/i.test(l));
      const elenco = (ini >= 0 ? linhas.slice(ini, fim) : []).filter((l) => /fs player/i.test(l))
        .map((l) => ({ pos: campo(l, "pos").toUpperCase(), nome: limpar(campo(l, "name")), nat: limpar(campo(l, "nat")) })).filter((p) => p.nome && POS_WIKI[p.pos]);
      if (elenco.length >= 18) out[c[0]] = elenco;
    } catch (e) { console.warn(`${c[0]}: sem a Wikipédia (${e.message}); fica o elenco fictício`); }
    await new Promise((ok) => setTimeout(ok, 400));
  }
  return out;
}
function atributos(pos, nota, r) {
  const atr = {};
  for (const [a, d] of Object.entries(PERFIL[pos])) atr[a] = clamp(Math.round(nota + d + (r() - 0.5) * 8), 20, 95);
  return atr;
}
function jogador(id, i, nome, pos, nat, nota, idade, extra, r) {
  const valor = valorDe(nota);
  return { id: `${id}-${i + 1}`, nome, pos, nat, idade, nota, est: true, ...extra, atr: atributos(pos, nota, r), valor, salario: Math.round(valor / 120 / 1000) * 1000, contrato: null };
}
// o elenco fictício do clube: os nomes de verdade da tabela CONHECIDOS entram no lugar dos primeiros da mesma posição
function elencoFicticio(id, notaBase, usados) {
  const r = sorteDe(`serieb-2026:${id}`), conhecidos = Object.entries(CONHECIDOS[id] || {});
  const nomeNovo = () => {
    for (;;) {
      const x = r();
      let nome, nat = "Brasil";
      if (x < 0.4) nome = APELIDOS[Math.floor(r() * APELIDOS.length)];
      else if (x < 0.9) nome = `${NOMES[Math.floor(r() * NOMES.length)]} ${SOBRENOMES[Math.floor(r() * SOBRENOMES.length)]}`;
      else { const [pais, ns, ss] = ESTRANGEIROS[Math.floor(r() * ESTRANGEIROS.length)]; nome = `${ns[Math.floor(r() * ns.length)]} ${ss[Math.floor(r() * ss.length)]}`; nat = pais; }
      if (!usados.has(nome)) { usados.add(nome); return [nome, nat]; }
    }
  };
  return MOLDE.map(([pos, d], i) => {
    const k = conhecidos.findIndex(([, [, p]]) => p === pos);
    if (k >= 0) { const [[nome, [nota]]] = conhecidos.splice(k, 1); usados.add(nome); return jogador(id, i, nome, pos, "Brasil", nota, null, {}, r); }
    const [nome, nat] = nomeNovo(), nota = clamp(Math.round(notaBase + d + (r() - 0.5) * 3), 50, 85);
    const idade = d < -6 ? 18 + Math.floor(r() * 4) : 21 + Math.floor(r() * 13);
    return jogador(id, i, nome, pos, nat, nota, idade, { ficticio: true }, r);
  }).sort((a, b) => b.nota - a.nota);
}
// o elenco da Wikipédia: as notas dos conhecidos e, para os outros, a nota-base com um sorteio pequeno
function elencoReal(id, notaBase, lista) {
  const r = sorteDe(`serieb-2026:${id}`), conhecidos = CONHECIDOS[id] || {}, vistos = new Set();
  return lista.filter((p) => !vistos.has(p.nome) && vistos.add(p.nome)).slice(0, 28).map((p, i) => {
    const k = conhecidos[p.nome], nota = k ? k[0] : clamp(Math.round(notaBase - 3 + (r() - 0.5) * 6), 50, 85);
    return jogador(id, i, p.nome, k ? k[1] : POS_WIKI[p.pos], PAISES[p.nat] || p.nat || "Brasil", nota, null, k ? {} : { reserva: true }, r);
  }).sort((a, b) => b.nota - a.nota);
}

async function gerar() {
  const cache = path.join(__dirname, ".elencos-serieb.json");
  const elencos = process.argv.includes("--ficticio") ? {} : process.argv.includes("--cache") && fs.existsSync(cache) ? JSON.parse(fs.readFileSync(cache, "utf8")) : await baixar();
  if (Object.keys(elencos).length) fs.writeFileSync(cache, JSON.stringify(elencos));
  // nenhum nome inventado repete o de um jogador das outras bases
  const usados = new Set(fs.readdirSync(path.join(__dirname, "..", "public", "carreira", "base")).filter((f) => /-2026\.js$/.test(f) && f !== "serieb-2026.js" && f !== "mundo-2026.js" && f !== "selecoes-2026.js")
    .flatMap((f) => require(`../public/carreira/base/${f}`).clubes.flatMap((c) => c.jogadores.map((j) => j.nome))));
  const clubes = CLUBES.map(([id, nome, curto, cidade, cores, estadio, tamanho, nota, formacao, , escudo]) => {
    const jogadores = elencos[id] ? elencoReal(id, nota, elencos[id]) : elencoFicticio(id, nota, usados);
    const clube = { id, nome, curto, cidade, cores, estadio, tamanho, formacao, escudo, jogadores, liga: "serieb-2026", pais: "Brasil" };
    const caixa = Orcamentos.de(clube).caixa;
    return { ...clube, caixa, orcamento: caixa };
  });
  const reais = clubes.filter((c) => elencos[c.id]).length, hoje = new Date().toISOString().slice(0, 10);
  const fonte = reais ? `Wikipédia (en), ${hoje}; ${clubes.length - reais} elencos fictícios` : "elencos fictícios (ferramentas/base-serieb.js)";
  const cabecalho = `// Carreira de Treinador: Brasileirão Série B 2026, gerada por ferramentas/base-serieb.js.
// Fonte: ${fonte}. Os jogadores com ficticio: true têm nome inventado; as notas são estimativas na escala da base
// brasileira. Não edite à mão; altere a ferramenta e gere de novo (com internet, ela baixa os elencos de verdade).
`;
  const topo = JSON.stringify({ id: "serieb-2026", nome: "Brasileirão Série B", ano: 2026, fonte }).slice(0, -1);
  const corpo = clubes.map((c) => { const d = { ...c }; delete d.jogadores; return `${JSON.stringify(d).slice(0, -1)},"jogadores":[\n${c.jogadores.map((j) => `    ${JSON.stringify(j)}`).join(",\n")}]}`; }).join(",\n  ");
  const texto = `${cabecalho}(function (root, factory) {\n  const base = factory();\n  if (typeof module === "object" && module.exports) module.exports = base;\n  else { root.BasesCarreira = root.BasesCarreira || {}; root.BasesCarreira[base.id] = base; }\n})(typeof self !== "undefined" ? self : this, function () {\n  return (${topo},\n  "clubes": [\n  ${corpo}]});\n});\n`;
  const destino = path.join(__dirname, "..", "public", "carreira", "base", "serieb-2026.js");
  fs.writeFileSync(destino, texto, "utf8");
  for (const c of clubes) console.log(c.nome.padEnd(14), String(c.jogadores.length).padStart(2), "jogadores", elencos[c.id] ? "(Wikipédia)" : "(fictício)");
  console.log("gravado em", destino, Math.round(fs.statSync(destino).size / 1024) + " KB");
}

if (require.main === module) gerar().catch((e) => { console.error(e); process.exit(1); });
module.exports = { CLUBES, gerar };
