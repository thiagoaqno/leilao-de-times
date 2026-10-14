# Carreira: narrador e torcida na partida (ElevenLabs)

## O que muda

- **A partida tem som.** Um narrador brasileiro (a voz Andre H, criada na ElevenLabs) fala os lances e a torcida do
  estádio reage, com os áudios gerados uma vez e guardados em `public/carreira/som/` (13 MB).
  - **O narrador emenda os pedaços:** "GOOOOL!" + "Flamengo!" + "Pedro!" + "De pênalti!" e, depois, "Empatou o jogo!",
    "Virou!", "É goleada!" ou o placar falado ("Dois a um."). Também fala a defesa, a chance perdida, o pênalti e a
    cobrança, os cartões com o nome, a lesão, a substituição, o contra-ataque, o intervalo, o segundo tempo, os
    acréscimos, o fim de jogo e a disputa de pênaltis (o batedor e o resultado de cada cobrança). Na abertura de
    clássico, jogo decisivo ou final, a fala é outra ("É clássico! Casa cheia!").
  - **Os nomes:** os 40 clubes do Brasileirão e da Série B e 1073 jogadores (789 nomes falados: "Paquetá", "De la
    Cruz", "Léo Pereira"; dois do mesmo clube com o mesmo sobrenome ganham o nome inteiro). Quem não tem áudio (os
    garotos da base, as outras ligas) fica sem o nome, e o narrador fala o lance assim mesmo.
  - **Sem atropelo:** uma fala por vez, o gol passa na frente, nada fica acumulado atrás do jogo; o lance pulado ou
    que já passou (quem chega com a rodada andando na sala) fica em silêncio, e no 3× só os lances grandes.
  - **A torcida:** o burburinho do estádio e o canto com bateria em laço (o canto sobe no clássico, no decisivo e na
    final), a explosão no gol do time da casa, o gol do visitante com a casa calada, o "uhh", o aplauso na defesa, a
    vaia nos cartões do time da casa, a tensão antes do pênalti e os apitos. Abaixa enquanto o narrador fala, na
    parada tática e depois do apito final.
- **A música de fundo para quando a partida começa** e volta na sede (só se estava tocando). Tocar a música à mão no
  meio do jogo continua valendo.
- **O botão Som** na faixa da partida, ao lado de Mesa: narrador e torcida, só a torcida ou sem som (fica guardado).
- **Gerar de novo ou mais nomes:** `GERAR_NARRACAO.bat` (na raiz) roda `ferramentas/gerar-narracao.js` com a chave da
  ElevenLabs de quem roda (fica em `ferramentas/.elevenlabs-chave`, fora do git). `--estimar` mostra o custo, `--testar`
  gera só uma amostra, `--ligas todas` gera os nomes das outras ligas, `--refazer <chave>` refaz um áudio. Nome errado:
  `ferramentas/narracao-nomes.json`.

## Arquivos

- Novo: `public/carreira/som-partida.js`, `public/carreira/som/` (os MP3 e o índice), `tests/e2e/carreira-som.spec.js`.
- `public/carreira/partida.js` (os ganchos `SomPartida.abrir` e `SomPartida.evento`), `inicio.js` (`SomPartida.tela`),
  `musica.js` (`MusicaCarreira.calar` e `voltar`), `index.html` (o botão e os dois scripts).
- `ferramentas/gerar-narracao.js` e `GERAR_NARRACAO.bat`: a voz Andre H como padrão.

## Testes

- `tests/e2e/carreira-som.spec.js`: a música para e volta, a torcida e a abertura tocam, o gol emenda a fala, o clube
  e o jogador, e o botão troca os três modos.
- Rodados: `carreira.spec.js`, `carreira-mesa.spec.js`, `carreira-transicoes.spec.js` e o novo (16 testes, todos
  passando).
