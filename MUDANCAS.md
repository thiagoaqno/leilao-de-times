# Haxball da Galera em 2D

## O que muda

- Um novo campo de futebol de discos 2D na Vila. A turma cria uma sala com código, escolhe os times e joga de 1x1 a 5x5.
- O anfitrião configura duração e limite de gols, começa a partida e pode pedir revanche. Quem chega durante o jogo pode assistir e entrar na partida seguinte.
- O servidor calcula movimento, colisões, chutes, gols, tempo e placar. O navegador desenha o campo e envia teclado ou controles de toque.
- A sala aparece no lobby da Vila e os resultados contam para a Noite da Galera.

## Verificação

- `npm run test:haxball`
- `node --test tests/salas.test.js`
- `npx playwright test tests/e2e/haxball.spec.js`
- `npx playwright test tests/e2e/paginas.spec.js --grep haxball`
