# A sala da Corrida no estilo da carreira, e os setores na tela do GP

## A sala

A tela de criar sala ainda tinha o visual de outubro, de antes da Central nova. Agora segue a entrada da carreira:

- Sem caixas: título grande e leve, carro solto no fundo com uma sombra suave, coluna fina à direita e os escudos em linha.
- Abas sublinhadas e um só botão cheio, na cor da equipe à vista.
- Modo claro e escuro, o mesmo da Central, com um botão na barra de cima.
- Cada pista mostra a foto dela desfocada e escurecida, com o traçado em branco por cima. O hover clareia a foto. Pistas sem foto ficam com fundo escuro.
- As dicas de teclado só aparecem para quem usa controle.

As etapas, o teclado, o controle e as regras não mudaram.

## Sobre o GP

A tela de detalhe ganhou o estilo novo e passa a mostrar:

- os três setores no mapa, com as curvas de cada um (os mesmos terços da volta do cronômetro do jogo);
- as zonas de DRS;
- o perfil de altura da volta, quando a pista tem desnível.

Ela também aparece na carreira, porque usa o mesmo código, mas lá os estilos novos de `sala-visual.css` não valem.

## Verificação

- Prints das etapas Equipe, Carro e pneu, Câmera, GP e Grid, e da tela Sobre o GP. Modo claro e escuro conferidos em parte das telas, sem erro no console.
- Não vi a tela no celular: a simulação foi desfeita sozinha quando o painel mudou de largura, então o CSS de celular não foi conferido.
- A tela Sobre o GP não foi aberta na carreira, nem a gaveta de peças no visual novo.
- Só `node --check`; a suíte fica com o CI.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
