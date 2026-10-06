# Ginásio: os bichos se mexendo de verdade

Plano para o Codex, em 3 PRs. Cada um vira uma branch nova a partir de `origin/main`. Antes, leia `CLAUDE.md` e
`planos/ginasio.md`.

## O problema hoje
Em `public/ginasio/desenho.js` (`desenharBicho`), cada bicho é **uma imagem parada**:
- o Pokémon é o sprite do FireRed;
- o Galeramon é o desenho 32x32.

O que se mexe é a imagem inteira: um pulinho ao andar, uma inclinação no golpe e o desbotar ao desmaiar. Não dá para
ver bater asa, voar, cavar nem correr, porque a imagem só tem um quadro.

## Sobre as skills `animate` e `emil-design-eng`
Elas são para **animação de interface** (CSS, curvas, modais, menus). Uma das regras delas é até "não animar ação de
teclado", o contrário de um jogo.
- **Use as skills só no HUD e nos menus** do Ginásio: botões, barra de recarga, sala de espera, placar do fim.
- **Não use para o boneco e os golpes:** lá vale animação de jogo (quadros, antecipação, impacto, recuo), que está
  descrita abaixo.

## Decisões fechadas
1. **Pokémon com sprite animado de verdade.**
   - Trocar o sprite parado pelos animados de Black/White, do mesmo PokeAPI:
     - frente: `.../sprites/pokemon/versions/generation-v/black-white/animated/{num}.gif`
     - costas: `.../back/{num}.gif`
   - Cobrem os 493. Os voadores já batem asa, os de fogo têm a chama mexendo e todo mundo respira.
   - O canvas não toca GIF sozinho: decodificar os quadros uma vez com um decodificador pequeno, guardado em
     `public/vendor/` como o Three.js (sugestão: `gifuct-js`, licença MIT, baixado do npm). Nada de CDN em tempo de jogo.
   - Montar uma folha de quadros (canvas) por bicho, em cache, com o tempo de cada quadro.
   - Enquanto carrega, ou se falhar, usar o sprite parado de hoje.
   - Na tela, a folha é desenhada pelo relógio do jogo, e mais rápido quando o bicho anda.
2. **Galeramon ganha quadros.** As funções `DRAW` em `public/galeramon/sprites.js` passam a receber o quadro (0 a 3) e
   mexem as partes: pernas, asas, chama, cauda, olhos piscando.
   - A batalha por turnos da Vila continua usando o quadro 0.
3. **Estados do bicho (`estadoVisual`)**, que vêm dos eventos que o servidor já manda:
   | Estado | O que se vê |
   | --- | --- |
   | parado | animação do GIF; os **Voador** e os que flutuam (Fantasma, Levitate) ficam no ar, oscilando, com a sombra menor no chão |
   | andando | GIF mais rápido, pulinho no ritmo, poeirinha nos pés a cada passo; virar de lado tem um "squash" de 1 quadro |
   | correndo / investida | estica na direção (stretch), rastro de 3 imagens fantasmas, linhas de velocidade, poeira na largada |
   | golpe corpo a corpo | antecipação (recua e encolhe 80 ms), avanço com stretch, impacto (o alvo fica branco 2 quadros e recua), volta |
   | golpe à distância | encolhe e "carrega" com o brilho do tipo, solta com um tranco para trás |
   | apanhando | pisca branco, recua na direção do golpe, a tela treme só se for você |
   | esquiva | pulinho de lado com 2 fantasmas e o squash ao cair |
   | desmaio | cai de lado (rotação), quica uma vez e some em pó |
4. **Golpes que viram movimento** (precisa mexer nas regras, não só no desenho). Entram em `ESPECIAIS` no
   `public/ginasio/regras.js`, valendo para os dois dex:
   | Golpe | Como funciona | O que se vê |
   | --- | --- | --- |
   | Fly / Bounce (voar) | Sobe por 1 s sem levar dano e cai onde mirou, com área de aviso | Sobe batendo asa, sai do quadro; a sombra no chão segue a mira e cresce até cair |
   | Dig (cavar) | Some por 1 s debaixo da terra sem levar dano, anda e sai embaixo do alvo | Afunda num buraco (corte na imagem), um montinho de terra anda pelo chão, explode em pedras na saída |
   | Dive (mergulhar) | Igual ao Dig, mas sai numa onda | Poça d'água, bolhas andando, espirro na saída |
   | Teleport / Agility | Teleporte curto / corrida | Some em faíscas e aparece; corrida com rastro |
   | Quick Attack, Extreme Speed | A investida que já existe | Rastro forte e linhas de velocidade |
   | Golpes de giro (Rapid Spin, Rollout) | Investida | O sprite gira |
   - Cada golpe novo ganha teste: sem dano durante o voo e o buraco, e saída no ponto certo.
5. **Os golpes também ficam mais vivos.** Cada tipo ganha uma animação de 3 a 5 quadros em pixel-art no lugar do
   desenho parado de `partituraTipo`:
   - fogo: chama que tremula;
   - água: jato com espirro;
   - raio: zigue-zague que pisca;
   - grama: folhas girando;
   - pedra: pedras caindo com poeira;
   - psíquico: anéis que pulsam;
   - e assim por diante.
   O impacto de cada tipo tem o seu estouro, de 6 a 8 quadros.
6. **Regras de jogo para animação** (no lugar das de interface):
   - O golpe sai **na hora** do clique. A antecipação é só visual e não atrasa o acerto que o servidor calcula.
   - As animações seguem o relógio do jogo, não o `requestAnimationFrame` cru, para todos verem o mesmo ritmo.
   - Movimento só em pixels inteiros (`Math.round`), sem suavizar a imagem.
   - Quem pede menos movimento (`prefers-reduced-motion`) fica sem tremor, rastros e partículas; os quadros do sprite
     continuam.
   - Desempenho: 4 bichos, 30 projéteis e as partículas a 60 quadros por segundo num celular médio. As partículas ficam
     numa lista de tamanho fixo.

## PRs
1. **Os sprites animados:**
   - os quadros dos GIFs dos Pokémon (decodificador em `public/vendor/`, cache e quadro parado de reserva);
   - os quadros dos Galeramon;
   - os estados parado, andando, apanhando, esquiva e desmaio.
   - **Pronto quando:** Charizard, Pidgeot e Butterfree batem asa na arena, Gengar flutua, e há um GIF ou foto do
     Ginásio no PR.
2. **Os golpes que viram movimento:** voar, cavar, mergulhar, teleporte e giro, nas regras, com os testes, mais o
   desenho de cada um.
   - **Pronto quando:** dá para usar Fly e Dig contra o robô, sem dano durante o voo e o buraco, com fotos.
3. **Os efeitos por tipo:** as animações de golpe e de impacto de cada tipo, mais o corpo a corpo e o tiro com
   antecipação e recuo.
   - Aqui, e só aqui, as skills de interface entram no HUD (recarga e botões).
