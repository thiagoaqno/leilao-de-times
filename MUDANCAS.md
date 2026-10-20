# Corrida: robôs sem vantagem de velocidade, turbo mais longo e desfoque mais forte

## O que muda
- **Velocidade final dos robôs:** eles copiam a melhor volta gravada da pista, e essa volta trazia os trechos em que a
  pessoa estava no vácuo, no estilingue ou com turbo (o filtro aceitava até 1,4x a velocidade final). O robô andava "no
  vácuo" a volta inteira. Agora cada amostra da volta conta no máximo a velocidade final do carro, e o robô nunca passa
  dela fora do turbo e da estrela. Vale também para as voltas que já estão guardadas no banco.
- **Arrancada dos robôs:** acelerava 1,5x (ou 2,2x copiando uma volta gravada) mais forte que o carro de quem joga. Agora
  usa a mesma conta do `fisica.js`, inclusive com turbo e estrela.
- Os robôs não têm vácuo (ele só existe no carro de quem joga), então não era um empurrando o outro.
- **Turbo do cogumelo mais longo:** 3,5 s acima da velocidade final (era 1,5 s) e, quando acaba, o excesso some aos
  poucos (`TURBO_SOLTA`, uns 90 km/h por segundo; era quase na hora). Fora da pista continua cortando na hora. O vácuo e
  o estilingue também terminam assim, sem tranco. Os valores ficam em `pistas.js` (`TURBO_MS`, `TURBO_SOLTA`), usados
  pelo servidor, pelos robôs e pelo navegador.
- **Desfoque de velocidade mais forte:** a força ainda era a da época do F1 (começava em 160 e só enchia em 340), então com o
  kart nunca passava de uns 75% (e uns 50% nos carros mais lentos). Agora vai pela fração da velocidade final de cada carro:
  começa em 40% (uns 90 km/h no equilibrado), fica inteiro a 90%, e o turbo e o estilingue borram ainda mais (até 1,4). O
  passe também puxa um pouco mais (`0.09`, era `0.075`). E o ajuste de qualidade agora tira as sombras antes e o
  desfoque só por último (nível 3), em vez de tirar os dois juntos.

## Testes
- `tests/corrida-robos.test.js`:
  - um robô copiando uma volta gravada a ~1,4x a velocidade final não passa da final do carro e, em cada instante da
    largada, não está mais rápido que o carro de quem joga acelerando o tempo todo (falha sem a correção);
  - o cogumelo dura `TURBO_MS`, o robô com turbo passa da velocidade final e, logo depois que acaba, ainda está acima dela.
