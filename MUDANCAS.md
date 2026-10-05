# Cartas e peças animadas, cores no Banco e 1 s no Tênis

## Truco: as cartas ganharam movimento
- **Distribuição:** as costas das cartas voam do meio da mesa para cada jogador, uma volta de cada vez (como quem
  dá as cartas de verdade). As suas 3 cartas chegam na mão e desviram uma de cada vez.
- **A vira** desvira com um giro, depois da distribuição.
- **Fim de cada rodada:** a carta que ganhou dá um pulo (além do brilho dourado). Um pouco antes da rodada seguinte,
  as cartas da mesa deslizam até quem ganhou e somem.
- O tempo de cada animação vem de um relógio só: se a mesa for redesenhada no meio (chegou estado novo do
  servidor), a animação continua de onde estava, em vez de recomeçar.
- Quem pediu no sistema para reduzir movimento não vê nada disso.

## Rumi: as peças chegam
- **Na mesa:** quando alguém confirma a jogada, as peças novas entram com um quique, uma depois da outra. Vale também
  para as peças que você mesmo põe numa combinação.
- **Na mão:** a peça comprada do monte desliza para o suporte. No começo da rodada, as 14 chegam uma a uma.
- Escolher e soltar uma peça ficou mais macio (a peça sobe com um pulinho).

## Banco: aeroportos e companhias com cor própria
- No tabuleiro, os aeroportos ficam num azul-céu clarinho e as companhias num verde-água clarinho. Dá para achar
  rápido, sem brigar com as cores das cidades.

## Tênis: o golpe armado espera 1 s
- Apertou o golpe e não bateu na bola: agora você volta a andar normal depois de **1 segundo** (antes, meio segundo).

## Testes
- No navegador:
  - Truco contra uma jogadora de mentira: a distribuição (6 cartas voando, a vira e as 3 da mão desvirando) e o
    recolher da rodada (a carta que ganhou marcada e as duas deslizando antes da próxima);
  - Rumi com 2 robôs: as 14 peças chegando, só a peça comprada animando, e as 6 peças da abertura de um robô
    quicando na mesa;
  - Banco: as cores novas no tabuleiro.
- `npm test` passando, e os testes no navegador do Tênis, das páginas e dos jogos de mesa (26).
  - Um teste do Dominó deu tempo esgotado numa rodada e passou ao repetir. Ele já falhava assim de vez em quando
    antes; o Dominó não foi mexido.
