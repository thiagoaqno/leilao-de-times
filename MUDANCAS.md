# Bloqueio: novo jogo na Vila (fase 1, o esquema geral)

**Antes:** a Vila não tinha nenhum jogo de tabuleiro de bloquear caminho.

**Depois:** a **Casa do Bloqueio** fica na Rua das Cartas (no terreno da direita, que era vazio). O jogo é o Quoridor: tabuleiro 9x9, cada peão tenta chegar ao lado oposto; na sua vez você anda uma casa (pulando o peão que está na frente, ou indo para o lado se a casa de trás está fechada) ou põe uma parede de duas casas (10 paredes em 2 jogadores, 5 em 4). Não vale parede que feche todo o caminho de alguém, nem que sobreponha ou cruze outra.

**Como:** `public/bloqueio/regras.js` guarda as regras (as mesmas no servidor e no navegador, com o robô), `bloqueio.js` cuida da sala (código de 5 letras, convite, assistir, reconexão, robôs, relógio de 30/45/60 s em que quem demora anda um passo, placar da Noite), e `public/bloqueio/index.html` desenha o tabuleiro em SVG, simples e sem estilo (cores, animações e efeitos ficam para a fase 2). Testes em `tests/bloqueio.test.js`; `/bloqueio` entrou em `tests/salas.test.js`.
