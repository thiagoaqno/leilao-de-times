# Carreira: 115 eventos que mexem no jogo · Ginásios com tema · Bichos de costas

## Carreira: os eventos (`carreira-catalogo.js`)
- O catálogo tem **115 eventos** em 9 grupos: vestiário, torcida, imprensa, dinheiro, treino, mercado, jogo, vida pessoal
  e comissão técnica.
- Cada evento tem quem ele atinge (titular, reserva, craque, goleiro, estrangeiro, lesionado, um jogador de outro
  clube...) e quando pode sair (jogo em casa ou fora, sequência de derrotas, brigando pelo título, perto do
  rebaixamento, caixa apertado, janela aberta...).
- As escolhas mudam o jogo de verdade:
  - moral e caixa (com o extrato);
  - a nota do time ou de um jogador por algumas rodadas, ou para sempre;
  - a nota do próximo adversário;
  - lesões, suspensões e curas;
  - salários, lista de venda, dicas do olheiro e uma proposta milionária por um titular.
- Algumas escolhas são apostas, por exemplo espiar o treino do rival ou cobrar o elenco em público. O sorteio tem
  semente: recarregar a página não muda o resultado.
- Sai um evento quase toda rodada, às vezes dois, e nenhum repete na mesma temporada. Os que ficam sem resposta valem a
  escolha padrão na hora de jogar, como antes.
- Os efeitos com prazo ficam em `save.efeitos` e entram na nota pelo `timeDe`. Na tela:
  - a caixa de entrada mostra o que está valendo ("Time +2 · 3 jogos", "Próximo adversário −1");
  - a figurinha ganha a marca de jogador em alta ou em baixa;
  - a força na prancheta já soma os efeitos.
- Foto: `planos/imagens/carreira-eventos.png`.

## Ginásios com tema (`public/ginasio/temas.js`)
- Desafiar um líder ou treinador agora leva para a casa dele. Cada tipo tem suas cores de quadra e arquibancada, o
  desenho do chão, os pilares, o letreiro e um clima por cima da luta:

| Arena | Chão | Clima |
| --- | --- | --- |
| Ginásio Brasa (Fogo) | rachaduras de lava pulsando | brasas subindo |
| Ginásio Maré (Água) | água ondulando | bolhas |
| Ginásio Mata (Grama) | grama com flores | folhas caindo |
| Ginásio Faísca (Elétrico) | placas de metal com faixa de perigo | raios piscando |
| Arena Rochedo (Pedra) | areia com pedras | poeira |
| Salão Místico (Psíquico) | círculos mágicos girando | estrelas piscando |
| Casarão Assombrado (Fantasma) | tábuas rachadas | névoa |
| Toca do Dragão (Dragão) | escamas | brasas roxas e douradas |
| Dojô do Punho (Lutador) | tatame | poeira |
| Pista Geada (Gelo) | gelo trincado com brilhos | neve |

- Sem líder, fica o Ginásio da Galera de sempre.
- Quem pede "menos movimento" fica sem clima e sem animação no chão.
- Foto: `planos/imagens/ginasio-temas.png`.

## Bichos de costas (`public/ginasio/animacao.js`)
- Mirando ou andando para o fundo da quadra, o bicho vira de costas. Há uma folga perto do meio para ele não ficar
  trocando à toa.
- Pokémon: o GIF animado de costas do Black/White. Enquanto ele carrega, aparece o sprite parado de costas.
- Galeramon: o próprio desenho sem o rosto (olhos e boca cobertos com a cor do corpo) e um pouco mais escuro.
- Foto: `planos/imagens/ginasio-costas.png`.

## Conferido
- No navegador:
  - os 10 temas e a quadra padrão;
  - o Charizard e o Churrasquilo virando de costas numa partida;
  - a caixa de entrada da carreira com os efeitos valendo.
- Teste novo, `tests/carreira-eventos.test.js`:
  - roda todo evento com toda escolha numa carreira de verdade, sem texto com "undefined" e com algum efeito;
  - confere que os efeitos entram no jogo e vencem no prazo;
  - joga uma temporada inteira sem repetir evento.
- `npm test`: 92 de 92 passaram, mas antes de o teste novo entrar no `npm test`. A rodada completa com ele e os e2e
  (Ginásio, Vila e carreira) ainda estão rodando.
