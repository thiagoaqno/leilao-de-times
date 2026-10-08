# Naruto Shippuden nas batalhas da Vila e do Ginásio

## O que entrou

- Terceiro modo na seleção de times e no desafio entre amigos: 12 ninjas de Naruto Shippuden, em times de 3.
- Quatro ações por ninja, com jutsus que consomem chakra. Concentrar recupera 35 pontos; cada lado tem duas Substituições que custam 20 de chakra e bloqueiam um ataque.
- O servidor valida o chakra, resolve as ações e envia os novos estados para os dois jogadores. Galeramon e Pokémon continuam com as regras anteriores.
- Ícones de sprites do jogo *Naruto Shippuden: Naruto vs. Sasuke* (Nintendo DS), guardados localmente para não depender do site de origem durante a partida. A fonte e as condições de uso estão em `public/galeramon/NARUTO-ASSETS.md`.
- Ginásio em tempo real com Naruto em 1x1 e 2x2, contra pessoas, robôs ou líderes. Chakra regenera a 8 pontos por segundo; jutsus têm custo próprio e cada jogador dispõe de duas Substituições (20 de chakra cada).

## Conferido

- `node --test tests/ginasio.test.js tests/ginasio-servidor.test.js tests/naruto.test.js`: 30 testes passando.
- `npx playwright test tests/e2e/naruto.spec.js`: três testes passando; Vila por turnos, Ginásio em tempo real e layout no celular.
- Capturas da seleção, da luta e da tela do celular em `test-results/` (geradas pelos testes).
