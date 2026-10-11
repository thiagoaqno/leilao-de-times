# Carreira: os eventos aleatórios voltam a aparecer no pós-jogo

## O que muda no jogo

Os eventos do catálogo (os ~620 da caixa de entrada) eram sorteados normalmente, mas nas carreiras do calendário mundial (todas as novas) o pop-up de pós-jogo saía sempre sem eventos e sem avisos. Quem não abria a caixa de entrada na Sede nunca via a maioria deles, e os que pedem escolha caíam na opção padrão ao jogar a próxima partida. Agora o pós-jogo mostra os eventos novos que pedem resposta e os avisos da rodada, como já era no calendário antigo.

## Como

Medi o sorteio: cerca de 1,2 evento por rodada (13% das rodadas sem nenhum, por desenho) e só 7 dos 624 não saíram em 7650 sorteios, todos de situação extrema (caixa negativo, risco de rebaixamento, derrotas seguidas). Não há evento morto. A causa estava em `fecharJogoMundo` (`carreira.js`), que gravava `save.posJogo` com `eventos: []` e `avisos: []`; agora usa os `novos` da caixa de entrada. Teste novo em `tests/carreira-memoria.test.js`.
