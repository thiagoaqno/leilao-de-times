# Carreira: a memória do clube (efeito dominó nas escolhas)

## O que muda no jogo

Antes, cada acontecimento da caixa de entrada era um efeito solto: acontecia, passava e o jogo esquecia. Agora o clube lembra do que você fez, e isso volta.

- **Relações:** a torcida, a imprensa e o vestiário têm uma nota de 0 a 100 (a diretoria continua sendo a confiança). Resultados, clássicos, goleadas, títulos, rebaixamento, a venda de um craque e cada escolha da caixa de entrada mexem nelas. E elas mexem no jogo: a torcida muda a bilheteria (de -12% a +12%), o vestiário unido segura a moral depois da derrota (rachado, piora) e a imprensa amiga segura a diretoria (hostil, pressiona).
- **Perfil do técnico:** sai do que as suas escolhas fizeram, não de uma pergunta. Punir e cobrar deixa você linha-dura; acolher deixa você paizão; abrir a carteira, mão-aberta; segurar o dinheiro, pão-duro.
- **Laços com os jogadores:** cada decisão que atinge um jogador vira gratidão ou mágoa. Os acontecimentos seguintes preferem quem já tem história, então o mesmo jogador vira personagem.
- **Ecos:** 13 acontecimentos novos que só existem por causa do passado, com a lembrança do que os causou: a mágoa que volta (e pode virar pedido de saída), a gratidão que se paga em campo ou no contrato, o vestiário reclamando do pulso firme, o treino relaxado de quem é paizão demais, a diretoria cobrando a conta, a faixa ou o mosaico da torcida, a coletiva hostil ou o jornalista que sopra a tática do adversário, o rival pedindo revanche, a torcida cobrando a venda do ídolo, o peso da faixa de campeão e a ferida do rebaixamento. As respostas dos ecos também ficam na memória: o dominó continua.
- **Na tela:** cada resposta mostra o que andou nas relações (ex.: "Torcida +2 · Vestiário −3"). O painel **A história do clube** (Sede, abas Meu time e Temporada) mostra o perfil, as relações, quem guarda mágoa ou gratidão e o diário das últimas decisões e marcas.
- Com o tempo a memória esfria: na virada as relações voltam um pouco ao meio e os laços perdem força.

## Como

- `carreira-memoria.js` é o módulo novo: o estado em `save.memoria` (campo do clube, entra em `CAMPOS_CLUBE`; saves antigos criam na hora), `aprender` (lê o rastro das ajudas que a escolha chamou), `aposJogo`, `fimDeTemporada`, `vendeu`, `fatorTorcida`, `estado` e o catálogo `ECOS` (mesma forma do catálogo de eventos).
- `carreira-eventos.js`: o contexto das ajudas grava o rastro e ganhou `x.torcida`, `x.imprensa`, `x.vestiario`, `x.confianca`, `x.perdoar` e `x.retribuir`; os alvos `magoado` e `grato`; no máximo um eco a cada 3 rodadas, cada um uma vez por temporada.
- `carreira.js` chama a memória depois de cada jogo, no fim da temporada, na venda e na bilheteria, e manda `estado().memoria`.
- `public/carreira/telas.js` (`memoriaNaSede`, a lembrança na caixa de entrada), `index.html` (`#cartaoMemoria`) e `hub.css`.
- Testes em `tests/carreira-memoria.test.js`.
