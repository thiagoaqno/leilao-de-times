# Cozinha: acabamento (bloco 8 do plano)

## O que muda
- **Bolinhas em cima da panela e do prato**, como no Overcooked: cada ingrediente que está dentro aparece numa bolinha em cima da panela, da frigideira e do prato.
- **O que falta no prato montando:** depois do que já tem, aparecem tracejados e apagados os ingredientes que faltam para a receita do cardápio mais perto de ficar pronta (a que pede menos coisas a mais).
- **O nome do item na mão:** uma plaquinha pequena em cima do cozinheiro diz o que ele está segurando ("Cebola picada", "Sopa de cebola"...), para quem está aprendendo.
- **Teste E2E de verdade:** entra, abre a cozinha e faz uma sopa inteira só com o teclado. Anda até cada bancada pelo mesmo caminho do planejador (`K.rota`), pega, pica segurando F, põe na panela (quantas cebolas a receita pedir), serve e entrega. Outro teste confere as bolinhas do prato montando.

## Testes
- `npx playwright test tests/e2e/cozinha-entrega.spec.js tests/e2e/cozinha.spec.js tests/e2e/cozinha-tutorial.spec.js`: os 4 passaram.
- Conferido no navegador: a plaquinha "Tomate picado" e as bolinhas do prato com pão e alface (a carne frita aparece tracejada).
