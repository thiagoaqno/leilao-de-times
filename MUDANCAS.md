# Tênis de Mesa: clone do Table Tennis Pro

O tênis de mesa anterior ficou difícil e tinha coisas que não estavam no jogo de referência. Esta versão copia o Table Tennis Pro (jogado e medido quadro a quadro) e tira o resto.

## O que muda

- **Tela igual à do original.** Piso coral, paredes azuis acolchoadas com estrelas e o 40, mesa azul com bordas brancas e pés pretos, bola amarela e as duas raquetes vermelhas flutuando, sem jogador. A câmera fica atrás da mesa, no alto, na mesma posição do original (a mesa ocupa o mesmo lugar na tela), e vira um pouco para o lado da sua raquete.
- **Controle do original.** Segure o botão do mouse (ou o dedo) e arraste: a raquete vai junto pelo seu lado da mesa, e a altura vai sozinha. Ela bate quando a bola chega; arrastar rápido para a frente na hora bate forte, para o lado mira. Soltou o mouse, a raquete vai atrás da bola sozinha e devolve macio.
- **Saque do original.** A bola fica parada em cima da mesa, na frente da raquete. Arraste a raquete para a frente passando por ela (ou dê um toque) para sacar.
- **Placar do original.** A bandeira e o número grande em cada canto de cima, e "Troca de saque" quando o saque muda de lado.
- **Saiu o que não era do original:** o braço e o corpo do jogador, forehand e backhand, a bola jogada para cima no saque, a leitura do giro (devolver top spin ou cortada não atrapalha mais) e as skins.
- **Mais calmo.** A bola anda mais devagar e o saque é menos curto e com menos efeito. O robô ficou um pouco mais fácil de passar.

## Verificação

- `node --test tests/pingpong.test.js`
- `node --test --test-name-pattern="pingpong|noite" tests/servidor.test.js`
- `node --test tests/salas.test.js`
- `npx playwright test tests/e2e/pingpong.spec.js --reporter=line`
