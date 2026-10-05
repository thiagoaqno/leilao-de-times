# Pelada e Rocket mais leves (otimização do 3D)

A Pelada desenhava ~500 peças por quadro. Os triângulos eram poucos: o peso era o número de peças, e quase todas
ainda eram desenhadas uma segunda vez para fazer sombra. Medido numa partida contra bots (8 jogadores):

| | antes | agora |
| --- | --- | --- |
| tempo de CPU para desenhar um quadro | 4,6 ms | 2,5 ms (−45%) |
| peças por boneco | ~20 | 12 |
| peças da quadra | 90 | 39 |
| peças que fazem sombra | 191 | ~80 |

Em PC mais fraco, que leva umas 3x mais tempo, é a diferença entre ficar abaixo ou acima de 60 quadros por segundo.

## O que mudou (nada muda na aparência nem no jogo)
- **Bonecos:** as caixinhas de cor lisa que se mexem juntas viram uma peça só, com a cor de cada uma guardada nos
  vértices. Por exemplo, a coxa com o calção, ou a canela com o meião e a chuteira. As articulações continuam sendo
  as mesmas, então a animação, o carrinho e o boneco de pano funcionam igual. A camisa e o rosto (que têm desenho)
  ficam como estavam. Vale também para o Tênis, a Corrida e a Batalha, que usam os mesmos bonecos.
- **Sombra só nas peças grandes:** tronco, cabeça e pernas fazem sombra. As miudezas quase não apareciam nela. No
  Rocket, a carroceria e as rodas.
- **Quadra:** as peças fixas de cor lisa (traves, postes, alambrado, arquibancada, o morro do Rio...) são juntadas
  numa peça por acabamento. Ficam de fora o que o jogo mexe depois: a faixa colorida do gol, as bolinhas de turbo e
  a cerca elétrica.
- **Gráficos automáticos:**
  - se o jogo passar uns segundos abaixo de ~45 quadros por segundo, ele baixa a resolução e o tamanho da sombra;
  - se continuar lento, desliga a sombra (a bola mantém a sombrinha);
  - nunca sobe de novo sozinho, para não ficar piscando.
- **Opção no menu de pausa** (Esc): **Gráficos: Automático / Alto / Leve (PC fraco)**. A escolha fica salva.

## Conferido
- Fotos lado a lado antes e depois nas três quadras (Society, Rio e Ginásio), no Rocket e nas skins de personagem:
  Shrek, Homem-Aranha, Ghostface, Gojo, Woody, Ben 10 etc.
- Testes no navegador da Pelada, dos modos da Pelada, do Tênis e de abrir as páginas (31) e `npm test` (46) passando.
