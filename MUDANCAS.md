# Mudanças — Pelada: controles, passe, skins e condução (parte 1)

## Feito neste PR (Pelada)

- **Remapear controles (teclado e mouse):** novo `public/pelada/teclas.js`. No menu de pausa e na sala tem
  "⌨️ Remapear teclado e mouse": clique na ação e aperte a tecla, clique do mouse ou gire a rodinha. Cada ação aceita
  até 2 teclas, `Backspace` apaga, `Esc` cancela, "Voltar ao padrão" restaura. Fica salvo no navegador
  (`pelada:teclas`). As dicas na tela mostram as teclas escolhidas. Controle (gamepad) e toque não mudam.
- **Modo Strikers removido** (`strikers.js` apagado; itens, cerca elétrica, drible com giro e Super Chute saíram do
  navegador e do servidor). Dele ficou o **passe planejado**: a **bola enfiada** (Y no controle, `L`/botão do meio no
  teclado) agora é da Pelada.
- **Troca de jogador agora é opcional e vem desligada:** jogador fixo, como no Pro Clubs. Liga em "Contra bots: seu
  jogador" (tela inicial) ou em "Troca de jogador" na sala (amistoso com bots). Desligada, não tem mais o
  "teletransporte" da skin.
- **Pedir a bola:** apertar o passe **sem a bola** pede a bola. O bot do seu time que está com ela toca para você
  (offline e no amistoso online). Aparece um 🙋 em cima de quem pediu (os outros jogadores também veem).
- **Passe mais fácil (estilo FIFA):** um **toque** no passe faz um passe rasteiro assistido (cone de 45° para cada
  lado, procura até 75°, metade do erro, e a bola "trava" no pé de quem recebe). **Segurar 1 segundo** faz o **passe
  longo** pelo alto (a barra mostra quando virou longo). Segurar o passe não deixa mais o jogador lento.
- **Placas dos gols:** saíram "SEU GOL" / "ATAQUE AQUI" e a seta de ataque; a placa e a faixa do gol mostram só a cor
  (e o desenho) da camisa do time.
- **11 skins novas:** Homem-Aranha, Naruto, Tartaruga Ninja, Ghostface, Satoru Gojo, Woody, Pikachu, Ben 10, Shrek,
  CJ e Steve (bonecos de caixinhas, com rosto desenhado e acessórios).
- **Marcador de time em todo mundo:** anel colorido no chão + losango em cima da cabeça na cor do time; os
  personagens também têm uma braçadeira com a cor do time.
- **Condução com toques:** correndo, o jogador empurra a bola um pouco para a frente a cada toque (~1 m correndo,
  ~1,6 m no pique), com uma batidinha da perna, e continua com o controle (a bola acompanha as curvas). Parado ou
  andando, a bola fica colada. O chute apertado com a bola um pouco à frente espera até meio segundo e sai quando o
  jogador alcança a bola.
- **Aceleração e freada suaves** para o jogador e os bots (`movePlayer` com `suave: true`).

### Novos controles (padrão)
| Ação | Teclado/mouse | Controle |
|---|---|---|
| Chute | K / clique | B |
| Passe (toque) · longo (segure 1 s) · pedir a bola (sem a bola) | J / botão direito | A |
| Bola enfiada | L / botão do meio | Y |
| Cavadinha | Z | LB |
| Cruzamento | U | X (sem a bola: carrinho) |
| Carrinho | rodinha / X | X sem a bola |
| Troca de jogador (se ligada) | T | ↑ |

### Arquivos
- `public/pelada/campo.js` — sem Strikers/itens; `acelSuave`; condução com toques (`conduz`); passe assistido
  (`planejarPasse(..., { assist })`); 11 skins na lista.
- `public/pelada/teclas.js` (novo), `controles.js`, `jogo.js`, `bots.js`, `bola.js`, `rede.js`, `hud.js`, `menus.js`,
  `arenas.js`, `bonecos.js`, `estado.js`, `index.html`; `public/pelada/strikers.js` (apagado).
- Servidor: `pelada.js` (sem Strikers, `config.troca`, evento `pedir`, passes curto/longo/enfiada para todos, folga
  maior para a bola conduzida com toques) e `peladaBots.js` (bot toca para quem pediu, troca só se ligada, passe
  planejado, aceleração suave).
- Testes: `tests/campo.test.js`, `tests/servidor.test.js`, `tests/e2e/pelada.spec.js`, `tests/e2e/pelada-modos.spec.js`.

### Testes
- `npm test`: 27 passaram.
- `npx playwright test tests/e2e/pelada.spec.js tests/e2e/pelada-modos.spec.js tests/e2e/paginas.spec.js`: 25 passaram.

## Fica para o próximo PR
- **Batalha/Corrida:** novas arenas e pistas inspiradas nos traçados do Mario Kart 64 (Big Donut, Block Fort,
  Double Deck, Skyscraper; Luigi Raceway, Rainbow Road, Sherbet Land). Já extraí a planta de cima de cada modelo como
  referência. Recomendação: recriar os traçados no estilo do jogo, **sem** colocar os modelos/texturas da Nintendo no
  repositório (o site é público e são arquivos com direitos autorais).
- **Modo CS:** mais barreiras de cobertura no mapa.
- Atualizar README/PROJETO.md (ainda citam o Strikers).
