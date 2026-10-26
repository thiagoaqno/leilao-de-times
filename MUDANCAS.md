# Corrida: regras de F1, parte 2, o pit stop

O PR 2 do plano `planos/temporada-f1.md`. Só vale com **Regras: Fórmula 1**; sem elas a sala corre como antes.

**O corredor dos boxes**
- `boxes: { entra, para, sai, lado }` em `pistas.js` (frações da volta) nas 12 pistas com reta na largada: as 8 do calendário do plano (Deserto, Tóquio, Mônaco, Rio, Nürburgring, Laguna, Los Angeles, Interlagos), Serra Verde, Barcelona, Luigi e Sorvete. O Arco-íris não tem reta onde caiba. Conferido por conta: o corredor cabe em todas, longe de outro trecho da pista (Mônaco é a apertada, e fica sem garagens).
- A conta é uma só, em `f1-regras.js` (`corredor`): 34 de largura (cabem dois carros lado a lado), ~500 de comprimento, rampas de entrada e saída, 10 garagens. O carro, os robôs, o desenho e os testes usam a mesma.
- Peça nova do kit: `kit/boxes.js` (chave `boxes` em `gps/`; toda pista com `boxes` ganha o corredor sozinha; linha nova no `kit/README.md`). Asfalto, linha branca de entrada, vermelha de saída, mureta, o quadrado pintado onde o carro para, as garagens e **4 mecânicos por garagem, na cor de quem usa a garagem** (`jogo.js` pinta cada uma com a cor do piloto do grid). Entrada e saída ficam livres de painel e cerca, e os balizadores do meio do corredor saem de cena. Só aparece com as regras de F1.
- Em Mônaco as linhas SC 1 e SC 2 (`gps/monaco.js`) passaram a ser a entrada e a saída do corredor (0,98 e 0,02 da volta; antes 0,89 e 0,075).

**A parada**
- **B** (ou o botão "Box") pede a parada, de novo passa para o outro composto e, no fim, cancela; **1, 2 e 3** escolhem macio, médio e duro. Na próxima passagem pela entrada o carro entra e anda sozinho no limitador (40% da velocidade final, `box.js`), para na sua garagem, troca o pneu (2,4 s mais o erro dos mecânicos, de 0 a 1,5 s, sorteado com a semente do GP: `tempoDeParada`) e sai com o pneu novo, frio. **Uma parada inteira leva de 5 a 10 s** (6,7 a 8,2 s em Interlagos); o plano dizia 18 a 25 s, mas o dono pediu 5 a 10 s, e o teste confere isso.
- Não dá para parar na última volta (o corredor passaria pela chegada).
- HUD: o aviso do box (limitador, trocando com a contagem, saindo), o botão com o composto pedido e, na torre, o pneu de cada um, quantas paradas fez e quem está no box.

**No servidor**
- `act` `box` (fases `entra` e `sai`): guarda a parada em `p.paradas` (volta, tempo, composto), o composto em uso (`pneuAtual`) e os usados (`compostos`), confere o limitador pelo tempo no corredor (rápido demais: **+5 s**) e avisa no log.
- **Regra dos dois compostos:** quem termina sem ter usado dois compostos leva **+10 s**. Os acréscimos reordenam o resultado (`finish + acrescimo`), na torre e na tela final.
- `semente` do GP no estado da sala.
- **Robôs:** cada um sai com uma `estrategia` (`f1-regras.js`: composto da largada, uma ou duas paradas, sempre dois compostos, nunca na última volta), entra pelo mesmo caminho, perde o mesmo tempo e antecipa a parada se o pneu passar do penhasco.
- A escolha do composto da largada no lobby já tinha entrado no PR 1.

**Voltas e pneus**
- Novas opções de **10 e 21 voltas** (o limite da corrida subiu de 15 para 45 min). O desgaste continua medido em fração da corrida: numa corrida de 3 voltas o pneu médio chega ao penhasco na volta 1,8, e numa de 21, na volta 12,6; o macio dura ~7 voltas e o duro ~19. Por isso o pneu "acaba em 1,5 volta" só nas corridas curtas.

**Testes** (`tests/corrida-f1-box.test.js`, 8 testes)
- Uma parada em Interlagos custa de 5 a 10 s; as 12 pistas têm corredor com as garagens entre as rampas.
- O mesmo GP com a mesma semente dá os mesmos erros de mecânico.
- A estratégia dos robôs sempre usa dois compostos e nunca para na última volta.
- Os robôs fazem as paradas pelo corredor, no limitador; sem as regras de F1 não existe box.
- A sala (sem rede, com tempo de mentira): +10 s para quem usou um composto só e perde a vitória, +5 s por passar do limitador, sem box na última volta; sem as regras de F1 o box é ignorado.

**Conferido**
- No navegador do app (`#debug`), em Interlagos com 21 voltas e 3 robôs: uma parada de verdade, da entrada à saída, com a troca para o duro: `planos/imagens/corrida-box-parada.jpg` (HUD e contagem), `corrida-box-garagens.jpg` (as garagens na cor de cada piloto, com os mecânicos) e `corrida-box-saida.jpg`. Sem erro no console.
- `npm test`: 562 testes; na primeira rodada falharam 3: o do Leilão (`carreira-online-mercado`, por tempo, a máquina estava carregada; passa sozinho), e dois meus, que já foram corrigidos (o estado público da sala ganhava a chave `semente` também sem as regras de F1, e o teste dos pneus dos robôs do PR 1 supunha o médio, mas agora cada robô sai com o composto da estratégia). Rodados de novo, `corrida-f1-pneus`, `corrida-f1-box` e `salas` passam inteiros (15 de 15); o resto da suíte não foi repetido inteira depois da correção.

**O que falta**
- Mônaco: o corredor passa por trás do guard-rail e perto do público; precisa de acabamento.
- Os carros que passam pela pista não batem na mureta do corredor (ela é só desenho), e não existe animação dos mecânicos.
- Monza e Silverstone (outras sessões) precisam de uma linha em `BOXES`, em `pistas.js`.
- As penalidades de verdade (bandeiras, limites de pista) são do PR 4.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
