# Tênis de Mesa recriado no jeito do Table Tennis Pro

## O que muda

- **Física de verdade.** Mesa (2,74 x 1,525 m a 76 cm, rede de 15,25 cm) e bola (40 mm) nas medidas oficiais. A bola voa com gravidade, arrasto do ar e efeito Magnus do giro (um vetor em rad/s): o top spin mergulha, a cortada flutua, o lateral faz a curva. No quique, o atrito troca velocidade por giro: o top spin acelera e a cortada freia (e uma cortada pesada chega a voltar para a rede sozinha). A bola de 30 cm sobe uns 23 cm, como manda a regra.
- **Jeito de jogar do Table Tennis Pro.** A câmera fica atrás e acima do jogador, vendo a mesa inteira. O mouse (ou o dedo) leva a raquete para os lados e para a frente ou para trás; a altura vai sozinha atrás da bola, e a batida é automática quando a bola chega. O gesto na hora decide o golpe: empurrar é o top spin (forte demais sai longo), parado é o bloqueio, puxar é a cortada, para o lado é a mira e a curva, e bola alta com gesto forte é o smash. Na tela aparecem o nome do golpe e a velocidade em km/h.
- **Ler o giro.** Devolver um top spin só bloqueando faz a bola subir; devolver uma cortada sem cortar ou levantar cai na rede.
- **A raquete na mão.** Empunhadura clássica (polegar na borracha vermelha, indicador na preta), forehand à direita do corpo e backhand quando a raquete cruza para a esquerda, com a preparação antes da bola chegar e a terminação depois do golpe (para cima no top, para baixo no corte). O meu braço aparece na frente da câmera; o adversário é o boneco da skin com o braço da raquete.
- **Saque como na mesa.** Clique (ou espaço) joga a bola para cima e a raquete bate na descida, com o gesto do momento: para a frente sai longo com top, para trás sai curto e cortado, para o lado mira e dá efeito. O saque sempre quica dos dois lados.
- **Robô novo.** Ele espera o tempo de reação, prevê onde vai bater (avança para a bola curta e recua para a longa), lê o giro (o fácil erra a leitura, o difícil quase nunca) e erra mais contra bola rápida ou muito girada.
- **Ginásio.** Piso esportivo, barreiras com os anúncios da Vila, arquibancada com torcida, luzes do teto, a mesa oficial com rede e postes e a mesa do juiz com o marcador de virar.
- **Online.** O pacote da batida leva o giro em 3D; o servidor repassa também o lance do saque (`lance`) e se a raquete está de forehand ou backhand. A cortada que volta sozinha para a rede depois de quicar certo é ponto de quem bateu.

## Verificação

- `node --test tests/pingpong.test.js`
- `node --test --test-name-pattern="pingpong|noite" tests/servidor.test.js`
- `node --test tests/salas.test.js`
- `npx playwright test tests/e2e/pingpong.spec.js --reporter=line`
