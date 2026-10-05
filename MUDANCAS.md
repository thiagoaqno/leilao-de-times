# Banco: cartão da casa onde você caiu e mais animações

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
- o cartão em casas de imóvel (à venda, minhas e de outro) e em casas especiais;
- os dados, o quique, a onda e o carimbo.
