# Painel de moderação: comandos do anfitrião e carreiras particulares

## O que muda

O painel `/admin/carreira` ganhou duas abas na lateral: **Salas em grupo** e **Carreiras particulares**.

- **Comandos da sala (o que o anfitrião faz no jogo, agora pelo painel):**
  - **Rodada:** começar a rodada, começar sem esperar a pausa entre as rodadas, encerrar a pausa e trocar a velocidade
    do jogo ao vivo (1× ou 3×) para todos.
  - **Temporada nova:** aparece quando a temporada acaba, e não roda com rodada ou leilão abertos.
  - **Técnicos:** quem está na sala, quem está fora, quem é o anfitrião e quem foi dispensado; botões **Tornar
    anfitrião** e **Dispensar** (o clube volta para o computador; com a bola rolando, no fim da rodada). O anfitrião
    só pode ser dispensado depois de passar o cargo.
  - **Leilão e trocas:** o leilão aberto (jogador, dono, lances, maior lance) com **Cancelar o leilão**, e as propostas
    de troca abertas com **Cancelar**.
  - O painel confere a sala sozinho a cada 5 s (a rodada acaba, a pausa corre), sem atrapalhar quem está digitando.
- **Carreiras particulares (solo e Rumo ao Estrelato):**
  - A lista com técnico, clube, modo, temporada, rodada, "jogando agora", "base antiga" e a última mexida, com busca
    por técnico ou clube.
  - As mesmas edições das salas: caixa, energia, overall, atributo, transferir e desfazer transferência. Ficam
    bloqueadas enquanto o técnico está no meio de uma partida.
  - **Gerar novo código de recuperação**, para entregar ao técnico que perdeu o acesso (o antigo deixa de valer).
  - O save é editado direto no banco: o jogo lê o save de novo a cada ação, então a mudança aparece na próxima.
- **Últimas edições da moderação:** cada sala e cada carreira mostram as 15 últimas edições (quem, quando, antes e
  depois), do registro `moderacao_carreira`.

## Arquivos

- `carreira-moderacao.js`: as edições num contexto comum para sala e solo (`ctxSala`, `ctxSolo`, `aplicarSolo`,
  `detalheSolo`).
- `carreira-online.js`: `comandar` (os comandos do anfitrião, registrados como `sala:<tipo>`) e `infoSala`.
- `carreira-solo-moderacao.js` (novo): lista, detalhe, edição e código novo das carreiras particulares.
- `bd.js`: `listarCarreiras`, `carreiraPorId`, `salvarEdicaoCarreira` e `historicoModeracao`.
- `admin-carreira.js` e `admin-carreira.html`: as rotas e a página.

## Testes

- `tests/carreira-moderacao-painel.test.js` (novo): edição solo e bloqueio na partida, a carreira pelo banco com o
  registro e o código novo, e os comandos do anfitrião numa sala carregada do banco.
- `tests/admin-carreira.test.js`: as rotas novas exigem sessão e CSRF.
- Rodados também: `bd`, `carreira-online`, `carreira-online-mercado`, `carreira-moderacao` e `salas` (23 testes,
  todos passando), e o painel aberto no Chromium com uma sala e carreiras de teste (sem erros na página).
