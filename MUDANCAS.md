# Palavra Proibida: as palavras não repetem mais

## O que acontecia
- O jogo já tinha um monte só para o servidor inteiro: uma carta só voltava depois que as 2.226 saíssem. Mas esse monte
  ficava só na memória.
- No Fly, a máquina desliga quando ninguém está conectado e liga de novo quando alguém entra. Ela também reinicia a cada
  deploy. A cada vez, o monte voltava inteiro, e as mesmas palavras apareciam de novo nas noites seguintes.
- O baralho em si está certo: são 2.226 palavras, todas diferentes.

## Como fica
- **As cartas que já saíram ficam guardadas no banco de dados.** Desligar, ligar ou fazer deploy não traz nenhuma de
  volta.
- **Uma carta só aparece de novo depois que todas as 2.226 saírem.** Aí o monte zera e recomeça, embaralhado.
- **Cartas novas no baralho entram direto no monte:** a carta é guardada pela palavra, não pela posição na lista.
- **Se o banco não responder,** o jogo segue com o monte só na memória, como antes.

## Por dentro
- `migracoes/002-cartas-saidas.sql`: a tabela `cartas_saidas` (`jogo`, `carta`, `saiu_em`). Ela serve para outros jogos
  de baralho no futuro.
- `bd.js`: `cartasSaidas(jogo)`, `marcarCarta(jogo, carta)` e `zerarCartas(jogo)`.
- `proibida.js`:
  - o monte é montado só com as cartas que ainda não saíram (`montar`);
  - cada carta puxada é anotada no banco.

## Conferido
- `npm test`: 87 passaram, 0 falharam. Os testes novos:
  - `tests/proibida.test.js`: uma noite de 6 cartas, o servidor desliga e liga com o mesmo banco, e outra noite de 6.
    Nenhuma carta da primeira voltou, e as 12 ficaram anotadas no banco.
  - `tests/bd.test.js`: as cartas são guardadas por jogo, anotar duas vezes não duplica, e zerar um jogo não mexe no outro.
