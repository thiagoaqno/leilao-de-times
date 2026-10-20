# Cozinha: conteúdo novo (bloco 7 do plano)

## O que muda
- **Receitas novas:** sashimi, sushi de peixe, sushi de pepino, burrito, burrito de arroz, pizza e pizza de queijo. Ingredientes novos: tortilha, massa e queijo.
- **Forno e assadeira** (o "O" no mapa): a massa crua vai na assadeira, e o tomate e o queijo picados vão por cima. O forno assa tudo junto, no mesmo tempo com 1 ou 3 coisas. Só a cobertura não assa (fica esperando a massa). Esquecida, a pizza queima como a panela. Panela não vai no forno, e a assadeira não vai no fogão.
- **Cozinha que mexe:** no food truck, uma divisória (o "x" no mapa) abaixa e sobe a cada 25 s. Abaixada, vira chão e dá para cortar caminho. Ela pisca 2 s antes de mudar. Quem estiver em cima quando ela sobe vai para o chão do lado, e o que estiver caído ali também.
- **Três cozinhas novas, no Mundo 2:** Balcão de sushi, Food truck de burrito e Pizzaria. As metas das estrelas saem do mesmo planejador, que agora entende qualquer recipiente (e que o forno assa tudo de uma vez).
- **Mapa das fases:** o lobby mostra as cozinhas por mundo, numa trilha, com as estrelas que você já ganhou (guardadas no navegador, em `cozinha:estrelas`). A próxima cozinha só abre com pelo menos 1 estrela na anterior.
- **Cara de cada cozinha** (`tema` em regras.js, `TEMAS` em modelos.js): restaurante (azulejo xadrez), sushi (tatame e ripas de madeira), food truck (chapa de metal e parede amarela) e pizzaria (lajota de terracota e tijolo).

## Testes
- `node --test tests/cozinha.test.js tests/salas.test.js`: 22 passaram. Testes novos: a pizza inteira (da caixa ao forno e à entrega), a assadeira esquecida que queima, e a divisória que abaixa, vira chão e, ao subir, tira quem está em cima.
- `npx playwright test tests/e2e/cozinha`: os 6 passaram.
- Conferido no navegador: o mapa das fases, a Pizzaria com a pizza nos fornos e o food truck com a divisória abaixada.
