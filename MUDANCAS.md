# Cozinha: sopa de 3, estrelas por pessoas, conteúdo novo (bloco 7) e acabamento (bloco 8)

Três branches, juntadas nesta ordem: `cozinha-sopa-3`, `cozinha-conteudo` e `cozinha-acabamento`.

## Sopa como no Overcooked e estrelas pelo número de pessoas (`cozinha-sopa-3`)
- A sopa volta a levar 3 do mesmo ingrediente na panela. A panela aceita até 3, repetidos ou não, e cada um soma o seu tempo de fogo.
- A meta das estrelas conta pessoas, não cozinheiros. Sozinho, o cozinheiro extra fazia você pegar a meta de dupla. Sozinho, a meta também é uma parte menor do ótimo: 30/50/70% (em equipe, 35/60/85%).

## Conteúdo novo, bloco 7 (`cozinha-conteudo`)
- Receitas: sashimi, sushi de peixe e de pepino, burrito e burrito de arroz, pizza e pizza de queijo. Ingredientes: tortilha, massa e queijo.
- Forno com assadeira: a massa assa com o tomate e o queijo picados por cima, tudo junto. Só a cobertura não assa. Esquecida, queima.
- Food truck com a divisória que abaixa e sobe a cada 25 s (pisca antes de mudar).
- Mundo 2: Balcão de sushi, Food truck de burrito e Pizzaria. Mapa das fases com as estrelas guardadas no navegador (a próxima abre com 1★ na anterior). Cada cozinha com o seu tema (chão e parede).

## Acabamento, bloco 8 (`cozinha-acabamento`)
- Bolinhas em cima da panela e do prato com cada ingrediente dentro. No prato montando, o que falta aparece tracejado.
- A plaquinha com o nome do item na mão.
- E2E de uma sopa inteira só com o teclado.

## Testes
- `node --test tests/cozinha.test.js tests/salas.test.js` e `npx playwright test tests/e2e/cozinha` no resultado juntado.
