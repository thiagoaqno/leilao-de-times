# Pokémon: nível e evolução da PokéAPI, luta com o selvagem no Ginásio e a cena da Pokébola em 8 tempos

## O que muda

**Nível, experiência e evolução, com os dados da PokéAPI.** Cada Pokémon da coleção agora é um indivíduo, com nível e
experiência:

- A ferramenta nova `ferramentas/base-pokeapi.js` gera os dados a partir dos arquivos oficiais da PokéAPI no GitHub.
  Para cada um dos 649 Pokémon, ela traz:
  - o ritmo de crescimento (a tabela de experiência de cada nível);
  - a experiência base;
  - a taxa de captura;
  - as evoluções.
- **Atributos pelo nível:** a vida, o ataque e a defesa saem da conta dos jogos. No nível 50 dá exatamente o que o
  Ginásio sempre usou, então as salas liberadas não mudam nada. O dano também leva o nível de quem bate.
- **Experiência:** vencer ou capturar um selvagem dá a experiência da conta da 5ª geração, dividida entre os seus
  Pokémon que entraram em campo. Vencer um mais forte rende mais.
- **Evolução no nível da PokéAPI:** Charmander vira Charmeleon no 16 e Charizard no 36, e passa as duas de uma vez se
  ganhar experiência suficiente.
  - Quem no jogo evolui por pedra, troca ou amizade evolui aqui num nível de reserva:
    - Pikachu vira Raichu no 30 (no jogo, pela Pedra do Trovão);
    - Kadabra vira Alakazam no 36 (troca);
    - Golbat vira Crobat no 28 (amizade).
  - A Pokédex mostra como é no jogo original.
  - Com mais de um caminho, como o Eevee, cada indivíduo segue o seu, sempre o mesmo.
- **Os três iniciais viraram Pokémon de verdade:** Bulbasaur, Charmander e Squirtle, nível 5, que sobem de nível e
  evoluem como os outros.
- **Na sala "só capturados" do Ginásio o nível vale:** cada um joga com o nível dos seus, e o robô fica com a média da
  sala. Nas salas liberadas continua tudo no nível 50.

**A captura ficou do jeito dos jogos: quanto menos vida, mais fácil.**
- **A fórmula:** a chance da Pokébola usa a taxa de captura da PokéAPI e a vida do Pokémon:
  (3·máx − 2·vida)·taxa / (3·máx·255), vezes 1,5 com ele tonto.
- **Exemplos:**
  - Pidgey de vida cheia, 33%; quase desmaiado, 99%.
  - Charmander de vida cheia, 5,9%.
  - Mewtwo, 0,4%.
- **A bola:** são quatro checagens. Ela balança uma vez por checagem que passou (no máximo três) e, se passar nas
  quatro, pega.

**Lutar contra o selvagem, em troca de nível ou de captura.**
- **O encontro na grama alta da Vila** mostra o nível, a vida e a chance, com três botões:
  - **Lutar** (L);
  - **Pokébola**, com a chance;
  - **Fugir**.
- **Lutar** leva para uma luta no Ginásio (3D), do jeito das outras batalhas:
  - o seu time contra o selvagem, sozinho, do outro lado;
  - o seu time é o que você montou, se for todo seu; senão, os três de nível mais alto;
  - o lugar segue o tipo dele.
- **Pokébola no meio da luta:** o botão no painel (tecla B; no celular, flutuando na arena) mostra a chance ao vivo,
  subindo conforme ele perde vida ou fica tonto.
  - A luta para durante a cena.
  - Escapou, a luta continua.
  - Pegou, ele vai para a coleção com o nível que tinha.
- **No fim:**
  - **capturou ou venceu:** cada Pokémon que lutou ganha a experiência, sobe de nível e evolui;
  - **perdeu, ou o tempo acabou:** nada.
  - A tela final mostra a experiência de cada um, o nível que subiu e a evolução, com o botão "Voltar para a grama
    alta".
- **Regras da sala da luta:** quem entra só assiste, a regra não muda e a mesma luta não recomeça.

**A cena da Pokébola, em 2D, em 8 tempos** (a mesma na Vila e por cima da arena 3D do Ginásio):

1. **Carga:** a bola nasce na mão, o anel da cor da raridade fecha em volta e as faíscas vêm para ela.
2. **Núcleo:** a Pokébola em pixel art, girando, com o botão aceso.
3. **Rastro:** o arco do arremesso, com a fita e as faíscas caindo.
4. **Estouro:** a bola abre no Pokémon com o clarão e os raios. Ele vira luz vermelha e é puxado para dentro, e a bola
   cai e quica.
5. **Reação:** os balanços, com o botão piscando e a poeira. Escapando, a bola estoura e ele volta.
6. **Som:** o zumbido da carga, o assobio, o estalo, o "tuc" de cada balanço, o clique e a musiquinha (ou o estouro).
   Tudo sintetizado, sem arquivo de áudio.
7. **Rescaldo:** pegou, as três estrelas, a bola apaga e o brilho assenta. Escapou, as metades voam e sobe a fumaça.
8. **Números:** a chance antes de jogar, o 1, 2, 3 de cada balanço e o "Capturado!" ou "Escapou!".

A cena dura exatamente o que o servidor pausa (2,7 s a 5,2 s, conforme os balanços). Com "menos movimento" no sistema,
ficam só a bola, os balanços e o texto.

**A Pokédex da Vila** mostra cada Pokémon com:
- o nível;
- a barra de experiência;
- a próxima evolução;
- as espécies que já passaram pela coleção.

As fases do meio de uma evolução também contam. O ranking conta as espécies; os iniciais não contam.

## Arquivos

- `ferramentas/base-pokeapi.js` (novo) gera `public/galeramon/pokeapi-dados.js` (novo).
- `public/galeramon/niveis.js` (novo): atributos por nível, experiência, evolução, a chance e a jogada da Pokébola, e o
  tempo da cena.
- `public/galeramon/captura2d.js` (novo): a cena da Pokébola em 8 tempos, com som.
- `migracoes/009-pokemon-nivel.sql` (novo):
  - nível, experiência e origem em cada captura;
  - a tabela `pokedex`.
- `bd.js`: `garantirIniciais`, `pokemonsDe`, `atualizarPokemon`, `registrarNaPokedex` e `pokedexDe`.
- `vila-mato.js` e `public/vila/mato.js`:
  - o encontro com nível e vida, e a Pokébola da PokéAPI;
  - o `lutar`;
  - `colecaoDe` com o melhor de cada espécie;
  - `darXp`;
  - a Pokédex com nível.
- `public/ginasio/regras.js`:
  - `novoBicho` com nível e ficha;
  - o dano pelo nível;
  - o selvagem sozinho;
  - o nível do robô.
- `ginasio.js`:
  - `criarSelvagem`;
  - `act` `pokebola`, com a pausa;
  - a experiência no fim;
  - o nível na sala "só capturados".
- `public/ginasio/selvagem.js` (novo): o quadro do selvagem, o botão da Pokébola, a cena por cima da arena e o
  resultado com a experiência.
- `public/ginasio/sala.js`, `controles.js`, `animacao.js`, `hud-pokemon.js`, `index.html` e `estilo.css`:
  - o nível na escolha e no painel;
  - os comandos parados durante a cena;
  - o selvagem escondido na bola.
- `public/index.html` (a Vila): o encontro com Lutar, Pokébola com a chance e Fugir, a cena 2D e a Pokédex com nível e
  experiência.
- `CLAUDE.md`: o mapa atualizado.

## Testes

- `tests/pokemon-niveis.test.js` (novo):
  - os dados da PokéAPI;
  - os atributos do nível 50 iguais aos da Pokédex;
  - subir de nível e evoluir (até duas fases; os caminhos do Eevee);
  - a chance pela vida e pelo tonto, e as quatro checagens (com a taxa medida em 20 mil jogadas);
  - a cena com o mesmo tempo da pausa;
  - o motor com nível e o selvagem sozinho.
- `tests/ginasio-selvagem.test.js` (novo; sobe o canal `/ginasio` com o banco em memória):
  - a luta abre com o meu time e o selvagem sozinho;
  - quem chega só assiste e a regra não muda;
  - a Pokébola pausa a luta, pega, guarda com o nível e dá experiência no banco;
  - escapou, a luta segue e a próxima bola espera.
- `tests/vila-mato.test.js`:
  - o encontro com nível e a Pokébola da PokéAPI;
  - os iniciais no banco;
  - evoluir no banco e a Pokédex com as fases do meio.
- Os testes novos entraram no `npm test`: 400 de 402. As duas falhas já existiam na `main`: o formato de
  `/carreira-online` em `salas.test.js` e "carreira: comprar na janela…".
- E2E não rodado, como combinado.
- Conferido no navegador:
  - o encontro na Vila e a cena (carga, voo, estouro, balanço, escapou);
  - a luta no Ginásio com o botão da Pokébola;
  - a captura na 2ª bola, com o Bulbasaur subindo do nível 5 ao 8.
