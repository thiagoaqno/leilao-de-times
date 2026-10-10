# Carreira: só o Brasileirão conta como rodada

Na carreira do calendário mundial, cada clube contava as rodadas da própria liga e várias telas usavam a contagem de jogos do técnico (que soma as copas). Agora a rodada é uma só para todo mundo: as rodadas do Brasileirão que o mundo já jogou, pela semana.

- **Janela de transferências:** abre e fecha pela rodada do Brasileirão (começo até a rodada 4, meio da 17 à 21) para qualquer clube, de qualquer liga, inclusive quem só joga copa. Na carreira em grupo, a rodada é a do técnico mais adiantado da sala (todos jogam as mesmas semanas), então a janela do meio abre no mesmo momento para todos. Jogo de copa não muda a rodada.
- **Na tela:** a "Rodada" do cabeçalho da Sede conta até 38 (as rodadas do Brasileirão), o ícone de janela aberta no calendário vem do servidor pela semana de cada jogo (antes, o jogo de copa usava o número da rodada da copa), e o "R" das notícias mostra a rodada do Brasileirão (`rl`), e não mais o número de jogos do técnico.
- **Código:** `rodadaDaJanela` (`carreira.js`) conta as semanas do Brasileirão até a última semana jogada (`semanaFeita`; na sala, com `ultimaSemanaDosHumanos` e `semanaDosHumanos` da visão). O estado ganha `rodadasLiga` e `janela` em cada jogo de `meus`. A contagem de jogos do técnico (`save.rodada`) continua valendo para o resto (efeitos, finanças, ids).
- Carreiras antigas (só o Brasileirão) seguem como antes.
- Testes: `tests/carreira-rodada-brasileirao.test.js` (Flamengo, Arsenal e Bayern na mesma sala ficam na mesma rodada semana a semana; copa não conta; sozinho com o Arsenal, a janela do meio abre na rodada 17 do Brasileirão). Três testes antigos usavam ids de jogo inventados para marcar a rodada e passaram a usar os jogos de verdade do calendário.

Conferido: os testes da carreira e das salas (189 de 189).
