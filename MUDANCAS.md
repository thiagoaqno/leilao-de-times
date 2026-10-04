# Palavra Proibida: intervalo entre as vezes

Antes, quando a vez de um time acabava, a próxima já começava com o relógio correndo. Agora tem um **intervalo**, para
a galera conferir os pontos e dar risada:

- **As cartas da vez na mesa:** todo mundo vê as cartas que saíram, com a palavra e as 5 proibidas. Inclusive o time
  que estava adivinhando, que até então não via a carta.
- **Carimbo em cada carta:** ✅ acertou, 🚫 proibida, 🙈 passou ou ⏱️ acabou o tempo.
- **"Não valeu":** o organizador ou o time que fiscalizou pode marcar que um ponto não valeu (alguém falou meia palavra
  proibida e passou batido), e o ponto sai. Dá para voltar atrás ("Valeu sim"). Quem jogou a vez não confere os
  próprios pontos.
- **A próxima vez só começa quando quem vai explicar aperta "Começar a minha vez".** O organizador também pode
  começar por ele, se a pessoa sumir. Sem relógio no intervalo: dá para rir à vontade.
- **Meta:** chegar na meta também passa pelo intervalo, para conferir. Se depois de conferir algum time ainda estiver
  na meta, o botão vira "Ver quem venceu".

## Arquivos
- `proibida.js`: estado `intervalo` (cartas da vez, quem explica na próxima) e as ações `naoValeu` e `comecar`.
- `public/proibida/index.html`: a tela do intervalo (as cartas espalhadas com o carimbo) e o texto de como jogar.

## Testes
- `tests/servidor.test.js`: com 4 pessoas, a vez acaba e entra o intervalo com as cartas.
  - O time que jogou não consegue anular o próprio ponto; o outro time anula e o placar desce.
  - A vez não começa sozinha, nem por quem não vai explicar; quando quem vai explicar aperta, começa a vez do outro
    time.
- Teste das salas regravado: só entrou o campo `intervalo`.
- `npm test` e o teste de abrir as páginas passando.
- Testado no navegador com 3 jogadores de mentira: o "não valeu" tirou o ponto e a vez seguinte voltou para o
  intervalo.
