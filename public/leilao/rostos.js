// Leilão da Galera — o rosto de cada jogador em pixel-art (16x16), desenhado aqui mesmo, sem imagem de fora.
// Cada jogador das listas tem um código de 4 letras: pele, cabelo, cor do cabelo e barba. Quem não está na tabela ganha
// um rosto sorteado pelo nome (sempre o mesmo).
// A camisa é a mais emblemática do jogador (camisaDe): a escolhida à mão em EMBLEMA (um clube ou "sel", a seleção); senão,
// para quem está na lista dos atuais, o clube de agora (o último da lista dele em quimica.js); para as lendas, o clube
// mais marcante da carreira pela ordem de PRIORIDADE. Sem clube conhecido, vai com a camisa da seleção.
// Rostos.de(nome) devolve a imagem (data URL), guardada em memória depois da primeira vez.
//   pele:   1 muito clara · 2 clara · 3 morena clara · 4 morena · 5 negra
//   cabelo: k careca · r raspado · c curto · x calvo dos lados · l longo · o cacheado · a black power · m moicano ·
//           f careca com o tufo da frente (o Ronaldo de 2002)
//   cor:    p preto · c castanho · l loiro · r ruivo · g grisalho · b descolorido
//   barba:  - nada · b barba · s barba rala · v cavanhaque · g bigode
(function () {
  const T = `
Lev Yashin:1cp-|Gianluigi Buffon:2ccs|Manuel Neuer:1cl-|Iker Casillas:2cps|Peter Schmeichel:1cl-|Gordon Banks:1cc-|Dino Zoff:2cp-|Oliver Kahn:1cl-|Sepp Maier:1cc-|Edwin van der Sar:1xc-|Taffarel:3lpg|Petr Čech:1cp-|Marcos:3cps|Gylmar:3cp-|Rogério Ceni:2cc-|
Franz Beckenbauer:1cc-|Paolo Maldini:2lp-|Franco Baresi:2xp-|Cafu:4rp-|Roberto Carlos:4kp-|Bobby Moore:1cl-|Fabio Cannavaro:2cp-|Carlos Alberto Torres:4op-|Nílton Santos:3cp-|Philipp Lahm:1cc-|Sergio Ramos:2cpb|Alessandro Nesta:2lp-|Marcelo:4ap-|Daniel Passarella:2lp-|Lilian Thuram:5rp-|Ronald Koeman:1cl-|Giacinto Facchetti:2cp-|Rio Ferdinand:4rp-|Carles Puyol:2oc-|Virgil van Dijk:4cpb|Paul Breitner:2acb|Andreas Brehme:1cl-|Dani Alves:3cbs|Lúcio:3rp-|Aldair:3cp-|Gaetano Scirea:2cp-|John Terry:1cc-|Jaap Stam:1kc-|Thiago Silva:3cps|Matthias Sammer:1cr-|
Zinedine Zidane:2xc-|Johan Cruyff:1lc-|Michel Platini:1oc-|Xavi:2xp-|Andrés Iniesta:2xc-|Zico:3op-|Lothar Matthäus:1cc-|Andrea Pirlo:2lcb|Luka Modrić:2ll-|Kaká:2cc-|Bobby Charlton:1xc-|Sócrates:3opb|Falcão:2ol-|Didi:5cp-|Gérson:3xp-|Rivaldo:3cp-|Steven Gerrard:1cc-|Frank Lampard:1cc-|Clarence Seedorf:5rp-|Luís Figo:2cc-|Juan Román Riquelme:3cp-|Kevin De Bruyne:1cr-|Paul Scholes:1cr-|Toni Kroos:1cl-|Frank Rijkaard:5lp-|Roy Keane:1ccb|Patrick Vieira:5rp-|Gheorghe Hagi:2cp-|Michael Laudrup:1cc-|
Pelé:5cp-|Diego Maradona:3op-|Lionel Messi:2ccb|Cristiano Ronaldo:2cp-|Ronaldo Fenômeno:3fp-|Ronaldinho Gaúcho:3lp-|Garrincha:3cp-|Alfredo Di Stéfano:2xc-|Ferenc Puskás:2cp-|Eusébio:5cp-|Marco van Basten:1cc-|Gerd Müller:1cp-|Romário:3cp-|Thierry Henry:5kp-|George Best:1lpb|Zlatan Ibrahimović:2lpb|Karim Benzema:3cpb|Robert Lewandowski:1cc-|Roberto Baggio:2lcv|Gabriel Batistuta:2lc-|Samuel Eto'o:5cp-|Didier Drogba:5cpb|Raúl:2cp-|Kenny Dalglish:1cc-|Jairzinho:4ap-|Tostão:2cc-|Rivellino:3cpg|Hristo Stoichkov:2cp-|George Weah:5rp-|Andriy Shevchenko:1cc-|Luis Suárez:2cc-|Neymar:3cc-|
Alisson:2ccb|Thibaut Courtois:1cc-|Gianluigi Donnarumma:2cpb|Ederson:3rpb|Mike Maignan:4rpb|Jan Oblak:1cc-|Marc-André ter Stegen:1cl-|Emiliano Martínez:2cpb|Yassine Bounou:3cpb|David Raya:2cpb|Unai Simón:2ccb|Diogo Costa:2cpb|Gregor Kobel:1ccb|Joan García:2cc-|
Rúben Dias:2cpb|William Saliba:5cp-|Marquinhos:3cpb|Antonio Rüdiger:5rpb|Achraf Hakimi:3cp-|Theo Hernández:2cpb|Alessandro Bastoni:2cc-|Trent Alexander-Arnold:4cp-|Nuno Mendes:4cp-|Gabriel Magalhães:3cpb|Joško Gvardiol:2cc-|Jules Koundé:4ap-|Alphonso Davies:5cp-|Dayot Upamecano:5rp-|Éder Militão:3cpb|Pau Cubarsí:2cp-|Dean Huijsen:2cc-|Micky van de Ven:2cl-|Federico Dimarco:2ccb|Alejandro Grimaldo:2ccb|Jeremie Frimpong:5cp-|Ibrahima Konaté:5rp-|Cristian Romero:2cpb|Lisandro Martínez:2cpb|Ronald Araújo:3cpb|Willian Pacho:5cp-|Riccardo Calafiori:2ccb|Kim Min-jae:2cp-|Jurriën Timber:4cp-|
Rodri:2ccb|Jude Bellingham:4cp-|Pedri:2cp-|Martin Ødegaard:1cc-|Declan Rice:1cc-|Federico Valverde:2ccb|Vitinha:2cp-|Florian Wirtz:1cc-|Jamal Musiala:4cp-|Bruno Fernandes:2cpb|Joshua Kimmich:1cl-|Frenkie de Jong:1cc-|Bruno Guimarães:3cpb|Alexis Mac Allister:2or-|Nicolò Barella:2cpb|João Neves:2cc-|Cole Palmer:1cc-|Dani Olmo:2cc-|Aurélien Tchouaméni:5cp-|Enzo Fernández:2ccb|Moisés Caicedo:4cp-|Ryan Gravenberch:5cp-|Gavi:2cp-|Arda Güler:2cp-|Hakan Çalhanoğlu:2ccb|Warren Zaïre-Emery:5cp-|
Kylian Mbappé:4rp-|Erling Haaland:1ll-|Vinícius Júnior:4cp-|Lamine Yamal:3cp-|Mohamed Salah:3apb|Harry Kane:1cc-|Ousmane Dembélé:5cp-|Raphinha:3lp-|Lautaro Martínez:2cpb|Bukayo Saka:5cp-|Rodrygo:3cp-|Khvicha Kvaratskhelia:2cc-|Victor Osimhen:5cl-|Julián Álvarez:2cc-|Alexander Isak:4cp-|Viktor Gyökeres:2ccb|Rafael Leão:4cpb|Son Heung-min:2cp-|Phil Foden:1cc-|Michael Olise:5cp-|Désiré Doué:4cp-|Nico Williams:5cp-|Marcus Thuram:5cp-|Serhou Guirassy:5rpb|Kenan Yıldız:2cp-|Estêvão:3cp-|Luis Díaz:3cp-|Jonathan David:5cp-|
Dida:4cp-|Júlio César:3cpb|Fabien Barthez:1kc-|Andoni Zubizarreta:2xp-|Ubaldo Fillol:2cpg|Thomas Ravelli:1cl-|René Higuita:3ap-|Jorge Campos:3lp-|Ricardo Zamora:2cp-|Walter Zenga:2cp-|Jean-Marie Pfaff:1ocg|Pat Jennings:1cp-|Peter Shilton:1cc-|Ray Clemence:1oc-|Víctor Valdés:2cp-|Francesco Toldo:2cc-|Angelo Peruzzi:2cp-|Jens Lehmann:1cl-|Gianluca Pagliuca:2lp-|José Luis Chilavert:3cp-|Rinat Dasayev:1cpg|Ladislao Mazurkiewicz:2cp-|Emerson Leão:2cp-|Valdir Peres:2cpg|Bodo Illgner:1cc-|Javier Zanetti:2cp-|Gary Neville:1cc-|Ashley Cole:4kp-|Jamie Carragher:1cc-|Nemanja Vidić:2kp-|Gerard Piqué:2cps|Giorgio Chiellini:2cpb|Leonardo Bonucci:2cpb|Mats Hummels:1cc-|Jérôme Boateng:5cpb|Laurent Blanc:1kc-|Marcel Desailly:5kp-|Bixente Lizarazu:2cp-|Júnior:3ap-|Branco:3cp-|Djalma Santos:4cp-|Bellini:2cp-|Mauro Ramos:3cp-|Ruud Krol:1lc-|Berti Vogts:1cl-|Hans-Peter Briegel:1cc-|Jürgen Kohler:1cc-|Guido Buchwald:1cl-|Claudio Gentile:3cpg|Giuseppe Bergomi:2cpg|Ciro Ferrara:2cp-|Alessandro Costacurta:2xp-|Gianluca Zambrotta:2cp-|Marco Materazzi:2rpb|Fernando Hierro:2cp-|Míchel Salgado:2cc-|Joan Capdevila:2cpb|Raphaël Varane:4cp-|Diego Godín:2cp-|Elías Figueroa:2cp-|Roberto Ayala:2cp-|Walter Samuel:2kpb|Oscar Ruggeri:2ocg|Alberto Tarantini:2ap-|Sol Campbell:5kp-|Tony Adams:1cc-|Stuart Pearce:1kc-|Patrice Evra:5kp-|Frank de Boer:1cl-|Danny Blind:1cc-|Pablo Zabaleta:2cpb|Ricardo Carvalho:2cp-|Pepe:3kpb|Fernando Couto:2lpb|Vincent Kompany:5kpb|Carlos Gamarra:3cp-|Manuel Amoros:2cp-|Marius Trésor:5ap-|Kakha Kaladze:2kp-|Roque Júnior:4kp-|Edmílson:4kp-|Juan:4cp-|Maicon:4kpb|Pavel Nedvěd:1ll-|Rui Costa:2lp-|Deco:3kpb|Juninho Pernambucano:3cp-|Mauro Silva:3cp-|Dunga:2cl-|Zé Roberto:3cp-|Gilberto Silva:4kp-|Emerson:3cp-|Toninho Cerezo:4ap-|Ademir da Guia:1cl-|Clodoaldo:4cp-|Raí:2cpb|Alex:2cps|Diego Simeone:2lp-|Fernando Redondo:2lp-|Javier Mascherano:2cp-|Juan Sebastián Verón:2kpb|Michael Ballack:1cc-|Bastian Schweinsteiger:1cl-|Günter Netzer:1ll-|Wolfgang Overath:1cc-|Mesut Özil:2cp-|Claude Makélélé:5kp-|Didier Deschamps:2cp-|Jean Tigana:5cp-|Alain Giresse:1xc-|Robert Pirès:2lcb|Daniele De Rossi:2cpb|Gennaro Gattuso:2cpb|Gianni Rivera:2cp-|Giancarlo Antognoni:2lc-|Roberto Donadoni:2cp-|Demetrio Albertini:2cp-|Xabi Alonso:2xpb|Sergio Busquets:2cps|David Silva:2kp-|Cesc Fàbregas:2cpb|Luis Suárez Miramontes:2cp-|Pep Guardiola:2xp-|Johan Neeskens:1lc-|Wesley Sneijder:1cc-|Edgar Davids:5lp-|Ruud Gullit:5lpg|Paul Gascoigne:1cl-|David Beckham:1cl-|Bryan Robson:1oc-|Glenn Hoddle:1lc-|Dragan Stojković:2cp-|Dejan Savićević:2kp-|Zbigniew Boniek:1or-|Kazimierz Deyna:1cc-|Enzo Scifo:2cp-|Jari Litmanen:1cl-|Carlos Valderrama:3abg|Teófilo Cubillas:4ap-|Hidetoshi Nakata:2cb-|Park Ji-sung:2cp-|Yaya Touré:5kp-|Michael Essien:5kp-|Jay-Jay Okocha:5cp-|Stefan Effenberg:1cl-|Paulo Sousa:2lp-|Francesco Totti:2cc-|Alessandro Del Piero:2cp-|Paolo Rossi:2oc-|Christian Vieri:2kps|Filippo Inzaghi:2cp-|Giuseppe Meazza:2cp-|Silvio Piola:2cp-|Luigi Riva:2cp-|Dennis Bergkamp:1cl-|Ruud van Nistelrooy:1cc-|Robin van Persie:2cp-|Arjen Robben:1kl-|Patrick Kluivert:5kp-|Rob Rensenbrink:1lc-|Karl-Heinz Rummenigge:1lc-|Jürgen Klinsmann:1cl-|Rudi Völler:1ocg|Miroslav Klose:1cc-|Uwe Seeler:1xc-|Just Fontaine:2cp-|Raymond Kopa:2cp-|Jean-Pierre Papin:1cc-|Éric Cantona:2cp-|David Trezeguet:2lp-|Franck Ribéry:2kcs|Michael Owen:1cc-|Alan Shearer:1xc-|Gary Lineker:1cc-|Wayne Rooney:1rc-|Jimmy Greaves:1cp-|Kevin Keegan:1oc-|Fernando Torres:1cl-|David Villa:2cpv|Emilio Butragueño:2cc-|Hugo Sánchez:3opg|Hernán Crespo:2cp-|Mario Kempes:2lp-|Sergio Agüero:2cp-|Carlos Tevez:2cp-|Claudio Caniggia:2ll-|Ángel Di María:2cp-|Enzo Francescoli:2lp-|Diego Forlán:1ll-|Edinson Cavani:2lpb|Bebeto:3cp-|Careca:2ocg|Adriano:4kps|Ademir de Menezes:3cp-|Leônidas da Silva:4cp-|Arthur Friedenreich:3cp-|Reinaldo:3ap-|Roberto Dinamite:3cp-|Luís Fabiano:2cp-|Edmundo:3cp-|Fred:2cps|Dimitar Berbatov:2cps|Henrik Larsson:4lp-|Davor Šuker:2cp-|Abedi Pelé:5cp-|Roger Milla:5cpb|Nwankwo Kanu:5kp-|Brian Laudrup:1ll-|Oleg Blokhin:1cp-|Ian Rush:1cpg|Ryan Giggs:1cp-|Gareth Bale:1lpb|
André Onana:5kp-|Bart Verbruggen:1cc-|Guglielmo Vicario:2cpb|Robert Sánchez:2cpb|Jordan Pickford:1cc-|Aaron Ramsdale:1ccb|Dean Henderson:1cc-|Lucas Chevalier:2cp-|Brice Samba:5kp-|Kepa Arrizabalaga:2cpb|Matvei Safonov:1cc-|Wojciech Szczęsny:1cc-|Yann Sommer:1ccb|Alex Meret:2cp-|Mile Svilar:2cpb|Bento:2cpb|Hugo Souza:3cp-|Weverton:3kpb|Agustín Rossi:2cpb|Gerónimo Rulli:2cpb|Giorgi Mamardashvili:2cc-|Zion Suzuki:5cp-|Anatoliy Trubin:1cc-|Andriy Lunin:1cc-|Filip Jørgensen:1cl-|Reece James:4cpb|Kyle Walker:4kp-|John Stones:1cc-|Marc Guéhi:5cp-|Levi Colwill:1cc-|Ezri Konsa:5cp-|Myles Lewis-Skelly:5cp-|Ben White:1cc-|Benjamin Pavard:2op-|Lucas Hernández:2cp-|Castello Lukeba:5cp-|Malo Gusto:4cp-|Lucas Digne:2cpb|Wesley Fofana:5cp-|Leny Yoro:5cp-|Dani Carvajal:2cpb|Robin Le Normand:1cc-|Aymeric Laporte:2cp-|Marc Cucurella:2op-|Pedro Porro:2cpb|Dani Vivian:2cpb|Alejandro Balde:4cp-|Kalidou Koulibaly:5kp-|Matthijs de Ligt:1cl-|Nathan Aké:5cp-|Denzel Dumfries:5kpb|Jorrel Hato:4cp-|Stefan de Vrij:1cc-|Andrew Robertson:1ccb|Kieran Trippier:1kcb|Gonçalo Inácio:2cp-|António Silva:2cp-|Diogo Dalot:2cpb|João Cancelo:2cpb|Danilo:3cpb|Alex Sandro:3cpb|Bremer:4kp-|Lucas Beraldo:2cp-|Wesley:4cp-|Vanderson:4cp-|Gustavo Gómez:3cpb|Nahuel Molina:2cpb|Nicolás Otamendi:2kpb|Marcos Acuña:2kpb|Leonardo Balerdi:2cp-|José María Giménez:2cpb|Mathías Olivera:2cpb|Giovanni Di Lorenzo:2cpb|Andrea Cambiaso:2cp-|Destiny Udogie:5cp-|Takehiro Tomiyasu:2cp-|Piero Hincapié:4cp-|Pervis Estupiñán:5cp-|Josip Stanišić:2cc-|Maximilian Mittelstädt:1cc-|David Raum:1cc-|Waldemar Anton:1cc-|Nico Schlotterbeck:1cc-|Jonathan Tah:5cp-|Manuel Akanji:4cp-|Ousmane Diomande:5cp-|Noussair Mazraoui:3cpb|Evan Ndicka:5cp-|Edmond Tapsoba:5cp-|Murillo:4cp-|Kobbie Mainoo:5cp-|Morgan Gibbs-White:1cc-|Eberechi Eze:5cp-|Conor Gallagher:1cc-|Adam Wharton:1cc-|Elliot Anderson:1cc-|Mason Mount:1cc-|Martín Zubimendi:2cc-|Mikel Merino:2cp-|Fabián Ruiz:2cpb|Fermín López:2cp-|Álex Baena:2cc-|Marc Casadó:2cc-|Eduardo Camavinga:5ap-|Adrien Rabiot:1lc-|Manu Koné:5cp-|Khéphren Thuram:5cp-|Rayan Cherki:3cp-|N'Golo Kanté:5kp-|Youssouf Fofana:5cp-|Leon Goretzka:1ccb|Aleksandar Pavlović:1cc-|Angelo Stiller:1cc-|Felix Nmecha:5cp-|İlkay Gündoğan:2cpb|Xavi Simons:3op-|Tijjani Reijnders:3cp-|Teun Koopmeiners:1cc-|Joey Veerman:1cl-|Bernardo Silva:2op-|João Palhinha:2cpb|Rúben Neves:2cpb|Sandro Tonali:2lp-|Davide Frattesi:2cc-|Manuel Locatelli:2cpb|Scott McTominay:1cc-|Stanislav Lobotka:2kpb|Piotr Zieliński:1cc-|Lucas Paquetá:3cp-|João Gomes:4cp-|André:4cp-|Andreas Pereira:2cp-|Casemiro:3cpb|Rodrigo De Paul:2lpb|Leandro Paredes:2cpb|Exequiel Palacios:2cp-|Giovani Lo Celso:2lpb|Manuel Ugarte:2cpb|Rodrigo Bentancur:2cp-|Granit Xhaka:2cpb|Mateo Kovačić:2cp-|Lucas Bergvall:1cl-|Wataru Endo:2cp-|Ismaël Bennacer:3cpb|Amadou Onana:5kp-|Youri Tielemans:2cc-|Bradley Barcola:5cp-|Hugo Ekitiké:5cp-|Antoine Griezmann:2cl-|Kingsley Coman:5kp-|Randal Kolo Muani:5cp-|Christopher Nkunku:5cp-|Bryan Mbeumo:5cp-|Ollie Watkins:5cp-|Jarrod Bowen:1cc-|Anthony Gordon:1cc-|Marcus Rashford:5cp-|Noni Madueke:5cp-|Morgan Rogers:4cp-|Jack Grealish:1cc-|Dominic Solanke:5cp-|Gabriel Martinelli:3cp-|Gabriel Jesus:4cp-|Endrick:4cp-|João Pedro:4cp-|Matheus Cunha:3cpb|Savinho:3cp-|Igor Thiago:4kpb|Pedro:3cp-|Hulk:3kp-|Giorgian de Arrascaeta:2cpb|Darwin Núñez:3cp-|Federico Chiesa:2cc-|Mateo Retegui:2cpb|Moise Kean:5cp-|Paulo Dybala:2cpb|Alejandro Garnacho:2cp-|Nicolás González:2lpb|Thiago Almada:2cp-|Franco Mastantuono:2cp-|Mikel Oyarzabal:2cpb|Ferran Torres:2cp-|Álvaro Morata:2cpb|Yeremy Pino:2cp-|Samu Aghehowa:5kp-|Leroy Sané:5kp-|Serge Gnabry:5cpb|Kai Havertz:1cc-|Nick Woltemade:1cc-|Karim Adeyemi:5cp-|Cody Gakpo:5cp-|Memphis Depay:5kpb|Donyell Malen:5cp-|João Félix:2cp-|Pedro Neto:2cp-|Gonçalo Ramos:2cpb|Francisco Conceição:2cp-|Romelu Lukaku:5kpb|Jérémy Doku:5cp-|Leandro Trossard:2cpb|Takefusa Kubo:2cp-|Kaoru Mitoma:2cp-|Benjamin Šeško:1cc-|Dušan Vlahović:2lpb|Ademola Lookman:5cp-|Mohammed Kudus:5kpb|Antoine Semenyo:5cp-|Brahim Díaz:3cpb|Christian Pulisic:1cc-|Rasmus Højlund:1cl-`;
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const TRACOS = {};
  T.split("|").forEach((p) => { const i = p.lastIndexOf(":"); if (i > 0) TRACOS[norm(p.slice(0, i))] = p.slice(i + 1).trim(); });

  const PELE = { 1: "#f6d3b5", 2: "#e6b48a", 3: "#c68b5e", 4: "#9c6640", 5: "#5f3a24" };
  const CABELO = { p: "#1c1410", c: "#5a3820", l: "#e3c25c", r: "#b4522a", g: "#a3a3a3", b: "#efe3c0" };
  // camisa de cada seleção: [cor, detalhe, desenho] (desenho: "l" listras, "x" xadrez)
  const CAMISA = { Brasil: ["#f7d417", "#1c8a3a"], Argentina: ["#8fd0f5", "#ffffff", "l"], França: ["#1d2d6b", "#e63946"], Alemanha: ["#f4f4f4", "#1a1a1a"],
    Itália: ["#1f5fbf", "#ffffff"], Espanha: ["#c8102e", "#f6c64e"], Inglaterra: ["#f4f4f4", "#1d2d6b"], Portugal: ["#b3122a", "#1c8a3a"], Holanda: ["#f57c00", "#1a1a1a"],
    Uruguai: ["#6fb7e8", "#1a1a1a"], Bélgica: ["#c8102e", "#f6c64e"], Croácia: ["#e63946", "#ffffff", "x"], Noruega: ["#c8102e", "#1d2d6b"], Egito: ["#c8102e", "#ffffff"],
    Polônia: ["#f4f4f4", "#c8102e"], Suécia: ["#f7d417", "#1f5fbf"], Colômbia: ["#f7d417", "#1d2d6b"], Japão: ["#1d2d6b", "#ffffff"], Nigéria: ["#1c8a3a", "#ffffff"],
    Dinamarca: ["#c8102e", "#ffffff"], Hungria: ["#c8102e", "#1c8a3a"], Gana: ["#f4f4f4", "#1a1a1a"], Ucrânia: ["#f7d417", "#1f5fbf"], Escócia: ["#1d2d6b", "#ffffff"],
    "País de Gales": ["#c8102e", "#ffffff"], Irlanda: ["#1c8a3a", "#ffffff"], Bulgária: ["#f4f4f4", "#1c8a3a"], Romênia: ["#f7d417", "#1f5fbf"], Libéria: ["#c8102e", "#ffffff"],
    Camarões: ["#1c8a3a", "#c8102e"], "Costa do Marfim": ["#f57c00", "#1c8a3a"], Marrocos: ["#c8102e", "#1c8a3a"], Senegal: ["#f4f4f4", "#1c8a3a"], Equador: ["#f7d417", "#1d2d6b"],
    Geórgia: ["#f4f4f4", "#c8102e"], Turquia: ["#c8102e", "#ffffff"], "Coreia do Sul": ["#c8102e", "#1a1a1a"], Canadá: ["#c8102e", "#ffffff"], Guiné: ["#c8102e", "#f7d417"],
    Áustria: ["#c8102e", "#ffffff"], Suíça: ["#c8102e", "#ffffff"], "República Tcheca": ["#c8102e", "#1d2d6b"], Eslovênia: ["#f4f4f4", "#1c8a3a"], Gabão: ["#f7d417", "#1c8a3a"],
    Rússia: ["#c8102e", "#ffffff"], Tchéquia: ["#c8102e", "#1d2d6b"], México: ["#1c6b3a", "#ffffff"], "Irlanda do Norte": ["#1c8a3a", "#ffffff"],
    Paraguai: ["#c8102e", "#ffffff", "l"], Sérvia: ["#c8102e", "#ffffff"], Chile: ["#c8102e", "#1d2d6b"], Montenegro: ["#b3122a", "#f6c64e"],
    Finlândia: ["#f4f4f4", "#1f4fa0"], Peru: ["#f4f4f4", "#c8102e"], "Burkina Faso": ["#1c8a3a", "#c8102e"], Eslováquia: ["#f4f4f4", "#1f4fa0"],
    Argélia: ["#f4f4f4", "#1c8a3a"], "Estados Unidos": ["#f4f4f4", "#1d2d6b"] };

  // camisa de cada clube: [cor, detalhe, desenho] (desenho: l listras, h aros, x xadrez, c faixa vertical no meio,
  // f faixa horizontal, d faixa diagonal, m metade de cada cor)
  const KITS = {
    "Real Madrid": ["#f4f4f4", "#c9a227"], Barcelona: ["#a50044", "#004d98", "l"], Milan: ["#c8102e", "#1a1a1a", "l"], Bayern: ["#dc052d", "#ffffff"],
    Juventus: ["#f4f4f4", "#1a1a1a", "l"], "Manchester United": ["#da291c", "#1a1a1a"], Liverpool: ["#c8102e", "#f6c64e"], "Inter de Milão": ["#0a3d91", "#1a1a1a", "l"],
    Santos: ["#f4f4f4", "#1a1a1a"], Flamengo: ["#c8102e", "#1a1a1a", "h"], Ajax: ["#f4f4f4", "#d2122e", "c"], Napoli: ["#12a0d7", "#ffffff"], Arsenal: ["#ef0107", "#ffffff"],
    Chelsea: ["#034694", "#ffffff"], "Manchester City": ["#6cabdd", "#ffffff"], PSG: ["#004170", "#da291c", "c"], "Borussia Dortmund": ["#fde100", "#1a1a1a"],
    "Atlético de Madrid": ["#cb3524", "#ffffff", "l"], Benfica: ["#e20e0e", "#ffffff"], Porto: ["#003893", "#ffffff", "l"], Roma: ["#8e1f2f", "#f0bc42"], Lazio: ["#87d8f7", "#ffffff"],
    "Boca Juniors": ["#103f79", "#f3b229", "f"], "River Plate": ["#f4f4f4", "#e30613", "d"], Palmeiras: ["#006437", "#ffffff"], "São Paulo": ["#f4f4f4", "#c8102e", "f"],
    Corinthians: ["#f4f4f4", "#1a1a1a"], Fluminense: ["#7a1531", "#006437", "l"], Vasco: ["#1a1a1a", "#f4f4f4", "d"], Botafogo: ["#1a1a1a", "#f4f4f4", "l"],
    Grêmio: ["#0d80bf", "#1a1a1a", "l"], Internacional: ["#c8102e", "#ffffff"], Cruzeiro: ["#0a3d91", "#ffffff"], "Atlético-MG": ["#1a1a1a", "#f4f4f4", "l"],
    Marseille: ["#f4f4f4", "#2faee0"], Lyon: ["#f4f4f4", "#0a3d91"], Sporting: ["#008057", "#ffffff", "h"], Celtic: ["#00843d", "#ffffff", "h"], Tottenham: ["#f4f4f4", "#132257"],
    Leverkusen: ["#e32221", "#1a1a1a"], Valencia: ["#f4f4f4", "#1a1a1a"], Sevilla: ["#f4f4f4", "#d8001d"], Fiorentina: ["#482e92", "#ffffff"], Monaco: ["#e30613", "#f4f4f4", "m"],
    Rangers: ["#1b458f", "#ffffff"], Newcastle: ["#1a1a1a", "#f4f4f4", "l"], Everton: ["#003399", "#ffffff"], "Aston Villa": ["#670e36", "#95bfe5"], "West Ham": ["#7a263a", "#1bb1e7"],
    Hamburgo: ["#f4f4f4", "#0a3d91"], "Borussia Mönchengladbach": ["#f4f4f4", "#1a1a1a"], Kaiserslautern: ["#c8102e", "#ffffff"], "Werder Bremen": ["#1d9053", "#ffffff"],
    "Schalke 04": ["#004d9d", "#ffffff"], Stuttgart: ["#f4f4f4", "#e32219", "f"], Colônia: ["#f4f4f4", "#ed1c24"], PSV: ["#ed1c24", "#f4f4f4", "l"], Feyenoord: ["#f4f4f4", "#e30613", "m"],
    Galatasaray: ["#a90432", "#fdb912", "m"], Fenerbahçe: ["#0a3d91", "#f6d101", "l"], "Al-Nassr": ["#f6d101", "#0a3d91"], "Al-Hilal": ["#0a3d91", "#ffffff"], "Al-Ittihad": ["#f6d101", "#1a1a1a", "l"],
    "Inter Miami": ["#f7b5cd", "#1a1a1a"], "LA Galaxy": ["#f4f4f4", "#00245d"], Cosmos: ["#f4f4f4", "#1d9053"], Sampdoria: ["#1b5faa", "#f4f4f4", "f"], Parma: ["#f4f4f4", "#1a1a1a"],
    Udinese: ["#f4f4f4", "#1a1a1a", "l"], Atalanta: ["#1e71b8", "#1a1a1a", "l"], Cagliari: ["#a6192e", "#00205b", "m"], Torino: ["#8a1538", "#ffffff"], Bologna: ["#a21c26", "#1a2f48", "l"],
    Leeds: ["#f4f4f4", "#1d428a"], "Nottingham Forest": ["#dd0000", "#ffffff"], Leicester: ["#003090", "#fdbe11"], Blackburn: ["#009ee0", "#f4f4f4", "m"], Southampton: ["#d71920", "#f4f4f4", "l"],
    Brighton: ["#0057b8", "#f4f4f4", "l"], "Crystal Palace": ["#1b458f", "#c4122e", "l"], Brentford: ["#e30613", "#f4f4f4", "l"], Wolverhampton: ["#fdb913", "#231f20"], Fulham: ["#f4f4f4", "#1a1a1a"],
    Bournemouth: ["#da291c", "#1a1a1a", "l"], Bordeaux: ["#0a2240", "#f4f4f4"], "Saint-Étienne": ["#00a650", "#ffffff"], Nantes: ["#fcd116", "#00843d"], Reims: ["#e30613", "#f4f4f4"],
    Lille: ["#e01e13", "#1a1a1a"], Rennes: ["#e13327", "#1a1a1a"], "Real Sociedad": ["#0067b1", "#f4f4f4", "l"], "Athletic Bilbao": ["#ee2523", "#f4f4f4", "l"],
    "Deportivo La Coruña": ["#f4f4f4", "#1b5faa", "l"], Villarreal: ["#ffe667", "#005187"], Zaragoza: ["#f4f4f4", "#1a3f91"], Espanyol: ["#007fc8", "#f4f4f4", "l"], Betis: ["#00954c", "#f4f4f4", "l"],
    Anderlecht: ["#4c2683", "#f4f4f4"], "Dinamo Zagreb": ["#0a3d91", "#ffffff"], "Estrela Vermelha": ["#c8102e", "#f4f4f4", "l"], "Dynamo Kiev": ["#f4f4f4", "#0a3d91"],
    "Dynamo Moscou": ["#0a3d91", "#f4f4f4"], "Spartak Moscou": ["#c8102e", "#f4f4f4"], "Steaua Bucareste": ["#c8102e", "#0a3d91", "m"], Peñarol: ["#f6d101", "#1a1a1a", "l"],
    Nacional: ["#f4f4f4", "#0a3d91"], Independiente: ["#c8102e", "#ffffff"], Racing: ["#6cabdd", "#f4f4f4", "l"], "Vélez Sarsfield": ["#f4f4f4", "#0a3d91"], "Rosario Central": ["#0a3d91", "#f6d101", "l"],
    "Argentinos Juniors": ["#e30613", "#f4f4f4"], Estudiantes: ["#e30613", "#f4f4f4", "l"], Olympiacos: ["#e30613", "#f4f4f4", "l"], Sport: ["#e30613", "#1a1a1a", "h"], Bangu: ["#f4f4f4", "#e30613", "l"],
    Portuguesa: ["#e30613", "#1d9053"], Guarani: ["#1d9053", "#f4f4f4"], Vitória: ["#e30613", "#1a1a1a", "h"], Coritiba: ["#f4f4f4", "#1d9053", "h"], "Athletico-PR": ["#c8102e", "#1a1a1a", "l"],
    "Botafogo-SP": ["#c8102e", "#ffffff", "l"], "RB Leipzig": ["#f4f4f4", "#dd0741"], "Eintracht Frankfurt": ["#1a1a1a", "#e1000f"], Freiburg: ["#e2001a", "#1a1a1a"], Hoffenheim: ["#1c63b7", "#ffffff"],
    "Red Bull Salzburg": ["#f4f4f4", "#d0103a"], Basel: ["#c8102e", "#0a3d91", "m"], Wolfsburg: ["#65b32e", "#ffffff"], Midtjylland: ["#1a1a1a", "#c8102e"], Bragantino: ["#f4f4f4", "#c8102e"],
  };
  // a ordem das lendas: o primeiro clube desta lista em que o jogador passou é o que ele veste
  const PRIORIDADE = ["Real Madrid", "Barcelona", "Milan", "Bayern", "Juventus", "Manchester United", "Liverpool", "Inter de Milão", "Santos", "Flamengo", "Ajax", "Napoli",
    "Arsenal", "Chelsea", "Manchester City", "PSG", "Borussia Dortmund", "Atlético de Madrid", "Benfica", "Porto", "Roma", "Lazio", "Boca Juniors", "River Plate", "Palmeiras",
    "São Paulo", "Corinthians", "Fluminense", "Vasco", "Botafogo", "Grêmio", "Internacional", "Cruzeiro", "Atlético-MG", "Marseille", "Lyon", "Sporting", "Celtic", "Tottenham",
    "Leverkusen", "Valencia", "Sevilla", "Fiorentina"];
  // as escolhas à mão: o clube que marcou o jogador, ou "sel" para a camisa da seleção
  const EMBLEMA = {
    "Pelé": "sel", "Diego Maradona": "sel", "Ronaldo Fenômeno": "sel", "Romário": "sel", "Roberto Baggio": "sel", "Cafu": "sel", "Garrincha": "Botafogo", "Zico": "Flamengo",
    "Kaká": "Milan", "Sócrates": "Corinthians", "Falcão": "Roma", "Johan Cruyff": "Ajax", "Thierry Henry": "Arsenal", "Dennis Bergkamp": "Arsenal", "Juan Román Riquelme": "Boca Juniors",
    "Gabriel Batistuta": "Fiorentina", "Carlos Valderrama": "sel", "René Higuita": "sel", "Jorge Campos": "sel", "Taffarel": "sel", "Marcos": "Palmeiras", "Didi": "Botafogo",
    "Nílton Santos": "Botafogo", "Carlos Alberto Torres": "sel", "Jairzinho": "sel", "Tostão": "Cruzeiro", "Rivellino": "sel", "Gérson": "sel", "Roberto Dinamite": "Vasco",
    "Bebeto": "sel", "Edmundo": "Vasco", "Juninho Pernambucano": "Lyon", "Raí": "São Paulo", "Dunga": "sel", "Mauro Silva": "Deportivo La Coruña", "Bellini": "sel", "Branco": "sel",
    "Toninho Cerezo": "Atlético-MG", "Luís Fabiano": "São Paulo", "Fred": "Fluminense", "Mario Kempes": "sel", "Daniel Passarella": "River Plate", "Sergio Agüero": "Manchester City",
    "Henrik Larsson": "Celtic", "Alan Shearer": "Newcastle", "Michael Owen": "Liverpool", "Arjen Robben": "Bayern", "Miroslav Klose": "sel", "Jean-Pierre Papin": "Marseille",
    "Patrick Vieira": "Arsenal", "Fernando Torres": "Atlético de Madrid", "Gheorghe Hagi": "sel", "Roger Milla": "sel", "Jay-Jay Okocha": "sel", "Yaya Touré": "Manchester City",
    "Michael Essien": "Chelsea", "Teófilo Cubillas": "sel", "José Luis Chilavert": "sel", "Carlos Gamarra": "sel", "Diego Godín": "Atlético de Madrid", "Diego Forlán": "sel",
    "Edinson Cavani": "PSG", "Fabio Cannavaro": "sel", "Leonardo Bonucci": "Juventus", "Dino Zoff": "sel", "Paolo Rossi": "sel", "Zlatan Ibrahimović": "Milan", "Luís Figo": "Barcelona",
    "Lev Yashin": "sel", "Ferenc Puskás": "sel", "Eusébio": "Benfica", "Bobby Moore": "sel", "Gordon Banks": "sel", "Hugo Sánchez": "Real Madrid", "Ademir da Guia": "Palmeiras",
    "Rogério Ceni": "São Paulo", "Alex": "Cruzeiro", "Ruud Gullit": "Milan", "Marco van Basten": "Milan", "Frank Rijkaard": "Milan", "Paolo Maldini": "Milan", "Andrea Pirlo": "Milan",
  };
  const ATUAIS = new Set(Object.values((window.FOOTBALL && FOOTBALL.atuais) || {}).flat().map(norm));
  // o calção de cada camisa (pelo clube ou pela seleção); quem não está aqui ganha o da regra em uniformeDe
  const CALCAO = {
    Brasil: "#1f4fa0", Argentina: "#1a1a1a", França: "#f4f4f4", Alemanha: "#1a1a1a", Itália: "#f4f4f4", Espanha: "#1d2d6b", Inglaterra: "#1d2d6b",
    Portugal: "#1c8a3a", Holanda: "#f4f4f4", Uruguai: "#1a1a1a", Bélgica: "#c8102e", Croácia: "#f4f4f4", Suécia: "#1f5fbf", Colômbia: "#1d2d6b",
    Camarões: "#c8102e", México: "#f4f4f4", Chile: "#1d2d6b", Paraguai: "#1d2d6b", Marrocos: "#1c8a3a", "Estados Unidos": "#1d2d6b",
    "Real Madrid": "#f4f4f4", Barcelona: "#004d98", Milan: "#f4f4f4", Bayern: "#dc052d", Juventus: "#f4f4f4", "Manchester United": "#f4f4f4",
    Liverpool: "#c8102e", "Inter de Milão": "#1a1a1a", Santos: "#f4f4f4", Flamengo: "#f4f4f4", Ajax: "#f4f4f4", Napoli: "#f4f4f4", Arsenal: "#f4f4f4",
    Chelsea: "#034694", "Manchester City": "#f4f4f4", PSG: "#004170", "Borussia Dortmund": "#1a1a1a", "Atlético de Madrid": "#1d2d6b", Benfica: "#f4f4f4",
    Porto: "#003893", Roma: "#f4f4f4", Lazio: "#f4f4f4", "Boca Juniors": "#103f79", "River Plate": "#1a1a1a", Palmeiras: "#f4f4f4", "São Paulo": "#f4f4f4",
    Corinthians: "#1a1a1a", Fluminense: "#f4f4f4", Vasco: "#1a1a1a", Botafogo: "#1a1a1a", Grêmio: "#1a1a1a", Internacional: "#f4f4f4", Cruzeiro: "#f4f4f4",
    "Atlético-MG": "#1a1a1a", Marseille: "#f4f4f4", Lyon: "#f4f4f4", Sporting: "#1a1a1a", Celtic: "#f4f4f4", Tottenham: "#132257", Leverkusen: "#1a1a1a",
    Valencia: "#1a1a1a", Sevilla: "#f4f4f4", Fiorentina: "#f4f4f4", Newcastle: "#1a1a1a", "Al-Nassr": "#0a3d91", "Al-Hilal": "#f4f4f4", "Inter Miami": "#1a1a1a",
  };
  // de onde vem a camisa do jogador: o clube (ou o país, para a seleção) e as cores [cor, detalhe, desenho]
  function kitDe(nome) {
    const info = typeof Quimica !== "undefined" && Quimica.infoOf(nome), pais = info && CAMISA[info.pais] ? info.pais : null;
    const sel = { chave: pais, cores: pais ? CAMISA[pais] : ["#24372d", "#c6ff3a"] };
    const fixo = EMBLEMA[nome]; if (fixo) return fixo === "sel" || !KITS[fixo] ? sel : { chave: fixo, cores: KITS[fixo] };
    const clubes = ((info && info.lista) || []).filter((c) => KITS[c]); if (!clubes.length) return sel;
    const clube = ATUAIS.has(norm(nome)) ? clubes[clubes.length - 1] : PRIORIDADE.find((c) => clubes.includes(c)) || clubes[0];
    return { chave: clube, cores: KITS[clube] };
  }
  // a camisa do jogador: [cor, detalhe, desenho]
  const camisaDe = (nome) => kitDe(nome).cores;
  const claro = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255; };
  function semente(nome) { let h = 2166136261; for (const ch of nome) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; }
  // o uniforme inteiro (para o boneco dos lances): camisa, calção, meião e chuteira. As lendas jogam de chuteira preta;
  // os atuais, das coloridas (sorteada pelo nome, sempre a mesma)
  function uniformeDe(nome) {
    const { chave, cores: [cam, det, desenho] } = kitDe(nome);
    const calcao = CALCAO[chave] || (claro(cam) > 0.85 ? (claro(det) < 0.35 ? det : "#f4f4f4") : claro(cam) < 0.15 ? "#1a1a1a" : "#f4f4f4");
    const atual = ATUAIS.has(norm(nome)), h = semente(norm(nome));
    const chuteira = atual ? ["#f4f15a", "#ff5fa2", "#5ad0ff", "#ff8a3d", "#f4f4f4", "#b6ff3a"][h % 6] : "#1a1a1a";
    return { cam, det, desenho, calcao, meiao: calcao === "#f4f4f4" ? cam : calcao, chuteira };
  }
  function tracosDe(nome) {
    const t = TRACOS[norm(nome)]; if (t) return t;
    const h = semente(norm(nome)); // quem não está na tabela: sorteado pelo nome, sempre igual
    return "12345"[h % 5] + "ccccrxlo"[(h >>> 3) % 8] + "ppcclr"[(h >>> 6) % 6] + "---sb"[(h >>> 9) % 5];
  }
  // a cabeça (pescoço, rosto, orelhas, cabelo e barba) no canvas g, com o canto do quadro de 16x16 em (ox, oy). A carta
  // usa no rosto; os lances, no boneco. olhar (-1 ou 1) vira os olhos, o nariz e a boca um pixel para o lado.
  function pintaCabeca(g, nome, ox = 0, oy = 0, olhar = 0) {
    const [pele, cabelo, corC, barba] = tracosDe(nome);
    const px = (x, y, c, a = 1) => { g.globalAlpha = a; g.fillStyle = c; g.fillRect(ox + x, oy + y, 1, 1); g.globalAlpha = 1; };
    const ret = (x0, y0, x1, y1, c, a) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px(x, y, c, a); };
    const P = PELE[pele] || PELE[2], C = CABELO[corC] || CABELO.p, sombra = "#00000040", o = olhar;
    // pescoço, cabeça e orelhas
    ret(6, 10, 9, 12, P); px(6, 11, sombra); px(9, 11, sombra);
    ret(5, 3, 10, 3, P); ret(4, 4, 11, 9, P); px(4, 9, sombra, .5); px(11, 9, sombra, .5); ret(5, 10, 10, 10, P);
    px(3, 6, P); px(12, 6, P); px(3, 7, P); px(12, 7, P);
    // cabelo
    if (cabelo === "c") { ret(4, 1, 11, 2, C); ret(4, 3, 4, 4, C); ret(11, 3, 11, 4, C); ret(5, 3, 7, 3, C); }
    else if (cabelo === "r") { ret(5, 2, 10, 2, C, .75); ret(4, 3, 11, 3, C, .4); px(4, 4, C, .4); px(11, 4, C, .4); }
    else if (cabelo === "f") { ret(6, 2, 9, 2, C); ret(7, 1, 8, 1, C); px(9, 3, "#ffffff", .3); } // o "Cascão" de 2002
    else if (cabelo === "x") { ret(4, 3, 4, 5, C); ret(11, 3, 11, 5, C); px(5, 3, C); px(10, 3, C); }
    else if (cabelo === "l") { ret(4, 1, 11, 2, C); ret(3, 2, 4, 10, C); ret(11, 2, 12, 10, C); ret(5, 3, 8, 3, C); }
    else if (cabelo === "o") { ret(3, 1, 12, 3, C); [3, 6, 9, 12].forEach((x) => px(x, 0, C)); ret(3, 4, 3, 6, C); ret(12, 4, 12, 6, C); }
    else if (cabelo === "a") { ret(2, 0, 13, 3, C); ret(2, 4, 3, 6, C); ret(12, 4, 13, 6, C); }
    else if (cabelo === "m") { ret(7, 0, 8, 2, C); ret(4, 2, 11, 3, C, .4); }
    else px(9, 3, "#ffffff", .35); // careca: o brilho
    // olhos, sobrancelhas, nariz e boca
    px(6 + o, 6, "#1a1210"); px(9 + o, 6, "#1a1210"); px(6 + o, 5, C, .7); px(9 + o, 5, C, .7);
    px(7 + o, 7, sombra); px(7 + o, 8, "#00000059"); px(8 + o, 8, "#00000059");
    // barba
    if (barba === "b" || barba === "s") { const a = barba === "s" ? .45 : 1; ret(4, 8, 4, 9, C, a); ret(11, 8, 11, 9, C, a); ret(5, 9, 10, 10, C, a); px(6, 8, C, a); px(9, 8, C, a); }
    else if (barba === "v") { ret(7, 9, 8, 10, C); px(6, 8, C); px(9, 8, C); }
    else if (barba === "g") ret(6, 7, 9, 7, C);
  }
  const cache = new Map();
  function de(nome) {
    if (cache.has(nome)) return cache.get(nome);
    const [cam, det, desenho] = camisaDe(nome);
    const cv = document.createElement("canvas"); cv.width = 16; cv.height = 16;
    const g = cv.getContext("2d"), px = (x, y, c, a = 1) => { g.globalAlpha = a; g.fillStyle = c; g.fillRect(x, y, 1, 1); g.globalAlpha = 1; };
    const ret = (x0, y0, x1, y1, c, a) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px(x, y, c, a); };
    // camisa (ombros) e gola
    ret(2, 13, 13, 15, cam); ret(3, 12, 12, 12, cam);
    const dentro = (x, y) => (y >= 13 ? x >= 2 && x <= 13 : x >= 3 && x <= 12);
    for (let y = 12; y <= 15; y++) for (let x = 2; x <= 13; x++) {
      if (!dentro(x, y)) continue;
      if (pintaListra(desenho, x - 2, y)) px(x, y, det);
    }
    px(6, 12, det); px(9, 12, det); if (!desenho) { px(7, 13, det); px(8, 13, det); } // a gola
    pintaCabeca(g, nome);
    const url = cv.toDataURL(); cache.set(nome, url); return url;
  }
  // o desenho da camisa no pixel (x a partir do ombro esquerdo, y da linha): l listras, h aros, x xadrez, c faixa
  // vertical no meio, f faixa horizontal, d faixa diagonal, m metade de cada cor. O boneco dos lances usa o mesmo.
  function pintaListra(desenho, x, y) {
    return desenho === "l" ? Math.floor(x / 2) % 2 === 1 : desenho === "h" ? y % 2 === 1 : desenho === "x" ? (x + y) % 2 === 1
      : desenho === "c" ? x === 5 || x === 6 : desenho === "f" ? y === 14 : desenho === "d" ? x - y === -8 || x - y === -7 : desenho === "m" ? x >= 6 : false;
  }
  const peleDe = (nome) => PELE[tracosDe(nome)[0]] || PELE[2];
  window.Rostos = { de, tracosDe, camisaDe, uniformeDe, pele: peleDe, cabeca: pintaCabeca, listra: pintaListra };
})();
