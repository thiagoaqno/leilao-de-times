# Carreira em grupo: quem sai no meio não segura a turma, e o anfitrião pode dispensar

Antes, se um parceiro saísse no meio, a rodada esperava por ele: o jogo dele continuava e cada parada (os lances do modo
3, por exemplo) esperava 20 segundos pela decisão. Agora dá para seguir sem ele, de duas formas.

## Quem saiu joga no automático (sem configurar nada)
- Quem fica fora da sala por mais de 15 segundos é **ausente**. Recarregar a página ou perder o sinal por um instante
  não conta.
- O jogo só de ausentes anda na hora, com as decisões automáticas (as mesmas que valem quando o tempo acaba).
- Num jogo com alguém que está aqui, as paradas do ausente valem a decisão automática na hora, sem esperar os 20 segundos.
  Quem está aqui joga no ritmo normal.
- Se a pessoa volta, retoma do ponto em que está, com o time e o caixa como ficaram.

## O anfitrião pode dispensar
- Na sede, um painel **Turma** mostra quem está no ar e quem está fora. O anfitrião ganha o botão **Dispensar** (com
  confirmação) ao lado de cada técnico. Na sala de espera, o mesmo botão aparece na lista de técnicos.
- **Na sala de espera:** a pessoa sai da sala e o clube fica livre.
- **No meio da carreira:** o clube passa para o computador, com o caixa que tinha e o elenco como estava. O leilão em que
  ele estava (como dono ou com lance) é cancelado. A pessoa vira espectador e volta para o começo, com um aviso.
- **Com a bola rolando:** o jogo dele anda no automático e ele sai no fim da rodada. Não dá para dispensar o anfitrião.
- As rodadas seguintes têm só os jogos de quem ficou.

## Conferido
- `tests/carreira-rodada.test.js` (o jogo de ausentes anda sem o relógio, e a parada de quem sai no meio da decisão não
  espera) e `tests/carreira-online-dispensar.test.js` (pelo canal de verdade: a rodada com um técnico ausente acaba sem
  esperar as decisões dele, dispensar na espera, entre as rodadas e com a bola rolando).
- Na tela, com dois navegadores (`planos/imagens/carreira-turma-dispensar.png`): o botão aparece só para o anfitrião, e o dispensado volta para o começo.
- O e2e da carreira não foi rodado desta vez.
- `tests/carreira-evolucao.test.js` ficou estável: os avisos sem resposta valem a opção padrão na virada e podiam mexer na nota de um jogador depois de o teste anotar o "antes" (falhava em cerca de 1 de cada 3 execuções). O teste agora resolve os avisos antes.
- A mudança é no servidor da sala em grupo e na página (`CARREIRA_AUSENTE_MS` ajusta o tempo de ausência).
