# Futevôlei: o golpe não troca no meio da animação, e as trocas de animação são suaves

Antes: a animação do golpe começava antes do toque pela previsão do navegador, mas o golpe de verdade era escolhido só no toque, pela posição daquele instante. Um passo a mais e o jogador que tinha começado a bicicleta dava uma cabeçada: a animação pulava de uma para a outra. Numa partida de robôs medida, 6 de 17 toques trocavam de animação na hora do toque.

Depois: o golpe é combinado um pouco antes do toque (0,7 s) e vale no toque, então a animação que começou é a que termina. Só muda se a bola chegar numa altura em que aquele golpe não dá, ou se a pessoa trocar passar por atacar; nesse caso, e em qualquer troca de animação, a pose antiga sai aos poucos (0,22 s) em vez de saltar. Na mesma medição, 0 de 16 toques trocaram.

Como: `planejar`, `TRAVA`, `FAIXA` e `planoValido` em `public/futevolei/regras.js` (servidor e treino); o plano vai no pacote (`planoDoPacote` em `public/futevolei/jogo.js`) e a antecipação usa ele. No `AnimadorMixamo` (`public/futevolei/atleta-mixamo.js`), `disparar` guarda o golpe que estava na tela em `saida` e faz a transição, e `mesmoGolpe` não recomeça o mesmo clipe. Teste novo em `tests/futevolei.test.js`.
