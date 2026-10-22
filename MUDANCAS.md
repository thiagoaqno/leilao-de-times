# Drag: o racha com a galera (até 4 pessoas)

O Drag agora dá para correr com a galera: até 4 pessoas na mesma sala, cada uma no seu computador e numa faixa, e as
faixas que sobram ficam com os rivais robôs. Sozinho, sem sala, continua igual.

## Como joga
- Na garagem, a caixa **Racha com a galera**: o seu nome e **Abrir racha**, ou o código e **Entrar**. **Convidar**
  copia o link da sala. A sala também aparece no lobby da Vila e entra na Noite da Galera (placar e "Bora de outro
  jogo").
- A lista mostra quem está no racha, com o carro de cada um, e as vagas que vão ser de robô. Cada um escolhe o seu
  carro; o organizador escolhe a pista e dá a largada (**Largar o racha**). Para os outros, o botão fica em
  "Esperando o organizador".
- Todo mundo carrega os carros de todos, monta a pista e avisa que está pronto. O servidor marca o instante da
  largada, o mesmo para todos (quem demora mais de 25 s não segura os outros).
- Na pista, você vê os carros da galera andando na faixa de cada um, e todos veem os mesmos robôs, o mesmo tráfego e
  as mesmas obras (saem da mesma semente).
- O resultado é o mesmo para todo mundo. Até ele fechar, a tela do fim diz "Esperando os outros pilotos". O racha fecha
  quando todos terminam, ou 25 s depois da primeira chegada de verdade (bater ou estourar o motor não conta para esse
  prazo). Quem não cruzou a linha a tempo vê "Fora do tempo". O vencedor conta no placar da Noite.
- O organizador larga de novo direto da tela do fim.

## Como funciona
- `drag.js` (canal `/drag`): a sala, os carros, a pista, a largada sincronizada, o repasse das posições e o resultado.
  Quem sai da sala passa a vez de organizar.
- `logic.mjs`: `criarCorridaMulti` monta a mesma corrida em todos os navegadores. Cada um pilota o próprio carro, e o
  organizador pilota também os robôs. O resto é `remoto` e só anda pelo que chega da rede.
- `sala.js` (novo): a sala no navegador, o relógio acertado com o do servidor e a lista de pilotos.
- `main.js`: carrega os carros de quem vai correr, segura a largada até o instante do servidor, manda o estado do seu
  carro (e dos robôs, se você organiza) ~12 vezes por segundo, mostra os outros com a posição prevista pela velocidade,
  e manda a chegada. Na segunda largada seguida, a corrida anterior não manda mais nada (antes, as chegadas velhas
  iam para a corrida nova e o racha travava).
- A aba da Noite (`public/noite.js`) agora sabe que o Drag mora em `/corrida/drag/` (`<script data-jogo="drag">`).

## Testes
- Novos: `tests/drag-servidor.test.js` (vagas, só o organizador larga e escolhe a pista, largada no mesmo instante,
  robôs nas faixas livres, o repasse das posições, chegadas, o mesmo resultado para todos, largar de novo, quem bate
  cedo não fecha o racha e quem sai passa a vez) e um teste de `criarCorridaMulti` em `tests/corrida-drag.test.mjs`.
- Não rodei os testes. O canal `/drag` ainda não entrou em `tests/salas.test.js`: para isso é preciso regravar
  `salas-esperado.json` (`GRAVAR=1 node --test tests/salas.test.js`).
- Conferido no navegador do app, com duas abas na mesma sala: entrar, escolher carro e pista, largar, ver os carros uns
  dos outros, a mesma rua, e o mesmo resultado nas duas, em várias largadas seguidas.
