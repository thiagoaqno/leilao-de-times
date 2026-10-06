// Temas prontos. Cada tema define os nomes usados no site, quantos itens de cada
// categoria vão em cada "time" (slots), o que é obrigatório ter (req) e a lista de itens por categoria.
// Para adicionar um tema novo, copie um bloco e edite.
window.PRESETS = [
  {
    id: "futsal-lendas", icon: "⚽", label: "Futsal – lendas",
    terms: { item: "jogador", items: "jogadores", team: "time", teams: "times", prefix: "Time" },
    prompt: "futsal",
    slots: { "Goleiro": 1, "Defensor": 1, "Meio-campo": 1, "Atacante": 2 },
    req: { "Goleiro": 1 },
    pool: "lendas",
  },
  {
    id: "futsal-atuais", icon: "⚽", label: "Futsal – atuais",
    terms: { item: "jogador", items: "jogadores", team: "time", teams: "times", prefix: "Time" },
    prompt: "futsal",
    slots: { "Goleiro": 1, "Defensor": 1, "Meio-campo": 1, "Atacante": 2 },
    req: { "Goleiro": 1 },
    pool: "atuais",
  },
  {
    id: "futebol-lendas", icon: "🏟️", label: "Futebol 11x11 – lendas",
    terms: { item: "jogador", items: "jogadores", team: "time", teams: "times", prefix: "Time" },
    prompt: "futebol",
    slots: { "Goleiro": 1, "Defensor": 4, "Meio-campo": 3, "Atacante": 3 },
    req: { "Goleiro": 1 },
    pool: "lendas",
  },
  {
    id: "futebol-atuais", icon: "🏟️", label: "Futebol 11x11 – atuais",
    terms: { item: "jogador", items: "jogadores", team: "time", teams: "times", prefix: "Time" },
    prompt: "futebol",
    slots: { "Goleiro": 1, "Defensor": 4, "Meio-campo": 3, "Atacante": 3 },
    req: { "Goleiro": 1 },
    pool: "atuais",
  },
  {
    id: "cs", icon: "🔫", label: "Counter-Strike – all time",
    terms: { item: "jogador", items: "jogadores", team: "time", teams: "times", prefix: "Time" },
    prompt: "cs",
    slots: { "IGL": 1, "AWPer": 1, "Rifler": 3 },
    req: { "IGL": 1, "AWPer": 1 },
    items: {
      "IGL": ["karrigan", "gla1ve", "FalleN", "apEX", "Zeus", "TaZ", "Xizt", "Aleksib", "cadiaN", "MSL", "NEO", "Snax", "Boombl4"],
      "AWPer": ["s1mple", "ZywOo", "device", "kennyS", "GuardiaN", "m0NESY", "sh1ro", "JW", "markeloff", "broky", "oskar", "woxic", "Jame", "SunPayus"],
      "Rifler": ["NiKo", "coldzera", "f0rest", "GeT_RiGhT", "olofmeister", "donk", "ropz", "Twistzz", "electroNic", "fer", "dupreeh", "Xyp9x", "Magisk", "KRIMZ", "flusha", "NAF", "EliGE", "rain", "Stewie2K", "jks", "shox", "pashaBiceps", "Edward", "HeatoN", "SpawN", "Xantares", "KSCERATO", "huNter-", "frozen", "b1t", "Ax1Le", "Perfecto", "Spinx", "jL"],
    },
  },
  {
    id: "valorant", icon: "🎯", label: "Valorant – all time",
    terms: { item: "jogador", items: "jogadores", team: "time", teams: "times", prefix: "Time" },
    prompt: "valorant",
    slots: { "Duelista": 1, "Iniciador": 1, "Controlador": 1, "Sentinela": 1, "Flex": 1 },
    req: { "Controlador": 1, "Sentinela": 1 },
    items: {
      "Duelista": ["TenZ", "aspas", "Derke", "Demon1", "Something", "Jinggg", "cNed", "ScreaM", "BuZz", "t3xture", "Cryocells"],
      "Iniciador": ["Leo", "Sacy", "crashies", "Ethan", "ShahZaM", "Chronicle", "Saadhak", "stax", "d4v41", "Boo"],
      "Controlador": ["Boaster", "FNS", "Tuyz", "Marved", "MaKo", "Mindfreak", "Mistic", "benjyfishy", "Redgar", "Laz"],
      "Sentinela": ["yay", "Less", "Alfajer", "nAts", "Suygetsu", "Jamppi", "Meteor"],
      "Flex": ["f0rsakeN", "dgzin", "zekken", "Victor", "Asuna", "Sayf", "Zellsis", "Munchkin", "Shao"],
    },
  },
  {
    id: "hamburguer", icon: "🍔", label: "Hambúrguer",
    terms: { item: "ingrediente", items: "ingredientes", team: "hambúrguer", teams: "hambúrgueres", prefix: "Hambúrguer de" },
    prompt: "food",
    slots: { "Pão": 1, "Carne": 1, "Queijo": 1, "Molho": 1, "Extra": 1, "Vegetal": 1 },
    req: { "Pão": 1, "Carne": 1 },
    items: {
      "Pão": ["Pão brioche", "Pão australiano", "Pão de batata", "Pão com gergelim", "Pão de fermentação natural", "Pão ciabatta", "Pão preto", "Pão de queijo gigante"],
      "Carne": ["Blend de costela", "Smash de acém", "Frango empanado crocante", "Burger de picanha", "Burger de cordeiro", "Burger de grão-de-bico", "Pulled pork", "Burger de wagyu"],
      "Queijo": ["Cheddar cremoso", "Queijo prato", "Provolone derretido", "Gorgonzola", "Brie", "Mussarela de búfala", "Catupiry", "Queijo coalho grelhado"],
      "Molho": ["Maionese de alho", "Barbecue defumado", "Molho especial da casa", "Maionese de bacon", "Mostarda e mel", "Ketchup de goiabada", "Molho chipotle", "Aioli de ervas"],
      "Extra": ["Bacon crocante", "Ovo com gema mole", "Onion rings", "Cogumelos salteados", "Batata palha", "Geleia de pimenta", "Abacaxi grelhado", "Jalapeño"],
      "Vegetal": ["Cebola caramelizada", "Picles", "Alface americana", "Tomate", "Rúcula", "Cebola roxa", "Pimentão assado", "Coleslaw de repolho roxo"],
    },
  },
  {
    id: "pizza", icon: "🍕", label: "Pizza",
    terms: { item: "ingrediente", items: "ingredientes", team: "pizza", teams: "pizzas", prefix: "Pizza de" },
    prompt: "food",
    slots: { "Massa": 1, "Molho": 1, "Queijo": 1, "Proteína": 1, "Vegetal": 1, "Finalização": 1 },
    req: { "Massa": 1, "Molho": 1, "Queijo": 1 },
    items: {
      "Massa": ["Massa napolitana", "Massa fina crocante", "Massa de fermentação natural", "Borda recheada de catupiry", "Massa integral", "Massa estilo Detroit", "Borda de cheddar", "Massa com semolina"],
      "Molho": ["Molho de tomate San Marzano", "Molho branco", "Pesto de manjericão", "Molho barbecue", "Azeite com alho", "Molho de tomate apimentado", "Creme de abóbora", "Molho de tomate com ervas"],
      "Queijo": ["Mussarela", "Mussarela de búfala", "Catupiry", "Gorgonzola", "Parmesão", "Provolone", "Burrata", "Cheddar"],
      "Proteína": ["Calabresa", "Pepperoni", "Frango desfiado", "Presunto parma", "Bacon", "Carne seca", "Atum", "Linguiça toscana"],
      "Vegetal": ["Cebola", "Tomate cereja", "Rúcula", "Champignon", "Palmito", "Azeitona preta", "Milho", "Pimentão"],
      "Finalização": ["Manjericão fresco", "Mel com pimenta", "Orégano", "Azeite trufado", "Parmesão ralado", "Pimenta calabresa", "Alho frito", "Raspas de limão"],
    },
  },
  {
    id: "drink", icon: "🍹", label: "Drink",
    terms: { item: "ingrediente", items: "ingredientes", team: "drink", teams: "drinks", prefix: "Drink de" },
    prompt: "food",
    slots: { "Destilado": 1, "Modificador": 1, "Cítrico/Fruta": 1, "Adoçante": 1, "Toque final": 1 },
    req: { "Destilado": 1 },
    items: {
      "Destilado": ["Cachaça", "Vodka", "Gin", "Rum", "Tequila", "Whisky", "Pisco", "Mezcal"],
      "Modificador": ["Vermute", "Campari", "Aperol", "Licor de laranja", "Licor de café", "Licor 43", "Espumante", "Saquê"],
      "Cítrico/Fruta": ["Limão", "Maracujá", "Abacaxi", "Laranja", "Limão-siciliano", "Toranja", "Morango", "Melancia"],
      "Adoçante": ["Xarope simples", "Mel", "Açúcar mascavo", "Xarope de gengibre", "Xarope de canela", "Xarope de baunilha", "Leite condensado", "Xarope de hibisco"],
      "Toque final": ["Hortelã", "Bitter angostura", "Água tônica", "Club soda", "Borda de sal", "Pimenta dedo-de-moça", "Ramo de alecrim", "Casca de laranja flambada"],
    },
  },
  {
    id: "sobremesa", icon: "🍨", label: "Sobremesa",
    terms: { item: "ingrediente", items: "ingredientes", team: "sobremesa", teams: "sobremesas", prefix: "Sobremesa de" },
    prompt: "food",
    slots: { "Base": 1, "Calda": 1, "Crocante": 1, "Fruta": 1, "Toque": 1 },
    req: { "Base": 1 },
    items: {
      "Base": ["Sorvete de creme", "Sorvete de chocolate", "Brownie", "Gelato de pistache", "Cheesecake", "Petit gâteau", "Sorvete de doce de leite", "Pudim"],
      "Calda": ["Ganache de chocolate", "Caramelo salgado", "Doce de leite", "Calda de frutas vermelhas", "Creme de avelã", "Calda de goiabada", "Creme de pistache", "Chocolate branco derretido"],
      "Crocante": ["Paçoca", "Farofa de castanha", "Granola", "Biscoito de chocolate", "Amendoim caramelizado", "Suspiro", "Crumble de manteiga", "Cookies"],
      "Fruta": ["Morango", "Banana caramelizada", "Frutas vermelhas", "Manga", "Maracujá", "Abacaxi grelhado", "Cereja", "Kiwi"],
      "Toque": ["Chantilly", "Flor de sal", "Marshmallow maçaricado", "Raspas de limão", "Hortelã", "Leite em pó", "Canela", "Granulado belga"],
    },
  },
  {
    id: "custom", icon: "✏️", label: "Personalizado",
    terms: { item: "item", items: "itens", team: "time", teams: "times", prefix: "Time" },
    prompt: "generic",
    slots: null,
    items: null,
  },
];

// Listas de jogadores de futebol por posição (usadas pelos temas de futsal e 11x11)
window.FOOTBALL = {
  lendas: {
    "Goleiro": ["Lev Yashin", "Gianluigi Buffon", "Manuel Neuer", "Iker Casillas", "Peter Schmeichel", "Gordon Banks", "Dino Zoff", "Oliver Kahn", "Sepp Maier", "Edwin van der Sar", "Taffarel", "Petr Čech", "Marcos", "Gylmar", "Rogério Ceni", "Dida", "Júlio César", "Fabien Barthez", "Andoni Zubizarreta", "Ubaldo Fillol", "Thomas Ravelli", "René Higuita", "Jorge Campos", "Ricardo Zamora", "Walter Zenga", "Jean-Marie Pfaff", "Pat Jennings", "Peter Shilton", "Ray Clemence", "Víctor Valdés", "Francesco Toldo", "Angelo Peruzzi", "Jens Lehmann", "Gianluca Pagliuca", "José Luis Chilavert", "Rinat Dasayev", "Ladislao Mazurkiewicz", "Emerson Leão", "Valdir Peres", "Bodo Illgner"],
    "Defensor": ["Franz Beckenbauer", "Paolo Maldini", "Franco Baresi", "Cafu", "Roberto Carlos", "Bobby Moore", "Fabio Cannavaro", "Carlos Alberto Torres", "Nílton Santos", "Philipp Lahm", "Sergio Ramos", "Alessandro Nesta", "Marcelo", "Daniel Passarella", "Lilian Thuram", "Ronald Koeman", "Giacinto Facchetti", "Rio Ferdinand", "Carles Puyol", "Virgil van Dijk", "Paul Breitner", "Andreas Brehme", "Dani Alves", "Lúcio", "Aldair", "Gaetano Scirea", "John Terry", "Jaap Stam", "Thiago Silva", "Matthias Sammer", "Javier Zanetti", "Gary Neville", "Ashley Cole", "Jamie Carragher", "Nemanja Vidić", "Gerard Piqué", "Giorgio Chiellini", "Leonardo Bonucci", "Mats Hummels", "Jérôme Boateng", "Laurent Blanc", "Marcel Desailly", "Bixente Lizarazu", "Júnior", "Branco", "Djalma Santos", "Bellini", "Mauro Ramos", "Ruud Krol", "Berti Vogts", "Hans-Peter Briegel", "Jürgen Kohler", "Guido Buchwald", "Claudio Gentile", "Giuseppe Bergomi", "Ciro Ferrara", "Alessandro Costacurta", "Gianluca Zambrotta", "Marco Materazzi", "Fernando Hierro", "Míchel Salgado", "Joan Capdevila", "Raphaël Varane", "Diego Godín", "Elías Figueroa", "Roberto Ayala", "Walter Samuel", "Oscar Ruggeri", "Alberto Tarantini", "Sol Campbell", "Tony Adams", "Stuart Pearce", "Patrice Evra", "Frank de Boer", "Danny Blind", "Pablo Zabaleta", "Ricardo Carvalho", "Pepe", "Fernando Couto", "Vincent Kompany", "Carlos Gamarra", "Manuel Amoros", "Marius Trésor", "Kakha Kaladze", "Roque Júnior", "Edmílson", "Juan", "Maicon"],
    "Meio-campo": ["Zinedine Zidane", "Johan Cruyff", "Michel Platini", "Xavi", "Andrés Iniesta", "Zico", "Lothar Matthäus", "Andrea Pirlo", "Luka Modrić", "Kaká", "Bobby Charlton", "Sócrates", "Falcão", "Didi", "Gérson", "Rivaldo", "Steven Gerrard", "Frank Lampard", "Clarence Seedorf", "Luís Figo", "Juan Román Riquelme", "Kevin De Bruyne", "Paul Scholes", "Toni Kroos", "Frank Rijkaard", "Roy Keane", "Patrick Vieira", "Gheorghe Hagi", "Michael Laudrup", "Pavel Nedvěd", "Rui Costa", "Deco", "Juninho Pernambucano", "Mauro Silva", "Dunga", "Zé Roberto", "Gilberto Silva", "Emerson", "Toninho Cerezo", "Ademir da Guia", "Clodoaldo", "Raí", "Alex", "Diego Simeone", "Fernando Redondo", "Javier Mascherano", "Juan Sebastián Verón", "Michael Ballack", "Bastian Schweinsteiger", "Günter Netzer", "Wolfgang Overath", "Mesut Özil", "Claude Makélélé", "Didier Deschamps", "Jean Tigana", "Alain Giresse", "Robert Pirès", "Daniele De Rossi", "Gennaro Gattuso", "Gianni Rivera", "Giancarlo Antognoni", "Roberto Donadoni", "Demetrio Albertini", "Xabi Alonso", "Sergio Busquets", "David Silva", "Cesc Fàbregas", "Luis Suárez Miramontes", "Pep Guardiola", "Johan Neeskens", "Wesley Sneijder", "Edgar Davids", "Ruud Gullit", "Paul Gascoigne", "David Beckham", "Bryan Robson", "Glenn Hoddle", "Dragan Stojković", "Dejan Savićević", "Zbigniew Boniek", "Kazimierz Deyna", "Enzo Scifo", "Jari Litmanen", "Carlos Valderrama", "Teófilo Cubillas", "Hidetoshi Nakata", "Park Ji-sung", "Yaya Touré", "Michael Essien", "Jay-Jay Okocha", "Stefan Effenberg", "Paulo Sousa"],
    "Atacante": ["Pelé", "Diego Maradona", "Lionel Messi", "Cristiano Ronaldo", "Ronaldo Fenômeno", "Ronaldinho Gaúcho", "Garrincha", "Alfredo Di Stéfano", "Ferenc Puskás", "Eusébio", "Marco van Basten", "Gerd Müller", "Romário", "Thierry Henry", "George Best", "Zlatan Ibrahimović", "Karim Benzema", "Robert Lewandowski", "Roberto Baggio", "Gabriel Batistuta", "Samuel Eto'o", "Didier Drogba", "Raúl", "Kenny Dalglish", "Jairzinho", "Tostão", "Rivellino", "Hristo Stoichkov", "George Weah", "Andriy Shevchenko", "Luis Suárez", "Neymar", "Francesco Totti", "Alessandro Del Piero", "Paolo Rossi", "Christian Vieri", "Filippo Inzaghi", "Giuseppe Meazza", "Silvio Piola", "Luigi Riva", "Dennis Bergkamp", "Ruud van Nistelrooy", "Robin van Persie", "Arjen Robben", "Patrick Kluivert", "Rob Rensenbrink", "Karl-Heinz Rummenigge", "Jürgen Klinsmann", "Rudi Völler", "Miroslav Klose", "Uwe Seeler", "Just Fontaine", "Raymond Kopa", "Jean-Pierre Papin", "Éric Cantona", "David Trezeguet", "Franck Ribéry", "Michael Owen", "Alan Shearer", "Gary Lineker", "Wayne Rooney", "Jimmy Greaves", "Kevin Keegan", "Fernando Torres", "David Villa", "Emilio Butragueño", "Hugo Sánchez", "Hernán Crespo", "Mario Kempes", "Sergio Agüero", "Carlos Tevez", "Claudio Caniggia", "Ángel Di María", "Enzo Francescoli", "Diego Forlán", "Edinson Cavani", "Bebeto", "Careca", "Adriano", "Ademir de Menezes", "Leônidas da Silva", "Arthur Friedenreich", "Reinaldo", "Roberto Dinamite", "Luís Fabiano", "Edmundo", "Fred", "Dimitar Berbatov", "Henrik Larsson", "Davor Šuker", "Abedi Pelé", "Roger Milla", "Nwankwo Kanu", "Brian Laudrup", "Oleg Blokhin", "Ian Rush", "Ryan Giggs", "Gareth Bale"],
  },
  atuais: {
    "Goleiro": ["Alisson", "Thibaut Courtois", "Gianluigi Donnarumma", "Ederson", "Mike Maignan", "Jan Oblak", "Marc-André ter Stegen", "Emiliano Martínez", "Yassine Bounou", "David Raya", "Unai Simón", "Diogo Costa", "Gregor Kobel", "Joan García", "André Onana", "Bart Verbruggen", "Guglielmo Vicario", "Robert Sánchez", "Jordan Pickford", "Aaron Ramsdale", "Dean Henderson", "Lucas Chevalier", "Brice Samba", "Kepa Arrizabalaga", "Matvei Safonov", "Wojciech Szczęsny", "Yann Sommer", "Alex Meret", "Mile Svilar", "Bento", "Hugo Souza", "Weverton", "Agustín Rossi", "Gerónimo Rulli", "Giorgi Mamardashvili", "Zion Suzuki", "Anatoliy Trubin", "Andriy Lunin", "Filip Jørgensen"],
    "Defensor": ["Virgil van Dijk", "Rúben Dias", "William Saliba", "Marquinhos", "Antonio Rüdiger", "Achraf Hakimi", "Theo Hernández", "Alessandro Bastoni", "Trent Alexander-Arnold", "Nuno Mendes", "Gabriel Magalhães", "Joško Gvardiol", "Jules Koundé", "Alphonso Davies", "Dayot Upamecano", "Éder Militão", "Pau Cubarsí", "Dean Huijsen", "Micky van de Ven", "Federico Dimarco", "Alejandro Grimaldo", "Jeremie Frimpong", "Ibrahima Konaté", "Cristian Romero", "Lisandro Martínez", "Ronald Araújo", "Willian Pacho", "Riccardo Calafiori", "Kim Min-jae", "Jurriën Timber", "Reece James", "Kyle Walker", "John Stones", "Marc Guéhi", "Levi Colwill", "Ezri Konsa", "Myles Lewis-Skelly", "Ben White", "Benjamin Pavard", "Lucas Hernández", "Castello Lukeba", "Malo Gusto", "Lucas Digne", "Wesley Fofana", "Leny Yoro", "Dani Carvajal", "Robin Le Normand", "Aymeric Laporte", "Marc Cucurella", "Pedro Porro", "Dani Vivian", "Alejandro Balde", "Kalidou Koulibaly", "Matthijs de Ligt", "Nathan Aké", "Denzel Dumfries", "Jorrel Hato", "Stefan de Vrij", "Andrew Robertson", "Kieran Trippier", "Gonçalo Inácio", "António Silva", "Diogo Dalot", "João Cancelo", "Danilo", "Alex Sandro", "Bremer", "Lucas Beraldo", "Wesley", "Vanderson", "Gustavo Gómez", "Nahuel Molina", "Nicolás Otamendi", "Marcos Acuña", "Leonardo Balerdi", "José María Giménez", "Mathías Olivera", "Giovanni Di Lorenzo", "Andrea Cambiaso", "Destiny Udogie", "Takehiro Tomiyasu", "Piero Hincapié", "Pervis Estupiñán", "Josip Stanišić", "Maximilian Mittelstädt", "David Raum", "Waldemar Anton", "Nico Schlotterbeck", "Jonathan Tah", "Manuel Akanji", "Ousmane Diomande", "Noussair Mazraoui", "Evan Ndicka", "Edmond Tapsoba", "Murillo"],
    "Meio-campo": ["Rodri", "Jude Bellingham", "Pedri", "Kevin De Bruyne", "Martin Ødegaard", "Declan Rice", "Federico Valverde", "Vitinha", "Florian Wirtz", "Jamal Musiala", "Bruno Fernandes", "Joshua Kimmich", "Frenkie de Jong", "Bruno Guimarães", "Alexis Mac Allister", "Nicolò Barella", "João Neves", "Cole Palmer", "Dani Olmo", "Aurélien Tchouaméni", "Enzo Fernández", "Moisés Caicedo", "Ryan Gravenberch", "Gavi", "Arda Güler", "Hakan Çalhanoğlu", "Warren Zaïre-Emery", "Kobbie Mainoo", "Morgan Gibbs-White", "Eberechi Eze", "Conor Gallagher", "Adam Wharton", "Elliot Anderson", "Mason Mount", "Martín Zubimendi", "Mikel Merino", "Fabián Ruiz", "Fermín López", "Álex Baena", "Marc Casadó", "Eduardo Camavinga", "Adrien Rabiot", "Manu Koné", "Khéphren Thuram", "Rayan Cherki", "N'Golo Kanté", "Youssouf Fofana", "Leon Goretzka", "Aleksandar Pavlović", "Angelo Stiller", "Felix Nmecha", "İlkay Gündoğan", "Xavi Simons", "Tijjani Reijnders", "Teun Koopmeiners", "Joey Veerman", "Bernardo Silva", "João Palhinha", "Rúben Neves", "Sandro Tonali", "Davide Frattesi", "Manuel Locatelli", "Scott McTominay", "Stanislav Lobotka", "Piotr Zieliński", "Lucas Paquetá", "João Gomes", "André", "Andreas Pereira", "Casemiro", "Rodrigo De Paul", "Leandro Paredes", "Exequiel Palacios", "Giovani Lo Celso", "Manuel Ugarte", "Rodrigo Bentancur", "Granit Xhaka", "Mateo Kovačić", "Lucas Bergvall", "Wataru Endo", "Ismaël Bennacer", "Amadou Onana", "Youri Tielemans"],
    "Atacante": ["Kylian Mbappé", "Erling Haaland", "Vinícius Júnior", "Lamine Yamal", "Mohamed Salah", "Harry Kane", "Ousmane Dembélé", "Raphinha", "Lautaro Martínez", "Bukayo Saka", "Rodrygo", "Khvicha Kvaratskhelia", "Robert Lewandowski", "Victor Osimhen", "Julián Álvarez", "Alexander Isak", "Viktor Gyökeres", "Rafael Leão", "Son Heung-min", "Phil Foden", "Michael Olise", "Désiré Doué", "Nico Williams", "Marcus Thuram", "Serhou Guirassy", "Kenan Yıldız", "Estêvão", "Luis Díaz", "Jonathan David", "Bradley Barcola", "Hugo Ekitiké", "Antoine Griezmann", "Kingsley Coman", "Randal Kolo Muani", "Christopher Nkunku", "Bryan Mbeumo", "Ollie Watkins", "Jarrod Bowen", "Anthony Gordon", "Marcus Rashford", "Noni Madueke", "Morgan Rogers", "Jack Grealish", "Dominic Solanke", "Gabriel Martinelli", "Gabriel Jesus", "Endrick", "João Pedro", "Matheus Cunha", "Savinho", "Igor Thiago", "Pedro", "Hulk", "Giorgian de Arrascaeta", "Darwin Núñez", "Federico Chiesa", "Mateo Retegui", "Moise Kean", "Paulo Dybala", "Alejandro Garnacho", "Nicolás González", "Thiago Almada", "Franco Mastantuono", "Mikel Oyarzabal", "Ferran Torres", "Álvaro Morata", "Yeremy Pino", "Samu Aghehowa", "Leroy Sané", "Serge Gnabry", "Kai Havertz", "Nick Woltemade", "Karim Adeyemi", "Cody Gakpo", "Memphis Depay", "Donyell Malen", "João Félix", "Pedro Neto", "Gonçalo Ramos", "Francisco Conceição", "Romelu Lukaku", "Jérémy Doku", "Leandro Trossard", "Takefusa Kubo", "Kaoru Mitoma", "Benjamin Šeško", "Dušan Vlahović", "Ademola Lookman", "Mohammed Kudus", "Antoine Semenyo", "Brahim Díaz", "Christian Pulisic", "Rasmus Højlund"],
  },
};
