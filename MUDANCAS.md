# Kit de pista: o que fizemos em Mônaco vira peça para qualquer GP

Preparação para criar as outras pistas da temporada (Barcelona primeiro) e melhorar as atuais sem refazer tudo. Mônaco continua igual na tela (mesmos números de painéis, postos, placas, luzes do túnel e zebras); a física não muda.

**`public/corrida/kit/`** (com o guia `kit/README.md`)
- `chao.js`: margem (sarjeta de rua ou faixa de cor), zebras só nas curvas, zebras amarelas, faixas de pedestre, linha tracejada, linhas SC, grid numerado, remendos e bueiros.
- `beira.js`: guard-rail em painéis com patrocinadores e as fachadas com sacadas, toldos e telhados.
- `ambiente.js`: cerca, painéis, mastros com a bandeira do país, postos de fiscais e placas de 100/50 m.
- `marcos.js`: passarelas, postes de rua e a serra no horizonte (em qualquer direção).
- `vida.js` e `som.js`: helicóptero da TV, gaivotas, fiscais com a bandeira e o som por região (agora com uma região nova, `campo`: vento e passarinhos para autódromos).
- `marcas.js` (veio de `public/corrida/`) e `comum.js` com as ferramentas.

**`public/corrida/gps/`**: a configuração de cada GP. `pista.js` lê `GPS[id]` no lugar dos `if (id === "monaco")`. Mônaco usa todas as peças (e guarda a capela de Sainte Dévote); Interlagos por enquanto só o asfalto e o ambiente próprio. Os outdoors e as bandeirolas de `vida.js` passam a seguir o que o GP tem, não o nome da pista.

Validação: 29 testes da corrida passaram; `git diff --check` sem erros. No navegador do app, Mônaco montou com os mesmos números de antes, sem erro no console, e Interlagos, Tóquio, Rio e Nürburgring montam normalmente.
