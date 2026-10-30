# Corrida: grid e Mônaco

- Aumenta em 40% o espaçamento longitudinal entre filas do grid de F1, de 18 para 25,2 pontos em média; os dois carros de cada fila continuam lado a lado.
- Distribui a descida do Cassino a Portier pelo grampo, em vez de concentrá-la antes dele. Na chuva, os robôs consideram a aderência real ao frear atrás de outro carro e reduzem gradualmente o ritmo em Mirabeau e no grampo.
- Aproxima fachadas adicionais da calçada, amplia copas, dá mais altura e cor aos prédios próximos da pista e alinha a faixa do pórtico de largada à viga.

## Verificação

- `node --test tests/corrida-monaco-chuva.test.js tests/corrida-robos-curvas.test.js tests/corrida-grid.test.js tests/corrida-pistas-volta.test.js tests/corrida-f1-clima.test.js tests/corrida-punicoes.test.js`: 28 testes passaram. A simulação usa 20 robôs com chuva e verifica a passagem pelo grampo.
- `npx playwright test tests/e2e/corrida-monaco-carro.spec.js`: passou; verifica a orientação do carro e amostras do asfalto livres de prédios. A cena de largada foi inspecionada.
- Ainda é necessária uma volta jogada para conferir a Rascasse, as bordas e o comportamento de um pelotão sob chuva.
