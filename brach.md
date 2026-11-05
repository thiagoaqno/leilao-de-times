# Usa uma referência única em Mônaco para a McLaren

A McLaren padrão passa a usar a volta de 48,4195 s como referência única de trajetória em Mônaco, preservando as variações naturais de cada piloto. A linha visual mostra a mesma geometria. Em pista livre e seca, com macio na faixa arcade, um teto calibrado e ajustes de ritmo separam os três níveis. Outras montagens e condições mantêm os controles anteriores.

Em quatro sementes reservadas, com duas voltas e o mesmo jogo de pneus, o Norris completou oito voltas sem contato em cada nível. O difícil variou entre 56,95 e 58,45 s, ainda longe da referência; o arquivo da volta não informa a montagem usada, então não há comparação direta de desempenho. Os testes não representam pelotão, outras equipes ou uma corrida completa. Detalhes em `planos/referencia-unica-monaco.md`.

## Verificação

- `node --test tests/corrida-monaco-referencia.test.js`
- `node --test --test-name-pattern "Mônaco molhado" tests/corrida-monaco-chuva.test.js`
- Suíte completa não executada, conforme pedido.
A volta recente do jogador com McLaren padrão e macio ficou em aproximadamente 52,95 s e oferece uma segunda referência, com condições conhecidas. Não foi usada para treinar este protótipo; a volta de 48,4195 s foi escolhida para o traçado a pedido do usuário.
