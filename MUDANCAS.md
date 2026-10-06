# Banco: visual novo (a mesa à noite, cartão de banco e peões desenhados)

## Como fica
- **Visual novo**, no mesmo espírito do Leilão: a mesa de jogo à noite, com a silhueta da cidade lá embaixo, o
  dourado do dinheiro e as cores dos bairros bem vivas. O tabuleiro continua claro para dar para ler, com a borda
  dourada e o miolo azul-noite (o logo, as pilhas e os dados).
- **O seu dinheiro é um cartão de banco** na cor do seu peão: chip, número, nome e o saldo contando. Quando você paga,
  aparece o recibo da maquininha ("Pago no cartão −R$ 100 mil"). Quando recebe, aparece "Pix recebido". No celular, o
  cartão vira a barra de baixo com a ação da vez.
- **Sem emojis.** Os 12 peões viraram peças desenhadas (carro, moto, cachorro, gato, cartola, bola, pizza, guitarra,
  foguete, dinossauro, tênis e papagaio). Tudo o mais virou ícone: as casas do tabuleiro, as notícias, o histórico, as
  reações e os botões.
- **Menos coisa na tela:** a mesa de todo mundo (o dinheiro e as escrituras de cada um) e o histórico foram para a
  gaveta **Mesa**, no topo. Do lado do tabuleiro fica só o cartão, a sua vez, os seus imóveis e as trocas.
- **Animações:**
  - a troca entre as telas (início, sala de espera, jogo) é animada;
  - os lugares da sala de espera e as placas entram pulando;
  - o cartão entra girando e tem um brilho passando;
  - o leilão, as janelas, os eventos e o "SUA VEZ!" ganharam o visual novo.
- **Tela inicial nova:** o título grande, o cartão flutuando e o "Entrar na mesa" mais limpo.

## Por dentro
- `public/banco/index.html` foi reescrito, e o CSS foi para `public/banco/estilo.css`.
- `public/icones.js` (novo, comum): os ícones do Leilão vieram para cá (o Leilão passa a carregar este) e ganharam:
  - os ícones do Banco e os 12 peões (`peao(emoji)`); o servidor continua guardando o peão pelo emoji;
  - `observar(raiz)`, que troca por ícone qualquer emoji que aparecer na página.
- Os scripts do Banco mudaram pouco:
  - os peões desenhados (`sala.js`, `mesa.js`, `painel.js`, `telas.js`) e os ícones das casas (`mesa.js`);
  - o número do cartão e a gaveta da mesa (`telas.js`);
  - o recibo da maquininha (`painel.js`);
  - a troca de tela animada (`sala.js`).
- A transição de tela do navegador pode ser cancelada por outra (duas trocas seguidas): no Banco e no Leilão, esse
  cancelamento agora é tratado e não vira erro.
- O servidor não mudou.

## Conferido
- `npm test` passando (47).
- Os testes de navegador do Banco, do Leilão e da Vila passando (duas vezes seguidas).
- No navegador, com 2 robôs jogando:
  - criar a mesa e a sala de espera;
  - jogar os dados, cair na Mooca e comprar (com o recibo da maquininha, a escritura voando e a notícia "Comprou!");
  - um leilão aberto por um robô;
  - a gaveta da mesa;
  - o celular (375 px) e a tela larga (1440 px).
