# Corrida de Digitação no lugar da Arrancada JDM

Antes: a Oficina JDM (Arrancada, no lote de baixo do Autódromo) era um jogo de tunar carro e apostar no drag, e os carros de verdade não apareciam.

Depois: o mesmo prédio virou a **Arena de Digitação** (`/digita/`): todo mundo recebe a mesma frase aleatória em português (50 frases) depois de uma contagem 3-2-1, e quem digitar tudo certinho primeiro ganha a rodada. Acento e maiúscula contam, letra errada fica vermelha e colar não funciona. Cada piloto é um carro numa pista que anda a cada letra certa, com as palavras por minuto ao vivo. Pontos por lugar (10, 7, 5, 3, 2, 1), rodadas de 1, 3 ou 5, até 8 pilotos, robôs completam a pista até 4 e quem fechar com mais pontos ganha a noite (entra no placar da Noite da Galera). O tuning, as apostas e a NHTSA vPIC saíram.

Como: `digita.js` (canal `/digita`: o navegador manda o texto digitado em `digitou`, o servidor confere com a frase, anda os robôs pelo relógio e manda o progresso 4 vezes por segundo) e `public/digita/` (`frases.js` UMD com as frases e as contas, `index.html` e `jogo.js`). `vila.js`, `noite.js`, o prédio e o telhado de teclado em `public/index.html` e os testes (`tests/digita.test.js`, `salas` regravado, `paginas.spec`) acompanham.
