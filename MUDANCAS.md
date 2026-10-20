# Haxball com robôs e visual novo

## O que muda

### Robôs
- O anfitrião pode pôr **robôs** em qualquer time ("+ Robô") ou **completar os dois times** de uma vez, e escolher o nível: fácil, médio ou difícil.
- Na entrada, **"Treinar contra robôs"** cria a sala no formato escolhido, completa com robôs e já começa.
- Como eles jogam (`H.robo` em `public/haxball/regras.js`, rodando no servidor a cada passo): os papéis são divididos só entre os robôs. O mais perto da bola contorna por trás dela (sem empurrá-la para o próprio gol) e só chuta com o gol adversário na frente. Se sobra mais de um, o mais recuado fica de goleiro e os outros guardam posição. Quando trava colado na bola, chuta e recua para destravar.
- Robôs aparecem como "robô" na lista e "CPU" no campo, e não entram no placar da Noite.
- Regra nova, que vale para todos: **bola presa** encostada na parede por 4 s (num canto, entre dois discos) volta um pouco para dentro do campo.

### Visual
- Campo com faixas de grama cortada e linhas com brilho, arquibancada em volta com a torcida nas cores dos times, gols com rede (que estufa no gol) e traves redondas.
- Discos com sombra e relevo, a inicial do jogador e o nome numa plaquinha; o anel branco do chute (e no seu disco enquanto você segura o espaço, como no Haxball).
- Bola com gomos que giram conforme ela anda.
- **Movimento liso**: o desenho fica 70 ms atrás do servidor e mistura os dois últimos pacotes, em vez de empurrar pela velocidade.
- **Gol**: "GOL!" grande na cor do time, confete, tremida e o número do placar pulando.
- Tela nítida em monitores de alta densidade. Quem pede menos movimento no sistema fica sem tremida e sem confete.

## Verificação

- `node --test tests/haxball.test.js`: 6 testes passaram. Os novos cobrem robôs jogando sozinhos e marcando em 1x1, 2x2 e 3x3 (inclusive com uma pessoa parada no time), a bola presa e as ações `bot`/`completar` com o início da partida.
- `node --test tests/salas.test.js`: passou. O formato regravado só ganhou a linha `boxReady` da Corrida, que estava desatualizada no `main` (a mesma mudança do PR da Corrida).
- `npx playwright test tests/e2e/haxball.spec.js`: passou.
- Conferido no navegador: treino 2x2 contra robôs, gol com comemoração.
