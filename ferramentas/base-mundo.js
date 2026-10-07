// Gera as bases da Carreira de Treinador a partir do CSV do EA FC 26.
// Uso: node ferramentas/base-mundo.js
const fs = require("node:fs");
const path = require("node:path");
const Mercado = require("../public/carreira/mercado.js");
const Orcamentos = require("../public/carreira/orcamentos.js");

const RAIZ = path.join(__dirname, "..");
const CSV = path.join(RAIZ, "dados", "ea_fc26", "ea_fc26_players.csv");
const DESTINO = path.join(RAIZ, "public", "carreira", "base");
const DATA_BASE = new Date(Date.UTC(2026, 6, 1));
const LIMITE_ELENCO = 28;
const MINIMO_ELENCO = 18;

const LIGAS = [
  { csv: "Premier League", id: "inglaterra-2026", nome: "Premier League", pais: "Inglaterra", fator: 1.35 },
  { csv: "LALIGA EA SPORTS", id: "espanha-2026", nome: "La Liga", pais: "Espanha", fator: 1.2 },
  { csv: "Serie A Enilive", id: "italia-2026", nome: "Serie A", pais: "Itália", fator: 1.15 },
  { csv: "Bundesliga", id: "alemanha-2026", nome: "Bundesliga", pais: "Alemanha", fator: 1.18 },
  { csv: "Ligue 1 McDonald's", id: "franca-2026", nome: "Ligue 1", pais: "França", fator: 1.08 },
];

// A Libertadores argentina usa estes seis clubes. A ordem também serve de desempate na geração.
const ARGENTINOS_LIBERTADORES = ["River Plate", "Boca Juniors", "Racing Club", "Estudiantes", "Vélez Sarsfield", "Talleres"];
// O Racing uruguaio fica como reserva continental e garante que nomes iguais nunca sejam tratados como o mesmo clube.
const SULAMERICANOS_RESERVA = ["Racing Club"];

const NOMES = {
  "Lombardia FC": "Inter de Milão", "Milano FC": "Milan", Latium: "Lazio", "Bergamo Calcio": "Atalanta",
  "Man Utd": "Manchester United", "Nott'm Forest": "Nottingham Forest", Spurs: "Tottenham",
  Frankfurt: "Eintracht Frankfurt", Leverkusen: "Bayer Leverkusen", "M'gladbach": "Borussia Mönchengladbach",
  "OL": "Lyon", "OM": "Olympique de Marseille", "Paris SG": "Paris Saint-Germain", "D. Alavés": "Alavés",
  "R. Oviedo": "Real Oviedo", Celta: "Celta de Vigo", Defensa: "Defensa y Justicia", "Ind. Rivadavia": "Independiente Rivadavia",
  "Argentinos Jrs.": "Argentinos Juniors", "Dep. Riestra": "Deportivo Riestra", "Atl. Nacional": "Atlético Nacional",
  "Dep. Táchira": "Deportivo Táchira", IDV: "Independiente del Valle", "U. de Chile": "Universidad de Chile",
};

// clube CSV|sigla|estádio|cor principal|cor secundária|país (o país só é necessário na América do Sul)
const METADADOS_TEXTO = `
AFC Bournemouth|BOU|Vitality Stadium|#d71920|#111111
Arsenal|ARS|Emirates Stadium|#ef0107|#ffffff
Aston Villa|AVL|Villa Park|#670e36|#95bfe5
Brentford|BRE|Brentford Community Stadium|#e30613|#ffffff
Brighton|BHA|Amex Stadium|#0057b8|#ffffff
Burnley|BUR|Turf Moor|#6c1d45|#99d6ea
Chelsea|CHE|Stamford Bridge|#034694|#ffffff
Crystal Palace|CRY|Selhurst Park|#1b458f|#c4122e
Everton|EVE|Hill Dickinson Stadium|#003399|#ffffff
Fulham|FUL|Craven Cottage|#ffffff|#111111
Leeds United|LEE|Elland Road|#ffffff|#1d428a
Liverpool|LIV|Anfield|#c8102e|#ffffff
Man Utd|MUN|Old Trafford|#da291c|#fbe122
Manchester City|MCI|Etihad Stadium|#6cabdd|#ffffff
Newcastle Utd|NEW|St James' Park|#111111|#ffffff
Nott'm Forest|NFO|City Ground|#dd0000|#ffffff
Spurs|TOT|Tottenham Hotspur Stadium|#ffffff|#132257
Sunderland|SUN|Stadium of Light|#eb172b|#ffffff
West Ham|WHU|London Stadium|#7a263a|#1bb1e7
Wolves|WOL|Molineux|#fdb913|#231f20
Athletic Club|ATH|San Mamés|#ee2523|#ffffff
Atlético de Madrid|ATM|Metropolitano|#d71920|#ffffff
CA Osasuna|OSA|El Sadar|#d71920|#0a2a66
Celta|CEL|Balaídos|#8ac3ee|#ffffff
D. Alavés|ALA|Mendizorroza|#005baa|#ffffff
Elche CF|ELC|Martínez Valero|#ffffff|#198754
FC Barcelona|BAR|Camp Nou|#004d98|#a50044
Getafe CF|GET|Coliseum|#005999|#ffffff
Girona FC|GIR|Montilivi|#d71920|#ffffff
Levante UD|LEV|Ciutat de València|#0050a4|#b51f2b
R. Oviedo|OVI|Carlos Tartiere|#0055a5|#ffffff
Rayo Vallecano|RAY|Vallecas|#ffffff|#e30613
RCD Espanyol|ESP|RCDE Stadium|#007fc8|#ffffff
RCD Mallorca|MLL|Son Moix|#d71920|#111111
Real Betis|BET|Benito Villamarín|#00954c|#ffffff
Real Madrid|RMA|Santiago Bernabéu|#ffffff|#febd11
Real Sociedad|RSO|Anoeta|#0067b1|#ffffff
Sevilla FC|SEV|Ramón Sánchez-Pizjuán|#ffffff|#d71920
Valencia CF|VAL|Mestalla|#ffffff|#111111
Villarreal CF|VIL|La Cerámica|#ffe600|#005187
AS Roma|ROM|Olímpico de Roma|#8e1f2d|#f0bc42
Bergamo Calcio|ATA|Gewiss Stadium|#0057b8|#111111
Bologna|BOL|Renato Dall'Ara|#1a2f5a|#b51f2b
Cagliari|CAG|Unipol Domus|#1a2f5a|#b51f2b
Como|COM|Giuseppe Sinigaglia|#005bac|#ffffff
Cremonese|CRE|Giovanni Zini|#d71920|#b7b7b7
Fiorentina|FIO|Artemio Franchi|#5b2c83|#ffffff
Genoa|GEN|Luigi Ferraris|#b51f2b|#1a2f5a
Hellas Verona|VER|Marcantonio Bentegodi|#003b7a|#ffd100
Juventus|JUV|Juventus Stadium|#ffffff|#111111
Latium|LAZ|Olímpico de Roma|#87ceeb|#ffffff
Lecce|LEC|Via del Mare|#ffd100|#d71920
Lombardia FC|INT|San Siro|#0068a8|#111111
Milano FC|MIL|San Siro|#d71920|#111111
Parma|PAR|Ennio Tardini|#ffd100|#005bac
Pisa|PIS|Arena Garibaldi|#005bac|#111111
Sassuolo|SAS|Mapei Stadium|#00a651|#111111
SSC Napoli|NAP|Diego Armando Maradona|#12a0d8|#ffffff
Torino|TOR|Olímpico Grande Torino|#7a263a|#ffffff
Udinese|UDI|Bluenergy Stadium|#ffffff|#111111
1. FC Köln|KOE|RheinEnergieStadion|#e30613|#ffffff
1. FSV Mainz 05|MAI|Mewa Arena|#e30613|#ffffff
Borussia Dortmund|BVB|Signal Iduna Park|#fde100|#111111
FC Augsburg|AUG|WWK Arena|#ba3733|#ffffff
FC Bayern München|BAY|Allianz Arena|#dc052d|#0066b2
FC St. Pauli|STP|Millerntor-Stadion|#5a3825|#ffffff
Frankfurt|SGE|Deutsche Bank Park|#e1000f|#111111
Hamburger SV|HSV|Volksparkstadion|#005aaa|#ffffff
Heidenheim|HEI|Voith-Arena|#e30613|#005aaa
Leverkusen|B04|BayArena|#e32221|#111111
M'gladbach|BMG|Borussia-Park|#ffffff|#111111
RB Leipzig|RBL|Red Bull Arena|#ffffff|#d71920
SC Freiburg|SCF|Europa-Park Stadion|#e30613|#ffffff
SV Werder Bremen|SVW|Weserstadion|#008557|#ffffff
TSG Hoffenheim|TSG|PreZero Arena|#005bac|#ffffff
Union Berlin|FCU|Stadion An der Alten Försterei|#e30613|#ffffff
VfB Stuttgart|VFB|MHPArena|#ffffff|#e30613
VfL Wolfsburg|WOB|Volkswagen Arena|#65b32e|#ffffff
AJ Auxerre|AJA|Abbé-Deschamps|#ffffff|#005bac
Angers SCO|ANG|Raymond Kopa|#111111|#ffffff
AS Monaco|ASM|Louis II|#e30613|#ffffff
FC Lorient|LOR|Moustoir|#f58220|#111111
FC Metz|MET|Saint-Symphorien|#7a263a|#ffffff
FC Nantes|NAN|Beaujoire|#ffe500|#00843d
Havre AC|HAC|Stade Océane|#6bb7d6|#1a2f5a
LOSC Lille|LIL|Pierre-Mauroy|#d71920|#1a2f5a
OGC Nice|NIC|Allianz Riviera|#d71920|#111111
OL|LYO|Groupama Stadium|#ffffff|#005bac
OM|MAR|Vélodrome|#ffffff|#00a9e0
Paris FC|PFC|Stade Jean-Bouin|#1a2f5a|#6bb7d6
Paris SG|PSG|Parc des Princes|#004170|#da291c
RC Lens|RCL|Bollaert-Delelis|#ffd100|#d71920
Stade Brestois 29|BRE|Francis-Le Blé|#d71920|#ffffff
Stade Rennais FC|REN|Roazhon Park|#d71920|#111111
Strasbourg|STR|La Meinau|#005bac|#ffffff
Toulouse FC|TFC|Stadium de Toulouse|#6f2c91|#ffffff
River Plate|RIV|Monumental de Núñez|#ffffff|#d71920|Argentina
Boca Juniors|BOC|La Bombonera|#003b7a|#ffd100|Argentina
Racing Club|RAC|El Cilindro|#6bb7d6|#ffffff|Argentina
Estudiantes|EST|Jorge Luis Hirschi|#d71920|#ffffff|Argentina
Vélez Sarsfield|VEL|José Amalfitani|#ffffff|#005bac|Argentina
Talleres|TAL|Mario Alberto Kempes|#1a2f5a|#ffffff|Argentina
Alianza Lima|ALI|Alejandro Villanueva|#1a2f5a|#ffffff|Peru
Atl. Nacional|ATN|Atanasio Girardot|#00843d|#ffffff|Colômbia
Barcelona SC|BSC|Monumental Banco Pichincha|#ffd100|#111111|Equador
Bolívar|BOL|Hernando Siles|#6bb7d6|#ffffff|Bolívia
Bucaramanga|BUC|Américo Montanini|#ffd100|#00843d|Colômbia
Carabobo FC|CAR|Misael Delgado|#7a263a|#ffffff|Venezuela
Cerro Porteño|CCP|General Pablo Rojas|#d71920|#005bac|Paraguai
Colo-Colo|COL|Monumental David Arellano|#ffffff|#111111|Chile
Dep. Táchira|TAC|Pueblo Nuevo|#ffd100|#111111|Venezuela
IDV|IDV|Banco Guayaquil|#1a2f5a|#6bb7d6|Equador
LDU Quito|LDU|Rodrigo Paz Delgado|#ffffff|#d71920|Equador
Libertad|LIB|La Huerta|#ffffff|#111111|Paraguai
Nacional|NAC|Gran Parque Central|#ffffff|#1a2f5a|Uruguai
Olimpia|OLI|Defensores del Chaco|#ffffff|#111111|Paraguai
Peñarol|PEN|Campeón del Siglo|#ffd100|#111111|Uruguai
San Antonio|SAJ|Carlos Villegas|#005bac|#ffffff|Bolívia
Sporting Cristal|SCR|Alberto Gallardo|#6bb7d6|#ffffff|Peru
U. de Chile|UCH|Nacional de Chile|#005bac|#d71920|Chile
Universitario|UNI|Monumental de Lima|#f3e2c7|#7a263a|Peru
Racing Club|RAU|Parque Osvaldo Roberto|#00843d|#ffffff|Uruguai
`;

const METADADOS = new Map(METADADOS_TEXTO.trim().split("\n").map((linha) => {
  const [time, curto, estadio, cor1, cor2, pais] = linha.split("|");
  return [time, { curto, estadio, cores: [cor1, cor2], pais }];
}));

const PAISES = {
  Argentina: "Argentina", Austria: "Áustria", Belgium: "Bélgica", Bolivia: "Bolívia", Brazil: "Brasil",
  Cameroon: "Camarões", Canada: "Canadá", Chile: "Chile", China: "China", Colombia: "Colômbia", Croatia: "Croácia",
  Denmark: "Dinamarca", Ecuador: "Equador", Egypt: "Egito", England: "Inglaterra", Finland: "Finlândia", France: "França",
  Germany: "Alemanha", Ghana: "Gana", Greece: "Grécia", Guinea: "Guiné", Hungary: "Hungria", Iceland: "Islândia",
  Ireland: "Irlanda", Italy: "Itália", Japan: "Japão", Korea: "Coreia do Sul", Mexico: "México", Morocco: "Marrocos",
  Netherlands: "Holanda", Nigeria: "Nigéria", Norway: "Noruega", Paraguay: "Paraguai", Peru: "Peru", Poland: "Polônia",
  Portugal: "Portugal", Romania: "Romênia", Scotland: "Escócia", Senegal: "Senegal", Serbia: "Sérvia", Slovakia: "Eslováquia",
  Slovenia: "Eslovênia", Spain: "Espanha", Sweden: "Suécia", Switzerland: "Suíça", Turkey: "Turquia", Ukraine: "Ucrânia",
  Uruguay: "Uruguai", USA: "Estados Unidos", Venezuela: "Venezuela", Wales: "País de Gales",
  "Bosnia and Herzegovina": "Bósnia e Herzegovina", "Côte d'Ivoire": "Costa do Marfim", "Czech Republic": "Tchéquia",
  "Northern Ireland": "Irlanda do Norte", "North Macedonia": "Macedônia do Norte", "Saudi Arabia": "Arábia Saudita",
  "DR Congo": "RD Congo", "Cape Verde Islands": "Cabo Verde", "Equatorial Guinea": "Guiné Equatorial",
};
Object.assign(PAISES, {
  Albania: "Albânia", Algeria: "Argélia", Angola: "Angola", Armenia: "Armênia", Australia: "Austrália",
  Benin: "Benim", Bulgaria: "Bulgária", "Burkina Faso": "Burkina Faso", Burundi: "Burundi",
  "Central African Republic": "República Centro-Africana", Comoros: "Comores", "Congo DR": "RD Congo",
  Cyprus: "Chipre", "Dominican Republic": "República Dominicana", Estonia: "Estônia", Gabon: "Gabão", Gambia: "Gâmbia",
  Georgia: "Geórgia", "Guinea-Bissau": "Guiné-Bissau", Haiti: "Haiti", Holland: "Holanda", Honduras: "Honduras",
  Indonesia: "Indonésia", Israel: "Israel", Jamaica: "Jamaica", Jordan: "Jordânia", "Korea Republic": "Coreia do Sul",
  Kosovo: "Kosovo", Latvia: "Letônia", Libya: "Líbia", Lithuania: "Lituânia", Luxembourg: "Luxemburgo", Malaysia: "Malásia",
  Mali: "Mali", Montenegro: "Montenegro", Mozambique: "Moçambique", "New Zealand": "Nova Zelândia", Niger: "Níger",
  Panama: "Panamá", "Republic of Ireland": "Irlanda", Russia: "Rússia", "Sierra Leone": "Serra Leoa",
  "South Africa": "África do Sul", Suriname: "Suriname", Syria: "Síria", Tanzania: "Tanzânia", Togo: "Togo",
  Tunisia: "Tunísia", "United States": "Estados Unidos", Uzbekistan: "Uzbequistão", Zambia: "Zâmbia", Zimbabwe: "Zimbábue",
});

const POSICOES = {
  GK: "GOL", CB: "ZAG", RB: "LD", RWB: "LD", LB: "LE", LWB: "LE", CDM: "VOL", CM: "MC", CAM: "MEI",
  LM: "PE", LW: "PE", RM: "PD", RW: "PD", ST: "ATA", CF: "ATA",
};

const GRANDES = new Set(["arsenal", "chelsea", "liverpool", "manchester-city", "manchester-united", "tottenham", "barcelona", "atletico-de-madrid", "real-madrid", "inter-de-milao", "milan", "juventus", "napoli", "bayern-munchen", "borussia-dortmund", "bayer-leverkusen", "paris-saint-germain", "olympique-de-marseille", "river-plate", "boca-juniors", "penarol", "nacional"]);

function lerCSV(texto) {
  const linhas = [];
  let linha = [], campo = "", aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (aspas) {
      if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') aspas = false;
      else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === ",") { linha.push(campo); campo = ""; }
    else if (ch === "\n") { linha.push(campo.replace(/\r$/, "")); linhas.push(linha); linha = []; campo = ""; }
    else campo += ch;
  }
  if (campo || linha.length) { linha.push(campo.replace(/\r$/, "")); linhas.push(linha); }
  const cabecalho = linhas.shift();
  return linhas.filter((l) => l.some(Boolean)).map((l) => Object.fromEntries(cabecalho.map((k, i) => [k, l[i] ?? ""])));
}

function dataDe(valor) {
  const iso = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
  const usa = String(valor).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return usa ? new Date(Date.UTC(+usa[3], +usa[1] - 1, +usa[2])) : null;
}

function idadeEm(valor, referencia = DATA_BASE) {
  const nascimento = dataDe(valor);
  if (!nascimento || Number.isNaN(nascimento.getTime())) return null;
  let idade = referencia.getUTCFullYear() - nascimento.getUTCFullYear();
  if (referencia.getUTCMonth() < nascimento.getUTCMonth() || (referencia.getUTCMonth() === nascimento.getUTCMonth() && referencia.getUTCDate() < nascimento.getUTCDate())) idade--;
  return idade;
}

const numero = (v, reserva = 20) => Number.isFinite(+v) && v !== "" ? +v : reserva;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function slug(texto) {
  return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " e ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function chaveClube(liga, time) { return `${liga}\u0000${time}`; }

function jogadorDe(linha, clubeId, indice) {
  const pos = POSICOES[linha.position] || "MC";
  const nota = clamp(numero(linha.overallRating, 40), 40, 95);
  const baixo = (v, reserva) => clamp(Math.round(numero(v, reserva)), 20, 95);
  const gol = pos === "GOL" ? Math.round([linha.gkDiving, linha.gkHandling, linha.gkPositioning, linha.gkReflexes].reduce((s, v) => s + numero(v, nota), 0) / 4) : 20;
  const nomeCompleto = `${linha.firstName} ${linha.lastName}`.trim();
  const jogador = {
    id: `${clubeId}-${indice + 1}`, ea: Number(linha.id), nome: linha.commonName || nomeCompleto, pos,
    nat: PAISES[linha.nationality] || linha.nationality, idade: idadeEm(linha.birthdate), nota, est: false,
    atr: { rit: baixo(linha.pac, pos === "GOL" ? 35 : nota), fin: baixo(linha.sho, pos === "GOL" ? 20 : nota), pas: baixo(linha.pas, nota), dri: baixo(linha.dri, nota), def: baixo(linha.def, nota), fis: baixo(linha.phy, nota), gol: clamp(gol, 20, 95) },
  };
  return { ...jogador, valor: Mercado.valorDe(jogador), salario: Mercado.salarioDe(jogador), contrato: null };
}

function jovem(clubeId, indice, pos, nota, pais) {
  const d = { GOL: [-25, -40, -12, -25, -20, -5, 3], ZAG: [-8, -20, -8, -14, 5, 4, -50], MC: [-2, -4, 5, 2, -4, 0, -50], ATA: [3, 6, -6, 2, -26, 3, -50] }[pos];
  const nomes = { GOL: "Goleiro", ZAG: "Defensor", MC: "Meia", ATA: "Atacante" };
  const a = d.map((v) => clamp(nota + v, 20, 95));
  const jogador = { id: `${clubeId}-${indice + 1}`, nome: `${nomes[pos]} da base ${indice + 1}`, pos, nat: pais, idade: 18, nota, est: false, base: true, atr: { rit: a[0], fin: a[1], pas: a[2], dri: a[3], def: a[4], fis: a[5], gol: a[6] } };
  return { ...jogador, valor: Mercado.valorDe(jogador), salario: Mercado.salarioDe(jogador), contrato: null };
}

function fecharElenco(linhas, clubeId, pais) {
  const ordenados = [...linhas].sort((a, b) => numero(b.overallRating) - numero(a.overallRating) || numero(a.id) - numero(b.id));
  let temporarios = ordenados.map((linha, i) => jogadorDe(linha, clubeId, i));
  const notaBase = Math.max(40, Math.min(62, Math.round(temporarios.reduce((s, j) => s + j.nota, 0) / Math.max(1, temporarios.length)) - 8));
  while (temporarios.filter((j) => j.pos === "GOL").length < 3) temporarios.push(jovem(clubeId, temporarios.length, "GOL", notaBase, pais));
  const ciclo = ["ZAG", "MC", "ATA"];
  while (temporarios.length < MINIMO_ELENCO) temporarios.push(jovem(clubeId, temporarios.length, ciclo[temporarios.length % ciclo.length], notaBase, pais));
  const goleiros = temporarios.filter((j) => j.pos === "GOL").sort((a, b) => b.nota - a.nota).slice(0, 3);
  const resto = temporarios.filter((j) => !goleiros.includes(j)).sort((a, b) => b.nota - a.nota);
  return [...goleiros, ...resto].slice(0, LIMITE_ELENCO).sort((a, b) => b.nota - a.nota).map((j, i) => ({ ...j, id: `${clubeId}-${i + 1}` }));
}

function receitaEscudo(id, curto, cores) {
  if (GRANDES.has(id)) return { forma: id.includes("bayern") || id.includes("paris") ? "redondo" : "escudo", fundo: cores[0], borda: cores[1], listras: [id.includes("real-madrid") || id.includes("bayern") ? "d" : "v", ...cores], texto: curto.slice(0, 3), corTexto: cores[1], fundoTexto: cores[0] };
  return { forma: "escudo", fundo: cores[0], borda: cores[1], texto: curto.slice(0, 3), corTexto: cores[1] };
}

function tamanhoDe(jogadores) {
  const media = jogadores.slice().sort((a, b) => b.nota - a.nota).slice(0, 11).reduce((s, j) => s + j.nota, 0) / 11;
  return media >= 82 ? 5 : media >= 77 ? 4 : media >= 73 ? 3 : media >= 69 ? 2 : 1;
}

function clubeDe(ligaCsv, time, linhas, liga) {
  const meta = time === "Racing Club" && ligaCsv === "LPF"
    ? { curto: "RAC", estadio: "El Cilindro", cores: ["#6bb7d6", "#ffffff"], pais: "Argentina" }
    : METADADOS.get(time);
  if (!meta) console.warn(`AVISO: sem cores/estádio na tabela: ${ligaCsv} + ${time}`);
  const nome = NOMES[time] || time;
  const pais = meta?.pais || liga.pais;
  let id = slug(nome);
  if (time === "Racing Club") id += pais === "Argentina" ? "-argentina" : "-uruguai";
  const cores = meta?.cores || ["#45515b", "#e8e1ce"];
  const curto = meta?.curto || nome.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, "").split(/\s+/).map((p) => p[0]).join("").slice(0, 3).toUpperCase();
  const jogadores = fecharElenco(linhas, id, pais);
  const tamanho = tamanhoDe(jogadores);
  const orcamento = Math.round(jogadores.reduce((s, j) => s + Mercado.valorDe(j), 0) * liga.fator / 1e6) * 1e6;
  return { id, nome, curto, cores, estadio: meta?.estadio || `Estádio do ${nome}`, tamanho, formacao: "4-3-3", escudo: receitaEscudo(id, curto, cores), jogadores, liga: liga.id, pais, orcamento };
}

function mediaOnze(clube) { return clube.jogadores.slice().sort((a, b) => b.nota - a.nota).slice(0, 11).reduce((s, j) => s + j.nota, 0) / 11; }
function limitarBrasil(jogadores) {
  const grupos = [
    [["GOL"], 3], [["ZAG", "LD", "LE", "LAT"], 8], [["VOL", "MC", "MEI"], 7], [["PE", "PD", "ATA"], 5],
  ];
  const escolhidos = [];
  for (const [posicoes, minimo] of grupos) escolhidos.push(...jogadores.filter((j) => posicoes.includes(j.pos)).sort((a, b) => b.nota - a.nota).slice(0, minimo));
  const ids = new Set(escolhidos.map((j) => j.id));
  escolhidos.push(...jogadores.filter((j) => !ids.has(j.id)).sort((a, b) => b.nota - a.nota).slice(0, LIMITE_ELENCO - escolhidos.length));
  return escolhidos.sort((a, b) => b.nota - a.nota);
}
function calibrarBrasil(base, argentinos) {
  const ajusteAnterior = base.calibragem?.ajuste || 0;
  const original = { ...base, clubes: base.clubes.map((c) => ({ ...c, jogadores: c.jogadores.map((j) => ({ ...j, nota: j.nota - ajusteAnterior, atr: Object.fromEntries(Object.entries(j.atr).map(([k, v]) => [k, clamp(v - ajusteAnterior, 20, 95)])) })) })) };
  const referencia = Math.max(...argentinos.filter((c) => ["River Plate", "Boca Juniors"].includes(c.nome)).map(mediaOnze));
  const topo = Math.max(...original.clubes.map(mediaOnze));
  const ajuste = Math.round(referencia + 2 - topo);
  return { ...original, clubes: original.clubes.map((c) => {
    const jogadores = limitarBrasil(c.jogadores.map((j) => ({ ...j, nota: clamp(j.nota + ajuste, 40, 95), atr: Object.fromEntries(Object.entries(j.atr).map(([k, v]) => [k, clamp(v + ajuste, 20, 95)])) })));
    const caixa = Orcamentos.de(c).caixa;
    return { ...c, jogadores, liga: "brasileirao-2026", pais: "Brasil", orcamento: caixa };
  }), calibragem: { ajuste, referencia: "River Plate/Boca Juniors + 2" } };
}

function moduloBase(base, origem) {
  const cabecalho = `// Carreira de Treinador: ${base.nome} 2026, gerada por ferramentas/base-mundo.js.\n// Fonte dos jogadores e notas: EA FC 26 (${origem}). Não edite à mão; altere a ferramenta e gere de novo.\n`;
  const topo = { ...base }; delete topo.clubes;
  const jsonTopo = JSON.stringify(topo).slice(0, -1);
  const clubes = base.clubes.map((clube) => {
    const dados = { ...clube }; delete dados.jogadores;
    const inicio = JSON.stringify(dados).slice(0, -1);
    return `${inicio},"jogadores":[\n${clube.jogadores.map((j) => `    ${JSON.stringify(j)}`).join(",\n")}]}`;
  }).join(",\n  ");
  const dados = `${jsonTopo},\n  "clubes": [\n  ${clubes}]}`;
  return `${cabecalho}(function (root, factory) {\n  const base = factory();\n  if (typeof module === "object" && module.exports) module.exports = base;\n  else { root.BasesCarreira = root.BasesCarreira || {}; root.BasesCarreira[base.id] = base; }\n})(typeof self !== "undefined" ? self : this, function () {\n  return (${dados});\n});\n`;
}

function gravarBase(base, origem) {
  const arquivo = path.join(DESTINO, `${base.id}.js`);
  const texto = moduloBase(base, origem);
  fs.writeFileSync(arquivo, base.id === "brasileirao-2026" ? texto.replace(/\n/g, "\r\n") : texto, "utf8");
  console.log(`${base.nome.padEnd(24)} ${String(base.clubes.length).padStart(2)} clubes -> ${path.basename(arquivo)}`);
}

function gerarIndice(bases, brasil) {
  const libertadores = [
    ...brasil.clubes.slice().sort((a, b) => mediaOnze(b) - mediaOnze(a)).slice(0, 6).map((c) => c.id),
    brasil.clubes.slice().sort((a, b) => mediaOnze(b) - mediaOnze(a)).slice(6, 12)[0].id,
    ...bases.find((b) => b.id === "argentina-2026").clubes.map((c) => c.id),
    ...bases.find((b) => b.id === "sulamericanos-2026").clubes.filter((c) => c.id !== "racing-club-uruguai").slice(0, 19).map((c) => c.id),
  ];
  const indice = { id: "mundo-2026", ano: 2026, ligas: [brasil, ...bases].map((b) => ({ id: b.id, nome: b.nome, clubes: b.clubes.map((c) => c.id) })), libertadores };
  const texto = `// Índice das bases da Carreira de Treinador em 2026. Gerado por ferramentas/base-mundo.js.\n(function (root, factory) {\n  const mundo = factory();\n  if (typeof module === "object" && module.exports) module.exports = mundo;\n  else root.MundoCarreira = mundo;\n})(typeof self !== "undefined" ? self : this, function () {\n  return (${JSON.stringify(indice, null, 2)});\n});\n`;
  fs.writeFileSync(path.join(DESTINO, "mundo-2026.js"), texto, "utf8");
}

function gerar() {
  const linhas = lerCSV(fs.readFileSync(CSV, "utf8"));
  const porClube = new Map();
  for (const linha of linhas) {
    const chave = chaveClube(linha.leagueName, linha.team);
    if (!porClube.has(chave)) porClube.set(chave, []);
    porClube.get(chave).push(linha);
  }
  const bases = LIGAS.map((liga) => ({ id: liga.id, nome: liga.nome, ano: 2026, fonte: "EA FC 26", clubes: [...porClube.entries()].filter(([chave]) => chave.startsWith(`${liga.csv}\u0000`)).map(([chave, elenco]) => clubeDe(liga.csv, chave.split("\u0000")[1], elenco, liga)).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")) }));
  const ligaArgentina = { csv: "LPF", id: "argentina-2026", nome: "Argentina — Libertadores", pais: "Argentina", fator: 0.82 };
  const argentina = { id: ligaArgentina.id, nome: ligaArgentina.nome, ano: 2026, fonte: "EA FC 26", clubes: ARGENTINOS_LIBERTADORES.map((time) => clubeDe("LPF", time, porClube.get(chaveClube("LPF", time)) || [], ligaArgentina)) };
  const ligaSul = { csv: "Libertadores", id: "sulamericanos-2026", nome: "Clubes sul-americanos", pais: "", fator: 0.72 };
  const timesSul = [...new Set([...linhas.filter((l) => l.leagueName === "Libertadores").map((l) => l.team), ...SULAMERICANOS_RESERVA])];
  const sulamericanos = { id: ligaSul.id, nome: ligaSul.nome, ano: 2026, fonte: "EA FC 26", clubes: timesSul.map((time) => {
    const origem = linhas.some((l) => l.leagueName === "Libertadores" && l.team === time) ? "Libertadores" : "Sudamericana";
    return clubeDe(origem, time, porClube.get(chaveClube(origem, time)) || [], ligaSul);
  }) };
  bases.push(argentina, sulamericanos);

  const caminhoBrasil = path.join(DESTINO, "brasileirao-2026.js");
  delete require.cache[require.resolve(caminhoBrasil)];
  const brasil = calibrarBrasil(require(caminhoBrasil), argentina.clubes);
  gravarBase(brasil, "base brasileira estimada, calibrada na escala do EA FC 26");
  for (const base of bases) gravarBase(base, "dados/ea_fc26/ea_fc26_players.csv");
  gerarIndice(bases, brasil);
  console.log(`Brasileirão: ajuste único ${brasil.calibragem.ajuste >= 0 ? "+" : ""}${brasil.calibragem.ajuste}; Libertadores: 32 clubes.`);
  return { brasil, bases };
}

if (require.main === module) gerar();
module.exports = { lerCSV, dataDe, idadeEm, chaveClube, fecharElenco, calibrarBrasil, gerar };
