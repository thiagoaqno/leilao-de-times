# Ginásio: os bichos se mexendo de verdade

## Como fica
- **Os Pokémon têm animação de verdade.**
  - Na arena, cada Pokémon toca o sprite animado do Black/White: os 493, e não mais uma imagem parada.
  - Charizard, Pidgeot e Butterfree batem asa, as chamas mexem e todo mundo respira.
  - Enquanto o GIF chega, aparece o sprite parado de antes.
- **Os Galeramon ganharam quadros.** O corpo respira, as chamas do Churrasquilo, do Boitatá e do Mico-Leão tremulam, a
  asa do Fofocaio bate, as faíscas do Pastelétrico e do Loboguaraná piscam, o redemoinho do Saci gira, e eles piscam o olho.
- **Cada momento tem o seu jeito:**
  - **parado:** os voadores e os fantasmas flutuam, com a sombra menor no chão;
  - **andando:** pulinho e poeira nos pés;
  - **virando:** achata por um instante;
  - **golpe:** corpo a corpo com antecipação, avanço e volta; golpe à distância com brilho do tipo e tranco para trás;
  - **apanhando:** pisca branco e é empurrado;
  - **esquiva:** pulinho e achatado na queda;
  - **investida:** estica, com rastro;
  - **velocidade em alta:** rastro;
  - **entrada:** em campo com um "pop";
  - **desmaio:** tomba de lado, quica e vira pó.
- **Golpes que viram movimento:**
  - **Fly e Bounce:** o bicho sobe e sai da tela; a sombra segue até o ponto mirado e ele cai com estouro de poeira.
  - **Dig e Escavar:** afunda num buraco, um montinho de terra anda pelo chão e ele explode para fora em pedras.
  - **Mergulho:** poça, bolhas andando e espirro na saída.
  - **Shadow Force:** some numa sombra.
  - Enquanto o bicho está sumido, **ninguém acerta**. Ele cai em cima de quem estiver no ponto mirado, com o aviso no chão para dar tempo de desviar.
  - **Giros:** Gyro Ball, Flame Wheel, Rolamento e Cambalhota viram investida, com o sprite girando.
- **Golpes de cada tipo animados** (são 18 famílias):
  - bola de fogo que tremula, jato d'água com gotas, raio em zigue-zague que pisca, folhas girando, cristal de gelo,
    pedra rolando, anéis psíquicos, fantasma ondulando, gosma de veneno, lua sombria, rajada de vento, soco, brilhos de
    fada, estrela de aço e mais;
  - cada impacto estoura no jeito do tipo: brasas sobem, gotas espirram, pedras quicam, folhas caem devagar;
  - os golpes de área caem do céu: raio, coluna de fogo, gêiser e pedras caindo no fim do aviso.
- **Botões:**
  - os golpes afundam de leve ao apertar;
  - a borda acende na cor do tipo quando a recarga acaba;
  - a vida do placar desce suave.
- Quem pede menos movimento no sistema fica sem tremor, rastros, partículas e tombos. Os quadros dos sprites continuam.

## Por dentro
- `public/ginasio/gif.js` (novo): lê GIF animado sem dependência. Cuida de paleta, transparência, entrelaçado, descarte
  e LZW, e devolve os quadros montados com o tempo de cada um.
- `public/ginasio/animacao.js` (novo):
  - carrega os quadros (`animacaoDe`), com o sprite parado de reserva;
  - `desenharBicho`, com todos os estados acima, vindos dos eventos do servidor (`animarEvento`);
  - as partículas, numa lista fixa de 260.
- `public/ginasio/golpes.js` (novo): o projétil de cada tipo, o corte, o estouro e os golpes de área.
- `public/galeramon/sprites.js`: `GaleramonSprite.quadros(id)` (4 quadros e o de olho fechado). A batalha por turnos
  continua com o quadro de sempre.
- `public/galeramon/pokemon.js`: `PokeDex.spriteAnimado(id)`.
- `public/ginasio/regras.js`:
  - as classes `sumir` (`SUMIR`: voo, cova, mergulho, sombra) e o `giro` na investida;
  - o `oculto` não pode ser acertado nem atacar, esquivar ou trocar;
  - o evento `golpe` passa a levar o tipo; os novos eventos são `sumiu` e `voltou`.
- `ginasio.js` e `rede.js`: o pacote leva o `oculto` e o `giro`, e a previsão de movimento acompanha o voo.

## Conferido
- `npm test`: 67 passaram, 0 falharam.
  - Os testes novos: o leitor de GIF; voo, buraco e mergulho sem levar dano e caindo no ponto mirado; a tela prevendo o voo igual ao servidor; os giros.
- `npx playwright test tests/e2e/ginasio.spec.js tests/e2e/vila-ginasio.spec.js`: 10 passaram.
- O leitor de GIF abriu os sprites reais de Charizard (72 quadros), Beedrill, Gengar, Pikachu e Gyarados.
- No navegador, contra o robô, sem erro no console:
  - os sprites animados carregaram (Charizard, Blastoise, Charmander);
  - o Fly do Aerodactyl sumiu e voltou no ponto mirado;
  - o Agility do Pidgeot deixou o rastro.
- Numa cena montada na prévia da arena:
  - o voo, subindo e só com a sombra;
  - o Gible afundando e o montinho de terra;
  - o Golem girando na investida;
  - o Gengar flutuando;
  - as pedras caindo na área;
  - os 18 projéteis.
- Fotos em `planos/imagens/ginasio-animacoes-*.jpg`.
