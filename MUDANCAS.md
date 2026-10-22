# O servidor não cai mais com um pacote quebrado

## O problema

Um único `emit("create", null)`, que qualquer visitante pode mandar pelo console do navegador, derrubava o servidor
inteiro, com as salas de todos os jogos. Os handlers usam `(data = {}, cb)`, e o valor padrão só vale para
`undefined`: com `null`, `data.code` dá erro. Um `cb` que não é função quebrava o `ok`/`falha`. Como o Socket.io chama
os handlers fora de qualquer try, o processo caía.

## O que muda

- **`protegerCanais(io)`** (`salas.js`), chamado no `server.js` logo depois de criar o `io`, antes dos jogos. Cada
  `socket.on` de todos os canais (os jogos, a Carreira, a Vila, o Leilão no canal padrão) passa a rodar dentro de um
  try, e o erro de um handler async também é pego. O erro vai para o log com o canal e o evento, e quem pediu com
  callback recebe `{ ok: false, error: "Pedido inválido." }`. Nenhum jogo precisou mudar.
- **`ok` e `falha`** só chamam o callback se ele for uma função.
- **`tests/ajuda.js`:** `parar()` não fica mais esperando para sempre quando o servidor já caiu. Antes, isso
  escondia o erro de verdade do teste.

## Testes

- **Novo, `tests/entrada-invalida.test.js`:** lê no código os canais (`io.of("/canal")`) e os eventos de cada um
  (`socket.on("evento")`), manda nove tipos de lixo para todos (mais de 500 eventos) e confere que o servidor continua
  atendendo.
  - Antes da correção, falha: o lixo mandado ao Leilão derruba o servidor.
  - Depois, passa.
- `npm test` inteiro, com o teste novo na lista.
