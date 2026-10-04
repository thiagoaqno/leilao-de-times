# Palavra Proibida: as cartas não voltam de uma partida para a outra

- **O problema:** dentro de uma partida as cartas já não repetiam. Mas a cada "Jogar de novo" (ou sala nova) o
  servidor embaralhava o baralho inteiro de novo. Então as cartas da partida anterior podiam voltar na seguinte: com
  umas 50 cartas por partida, era normal 1 ou 2 se repetirem.
- **Agora:** é um monte só para o servidor inteiro. Uma carta só volta depois que as 2226 saíram, em qualquer sala e
  em qualquer partida. Só reembaralha quando o servidor reinicia.

## Testes
- `tests/servidor.test.js`: duas partidas seguidas na mesma sala, 120 cartas cada, nenhuma repetida. O teste falha
  com o código antigo e passa com o novo.
