# Naruto Shippuden nas batalhas por turnos da Vila

## O que entrou

- Terceiro modo na seleção de times e no desafio entre amigos: 12 ninjas de Naruto Shippuden, em times de 3.
- Quatro ações por ninja, com jutsus que consomem chakra. Concentrar recupera 35 pontos; cada lado tem duas Substituições que custam 20 de chakra e bloqueiam um ataque.
- O servidor valida o chakra, resolve as ações e envia os novos estados para os dois jogadores. Galeramon e Pokémon continuam com as regras anteriores.
- Ícones de sprites do jogo *Naruto Shippuden: Naruto vs. Sasuke* (Nintendo DS), guardados localmente para não depender do site de origem durante a partida. A fonte e as condições de uso estão em `public/galeramon/NARUTO-ASSETS.md`.
- O Ginásio em tempo real continua com Galeramon e Pokémon; o botão fica indisponível ao escolher Naruto.

## Conferido

- `npm test`: 164 testes passando após atualizar a branch com `main`.
- `npx playwright test tests/e2e/naruto.spec.js`: dois testes passando; seleção, carregamento do sprite, convite, um turno com chakra e layout no celular.
- Capturas da seleção, da luta e da tela do celular em `test-results/`.
