# Carreira em grupo: entrar no meio da carreira, regras de compra por janela e sala por 48 horas

Tudo num PR só, para já valer nas salas que estão rolando (nada muda no formato salvo: as salas antigas ganham os recursos
sozinhas quando o servidor subir com este código).

## Entrar no meio da carreira (pelo código da sala)
- Com a carreira rolando, qualquer pessoa pode entrar pelo código (na tela inicial, "Entrar com o código", ou pelo link da
  sala). Ela escolhe um **clube livre**: o clube que ainda é do computador, com o caixa de agora, a força e a liga.
- Dá para entrar no meio da temporada, na segunda temporada ou em qualquer momento. Só **não** dá para escolher o clube com a
  rodada rolando ou um leilão aberto (a tela avisa e a pessoa entra assim que acabar).
- O clube entra no ponto em que o mundo está: os jogos que ele já fez contam como jogados (a tabela e o calendário
  continuam iguais), o caixa é o que ele tinha e o aporte do investidor da sala entra como para os outros. O clube sai da lista
  do computador e a pessoa joga a rodada seguinte com a turma.
- O painel **Turma** da sede agora mostra o código da sala e o botão de copiar o convite.

## Regras de compra da turma (para os clubes brasileiros não ficarem roubados)
Valem para todos os técnicos, por janela, no leilão da turma:
- **Começo da temporada** (a janela até a rodada 4): ou 1 jogador de **90 ou mais**, ou 2 de **até 87**, ou 3 de **até 83**.
  Jogadores de 88 e 89 não entram nessa janela.
- **Meio da temporada** (a janela das rodadas 17 a 21): **1 jogador de até 88**.
- **Quem entra no meio** com a janela fechada ganha uma entrada: 1 jogador de até 88 (até o fim da temporada). Se entrar com a
  janela aberta, vale a regra da janela.
- A nota que vale é a de agora (com o que o jogador evoluiu). A regra vale para abrir o leilão, dar lance e bater o martelo.
- Na tela: o mercado mostra a regra, o que já foi levado e o que ainda dá; os jogadores fora da cota ficam apagados e a ficha
  explica por que não dá. A carreira solo não tem essa regra.

## A sala dura 48 horas
- A carreira em grupo só expira depois de **48 horas** sem ninguém mexer (antes eram 24).

## Artilheiros e chaves
- **Artilharia:** só entram gols de jogos com algum técnico humano (os dois lados, ou seja, quem joga contra a turma). Os jogos só do
  computador não contam. Nos jogos ao vivo, o gol do computador aparece só com o clube e o placar, sem o nome de quem fez.
- **Chaves:** as chaves do mata-mata (Champions, Libertadores, Copa do Brasil, Sul-Americana, Super Mundial, Mundial) não aparecem
  conforme acontecem: a Tabela mostra os grupos e o campeão no fim, e o painel ao vivo mostra só jogos de liga e de fase de grupos.
  Só os jogos do seu clube aparecem (no calendário e na partida).

## Conferido
- `tests/carreira-entrada-meio.test.js` (no `npm test`): as regras de compra, o leilão e o lance, o meio da temporada, a entrada
  no meio (caixa, jogos já feitos, entrada), a artilharia, os jogos ao vivo sem mata-mata e sem nome, as 48 horas e a entrada
  pelo canal de verdade (com rodada rolando, entre as rodadas e como espectador).
- Dois testes antigos mudaram porque o comportamento mudou de propósito: quem entra com a carreira rolando agora é aceito, e o
  estado público da sala ganhou o campo `caixas`.
- `npm test`: 201 de 201. E2E: o teste da carreira em grupo. Fotos: `planos/imagens/carreira-entrar-no-meio.png` e `carreira-regra-de-compras.png`.
- Na tela, com dois navegadores: a pessoa entra pelo código, escolhe o clube, vê a regra no mercado, e a Copa do Brasil não mostra
  as chaves.
