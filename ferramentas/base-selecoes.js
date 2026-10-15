// Gera public/carreira/base/selecoes-2026.js: as 48 seleções da Copa do Mundo da Carreira (formato novo: 12 grupos de 4),
// a partir do CSV do EA FC 27 (dados/ea_fc27). Uso: node ferramentas/base-selecoes.js
//
// Cada seleção traz o nome, a sigla, a confederação, as cores da camisa, a bandeira (as peças que bandeiras.js desenha) e os
// "de fora": os jogadores daquela nacionalidade que NÃO estão nos elencos da Carreira (quem joga na MLS, na Arábia, em
// Portugal...). Os que estão na Carreira entram na hora, pelo `nat` do jogador (carreira-copa.js): assim a nota que vale é a
// da carreira (com a evolução), e os jovens da base também podem ser convocados.
// Quando a nação tem pouca gente no CSV (o Catar, o Irã), a ferramenta completa com jogadores fictícios (`ficticio: true`)
// no nível da seleção, para sempre ter 3 goleiros e 26 nomes para convocar.
const fs = require("node:fs");
const path = require("node:path");
const { PAISES, jogadoresDoCSV, idadeEm } = require("./base-mundo.js");

const RAIZ = path.join(__dirname, "..");
const CSV = path.join(RAIZ, "dados", "ea_fc27", "ea_fc27_players.csv");
const DESTINO = path.join(RAIZ, "public", "carreira", "base", "selecoes-2026.js");
const MUNDO = require("../public/carreira/base/mundo-2026.js");
const POR_SELECAO = 30, MINIMO = 26, GOLEIROS = 3;

// os nomes de país do CSV como a Carreira escreve (o `nat` dos jogadores; os mesmos de ferramentas/base-mundo.js)
const NAT = { Brazil: "Brasil", Argentina: "Argentina", Uruguay: "Uruguai", Colombia: "Colômbia", Ecuador: "Equador", Paraguay: "Paraguai", Bolivia: "Bolívia",
  "United States": "Estados Unidos", Mexico: "México", Canada: "Canadá", Panama: "Panamá", Haiti: "Haiti", "Curaçao": "Curaçao",
  Japan: "Japão", Iran: "Irã", Uzbekistan: "Uzbequistão", "Korea Republic": "Coreia do Sul", Jordan: "Jordânia", Australia: "Austrália", Qatar: "Catar", "Saudi Arabia": "Arábia Saudita",
  Morocco: "Marrocos", Tunisia: "Tunísia", Egypt: "Egito", Algeria: "Argélia", Ghana: "Gana", "Cape Verde Islands": "Cabo Verde", "South Africa": "África do Sul", Senegal: "Senegal", "Côte d'Ivoire": "Costa do Marfim", "Congo DR": "RD Congo",
  "New Zealand": "Nova Zelândia",
  England: "Inglaterra", France: "França", Croatia: "Croácia", Portugal: "Portugal", Norway: "Noruega", Germany: "Alemanha", Holland: "Holanda", Spain: "Espanha", Belgium: "Bélgica",
  Austria: "Áustria", Switzerland: "Suíça", Scotland: "Escócia", Italy: "Itália", Turkey: "Turquia", Denmark: "Dinamarca", Sweden: "Suécia" };

// as 48 da Copa: as classificadas de 2026 e, nas vagas da repescagem, as mais fortes de cada caminho na base do FC 27
// [nome no CSV, sigla, confederação, [camisa, detalhe], bandeira, nível dos fictícios, nome dos fictícios]
const SELECOES = [
  ["United States", "USA", "CONCACAF", ["#ffffff", "#1c2b5a"], { f: "h", c: ["#b22234", "#ffffff", "#b22234", "#ffffff", "#b22234", "#ffffff", "#b22234"], canto: { c: "#3c3b6e", w: 0.42, h: 0.58 } }, 70, "ingles"],
  ["Mexico", "MEX", "CONCACAF", ["#006847", "#ffffff"], { f: "v", c: ["#006847", "#ffffff", "#ce1126"], circulo: { c: "#8c5a2b", r: 0.11 } }, 70, "espanhol"],
  ["Canada", "CAN", "CONCACAF", ["#d52b1e", "#ffffff"], { f: "v", c: ["#d52b1e", "#ffffff", "#d52b1e"], p: [1, 2, 1], estrela: { c: "#d52b1e", r: 0.2 } }, 68, "ingles"],
  ["Panama", "PAN", "CONCACAF", ["#d21034", "#ffffff"], { quartos: ["#ffffff", "#da121a", "#072357", "#ffffff"] }, 64, "espanhol"],
  ["Haiti", "HAI", "CONCACAF", ["#00209f", "#d21034"], { f: "h", c: ["#00209f", "#d21034"] }, 62, "frances"],
  ["Curaçao", "CUW", "CONCACAF", ["#002b7f", "#f9e814"], { f: "h", c: ["#002b7f", "#f9e814", "#002b7f"], p: [6, 1, 2], estrela: { c: "#ffffff", r: 0.1, x: 0.18, y: 0.22 } }, 63, "holandes"],
  ["Argentina", "ARG", "CONMEBOL", ["#75aadb", "#ffffff"], { f: "h", c: ["#74acdf", "#ffffff", "#74acdf"], circulo: { c: "#f6b40e", r: 0.1 } }, 72, "espanhol"],
  ["Brazil", "BRA", "CONMEBOL", ["#ffdf00", "#009c3b"], { fundo: "#009c3b", losango: { c: "#ffdf00" }, circulo: { c: "#002776", r: 0.17 } }, 72, "portugues"],
  ["Ecuador", "ECU", "CONMEBOL", ["#ffd100", "#0072ce"], { f: "h", c: ["#ffd100", "#0072ce", "#ef3340"], p: [2, 1, 1] }, 68, "espanhol"],
  ["Uruguay", "URU", "CONMEBOL", ["#5cbfeb", "#111111"], { f: "h", c: ["#ffffff", "#0038a8", "#ffffff", "#0038a8", "#ffffff", "#0038a8", "#ffffff", "#0038a8", "#ffffff"], canto: { c: "#ffffff", w: 0.4, h: 0.56 }, circulo: { c: "#fcd116", r: 0.1, x: 0.2, y: 0.28 } }, 70, "espanhol"],
  ["Colombia", "COL", "CONMEBOL", ["#fcd116", "#003893"], { f: "h", c: ["#fcd116", "#003893", "#ce1126"], p: [2, 1, 1] }, 70, "espanhol"],
  ["Paraguay", "PAR", "CONMEBOL", ["#d52b1e", "#ffffff"], { f: "h", c: ["#d52b1e", "#ffffff", "#0038a8"] }, 67, "espanhol"],
  ["Japan", "JPN", "AFC", ["#0b2a6f", "#ffffff"], { fundo: "#ffffff", circulo: { c: "#bc002d", r: 0.3 } }, 70, "japones"],
  ["Iran", "IRN", "AFC", ["#ffffff", "#da0000"], { f: "h", c: ["#239f40", "#ffffff", "#da0000"], circulo: { c: "#da0000", r: 0.09 } }, 69, "persa"],
  ["Uzbekistan", "UZB", "AFC", ["#ffffff", "#0099b5"], { f: "h", c: ["#0099b5", "#ce1126", "#ffffff", "#ce1126", "#1eb53a"], p: [10, 1, 10, 1, 10] }, 67, "uzbeque"],
  ["Korea Republic", "KOR", "AFC", ["#cd2e3a", "#111111"], { fundo: "#ffffff", circulo: { c: "#cd2e3a", r: 0.24, metade: "#0047a0" } }, 70, "coreano"],
  ["Jordan", "JOR", "AFC", ["#ffffff", "#ce1126"], { f: "h", c: ["#111111", "#ffffff", "#007a3d"], triangulo: { c: "#ce1126" } }, 65, "arabe"],
  ["Australia", "AUS", "AFC", ["#ffcd00", "#00843d"], { fundo: "#012169", estrela: { c: "#ffffff", r: 0.13, x: 0.25, y: 0.72 }, estrela2: { c: "#ffffff", r: 0.08, x: 0.75, y: 0.35 } }, 67, "ingles"],
  ["Qatar", "QAT", "AFC", ["#8a1538", "#ffffff"], { f: "v", c: ["#ffffff", "#8a1538"], p: [1, 3] }, 66, "arabe"],
  ["Saudi Arabia", "KSA", "AFC", ["#ffffff", "#006c35"], { f: "h", c: ["#006c35", "#ffffff", "#006c35"], p: [7, 1, 4] }, 68, "arabe"],
  ["Morocco", "MAR", "CAF", ["#c1272d", "#006233"], { fundo: "#c1272d", estrela: { c: "#006233", r: 0.22 } }, 70, "arabe"],
  ["Tunisia", "TUN", "CAF", ["#e70013", "#ffffff"], { fundo: "#e70013", circulo: { c: "#ffffff", r: 0.24 }, lua: { c: "#e70013", r: 0.16 } }, 66, "arabe"],
  ["Egypt", "EGY", "CAF", ["#ce1126", "#ffffff"], { f: "h", c: ["#ce1126", "#ffffff", "#111111"], circulo: { c: "#c09300", r: 0.08 } }, 67, "arabe"],
  ["Algeria", "ALG", "CAF", ["#ffffff", "#006233"], { f: "v", c: ["#006233", "#ffffff"], lua: { c: "#d21034", r: 0.2, x: 0.5 } }, 68, "arabe"],
  ["Ghana", "GHA", "CAF", ["#ffffff", "#111111"], { f: "h", c: ["#ce1126", "#fcd116", "#006b3f"], estrela: { c: "#111111", r: 0.15 } }, 67, "africano"],
  ["Cape Verde Islands", "CPV", "CAF", ["#003893", "#ffffff"], { f: "h", c: ["#003893", "#ffffff", "#cf2027", "#ffffff", "#003893"], p: [6, 1, 1, 1, 3] }, 65, "portugues"],
  ["South Africa", "RSA", "CAF", ["#ffb612", "#007a4d"], { f: "h", c: ["#de3831", "#ffffff", "#007a4d", "#ffffff", "#002395"], p: [5, 1, 3, 1, 5], triangulo: { c: "#111111", borda: "#ffb612" } }, 65, "africano"],
  ["Senegal", "SEN", "CAF", ["#ffffff", "#00853f"], { f: "v", c: ["#00853f", "#fdef42", "#e31b23"], estrela: { c: "#00853f", r: 0.13 } }, 69, "africano"],
  ["Côte d'Ivoire", "CIV", "CAF", ["#f77f00", "#ffffff"], { f: "v", c: ["#f77f00", "#ffffff", "#009e60"] }, 69, "frances"],
  ["Congo DR", "COD", "CAF", ["#007fff", "#ce1021"], { fundo: "#007fff", diagonal: { c: "#ce1021", borda: "#f7d618" }, estrela: { c: "#f7d618", r: 0.13, x: 0.17, y: 0.22 } }, 66, "frances"],
  ["New Zealand", "NZL", "OFC", ["#ffffff", "#111111"], { fundo: "#012169", estrela: { c: "#cc142b", r: 0.1, x: 0.72, y: 0.3 }, estrela2: { c: "#cc142b", r: 0.1, x: 0.82, y: 0.6 } }, 62, "ingles"],
  ["England", "ENG", "UEFA", ["#ffffff", "#1c2b5a"], { fundo: "#ffffff", cruz: { c: "#ce1124" } }, 74, "ingles"],
  ["France", "FRA", "UEFA", ["#002395", "#ffffff"], { f: "v", c: ["#002395", "#ffffff", "#ed2939"] }, 74, "frances"],
  ["Croatia", "CRO", "UEFA", ["#ff0000", "#ffffff"], { f: "h", c: ["#ff0000", "#ffffff", "#171796"], xadrez: { c: "#ff0000" } }, 70, "eslavo"],
  ["Portugal", "POR", "UEFA", ["#c8102e", "#006600"], { f: "v", c: ["#006600", "#ff0000"], p: [2, 3], circulo: { c: "#ffd700", r: 0.15, x: 0.4 } }, 73, "portugues"],
  ["Norway", "NOR", "UEFA", ["#ba0c2f", "#ffffff"], { fundo: "#ba0c2f", cruz: { c: "#00205b", borda: "#ffffff", nordica: true } }, 70, "nordico"],
  ["Germany", "GER", "UEFA", ["#ffffff", "#111111"], { f: "h", c: ["#111111", "#dd0000", "#ffce00"] }, 74, "alemao"],
  ["Holland", "NED", "UEFA", ["#f36c21", "#111111"], { f: "h", c: ["#ae1c28", "#ffffff", "#21468b"] }, 72, "holandes"],
  ["Spain", "ESP", "UEFA", ["#aa151b", "#f1bf00"], { f: "h", c: ["#aa151b", "#f1bf00", "#aa151b"], p: [1, 2, 1] }, 74, "espanhol"],
  ["Belgium", "BEL", "UEFA", ["#e30613", "#111111"], { f: "v", c: ["#111111", "#fae042", "#ed2939"] }, 71, "holandes"],
  ["Austria", "AUT", "UEFA", ["#ed2939", "#ffffff"], { f: "h", c: ["#ed2939", "#ffffff", "#ed2939"] }, 70, "alemao"],
  ["Switzerland", "SUI", "UEFA", ["#da291c", "#ffffff"], { fundo: "#da291c", cruz: { c: "#ffffff", suica: true } }, 70, "alemao"],
  ["Scotland", "SCO", "UEFA", ["#0b2a6f", "#ffffff"], { fundo: "#005eb8", sautor: { c: "#ffffff" } }, 69, "ingles"],
  ["Italy", "ITA", "UEFA", ["#0066b3", "#ffffff"], { f: "v", c: ["#009246", "#ffffff", "#ce2b37"] }, 73, "italiano"],
  ["Turkey", "TUR", "UEFA", ["#e30a17", "#ffffff"], { fundo: "#e30a17", circulo: { c: "#ffffff", r: 0.2, x: 0.38 }, lua: { c: "#e30a17", r: 0.16, x: 0.42 }, estrela: { c: "#ffffff", r: 0.08, x: 0.6 } }, 70, "turco"],
  ["Denmark", "DEN", "UEFA", ["#c8102e", "#ffffff"], { fundo: "#c8102e", cruz: { c: "#ffffff", nordica: true } }, 71, "nordico"],
  ["Sweden", "SWE", "UEFA", ["#fecc02", "#006aa7"], { fundo: "#006aa7", cruz: { c: "#fecc02", nordica: true } }, 70, "nordico"],
  ["Bolivia", "BOL", "CONMEBOL", ["#007934", "#ffffff"], { f: "h", c: ["#d52b1e", "#f9e300", "#007934"] }, 64, "espanhol"],
];
// formações de algumas seleções (as outras jogam no 4-3-3)
const FORMACAO = { Brazil: "4-2-3-1", Argentina: "4-4-2", Germany: "4-2-3-1", Croatia: "4-3-3", Italy: "3-5-2", Holland: "4-3-3", England: "4-2-3-1", Portugal: "4-3-3",
  Morocco: "4-1-4-1", Japan: "4-2-3-1", Uruguay: "4-4-2", Mexico: "4-3-3", "Saudi Arabia": "4-4-2", Switzerland: "3-4-3", Austria: "4-2-3-1", Belgium: "3-4-3" };

// os fictícios: nomes comuns de cada região (sempre os mesmos para a mesma seleção)
const NOMES = {
  ingles: [["James", "Liam", "Noah", "Jack", "Ryan", "Tyler", "Owen", "Mason", "Lucas", "Ethan", "Cole", "Jordan"], ["Walker", "Bennett", "Hughes", "Turner", "Parker", "Collins", "Reed", "Foster", "Grant", "Carter", "Hayes", "Mitchell"]],
  espanhol: [["José", "Luis", "Carlos", "Diego", "Andrés", "Jorge", "Miguel", "Pablo", "Iván", "Raúl", "Óscar", "Mateo"], ["Gómez", "Rojas", "Vargas", "Castillo", "Herrera", "Mendoza", "Ríos", "Ortiz", "Navarro", "Medina", "Paredes", "Suárez"]],
  frances: [["Jean", "Pierre", "Marc", "Louis", "Jordan", "Kevin", "Wilson", "Steeve", "Fabrice", "Junior", "Ricardo", "Peterson"], ["Joseph", "Pierre-Louis", "Saint-Fleur", "Jean-Baptiste", "Dorsainvil", "Étienne", "Charles", "Michel", "Lafleur", "Belizaire", "Augustin", "Denis"]],
  holandes: [["Jurien", "Leandro", "Kenji", "Gervane", "Shermar", "Tyrick", "Juninho", "Brandley", "Eloy", "Jeremy", "Rangelo", "Sherel"], ["Martina", "Bacuna", "Room", "Kastaneer", "Janga", "Gaari", "Floranus", "Hooi", "Comenencia", "de Graaf", "Antonia", "Maria"]],
  portugues: [["João", "Pedro", "Lucas", "Mateus", "Rafael", "Gabriel", "Bruno", "Tiago", "Diogo", "Ruben", "Hélio", "Ivo"], ["Silva", "Santos", "Costa", "Lopes", "Tavares", "Fonseca", "Semedo", "Monteiro", "Rocha", "Varela", "Gomes", "Almeida"]],
  japones: [["Haruto", "Ren", "Sota", "Yuto", "Kaito", "Riku", "Daiki", "Kenta", "Shun", "Takumi", "Yuma", "Kazuki"], ["Sato", "Suzuki", "Takahashi", "Tanaka", "Watanabe", "Ito", "Yamamoto", "Nakamura", "Kobayashi", "Kato", "Yoshida", "Yamada"]],
  persa: [["Ali", "Mehdi", "Reza", "Hossein", "Saeid", "Sardar", "Alireza", "Milad", "Omid", "Karim", "Ehsan", "Morteza"], ["Karimi", "Rezaei", "Hosseini", "Ahmadi", "Moradi", "Mohammadi", "Jahanbakhsh", "Ghoddos", "Ezatolahi", "Nourollahi", "Beiranvand", "Hajsafi"]],
  uzbeque: [["Eldor", "Jaloliddin", "Otabek", "Abbosbek", "Khojimat", "Sherzod", "Rustam", "Dostonbek", "Jamshid", "Odil", "Azizbek", "Ulugbek"], ["Shomurodov", "Masharipov", "Shukurov", "Fayzullaev", "Erkinov", "Nasrullaev", "Ashurmatov", "Khamraliev", "Iskanderov", "Akhmedov", "Turgunboev", "Yusupov"]],
  coreano: [["Min-jae", "Heung-min", "Jae-sung", "Hwang", "In-beom", "Seung-ho", "Woo-yeong", "Gue-sung", "Hyun-woo", "Young-gwon", "Jin-su", "Chang-hoon"], ["Kim", "Lee", "Park", "Jung", "Cho", "Hwang", "Paik", "Oh", "Seol", "Kwon", "Song", "Yang"]],
  arabe: [["Mohammed", "Ahmed", "Ali", "Hassan", "Omar", "Yousef", "Khalid", "Saleh", "Abdullah", "Hamza", "Musab", "Akram"], ["Al-Haydos", "Afif", "Hassan", "Al-Rawi", "Boudiaf", "Khoukhi", "Al-Naimat", "Al-Tamari", "Olwan", "Al-Dawsari", "Hamdallah", "Salem"]],
  africano: [["Kwame", "Themba", "Sipho", "Lebo", "Kofi", "Thabo", "Bongani", "Teboho", "Percy", "Ronwen", "Siyabonga", "Mothobi"], ["Mokoena", "Williams", "Zwane", "Tau", "Ngcobo", "Mvala", "Appollis", "Dlamini", "Sithole", "Mabasa", "Foster", "Modiba"]],
  eslavo: [["Luka", "Ivan", "Marko", "Josip", "Mateo", "Ante", "Nikola", "Domagoj", "Mario", "Petar", "Lovro", "Bruno"], ["Horvat", "Kovačević", "Babić", "Marić", "Jurić", "Novak", "Kovačić", "Knežević", "Vuković", "Marković", "Petrović", "Matić"]],
  nordico: [["Erik", "Lars", "Jonas", "Magnus", "Oskar", "Emil", "Mathias", "Kristian", "Andreas", "Henrik", "Sander", "Tobias"], ["Hansen", "Johansen", "Olsen", "Larsen", "Andersen", "Pedersen", "Nilsen", "Kristiansen", "Berg", "Lund", "Holm", "Dahl"]],
  alemao: [["Lukas", "Felix", "Jonas", "Leon", "Maximilian", "Paul", "Niklas", "Tim", "Florian", "Jan", "David", "Fabian"], ["Müller", "Schmid", "Huber", "Wagner", "Weber", "Bauer", "Gruber", "Fischer", "Meier", "Keller", "Brunner", "Steiner"]],
  italiano: [["Marco", "Luca", "Andrea", "Matteo", "Lorenzo", "Davide", "Simone", "Federico", "Alessandro", "Riccardo", "Nicolò", "Giacomo"], ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Gallo"]],
  turco: [["Emre", "Burak", "Mert", "Arda", "Kerem", "Cenk", "Hakan", "Ozan", "Yusuf", "Kaan", "Barış", "Ferdi"], ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Aydın", "Öztürk", "Arslan", "Doğan", "Kılıç", "Aslan"]],
};

const POSICOES = { GK: "GOL", CB: "ZAG", RB: "LD", RWB: "LD", LB: "LE", LWB: "LE", CDM: "VOL", CM: "MC", CAM: "MEI", LM: "PE", LW: "PE", RM: "PD", RW: "PD", ST: "ATA", CF: "ATA" };
const numero = (v, reserva = 20) => (Number.isFinite(+v) && v !== "" ? +v : reserva);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const slug = (t) => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const chaveNome = (nome, nat) => `${slug(nome)}|${nat}`;
function sorte(semente) { let a = 2166136261; for (const ch of semente) a = Math.imul(a ^ ch.charCodeAt(0), 16777619); return () => { a = Math.imul(a ^ (a >>> 15), 2246822519); a ^= a >>> 13; a = Math.imul(a, 3266489917); return ((a ^= a >>> 16) >>> 0) / 4294967296; }; }

// o jogador do CSV no formato da Carreira (as mesmas contas de ferramentas/base-mundo.js), com o clube de verdade dele
function jogadorDoCSV(l, nat) {
  const pos = POSICOES[l.position] || "MC", nota = clamp(numero(l.overallRating, 40), 40, 95);
  const baixo = (v, r) => clamp(Math.round(numero(v, r)), 20, 95);
  const gol = pos === "GOL" ? Math.round([l.gkDiving, l.gkHandling, l.gkPositioning, l.gkReflexes].reduce((s, v) => s + numero(v, nota), 0) / 4) : 20;
  return { id: `ea-${l.id}`, ea: Number(l.id), nome: l.commonName || `${l.firstName} ${l.lastName}`.trim(), pos, nat, idade: idadeEm(l.birthdate), nota, est: false,
    atr: { rit: baixo(l.pac, pos === "GOL" ? 35 : nota), fin: baixo(l.sho, pos === "GOL" ? 20 : nota), pas: baixo(l.pas, nota), dri: baixo(l.dri, nota), def: baixo(l.def, nota), fis: baixo(l.phy, nota), gol: clamp(gol, 20, 95) },
    clubeReal: l.team || "" };
}
// o fictício: o perfil de atributos de cada posição em volta da nota
const PERFIL = { GOL: [-25, -40, -12, -25, -20, -5, 3], ZAG: [-8, -20, -8, -14, 5, 4, -50], LD: [4, -14, -2, -2, -2, 0, -50], LE: [4, -14, -2, -2, -2, 0, -50], VOL: [-6, -10, 1, -4, 2, 3, -50],
  MC: [-2, -4, 5, 2, -4, 0, -50], MEI: [0, 1, 5, 5, -18, -4, -50], PE: [6, 0, -2, 5, -24, -6, -50], PD: [6, 0, -2, 5, -24, -6, -50], ATA: [3, 6, -6, 2, -26, 3, -50] };
function ficticio(sel, n, pos, nota, r) {
  const [nomes, sobrenomes] = NOMES[sel.lingua] || NOMES.ingles;
  const a = PERFIL[pos].map((d) => clamp(nota + d + Math.round(r() * 4 - 2), 20, 95));
  return { id: `ea-${sel.sigla.toLowerCase()}-f${n}`, nome: `${nomes[Math.floor(r() * nomes.length)]} ${sobrenomes[Math.floor(r() * sobrenomes.length)]}`, pos, nat: sel.nat,
    idade: 20 + Math.floor(r() * 12), nota, est: false, ficticio: true, atr: { rit: a[0], fin: a[1], pas: a[2], dri: a[3], def: a[4], fis: a[5], gol: a[6] }, clubeReal: "" };
}

function gerar() {
  const linhas = jogadoresDoCSV(fs.readFileSync(CSV, "utf8"));
  // quem já está nos elencos da Carreira (pelo id do EA e, para a base brasileira, que não tem o id, pelo nome e país)
  const naCarreira = new Set(), porNome = new Set(), daCarreira = {};
  for (const liga of MUNDO.ligas) for (const c of require(`../public/carreira/base/${liga.id}.js`).clubes) for (const j of c.jogadores) {
    if (j.ea) naCarreira.add(j.ea); porNome.add(chaveNome(j.nome, j.nat));
    (daCarreira[j.nat] ||= []).push(j);
  }
  const selecoes = SELECOES.map(([csv, sigla, conf, cores, bandeira, nivel, lingua]) => {
    // o `nat` é o da Carreira (o mesmo texto que base-mundo.js grava nos jogadores); o nome é o da tela
    const nat = PAISES[csv] || csv, nome = NAT[csv], sel = { id: `sel-${slug(nome)}`, nome, curto: sigla, sigla, conf, nat, cores, bandeira, formacao: FORMACAO[csv] || "4-3-3", lingua };
    const doCSV = linhas.filter((l) => l.nationality === csv).sort((a, b) => numero(b.overallRating) - numero(a.overallRating) || numero(a.id) - numero(b.id));
    const fora = doCSV.filter((l) => !naCarreira.has(Number(l.id))).map((l) => jogadorDoCSV(l, nat)).filter((j) => !porNome.has(chaveNome(j.nome, nat)));
    const daqui = daCarreira[nat] || [];
    // os melhores de fora, sem deixar de ter os goleiros
    const gols = fora.filter((j) => j.pos === "GOL"), resto = fora.filter((j) => j.pos !== "GOL");
    const extras = [...gols.slice(0, 5), ...resto.slice(0, POR_SELECAO - Math.min(5, gols.length))].sort((a, b) => b.nota - a.nota);
    const r = sorte(`selecao:${sigla}`), todos = [...daqui, ...extras];
    let n = 0;
    while (todos.filter((j) => j.pos === "GOL").length < GOLEIROS && n < 10) { const f = ficticio(sel, ++n, "GOL", nivel - 2 + Math.round(r() * 3), r); extras.push(f); todos.push(f); }
    const ciclo = ["ZAG", "MC", "ATA", "LD", "VOL", "PE", "ZAG", "MEI", "LE", "PD", "ATA", "MC"];
    while (todos.length < MINIMO) { const f = ficticio(sel, ++n, ciclo[todos.length % ciclo.length], nivel - 4 + Math.round(r() * 6), r); extras.push(f); todos.push(f); }
    const top = todos.map((j) => j.nota).sort((a, b) => b - a).slice(0, 23);
    sel.forca = Math.round(top.reduce((s, x) => s + x, 0) / top.length * 10) / 10;
    delete sel.lingua;
    return { ...sel, jogadores: extras.sort((a, b) => b.nota - a.nota) };
  });
  const sedes = ["Espanha, Portugal e Marrocos", "Arábia Saudita", "Estados Unidos, México e Canadá", "Brasil", "Inglaterra"];
  const base = { id: "selecoes-2026", nome: "Copa do Mundo", ano: 2026, fonte: "EA FC 27", sedes, selecoes };
  const linhasJs = selecoes.map((s) => { const { jogadores, ...topo } = s; return `${JSON.stringify(topo).slice(0, -1)},"jogadores":[\n${jogadores.map((j) => `    ${JSON.stringify(j)}`).join(",\n")}]}`; }).join(",\n  ");
  const { selecoes: _, ...topo } = base;
  const texto = `// Carreira de Treinador: as 48 seleções da Copa do Mundo, gerado por ferramentas/base-selecoes.js (EA FC 27). Não edite à mão.\n` +
    `// Só os jogadores que NÃO estão nos elencos da Carreira: os outros entram pelo país (carreira-copa.js).\n` +
    `(function (root, factory) {\n  const base = factory();\n  if (typeof module === "object" && module.exports) module.exports = base;\n  else root.SelecoesCarreira = base;\n})(typeof self !== "undefined" ? self : this, function () {\n  return (${JSON.stringify(topo).slice(0, -1)},\n  "selecoes": [\n  ${linhasJs}]});\n});\n`;
  fs.writeFileSync(DESTINO, texto, "utf8");
  for (const s of [...selecoes].sort((a, b) => b.forca - a.forca)) console.log(`${s.nome.padEnd(20)} ${s.conf.padEnd(9)} força ${s.forca}  de fora ${s.jogadores.length} (fictícios ${s.jogadores.filter((j) => j.ficticio).length})`);
  console.log(`${selecoes.length} seleções -> ${path.relative(RAIZ, DESTINO)} (${Math.round(texto.length / 1024)} KB)`);
}
if (require.main === module) gerar();
module.exports = { gerar, SELECOES, NAT };
