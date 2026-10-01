// Notas (overall) no estilo EA SPORTS FC 27.
// Formato: "Nome": nota            → nota oficial divulgada do FC 27
//          "Nome": [nota, "est"]   → estimativa (jogador sem nota oficial divulgada / não é Icon no jogo)
// Lendas usam a versão Icon mais alta. Jogador que não estiver aqui entra com 75 (estimativa).
// Pode editar à vontade: é só trocar o número.
(function (root) {
const RATINGS = {
  // ===================== LENDAS =====================
  // Goleiros
  "Lev Yashin": [94, "est"], "Gianluigi Buffon": 92, "Manuel Neuer": [93, "est"], "Iker Casillas": 91,
  "Peter Schmeichel": [90, "est"], "Gordon Banks": [89, "est"], "Dino Zoff": [90, "est"], "Oliver Kahn": 92,
  "Sepp Maier": [89, "est"], "Edwin van der Sar": [89, "est"], "Taffarel": [90, "est"], "Petr Čech": [89, "est"],
  "Marcos": [86, "est"], "Gylmar": [89, "est"], "Rogério Ceni": [89, "est"],
  // Defensores
  "Franz Beckenbauer": 93, "Paolo Maldini": 93, "Franco Baresi": 91, "Cafu": 91, "Roberto Carlos": 90,
  "Bobby Moore": 90, "Fabio Cannavaro": [91, "est"], "Carlos Alberto Torres": 91, "Nílton Santos": [89, "est"],
  "Philipp Lahm": 89, "Sergio Ramos": [90, "est"], "Alessandro Nesta": [90, "est"], "Marcelo": [89, "est"],
  "Daniel Passarella": [89, "est"], "Lilian Thuram": 89, "Ronald Koeman": [89, "est"], "Giacinto Facchetti": [89, "est"],
  "Rio Ferdinand": [89, "est"], "Carles Puyol": 89, "Virgil van Dijk": 89, "Paul Breitner": [89, "est"],
  "Andreas Brehme": [88, "est"], "Dani Alves": [88, "est"], "Lúcio": 89, "Aldair": [88, "est"], "Gaetano Scirea": [89, "est"],
  "John Terry": [89, "est"], "Jaap Stam": [88, "est"], "Thiago Silva": [89, "est"], "Matthias Sammer": [89, "est"],
  // Meio-campo
  "Zinedine Zidane": 94, "Johan Cruyff": 93, "Michel Platini": [92, "est"], "Xavi": 91, "Andrés Iniesta": 92, "Zico": 91,
  "Lothar Matthäus": 90, "Andrea Pirlo": 90, "Luka Modrić": [90, "est"], "Kaká": 90, "Bobby Charlton": 92,
  "Sócrates": [90, "est"], "Falcão": [89, "est"], "Didi": [89, "est"], "Gérson": [89, "est"], "Rivaldo": 90,
  "Steven Gerrard": 89, "Frank Lampard": [89, "est"], "Clarence Seedorf": [89, "est"], "Luís Figo": 90,
  "Juan Román Riquelme": [89, "est"], "Kevin De Bruyne": [86, "est"], "Paul Scholes": [89, "est"], "Toni Kroos": 90,
  "Frank Rijkaard": [90, "est"], "Roy Keane": [89, "est"], "Patrick Vieira": [90, "est"], "Gheorghe Hagi": [89, "est"],
  "Michael Laudrup": [89, "est"],
  // Atacantes
  "Pelé": 95, "Diego Maradona": 95, "Lionel Messi": 93, "Cristiano Ronaldo": 93, "Ronaldo Fenômeno": 94,
  "Ronaldinho Gaúcho": 93, "Garrincha": 93, "Alfredo Di Stéfano": [93, "est"], "Ferenc Puskás": 92, "Eusébio": 91,
  "Marco van Basten": 91, "Gerd Müller": 92, "Romário": [91, "est"], "Thierry Henry": 91, "George Best": 90,
  "Zlatan Ibrahimović": 91, "Karim Benzema": [90, "est"], "Robert Lewandowski": [85, "est"], "Roberto Baggio": 91,
  "Gabriel Batistuta": 89, "Samuel Eto'o": 89, "Didier Drogba": [89, "est"], "Raúl": 90, "Kenny Dalglish": 90,
  "Jairzinho": [90, "est"], "Tostão": [89, "est"], "Rivellino": 90, "Hristo Stoichkov": [89, "est"], "George Weah": [89, "est"],
  "Andriy Shevchenko": 89, "Luis Suárez": [90, "est"], "Neymar": [91, "est"],

  // ===================== ATUAIS (FC 27) =====================
  // Goleiros
  "Alisson": 88, "Thibaut Courtois": 90, "Gianluigi Donnarumma": 89, "Ederson": [85, "est"], "Mike Maignan": 87,
  "Jan Oblak": 88, "Marc-André ter Stegen": [85, "est"], "Emiliano Martínez": [85, "est"], "Yassine Bounou": [84, "est"],
  "David Raya": 88, "Unai Simón": [85, "est"], "Diogo Costa": [85, "est"], "Gregor Kobel": 87, "Joan García": [85, "est"],
  // Defensores
  "Rúben Dias": 87, "William Saliba": 88, "Marquinhos": 87, "Antonio Rüdiger": [85, "est"], "Achraf Hakimi": 88,
  "Theo Hernández": [84, "est"], "Alessandro Bastoni": 86, "Trent Alexander-Arnold": [84, "est"], "Nuno Mendes": 89,
  "Gabriel Magalhães": 89, "Joško Gvardiol": [85, "est"], "Jules Koundé": [85, "est"], "Alphonso Davies": [83, "est"],
  "Dayot Upamecano": 87, "Éder Militão": [84, "est"], "Pau Cubarsí": [85, "est"], "Dean Huijsen": [84, "est"],
  "Micky van de Ven": [84, "est"], "Federico Dimarco": [85, "est"], "Alejandro Grimaldo": [85, "est"], "Jeremie Frimpong": [83, "est"],
  "Ibrahima Konaté": [85, "est"], "Cristian Romero": [85, "est"], "Lisandro Martínez": [84, "est"], "Ronald Araújo": [84, "est"],
  "Willian Pacho": 89, "Riccardo Calafiori": [83, "est"], "Kim Min-jae": [84, "est"], "Jurriën Timber": [85, "est"],
  "Nico Schlotterbeck": 87, "Jonathan Tah": 87,
  // Meio-campo
  "Rodri": 90, "Jude Bellingham": 90, "Pedri": 90, "Martin Ødegaard": [86, "est"], "Declan Rice": 88,
  "Federico Valverde": 87, "Vitinha": 90, "Florian Wirtz": [87, "est"], "Jamal Musiala": 87, "Bruno Fernandes": 89,
  "Joshua Kimmich": 88, "Frenkie de Jong": [86, "est"], "Bruno Guimarães": [86, "est"], "Alexis Mac Allister": [86, "est"],
  "Nicolò Barella": 87, "João Neves": 88, "Cole Palmer": [86, "est"], "Dani Olmo": [85, "est"], "Aurélien Tchouaméni": [85, "est"],
  "Enzo Fernández": [85, "est"], "Moisés Caicedo": [86, "est"], "Ryan Gravenberch": [86, "est"], "Gavi": [84, "est"],
  "Arda Güler": [85, "est"], "Hakan Çalhanoğlu": [85, "est"], "Warren Zaïre-Emery": [84, "est"],
  // Atacantes
  "Kylian Mbappé": 91, "Erling Haaland": 91, "Vinícius Júnior": 89, "Lamine Yamal": 90, "Mohamed Salah": 87,
  "Harry Kane": 90, "Ousmane Dembélé": 90, "Raphinha": 88, "Lautaro Martínez": 87, "Bukayo Saka": 87,
  "Rodrygo": [85, "est"], "Khvicha Kvaratskhelia": 89, "Victor Osimhen": [86, "est"], "Julián Álvarez": [87, "est"],
  "Alexander Isak": [87, "est"], "Viktor Gyökeres": [86, "est"], "Rafael Leão": [85, "est"], "Son Heung-min": [84, "est"],
  "Phil Foden": [85, "est"], "Michael Olise": 90, "Désiré Doué": [86, "est"], "Nico Williams": [85, "est"],
  "Marcus Thuram": [85, "est"], "Serhou Guirassy": [85, "est"], "Kenan Yıldız": [85, "est"], "Estêvão": [83, "est"],
  "Luis Díaz": 88, "Jonathan David": [84, "est"],
};

// Tipo de meia: "VOL" = volante (mais defensivo) · "MEI" = meia-atacante. Meia fora desta lista conta como meia comum.
const MEIAS = {
  // lendas
  "Zinedine Zidane": "MEI", "Johan Cruyff": "MEI", "Michel Platini": "MEI", "Xavi": "VOL", "Andrés Iniesta": "MEI", "Zico": "MEI",
  "Lothar Matthäus": "VOL", "Andrea Pirlo": "VOL", "Luka Modrić": "MEI", "Kaká": "MEI", "Bobby Charlton": "MEI", "Sócrates": "MEI",
  "Falcão": "VOL", "Didi": "VOL", "Gérson": "VOL", "Rivaldo": "MEI", "Steven Gerrard": "MEI", "Frank Lampard": "MEI",
  "Clarence Seedorf": "MEI", "Luís Figo": "MEI", "Juan Román Riquelme": "MEI", "Kevin De Bruyne": "MEI", "Paul Scholes": "MEI",
  "Toni Kroos": "VOL", "Frank Rijkaard": "VOL", "Roy Keane": "VOL", "Patrick Vieira": "VOL", "Gheorghe Hagi": "MEI", "Michael Laudrup": "MEI",
  // atuais
  "Rodri": "VOL", "Jude Bellingham": "MEI", "Pedri": "MEI", "Martin Ødegaard": "MEI", "Declan Rice": "VOL", "Federico Valverde": "VOL",
  "Vitinha": "VOL", "Florian Wirtz": "MEI", "Jamal Musiala": "MEI", "Bruno Fernandes": "MEI", "Joshua Kimmich": "VOL",
  "Frenkie de Jong": "VOL", "Bruno Guimarães": "VOL", "Alexis Mac Allister": "VOL", "Nicolò Barella": "MEI", "João Neves": "VOL",
  "Cole Palmer": "MEI", "Dani Olmo": "MEI", "Aurélien Tchouaméni": "VOL", "Enzo Fernández": "VOL", "Moisés Caicedo": "VOL",
  "Ryan Gravenberch": "VOL", "Gavi": "MEI", "Arda Güler": "MEI", "Hakan Çalhanoğlu": "VOL", "Warren Zaïre-Emery": "VOL",
};

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const INDEX = {};
for (const [k, v] of Object.entries(RATINGS)) INDEX[norm(k)] = Array.isArray(v) ? { ovr: v[0], est: true } : { ovr: v, est: false };
const DEFAULT = 75;
const MEIA_IDX = {}; for (const [k, v] of Object.entries(MEIAS)) MEIA_IDX[norm(k)] = v;
const meiaType = (item) => MEIA_IDX[norm(parseItem(item).name)] || null;

// "Neuer (Goleiro)" -> { name: "Neuer", cat: "Goleiro" }
function parseItem(item) {
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(String(item || ""));
  return m ? { name: m[1].trim(), cat: m[2].trim() } : { name: String(item || "").trim(), cat: null };
}
function ratingOf(item) {
  const { name } = parseItem(item);
  const r = INDEX[norm(name)];
  return r ? { ovr: r.ovr, est: r.est, known: true } : { ovr: DEFAULT, est: true, known: false };
}

const api = { RATINGS, MEIAS, ratingOf, parseItem, meiaType, DEFAULT };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Ratings = api;
})(typeof window !== "undefined" ? window : globalThis);
