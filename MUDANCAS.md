# Leilão: o campeonato ao vivo roda para todo mundo (inclusive iPad com "Reduzir movimento")

## O problema
No iPad, o campeonato pulava direto para o resultado final, sem relógio e sem as cartas dos gols.

- **A causa:** quem tem o ajuste do sistema que pede menos movimento ligado (no iPad: Ajustes → Acessibilidade →
  Movimento → Reduzir movimento) não via o jogo ao vivo. A página tratava o jogo como enfeite e mostrava o fim na
  hora.
- **A consequência:** essa pessoa via o resultado **antes** de todo mundo.

## A correção
- O jogo ao vivo agora toca para todo mundo. O relógio e os gols são o conteúdo (o suspense), não enfeite.
- Com "menos movimento", somem só os efeitos: a carta girando ao entrar e o placar pulando. A carta do gol aparece
  parada, do lado do time que marcou.

## Todo mundo vê ao mesmo tempo?
Sim. O tempo de cada jogo conta a partir da hora em que o organizador revelou a parte, no relógio do **servidor**
(cada aparelho corrige a diferença do próprio relógio).

- **Quem entra ou recarrega a página no meio** pega o jogo no ponto certo.
- **Quem deixa a aba em segundo plano** continua com o jogo andando.
- **"Revelar tudo"** mostra tudo pronto para todo mundo, de propósito.

O único caso em que alguém via antes era esse do "menos movimento", agora corrigido.

## Conferido
Num navegador emulando um iPad com "Reduzir movimento" ligado, revelando uma rodada:
- o relógio andou (7', 12', 17', 22');
- os gols foram entrando;
- as cartas apareceram paradas no lado certo;
- o texto do resultado só apareceu no fim.
