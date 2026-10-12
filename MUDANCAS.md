# Bloqueio: visual novo (fase 2)

**Antes:** o Bloqueio funcionava, mas era um tabuleiro chapado em cinza e bege, sem animação nem som.

**Depois:** a mesa virou madeira à noite: tabuleiro de nogueira com veios, casas de marfim, paredes de mogno com sombra, peões com brilho nas cores de cada lugar e faixas coloridas mostrando a meta de cada um. Os peões deslizam de uma casa para outra, o da vez balança de leve, a parede cai com um quique, as casas onde você pode ir pulsam e a última jogada deixa um rastro. Os cartões dos jogadores mostram as paredes que sobram como tábuas, o cartão da vez acende na cor dele, e o relógio de jogada virou uma barra. Tem sons (passo, parede, sua vez, vitória, ligar/desligar no topo) e confete na vitória. A entrada ganhou um logotipo.

**Como:** só `public/bloqueio/index.html` mudou (as regras e o servidor continuam iguais). O SVG tem camadas fixas e só redesenha o que muda; os peões são elementos que persistem e animam por `transform` com transição de CSS (sem animar `filter`), e quem pede menos movimento no sistema fica sem as animações.
