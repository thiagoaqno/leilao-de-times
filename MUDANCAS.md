# Vila: o mapa cresceu, tem carro e quatro estádios para entrar

## Como fica
- **O mapa ficou 8 vezes maior.** A vila continua igual, no meio, e em volta tem a cidade: prédios, o Rio Pinheiros e o
  Tietê (com pontes), a Serra do Mar e, lá embaixo, Santos, com praia e mar.
- **Os estádios ficam longe, cada um no seu canto (como em São Paulo):**
  - **Nubank Parque** a oeste (Perdizes): a caixa de cantos arredondados, fachada branca de escamas, cobertura cinza e
    cadeiras verdes, com a luz roxa;
  - **Neo Química Arena** lá no leste (Itaquera): as coberturas nos lados compridos, a fachada de vidro azul, o telão
    gigante de fora e as cadeiras pretas;
  - **Morumbis** a sudoeste: o oval de concreto com os pilares e a arquibancada tricolor sem cobertura;
  - **Vila Belmiro** descendo a serra pela Imigrantes, em Santos: pequenininha, muro branco, a faixa alvinegra na
    fachada e as casinhas do bairro em volta.
- **Só de carro.** Fora da vila é rodovia, e pedestre não passa. Em cada saída da vila (oeste, leste e sul) tem um
  estacionamento: aperte A (ou Espaço) para pegar o carro e de novo para descer. O carro é bem mais rápido e anda
  só na rodovia, que leva ao estacionamento do estádio. As placas verdes mostram o caminho.
- **Dá para entrar nos estádios.** Na frente do portão, Espaço/A entra. Lá dentro:
  - o gramado com as linhas e os gols com rede;
  - a arquibancada nas cores do clube, com a torcida pulando;
  - o telão com o placar e os bancos de reservas.
- **Tem uma bola no meio de campo.** Encoste para chutar (correndo, o chute sai mais forte). Entrou na rede, o telão e
  o campo gritam GOOOL e o placar muda. Para sair, é o túnel.
- **Minimapa** no canto (o botão "Mapa" esconde). No menu "Jogos", a seção **Estádios** marca um destino: uma seta
  amarela aponta o caminho e o estádio pisca no minimapa.
- Quem está de carro aparece de carro para os outros, e quem está dentro de um estádio só vê (e é visto por) quem está
  no mesmo estádio.

## Por dentro
- `public/index.html`:
  - `MW` x `MH` virou 320 x 260; a vila fica em `OX`, `OY` (140, 100), e as coordenadas dela continuam escritas como
    antes e são deslocadas no carregamento;
  - `montaMundo` monta as rodovias (`rodovia`), os estacionamentos (`lote`), a cidade (`PREDIOS`), os rios, a serra
    e o litoral;
  - o mapa passou a ser desenhado em pedaços de 32 x 32 casas (`pedaco`), só os que aparecem na tela, e a luz da
    noite é do tamanho da tela (antes era do mapa inteiro);
  - o carro (`player.car`, `carOk`, `spriteCarro`), os estádios por dentro (`INT`, `entraEstadio`, `saiEstadio`), a
    bola (`chuta`, `gol`), o minimapa e a seta do destino;
  - o caminho por clique (`bfs`) segue o mapa e o jeito em que a pessoa está (a pé, de carro ou no estádio).
- `public/vila/estadios.js` (novo): onde fica cada estádio, a fachada de cada um e o lado de dentro (gramado,
  arquibancada, torcida, telão).
- `vila.js`: o mapa grande, e cada pessoa manda a zona (`z`: a rua ou um dos 4 estádios) e se está de carro. O limite
  subiu para 30 movimentos por segundo (de carro se anda rápido).

## Conferido
- `npm test` passando (47), com um teste novo: quem está de carro ou dentro de um estádio chega assim para os outros, e
  um estádio que não existe vira "a rua".
- O teste de navegador da página da vila passando.
- Por script, na página: de cada saída, o carro chega ao estacionamento do seu estádio (de 108 a 140 casas), e a pé
  dá para ir do estacionamento ao portão de todos e da Vila Belmiro até a praia.
- No navegador:
  - pegar o carro no estacionamento oeste, dirigir até o Nubank Parque, descer e entrar;
  - por dentro dos 4 estádios;
  - chutar a bola para o gol (placar 1 x 0, e a bola volta ao meio);
  - sair pelo túnel.
