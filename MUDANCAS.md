# Vila: prédios no estilo "arena"

## O que muda no jogo

- Os prédios da Vila ganham a cara da central do FIFA: fachada escura na cor do prédio, vidro azulado nas janelas e nas portas, faixa de LED no beiral, marquise sobre a porta, claraboia no telhado de painéis e a placa em fundo azul-marinho com o acento do prédio.
- Os telhados temáticos de cada jogo (quadra, tabuleiro, bandeira quadriculada, Pokébola...) continuam como eram, por cima do telhado novo.

## Como foi feito

- Só o desenho em `public/index.html` (`drawBuilding`, `drawSign`, e os novos `mistura` e `acentoDe`): o acento vem de `roof` de cada prédio (mais claro quando o telhado é escuro). Nada de dados, servidor ou colisão mudou; `wall` e `wall2` ficam em `GAMES` sem uso, para não mexer nas entradas (o prédio do Rumo ao Estrelato já usa o estilo).
- `tests/e2e/vila-ginasio.spec.js` passa.
