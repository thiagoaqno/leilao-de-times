# Road to Champions: o motor da Carreira, o jogo ao vivo, a central do FIFA 20 e as fotos dos jogadores

## O que muda

- **Os jogos da Champions passam pelo motor da Carreira.** A conta de duas linhas (força + sorte) saiu. Agora `jogar` chama `Motor.simularPartida` com o elenco real da base, a formação do clube e o mesmo sorteio com semente. O jogo sai minuto a minuto, com gols, defesas, cartões, lesões e trocas.
  - A **estratégia do pré-jogo** vira a tática do motor: equilibrado (0/1/1), pressionar (mentalidade +1, pressão e linha altas) e recuar (mentalidade -1, bloco baixo). O estilo o motor escolhe pelo elenco. Medido em 1.500 jogos do mesmo clube: pressionar e recuar mudam o jogo (1,63 e 1,34 gol por jogo, contra 1,49 do equilibrado) sem decidir sozinhos (1,32, 1,28 e 1,29 ponto por jogo).
  - A **forma do protagonista** (de -2 a +2) soma na nota do time inteiro, como a moral na Carreira (+2 vale cerca de 0,13 ponto por jogo).
  - **Mata-mata** é jogo único: o empate vai para a disputa de pênaltis do motor. A **final** é em campo neutro.
- **A jornada ao vivo, para a sala inteira.** Quando o anfitrião joga a jornada, cada um vê o próprio jogo no mesmo relógio (`s.aoVivo`): a abertura com os escudos, o placar e o minuto, a **mesa de botão da Carreira** (a mesma `mesa.js`), a narração e a faixa com os outros jogos ao vivo. Dá para trocar de jogo, acelerar (1×/3×) ou ir para o fim. No fim, o resultado com a foto do momento (vitória, derrota, classificação, eliminação, título) e os números da partida. A cena do próximo capítulo espera o jogo acabar.
  - Os lances ficam em `s.partidas` (fora do estado que vai para todo mundo). O canal `partida` devolve um jogo, e todo jogo já disputado ganha **▶ Rever** (Classificação, epílogo e o bloco Mesa ao vivo).
- **A central no jeito da central de carreira do FIFA 20.** Cartão do jogador no alto (foto, situação no grupo e forma em V/E/D), barra de status, abas inclinadas com avisos, o bloco **Jogar** (adversário, mando e estádio, situação e forma dele, o protagonista em preto e branco), os quadrados **Entrevista** e **Mesa ao vivo** (no lugar de Sim match e Visual sim), o **cartão de notícia com foto** e pontinhos, e os painéis Atributos, Classificação (faixas azul e laranja), Estilo de vida, Social e Destinos cruzados, sobre a cidade à noite borrada.
- **As fotos dos jogadores da TheSportsDB são o visual principal:** Neymar (Último Romântico), Yamal (Prodígio), Vini Jr. (Resiliente), Dembélé (Imprevisível), Olise (Enigma) e Haaland (Máquina). O servidor baixa uma vez e serve em `/api/rtc-foto/:arquetipo` (como os escudos); se o endereço mudar, busca de novo pelo nome. **O boneco personalizável fica de reserva:** aparece embaixo da foto e no lugar dela se ela não abrir, e a etapa da entrada virou "Boneco (reserva)", opcional.
- **As artes dos 17 eventos e 11 cenas** entram em WebP 1280×720 (1,7 MB no total; os originais somavam 53 MB): `public/jogador/popups/rtc-popup-<evento>.webp` e `public/jogador/cenas/` (vestiário no lobby, taça no epílogo, manchetes no Diário, redes no Social, amizade/rivalidade nos Destinos cruzados, departamento médico na lesão e os resultados do jogo ao vivo).

## Para conferir

- `node --test tests/road-to-champions.test.js`: três testes novos (o motor e os lances guardados, o mesmo jogo para a mesma semente, os pênaltis do motor no mata-mata, e a estratégia e a forma no time do motor).
- Com o motor, os elencos reais pesam: num todos contra todos entre os seis clubes, Bayern e City fazem cerca de 1,25 ponto por jogo, e PSG e Arsenal, cerca de 1,46.
