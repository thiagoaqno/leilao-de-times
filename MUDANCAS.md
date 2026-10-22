# Testes que falhavam por acaso ou estavam velhos

Mais um passo da refatoração. Nada muda no jogo: só os testes.

## O que muda

- **Ginásio, "dois clientes e robôs jogam até o fim":** a partida em tempo real exigia que os clientes vencessem os
  robôs da sala. No GitHub, com todos os testes rodando juntos, os robôs (no nível normal) às vezes ganhavam, e o teste
  falhava por acaso: aconteceu no PR #298. Agora os robôs da sala são os fáceis (`robo: "facil"`). Com 6 cópias do teste
  rodando ao mesmo tempo, a versão antiga falhou 1 vez em 6. A nova passou 6 de 6, e depois 8 de 8.
- **Drag no navegador (`corrida-drag.spec.js`):** dois testes falhavam também na `main`:
  - "aquece os pneus": esperava 3 pistas, e o Drag tem 4 desde a Serra. Ele também abria a página sem o `#debug`, e o
    `largar` só trocava o `#` do endereço, o que não recarrega a página: o `window.__drag` nunca existia;
  - "segurar W explode o motor": o motor estoura mesmo, mas o navegador dos testes roda o jogo a cerca de um décimo da
    velocidade real (o passo de cada quadro tem limite). O motor leva uns 93 s para estourar, e o teste esperava 90 s.
    O arquivo ganhou mais tempo (`test.describe.configure`), e as esperas pela largada também, porque a contagem anda
    devagar do mesmo jeito.

## Testes

- Ginásio: 4 vezes sozinho, 6 e depois 8 cópias ao mesmo tempo, todas passando.
- `corrida-drag.spec.js`: os 4 passando (antes, 2 falhavam na `main`).
