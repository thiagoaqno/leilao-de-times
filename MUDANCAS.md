# Copa do Mundo: ninguém do mesmo grupo se cruza nos 16 avos

## O bug

- **O que acontecia:** na Copa do Mundo da Carreira, depois de montar a chave dos 16 avos (os 12 primeiros, os 12
  segundos e os 8 melhores terceiros), o código trocava o "de baixo" de um confronto com o do confronto seguinte
  quando os dois eram do mesmo grupo.
- **Por que dava errado:** essa troca às vezes criava um encontro novo do mesmo grupo no confronto seguinte. No último
  confronto, a troca voltava para o primeiro, que já tinha sido conferido.
- **O tamanho:** em 5000 sorteios, 393 Copas (cerca de 8%) tinham duas seleções do mesmo grupo se enfrentando de novo
  nos 16 avos. O teste da Copa (`carreira-copa.test.js`) pegava isso e falhava por acaso, conforme o sorteio da
  temporada. Foi o que deixou vermelho o teste do GitHub no PR #296.

## A correção

- **`Temporada.separarGrupos`** (`public/carreira/temporada.js`): quando um confronto é do mesmo grupo, troca o de
  baixo com o de baixo de outro confronto (o seguinte e, se precisar, dando a volta), só onde a troca não cria um
  encontro novo do mesmo grupo.
- **O que muda nas Copas que já existiam:** quando a troca antiga já dava certo, a nova faz a mesma troca. Só mudam as
  Copas que estavam erradas.

## Testes

- **Novo, `tests/carreira-copa-chave.test.js`:** 5000 sorteios no formato da Copa, sem nenhum encontro do mesmo grupo.
  O algoritmo antigo falha em 393 deles.
- `carreira-copa`, `carreira-copas` e `carreira-temporada`: passando.
