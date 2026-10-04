# Pingue-Pongue da Galera (novo jogo: tênis de mesa no mouse)

Em `/pingpong/`, e com um salão na vila (embaixo, à esquerda, com a ruazinha descendo da rua nova).

## Como joga
- **A raquete segue o mouse** (no celular, o dedo): ela fica onde o mouse aponta, do seu lado da mesa, e sobe e desce
  sozinha acompanhando a altura da bola.
- **Rebater:** quando a bola já quicou do seu lado e passa pela raquete, você rebate. O movimento do mouse na hora
  decide a batida: **empurrar para a frente** = mais forte e mais funda; **puxar para trás** = balão devagar;
  **para o lado** (ou pegar a bola com a ponta da raquete) = manda para o canto (e pode sair).
- **Saque:** clique. A bola quica do seu lado e depois do outro; mexer o mouse para o lado na hora mira o saque.
- **Regras de verdade:** quicar uma vez do lado de quem recebe, rede, fora e dois quiques. Game até 11 (ou 21), com 2 de
  vantagem; o saque troca a cada 2 pontos (no 10 a 10, a cada ponto). Melhor de 1 ou de 3 games.
- **Treino contra o robô** em 3 níveis (fácil, médio, difícil): ele erra mais ou menos e bate mais fraco ou mais forte.
- **Skins da Pelada:** o adversário aparece com a skin dele atrás da raquete (a sua escolha vale também na Corrida e na
  Batalha).

## Online (1x1)
- "Quem rebate manda": quem bate na bola manda a batida (posição, velocidade e a hora) e o servidor repassa. Como a bola
  só tem gravidade e quique, os dois calculam o mesmo voo. Quem decide o ponto é quem está recebendo (é na tela dele
  que a bola chega ou não na raquete). Se ninguém responder em 9 s, o ponto vai para quem bateu.
- Sala com dois lados (azul e vermelho) e torcida (quem sobra assiste).

## Arquivos
- `public/pingpong/regras.js` (física, juiz, raquetada, placar e o robô, iguais no servidor e no navegador),
  `public/pingpong/index.html` e `public/pingpong/jogo.js` (a página e o jogo em 3D), `pingpong.js` (servidor, canal
  `/pingpong`), `server.js`, a vila (`public/index.html`, `vila.js`).

## Testes
- `tests/pingpong.test.js`: saque em todas as miras, juiz, placar e uma partida inteira de robô contra robô.
- `tests/servidor.test.js`: online com dois jogadores (o saque chega no outro e só quem recebe marca o ponto).
- `tests/e2e/pingpong.spec.js`: treino no navegador, sacando com clique e rebatendo com o mouse.
- `/pingpong` no teste das salas (regravado: só entrou o bloco novo) e no de abrir as páginas.
