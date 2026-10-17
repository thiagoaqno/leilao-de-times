# Ajustes no Ginásio Pokémon e no Tênis de Mesa

## O que muda

- A janela de escolha usa cartões escuros com texto claro, inclusive no Pokémon selecionado, para manter os nomes legíveis.
- O robô normal reage e ataca com mais pausas e erra um pouco mais a mira. Fácil e difícil continuam como opções separadas; os líderes permanecem no difícil.
- A cena 3D usa sombras menores e ativa o modo leve mais cedo quando a taxa de quadros cai. No lobby Pokémon, a prévia atrás da arte passa a ser desenhada em ritmo reduzido.
- A aba da Noite deixa de cobrir os botões do painel durante o combate Pokémon.
- No Tênis de Mesa, a devolução e o saque ficam mais lentos. Top spin, cortada e curva lateral agem com menos força no voo e no quique; o gesto da raquete continua mudando a trajetória, mas de forma mais gradual. O intervalo entre pontos também dá mais tempo para acompanhar a partida.

## Verificação

- `node --test tests/ginasio-equilibrio.test.js tests/ginasio-fisica.test.js`
- `npx playwright test tests/e2e/ginasio.spec.js --reporter=line`
- `node --test tests/pingpong.test.js`
- `node --test --test-name-pattern=pingpong tests/servidor.test.js`
- `npx playwright test tests/e2e/pingpong.spec.js --reporter=line`
