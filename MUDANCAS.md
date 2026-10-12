# Gatinhos Explosivos na Vila (fase 1)

**Antes:** a Vila não tinha nenhum jogo no estilo Exploding Kittens; o terreno do canto da Rua das Cartas estava vazio, com a placa "EM BREVE".

**Depois:** a **Toca dos Gatinhos** ocupa esse terreno (telhado laranja com um gatinho-bomba) e abre o **Gatinhos Explosivos**, de 2 a 5 jogadores, com sala de código, convite, avatar, só assistir e reconexão como os outros jogos de cartas. Esta fase é só a estrutura e a jogabilidade: o visual está simples de propósito; cores, animações e efeitos vêm na próxima.

**Regras (cartas e textos nossos):**
- Cada um começa com 1 Desarmar e 7 cartas; o monte leva um Gatinho Explosivo a menos que o número de jogadores.
- Na sua vez, jogue quantas cartas quiser e termine comprando. Gatinho sem Desarmar = explode; com Desarmar, você escolhe em segredo onde ele volta no monte.
- Cartas: Ataque (o próximo joga 2x; ataques empilham), Pular, Favor (o alvo escolhe a carta que dá), Embaralhar, Espiar o Futuro (só você vê as 3 de cima), Nem Pensar e 5 gatos (par rouba uma carta, trio pede uma carta pelo nome).
- Toda jogada abre uma janela curta para o Nem Pensar de qualquer pessoa viva; número ímpar cancela. Nem Pensar também pode ser cancelado.
- Relógios: quem demora compra sozinho; favor e Desarmar se resolvem sozinhos; quem caiu da sala não segura a mesa. O vencedor entra no placar da Noite da Galera.

**Onde:** `kittens.js` (servidor, canal `/kittens`), `public/kittens/` (página e `regras.js`), prédio em `public/index.html`/`vila.js`, `noite.js`, `tests/kittens.test.js` e `tests/salas.test.js`.
