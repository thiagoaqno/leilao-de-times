# Suaviza a direção e recupera ritmo em Mônaco

Os robôs de F1 passam a suavizar mudanças rápidas no volante em cada passo da física. Em Mônaco, a redução de velocidade do trecho crítico entra e sai gradualmente e é menor, permitindo acelerar mais. A volta humana continua sendo uma referência de trajetória; os carros seguem dirigidos pela física e pelo controlador do jogo.

Com Norris, McLaren padrão, pista seca e duas voltas lançadas com o mesmo macio, quatro sementes reservadas tiveram média de cerca de 58,86 s e nenhum contato, contra aproximadamente 59,46 s na versão anterior. Na semente 951, a mudança média de volante por passo passou de 0,0216 para 0,0153; o maior salto medido caiu de 0,838 para 0,449. As condições de referência não cobrem corrida completa, outros pneus ou todas as pistas.

A bancada `node ferramentas/medir-largada.js` simula 22 bots e registra velocidade e contatos nos primeiros 15 s. Em Mônaco, na semente 951, a média aos 10 s passou de 129 para 179 unidades/s e os contatos de três para zero; na 952, foram três contatos em ambas. Em Interlagos, uma semente teve dois contatos e outra passou de dois para quatro: o teste é pequeno e não demonstra melhora geral da largada. A bancada também mede o tempo de CPU, sujeito ao computador usado.

## Verificação

- `node --test tests/corrida-volante-fluido.test.js`
- `node --test tests/corrida-monaco-referencia.test.js`
- `node --test --test-name-pattern "Mônaco molhado" tests/corrida-monaco-chuva.test.js`
- `node --test --test-name-pattern "os outros carros: interpolação" tests/corrida-f1-rede.test.js`
- Suíte completa não executada, conforme pedido.
