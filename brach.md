# Corrida: estimar chegada dos robôs depois dos humanos

Quando o último humano termina um GP de F1, a corrida fecha imediatamente e projeta a chegada dos robôs ainda na pista a partir do progresso e da última volta (ou de uma referência do carro). O resultado identifica os tempos estimados. Carros que abandonaram ou foram desclassificados permanecem nessa condição.

Os acréscimos já recebidos entram na ordem final. Stop-and-go pendente é convertido em 20 s e a regra de compostos considera os pneus já usados: a projeção não simula futuras paradas, trocas de pneus ou incidentes.

## Verificação

- `node --test tests/corrida-chegada-estimada.test.js tests/corrida-chegada-relogio.test.js`: 3 passaram; cobre dois humanos, projeção, penalidade, stop-and-go, DSQ e DNF.
- Testes de sala de box e resultado: 2 passaram.
- O teste completo de navegador e o `npm test` completo não foram validados nesta branch; a base já apresentava 23 falhas no CI do PR #441.
