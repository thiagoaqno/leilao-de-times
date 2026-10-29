# Corrida: o box de Barcelona passa a ficar em volta da linha de chegada, com o prédio no passo das garagens

## O que estava errado
Em `pistas.js`, `BOXES.barcelona` era `{ entra: 0.0118, para: 0.03, sai: 0.0482 }`: o corredor começava 164 depois da linha, as 10 garagens ficavam de 277 a 555 e a saída era em 669, tudo depois da chegada (as outras pistas de GP têm o corredor simétrico em volta da linha, como Interlagos e Monza). O #388 só moveu o prédio e a tribuna em `barcelona.js` para cobrir esse trecho, então a fileira de garagens do jogo continuava toda de um lado da linha e, com a entrada depois da chegada, quem pedia a parada na penúltima volta não conseguia entrar. As portas do prédio (uma textura a cada 60) também não batiam com as garagens do kit (uma a cada 31,2), e o prédio não era centrado nelas.

## O que mudou
- `BOXES.barcelona = { entra: 0.9818, para: 0, sai: 0.0182, lado: 1 }` (só os números do box; traçado, `hills`, `largada` e o resto de Barcelona não mudaram): o corredor de 505 fica em volta da linha, a entrada em -252, as 10 garagens centradas nela (de -140 a +140, a cada 31,2) e a saída em +252. A entrada antes da chegada é a mesma correção de Monza. `chao.sc`, as placas de SC e a passarela de 0,962 (em -527, antes da entrada) seguem sozinhas.
- `barcelona.js`: o prédio dos boxes fica centrado na linha (de -468 a +468, 30 portas) com a torre de controle de prova NA linha de chegada, e a tribuna principal do outro lado também (de -500 a +500). O passo das garagens vem do próprio corredor (`F1Regras.corredor(...).gap * 6`), então o prédio acompanha o corredor se os números mudarem.
- `kit/barcelona/pecas.js`: `complexoDosBoxes` ganhou `passoGaragem` (a textura dos portões repete a cada garagem em vez de a cada 60): um portão do prédio atrás de cada garagem do jogo.
- Como as garagens são distribuídas: são sempre 10 (`F1Regras.GARAGENS`), no mesmo lugar qualquer que seja o número de carros; o piloto de grid `k` para na garagem `k % 10` (`garagemDe`, em `sim.js` e `corrida-robos.js`) e `jogo.js` pinta a garagem `grid % 10` com a cor da equipe de quem está nela. Prédio, fileira e corredor agora coincidem para 1 ou 20 carros; com mais de 10 carros, o par `k` e `k + 10` divide a mesma garagem, como nas outras pistas.
- Teste novo em `tests/corrida-f1-box.test.js`: o corredor de Barcelona envolve a linha, as garagens são simétricas e o passo é o das portas do prédio.

## Conferido
Só montei a cena de Barcelona no Node (sem WebGL): as 10 garagens do kit são construídas, o corredor vai de -252 a +252 com as garagens de -140 a +140, e a conferência de invasão da pista dá zero. Não rodei os testes nem abri o navegador: o Thiago joga e testa.
