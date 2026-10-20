# Cozinha: fichas das receitas e orientação no começo

## O que muda
- A contagem inicial dura 7 s para mostrar as fichas de cada prato do cardápio. Cada ficha traz os ingredientes e o caminho caixa, preparo, prato e entrega; elas também aparecem no menu de pausa.
- Na primeira partida de cada cozinha, um balão aponta as bancadas na ordem da receita. Ele avança com as ações da partida e some após a primeira entrega; o navegador guarda as cozinhas já vistas em `cozinha:visto`.
- Com ingrediente cru na mão, a tábua recebe uma dica; com prato vazio e panela pronta, a dica aponta para o fogão.
- As metas de 1, 2 e 3 estrelas aparecem nas fichas e em uma barra que acompanha o placar durante a partida.

## Testes
- `node --test tests/cozinha.test.js`: 10 testes passaram.
- `npx playwright test tests/e2e/cozinha-tutorial.spec.js`: conferiu fichas, contagem, metas, orientação, pausa e ausência de erros no navegador.
