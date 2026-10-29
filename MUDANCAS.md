# Corrida: previsão do tempo, chuva com rampas e clima da sala

## Previsão por GP
- `F1.previsaoDoGP(semente, opcao)` sorteia, pela semente do GP, a chance `p` de chuva (de 5 em 5%): 60% dos GPs ficam de 0 a 10%, 25% de 20 a 40%, 11% de 50 a 70% e 4% de 80 a 95% (média ~20%). A previsão diz também **quando** (pode largar molhado, começo, do meio para o fim, perto do fim) e a **força** (garoa, chuva forte ou garoa que vira forte).
- A chuva de verdade sai dela: cai com a chance `p` (outro sorteio da mesma semente) e, se cai, começa dentro da janela prevista.
- Onde aparece (cartão com ícone de sol, nuvem ou chuva e a porcentagem, no tema F1): carreira (mapa do GP antes da Q1 e etiqueta no calendário do próximo GP, solo e em grupo), sala (junto da escolha do pneu), grid de largada (onde se escolhe o pneu depois da classificação), transmissão de TV (cartão do clima) e no aviso do box.

## Chuva em corrida curta, duração e transição
- A chuva dura no mínimo 2 minutos (`CHUVA_MIN_S`) ou até o fim da sessão; pode começar e parar no meio de uma corrida de 5 voltas.
- `chuvaEm` entra, sai e muda de força em rampas de 25 s (`RAMPA_S`, suavizadas): sem degrau de seco para chuva nem de garoa para chuva forte.
- `aguaEm` integra a água de segundo em segundo (tabela guardada no roteiro, interpolada): continua conta pura do tempo, igual no servidor, no navegador e nos robôs.
- O engenheiro avisa uma volta antes (`F1.proximaMudanca`): "chuva chegando em uma volta" e "a chuva está parando, a pista vai secar" (falas novas `chuvachegando` e `chuvaparando`; também aparecem como aviso na tela, e a voz só toca depois de gerar os mp3 com `gerar-radio.bat`).

## Corrida casual
- Opção **Clima** na sala (só nas regras de F1, fora da carreira): Aleatório (segue a previsão), Seco, Chuva (larga molhado e chove a corrida toda) e Variável (larga seco e a chuva vem no meio). O servidor valida em `cleanConfig` (`config.clima`) e aplica no sorteio.
- Na sala, a previsão mostrada é a do GP que vem (`room.sementeProx`, a mesma semente que `preparar` usa ao largar).

## Arquivos
`public/corrida/f1-regras.js` (clima), `corrida.js` (opção e semente), `public/corrida/previsao.js` (novo, o cartão), `tema-f1.css`, `transmissao.js/.css`, `hud.js`, `box.js`, `menus.js`, `radio/falas.js`, `temporada/{garagem,sede,grupo}.js`, `tests/corrida-f1-clima.test.js` (novo).

Não rodei testes nem abri o navegador (quem joga e testa é o Thiago).
