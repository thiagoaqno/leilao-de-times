# Cozinha: bancadas e entregas com animação

## O que muda
- A faca acompanha a mão enquanto o cozinheiro pica. O ingrediente passa por quatro tamanhos e solta lascas a cada corte.
- O fogão acende somente com comida no recipiente. A chama oscila, a panela borbulha, o vapor sobe e a carne da frigideira muda de cor durante o preparo.
- A pia mostra água e bolhas ao lavar. O escorredor ganha um brilho ao receber um prato limpo.
- A fumaça escurece perto de queimar, o aviso e o apito aceleram, e a panela queimada fica em chamas.
- A entrega leva o prato pela esteira, carimba a comanda e leva moedas ao placar. Erros mostram a recusa; o retorno avisa e conta pilhas grandes de pratos sujos.
- Itens pulam ao pegar e soltar; o cozinheiro segura a faca durante o trabalho e deixa poeira ao dar impulso.
- Inclui `planos/cozinha-melhorias.md`, vindo da branch `cozinha`, para orientar os próximos PRs na ordem definida no plano.

## Testes
- `node --test tests/cozinha.test.js`: 8 testes passaram.
- `npx playwright test tests/e2e/cozinha.spec.js`: abre a cozinha, renderiza pedidos e confirma movimento pelo teclado sem erros no navegador.
