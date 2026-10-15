# Ginásio, modo Pokémon: HUD de MOBA e cenários ao ar livre

## O que muda

**A HUD inteira do modo Pokémon foi refeita no jeito das partidas de MOBA vistas de cima** (como a referência):

- **Em cima:** os dois times lado a lado, com o retrato de cada Pokémon e a vida embaixo (o que está em campo acende
  em dourado, o desmaiado fica cinza e riscado), o placar de nocautes de cada lado e o relógio no meio.
- **Embaixo, o painel do meu Pokémon:** o retrato grande com o nível, o nome e os tipos; os atributos (ATQ, DEF, VEL)
  com a seta do que subiu ou caiu; a barra de vida riscada de 100 em 100 com os números e a barra de guarda; as quatro
  habilidades quadradas, com a moldura na cor do tipo, a tecla no canto (M1, M2, Q, E) e a recarga girando em leque;
  esquiva (Espaço) e guarda (Shift); as reservas para trocar (1, 2 e 3) e os efeitos em cima de mim (tonto, golpe
  forte guardado, guarda, atributos).
- **O minimapa** no canto: o chão do lugar, as pedras, os bichos dos dois lados (eu com o anel amarelo), os avisos no
  chão e os projéteis.
- **O feed de nocautes** no canto de cima: quem nocauteou quem, com os retratos, e some sozinho.
- **Em cima de cada bicho:** o nome de quem joga, o nível na caixinha e a vida riscada (verde eu, azul quem joga
  comigo, vermelho o outro lado).
- Em telas menores o painel encolhe (some o retrato e o minimapa); no celular, os botões de toque continuam os de
  sempre, com a barra dos times em cima.

**Os cenários do modo Pokémon saíram do ginásio e foram para o ar livre**, visto de cima como na referência:

- **Clareira da floresta** (o padrão): grama com manchas, a trilha de terra serpenteando pelo meio, capim, flores e
  folhas secas no chão, árvores verdes, outonais e brancas em volta, arbustos, pedras, um tronco caído e cogumelos.
- **Cratera do vulcão:** basalto com rachaduras de lava, árvores queimadas com brasa nos galhos, poças de lava com
  crosta e o miolo pulsando.
- **Lagoa:** areia com conchas e poças, palmeiras, juncos e a água no fundo.
- **Pico nevado:** neve com pegadas na trilha e gelo, pinheiros com neve em cima e montes de neve.
- **Ruínas:** lajotas com musgo nas juntas e rachaduras, colunas quebradas no meio do mato e o arco caído ao fundo.
- As pilastras da regra (no mesmo lugar e do mesmo tamanho) viram a pedra com musgo, o basalto com veio de lava, a
  rocha de coral, os cristais de gelo ou a coluna quebrada. Cada lado tem a sua bandeira (azul e vermelha).
- O lugar sai do tipo do líder (fogo e dragão no vulcão, água na lagoa, gelo na neve, pedra, lutador, psíquico e
  fantasma nas ruínas, grama e elétrico na floresta); sem líder, a partida sorteia (a floresta sai mais), e a sala
  inteira vê o mesmo.

Galeramon e Naruto continuam com o ginásio e a HUD de antes.

## Arquivos

- `public/ginasio/biomas.js` (novo): `BIOMAS`, `biomaDaPartida`, o chão pintado e `montarBioma`.
- `public/ginasio/hud-pokemon.js` (novo): a barra dos times, o painel, o minimapa e o feed.
- `public/ginasio/temas.js`, `cena3d.js`, `desenho.js` (o chão, a cena e a reserva de espaço da câmera), `animacao.js`
  (`barraDoHeroi`), `hud.js` (as teclas e a recarga em leque), `estilo.css`, `index.html`.
- `tests/ginasio-biomas.test.js` (novo), `CLAUDE.md`.

## Testes

- `tests/ginasio-biomas.test.js` (cada lugar com os campos de um tema; o líder escolhe; sem líder, a mesma partida dá
  o mesmo lugar e as partidas variam) e os outros testes do Ginásio passando.
- Conferido no navegador nos cinco lugares (1100×640), em 700×420 e 480×270, e no celular em pé e deitado, sem erro
  na página. O E2E não foi rodado.
