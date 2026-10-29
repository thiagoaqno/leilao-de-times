# Corrida: o box de Barcelona passa a ficar em volta da linha de chegada, com o prédio no passo das garagens

## O que estava errado
Em `pistas.js`, `BOXES.barcelona` era `{ entra: 0.0118, para: 0.03, sai: 0.0482 }`: o corredor começava 164 depois da linha, as 10 garagens ficavam de 277 a 555 e a saída era em 669, tudo depois da chegada (as outras pistas de GP têm o corredor simétrico em volta da linha, como Interlagos e Monza). O #388 só moveu o prédio e a tribuna em `barcelona.js` para cobrir esse trecho, então a fileira de garagens do jogo continuava toda de um lado da linha e, com a entrada depois da chegada, quem pedia a parada na penúltima volta não conseguia entrar. As portas do prédio (uma textura a cada 60) também não batiam com as garagens do kit (uma a cada 31,2), e o prédio não era centrado nelas.

## O que mudou
- `BOXES.barcelona = { entra: 0.9818, para: 0, sai: 0.0182, lado: 1 }` (só os números do box; traçado, `hills`, `largada` e o resto de Barcelona não mudaram): o corredor de 505 fica em volta da linha, a entrada em -252, as 10 garagens centradas nela (de -140 a +140, a cada 31,2) e a saída em +252. A entrada antes da chegada é a mesma correção de Monza. `chao.sc`, as placas de SC e a passarela de 0,962 (em -527, antes da entrada) seguem sozinhas.
- `barcelona.js`: o prédio dos boxes fica centrado na linha (de -468 a +468, 30 portas) com a torre de controle de prova NA linha de chegada, e a tribuna principal do outro lado também (de -500 a +500). O passo das garagens vem do próprio corredor (`F1Regras.corredor(...).gap * 6`), então o prédio acompanha o corredor se os números mudarem.
- `kit/barcelona/pecas.js`: `complexoDosBoxes` ganhou `passoGaragem` (a textura dos portões repete a cada garagem em vez de a cada 60): um portão do prédio atrás de cada garagem do jogo.
- Como as garagens são distribuídas: são sempre 10 (`F1Regras.GARAGENS`), no mesmo lugar qualquer que seja o número de carros; o piloto de grid `k` para na garagem `k % 10` (`garagemDe`, em `sim.js` e `corrida-robos.js`) e `jogo.js` pinta a garagem `grid % 10` com a cor da equipe de quem está nela. Prédio, fileira e corredor agora coincidem para 1 ou 20 carros; com mais de 10 carros, o par `k` e `k + 10` divide a mesma garagem, como nas outras pistas.
- Teste novo em `tests/corrida-f1-box.test.js`: o corredor de Barcelona envolve a linha, as garagens são simétricas e o passo é o das portas do prédio.

## Conferido
Só montei a cena de Barcelona no Node (sem WebGL): as 10 garagens do kit são construídas, o corredor vai de -252 a +252 com as garagens de -140 a +140, e a conferência de invasão da pista dá zero. Não rodei os testes nem abri o navegador: o Thiago joga e testa.
# Corrida: cenário próprio de Zandvoort (GP da Holanda, nas dunas do mar do Norte)

## O que mudou
Zandvoort deixou de ser o "GP simples" do kit e ganhou cenário próprio em cima do kit 2, com assets exclusivos em `public/corrida/kit/zandvoort/` (só código, sem modelo 3D baixado) e o cenário em `public/corrida/zandvoort.js`. Traçado, `hills`, box, física, robôs, regras, HUD, câmeras e clima não mudaram: só o cenário, `LOOK.zandvoort`, `THEMES.zandvoort`, o céu e o registro em `gps/zandvoort.js`.

- **Dunas, capim e mar do Norte** (`dunas.js`): relevo de dunas numa malha só (cor por vértice: areia nas cristas, capim nas encostas, moitas escuras), que nasce longe do asfalto e cresce com a distância; praia que desce para o mar a oeste (do lado dos boxes), mar com água que anda (`tr.agua`), espuma da arrebentação e areia molhada; capim-de-praia (~5,9 mil touceiras), moitas de espinheiro-marítimo com frutos alaranjados e pinheiros baixos entortados pelo vento, tudo em InstancedMesh e só onde `livre`/`ocupado` deixam. `tr.ocupado` diz "é mar".
- **Reta dos boxes** (`predios.js`, `zandvoort.js`): prédio comprido de dois andares com portas das garagens, faixas nas cores da casa, vidro escuro em cima e mastros de bandeira no teto, e a torre de controle (fuste branco, cabine de vidro, antenas) NA linha de chegada, no meio do prédio e em frente aos boxes (o corredor é o de `boxes` em `pistas.js`, com a parada no 0). Atrás: Paddock Club, tendas brancas do fan zone e a roda-gigante. Do outro lado, a tribuna principal laranja em módulos que encolhem (menos degraus) onde a Hugenholtz chega perto da reta.
- **Tarzanbocht**: arquibancada grande por fora (kit, 13 degraus, torcida laranja), tribuna da frenagem na reta, telão "TARZAN" e sinalizadores.
- **Curvas inclinadas** (`curvas.js`): Arie Luyendyk (a última) e Hugenholtz (curva 3). A pista do jogo é plana, então a inclinação é contada por fora: rampa de concreto com listra laranja e branca que sobe até um paredão branco com a cerca alta de arame; na Arie Luyendyk, terraço com as arquibancadas em volta (7 módulos) e berma de areia atrás; a Hugenholtz é um grampo apertado, a ~200 da reta e da Hunserug, então tem rampa e paredão mais baixos e tribunas só onde cabem.
- **Mar laranja** (`torcida.js`): torcida de camisa, chapéu e peruca laranja nas encostas das dunas e nas arquibancadas, bandeiras da Holanda, laranja, do "33" e "HOLLAND" (atlas numa malha só), e fumaça laranja dos sinalizadores (um InstancedMesh que sobe, cresce e some com o vento do mar; só se mexe perto da câmera).
- **Placas e muros**: muro de proteção em painéis laranja, brancos, azuis e vermelhos; placas com o nome de cada curva (Tarzan, Hugenholtz, Hunserug, Scheivlak, Hans Ernst, Arie Luyendyk); painéis só com nomes de lugar e de comida da Holanda (`marcas.js`, sem marca registrada); faixa "CIRCUIT ZANDVOORT" no pórtico da largada.
- **Vila e orla** (`vila.js`): 44 blocos de apartamentos e hotéis ao longo da praia (janelas por textura, um tipo por geometria), ruas de casinhas de tijolo atrás (~190), igreja de torre fina e quiosques de praia na areia.
- **Céu nublado e ventoso do litoral**: `LOOK.zandvoort` (neblina mais perto, luz mais fraca, chão de areia e capim) e o céu `ceus/nurburgring.jpg` em `ceu.js`.
- Escape de areia clara por fora das curvas lentas, zebras vermelhas e brancas, pneus no Hunserug, Scheivlak e Hans Ernst; só o som de `campo` e do mar (`porto`, mais forte do lado do mar) e gaivotas sobre a praia.

## Desempenho (medido com `tests/ajuda-cena/medir.mjs`, sem WebGL)
~151 chamadas de desenho por quadro na vista do jogo (167 com as sombras; pico 261), ~394 mil triângulos na vista, 284 malhas na cena (teto 520), 167 materiais. Instancing (torcida, capim, moitas, pinheiros, casas, blocos), uma malha por material (`Montador`, `lotes`), `fundir.js` junta o que está parado por região, e a fumaça só recalcula os focos perto da câmera.

## Referências usadas (Wikimedia Commons, só para estudo, não vão no repositório)
- Dunas, capim e a faixa de areia ao redor da pista: "Formula one Circuit Park in the dunes of Zandvoort in the Netherlands" (CC BY-SA) e "Luftbild der Circuit Park Zandvoort Rennstrecke Formel 1" (CC BY-SA).
- Mar do Norte, praia e vila de Zandvoort com os prédios da orla ao fundo: "Circuit Zandvoort motorsport race track in the Netherlands".
- Reta dos boxes (prédio comprido de dois andares, vidro, mastros no teto, torre de controle): "Circuit Park Zandvoort Paddock" e "Circuit Zandvoort - Tarzanbocht en Paddock Club".
- Tarzanbocht e cerca alta de arame: "Circuit Zandvoort - Tarzanbocht". Fan zone, roda-gigante e bandeiras: "Zandvoort - 1 september 2025 (4)" e "(5)".
- Mar laranja, arquibancadas lotadas e mastros de iluminação: foto de carro de F1 em movimento do GP da Holanda de 2024 (Stepro, CC BY-SA 4.0, só o fundo).
- Inclinação (~19° na Hugenholtz e ~18° na Arie Luyendyk) e ordem das curvas: formula1.com, redbull.com e p1travel.com (guias do circuito).

## Conferido
Só o cenário montando no Node (`medir.mjs` e a conferência de invasão da pista, zero invasões). Não rodei os testes nem abri o navegador (o Thiago joga e testa).
