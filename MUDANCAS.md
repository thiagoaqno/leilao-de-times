# Corrida: os carros batem de verdade, motor com marchas e som de batida

Antes: os outros carros eram fantasmas translúcidos. Dava para passar por dentro deles, ninguém empurrava ninguém. O motor era uma nota só que subia com a velocidade, e bater em outro carro não fazia barulho.

Depois: os carros são sólidos e batem. Quem encosta empurra e é empurrado, com peso (o tanque leva os outros embora, a formiga sai rodando), tremida da câmera e um estalo com ruído, mais forte quanto maior a batida. Em viaduto ou no ar, um passa por cima do outro. O motor tem 5 marchas (a rotação sobe, cai na troca e dá um tranco) e o sopro do vento cresce com a velocidade. O fantasma dourado do recorde continua, porque é a volta da própria pessoa, não outro piloto.

Como: a conta da batida fica em `public/corrida/colisao.js` (3 círculos por carro, impulso pela massa e pela velocidade relativa; cada navegador resolve a sua metade com a posição que recebeu do outro, então os dois chegam quase no mesmo resultado). `physics` em `fisica.js` chama `baterNoOutro` para cada outro piloto. Os sons novos estão em `sons.js` (`crash`, marchas e vento do `engine`). Teste: `tests/corrida-colisao.test.js`. Ficou de fora, por precisar de arquivos de fora: modelos 3D de carro e sons gravados.
