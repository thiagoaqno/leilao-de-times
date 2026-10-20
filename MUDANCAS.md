# Cozinha: receitas, panela fora do fogo e itens no chão

## O que muda
- Cada receita usa no máximo uma unidade de cada ingrediente. As sopas de cebola, tomate e cogumelo passam a pedir um ingrediente cozido; a ficha e a descrição da primeira cozinha acompanham essa regra. A sopa de cebola pode ser entregue após o preparo indicado.
- A panela levada do fogão para a bancada conserva o progresso e para de cozinhar e queimar. A interface deixa de mostrar alerta e fumaça de cozimento fora do fogo.
- Apenas ingredientes podem ser arremessados ou largados no chão. A tecla G, um botão no controle e um botão de toque largam o ingrediente para ser recolhido depois. Pratos e panelas continuam sendo colocados em bancadas.
- Uma entrega gera imediatamente outro pedido. Pedidos vencidos também são repostos, para que a fila não fique vazia durante a partida.

## Testes
- `node --test tests/cozinha.test.js tests/salas.test.js`: 19 testes passaram, incluindo preparo e entrega da sopa pelo servidor, ingredientes no chão, panela fora do fogo e reposição dos pedidos.
- `npx playwright test tests/e2e/cozinha-controles.spec.js tests/e2e/cozinha-tutorial.spec.js tests/e2e/cozinha-troca.spec.js`: 3 testes passaram; a ficha da sopa mostra um ingrediente.
