# Banco refeito: peões 3D, as contas de todo mundo, o extrato ao vivo e o dinheiro voando de verdade

## Como fica
- **Tela do jogo reorganizada em três colunas:**
  - à esquerda, **as contas**: o seu cartão de banco e, embaixo, a conta de cada jogador (o peão, o saldo, os bairros
    que tem, se está preso ou faliu, e a barra do tempo de quem está na vez);
  - no meio, o tabuleiro;
  - à direita, **o momento da jogada** (a sua vez, comprar, pagar...), o **extrato ao vivo**, os seus imóveis e as
    trocas.
  - No celular, as contas viram uma fila que corre de lado em cima do tabuleiro, e o cartão vira a barra de baixo com
    a ação da vez.
- **Peões 3D:** a peça clássica de tabuleiro (base, corpo, gola e cabeça redonda), com luz e sombra na cor do
  jogador e o símbolo dele gravado no corpo (carro, cachorro, cartola...). Nada de emoji: é o mesmo peão no tabuleiro,
  nas contas, na sala de espera e nas cenas.
- **O dinheiro anda pela tela:** todo pagamento solta moedas (e notas, nos valores grandes) de quem paga para quem
  recebe. Quanto maior o valor, mais moedas. O banco virou um **cofre** no meio do tabuleiro, que pula quando recebe,
  e o saldo de cada conta conta até o valor novo, piscando verde ou vermelho.
- **Cenas no meio do tabuleiro:**
  - **aluguel:** os dois peões frente a frente, as moedas correndo de um para o outro e o valor contando;
  - **compra:** a escritura da casa com o carimbo "Comprado";
  - o recibo da maquininha ("Pago no cartão") e o "Pix recebido" continuam no cartão.
- **Extrato ao vivo:** cada transação da mesa aparece na hora, com o peão de quem pagou, o de quem recebeu, o motivo e
  o valor.
- **Tabuleiro novo:** casas escuras com o nome na etiqueta da cor do bairro, e as casas que já têm dono brilham na
  cor do dono.
- **Seus imóveis por bairro:** cada bairro mostra quantas cidades você tem dele (as bolinhas) e avisa quando está
  completo.
- **A vez:** quando é a vez de outro, o peão dele aparece grande, pulando. Na sua vez, o botão de jogar os dados tem
  um dadinho girando, e o momento de comprar já mostra a escritura.
- **Tela inicial:** três peões pulando de casa em casa, com moedas subindo. A troca entre as telas (início, sala de
  espera e jogo) é animada.
- **Sem emojis** em lugar nenhum: as casas do tabuleiro, as notícias, o histórico, as reações e os botões usam ícones.
- A mesa de todo mundo (as escrituras de cada um) e o histórico ficam na gaveta **Mesa**, no topo.
- Quem pede "menos movimento" no sistema fica sem as animações.

## Por dentro
- `public/banco/peoes.js` (novo): `Peoes.svg(cor, emoji, { tam })` desenha o peão 3D em SVG. O servidor continua
  guardando o peão pelo emoji. Cada desenho tem os seus próprios gradientes, senão um peão escondido (a sala de espera,
  por exemplo) roubava a cor dos outros.
- `public/banco/index.html` foi reescrito, e o CSS foi para `public/banco/estilo.css`.
- `public/banco/painel.js`: as contas (`renderPlates`), as moedas (`moedaVoa`, `chuvaMoedas`), o cofre (`cofrePula`),
  o extrato (`extratoAdd`, `renderExtrato`) e a cena do aluguel (`cenaAluguel`).
- `public/banco/telas.js`: a escritura sem botões (`deedCompacto`), a cena da compra e os imóveis agrupados por bairro.
- `public/banco/mesa.js`: o cofre no miolo e os peões 3D andando; `sala.js`: a cena da tela inicial.
- `public/icones.js` (novo, comum): os ícones do Leilão vieram para cá (o Leilão passa a carregar este) e ganharam os
  do Banco e `observar(raiz)`, que troca por ícone qualquer emoji que aparecer na página.
- A transição de tela do navegador pode ser cancelada por outra (duas trocas seguidas): no Banco e no Leilão, esse
  cancelamento agora é tratado e não vira erro.
- O servidor não mudou.

## Conferido
- `npm test` passando (47; o do Dominó que às vezes falha por tempo passou na repetição).
- Os testes de navegador do Banco passando (a página abre e a partida com duas pessoas roda sem erro). Os outros
  testes de navegador não rodaram desta vez.
- No navegador, com 3 robôs jogando:
  - os peões 3D no tabuleiro, nas contas e na sala de espera;
  - comprar (a escritura com o carimbo), pagar aluguel (a cena com os dois peões) e as moedas indo para o cofre;
  - o extrato e os saldos contando;
  - o celular (375 px), sem a página passar da largura da tela, e a tela larga.
