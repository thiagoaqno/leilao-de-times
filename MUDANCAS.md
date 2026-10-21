# Cozinha: músicas, ritmo dos pedidos e ingredientes nas comandas

## O que muda

- A música do lobby e as três faixas de fase fornecidas em `Downloads/OverCooked` tocam em loop. As fases 1, 2 e 3 de cada mundo usam, respectivamente, Buffet Balloons, Kevin Level e Ravenous Rapids. O controle de música da pausa ajusta essas faixas sem alterar os efeitos.
- Cada comanda mostra o nome e a quantidade de cada ingrediente, inclusive os três itens das sopas. Quando há muitas comandas, a faixa de pedidos pode ser rolada na horizontal.
- O intervalo configurado para novos pedidos agora é respeitado. Ele também considera o tempo estimado de preparo de cada cozinha e o número de pessoas. Entregar um prato não cria outra comanda imediatamente enquanto ainda houver pedidos na fila.
- O prazo de cada pedido considera o preparo, os deslocamentos e as duas comandas que chegam juntas no começo. A fila nunca fica vazia durante o expediente.

## Verificação

- `node --test tests/cozinha.test.js tests/salas.test.js`
- `npx playwright test tests/e2e/cozinha-som.spec.js`
- Conferência visual do HUD no navegador com a sopa de cebola exibindo `3× Cebola`.
