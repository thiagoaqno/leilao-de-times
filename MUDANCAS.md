# Carreira: coletivas, pressão da torcida e viagem com recepção

## O que muda no jogo

- **Coletiva depois do jogo.** Depois de uma goleada, derrota, vitória em clássico, sequência de vitórias, ou quando a diretoria desconfia, chega uma coletiva com a pergunta do momento (e a de "o craque vai sair?"). Cada resposta mexe com imprensa, torcida, vestiário, diretoria, moral e até o próximo jogo (provocar o rival dá moral à sua torcida, mas ele vem mais motivado). No máximo uma a cada 2 rodadas.
- **Pressão da torcida.** Com a torcida em baixa e derrotas, a organizada pede reunião ou abre faixas no estádio; com a fase boa, ela faz festa no CT. E o clima vale em campo: torcida animada dá +1 na nota do time em casa, torcida irritada dá -1; fora, clássico e clube grande pressionam (-1), a menos que a sua torcida esteja do seu lado. O clima aparece na prévia do jogo.
- **Viagem e recepção no feed.** Antes de cada jogo saem as notícias do embarque (ônibus curto, ônibus, avião pela distância, voo internacional) e da recepção: festa da sua torcida em casa, cobrança quando ela está brava, ou fogos e barulho no hotel quando o rival é grande ou clássico.

## Como

`carreira-pressao.js` (`COLETIVAS`, `TORCIDA`, `escolher`, `climaDoJogo`), no formato do catálogo; `carreira-memoria.js` grava `ultimoJogo` em `aposJogo`; `carreira-eventos.js` sorteia depois das ecos; `carreira.js` soma o clima em `timeDe` e manda `estado().clima`; `carreira-feed.js` ganhou `viagem` (cidades, distância, modo, recepção), chamada ao fim de `entreRodadas`. Testes em `tests/carreira-pressao.test.js`.
