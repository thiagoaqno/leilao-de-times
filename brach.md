## Carro da carreira e entrada do box em Monza

### Causa
- A entrada dos boxes de Monza estava 1,3% da volta **depois** da linha de chegada. Um pedido feito mais adiante na volta 4 de uma corrida de 5 voltas só encontrava essa entrada na última volta, quando a parada já é bloqueada.

### O que mudou
- Carreiras novas, solo e em grupo, começam com os pontos do carro livres. A aba **Carro · Pontos** permite distribuí-los entre os seis atributos e redistribuir depois, dentro do orçamento.
- No grid final após a classificação, os pilotos da carreira podem ajustar esses pontos antes de confirmar a largada. O acerto é salvo na temporada e vale para os dois carros da equipe. Saves existentes mantêm a montagem atual.
- A sala F1 fora da carreira continua com a montagem por peças.
- A entrada foi movida para o fim da reta anterior à linha, com garagens junto da chegada e saída no começo da reta seguinte.
- Um cenário de regressão verifica que a entrada fica antes da linha e a saída depois dela.

### Verificação
- A geometria da reta de Monza foi conferida pelos pontos amostrados da pista; o trecho entre 98,3% e 1,7% é reto.
- Os cenários de carreira que dependiam da montagem inicial fixa foram atualizados. Testes finais não foram executados, conforme solicitado.
