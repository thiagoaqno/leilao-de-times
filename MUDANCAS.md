# Carreira: 300 novos acontecimentos entre rodadas

## O que muda no jogo

- A caixa de entrada pode sortear 300 acontecimentos inéditos, além dos 324 existentes, em 15 temas: torcida, estádio, imprensa, patrocinadores, diretoria, vestiário, treino, saúde, viagens, arbitragem, base, mercado, comunidade, competições e estrutura.
- Cada acontecimento altera pelo menos uma parte da carreira: caixa, moral, rendimento por jogo, evolução, lesão, suspensão, salário ou lista de venda. Multas e perdas maiores podem chegar a R$ 2 milhões.
- A briga de torcida antes de um clássico cobra R$ 100 mil e reduz a moral. Eventos de clássico, casa, fora e janela só entram no sorteio quando fazem sentido.
- Os efeitos financeiros aparecem no extrato. Os eventos continuam determinísticos pela semente e não se repetem na mesma temporada.

## Como

- `carreira-catalogo-imersao.js` contém os 300 casos e aplica seus efeitos com as ajudas já usadas pelo catálogo.
- `carreira-eventos.js` identifica o próximo clássico e aceita jogador suspenso como alvo de um recurso disciplinar.
- `tests/carreira-eventos.test.js` verifica a quantidade, os IDs, a integração e a multa do clássico, além de exercitar o catálogo inteiro.
