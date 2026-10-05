# Banco: dados 3D caindo na mesa, visão de cima e sem faixinhas coloridas

## Dados 3D
- Os dados agora são cubos de verdade, com as 6 faces. São cor de marfim, com bolinhas pretas, e o 1 é uma bolinha
  vermelha grande.
- **A jogada:** os dois caem do alto em cima do tabuleiro, cada um de um lado, girando no ar. Eles batem no tabuleiro,
  quicam alto, quicam baixinho e assentam meio tortos, com o resultado para cima. A sombra fica no tabuleiro e aperta
  quando o dado chega. Cada batida tem o seu som.
- O peão só começa a andar quando os dados param: o servidor espera 1,3 s em vez de 0,85 s.
- Na dupla, o "Dupla!" aparece quando eles param.
- Na sua vez, os dados ganham um brilho dourado embaixo (dá para jogar tocando neles).
- Quem pede "menos movimento" no sistema vê os dados já parados no resultado.

## Visão de cima como padrão
- O tabuleiro abre visto de cima. A visão inclinada continua no botão do topo, e a escolha fica salva.

## Sorte ou Revés sem cartão por cima
- Ao cair em Sorte ou Revés, aparecia o cartão da casa e a carta tirada ao mesmo tempo, um em cima do outro. Agora
  só a carta aparece.
- Em qualquer casa, quando aparece um destaque no meio do tabuleiro (carta, aluguel, compra...), o cartão da casa
  sai da frente.

## Sem as faixinhas coloridas de lado
(Esta parte ficou de fora do PR anterior, que foi juntado antes dela chegar.)

A cor aparece como no jogo de verdade:
- cada imóvel em "Seus imóveis" é um título de posse pequeno, com o nome na faixa da cor do bairro;
- nas trocas e na compra, a escritura vira um titulozinho de papel com a faixa da cor em cima;
- os imóveis a escolher viram plaquinhas na cor do bairro, como no tabuleiro;
- os jogadores são reconhecidos pelo peão colorido;
- na escritura, o aluguel que vale agora fica marcado a marca-texto.

Também nesta parte:
- a carteira não quebra mais o valor em várias linhas no celular;
- o cabeçalho cabe em telas bem estreitas.

## Conferido
- No navegador, numa partida com um segundo jogador:
  - a visão de cima abrindo como padrão;
  - os dados parados e a jogada;
  - a queda congelada em três momentos: no alto girando, quicando e assentando.
- `npm test` (46) passando, e o teste de abrir as páginas (22).
