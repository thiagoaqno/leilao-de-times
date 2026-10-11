# Carreira: mercado de técnicos

## O que muda no jogo

- **Propostas de outros clubes.** No fim de cada temporada (menos a última), clubes que gostaram do seu trabalho sondam você: até três, um maior, um do mesmo tamanho (de preferência em outra liga) e um menor. O que abre portas é a reputação, a meta da diretoria cumprida, os títulos e a classificação; quem foi mal recebe menos convites, e às vezes o telefone nem toca. Clubes que vão cair não convidam.
- **Escolher na Sede.** A aba Temporada mostra cada proposta com escudo, liga, força comparada ao seu time, caixa e o projeto que a diretoria nova cobraria. Aceitar ou "Ficar" vale até a virada; dá para mudar de ideia. O fim de temporada avisa e leva até as propostas.
- **A troca.** Na virada, você assume o clube novo: elenco, caixa, calendário, liga e copas são os dele. Você leva a reputação, os pontos e as habilidades de técnico; estádio, contratos, base e diretoria são do clube novo (confiança começa em 60), e a torcida chega desconfiada. Sai notícia da apresentação no feed, e o guia explica.
- Só na carreira solo com a base mundial; na sala em grupo cada técnico segue com o clube que escolheu.

## Como

`carreira-tecnicos.js` (`gerar`, `escolher`, `aplicar`) guarda `save.vagas`; `registrarTemporada` gera as propostas, a ação `vaga` (socket) escolhe e `novaTemporada` aplica antes de a temporada virar. `estado().vagas` alimenta `vagasNaSede` (`telas.js`, `#cartaoVagas`). Testes em `tests/carreira-tecnicos.test.js`.
