// Monta public/carreira/base/brasileirao-2026.js (a base da Carreira de Treinador).
//   node ferramentas/base-brasileirao.js          baixa os elencos da Wikipédia (inglês) e grava a base
//   node ferramentas/base-brasileirao.js --cache  usa o último download (ferramentas/.elencos.json)
// Os nomes e as posições vêm da Wikipédia. As notas são ESTIMADAS (estilo FC): as dos jogadores conhecidos estão na
// tabela NOTAS abaixo; os outros recebem a nota-base do clube com um sorteio pequeno. Idade, valor e salário ficam para
// quando houver uma fonte melhor (idade sai null; valor e salário são contas da nota). Para atualizar uma nota, mude
// aqui e rode de novo.
const fs = require("fs");
const path = require("path");

// id, nome na tela, sigla, cidade, cores, estádio (nome popular), tamanho (1 a 5), nota-base, formação, página da Wikipédia, escudo
const CLUBES = [
  ["flamengo", "Flamengo", "FLA", "Rio de Janeiro", ["#c8102e", "#111111"], "Maracanã", 5, 78, "4-3-3", "CR Flamengo", { forma: "escudo", listras: ["h", "#c8102e", "#111111", 3], texto: "FL", corTexto: "#ffffff" }],
  ["palmeiras", "Palmeiras", "PAL", "São Paulo", ["#006437", "#ffffff"], "Allianz Parque", 5, 78, "4-2-3-1", "Sociedade Esportiva Palmeiras", { forma: "redondo", fundo: "#006437", anel: "#ffffff", texto: "P", corTexto: "#ffffff", estrelasTopo: 0 }],
  ["cruzeiro", "Cruzeiro", "CRU", "Belo Horizonte", ["#0033a0", "#ffffff"], "Mineirão", 5, 75, "4-2-3-1", "Cruzeiro Esporte Clube", { forma: "redondo", fundo: "#0033a0", anel: "#ffffff", simbolo: "cruzeiro", corSimbolo: "#ffffff" }],
  ["mirassol", "Mirassol", "MIR", "Mirassol", ["#ffd200", "#00843d"], "Maião", 2, 70, "4-3-3", "Mirassol Futebol Clube", { forma: "escudo", fundo: "#ffd200", borda: "#00843d", texto: "M", corTexto: "#00843d", estrelasTopo: 0 }],
  ["fluminense", "Fluminense", "FLU", "Rio de Janeiro", ["#7a1e3a", "#00613c"], "Maracanã", 5, 74, "4-2-3-1", "Fluminense FC", { forma: "escudo", listras: ["v", "#7a1e3a", "#ffffff", "#00613c"], texto: "F", corTexto: "#ffffff", fundoTexto: "#7a1e3a" }],
  ["botafogo", "Botafogo", "BOT", "Rio de Janeiro", ["#111111", "#ffffff"], "Nilton Santos", 5, 74, "4-2-3-1", "Botafogo de Futebol e Regatas", { forma: "escudo", fundo: "#111111", simbolo: "estrela", corSimbolo: "#ffffff", borda: "#ffffff" }],
  ["bahia", "Bahia", "BAH", "Salvador", ["#0057b8", "#d0021b"], "Fonte Nova", 4, 73, "4-3-3", "Esporte Clube Bahia", { forma: "redondo", listras: ["v", "#0057b8", "#ffffff", "#d0021b"], anel: "#0057b8", simbolo: "estrela", corSimbolo: "#ffffff" }],
  ["saopaulo", "São Paulo", "SAO", "São Paulo", ["#ffffff", "#d0021b"], "Morumbi", 5, 73, "4-2-3-1", "São Paulo FC", { forma: "triangulo", fundo: "#ffffff", listras: ["h-baixo", "#d0021b", "#ffffff", "#111111"], texto: "SP", corTexto: "#d0021b", textoY: 3 }],
  ["gremio", "Grêmio", "GRE", "Porto Alegre", ["#0d80bf", "#111111"], "Arena do Grêmio", 5, 72, "4-2-3-1", "Grêmio Foot-Ball Porto Alegrense", { forma: "escudo", listras: ["v", "#0d80bf", "#111111", "#ffffff"], estrelasTopo: 3, corEstrelas: "#ffd200" }],
  ["bragantino", "Bragantino", "BGT", "Bragança Paulista", ["#ffffff", "#d0021b"], "Nabi Abi Chedid", 3, 71, "4-3-3", "Red Bull Bragantino", { forma: "escudo", fundo: "#ffffff", borda: "#d0021b", texto: "B", corTexto: "#d0021b" }],
  ["atleticomg", "Atlético-MG", "CAM", "Belo Horizonte", ["#111111", "#ffffff"], "Arena MRV", 5, 74, "4-3-3", "Clube Atlético Mineiro", { forma: "escudo", listras: ["v", "#111111", "#ffffff"], texto: "CAM", corTexto: "#111111", fundoTexto: "#ffffff", estrelasTopo: 1, corEstrelas: "#ffd200" }],
  ["santos", "Santos", "SAN", "Santos", ["#ffffff", "#111111"], "Vila Belmiro", 5, 72, "4-3-3", "Santos FC", { forma: "escudo", fundo: "#ffffff", listras: ["v-topo", "#111111", "#ffffff"], texto: "SFC", corTexto: "#111111", borda: "#111111", textoY: 7 }],
  ["corinthians", "Corinthians", "COR", "São Paulo", ["#ffffff", "#111111"], "Arena Corinthians", 5, 73, "4-2-3-1", "Sport Club Corinthians Paulista", { forma: "redondo", fundo: "#ffffff", anel: "#111111", simbolo: "ancora", corSimbolo: "#111111", faixaMeio: "#d0021b" }],
  ["vasco", "Vasco", "VAS", "Rio de Janeiro", ["#111111", "#ffffff"], "São Januário", 5, 72, "4-3-3", "CR Vasco da Gama", { forma: "escudo", fundo: "#111111", diagonal: "#ffffff", simbolo: "cruz", corSimbolo: "#d0021b", borda: "#ffffff" }],
  ["vitoria", "Vitória", "VIT", "Salvador", ["#d0021b", "#111111"], "Barradão", 3, 69, "4-3-3", "Esporte Clube Vitória", { forma: "escudo", listras: ["h", "#d0021b", "#111111", 4], texto: "ECV", corTexto: "#ffd200", fundoTexto: "#111111" }],
  ["internacional", "Internacional", "INT", "Porto Alegre", ["#d0021b", "#ffffff"], "Beira-Rio", 5, 73, "4-2-3-1", "Sport Club Internacional", { forma: "redondo", fundo: "#d0021b", anel: "#ffffff", texto: "SCI", corTexto: "#ffffff" }],
  ["coritiba", "Coritiba", "CFC", "Curitiba", ["#00543d", "#ffffff"], "Couto Pereira", 3, 69, "4-3-3", "Coritiba Foot Ball Club", { forma: "redondo", fundo: "#ffffff", anel: "#00543d", texto: "CFC", corTexto: "#00543d" }],
  ["athletico", "Athletico-PR", "CAP", "Curitiba", ["#d0021b", "#111111"], "Arena da Baixada", 4, 70, "4-3-3", "Club Athletico Paranaense", { forma: "triangulo", listras: ["d", "#d0021b", "#111111"] }],
  ["chapecoense", "Chapecoense", "CHA", "Chapecó", ["#00843d", "#ffffff"], "Arena Condá", 2, 67, "4-4-2", "Associação Chapecoense de Futebol", { forma: "escudo", fundo: "#00843d", texto: "ACF", corTexto: "#ffffff", estrelasTopo: 1, corEstrelas: "#ffffff", borda: "#ffffff" }],
  ["remo", "Remo", "REM", "Belém", ["#0a2a66", "#ffffff"], "Baenão", 3, 67, "4-3-3", "Clube do Remo", { forma: "escudo", fundo: "#0a2a66", texto: "R", corTexto: "#ffffff", estrelasTopo: 1, corEstrelas: "#ffffff", borda: "#ffffff" }],
];

// notas estimadas dos conhecidos: "Nome como na Wikipédia": nota ou [nota, posição]. Posição: GOL ZAG LD LE VOL MC MEI PE PD ATA
const NOTAS = {
  flamengo: { "Agustín Rossi": 81, "Guillermo Varela": [76, "LD"], "Léo Ortiz": 79, "Léo Pereira": 79, "Erick Pulgar": [78, "VOL"], "Ayrton Lucas": [76, "LE"], "Luiz Araújo": [77, "PD"], "Saúl Ñíguez": 79, "Pedro": 81, "Giorgian de Arrascaeta": [84, "MEI"], "Lucas Paquetá": [83, "MEI"], "Danilo": 78, "Jorge Carrascal": [78, "MEI"], "Samuel Lino": [79, "PE"], "Nicolás de la Cruz": 80, "Gonzalo Plata": [78, "PD"], "Jorginho": [81, "VOL"], "Emerson Royal": [77, "LD"], "Alex Sandro": [78, "LE"], "Bruno Henrique": [77, "PE"], "Vitão": 75 },
  palmeiras: { "Carlos Miguel": 78, "Alexander Barboza": 77, "Bruno Fuchs": 76, "Agustín Giay": [76, "LD"], "Felipe Anderson": [79, "MEI"], "Andreas Pereira": [79, "MEI"], "Vitor Roque": 80, "Paulinho": [79, "PE"], "Jhon Arias": [81, "PD"], "Khellven": [74, "LD"], "Gustavo Gómez": 80, "Marlon Freitas": [78, "VOL"], "Maurício": [77, "MEI"], "Ramón Sosa": [77, "PE"], "Joaquín Piquerez": [79, "LE"], "Murilo": 76, "Emiliano Martínez": [77, "VOL"], "José Manuel López": 77, "Lucas Evangelista": 74 },
  cruzeiro: { "Cássio": 77, "Matheus Henrique": 77, "Gerson": [80, "MC"], "Matheus Pereira": [80, "MEI"], "Fabrício Bruno": 78, "Lucas Silva": [74, "VOL"], "Luis Sinisterra": [78, "PE"], "Kaio Jorge": 79, "Wesley": [77, "PD"], "Fagner": [74, "LD"], "Lucas Villalba": 75, "Gabriel Rojas": [74, "LE"], "Lucas Romero": [77, "VOL"], "Jonathan Jesus": 75, "Zé Lucas": 72, "Gabriel Pec": [74, "PD"], "Keny Arroyo": [73, "PE"], "Luciano Rodríguez": 75, "Marquinhos": [73, "PE"], "William": [74, "LD"] },
  mirassol: { "Walter": 72, "Reinaldo": [73, "LE"], "Chico Kim": [72, "MEI"], "Negueba": [72, "PD"], "Shaylon": [72, "MEI"], "José Aldo": [71, "VOL"], "Edson Carioca": 70, "Alesson": [72, "PE"], "Lucas Oliveira": 71, "Daniel Borges": [71, "LD"], "Neto Moura": [71, "VOL"], "Japa": 70, "Gustavo Silva": [71, "PD"] },
  fluminense: { "Fábio": 75, "Samuel Xavier": [73, "LD"], "Thiago Silva": 79, "Ignácio": 75, "Renê": [72, "LE"], "Hulk": [78, "PD"], "Matheus Martinelli": [76, "VOL"], "John Kennedy": 74, "Ganso": [75, "MEI"], "Jefferson Savarino": [77, "MEI"], "Guilherme Arana": [77, "LE"], "Germán Cano": 75, "Nonato": 74, "Agustín Canobbio": [75, "PE"], "Rodrigo Castillo": 72, "Juan Pablo Freytes": 76, "Guga": [73, "LD"], "Yeferson Soteldo": [75, "PE"], "Lucho Acosta": [77, "MEI"], "Hércules": [75, "VOL"], "Kevin Serna": [75, "PD"], "Otávio": [72, "VOL"] },
  botafogo: { "Vitinho": [75, "LD"], "Arthur Chaves": 73, "Mateo Ponte": [74, "LD"], "Nahuel Ferraresi": 74, "Cristian Medina": [76, "MC"], "Júnior Santos": [75, "PE"], "Tiquinho Soares": 73, "Álvaro Montoro": [75, "MEI"], "Matheus Martins": [75, "PE"], "Gabriel Batista": 71, "Alex Telles": [77, "LE"], "Jordan Barrera": [74, "PD"], "Arthur Cabral": 76, "Marçal": [73, "LE"], "Hakim Ziyech": [78, "PD"], "Allan": [75, "VOL"], "Kaio Pantaleão": 73, "Edenilson": 74, "Danilo Pereira": 74 },
  bahia: { "Ronaldo": 72, "Kanu": 75, "Nicolás Acevedo": [75, "VOL"], "Jean Lucas": 76, "Ademir": [74, "PD"], "Caio Alexandre": [77, "VOL"], "Alejo Véliz": 73, "Éverton Ribeiro": [77, "MEI"], "Rodrigo Nestor": [75, "MEI"], "Willian José": 74, "Michel Araújo": 74, "Erick Pulga": [75, "PE"], "Guido Herrera": 72, "Mateo Sanabria": 72, "Everaldo": 72, "Román Gómez": [74, "LD"], "David Duarte": 73, "Luciano Juba": [76, "LE"], "Kike Olivera": 73 },
  saopaulo: { "Rafael Tolói": 74, "Robert Arboleda": 76, "Lucas Moura": [78, "MEI"], "Marcos Antônio": [76, "VOL"], "Jonathan Calleri": 77, "Luciano": 74, "Ferreira": [74, "PE"], "Enzo Díaz": [74, "LE"], "Damián Bobadilla": [75, "VOL"], "André Silva": 73, "Wendell": [74, "LE"], "Cédric Soares": [73, "LD"], "Rafael": 77, "Pablo Maia": [76, "VOL"], "Sabino": 73, "Cauly": [74, "MEI"], "Tetê": [74, "PD"], "Aurélio Buta": [72, "LD"] },
  gremio: { "Weverton": 78, "Fabián Balbuena": 75, "Wagner Leonardo": 74, "Walter Kannemann": 74, "Juan Nardoni": [75, "VOL"], "Cristian Pavon": [74, "PD"], "Erick Noriega": [74, "VOL"], "Francis Amuzu": [74, "PE"], "Filip Krovinović": [73, "MEI"], "Marcos Rocha": [72, "LD"], "Dodi": [74, "VOL"], "Mathías Villasanti": [77, "VOL"], "Martin Braithwaite": 76, "Marlon": [72, "LE"], "Carlos Vinícius": 75, "José Enamorado": [74, "PD"], "Caio Paulista": [72, "LE"], "Jovane Cabral": [72, "PE"], "Tetê": [73, "PD"] },
  bragantino: { "Cleiton": 75, "Guzmán Rodríguez": 73, "Eduardo Santos": 73, "Eric Ramires": [74, "MEI"], "Eduardo Sasha": 73, "Isidro Pitta": 75, "Vanderlan": [74, "LE"], "Tiago Volpi": 74, "Lucas Barbosa": [73, "PD"], "Juninho Capixaba": [74, "LE"], "Henry Mosquera": [74, "PE"], "José María Herrera": 72, "Andrés Hurtado": [73, "LD"], "Matheus Fernandes": [73, "VOL"], "Gabriel": [72, "VOL"], "Fabinho": [72, "VOL"], "Patrick": [70, "MEI"] },
  atleticomg: { "Everson": 76, "Gabriel Delfim": 72, "Natanael": [73, "LD"], "Léo Duarte": 73, "Alexsander": [76, "VOL"], "Renan Lodi": [77, "LE"], "Fred": [77, "MC"], "Maycon": 75, "Mateo Cassierra": 75, "Gustavo Scarpa": [77, "MEI"], "Bernard": [75, "MEI"], "Lyanco": 75, "Vitor Hugo": 74, "Kevin Castaño": [75, "VOL"], "Igor Gomes": 74, "Reinier": [74, "MEI"], "Alan Franco": [76, "VOL"], "Ángelo Preciado": [74, "LD"], "Tomás Pérez": 73, "Alan Minda": [75, "PE"], "Tomás Cuello": [74, "PD"], "Dudu": [76, "PE"] },
  santos: { "Gabriel Brazão": 75, "Lucas Veríssimo": 75, "João Schmidt": [74, "VOL"], "Arthur": [76, "MC"], "Everton Cebolinha": [76, "PE"], "Gabriel Bontempo": 72, "Gabriel Barbosa": 77, "Neymar": [85, "MEI"], "Philippe Coutinho": [78, "MEI"], "Luan Peres": 74, "Willian Arão": [75, "VOL"], "Thaciano": [74, "MEI"], "Gustavo Caballero": [73, "PD"], "Igor Vinícius": [72, "LD"], "Álvaro Barreal": [74, "PE"], "Rodinei": [72, "LD"], "Gabriel Menino": 74, "Christian Oliva": [72, "VOL"], "Miguel Terceros": [73, "MEI"], "Gonzalo Escobar": [73, "LE"], "Benjamín Rollheiser": [76, "PD"], "Rony": [74, "PE"], "Diógenes": 70 },
  corinthians: { "Hugo Souza": 78, "Matheuzinho": [75, "LD"], "Gabriel Paulista": 75, "André Ramalho": 75, "Breno Bidon": [76, "MC"], "Rodrigo Garro": [78, "MEI"], "Yuri Alberto": 78, "Memphis Depay": [81, "ATA"], "Gustavo Henrique": 75, "Raniele": [75, "VOL"], "Pedro Raul": 73, "André Carrillo": [76, "MC"], "Matheus Bidu": [73, "LE"], "Fabrizio Angileri": [73, "LE"], "Matheus Pereira": [72, "MEI"], "Allan": [74, "VOL"], "Charles": [73, "VOL"], "Kaio César": [73, "PE"], "Zakaria Labyad": [75, "MEI"], "Jesse Lingard": [77, "MEI"], "Alex Santana": 73, "Vitinho": [72, "PD"] },
  vasco: { "Léo Jardim": 77, "Puma Rodríguez": [75, "LD"], "Tchê Tchê": [74, "VOL"], "Alan Saldivia": 74, "Santiago Sosa": [74, "VOL"], "Lucas Piton": [76, "LE"], "David": [74, "PE"], "Jair": [73, "VOL"], "Facundo Colidio": 74, "Johan Rojas": [74, "PD"], "Andrés Gómez": [74, "PD"], "Nuno Moreira": [74, "PE"], "Marino Hinestroza": [74, "PE"], "Alan Lescano": [73, "MEI"], "Thiago Mendes": [75, "VOL"], "Adson": [74, "PD"], "Paulinho": 73, "Robert Renan": 74, "Carlos Cuesta": 75, "Cuiabano": [74, "LE"], "Claudio Spinelli": 72, "Brenner": 72 },
  vitoria: { "Lucas Arcanjo": 74, "Emanuel Brítez": 72, "Camutanga": 72, "Emmanuel Martínez": [72, "MEI"], "Marinho": [72, "PD"], "Tomás Pochettino": [73, "MEI"], "Matheuzinho": [72, "MEI"], "Osvaldo": [72, "PE"], "Ramon": [71, "LE"], "Walace": [73, "VOL"], "Gabriel Baralhas": [71, "VOL"], "Renato Kayzer": 72, "Luan Cândido": [72, "LE"], "Ignacio Laquintana": [72, "PD"], "Cacá": 72, "Fabrí": 71, "Erick": [70, "PD"], "Dudu": [71, "MEI"] },
  internacional: { "Sergio Rochet": 77, "Guillermo Maripán": 76, "Félix Torres": 74, "Rodrigo Villagra": [74, "VOL"], "Matheus Bahia": [73, "LE"], "Johan Carbonero": [76, "PD"], "Bruno Henrique": [75, "VOL"], "Alerrandro": 74, "Alan Patrick": [79, "MEI"], "Kayky": [72, "PD"], "Bruno Gomes": [73, "VOL"], "Niclas Eliasson": [73, "PD"], "Gabriel Mercado": 72, "Alexandro Bernabei": [76, "LE"], "Vitinho": [74, "PE"], "Thiago Maia": [75, "VOL"], "Braian Aguirre": [74, "LD"], "Juninho": 72, "Ronaldo": [72, "MEI"] },
  coritiba: { "Pedro Morisco": 72, "Tinga": [70, "LD"], "Maicon": 71, "Rodrigo Moledo": 71, "Nicolás Fonseca": [71, "VOL"], "Felipe Jonatan": [70, "LE"], "Joaquín Lavega": [72, "PE"], "Josué Pesqueira": [71, "MEI"], "Lucas Ronier": [72, "PD"], "Fabricio Bustos": [73, "LD"], "Brian Ocampo": [72, "PE"], "Sebastián Gómez": [72, "MC"], "Keno": [70, "PE"], "Pedro Rocha": 71, "Breno Lopes": [72, "PE"], "Richard": [70, "VOL"] },
  athletico: { "Mycael": 72, "Santos": 74, "Léo Pelé": 71, "Arthur Dias": 72, "Felipinho": [71, "VOL"], "Stiven Mendoza": [73, "PE"], "João Cruz": [72, "MEI"], "Kevin Viveros": 74, "Bruno Zapelli": [73, "MEI"], "Luiz Gustavo": [72, "VOL"], "Jadson": [71, "VOL"], "Alejandro García": [72, "MEI"], "Kerwin Vargas": [74, "PD"], "Leozinho": [71, "PE"], "Carlos Terán": 73, "Lucas Esquivel": [72, "LE"], "Gastón Benavídez": [72, "LD"], "Juan Portilla": [71, "VOL"], "Juan Felipe Aguirre": 71 },
  chapecoense: { "Rafael Santos": 70, "Eduardo Doma": 70, "João Paulo": 69, "Marcinho": [70, "PD"], "Giovanni Augusto": [70, "MEI"], "Yannick Bolasie": [71, "PE"], "Rafael Thyere": 70, "Bruno Matias": [69, "MEI"], "Camilo": [70, "MC"], "Franco Rossi": 69, "Maurício Garcez": [69, "PE"], "Dylan Borrero": [71, "PD"], "Yago Felipe": [71, "VOL"], "Bruno Pacheco": [70, "LE"], "Kevin Ramírez": [70, "PE"] },
  remo: { "Marcelo Rangel": 70, "Marllon": 70, "Jajá": [70, "PE"], "Patrick": [70, "MEI"], "Gabriel Poveda": 70, "Jáderson": [70, "MC"], "Leonel Picco": [70, "VOL"], "Vitor Bueno": [71, "MEI"], "Duplexe Tchamba": 70, "Gabriel Taliari": 70, "Antonio Galeano": [69, "PE"], "Yago Pikachu": [72, "PD"], "Zé Welison": [70, "VOL"], "Mayk": [69, "LE"], "João Lucas": [69, "LD"] },
};
const POS_WIKI = { GK: "GOL", DF: "ZAG", MF: "MC", FW: "ATA" };
// a nacionalidade como a Wikipédia escreve (nome em inglês ou código FIFA) para o português
const PAISES = {
  Brazil: "Brasil", BRA: "Brasil", Argentina: "Argentina", ARG: "Argentina", Uruguay: "Uruguai", URU: "Uruguai", Chile: "Chile", CHI: "Chile",
  Spain: "Espanha", ESP: "Espanha", Ecuador: "Equador", ECU: "Equador", Colombia: "Colômbia", COL: "Colômbia", Italy: "Itália", ITA: "Itália",
  Paraguay: "Paraguai", PAR: "Paraguai", Portugal: "Portugal", POR: "Portugal", Japan: "Japão", Belgium: "Bélgica", Venezuela: "Venezuela",
  Morocco: "Marrocos", MAR: "Marrocos", Panama: "Panamá", Angola: "Angola", PER: "Peru", Peru: "Peru", GHA: "Gana", CRO: "Croácia", DEN: "Dinamarca",
  CPV: "Cabo Verde", Guinea: "Guiné", Bolivia: "Bolívia", NED: "Holanda", ENG: "Inglaterra", SWE: "Suécia", COD: "RD Congo", CMR: "Camarões",
};
// quanto cada posição soma em cada atributo (ritmo, finalização, passe, drible, defesa, físico, goleiro)
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
function sorteDe(txt) {
  let a = 2166136261;
  for (const ch of String(txt)) a = Math.imul(a ^ ch.charCodeAt(0), 16777619);
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const limpar = (s) => s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").replace(/\{\{[^}]*\}\}/g, "").replace(/<[^>]*>/g, "").trim();
function campo(l, k) {
  const m = l.match(new RegExp("\\|\\s*" + k + "\\s*=\\s*((?:\\[\\[[^\\]]*\\]\\]|\\{\\{[^}]*\\}\\}|[^|}])*)", "i"));
  return m && m[1] != null ? m[1].trim() : "";
}
async function baixar() {
  const out = {};
  for (const c of CLUBES) {
    const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(c[9])}&prop=wikitext&redirects=1&format=json&formatversion=2`;
    let j = null;
    for (let tentativa = 0; tentativa < 4 && !j; tentativa++) { // a Wikipédia pede calma quando são muitos pedidos seguidos
      const r = await fetch(url, { headers: { "User-Agent": "VilaDaGalera/1.0 (base da Carreira de Treinador)" } });
      try { j = await r.json(); } catch { await new Promise((ok) => setTimeout(ok, 5000 * (tentativa + 1))); }
    }
    if (!j) throw new Error(`${c[0]}: a Wikipédia não respondeu`);
    if (!j.parse) throw new Error(`${c[0]}: página não encontrada`);
    const linhas = j.parse.wikitext.split("\n"), ini = linhas.findIndex((l) => /\{\{\s*fs start/i.test(l)), fim = linhas.findIndex((l, i) => i > ini && /\{\{\s*fs end/i.test(l));
    out[c[0]] = (ini >= 0 ? linhas.slice(ini, fim) : []).filter((l) => /fs player/i.test(l))
      .map((l) => ({ pos: campo(l, "pos").toUpperCase(), nome: limpar(campo(l, "name")), nat: limpar(campo(l, "nat")) })).filter((p) => p.nome && POS_WIKI[p.pos]);
    await new Promise((ok) => setTimeout(ok, 400));
  }
  return out;
}

(async () => {
  const cache = path.join(__dirname, ".elencos.json");
  const elencos = process.argv.includes("--cache") && fs.existsSync(cache) ? JSON.parse(fs.readFileSync(cache, "utf8")) : await baixar();
  fs.writeFileSync(cache, JSON.stringify(elencos));
  const clubes = CLUBES.map(([id, nome, curto, cidade, cores, estadio, tamanho, nota, formacao, , escudo]) => {
    const r = sorteDe("brasileirao-2026:" + id), conhecidos = NOTAS[id] || {}, vistos = new Set();
    const jogadores = elencos[id].filter((p) => !vistos.has(p.nome) && vistos.add(p.nome)).map((p, i) => {
      const k = conhecidos[p.nome], conhecido = k != null;
      const notaJ = conhecido ? (Array.isArray(k) ? k[0] : k) : clamp(Math.round(nota - 5 + (r() - 0.5) * 6), 55, 90);
      const pos = conhecido && Array.isArray(k) ? k[1] : POS_WIKI[p.pos];
      const atr = {};
      for (const [a, d] of Object.entries(PERFIL[pos])) atr[a] = clamp(Math.round(notaJ + d + (r() - 0.5) * 8), 20, 95);
      const valor = Math.round(Math.pow(1.14, notaJ - 60) * 1e5 / 1e4) * 1e4;
      return { id: `${id}-${i + 1}`, nome: p.nome, pos, nat: PAISES[p.nat] || p.nat, idade: null, nota: notaJ, est: true, ...(conhecido ? {} : { reserva: true }), atr, valor, salario: Math.round(valor / 120 / 1000) * 1000, contrato: null };
    });
    // elenco curto na Wikipédia: completa com jovens da base FICTÍCIOS (base: true), com nome genérico, para revisar
    const MINIMO = [["GOL", ["GOL"], 3, "Goleiro"], ["ZAG", ["ZAG", "LD", "LE"], 8, "Zagueiro"], ["MC", ["VOL", "MC", "MEI"], 7, "Meia"], ["ATA", ["PE", "PD", "ATA"], 5, "Atacante"]];
    for (const [pos, grupo, min, rotulo] of MINIMO) {
      for (let k = jogadores.filter((j) => grupo.includes(j.pos)).length; k < min; k++) {
        const notaJ = nota - 9, atr = {};
        for (const [a, d] of Object.entries(PERFIL[pos])) atr[a] = clamp(notaJ + d, 20, 95);
        jogadores.push({ id: `${id}-${jogadores.length + 1}`, nome: `${rotulo} da base ${k + 1}`, pos, nat: "Brasil", idade: 18, nota: notaJ, est: true, base: true, atr, valor: 2e5, salario: 2000, contrato: null });
      }
    }
    return { id, nome, curto, cidade, cores, estadio, tamanho, formacao, caixa: tamanho * 1.5e7, escudo, jogadores };
  });
  const hoje = new Date().toISOString().slice(0, 10);
  const cabecalho = `// Carreira de Treinador: a base do Brasileirão Série A 2026 (gerada por ferramentas/base-brasileirao.js em ${hoje}).
// Os elencos (nomes, posições e nacionalidades) vêm da Wikipédia em inglês, como estavam nesse dia. As NOTAS e os
// atributos são estimativas (est: true): as dos jogadores conhecidos estão na tabela da ferramenta; os outros (reserva:
// true) recebem a nota-base do clube. Idade e contrato ainda não têm fonte (null). Os escudos são desenhos nossos em
// pixel-art, parecidos com os de verdade mas sem copiar (ver escudos.js). Para corrigir, mude a ferramenta e rode de novo.
`;
  const corpo = `(function (root, factory) {
  const base = factory();
  if (typeof module === "object" && module.exports) module.exports = base;
  else { root.BasesCarreira = root.BasesCarreira || {}; root.BasesCarreira[base.id] = base; }
})(typeof self !== "undefined" ? self : this, function () {
  return (${JSON.stringify({ id: "brasileirao-2026", nome: "Brasileirão Série A", ano: 2026, fonte: `Wikipédia (en), ${hoje}`, clubes })
    .replace(/\{"id":"(?=[a-z]+-\d+","nome":"[^"]*","pos")/g, "\n    {\"id\":\"").replace(/,"clubes":\[/, ",\n  \"clubes\": [").replace(/\{"id":"(?=[a-z]+","nome")/g, "\n  {\"id\":\"")});
});
`;
  const destino = path.join(__dirname, "..", "public", "carreira", "base", "brasileirao-2026.js");
  fs.writeFileSync(destino, cabecalho + corpo);
  for (const c of clubes) console.log(c.nome.padEnd(14), String(c.jogadores.length).padStart(2), "jogadores, conhecidos:", c.jogadores.filter((j) => !j.reserva).length);
  console.log("gravado em", destino, Math.round(fs.statSync(destino).size / 1024) + " KB");
})().catch((e) => { console.error(e); process.exit(1); });
