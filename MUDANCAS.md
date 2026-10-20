# Cozinha: sopa com 3 ingredientes e estrelas pelo número de pessoas

## Sopa como no Overcooked
- A sopa volta a levar **3 do mesmo ingrediente** na panela (3 cebolas, 3 tomates, 3 cogumelos). Cada um soma o seu tempo de fogo, então a panela cheia leva 13,5 s. Salada, lanche e sushi continuam com um de cada.
- A panela aceita até 3 de qualquer coisa, repetida ou não, como no jogo. A mistura só não é pedido de ninguém. A frigideira continua com 1.
- A primeira cozinha diz "pique três cebolas", e a ficha da receita mostra as três.

## Estrelas pelo número de pessoas
- **O problema:** quem joga sozinho recebe um segundo cozinheiro para trocar com Q, e a meta era calculada pelo número de cozinheiros. Sozinho, você pegava a meta de dupla.
- Agora a meta conta **pessoas** (`novaPartida(..., { pessoas })`, que o servidor manda).
- Sozinho, a meta também é uma parte menor do ótimo do planejador: 30/50/70% (em equipe, 35/60/85%). Na primeira cozinha, a 3ª estrela sozinho caiu de 430 para 275 pontos; em dupla, continua 430.

## Testes
- `node --test tests/cozinha.test.js tests/salas.test.js`: 19 passaram. Testes novos: as sopas levam 3 iguais e o resto um de cada; a panela aceita 3 repetidos e recusa o 4º; sozinho a 3ª estrela é mais fácil que em dupla; o cozinheiro extra não muda a meta. A sopa inteira (no motor e pelo servidor) volta a usar 3 cebolas.
- `npx playwright test tests/e2e/cozinha`: os 6 passaram (a ficha mostra as 3 cebolas).
