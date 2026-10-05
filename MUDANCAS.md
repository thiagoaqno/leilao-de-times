# Banco: visual novo, cartão da casa onde você caiu e mais animações

## Visual novo
O Banco agora tem a cara do jogo de verdade, em cima da mesa da sala, em vez do feltro verde (que já é o da Sinuca e
do Truco):
- **A mesa:** madeira, com tábuas, veios e a luz do lustre em cima do tabuleiro.
- **Os painéis:** viram folhas de papel apoiadas na mesa (sua vez, trocas, imóveis, a mesa de cada jogador).
- **A sua carteira:** virou uma cédula do Banco da Galera, na cor do seu peão, com moldura gravada e o peão num
  medalhão. No celular, é a barra de baixo.
- **As placas de dinheiro:** viraram notinhas com a faixa da cor de cada jogador. As notas que voam ganharam moldura
  de cédula.
- **As letras:** Bitter (serifa grossa, de papel-moeda) para títulos e valores, e Commissioner para o resto.
- **Sem as faixinhas coloridas de lado** (em "Seus imóveis", na mesa, nas placas, na sala de espera e no painel da
  vez). A cor aparece como no jogo de verdade:
  - cada imóvel em "Seus imóveis" é um título de posse pequeno, com o nome na faixa da cor do bairro;
  - nas trocas e na compra, a escritura vira um titulozinho de papel com a faixa da cor em cima, e os imóveis a
    escolher viram plaquinhas na cor do bairro, como no tabuleiro;
  - os jogadores são reconhecidos pelo peão colorido;
  - na escritura, o aluguel que vale agora fica marcado a marca-texto.
- O leilão ganhou o cabeçalho de madeira. Os rótulos que estavam em caixa-alta agora são escritos normal.

## Vila
- O prédio do Banco Imobiliário agora se chama **Banco** (antes "Cassino"), com o ícone 🏦.


## Cartão da casa
Quando o seu peão para numa casa, aparece um cartão saindo da própria casa, virando no ar:
- **Imóvel, companhia ou aeroporto:** a escritura completa, com preço, aluguéis, casas e hipoteca. No topo, a
  situação da casa:
  - "À venda por $X";
  - "Essa é sua!";
  - "Aluguel para Fulano";
  - hipotecada.
- **Casas especiais:** um cartão próprio para Início, Prisão (presa ou só visitando), Estacionamento (com o pote
  acumulado), Vá para a prisão, Sorte/Revés e Imposto.

Ele some sozinho depois de uns segundos, ou na hora com um toque. Quando a casa está à venda, ele fica um pouco mais.
Também sai do caminho quando abre o leilão ou outra janela.

## Mais animações
- Os dados chacoalham rolando e quicam ao parar. Na dupla, aparece "Dupla!".
- O peão dá um quique ao chegar na casa, e uma onda da cor dele se espalha a partir dela.
- Quando alguém compra uma casa, ela leva um "carimbo" da cor do dono.
- Quem pede "menos movimento" no sistema fica sem as animações.

## Mapa do projeto (CLAUDE.md)
Novo arquivo na raiz com a organização do site. Ele lista:
- onde fica cada jogo e os arquivos de cada um;
- as peças comuns (salas, bonecos/skins, Noite da Galera, controles de toque);
- como a vila é montada;
- os testes;
- o jeito de trabalhar no projeto.

Serve para achar as coisas rápido nas próximas mudanças. O Claude Code lê esse arquivo sozinho ao abrir o projeto.

## Conferido
No navegador, numa partida de verdade com um segundo jogador:
- o visual novo no celular e no computador (entrada, sala de espera, tabuleiro, carteira, painéis e escritura);
- o cartão em casas de imóvel (à venda, minhas e de outro) e em casas especiais;
- os dados, o quique, a onda e o carimbo.
