# Monza refeita em cima do kit 2

O cenário do GP da Itália (`gps/monza.js`) foi refeito do zero: o `monza.js` antigo, de antes do kit 2, saiu, e entraram `monza.js` (a montagem) e `kit/monza/` (as peças exclusivas, todas em código, sem modelo 3D baixado). Não mexe em traçado, física, robôs, regras, HUD, menus, sala nem carreira.

**A reta dos boxes** (um quadro só, `reta` em `monza.js`: +x ao longo da pista, +z para o lado dos boxes)
- Prédio dos boxes com o Paddock Club (`complexoDosBoxes`): portas das garagens, marquise com a faixa tricolore, vidro, terraço com 12 velas brancas e letreiros do parapeito.
- **Pódio suspenso** (`podioMonza`): torre de concreto sobre o prédio e a caixa que avança 12,8 m sobre a reta (a ponta fica a 20 da linha central), a 9,8 m de altura, com faixa de vidro, letreiro GRAN PREMIO D'ITALIA, estais de aço, o palco de piso vermelho com os três degraus e o painel de patrocínio.
- **Tribuna Centrale** em frente (4 módulos de `tribunaCoberta`, cobertos, de torcida vermelha: opção nova `camisas`), duas **torres de cronometragem** de 1955 atrás dela (placar luminoso nos dois lados), torres de luz e o paddock atrás dos boxes (motorhomes, tendas e carretas).
- A faixa AUTODROMO NAZIONALE MONZA no pórtico da largada de `pista.js`, **de frente para os carros** (normal contra o sentido da volta; conferido na malha).

**O resto da volta**
- **Sopraelevata** (`kit/monza/sopraelevata.js`): concreto com lajes e mato, parapeito, torrinhas de sinalização, moitas em volta e a ponte sobre o Serraglio.
- **Parabolica**: escape de asfalto cinza com a linha branca, muro de pneus e tribunas por fora (uma coberta); a brita saiu dela (é asfalto desde 2014). Brita e pneus nas Lesmo e na Biassono; escape listrado de vermelho e branco e zebras altas nas chicanes.
- Placas com o nome de cada curva, arquibancadas de curva do kit (Rettifilo por dentro e por fora, Curva Grande, Roggia, Lesmo, Ascari, reta de trás) com as bandeiras da Itália e dos tifosi nos degraus.
- **Parque** (`kit/monza/parque.js`): bosque de árvores altas de copa em dois lóbulos (verdes com um pouco de amarelo e cobre de setembro), moitas, folhas caídas, gramado em faixas e o velho carvalho do Ascari.
- Luz de fim de tarde de setembro (`LOOK.monza` e `THEMES.monza`: sol dourado, neblina quente).

**Desempenho** (`node tests/ajuda-cena/medir.mjs monza`): na vista do jogo, cerca de 210 chamadas de desenho e 430 a 450 mil triângulos (Suzuka: 207 e 459 mil; o Monza antigo: 175 e 361 mil); menos de 400 malhas na cena (teto 520). Árvores, moitas, folhas, bandeiras, torres de luz e pneus são InstancedMesh; as peças soltas têm uma malha por material.

**Conferido**: a montagem da cena no Node roda sem erro, nenhuma peça fica dentro da pista (`invasoes` do `tests/ajuda-cena`, 0 achados) e a fusão de malhas não aumenta a contagem. **Não conferido**: o navegador (o Thiago joga e testa); as proporções e as cores foram feitas a partir de texto, não de fotos.

**Docs**: linha de Monza no `CLAUDE.md`, parágrafo e opção `camisas` no `kit/README.md`.

## Referências usadas (marco por marco)

Aviso honesto: as ferramentas de pesquisa desta sessão só leem **texto** (páginas, legendas, descrições de arquivo); não consegui abrir as fotos em si. Cada marco abaixo foi feito a partir do que essas páginas dizem sobre ele (forma, posição, material, medidas). As cores, as proporções finas e o desenho dos prédios são interpretação minha, em cima de nome, texto e legenda, e merecem o olho do Thiago jogando. Nenhuma imagem foi baixada nem salva no repositório; as texturas são geradas em canvas.

| Marco | Referência | O que foi copiado dela |
| --- | --- | --- |
| Traçado, ordem e nome das curvas, reta de 1,12 km, zebras altas nas duas primeiras chicanes | https://en.wikipedia.org/wiki/Monza_Circuit | A ordem Rettifilo, Curva Grande, Roggia, Lesmo, Ascari, Parabolica (Curva Alboreto); as zebras altas de Rettifilo e Roggia; o parque ao redor; o anel com ~30° de inclinação |
| Pódio suspenso | https://www.monzanet.it/en/leclerc-and-the-iconic-elements-of-the-temple-of-speed-in-the-image-of-the-94th-italian-grand-prix/ e https://www.grandprix.com/news/paddock-renovation-work-for-monza.html | Pódio de 2002 que avança sobre a pista para o povo invadir; o antigo era um portal com duas torres art déco, por isso a torre de concreto branco sobre o prédio dos boxes |
| Prédio dos boxes e Paddock Club | mesmas páginas do monzanet e do grandprix.com; https://commons.wikimedia.org/wiki/File:Monza_pitlane.jpg | Prédio moderno com hospitalidade, escritórios e centro de mídia atrás do pit lane; terraço coberto por estrutura tensionada (velas brancas) |
| Torres de cronometragem | https://www.monzanet.it/en/leclerc-and-the-iconic-elements-of-the-temple-of-speed-in-the-image-of-the-94th-italian-grand-prix/ | Duas torres de 1955 na reta, com placar luminoso, hospitalidade desde 1997 |
| Tribuna Centrale e pórtico da largada | https://commons.wikimedia.org/wiki/File:Monza_start_line.jpg e o guia de arquibancadas https://ticket-compare.com/circuits/autodromo-nazionale-monza/seating-plan/ | Tribuna em frente ao pit lane e ao pódio, com as fileiras de cima cobertas e as de baixo abertas; a linha de largada com o pórtico (a faixa fica perpendicular à pista, de frente para os carros: conferido pela normal da malha) |
| Variante del Rettifilo | https://en.wikipedia.org/wiki/Monza_Circuit e o guia de arquibancadas | Frenagem forte no fim da reta; arquibancadas por dentro (6A a 6C) e por fora (8A e 8B); escape de asfalto listrado e zebras altas |
| Curva Grande e Biassono | https://it.wikipedia.org/wiki/Autodromo_nazionale_di_Monza | Curva longa à direita, em meio às árvores; brita na saída da Biassono; árvores derrubadas só para alargar o escape |
| Variante della Roggia | https://it.wikipedia.org/wiki/Autodromo_nazionale_di_Monza | Escape todo de asfalto, com zebras altas |
| Lesmo 1 e 2 | https://it.wikipedia.org/wiki/Autodromo_nazionale_di_Monza | Brita na saída e muro de pneus, com as árvores quase na beira |
| Variante Ascari | https://commons.wikimedia.org/wiki/Category:Variante_Ascari e https://it.wikipedia.org/wiki/Autodromo_nazionale_di_Monza | O grande carvalho (Curva del Platano) que sobrou na beira de dentro; as zebras altas |
| Parabolica (Curva Alboreto) | https://commons.wikimedia.org/wiki/Category:Curva_parabolica_(Autodromo_Nazionale_Monza) e o guia de arquibancadas | Escape de asfalto desde 2014 (sem brita); várias tribunas temporárias por fora, só uma coberta |
| Sopraelevata | https://commons.wikimedia.org/wiki/File:Monza_banking_2003.JPG e https://it.wikipedia.org/wiki/Autodromo_nazionale_di_Monza | Concreto armado com inclinação crescente (até uns 38°), as 14 torrinhas de sinalização (7 no anel), o trecho que cruza o Serraglio por cima; o traçado do anel já vinha do OpenStreetMap |
| Parque | https://en.wikipedia.org/wiki/Monza_Circuit | Autódromo no meio do bosque do Parco di Monza |
