# Tênis da Galera (novo jogo)

Este PR já inclui o #26, que leva os PRs #24 e #25 para a `main`. Faça o merge do #26 primeiro: depois disso, este
PR mostra só o tênis.

## O jogo
- Tênis arcade em 3D, inspirado no Mario Tennis, em `/tenis/`. Na vila é o **Clube de Tênis**, na rua nova, entre a
  garagem do Rocket e a arena da Batalha, com o telhado pintado como uma quadra.
- **Simples (1x1) ou duplas (2x2)**, online com a galera. Os **robôs completam as vagas** (dá para desligar) e têm 3
  dificuldades. Também tem **treino contra robôs** sem internet, em simples ou duplas.
- **Golpe armado:** você aperta o golpe antes da bola chegar e o jogador bate sozinho quando ela entra no alcance.
  Quanto antes apertar, mais forte (a barra mostra a força). É o que deixa o online jogável mesmo com atraso.
  - J / clique: **top spin** · K / botão direito: **cortada** · L: **balão** · U: **curtinha**
  - Controle: A top spin, B cortada, Y balão, X curtinha, Start pausa · no celular, botões na tela.
  - Bola alta antes de quicar: **smash** sozinho.
- **Armado, o jogador só desacelera devagar** e o direcional passa a ser quase só a **mira**: para o lado, e para a
  frente (funda) ou para trás (curta). Uma marca branca no chão do outro lado mostra para onde a bola vai.
- **Saque:** aperte uma vez para jogar a bola para cima e de novo lá no alto (mais alto, mais forte). Antes de jogar a
  bola, dá para andar para os lados (quem saca fica na sua metade da linha de fundo). Tem falta, segundo saque e
  dupla falta, e o saque tem que cair na caixa da diagonal.
- **Placar oficial:** 15-30-40, iguais e vantagem. O set é de 2, 3, 4 ou 6 games, ganhando por 2, e com tie-break
  (a 7) no empate. O saque troca a cada game; em duplas, os dois do time se revezam.
- **Bola arcade:** mais lenta e quicando mais alto que no tênis de verdade, para dar tempo de chegar. Cada golpe tem
  o seu efeito: o top spin cai forte e quica alto, a cortada flutua e quica baixo, a curtinha morre perto da rede.
- Marca amarela no chão onde a bola que vem para o seu lado vai quicar.
- Os bonecos e as **skins são os da Pelada**, com uma raquete na mão, e os times são Azul e Laranja.

## Como funciona por dentro
- `public/tenis/regras.js`: quadra (medidas oficiais), física da bola (efeito, rede e quique), golpes (o alvo resolve
  a velocidade de saída e sobe a bola se ela não passasse da rede), pontuação, saque e os robôs. Os robôs simulam a
  bola para achar onde ela vai estar numa boa altura, correm para lá e armam o golpe na hora certa. As mesmas regras
  rodam no servidor e no treino.
- `tenis.js` (servidor, canal `/tenis`): a sala, os times, as configurações e a partida. O servidor manda na bola e
  no placar; cada navegador mexe o próprio jogador e manda a posição e a mira. O golpe armado vai com o tempo de
  quando foi apertado (descontando metade do ping).
- `public/tenis/index.html` e `public/tenis/jogo.js`: telas, quadra 3D, câmera de transmissão atrás do seu time,
  controles, sons sintetizados e HUD com o placar.
- Os bonecos da Pelada agora são independentes: `public/pelada/tex.js` (novo) tem os ajudantes de textura sem efeito
  colateral, e `bonecos.js` recebe a cena por `configurarBonecos`. A Pelada continua igual.

## Também
- Teste online da Pelada estabilizado: o adversário do teste ficava colado na bola quando a saída era dele.
- Teste do passe da Pelada estabilizado: os robôs podiam empurrar o jogador e o teste reprovava.

## Testes
- `npm test`: 29 passaram. Entre eles, um teste novo do servidor do tênis: duplas com 1 humano e 3 robôs, com pontos
  acontecendo de verdade. O teste das salas também passou a cobrir o canal `/tenis`.
- Testes no navegador: `tenis.spec.js` (treino jogado até o placar andar; online com robôs, a bola andando),
  `paginas.spec.js` (agora com `/tenis/`) e os da Pelada passaram.
- Simulação de robô contra robô: partidas completas em simples e duplas, com 3 a 5 batidas por ponto em média.
