# Sinuca: o taco sempre puxa até 100%

## O que acontecia
- **A força travava baixo.** Ela contava a partir de onde o dedo (ou o mouse) pegava a barra. Quem pegava a barra no meio
  ou perto do fim ficava sem espaço para puxar, porque a beirada da tela chegava antes. No celular deitado, pegando a barra
  pelo lado esquerdo, o máximo era uns **46%**, e parecia que o taco não puxava.
- **O puxão era cancelado no celular.** Segurar a barra um instante antes de puxar podia abrir a seleção de texto ou a
  lupa, que cancelava o puxão e zerava a força.

## Como fica
- **O 100% fica sempre ao alcance.** Quando sobra pouca barra ou pouca tela, a distância do 100% encolhe até o espaço que
  sobra.
  - Quem pega pela ponta do taco, como antes, continua usando a barra inteira: metade do puxão é 50%.
- A barra de força, o efeito e o ajuste fino não selecionam texto nem abrem a lupa ou o menu do toque longo.
- Apertar a barra com o mouse também não seleciona a página nem arrasta nada junto.

## Por dentro
- `public/sinuca/mira.js`:
  - `curso(e)` calcula, na hora em que a pessoa pega a barra, quanto falta de barra e de tela na direção de puxar;
  - a força passa a ser a distância puxada dividida por esse curso (de 36 px até o tamanho da barra);
  - o `pointerdown` chama `preventDefault`.
- `public/sinuca/index.html`: `user-select: none` e `-webkit-touch-callout: none` na força, no efeito e no ajuste fino.

## Conferido
- `npm test`: 69 passaram, 0 falharam.
- `npx playwright test tests/e2e/mesa.spec.js`: 2 passaram.
- No navegador, numa mesa com um segundo jogador de teste, na tela deitada do celular:
  - pegando a barra pelo lado esquerdo e puxando até a beirada, a força chegou a **100%** (antes, 46%);
  - pegando pela ponta e puxando metade da barra, deu **50%**, igual a antes.
