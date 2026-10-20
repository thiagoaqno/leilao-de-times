# Corrida: robôs sem vantagem de velocidade

## O que muda
- **Velocidade final:** os robôs copiam a melhor volta gravada da pista, e essa volta trazia os trechos em que a pessoa
  estava no vácuo, no estilingue ou com turbo (o filtro aceitava até 1,4x a velocidade final). O robô andava "no
  vácuo" a volta inteira. Agora cada amostra da volta conta no máximo a velocidade final do carro, e o robô nunca passa
  dela (só com turbo ou estrela de item, como quem joga). Vale também para as voltas que já estão guardadas no banco.
- **Arrancada:** o robô acelerava 1,5x (ou 2,2x copiando uma volta gravada) mais forte que o carro de quem joga. Agora
  usa a mesma conta do `fisica.js`.
- Os robôs não têm vácuo (ele só existe no carro de quem joga), então não era um empurrando o outro.

## Testes
- `tests/corrida-robos.test.js`: um robô copiando uma volta gravada a ~1,4x a velocidade final não passa da final do
  carro e, em cada instante da largada, não está mais rápido que o carro de quem joga acelerando o tempo todo. O teste
  falha sem a correção.
