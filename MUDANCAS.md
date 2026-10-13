# Gatinhos Explosivos removido

**Antes:** a Vila tinha a Toca dos Gatinhos (Gatinhos Explosivos) na Rua das Cartas, com canal `/kittens`.

**Depois:** o jogo saiu por completo: o prédio some e o lote volta a ser terreno "em breve", o canal, a página e os testes são apagados, e ele deixa a Noite da Galera e a lista de salas.

**Como:** apagados `kittens.js`, `public/kittens/` e `tests/kittens.test.js`; tirados os registros em `server.js`, `noite.js`, `public/noite.js`, `lobby.js`, `vila.js`, `public/index.html` (prédio e telhado), `tests/salas.test.js`, `tests/salas-esperado.json`, `package.json` e a linha do `CLAUDE.md`. O código continua no histórico do git (PRs #202, #205).
