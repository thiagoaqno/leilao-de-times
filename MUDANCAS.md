# Bugs pequenos achados na varredura

Quarto passo da refatoração: correções pontuais.

## O que muda

- **Haxball na Noite da Galera:**
  - a página não carregava o `noite.js`, então o Haxball ficava sem a aba 🌙. Quem a Noite chamava para o Haxball
    caía na página e tinha que entrar na mão. Agora a aba aparece e o `?entrar=1` entra sozinho na sala
    (`CAMPOS.haxball` no `public/noite.js`);
  - o nome passa a ser guardado também em `galera:name`, como nos outros jogos;
  - `vila.js` não tinha o `haxball` na lista `GAMES`. Quem entrava no prédio do Haxball sumia do mapa sem o nome do
    jogo.
- **Tiro:** quando a faxina apagava uma sala parada no meio de uma partida, o envio das posições (a cada 50 ms)
  continuava rodando para sempre. Agora para junto.
- **Palavra Proibida:** a sala guardava só a hora em que foi criada (`room.t`), e a faxina apagava uma mesa em uso 6 h
  depois de criada. Agora cada estado enviado atualiza a hora.
- **Nomes sem escape:**
  - no Drag, o nome dos outros pilotos entrava direto no HTML (o aviso de "perda total" e a tabela do resultado);
  - o `esc` do Leilão não escapava aspas e era usado dentro de `title="..."`. Agora usa o `Comum.h`;
  - os escapes da Noite, dos replays do Leilão e dos escudos da Carreira passam a escapar o apóstrofo também.
- **Memória do 3D:**
  - **Batalha:** cada item que sumia da pista (banana, casco, bomba) e cada kart que saía ficavam com as geometrias,
    os materiais e a etiqueta do nome na memória da placa de vídeo. Agora saem (`soltarProj`, `disposeKart`).
  - **Tiro:** o mesmo com os bonecos dos outros jogadores (`soltarBoneco`). Os materiais do corpo ficam, porque o
    boneco de pano de quem morreu ainda pode estar usando.

## Conferido e deixado como está

- **Ginásio fora da lista de salas da Vila:** é de propósito. Ele tem salas particulares (desafio da Vila, líderes,
  selvagens).
- **Carreira em grupo sem o evento `pedido`:** a chamada só existe no ramo da carreira solo, então não é bug.

## Testes

- **Novo, em `tests/e2e/haxball.spec.js`:** chegando pela Noite (`?sala=&entrar=1`), o Haxball entra sozinho na sala
  com o nome da galera e mostra a aba da Noite.
- `proibida`, `haxball`, `salas` e `servidor`: passando.
- No navegador, `haxball`, `leilao-campeao`, `paginas` e `salas`: passando.
- `corrida-drag.spec.js` tem 2 testes que falham também na `main` sem esta mudança: esperam 3 carros e acham 4, e o
  motor não chega a explodir. É uma falha que já existia, provavelmente desde o racha multijogador (#291). Fica
  anotada no plano.
