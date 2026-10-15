# Ginásio, modo Pokémon: HUD à esquerda, mais leve, escolha do lugar, terreno que reage ao tipo e a grama alta da Vila

## O que muda

**A HUD saiu de baixo e foi para o alto, à esquerda.** O painel do meu Pokémon (retrato, vida, guarda, as quatro
habilidades, esquiva, guarda, reservas e efeitos) agora é uma coluna estreita no canto de cima, com o minimapa embaixo
dela. A câmera anda para a direita para a quadra caber inteira no espaço livre: nada mais tapa a luta. Em tela pequena
o painel volta para baixo, compacto, como antes.

**O jogo ficou bem mais leve.** O que travava:

- **O chão do lugar era lido de volta da placa de vídeo a cada quadro.** O desenho do chão (pintado uma vez) morava num
  canvas da placa de vídeo e era copiado, a cada quadro, para o canvas na memória que a cena 3D compara. Isso fazia o
  processador esperar a placa. Agora ele mora na memória também: no teste, essa parte caiu de ~309 ms para ~6 ms por
  quadro.
- **O cenário tinha mais de 600 peças** (cada árvore com 5 a 8), cada uma uma chamada para a placa, duas vezes por
  quadro (uma para a sombra). Agora as peças paradas viram uma malha por material: ~85 chamadas.
- O painel e o minimapa mudam 15 vezes por segundo, não a cada quadro, e os atributos só são reescritos quando mudam.

**Dá para escolher o lugar da luta.** Na sala, no modo Pokémon, a linha "Lugar da luta": Sortear, Floresta, Lagoa,
Vulcão, Neve ou Ruínas, com uma dica do que cada um muda. Quem escolhe é o servidor, que manda o lugar para todos. Sem
escolha, o desafio de líder usa o lugar do tipo dele, e a sala sorteia.

**O lugar reage ao tipo de cada Pokémon:**

- **Água:** quem anda nela fica lento. O tipo Água nada, mais rápido e batendo mais forte (+15%).
- **Água funda (o meio da Lagoa):** é parede para quem não nada nem voa. Água atravessa nadando.
- **Lava (Vulcão):** queima quem anda nela. O tipo Fogo fica à vontade, mais rápido e mais forte.
- **Gelo (Neve):** quem não é de Gelo escorrega longe quando leva um golpe. Gelo desliza rápido.
- **Areia (Ruínas e Vulcão):** fofa, lenta para todos, menos Terrestre e Pedra.
- **Mato alto (Floresta e Ruínas):** pesa um pouco. Grama corre nele.
- **Quem voa (tipo Voador) passa por cima de tudo:** da água, da lava, do mato e até das pedras. Quem não tem asa não
  passa.

Cada lado ganha o mesmo terreno (as zonas são espelhadas pelo meio) e nada fica em cima de onde os bichos entram. O
terreno aparece pintado no chão e no minimapa, com o capim em pé, o brilho da água e a lava pulsando. Quem está na água
faz marola. A previsão do movimento na tela usa as mesmas regras, e o robô sai do terreno que o atrapalha.

**A grama alta da Vila.** Em frente ao Ginásio, do outro lado da pista da Vila Esportiva, tem um campo de grama alta.
Andando nele aparecem Pokémon selvagens:

- **Cinco raridades:** comum, incomum, raro, épico e lendário. A raridade sai da soma dos atributos base; os lendários
  e míticos são à parte. Quanto mais raro, menos aparece, mais difícil de pegar e mais fácil de fugir.
- De vez em quando o Pokémon vem **brilhante** (1 em 80).
- A cena do encontro mostra o Pokémon na grama com o selo da raridade. **A Pokébola é infinita:** ela voa, balança
  (mais vezes quando foi por pouco) e pega, ou ele escapa (dá para jogar outra) ou foge.
- **Tudo fica no banco:** cada navegador tem um código de treinador, e só o hash dele vai para o banco.
- **Minha Pokédex** (no menu ☰ Jogos): as espécies que você já pegou, quantas de cada raridade, quantas vezes cada uma
  e se já veio brilhante, mais o ranking dos maiores colecionadores.
- Pegar um épico, um lendário ou um brilhante vira notícia para a vila inteira.
- O servidor confere se a pessoa está mesmo na grama, o tempo entre os passos e faz todos os sorteios.

## Arquivos

- `public/ginasio/estilo.css`, `hud-pokemon.js`, `desenho.js` (`ajustarCanvas`) e `cena3d.js` (`enquadrar3d` com a
  beira esquerda): a HUD no alto, à esquerda.
- `public/ginasio/biomas.js`: o chão na memória, `fundirEstaticos`, o terreno pintado (`PINTURA_TERRENO`) e em 3D, e
  `biomaDaPartida` lendo o lugar da partida.
- `public/ginasio/regras.js`: `TERRENOS`, `TERRENO`, `noTerreno`, `zonaEm`, `queimarNaLava`, `escolherBioma`; o
  terreno na velocidade, em `limitar`, no atrito, no dano e no robô.
- `ginasio.js`: a opção `arena` e o `bioma` da partida no estado.
- `public/ginasio/sala.js` e `index.html`: a escolha do lugar.
- `public/ginasio/rede.js`: a previsão com o terreno.
- `public/ginasio/animacao.js`: as marolas e as faíscas da lava.
- `public/vila/mato.js` (novo), `vila-mato.js` (novo), `vila.js`, `public/index.html`, `bd.js` e
  `migracoes/008-capturas.sql` (novo): a grama alta, os encontros, a Pokébola, a Pokédex e as capturas no banco.
- `CLAUDE.md`: o mapa atualizado.

## Testes

- `tests/ginasio-terreno.test.js` (novo):
  - a escolha do lugar e as zonas (dentro da quadra, longe da entrada, espelhadas);
  - a água: Água mais rápido e mais forte;
  - a funda: parede para quem anda, Água e Voador atravessam;
  - quem voa passa por cima das pedras;
  - a lava queima (menos Fogo e Voador);
  - o gelo escorrega;
  - a previsão da tela igual ao servidor no terreno.
- `tests/vila-mato.test.js` (novo):
  - as raridades e o sorteio pelo peso;
  - a Pokébola;
  - o encontro só na grama;
  - a Pokébola infinita até pegar;
  - a captura no banco e na Pokédex;
  - a notícia do lendário;
  - a fuga e o "fugir";
  - as capturas agrupadas por treinador.
- `tests/ginasio-biomas.test.js`: a tela usa o lugar que o servidor escolheu.
- Os testes de física pura (`ginasio-fisica`, a previsão de `ginasio.test.js`) rodam sem terreno.
- `npm test`: 374 de 376. As duas falhas já existiam na `main`: o formato de `/carreira-online` em `salas.test.js` e
  "carreira: comprar na janela…".
- E2E não rodado, como combinado.
