# Usa uma referência única em Mônaco e amplia o grid para 22

Em Mônaco, os carros de F1 seguem a volta de 48,4195 s como referência comum, com variações dos pilotos e freada ajustada ao carro. Em pista seca, livre e com macio, os níveis usam limites calibrados; na chuva a mesma linha recebe margens mais conservadoras. A volta recente de 52,95 s com McLaren padrão é uma segunda referência com condições conhecidas, ainda não usada para treinamento.

Nas duas voltas de macio da bancada, com os 22 pilotos simulados individualmente, houve quatro contatos e nenhuma saída em 44 voltas. O teste é em pista livre, não garante resultado em tráfego nem configurações desenvolvidas. Os tempos ainda estão acima das voltas humanas.

A corrida rápida e as carreiras passam a comportar 22 carros. A temporada preenche as vagas após contratações e aceita o fechamento de GPs antigos com 20 carros. A classificação, a marcação visual do grid e as telas acompanham a nova quantidade.

## Verificação

- `node --test tests/corrida-monaco-referencia.test.js`
- `node --test --test-name-pattern "Mônaco molhado" tests/corrida-monaco-chuva.test.js` (22 carros)
- Testes focados de sala nova, classificação e temporadas solo e em grupo.
- Suíte completa não executada, conforme pedido.
