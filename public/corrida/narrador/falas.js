// Falas do narrador de TV que apresenta a pista na transmissão da Corrida (português do Brasil). UMD: window.NarradorFalas no
// navegador, require() no Node. Cada fala vira public/corrida/narrador/<pista>-<n>.mp3 (ferramentas/narrador-pistas.js, com a
// voz da ElevenLabs). Sem o mp3, a transmissão segue em silêncio. Uma por pista é sorteada pela semente do GP (narrador.js).
// Escrito para ser FALADO: números, anos e siglas por extenso (a voz lê melhor), sem marca de patrocinador, de 8 a 20 segundos.
// As cinco de cada pista: 1 abertura, 2 traçado, 3 história, 4 curiosidade, 5 o que esperar. Dados conferidos na Wikipédia e na
// imprensa da categoria; recorde de vitórias e de volta só quando não muda com o tempo (ou "chegou a", com o ano).
(function (root) {
const PISTAS = {
  monaco: [
    "Boa tarde, amigos! Estamos em Mônaco, o circuito mais glamouroso do mundo. As ruas do principado viram pista, o muro fica a centímetros do carro, e um errinho só pode custar a corrida inteira.",
    "São três mil trezentos e trinta e sete metros e dezenove curvas. A Sainte-Dévote logo na largada, a subida até o Cassino, o grampo do hotel, o túnel e a chicane do porto. Não existe um metro de descanso.",
    "A corrida de Mônaco nasceu em mil novecentos e vinte e nove e faz parte do Mundial desde mil novecentos e cinquenta. O rei daqui é Ayrton Senna: seis vitórias, cinco delas seguidas, entre oitenta e nove e noventa e três.",
    "Uma curiosidade: o grampo do hotel é a curva mais lenta de toda a Fórmula Um, feita a uns quarenta e oito por hora. Já no túnel os carros passam de duzentos e cinquenta, e perdem de repente boa parte da pressão aerodinâmica.",
    "O que esperar? Ultrapassagem aqui é artigo raro, e quem larga na frente costuma vencer. Por isso a classificação vale quase tanto quanto a corrida. O Piquet dizia que correr em Mônaco é como andar de bicicleta dentro da sala de casa.",
  ],
  interlagos: [
    "Que clima, amigos! Estamos em Interlagos, em São Paulo, a casa do automobilismo brasileiro. A torcida enche as arquibancadas, o sol e a chuva se revezam, e este autódromo já viu finais de campeonato inesquecíveis.",
    "São quatro mil trezentos e nove metros e quinze curvas, no sentido anti-horário, o que castiga o pescoço dos pilotos. Tem o S do Senna logo depois da largada, a Curva do Sol, a Reta Oposta, o Pinheirinho e o Mergulho.",
    "A Fórmula Um chegou a Interlagos em mil novecentos e setenta e dois, e o Mundial veio no ano seguinte. Emerson Fittipaldi ganhou em setenta e três e setenta e quatro, e José Carlos Pace venceu em setenta e cinco. O autódromo leva o nome dele.",
    "Interlagos quer dizer entre lagos, porque o autódromo fica entre duas represas. É uma pista de morro, com subidas e descidas pesadas, e uma chuva repentina pode virar a corrida de cabeça para baixo.",
    "O que esperar? Reviravolta! Em dois mil e sete, o Kimi Räikkönen chegou sete pontos atrás e saiu campeão. Em dois mil e oito, o Felipe Massa venceu em casa e perdeu o título por um ponto, na última volta. Interlagos adora emoção.",
  ],
  monza: [
    "Benvenuti a Monza, amigos! O Templo da Velocidade, dentro de um parque real, na Itália. Aqui o pé fica no fundo quase a volta toda, e a torcida vermelha da Ferrari faz o chão tremer.",
    "Cinco mil setecentos e noventa e três metros e só onze curvas. Três chicanes, as curvas Lesmo, a Curva Grande e a Alboreto, a antiga Parabólica. O resto é reta, e os carros correm com pouca asa para voar.",
    "O autódromo foi inaugurado em mil novecentos e vinte e dois, e o Grande Prêmio da Itália está no Mundial desde a primeira temporada, em mil novecentos e cinquenta. Só uma vez a corrida foi disputada em outro lugar: em oitenta.",
    "Monza é a pista mais veloz do calendário. Em dois mil e vinte e cinco, a média de uma volta de classificação passou de duzentos e sessenta quilômetros por hora, e a velocidade final chegou a mais de trezentos e sessenta.",
    "O que esperar? Muito vácuo e disputa em frenagem forte nas chicanes. Em mil novecentos e setenta e um, cinco carros cruzaram a linha separados por menos de um segundo. Aqui, qualquer um pode vencer até a última curva.",
  ],
  barcelona: [
    "Olá, amigos, estamos em Barcelona, na Catalunha! Uma pista que os pilotos conhecem de cor, de tanto treinar por aqui, e que testa o carro inteiro: curva rápida, curva lenta e uma reta longa.",
    "São quatro mil seiscentos e cinquenta e sete metros e catorze curvas. A um vem no fim de uma reta enorme, a nove é rápida e cega, e a dez é uma esquerda fechada, de terceira marcha.",
    "O Grande Prêmio da Espanha corre aqui desde mil novecentos e noventa e um. Em dois mil e vinte e três, a chicane do final da volta foi retirada, e a pista voltou a ter uma última curva rápida, como antes de dois mil e sete.",
    "Na estreia, em noventa e um, Nigel Mansell e Ayrton Senna andaram roda com roda pela reta dos boxes, numa das cenas mais lembradas da história. Por anos, o circuito também foi a casa dos testes de pré-temporada.",
    "O que esperar? Uma pista exigente com os pneus, onde ultrapassar não é fácil: o carro de trás sofre com o ar sujo da frente nas curvas rápidas. Largar bem e acertar a estratégia vale muito.",
  ],
  silverstone: [
    "Seja bem-vindo à casa da Fórmula Um, amigos! Silverstone, na Inglaterra, onde o campeonato começou em mil novecentos e cinquenta. Curvas rápidas, torcida enorme e o tempo inglês, que nunca avisa o que vai fazer.",
    "Cinco mil oitocentos e noventa e um metros e dezoito curvas. Abbey, Copse, os esses de altíssima velocidade de Maggotts e Becketts, Stowe no fim da reta Hangar e o Club antes da linha de chegada.",
    "Em mil novecentos e cinquenta, Silverstone recebeu a primeira corrida do Mundial de Fórmula Um de todos os tempos, com o rei da Inglaterra na arquibancada. O vencedor foi o italiano Giuseppe Farina.",
    "O circuito nasceu de uma antiga base da Força Aérea britânica, usada por bombardeiros na Segunda Guerra. As primeiras corridas aconteceram sobre as pistas de pouso, e uma multidão foi ver o Grande Prêmio de quarenta e oito.",
    "O que esperar? Lewis Hamilton é o maior vencedor da história de Silverstone. A pista pede carro estável, coragem nas curvas rápidas e pneus bem cuidados. E com o vento mudando de repente, tudo pode acontecer.",
  ],
  melbourne: [
    "Olá, amigos, estamos em Melbourne, na Austrália! Uma pista aberta no meio do parque Albert Park, em volta do lago, que costuma dar a largada da temporada de Fórmula Um.",
    "Cinco mil duzentos e setenta e oito metros e catorze curvas, em ruas do parque, com muro de concreto bem perto. Em dois mil e vinte e dois, a pista foi alargada e ficou mais veloz, sem as antigas curvas nove e dez.",
    "A Fórmula Um correu em Adelaide de mil novecentos e oitenta e cinco a noventa e cinco, e então o Grande Prêmio da Austrália mudou para Melbourne, em noventa e seis. Foi aqui que o Jacques Villeneuve estreou, já fazendo a pole.",
    "O Albert Park é um parque público: quase o ano todo as pessoas passeiam, correm e pedalam onde os carros passam a trezentos por hora. Semanas antes da corrida, a montagem toma conta de tudo.",
    "O que esperar? Pista de rua tem pouco espaço para erro, muro logo ali e muita bandeira amarela. Com carro novo e asfalto sujo nas primeiras voltas, a abertura do campeonato quase sempre traz surpresa.",
  ],
  xangai: [
    "Ni hao, amigos! Estamos em Xangai, na China, uma das maiores cidades do planeta. O autódromo foi construído sobre antigos pântanos e arrozais, e comporta duzentas mil pessoas.",
    "Cinco mil quatrocentos e cinquenta e um metros e dezesseis curvas. O traçado lembra o caractere chinês shàng, que quer dizer acima. As curvas um e dois fecham como um caracol, e a reta de trás tem mais de um quilômetro.",
    "A Fórmula Um chegou a Xangai em dois mil e quatro, e a primeira vitória foi do brasileiro Rubens Barrichello, da Ferrari. Lewis Hamilton é o piloto que mais vezes venceu aqui.",
    "Os prédios do paddock foram desenhados como pavilhões num lago, inspirados no Jardim Yu, um dos mais famosos de Xangai. Já o terreno, antes de virar autódromo, era só pântano e plantação de arroz.",
    "O que esperar? Os pneus dianteiros sofrem nas curvas longas e abertas, e a disputa esquenta no fim da reta de trás, na freada forte para a curva quatorze. Quem acerta o pneu, anda.",
  ],
  suzuka: [
    "Konnichiwa, amigos! Estamos em Suzuka, no Japão, o autódromo que muitos pilotos e fãs adoram. Curvas rápidas, sobe e desce, e uma torcida que conhece cada carro e cada detalhe da corrida.",
    "Cinco mil oitocentos e sete metros e dezoito curvas. Os esses do primeiro setor, a Degner, o grampo, a Spoon e, perto do fim, a famosa cento e trinta R. E tem um segredo: a pista desenha um oito, com a reta de trás passando por cima do começo da volta.",
    "A Fórmula Um correu aqui pela primeira vez em mil novecentos e oitenta e sete. O autódromo pertence à Honda desde mil novecentos e sessenta e dois e, de oitenta e oito a noventa e um, Suzuka decidiu campeonatos quatro anos seguidos.",
    "Foi em Suzuka que Ayrton Senna garantiu os seus três títulos mundiais: oitenta e oito, noventa e noventa e um. As batidas com Alain Prost, em oitenta e nove e em noventa, também aconteceram aqui.",
    "O que esperar? A cento e trinta R, em altíssima velocidade, separa os corajosos dos cautelosos. Ultrapassar é difícil, então largar bem faz diferença, e a chuva pode embaralhar tudo.",
  ],
  bahrein: [
    "Boa noite, amigos! Estamos em Sakhir, no Bahrein, no meio do deserto. Esta pista recebeu o primeiro Grande Prêmio do Oriente Médio e hoje tem pôr do sol, refletores e muito calor sobre o asfalto.",
    "Cinco mil quatrocentos e doze metros e quinze curvas. Uma reta de largada longa, a curva um para uma freada forte, e uma reta de trás que dá chance de ultrapassar. É muita freada e muita saída de curva.",
    "O Bahrein recebeu a Fórmula Um pela primeira vez em dois mil e quatro, a primeira corrida da categoria no Oriente Médio. Desde dois mil e quatorze, a corrida passou a ser noturna, sob refletores.",
    "Quando o circuito foi construído, havia um medo: a areia do deserto invadir a pista. A solução foi espalhar uma cola especial na areia em volta, para prendê-la ao chão.",
    "O que esperar? Um asfalto abrasivo, que gasta muito o pneu traseiro, e freadas fortes que pedem coragem. Com a noite chegando, a temperatura cai e o carro muda de comportamento durante a corrida.",
  ],
  jeddah: [
    "Boa noite, amigos! Bem-vindos a Jeddah, na Arábia Saudita, à beira do Mar Vermelho. É a pista de rua mais rápida do mundo, com vinte e sete curvas e muros dos dois lados.",
    "Seis mil cento e setenta e quatro metros e vinte e sete curvas, numa sequência rápida e cega, com muro colado e pouquíssimo espaço de escape. É a terceira pista mais longa do calendário, atrás de Spa e de Las Vegas.",
    "A primeira corrida foi em cinco de dezembro de dois mil e vinte e um, na penúltima etapa do campeonato, e foi daquelas bem tumultuadas, com bandeira vermelha e muita disputa. Lewis Hamilton ganhou.",
    "É a pista de rua mais veloz da história: a pole de dois mil e vinte e cinco teve média de duzentos e cinquenta e quatro quilômetros por hora. Curvas de alta velocidade com muro pertinho: quem erra paga caro.",
    "O que esperar? Safety car, bandeira amarela e relargadas apertadas. Como as curvas são cegas, a visão é curta, e a corrida pede confiança e sangue frio de quem pilota.",
  ],
  miami: [
    "Olá, amigos, bem-vindos a Miami, na Flórida! Uma pista montada em volta do estádio de futebol americano, com muito calor, muita música e um clima de festa que só esta cidade tem.",
    "Cinco mil quatrocentos e doze metros e dezenove curvas. Retas compridas, freadas fortes e, no final da volta, um trecho lento e travado, bem diferente do começo, onde o carro precisa de tração e os pilotos de paciência.",
    "A Fórmula Um chegou a Miami em dois mil e vinte e dois, depois de a cidade de Miami Gardens votar contra e mudar de ideia, em abril de dois mil e vinte e um. Max Verstappen venceu a primeira edição.",
    "A pista é temporária: é montada a cada edição nos estacionamentos do estádio e desmontada depois. Cabem sessenta e cinco mil pessoas, e o desenho foi escolhido entre dezenas de projetos.",
    "O que esperar? Muito calor e umidade, asfalto sujo nos primeiros treinos e ultrapassagens possíveis no fim das retas. Em dois mil e vinte e quatro, Lando Norris conquistou aqui a sua primeira vitória na Fórmula Um.",
  ],
  montreal: [
    "Bonjour, amigos! Estamos em Montreal, no Canadá, numa ilha no meio do rio São Lourenço. O circuito leva o nome do piloto canadense mais querido da Fórmula Um: Gilles Villeneuve.",
    "Quatro mil trezentos e sessenta e um metros e catorze curvas. Retas longas, chicanes fechadas, um grampo de cento e oitenta graus e, no final, a curva que dá nome ao Muro dos Campeões.",
    "O circuito foi inaugurado em mil novecentos e setenta e oito, e o Gilles Villeneuve ganhou a primeira corrida, pela Ferrari. Depois da morte dele, em oitenta e dois, o autódromo passou a levar o seu nome.",
    "Em mil novecentos e noventa e nove, o Muro dos Campeões acabou com a corrida de três campeões do mundo: Damon Hill, Michael Schumacher e Jacques Villeneuve. O muro é o da última curva, bem na saída da chicane.",
    "O que esperar? Freadas fortes, safety car e suspense. Em dois mil e onze, a chuva fez a corrida durar mais de quatro horas, a mais longa da história. E foi aqui que Lewis Hamilton venceu pela primeira vez, em dois mil e sete.",
  ],
  redbullring: [
    "Olá, amigos! Estamos em Spielberg, na Áustria, no meio das montanhas da Estíria. Um autódromo pequeno e bonito, com verde para todo lado e uma torcida que vem de toda a Europa.",
    "Quatro mil trezentos e vinte e seis metros e só dez curvas, uma das voltas mais curtas do calendário. É sobe e desce, com freadas fortes no fim de cada reta e quase nenhum respiro entre uma curva e outra.",
    "A Fórmula Um correu aqui pela primeira vez em mil novecentos e setenta, no antigo Österreichring, com dezoito corridas seguidas até oitenta e sete. Em dois mil e dezenove, a curva um passou a se chamar Niki Lauda, em homenagem ao tricampeão.",
    "Em dois mil e vinte, no meio da pandemia, foi aqui que a temporada começou, com duas corridas seguidas no mesmo autódromo: o Grande Prêmio da Áustria e o da Estíria.",
    "O que esperar? Como a volta é curta, os tempos são apertadíssimos e qualquer erro troca de posição. As ultrapassagens acontecem nas freadas fortes, e o clima de montanha pode trazer chuva do nada.",
  ],
  spa: [
    "Boa tarde, amigos! Estamos em Spa-Francorchamps, na Bélgica, no meio das florestas das Ardenas. Para muitos pilotos e fãs, a pista mais bonita e mais desafiadora de toda a Fórmula Um.",
    "Sete mil e quatro metros, a pista mais longa do calendário, com dezenove curvas. A descida até a Eau Rouge e a subida do Raidillon, a longa reta Kemmel, Les Combes, a rápida Pouhon e a Blanchimont, antes da chicane.",
    "O primeiro Grande Prêmio da Bélgica em Spa foi em mil novecentos e vinte e cinco, e a Fórmula Um correu aqui já na temporada de abertura do Mundial, em cinquenta. O traçado antigo tinha mais de catorze quilômetros.",
    "Spa tem clima só dele: pode chover em um trecho da pista e estar seco no outro. Em dois mil e vinte e um, a corrida terminou depois de três voltas atrás do safety car, a mais curta da história do Mundial.",
    "Michael Schumacher estreou na Fórmula Um aqui, em mil novecentos e noventa e um, e ganhou a sua primeira corrida em Spa no ano seguinte. Ao todo, foram seis vitórias na Bélgica.",
  ],
  hungaroring: [
    "Olá, amigos! Estamos no Hungaroring, perto de Budapeste, na Hungria. Verão forte, calor de rachar, poeira na pista e um autódromo que muita gente chama de Mônaco sem muros.",
    "Quatro mil trezentos e oitenta e um metros e catorze curvas, num vale apertado. É curva atrás de curva, quase sem reta, o que pede muita pressão aerodinâmica e dificulta qualquer ultrapassagem.",
    "Em mil novecentos e oitenta e seis, foi a primeira corrida da Fórmula Um atrás da Cortina de Ferro, e uma multidão de húngaros foi assistir, em plena Guerra Fria.",
    "A pista fica pouco tempo em uso durante o ano e tem um solo arenoso, por isso é sempre empoeirada e escorregadia no começo do fim de semana. Só depois de várias sessões é que a borracha gruda no asfalto.",
    "O que esperar? Lewis Hamilton chegou a oito vitórias aqui, o maior vencedor da pista. Como ultrapassar é difícil, quem larga na frente e acerta a estratégia costuma fugir dos outros. A classificação vale ouro.",
  ],
  zandvoort: [
    "Goedemiddag, amigos! Estamos em Zandvoort, nas dunas junto ao Mar do Norte, na Holanda. Um mar de laranja nas arquibancadas, numa festa de torcida que faz a pista tremer.",
    "Quatro mil duzentos e cinquenta e nove metros e catorze curvas. Duas delas são inclinadas como num oval: a Hugenholtz, na curva três, com dezenove graus, e a Arie Luyendyk, no fim da volta, com dezoito.",
    "O circuito foi inaugurado em mil novecentos e quarenta e oito, em parte sobre estradas feitas pelo exército alemão durante a ocupação. A Fórmula Um voltou em dois mil e vinte e um, depois de trinta e seis anos sem corrida aqui.",
    "Max Verstappen venceu as edições de dois mil e vinte e um, vinte e dois e vinte e três, diante da torcida holandesa. E Zandvoort tem despedida marcada: dois mil e vinte e seis é o último ano do contrato.",
    "O que esperar? É uma pista estreita, que pede muita aderência e quase não deixa ultrapassar. A classificação é decisiva, e as curvas inclinadas deixam o carro grudado no asfalto.",
  ],
  madri: [
    "Hola, amigos! Estamos em Madri, no circuito Madring, ao redor do centro de exposições da cidade. Uma pista nova e híbrida: parte rua, parte autódromo, com o público pertinho de tudo.",
    "Cinco mil quatrocentos e catorze metros e vinte e duas curvas. O grande destaque é a La Monumental, uma curva inclinada, coisa rara na Fórmula Um, com até treze graus e meio de inclinação.",
    "A Fórmula Um já correu perto de Madri, no autódromo do Jarama, nos anos sessenta, setenta e início dos oitenta. Depois de mais de quarenta anos, voltou em dois mil e vinte e seis, num contrato que vai até dois mil e trinta e cinco.",
    "O circuito fica pertinho do aeroporto de Barajas e foi desenhado pelo italiano Jarno Zaffelli. A capacidade inicial é de cento e dez mil pessoas, com planos de chegar a cento e quarenta mil.",
    "O que esperar? Por ser nova, a pista ainda guarda surpresas: aderência que muda a cada sessão e um traçado cheio de curvas de média velocidade. Quem entender a pista primeiro, sai na frente.",
  ],
  baku: [
    "Salam, amigos! Estamos em Baku, no Azerbaijão, à beira do Mar Cáspio. Uma pista de rua que passa ao lado das muralhas da cidade antiga e por avenidas largas, com retas gigantes.",
    "Seis mil e três metros e vinte curvas. Uma reta de mais de dois quilômetros ao longo da avenida e, logo depois, um dos trechos mais estreitos do calendário, com apenas sete metros e meio, junto à Torre da Donzela.",
    "A Fórmula Um estreou em Baku em dois mil e dezesseis, com o Grande Prêmio da Europa. No ano seguinte, a corrida passou a se chamar Grande Prêmio do Azerbaijão.",
    "A cidade antiga de Baku é Patrimônio da Humanidade, e a pista passa bem à sombra dela. A reta principal é tão longa que os carros chegam perto de trezentos e sessenta quilômetros por hora.",
    "O que esperar? Baku é famosa por corridas malucas: safety car, bandeira vermelha, surpresa nas últimas voltas. O vácuo na reta facilita a ultrapassagem, mas um errinho no muro custa a corrida.",
  ],
  singapura: [
    "Boa noite, amigos! Estamos em Singapura, a corrida sob refletores que brilha no meio da cidade. Calor, umidade e as luzes dos prédios da baía formam um dos cenários mais bonitos do campeonato.",
    "Quatro mil novecentos e vinte e sete metros e dezenove curvas, entre prédios e pontes. A pista passa pela ponte Anderson e pelas ruas da baía, sempre com muro bem perto e poucas retas longas.",
    "Em dois mil e oito, Singapura recebeu a primeira corrida noturna da história da Fórmula Um. Fernando Alonso venceu, numa prova que ficou famosa por uma polêmica revelada no ano seguinte.",
    "São cerca de mil e seiscentos refletores, que deixam a pista quatro vezes mais iluminada que um estádio comum. À noite, o asfalto brilha, mas o calor continua lá em cima.",
    "O que esperar? Uma das corridas mais cansativas do ano: calor, umidade enorme e pista travada, sem descanso. É comum o safety car aparecer, e a prova chega perto do limite de duas horas.",
  ],
  austin: [
    "Howdy, amigos! Estamos em Austin, no Texas! O Circuito das Américas é o lar da Fórmula Um nos Estados Unidos, com festa, música ao vivo e uma torre de observação de setenta e sete metros.",
    "Cinco mil quinhentos e quatorze metros e vinte curvas. A pista começa com uma subida impressionante até a curva um, de mais de onze por cento de inclinação, e depois vêm esses rápidos, uma reta longa e a parte do estádio.",
    "A Fórmula Um voltou aos Estados Unidos em dois mil e doze, depois de quatro temporadas sem corrida no país, e foi Lewis Hamilton quem venceu a primeira prova em Austin, em dezoito de novembro.",
    "O traçado foi inspirado em trechos de outros circuitos famosos: os esses de Silverstone, o estádio de Hockenheim e a curva oito, de Istambul. É como uma coleção dos melhores momentos do automobilismo.",
    "O que esperar? Muito desnível, curvas que testam o carro todo e uma pista cheia de ondulações, que sacodem os pilotos. O Texas é quente, e o fim de semana ainda tem show e festa.",
  ],
  mexico: [
    "Hola, amigos! Estamos na Cidade do México, no Autódromo Hermanos Rodríguez, a mais de dois mil e duzentos metros de altitude. Um dos lugares mais emocionantes do calendário, com uma torcida que faz festa de verdade.",
    "Quatro mil trezentos e quatro metros e dezessete curvas. Uma reta de largada enorme, uma sequência de esses no meio e a passagem pelo estádio Foro Sol, onde a torcida fica em cima do carro.",
    "O Grande Prêmio do México entrou no Mundial em mil novecentos e sessenta e três. A pista leva o nome dos irmãos Ricardo e Pedro Rodríguez, ídolos do país. Depois de uma longa pausa, a Fórmula Um voltou em dois mil e quinze.",
    "O ar fino dificulta a refrigeração dos carros e tira pressão aerodinâmica. Por isso as equipes usam as asas mais carregadas do ano, mesmo numa pista com uma das maiores retas do calendário.",
    "O que esperar? Uma largada com a primeira curva logo depois da reta gigante, que costuma embolar o pelotão. E depois o estádio: som, festa e uma torcida que empurra o piloto da casa.",
  ],
  lasvegas: [
    "Boa noite, amigos! Estamos em Las Vegas, a capital do entretenimento! A corrida acontece à noite, no meio das luzes dos cassinos, com a famosa avenida Strip virando pista de corrida.",
    "Seis mil duzentos e um metros e dezessete curvas, em cinquenta voltas. A reta da Strip tem cerca de um quilômetro e novecentos metros, e os carros passam de trezentos por hora ao lado dos cassinos.",
    "A Fórmula Um já correu em Las Vegas, em mil novecentos e oitenta e um e oitenta e dois, num circuito montado no estacionamento de um cassino. A volta moderna foi em dois mil e vinte e três, e Max Verstappen venceu a primeira.",
    "É a segunda pista mais longa do calendário, só atrás de Spa. A corrida é à noite, quando o deserto esfria, e o frio deixa o asfalto mais difícil, porque é complicado manter os pneus na temperatura certa.",
    "O que esperar? Velocidade máxima, vácuo na reta e ultrapassagem em freada forte. Os pneus esfriam e a pista é escorregadia, então prepare-se para erros e surpresas no meio da noite.",
  ],
  catar: [
    "Boa noite, amigos! Estamos em Losail, no Catar, um autódromo no deserto, iluminado como um estádio gigante. Curvas largas e rápidas, que fazem os pilotos sentir a força do carro nas costas.",
    "Cinco mil quatrocentos e dezenove metros e dezesseis curvas. A reta principal tem mais de um quilômetro, e depois dela vêm curvas amplas e muito rápidas, uma atrás da outra.",
    "A Fórmula Um estreou em Losail em dois mil e vinte e um, e Lewis Hamilton ganhou a primeira corrida. Antes, a pista já era conhecida pelas motos: a MotoGP corre aqui desde dois mil e quatro e teve a sua primeira corrida noturna em dois mil e oito.",
    "A iluminação permanente, instalada em dois mil e sete, foi considerada a maior do mundo em um projeto esportivo permanente. À noite, a pista fica clara como se fosse dia.",
    "O que esperar? Calor e umidade castigando o corpo dos pilotos. Em dois mil e vinte e três, o calor foi tão forte que muitos tiveram dificuldade para terminar. E foi aqui, na corrida sprint, que Max Verstappen conquistou o tricampeonato.",
  ],
  abudhabi: [
    "Boa tarde, amigos! Estamos em Abu Dhabi, na ilha de Yas, onde a corrida começa ao pôr do sol e termina com a pista toda iluminada. É o palco final do campeonato, e que cenário!",
    "Cinco mil duzentos e oitenta e um metros e dezesseis curvas. Duas retas compridas, um grampo depois da primeira, a passagem por baixo do hotel e a saída dos boxes por um túnel sob a pista.",
    "A estreia foi em dois mil e nove, com vitória de Sebastian Vettel. No ano seguinte, aqui mesmo, ele se tornou o mais jovem campeão da história, até então.",
    "Em dois mil e vinte e um, a pista mudou: o grampo da primeira parte virou uma curva só, e o trecho do final ficou mais rápido, para facilitar a ultrapassagem.",
    "O que esperar? Emoção até o fim. Foi aqui que, em dois mil e vinte e um, Max Verstappen passou Lewis Hamilton na última volta e ficou com o título. Aqui a emoção vai até a bandeirada.",
  ],
};

// ---------- a escolha (pura, testável) ----------
// o mesmo hash da transmissão: a fala sorteada pela semente do GP é igual para todos da sala
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
const lista = [];
for (const [pista, textos] of Object.entries(PISTAS)) textos.forEach((texto, i) => lista.push({ id: `${pista}-${i + 1}`, texto, pista }));
const porPista = (p) => lista.filter((f) => f.pista === p);
function escolher(pista, semente) { // a fala da pista para este GP (ou null se a pista não tem fala)
  const todas = porPista(pista); if (!todas.length) return null;
  return todas[Math.min(todas.length - 1, Math.floor(hash(`${semente}:${pista}:narrador`) * todas.length))];
}
const api = { PISTAS, FALAS: lista, porPista, escolher };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.NarradorFalas = api;
})(typeof self !== "undefined" ? self : this);
