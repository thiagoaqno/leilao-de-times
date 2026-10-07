# Carreira: o tema do hub na cor do clube

No hub da carreira (a sede no estilo EA FC, do PR #80), o acento seguia a cor do campeonato: verde-neon no
Brasileirão. Para quem treina o Flamengo, isso ficava estranho. Agora o tema muda com o clube que você escolhe.

## O que muda
- **O acento é a cor do clube** (`temaClube`, em `public/carreira/inicio.js`): o botão "Jogar a próxima partida", as
  etiquetas das notícias, os ícones dos blocos da gestão, o selo da caixa de entrada e o brilho do fundo.
  - Vale a primeira cor **colorida** do clube (o preto, o branco e o cinza não contam), clareada só o necessário para
    dar leitura no fundo escuro: o Flamengo fica vermelho, o Palmeiras verde, o Grêmio azul, o Real Madrid dourado e o
    Dortmund amarelo.
  - Clube preto e branco (Corinthians, Botafogo, Santos, Vasco, Juventus) fica com o branco.
  - A letra em cima do acento sempre contrasta: branca no vermelho do Flamengo e preta no branco do Corinthians.
- **Sala em grupo:** assim que você escolhe o clube, a sala de espera já pega a cor dele.
- **Saem as cores por campeonato:** as regras `body[data-liga]` do CSS e o `dataset.liga`. O verde continua só como
  padrão da tela inicial, antes de escolher um clube.

## Conferido
- No navegador do app: o hub do Flamengo em vermelho e o botão branco do Corinthians com a letra escura.
- `npx playwright test tests/e2e/carreira.spec.js`: 4 de 4 passando (só o e2e da carreira).
- A mudança é só no navegador (nenhum arquivo do servidor muda); o `npm test` do PR #80 continua valendo.

## Fotos (`planos/imagens/`, refeitas)
- `carreira-hub-pc.png`: o hub do Flamengo no PC, no vermelho do clube.
- `carreira-hub-celular.png`, `carreira-cards-camisas.png` e `carreira-grupo-sala.png`: as mesmas telas com o tema novo.
