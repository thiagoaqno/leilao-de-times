# Sai o Road to Champions e a dublagem

Primeiro passo da refatoração: o Road to Champions sai do site, com toda a dublagem.

## O que muda

- **Vila:** o prédio do Road to Champions virou um terreno "EM BREVE" no mesmo lote, ao lado da Pelada. O endereço
  `/jogador/` não abre mais nada, e `/road-to-champions` deixou de redirecionar.
- **Servidor:** sai o canal `/road-to-champions` e a rota `/api/rtc-foto` (as fotos dos protagonistas, que vinham da
  TheSportsDB).
- **Dublagem:** saem o manifesto, os MP3 das vozes, o tocador das cenas (`road-voz.js`, `road-dublagem.*`) e a
  ferramenta que gerava tudo (`ferramentas/rtc-dublagem.js`). A narração das partidas da Carreira
  (`public/carreira/som/`) não é dublagem e continua igual. Só sai o gancho `SomPartida.configurar`, que existia só
  para o Road to Champions.
- **Testes no GitHub:** o único workflow que rodava testes era o do Road to Champions, e só quando a mudança mexia
  nos arquivos dele. No lugar entra `.github/workflows/testes.yml`, que roda o `npm test` em todo PR e em todo push
  na `main`.
- **Banco:** a tabela `rtc_campanhas` fica onde está. A migração `007` já rodou no Fly, e apagar as campanhas salvas
  não tem volta. Se quiser limpar, é uma migração nova com `DROP TABLE`.

## Arquivos

- **Apagados:**
  - `road-to-champions.js`;
  - `public/jogador/` inteira, menos `jogador.js` e `jogador.css`, que são do Rumo ao Estrelato e estão fora do ar
    desde antes;
  - `ferramentas/rtc-dublagem.js`;
  - os testes do Road to Champions (3 de servidor e 2 de navegador);
  - `.github/workflows/road-to-champions.yml`.
- **Mudados:** `server.js`, `vila.js`, `public/index.html` (o terreno, `TERRENOS` com o deslocamento `OX`/`OY`),
  `public/carreira/som-partida.js`, `package.json` e `CLAUDE.md`.
- **Novo:** `.github/workflows/testes.yml`.

## Testes

- `npm test` inteiro na `main`, antes da mudança: 450 testes passando, em cerca de 9,5 minutos.
- Depois da mudança:
  - `salas`, `servidor`, `comum`, `vila-mato`, `jogador` e `lobby`: 40 passando;
  - no navegador, `paginas.spec.js`, `vila-ginasio.spec.js` e `vila-layout.spec.js`: 34 passando;
  - a Vila aberta no Chromium mostra o terreno no lugar do prédio, sem erros na página.
