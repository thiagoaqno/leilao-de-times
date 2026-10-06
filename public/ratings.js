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

  // ----- Mais lendas (estimativas) -----
  // Goleiros
  "Dida": [86, "est"], "Júlio César": [87, "est"], "Fabien Barthez": [86, "est"], "Andoni Zubizarreta": [86, "est"], "Ubaldo Fillol": [86, "est"],
  "Thomas Ravelli": [84, "est"], "René Higuita": [84, "est"], "Jorge Campos": [84, "est"], "Ricardo Zamora": [88, "est"], "Walter Zenga": [86, "est"],
  "Jean-Marie Pfaff": [85, "est"], "Pat Jennings": [85, "est"], "Peter Shilton": [86, "est"], "Ray Clemence": [85, "est"], "Víctor Valdés": [85, "est"],
  "Francesco Toldo": [85, "est"], "Angelo Peruzzi": [85, "est"], "Jens Lehmann": [85, "est"], "Gianluca Pagliuca": [85, "est"], "José Luis Chilavert": [85, "est"],
  "Rinat Dasayev": [86, "est"], "Ladislao Mazurkiewicz": [85, "est"], "Emerson Leão": [86, "est"], "Valdir Peres": [83, "est"], "Bodo Illgner": [84, "est"],
  // Defensores
  "Javier Zanetti": [89, "est"], "Gary Neville": [84, "est"], "Ashley Cole": [86, "est"], "Jamie Carragher": [85, "est"], "Nemanja Vidić": [87, "est"],
  "Gerard Piqué": [87, "est"], "Giorgio Chiellini": [87, "est"], "Leonardo Bonucci": [86, "est"], "Mats Hummels": [86, "est"], "Jérôme Boateng": [85, "est"],
  "Laurent Blanc": [87, "est"], "Marcel Desailly": [88, "est"], "Bixente Lizarazu": [86, "est"], "Júnior": [87, "est"], "Branco": [85, "est"],
  "Djalma Santos": [88, "est"], "Bellini": [86, "est"], "Mauro Ramos": [85, "est"], "Ruud Krol": [88, "est"], "Berti Vogts": [86, "est"],
  "Hans-Peter Briegel": [85, "est"], "Jürgen Kohler": [86, "est"], "Guido Buchwald": [84, "est"], "Claudio Gentile": [86, "est"], "Giuseppe Bergomi": [86, "est"],
  "Ciro Ferrara": [85, "est"], "Alessandro Costacurta": [85, "est"], "Gianluca Zambrotta": [86, "est"], "Marco Materazzi": [84, "est"], "Fernando Hierro": [88, "est"],
  "Míchel Salgado": [84, "est"], "Joan Capdevila": [83, "est"], "Raphaël Varane": [86, "est"], "Diego Godín": [86, "est"], "Elías Figueroa": [88, "est"],
  "Roberto Ayala": [86, "est"], "Walter Samuel": [85, "est"], "Oscar Ruggeri": [86, "est"], "Alberto Tarantini": [84, "est"], "Sol Campbell": [85, "est"],
  "Tony Adams": [86, "est"], "Stuart Pearce": [84, "est"], "Patrice Evra": [85, "est"], "Frank de Boer": [85, "est"], "Danny Blind": [84, "est"],
  "Pablo Zabaleta": [84, "est"], "Ricardo Carvalho": [86, "est"], "Pepe": [86, "est"], "Fernando Couto": [84, "est"], "Vincent Kompany": [87, "est"],
  "Carlos Gamarra": [85, "est"], "Manuel Amoros": [85, "est"], "Marius Trésor": [85, "est"], "Kakha Kaladze": [84, "est"], "Roque Júnior": [83, "est"],
  "Edmílson": [84, "est"], "Juan": [84, "est"], "Maicon": [86, "est"],
  // Meio-campo
  "Pavel Nedvěd": [90, "est"], "Rui Costa": [88, "est"], "Deco": [87, "est"], "Juninho Pernambucano": [87, "est"], "Mauro Silva": [86, "est"],
  "Dunga": [86, "est"], "Zé Roberto": [86, "est"], "Gilberto Silva": [85, "est"], "Emerson": [85, "est"], "Toninho Cerezo": [86, "est"],
  "Ademir da Guia": [87, "est"], "Clodoaldo": [85, "est"], "Raí": [87, "est"], "Alex": [86, "est"], "Diego Simeone": [85, "est"],
  "Fernando Redondo": [88, "est"], "Javier Mascherano": [86, "est"], "Juan Sebastián Verón": [87, "est"], "Michael Ballack": [88, "est"], "Bastian Schweinsteiger": [88, "est"],
  "Günter Netzer": [88, "est"], "Wolfgang Overath": [87, "est"], "Mesut Özil": [87, "est"], "Claude Makélélé": [87, "est"], "Didier Deschamps": [86, "est"],
  "Jean Tigana": [86, "est"], "Alain Giresse": [86, "est"], "Robert Pirès": [86, "est"], "Daniele De Rossi": [86, "est"], "Gennaro Gattuso": [86, "est"],
  "Gianni Rivera": [90, "est"], "Giancarlo Antognoni": [86, "est"], "Roberto Donadoni": [85, "est"], "Demetrio Albertini": [85, "est"], "Xabi Alonso": [88, "est"],
  "Sergio Busquets": [88, "est"], "David Silva": [88, "est"], "Cesc Fàbregas": [87, "est"], "Luis Suárez Miramontes": [88, "est"], "Pep Guardiola": [86, "est"],
  "Johan Neeskens": [89, "est"], "Wesley Sneijder": [87, "est"], "Edgar Davids": [86, "est"], "Ruud Gullit": [90, "est"], "Paul Gascoigne": [87, "est"],
  "David Beckham": [88, "est"], "Bryan Robson": [86, "est"], "Glenn Hoddle": [85, "est"], "Dragan Stojković": [87, "est"], "Dejan Savićević": [87, "est"],
  "Zbigniew Boniek": [87, "est"], "Kazimierz Deyna": [86, "est"], "Enzo Scifo": [86, "est"], "Jari Litmanen": [86, "est"], "Carlos Valderrama": [87, "est"],
  "Teófilo Cubillas": [87, "est"], "Hidetoshi Nakata": [85, "est"], "Park Ji-sung": [84, "est"], "Yaya Touré": [87, "est"], "Michael Essien": [85, "est"],
  "Jay-Jay Okocha": [86, "est"], "Stefan Effenberg": [86, "est"], "Paulo Sousa": [85, "est"],
  // Atacantes
  "Francesco Totti": [90, "est"], "Alessandro Del Piero": [90, "est"], "Paolo Rossi": [88, "est"], "Christian Vieri": [87, "est"], "Filippo Inzaghi": [86, "est"],
  "Giuseppe Meazza": [89, "est"], "Silvio Piola": [88, "est"], "Luigi Riva": [88, "est"], "Dennis Bergkamp": [90, "est"], "Ruud van Nistelrooy": [88, "est"],
  "Robin van Persie": [87, "est"], "Arjen Robben": [89, "est"], "Patrick Kluivert": [87, "est"], "Rob Rensenbrink": [87, "est"], "Karl-Heinz Rummenigge": [89, "est"],
  "Jürgen Klinsmann": [88, "est"], "Rudi Völler": [87, "est"], "Miroslav Klose": [88, "est"], "Uwe Seeler": [88, "est"], "Just Fontaine": [88, "est"],
  "Raymond Kopa": [89, "est"], "Jean-Pierre Papin": [88, "est"], "Éric Cantona": [89, "est"], "David Trezeguet": [87, "est"], "Franck Ribéry": [88, "est"],
  "Michael Owen": [88, "est"], "Alan Shearer": [89, "est"], "Gary Lineker": [88, "est"], "Wayne Rooney": [89, "est"], "Jimmy Greaves": [88, "est"],
  "Kevin Keegan": [88, "est"], "Fernando Torres": [87, "est"], "David Villa": [88, "est"], "Emilio Butragueño": [87, "est"], "Hugo Sánchez": [88, "est"],
  "Hernán Crespo": [87, "est"], "Mario Kempes": [88, "est"], "Sergio Agüero": [88, "est"], "Carlos Tevez": [86, "est"], "Claudio Caniggia": [86, "est"],
  "Ángel Di María": [86, "est"], "Enzo Francescoli": [88, "est"], "Diego Forlán": [87, "est"], "Edinson Cavani": [86, "est"], "Bebeto": [88, "est"],
  "Careca": [87, "est"], "Adriano": [87, "est"], "Ademir de Menezes": [87, "est"], "Leônidas da Silva": [88, "est"], "Arthur Friedenreich": [87, "est"],
  "Reinaldo": [86, "est"], "Roberto Dinamite": [87, "est"], "Luís Fabiano": [85, "est"], "Edmundo": [86, "est"], "Fred": [84, "est"],
  "Dimitar Berbatov": [86, "est"], "Henrik Larsson": [87, "est"], "Davor Šuker": [87, "est"], "Abedi Pelé": [85, "est"], "Roger Milla": [85, "est"],
  "Nwankwo Kanu": [85, "est"], "Brian Laudrup": [86, "est"], "Oleg Blokhin": [87, "est"], "Ian Rush": [87, "est"], "Ryan Giggs": [87, "est"],
  "Gareth Bale": [88, "est"],

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
  // ----- Mais atuais (estimativas) -----
  // Goleiros
  "André Onana": [82, "est"], "Bart Verbruggen": [81, "est"], "Guglielmo Vicario": [84, "est"], "Robert Sánchez": [81, "est"], "Jordan Pickford": [83, "est"],
  "Aaron Ramsdale": [80, "est"], "Dean Henderson": [81, "est"], "Lucas Chevalier": [83, "est"], "Brice Samba": [82, "est"], "Kepa Arrizabalaga": [80, "est"],
  "Matvei Safonov": [80, "est"], "Wojciech Szczęsny": [83, "est"], "Yann Sommer": [84, "est"], "Alex Meret": [82, "est"], "Mile Svilar": [84, "est"],
  "Bento": [80, "est"], "Hugo Souza": [78, "est"], "Weverton": [80, "est"], "Agustín Rossi": [80, "est"], "Gerónimo Rulli": [82, "est"],
  "Giorgi Mamardashvili": [83, "est"], "Zion Suzuki": [79, "est"], "Anatoliy Trubin": [81, "est"], "Andriy Lunin": [80, "est"], "Filip Jørgensen": [78, "est"],
  // Defensores
  "Reece James": [84, "est"], "Kyle Walker": [83, "est"], "John Stones": [84, "est"], "Marc Guéhi": [84, "est"], "Levi Colwill": [83, "est"],
  "Ezri Konsa": [82, "est"], "Myles Lewis-Skelly": [80, "est"], "Ben White": [82, "est"], "Benjamin Pavard": [83, "est"], "Lucas Hernández": [82, "est"],
  "Castello Lukeba": [82, "est"], "Malo Gusto": [81, "est"], "Lucas Digne": [80, "est"], "Wesley Fofana": [80, "est"], "Leny Yoro": [80, "est"],
  "Dani Carvajal": [85, "est"], "Robin Le Normand": [82, "est"], "Aymeric Laporte": [83, "est"], "Marc Cucurella": [83, "est"], "Pedro Porro": [84, "est"],
  "Dani Vivian": [82, "est"], "Alejandro Balde": [82, "est"], "Kalidou Koulibaly": [82, "est"], "Matthijs de Ligt": [83, "est"], "Nathan Aké": [82, "est"],
  "Denzel Dumfries": [83, "est"], "Jorrel Hato": [80, "est"], "Stefan de Vrij": [82, "est"], "Andrew Robertson": [83, "est"], "Kieran Trippier": [81, "est"],
  "Gonçalo Inácio": [84, "est"], "António Silva": [82, "est"], "Diogo Dalot": [82, "est"], "João Cancelo": [83, "est"], "Danilo": [81, "est"],
  "Alex Sandro": [80, "est"], "Bremer": [85, "est"], "Lucas Beraldo": [80, "est"], "Wesley": [79, "est"], "Vanderson": [81, "est"],
  "Gustavo Gómez": [82, "est"], "Nahuel Molina": [82, "est"], "Nicolás Otamendi": [82, "est"], "Marcos Acuña": [80, "est"], "Leonardo Balerdi": [81, "est"],
  "José María Giménez": [83, "est"], "Mathías Olivera": [81, "est"], "Giovanni Di Lorenzo": [84, "est"], "Andrea Cambiaso": [82, "est"], "Destiny Udogie": [81, "est"],
  "Takehiro Tomiyasu": [80, "est"], "Piero Hincapié": [83, "est"], "Pervis Estupiñán": [81, "est"], "Josip Stanišić": [81, "est"], "Maximilian Mittelstädt": [81, "est"],
  "David Raum": [82, "est"], "Waldemar Anton": [81, "est"], "Manuel Akanji": [83, "est"], "Ousmane Diomande": [82, "est"], "Noussair Mazraoui": [82, "est"],
  "Evan Ndicka": [81, "est"], "Edmond Tapsoba": [81, "est"], "Murillo": [81, "est"],
  // Meio-campo
  "Kobbie Mainoo": [81, "est"], "Morgan Gibbs-White": [82, "est"], "Eberechi Eze": [83, "est"], "Conor Gallagher": [81, "est"], "Adam Wharton": [81, "est"],
  "Elliot Anderson": [82, "est"], "Mason Mount": [80, "est"], "Martín Zubimendi": [85, "est"], "Mikel Merino": [83, "est"], "Fabián Ruiz": [84, "est"],
  "Fermín López": [82, "est"], "Álex Baena": [83, "est"], "Marc Casadó": [80, "est"], "Eduardo Camavinga": [84, "est"], "Adrien Rabiot": [83, "est"],
  "Manu Koné": [83, "est"], "Khéphren Thuram": [82, "est"], "Rayan Cherki": [83, "est"], "N'Golo Kanté": [82, "est"], "Youssouf Fofana": [80, "est"],
  "Leon Goretzka": [82, "est"], "Aleksandar Pavlović": [84, "est"], "Angelo Stiller": [82, "est"], "Felix Nmecha": [80, "est"], "İlkay Gündoğan": [82, "est"],
  "Xavi Simons": [83, "est"], "Tijjani Reijnders": [84, "est"], "Teun Koopmeiners": [82, "est"], "Joey Veerman": [80, "est"], "Bernardo Silva": [86, "est"],
  "João Palhinha": [82, "est"], "Rúben Neves": [81, "est"], "Sandro Tonali": [84, "est"], "Davide Frattesi": [81, "est"], "Manuel Locatelli": [82, "est"],
  "Scott McTominay": [85, "est"], "Stanislav Lobotka": [83, "est"], "Piotr Zieliński": [82, "est"], "Lucas Paquetá": [82, "est"], "João Gomes": [81, "est"],
  "André": [80, "est"], "Andreas Pereira": [79, "est"], "Casemiro": [81, "est"], "Rodrigo De Paul": [82, "est"], "Leandro Paredes": [80, "est"],
  "Exequiel Palacios": [80, "est"], "Giovani Lo Celso": [80, "est"], "Manuel Ugarte": [81, "est"], "Rodrigo Bentancur": [81, "est"], "Granit Xhaka": [84, "est"],
  "Mateo Kovačić": [83, "est"], "Lucas Bergvall": [80, "est"], "Wataru Endo": [80, "est"], "Ismaël Bennacer": [80, "est"], "Amadou Onana": [81, "est"],
  "Youri Tielemans": [82, "est"],
  // Atacantes
  "Bradley Barcola": [84, "est"], "Hugo Ekitiké": [84, "est"], "Antoine Griezmann": [85, "est"], "Kingsley Coman": [83, "est"], "Randal Kolo Muani": [81, "est"],
  "Christopher Nkunku": [82, "est"], "Bryan Mbeumo": [84, "est"], "Ollie Watkins": [83, "est"], "Jarrod Bowen": [83, "est"], "Anthony Gordon": [82, "est"],
  "Marcus Rashford": [82, "est"], "Noni Madueke": [80, "est"], "Morgan Rogers": [83, "est"], "Jack Grealish": [81, "est"], "Dominic Solanke": [80, "est"],
  "Gabriel Martinelli": [83, "est"], "Gabriel Jesus": [81, "est"], "Endrick": [80, "est"], "João Pedro": [83, "est"], "Matheus Cunha": [83, "est"],
  "Savinho": [82, "est"], "Igor Thiago": [80, "est"], "Pedro": [80, "est"], "Hulk": [79, "est"], "Giorgian de Arrascaeta": [82, "est"],
  "Darwin Núñez": [81, "est"], "Federico Chiesa": [80, "est"], "Mateo Retegui": [82, "est"], "Moise Kean": [82, "est"], "Paulo Dybala": [83, "est"],
  "Alejandro Garnacho": [81, "est"], "Nicolás González": [80, "est"], "Thiago Almada": [81, "est"], "Franco Mastantuono": [80, "est"], "Mikel Oyarzabal": [83, "est"],
  "Ferran Torres": [82, "est"], "Álvaro Morata": [80, "est"], "Yeremy Pino": [80, "est"], "Samu Aghehowa": [80, "est"], "Leroy Sané": [82, "est"],
  "Serge Gnabry": [82, "est"], "Kai Havertz": [83, "est"], "Nick Woltemade": [81, "est"], "Karim Adeyemi": [80, "est"], "Cody Gakpo": [84, "est"],
  "Memphis Depay": [80, "est"], "Donyell Malen": [80, "est"], "João Félix": [81, "est"], "Pedro Neto": [82, "est"], "Gonçalo Ramos": [81, "est"],
  "Francisco Conceição": [80, "est"], "Romelu Lukaku": [82, "est"], "Jérémy Doku": [82, "est"], "Leandro Trossard": [81, "est"], "Takefusa Kubo": [82, "est"],
  "Kaoru Mitoma": [81, "est"], "Benjamin Šeško": [81, "est"], "Dušan Vlahović": [82, "est"], "Ademola Lookman": [83, "est"], "Mohammed Kudus": [82, "est"],
  "Antoine Semenyo": [82, "est"], "Brahim Díaz": [81, "est"], "Christian Pulisic": [84, "est"], "Rasmus Højlund": [80, "est"],
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
  // mais lendas
  "Pavel Nedvěd": "MEI", "Rui Costa": "MEI", "Deco": "MEI", "Juninho Pernambucano": "MEI", "Mauro Silva": "VOL", "Dunga": "VOL",
  "Zé Roberto": "MEI", "Gilberto Silva": "VOL", "Emerson": "VOL", "Toninho Cerezo": "VOL", "Ademir da Guia": "MEI", "Clodoaldo": "VOL",
  "Raí": "MEI", "Alex": "MEI", "Diego Simeone": "VOL", "Fernando Redondo": "VOL", "Javier Mascherano": "VOL", "Juan Sebastián Verón": "MEI",
  "Michael Ballack": "MEI", "Bastian Schweinsteiger": "VOL", "Günter Netzer": "MEI", "Wolfgang Overath": "MEI", "Mesut Özil": "MEI", "Claude Makélélé": "VOL",
  "Didier Deschamps": "VOL", "Jean Tigana": "VOL", "Alain Giresse": "MEI", "Robert Pirès": "MEI", "Daniele De Rossi": "VOL", "Gennaro Gattuso": "VOL",
  "Gianni Rivera": "MEI", "Giancarlo Antognoni": "MEI", "Roberto Donadoni": "MEI", "Demetrio Albertini": "VOL", "Xabi Alonso": "VOL", "Sergio Busquets": "VOL",
  "David Silva": "MEI", "Cesc Fàbregas": "MEI", "Luis Suárez Miramontes": "MEI", "Pep Guardiola": "VOL", "Johan Neeskens": "VOL", "Wesley Sneijder": "MEI",
  "Edgar Davids": "VOL", "Ruud Gullit": "MEI", "Paul Gascoigne": "MEI", "David Beckham": "MEI", "Bryan Robson": "VOL", "Glenn Hoddle": "MEI",
  "Dragan Stojković": "MEI", "Dejan Savićević": "MEI", "Zbigniew Boniek": "MEI", "Kazimierz Deyna": "MEI", "Enzo Scifo": "MEI", "Jari Litmanen": "MEI",
  "Carlos Valderrama": "MEI", "Teófilo Cubillas": "MEI", "Hidetoshi Nakata": "MEI", "Park Ji-sung": "VOL", "Yaya Touré": "VOL", "Michael Essien": "VOL",
  "Jay-Jay Okocha": "MEI", "Stefan Effenberg": "VOL", "Paulo Sousa": "VOL",
  // mais atuais
  "Kobbie Mainoo": "VOL", "Morgan Gibbs-White": "MEI", "Eberechi Eze": "MEI", "Conor Gallagher": "VOL", "Adam Wharton": "VOL", "Elliot Anderson": "VOL",
  "Mason Mount": "MEI", "Martín Zubimendi": "VOL", "Mikel Merino": "VOL", "Fabián Ruiz": "VOL", "Fermín López": "MEI", "Álex Baena": "MEI",
  "Marc Casadó": "VOL", "Eduardo Camavinga": "VOL", "Adrien Rabiot": "VOL", "Manu Koné": "VOL", "Khéphren Thuram": "VOL", "Rayan Cherki": "MEI",
  "N'Golo Kanté": "VOL", "Youssouf Fofana": "VOL", "Leon Goretzka": "VOL", "Aleksandar Pavlović": "VOL", "Angelo Stiller": "VOL", "Felix Nmecha": "VOL",
  "İlkay Gündoğan": "MEI", "Xavi Simons": "MEI", "Tijjani Reijnders": "MEI", "Teun Koopmeiners": "VOL", "Joey Veerman": "VOL", "Bernardo Silva": "MEI",
  "João Palhinha": "VOL", "Rúben Neves": "VOL", "Sandro Tonali": "VOL", "Davide Frattesi": "MEI", "Manuel Locatelli": "VOL", "Scott McTominay": "MEI",
  "Stanislav Lobotka": "VOL", "Piotr Zieliński": "MEI", "Lucas Paquetá": "MEI", "João Gomes": "VOL", "André": "VOL", "Andreas Pereira": "MEI",
  "Casemiro": "VOL", "Rodrigo De Paul": "VOL", "Leandro Paredes": "VOL", "Exequiel Palacios": "VOL", "Giovani Lo Celso": "MEI", "Manuel Ugarte": "VOL",
  "Rodrigo Bentancur": "VOL", "Granit Xhaka": "VOL", "Mateo Kovačić": "VOL", "Lucas Bergvall": "MEI", "Wataru Endo": "VOL", "Ismaël Bennacer": "VOL",
  "Amadou Onana": "VOL", "Youri Tielemans": "VOL",
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
