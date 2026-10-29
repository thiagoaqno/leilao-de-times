# Kit de pista (Corrida)

Peças reaproveitáveis para montar o cenário de qualquer GP. Cada pista de F1 tem uma configuração em `../gps/<pista>.js`,
registrada em `../gps/index.js`; `../pista.js` lê a configuração e chama as peças. Nada daqui muda a física: é cenário e
som. Mônaco (`../gps/monaco.js`) usa todas as peças e é o exemplo completo; Interlagos (`../gps/interlagos.js`) e Melbourne (`../gps/melbourne.js`) trazem o lago, arquibancadas, boxes e skyline de metrópole; Bahrein (`../gps/bahrein.js`, `../bahrein.js` e as peças exclusivas em `bahrein/`: prédio dos boxes e tribuna com cobertura em velas, Torre de anéis azuis, praça e paddock com tamareiras, heliporto, estacionamentos, torres de refletores com luz de noite, escape em mosaico, pórtico, mureta e dunas em degraus) é o exemplo de GP noturno completo; Silverstone (`../gps/silverstone.js`, `../silverstone.js` e `silverstone/pecas.js`) traz o The Wing, o aeródromo da RAF, as aldeias, os campos e o camping, em cima do kit 2. `boxes.js` não tem chave: é uma função (`prediosDosBoxes(tr, add, cfg)`, o prédio das garagens com os painéis em cima) que o `cenario` do GP chama (Melbourne, Bahrein). `holofotes.js` também: `holofotes(tr, add, { passo, recuo, alto, de, ate })` põe postes altos com painel de lâmpadas virado para a pista (3 `InstancedMesh`), só onde `livre`/`ocupado` deixam; serve para os GPs noturnos (Bahrein).

## Como fazer um GP novo

1. **O traçado** em `../pistas.js` (vértices `[x, y, raio]` no quadrado de 1600, `scale`, `width`, `hills`, `walls`, `muro`,
   `wall`, `largada`). Desenhe em cima do mapa oficial do circuito, curva por curva, como Mônaco e Interlagos. Pista com
   guard-rail colado (rua) usa `walls: true, muro: true`; autódromo com área de escape, `walls: false`.
2. **As cores** em `../cena.js` (`LOOK.<id>`) e `../pista.js` (`THEMES.<id>`): céu, neblina, chão, zebra.
3. **A configuração** em `../gps/<id>.js` e uma linha em `../gps/index.js`.
4. **Conferir:** `node --test tests/corrida*.test.js` (nunca o `npm test` inteiro). O teste de robôs dá uma volta em todas as
   pistas, `tests/corrida-pistas-volta.test.js` percorre a linha central (e a beirada) com a conferência de checkpoints do
   navegador e `tests/corrida-pistas-invasao.test.js` monta a cena de cada GP e acusa o que ficou dentro da pista (ver
   "Conferências automáticas" abaixo). Depois, uma volta no navegador com `#debug` (`window.__corrida.race.tr` tem os
   números de cada peça: `chaoGP`, `ambienteGP`, `somGP`...).

## A configuração (todas as chaves são opcionais)

| Chave | Peça | O que faz |
| --- | --- | --- |
| `asfalto: true` | `../asfalto-gp.js` | Asfalto de GP com relevo fino, linhas de borda e a borracha nas curvas (tira os cones). |
| `chao: {...}` | `chao.js` → `chaoGP` | `margem` (`"sarjeta"` de rua ou `{ cor }`), `zebra` (`cores`, `dentro`, `fora`: raios das curvas que ganham zebra), `amarelas` (trechos `[f0, f1]` com zebra amarela alta), `faixasPedestre`, `tracejado`, `sc` (`[[f, "SC 1"]]`), `grid: true`, `remendos`, `bueiros`. Grava `tr.zebras` (as faíscas só saem ali). |
| `escape: {...}` | `escape.js` → `escapeGP` | A área de escape depois da zebra: `brita`, `listrado` (asfalto pintado, `cores` padrão verde e amarelo) e `pneus` (pilhas de 3 pneus), cada um uma lista `[f0, f1, lado]` (`lado`: 1, -1, 0 = os dois, `"fora"` ou `"dentro"` da curva). `britaCurvas` (raio, ex.: `450`: brita automática do lado de fora das curvas mais fechadas que ele, sem listar trechos) e `corBrita`. `largura` (23). Com `escape`, a brita de pista.js sai. |
| `guardrail: {...}` | `beira.js` → `guardRail` | O guard-rail em 8 painéis de 6 m: `paineis` (nomes de `marcas.js`, `null` = listras) e `cores` das listras. Só em pista com `walls`. |
| `arquibancadas: {...}` | `arquibancadas.js` → `arquibancadas` | Arquibancadas lotadas em rampa, com fundo, marquise (`cobertura`) e colunas: `trechos` `[{ de, ate, lado, degraus, cor, encosto, cobertura, torcida }]` (`torcida`: as cores das camisas, a torcida vermelha de Monza) (`de`/`ate` são frações da volta, `lado` 1 ou -1). Põem `tr.arquibancadas` (o som da torcida) e `tr.reservado`. Roda antes do `cenario`. |
| `cenario(tr, ctx)` | a pista | O que só ela tem, antes de tudo (Mônaco: porto, piscina, túnel, Cassino). Pode definir `tr.coberto(i)` (túnel), `tr.ocupado(x, z, i)`, `tr.arquibancadas` (`[[i0, i1]]`, para o som da torcida) e pôr lugares em `tr.reservado` (`[x, z, raio]`). |
| `ambiente: {...}` | `ambiente.js` → `ambienteGP` | Cerca sobre o guard-rail, painéis de patrocinador (`marcas`), mastros com a `bandeira` (duas cores, de cima e de baixo; com três, faixas verticais como a da Itália), postos de fiscais (`posto`: a marca), placas de frenagem (`placas`: 100 e 50 m, ou 150, 100 e 50), `outdoors` (as marcas dos outdoors de `vida.js`), placas de 100/50 m, guias de luz no túnel. Grava `tr.postosGP` e `tr.marcasGP` (os outdoors de `vida.js` passam a ter as marcas). |
| `parque: {...}` | `parque.js` → `parque` | O bosque que fecha a pista dos dois lados (Monza, Spa...): árvores altas (copas e pinheiros em `InstancedMesh`, sem sombra) depois da área de escape. `recuo` (24), `fundo` (190), `alturas` (`[150, 260]`), `densidade` (1,3 por ponto e por lado), `folhas` (cores), `coniferas` (0,18), `de`/`ate`. Respeita `tr.reservado` (arquibancadas, prédios, passarelas). |
| `passarelas: {...}` | `marcos.js` → `passarelas` | Passarelas com faixas de patrocinador: `candidatos` (frações, em ordem), `marcas`, `max`. Tiram as bandeirolas coloridas. |
| `marcos(tr, ctx)` | a pista | Marcos próprios depois das passarelas (Mônaco: a capela de Sainte Dévote). |
| `postes: {...}` | `marcos.js` → `postes` | Postes de rua atrás do guard-rail: `passo`, `cor`. |
| `montanha: {...}` | `marcos.js` → `montanha` | Serra no horizonte: `angulo` (-π/2 = norte), `afastamento`, `altura`, `largura`, `rocha`, `mato`, `longe`. |
| `vida: {...}` | `vida.js` → `vidaGP` | `helicoptero` (padrão sim), `gaivotas` (lista ou função `(tr) => [{ x, z, raio }]`), `fiscais` (padrão sim), `som` (as regiões de `som.js`). |
| `fachadas: {...}` | `beira.js` → `fachadas` | Prédios com sacadas, venezianas, toldos e telhados: `cores` (`[parede, veneziana]`), `toldos`, `telhas` (0 a 1). `FACHADAS_MEDITERRANEO` é o padrão. |
| `boxes: {...}` | `corredor-boxes.js` → `boxesGP` | O corredor dos boxes das regras de F1: asfalto de 34 m de largura ao lado da reta, linhas de entrada (branca) e saída (vermelha), mureta, o quadrado pintado onde o carro para e as 10 garagens com os mecânicos, na cor de quem usa cada uma (`grp.userData.colorir(cores)`). O traçado vem de `boxes: { entra, para, sai, lado }` em `../pistas.js` (frações da volta) e da conta `F1Regras.corredor`; toda pista com `boxes` ganha o corredor sozinha. Chaves: `garagens: false` (só o corredor, Mônaco), `mureta`, `asfalto`, `cores`; `boxes: false` desliga. Só aparece com as regras de F1 (`tr.mostrarBoxes`) e tira os balizadores do meio dele. |
| `depois(tr, ctx)` | a pista | Por cima dos enfeites soltos (Interlagos: `../interlagos.js`). |
| `beira: {...}` | `../pista.js` | O que nasce na beira e longe da pista, nas proporções de cada coisa (0 a 1): `arvores`, `palmeiras`, `predios` (com janelas, nas `cores`), `vidro` (prédios de vidro), `altura` dos prédios e `longe: {...}` com as mesmas chaves para longe da pista. Respeita `tr.reservado`. |
| `horizonte` | `../pista.js` | Os morros de longe: `false` tira (deserto, mar, planície); `{ cor }` muda a cor. |

`ctx` traz `{ add, r, hAt, size, aguaTex, palms, yachts, jungle, blds }`: `add` põe na cena da pista, `hAt(x, z)` dá a
altura do chão e as listas recebem palmeiras, iates, árvores e prédios (desenhados por `pista.js`).

## O GP simples (`gp-simples.js`)

`gpSimples(id, opções)` devolve a configuração inteira de um GP com as peças de sempre: asfalto, zebras, grid, escape (brita
do lado de fora das curvas), a tribuna da reta do lado de fora, o prédio dos boxes (`boxes.js`) do lado do corredor, painéis,
bandeira, passarela e som de campo; com `rua: true`, sarjeta, faixas, guard-rail com os painéis, postes e som de cidade.
É o ponto de partida das pistas convertidas de `bacinger/f1-circuits` por `ferramentas/circuitos-f1.js` (Spa, Suzuka...),
antes de cada uma ganhar o cenário fino. Opções: `rua`, `bandeira`, `marcas`, `posto`, `zebra`, `margem`, `escape`,
`arquibancadas` (trechos a mais), `tribuna: false`, `corTribuna`, `montanha`, `parque`, `beira`, `fachadas`, `horizonte`,
`som`, `gaivotas`, `amarelas` e `cenario(tr, ctx)` (o que só aquela pista tem, como a ponte do oito de Suzuka).

## O som (`som.js`)

Regiões que o kit acha sozinho: **túnel** (`tr.coberto`: zumbido e eco do motor; o resto quase some), **torcida**
(`tr.arquibancadas`) e **helicóptero**. Regiões que o GP diz em `vida.som`, funções `(tr, x, y) => 0 a 1`
(`pertoDe((tr) => ponto, raio)` ajuda): `porto` (ondas, gaivotas, buzina de iate), `fonte`, `sinos`, `campo` (vento e
passarinhos de autódromo) e `cidade` (número ou função; sem ela, `1 - 0,7 × porto`). Tudo passa por `Sound.ambiente()`.

## As marcas (`marcas.js`)

Os patrocinadores reais desenhados no canvas (o jogo é só para os amigos): `MARCAS` (fundo, cor, letra e o traço de
cada logo), `PATROCINIO` (a ordem padrão), `desenharMarca(ctx, nome, x, y, w, h)` e `marcaTex(nome, w, h)`. Marca nova:
uma entrada em `MARCAS` (e, se o logo pedir, um traço novo em `desenharMarca`).

## Conferências automáticas (`tests/ajuda-cena/`)

A cena 3D de uma pista monta dentro do Node, sem navegador e sem WebGL (`tests/ajuda-cena/index.mjs`: `montar(id)` devolve
`{ tr, THREE }`; o desenho nos canvas é de mentira, a geometria, os materiais e as posições são os verdadeiros; `rastrear: true`
anota de que arquivo:linha veio cada objeto).

- **Invasão** (`invasao.mjs`, `tests/corrida-pistas-invasao.test.js`): todo vértice (e cada instância) de 22 cm a 2,4 m acima do
  asfalto tem que ficar a mais de meia largura + 1 m de QUALQUER ponto da linha central, inclusive dos trechos vizinhos de um
  grampo. As fitas que acompanham a pista (zebra, brita, guard-rail, terreno) não entram: num grampo mais fechado que a meia
  largura elas se dobram sobre a própria curva. Como se evita: as peças usam `livre()`/`ocupado()`, que agora medem a distância
  EXATA (`tr.distAt`; a grade grossa de antes, `tr.distAprox`, erra até 40 e só serve para o relevo), e a fita deslocada por um
  lado fixo (arquibancada, prédio dos boxes) usa `recortar(tr, i0, i1, [deslocamentos])`, que devolve só o pedaço onde a fita
  fica onde foi desenhada. Regra boa para uma peça nova: nada pode estar mais perto da pista do que o deslocamento que você
  desenhou (`tr.distAt(x, z) >= deslocamento - 2`).
- **Desempenho** (`medir.mjs`: `node tests/ajuda-cena/medir.mjs monaco spa`): chamadas de desenho, triângulos, materiais,
  texturas e sombras da pista inteira e como a câmera do jogo vê (média de 12 pontos da volta), e `tests/corrida-pistas-desempenho.test.js`
  guarda os tetos. `CORRIDA_RAIZ=<outra cópia do projeto>` compara com uma versão anterior.

## Juntar o que está parado (`fundir.js`)

No fim de `buildWorld`, `fundirEstaticos(tr, { simular })` junta o cenário: materiais iguais viram um só, as malhas paradas do
mesmo material e da mesma região viram uma malha só, as instâncias pesadas espalhadas pela volta (cerca, fachadas, árvores)
viram um InstancedMesh por região (a tela e a sombra cortam o que está longe) e o que sobrou parado deixa de recalcular a
matriz a cada quadro. Fica de fora o que se mexe: tudo que o resto do jogo guarda em `tr` (portais, cones, pórtico, boxes...) e
o que as animações de `vida*.js` e dos GPs movem, descoberto rodando a animação por alguns segundos em 24 pontos da volta (por
isso uma peça que anda tem que mudar de lugar, tamanho ou visibilidade, ou a matriz de um InstancedMesh, dentro de
`animarVida`/`tr.animarPista`). Peça que se mexe por outro caminho (um evento, um clique) precisa ficar guardada em `tr`.
O que se repete em muitas cópias que se mexem (asas, gaivotas, barcos, cabines da roda-gigante) é um InstancedMesh com as
matrizes calculadas na animação, e só do que está perto da câmera.

## Regras

- Português nos nomes e comentários, no tom do resto.
- Peça repetida vai em `InstancedMesh` ou numa malha só por material (`comum.js`: `lotes`, `tira`, `instancias`); sem
  luz dinâmica nova.
- Antes de pôr algo na beira, confira `livre(tr, x, z, folga)` (o grampo vizinho; a folga conta a partir da MEIA LARGURA e tem que
  incluir o tamanho da peça: uma copa de 30 de raio pede 30 a mais) e `ocupado(tr, x, z)`. Fita num deslocamento fixo: `recortar()`.
- Peça nova que serve para mais de uma pista entra aqui, com a sua chave na configuração e uma linha nesta tabela.

## Kit 2: assets de cenário soltos (`montagem.js`, `box-equipe.js`, `coberturas.js`, `torres.js`)

Funções que devolvem um `THREE.Group` (origem no chão, frente para +z, 1 unidade ≈ 10 cm; ponha com `g.position`/`g.rotation.y` e
`add(g)`). Cor chapada por vértice, uma malha por material (um box inteiro fica em ~4 chamadas), canvas pequeno só para letreiros; não
dependem de `cena.js`. Nenhuma pista usa ainda: antes de pôr na beira, confira `livre`/`ocupado` (`comum.js`) com o `userData` de cada um.
Para ver lado a lado: `/corrida/kit/demo.html#box | reta | tribuna | torre | portico | tenda | tudo`.

| Função | Parâmetros principais |
| --- | --- |
| `boxEquipe(o)` | `cor`, `corFaixa`, `corTexto`, `texto`, `portas`, `larguraPorta`, `altoPorta`, `abertura` (0 a 1, ou um por porta), `profundidade`, `carros`, `corCarro`, `interior`, `mureta` (`true` ou `{ logo, cor, distancia }`) |
| `retaDosBoxes(o)` | `equipes` (uma cor por equipe: toldos), `baiasPorEquipe`, `larguraBaia`, `profundidade`, `altoAndar`, `cores` (assentos), `tribuna`, `cobertura`, `corFaixa`, `estrutura`, `publico` |
| `tribunaCoberta(o)` | `comprimento`, `degraus`, `altura`, `fundo`, `cores`, `secoes`, `cobertura` (cor ou `null`), `alcance`, `folga`, `estrutura`, `publico`, `camisas` (as cores das camisas da torcida; Monza veste vermelho), `colunas`, `semente` |
| `velas(o)` / `tendaPaddock(o)` | `modulos`, `filas`, `vao`, `profundidade`, `alturaBeiral`, `alturaPico`, `mastro`, `cor`, `postes` · tenda: `texto`, `corFaixa`, `mesas`, `corMesas` |
| `torreControle(o)` | `raio`, `aneis`, `alturaAnel`, `corAneis`, `corVidro`, `corGrade`, `corpo`, `corCorpo`, `cobertura` (`"velas"`, `"cupula"`, `"plana"`), `corCobertura`, `bandeira` (duas cores ou `null`), `pico` |
| `portico(o)` | `vao`, `alto`, `viga`, `cor`, `corColuna`, `texto`, `corTexto`, `corFaixa`, `luzes` (semáforos de largada) |
| `pilhaPneus`, `rackPneus`, `carrinhoFerramentas`, `carroF1`, `muretaPit` | pequenos; as versões `...Em(montador, x, z, o)` põem num `Montador` já aberto (sem malha nova) |

Melbourne (`../melbourne.js` e `melbourne/`, assets exclusivos: alambrado e mureta de publicidade, grama listrada, skyline sem neblina, bosques, arquibancada longa, complexo dos boxes e paddock sobre o kit 2): usa as opções novas `ambienteGP({ cerca: false })` e `portico({ textura })`.

Jeddah (`../gps/jeddah.js` e `../jeddah.js`) traz assets exclusivos em `kit/jeddah/` (mar e corniche, lagoa, dhows e marina, palmeiras, prédio dos boxes escalonado, Fonte do Rei Fahd, Mesquita Al-Rahma, cidade com a Jeddah Tower e as marcas stc/Saudia/Roshn), usados só por esse GP.

Suzuka (`../gps/suzuka.js`, `../suzuka.js`) traz peças exclusivas em `kit/suzuka/`: `viaduto.js` (o cruzamento em 8), `roda-gigante.js` (que gira), `colinas.js` (morros, cedros, cerejeiras), `japao.js` (torii, lanternas, nobori, estacionamento, hotel, atrações).

Monza (`../gps/monza.js`, `../monza.js`) traz peças exclusivas em `kit/monza/`: `pecas.js` (`complexoDosBoxes`: o prédio dos boxes com o Paddock Club e o terraço de velas; `podioMonza`: a torre e o pódio suspenso que avança sobre a reta, com os estais e o palco; `torreCronometragem`: as torres de 1955 com o placar luminoso; `torreDeLuz`; as texturas `bandeiraItalia` e `bandeiraTifosi`), `sopraelevata.js` (o anel inclinado de concreto, com a ponte sobre o Serraglio) e `parque.js` (`bosque`: árvores altas de copa em dois lóbulos, com moitas e pinheiros; `folhasCaidas`; `gramado` em faixas; `carvalhoDoAscari`). O GP usa a opção nova `camisas` de `tribunaCoberta` e a chave `depois` para o parque, as bandeiras da torcida e a faixa no pórtico da largada.

Spa-Francorchamps (`../gps/spa.js`, `../spa.js`) traz peças exclusivas em `kit/spa/`: `predios.js` (`predioDosBoxes` com a torre de controle de vidro, `tribunaDoRaidillon` de três andares sobre `tribunaCoberta`, `chaleArdenas` de enxaimel, `fazenda`, `carretas`, `torreDeTV`), `barreiras.js` (`barreiras`: armco ondulada e cerca de arame verde em fitas com postes instanciados, só onde o lugar está livre; `muroDePneus`; `escapePintado`: verde-água e vermelho e amarelo), `torcida.js` (`torcidaNasEncostas`, `bandeirasDaTorcida` numa malha só com atlas, `acampamento`; a torcida é de laranja), `floresta.js` (`colinas`, `bosqueDaBeira` com a opção `evitar`, `florestaDeLonge`: abetos, bétulas e faias em InstancedMesh) e `marcas.js` (letreiros inventados, sem marcas registradas). O GP usa `ambienteGP({ cerca: false })` (a cerca é a de `barreiras`) e `placas: [200, 100, 50]`.
Montreal (`../gps/montreal.js`, `../montreal.js`) traz peças exclusivas em `kit/montreal/`: `terra.js` (a ilha, o rio, a bacia olímpica de remo, a ilha Sainte-Hélène: malha de células com a costa onde cruza a água; `tr.ocupado`), `predio.js` (`predioDosBoxes2019`: garagens brancas, terraços com vidro, telhado de madeira em colunas em V), `muros.js` (`muros`, `blocos`, `muroDosCampeoesMontreal`), `cidade.js` (`skyline`, `ponteJacquesCartier`, `biosfera`), `parque.js` (`bordos`, `choupos`, `bandeirasDaTorcida`) e `marcas.js` (placas de lugar, bandeiras do Canadá e do Québec, a inscrição do Muro dos Campeões). O GP usa `ambienteGP({ cerca: false })`.
Barcelona (`../gps/barcelona.js`, `../barcelona.js`) traz peças exclusivas em `kit/barcelona/`: `pecas.js` (`tribunaPrincipal`: a grande tribuna da reta com a asa de alumínio, os degraus vermelhos e brancos em xadrez, a faixa de vidro dos camarotes, o bico curvo e os núcleos de concreto numerados, com a torcida em `InstancedMesh`; `complexoDosBoxes`: o prédio dos boxes com portões vermelhos, varandas brancas e a torre de controle de prova; `torreDeCronometragem`; `motorhome`, `carretasEm`; as texturas `bandeiraEspanha` e `bandeiraCatalunya`), `vegetacao.js` (`vegetacaoMediterranea`: pinheiro-manso, pinheiro-de-alepo, cipreste, garrigue, capim seco e pedras, uma geometria com cor por vértice cada, em manchas por ruído) e `paisagem.js` (`serra`: Sant Llorenç del Munt, Montserrat e Montseny; `povoados`: casas de telha, igreja e naves industriais). O GP usa `horizonte: false` e `beira: {}` (as árvores redondas de `pista.js` saem) e só nomes de lugares nas marcas (`gpespanya`, `catalunya`, `montmelo`, `mediterrani`, `valles`, `costabrava`, `pirineus`, `cava`, `oliva`, de `marcas.js`), sem patrocinador registrado.

Zandvoort (`../gps/zandvoort.js`, `../zandvoort.js`) traz peças exclusivas em `kit/zandvoort/`: `dunas.js` (`terrenoDeDunas`: o relevo de dunas com a praia numa malha só, cor por vértice; `marEPraia`: o mar do Norte com água que anda, a espuma e `tr.ocupado`; `capimDePraia`, `moitas`, `pinheirosBravos`: InstancedMesh em manchas por ruído), `predios.js` (`predioDosBoxes` de dois andares com a torre de controle na linha de chegada, `telao`, `torreDeIluminacao`, `pavilhao` do Paddock Club, `rodaGigante` parada), `curvas.js` (`curvaInclinada`: a rampa de concreto, o paredão e a cerca alta que contam a inclinação da Hugenholtz e da Arie Luyendyk por fora, com terraço para tribunas; `muroHolandes`; `placasDasCurvas`), `torcida.js` (`torcidaLaranja`, `bandeirasLaranja` com atlas, `fumacaLaranja` que se mexe só perto da câmera), `vila.js` (`planejarVila`/`construirVila`: blocos de apartamentos com janelas por textura, casinhas, igreja e quiosques de praia), `lugar.js` (posição das peças, ruído, o eixo da costa) e `marcas.js` (nomes de lugar e de comida da Holanda). O GP usa `ambienteGP({ cerca: false })`, `beira: {}` e `horizonte: false`.
