# Vila: a Sede da Carreira

## Como fica
- **Prédio novo na Praça da Galera:** a **Sede da Carreira**, entre o chafariz e o Quiosque do Botão, com a porta virada
  para a praça.
  - O telhado é verde de telha, com a cumeeira dourada e um escudo pintado com a estrela.
  - A placa diz "SEDE".
- **Chegando na porta** aparece o cartão "Sede da Carreira", e Espaço (ou "Entrar") abre a Carreira de Treinador
  (`/carreira/`).
- **Voltando com "← Vila"**, você aparece na porta da Sede.
- **A Sede também aparece no menu Jogos**, em "Praça da Galera", e no minimapa.
- O banco de praça que ficava nesse lugar saiu; os outros três continuam.

## Por dentro
- `public/index.html`:
  - a Sede entra em `GAMES` (`x: 23, y: 18`, 6x4, portas 25 e 26, bairro `praca`, `sede: true`);
  - o telhado próprio fica em `drawBuilding`;
  - o banco `[25, 18]` saiu de `BENCHES`.
- `vila.js`: `carreira` entra na lista `GAMES`, para o servidor aceitar a entrada no prédio.

## Conferido
- `npm test`: 85 passaram, 0 falharam. Numa das rodadas, um teste dos que às vezes falham por tempo falhou; na seguinte,
  tudo passou.
- `npx playwright test tests/e2e/vila-ginasio.spec.js tests/e2e/paginas.spec.js`: 28 passaram (caminhada até as portas,
  entrar e voltar, e todas as páginas abrindo sem erro).
- No navegador:
  - a Sede apareceu na Praça;
  - o cartão abriu na porta;
  - "Entrar" levou para `/carreira/` e guardou a volta na porta da Sede;
  - a Sede apareceu no menu Jogos, em "Praça da Galera".
  - Foto em `planos/imagens/vila-sede-carreira.jpg`.
