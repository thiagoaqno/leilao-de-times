# Carreira: feed de notícias, pós-jogo, estádio, trocas, orçamentos, mercado com lucro e lances em pixel-art

O guia `planos/carreira-feed-e-mercado.md`, feito inteiro.

## Notícias com cara de rede social (`feed.js`, `carreira-feed.js`)
- Atalho novo "Notícias" na sede, e os 3 posts mais novos na própria sede.
- Cada post tem:
  - o perfil (o clube, verificado, ou o @galeranews);
  - a arte em pixel-art, que combina com a notícia;
  - curtir, que funciona (também com dois toques na arte) e fica guardado no navegador;
  - "Curtido por @... e outras N pessoas", a legenda e comentários de torcedor.
- Há 33 cenas, entre elas:
  - reforço segurando a camisa nova e aperto de mãos entre os clubes, com o valor;
  - placar de TV (torcida pulando na vitória, chuva na derrota) e artilheiro comemorando;
  - maca, juiz com o cartão, tabela com a linha do clube acesa, contrato com moedas;
  - microfones, arquibancada com sinalizador, protesto, cones do CT, vestiário, balada;
  - seleção, taça, berço, bolo, carro, cachorro, celular, avião, binóculo do olheiro, prancheta e o martelo da disputa.
- Os posts saem do seu jogo, dos gols (dois ou mais), das lesões e expulsões, das goleadas, da tabela (liderança, G4,
  Z4), das transferências (suas e da IA), dos eventos e das disputas.
- A arte é desenhada no navegador; o servidor manda só a receita. Tudo sai da semente: recarregar mostra o mesmo feed.
- A aba "Movimentações" do mercado usa os mesmos posts.

## Pós-jogo em pop-up (`posjogo.js`)
- Quando a partida acaba, os cartões entram um depois do outro:
  - o placar com Vitória, Empate ou Derrota;
  - a moral (o medidor anda do valor de antes ao novo);
  - o dinheiro da rodada contando, e o caixa novo;
  - os desfalques, com as figurinhas de quem se machucou, foi suspenso ou ficou pendurado;
  - os efeitos que passaram a valer;
  - os eventos novos, que dá para responder ali mesmo;
  - o que mais aconteceu.
- Aparece uma vez por rodada. Com "menos movimento", aparece tudo pronto, sem animação.

## O estádio do mandante na parada tática (`estadios.js`)
- Na prancheta do meio do jogo, o estádio de quem joga em casa fica no topo, em pixel-art:
  - a torcida nas cores do mandante, com um cantinho da visitante;
  - a placa com o nome do estádio;
  - o clima do jogo (dia, noite com os refletores, chuva).
- Cada um dos 19 estádios da base tem um perfil: oval ou retangular, cobertura, anéis e um detalhe (o arco do
  Maracanã e do Mineirão, a membrana da Fonte Nova, os prédios da Vila Belmiro, o morro, o telão...).

## Trocar começando pelo banco
- Na prancheta da partida, agora dá para tocar no reserva primeiro (ele fica marcado) e depois em quem sai. O jeito de
  antes continua valendo, e as substituições continuam limitadas.

## Orçamentos diferentes (`orcamentos.js`)
- Cada clube começa com o seu caixa, de R$ 120 mi (Flamengo) a R$ 10 mi (Chapecoense). São valores de jogo, não
  oficiais.
- Cada clube tem uma situação, que aparece na escolha do clube e na mensagem de boas-vindas, e mexe na temporada:
  - rico: TV 30% maior;
  - SAF: o dono põe dinheiro na janela do meio do ano se o time estiver no G6;
  - endividado: paga uma parcela da dívida por rodada;
  - pequeno: só tem pouco dinheiro.
- Os outros clubes também têm caixa: as compras da IA e as propostas pelos seus jogadores dependem dele.
- As carreiras que já existem não mudam de caixa nem ganham situação.

## Mercado mais flexível, com lucro (`mercado.js`)
- O valor muda com o momento: gols na temporada, fase boa ou ruim dos eventos e estar à venda. Na figurinha aparece uma
  seta.
- Quanto você pagou fica guardado. A ficha mostra o lucro (ou prejuízo) e um gráfico do valor nas últimas rodadas.
- Você escolhe o preço pedido na lista, de 70% a 250% do valor. A ficha diz a chance de chegar proposta, que cai quanto
  mais caro o pedido, e as ofertas ficam perto dele.
- Disputa entre clubes, com a mecânica do Leilão: quando vários clubes querem um jogador seu, os lances sobem um por um
  e você bate o martelo. Quem espera demais pode ver os clubes esfriarem e ficar só com o primeiro lance. Esse limite só
  o servidor sabe.
- Comprar parcelado: metade agora e o resto em 4 rodadas, com 10% de juros.
- Comprar com um jogador seu na troca, que entra por 90% do valor.
- Sem truque: nas 3 primeiras rodadas depois da compra, ninguém paga mais do que você pagou.

## Os lances da partida em pixel-art (`/leilao/lances-outros.js`)
- Além do gol, ganham telão animado no momento do lance:

| Lance | Cena |
| --- | --- |
| Defesa | O goleiro voando e espalmando |
| Chance perdida | Na trave, raspando ou por cima, e o close das mãos na cabeça |
| Pênalti marcado | O juiz apontando a marca |
| Amarelo e vermelho | O juiz levantando o cartão; no vermelho, o jogador sai de cabeça baixa |
| Lesão | O médico com a maleta |
| Substituição | A placa de LED do quarto árbitro |
| Contra-ataque | Com as linhas de vento |

- As cenas usam as camisas dos dois clubes e o estádio do mandante.
- Lances no mesmo minuto ficam lado a lado, na hora. Ficam no máximo 12 telões na tela.
- `Lances.kit` (`lances.js`) passou a exportar as peças que as cenas novas usam.

## Consertos no caminho
- O protesto e a festa da torcida repetiam a cada rodada enquanto a sequência continuava; agora saem só quando ela chega
  a 3.
- O teste dos efeitos às vezes falhava: os eventos das rodadas de antes podiam deixar um efeito valendo no adversário.

## Conferido
- `npm test`: 109 de 109 passaram. Teste novo, `tests/carreira-mercado.test.js`:
  - orçamentos e situação;
  - sem lucro em revenda na hora, e lucro depois da valorização;
  - o momento mudando o valor;
  - parcelas com juros e troca;
  - disputa com a mesma semente dando os mesmos lances, martelo antes e depois do limite;
  - feed e pós-jogo, e o limite que não vai para o navegador.
- e2e: as páginas, e a carreira no computador e em 375x812:
  - o pós-jogo abre;
  - o feed tem as artes;
  - na parada tática aparece o estádio, e a troca começa pelo banco.
- Fotos em `planos/imagens/carreira-*.png`:
  - orçamentos, pós-jogo, as 33 artes do feed, os 8 lances, o estádio na prancheta;
  - a ficha com o preço pedido e a ficha com troca e parcelas;
  - no celular, o pós-jogo, o feed e a disputa.
