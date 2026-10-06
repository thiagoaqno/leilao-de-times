# Vila da Galera — mapa do projeto

Guia para achar as coisas rápido em updates futuros. É um mapa de onde fica cada coisa. A história do projeto e as
decisões dos primeiros dias estão em `PROJETO.md`, e o que mudou em cada PR fica em `MUDANCAS.md` (reescrito a cada PR).

## Visão geral

- Site de jogos para jogar com os amigos, tudo em português.
  - A página inicial (`/`) é a **Vila**: um mapinha pixel-art em que cada prédio leva a um jogo.
- **Servidor:** Node + Express 5 + Socket.io 4, em `server.js`.
  - Cada jogo é um módulo `<jogo>.js` na raiz, com o seu canal (namespace) `/<jogo>`.
  - `npm start` sobe em `localhost:3000`.
- **Navegador:** HTML/JS puro, sem build.
  - O 3D usa Three.js, pelo importmap `/vendor/three/three.module.js` e `/vendor/three-addons/` (GLTFLoader,
    BufferGeometryUtils...).
- **Regras compartilhadas:** as regras de cada jogo ficam num arquivo UMD (`public/<jogo>/regras.js`) usado pelos
  dois lados.
  - No servidor, com `require`; no navegador, como `window.<Nome>`.
  - O servidor é quem manda: o navegador só desenha e manda os comandos.
- Deploy: `DEPLOY-FLY.md`.

## Peças comuns (usadas por vários jogos)

| Arquivo | O que é |
| --- | --- |
| `salas.js` | Salas com código de 5 letras (o que todo jogo usa). Ver a lista de funções logo abaixo. |
| `noite.js` + `public/noite.js` | **Noite da Galera.** Ver a seção própria abaixo. |
| `public/comum.js` | `window.Comum`. Ver a lista de funções logo abaixo. |
| `public/toque.js` | Controles de toque no celular: `Toque.setup({ buttons, top, look, onStick })` e `Toque.show(bool)`. Os botões disparam teclas de mentira. |
| `public/semzoom.js` | Impede o zoom do toque duplo (vai no `<head>` de toda página). |
| `public/pelada/bonecos.js` | **Os bonecos e as skins** (Pelada, Tênis, Corrida, Batalha, Pingue-Pongue). Ver a lista de funções logo abaixo. |
| `public/pelada/campo.js` | Física/listas da Pelada, mas também a lista de **SKINS** e as camisas (**KITS**, `kitOf`, `kitColor`), usadas fora da Pelada. Precisa estar carregado (`window.Campo`) antes dos bonecos. |
| `public/pelada/tex.js` | `canvasTex` (textura desenhada em canvas), `M(cor)` (material) e `liberar(obj)` (solta a memória). |
| `public/kart3d.js` | O kart com o piloto sentado (skin), usado na Corrida e na Batalha: `montarKart`, `animarKart` e `soltarKart`. |
| `public/ragdoll.js` | Boneco de pano (Tiro e Pelada). |

**`salas.js`:**
- `rid` e `novoCodigo`;
- `limparNome` (corta em 8 letras), `ok` e `falha` (respostas das ações);
- `contexto(socket, rooms)`, `ligarSocket` e `buscarSala`;
- `quemVolta` (reconexão por token) e `nomeEmUso`;
- `limparSalasParadas` e `medirPing`.

**`public/comum.js`:**
- `$` e `h` (escapa HTML);
- `store` (localStorage em JSON);
- `criarToast` e `criarAct(socket, toast)`;
- `relogio()`, o relógio do servidor: `agora`, `doEstado`, `sincronizar`;
- `confetti`, `flutuar` e `iconeSom`.

**`public/pelada/bonecos.js`:**
- `makePlayer(kit, num, nome, { skin })`, `animate` e `descartarJogador`;
- `SKINS_CONFIG`, com o visual de cada skin;
- `configurarBonecos({ scene, limites })`;
- `fundirPecas` e `sombraSoGrande` (otimização).

Chaves salvas no navegador que vários jogos usam:
- `galera:name` (o nome da pessoa);
- `galera:skin` (a skin; a Pelada ainda usa `pelada:skin`);
- `<jogo>:<CÓDIGO>` (o token para voltar à sala).

## Os jogos: onde fica cada um

Servidor na raiz (`<jogo>.js`); página em `public/<jogo>/index.html`.

| Jogo | Servidor | Arquivos do navegador (`public/<jogo>/`) |
| --- | --- | --- |
| Leilão (o primeiro jogo, montar times) | dentro de `server.js` (+ `simulador.js`, `juri.js`) | ver logo abaixo (+ `public/presets.js`, `prompts.js`, `ratings.js`, `escalacao.js`, `quimica.js`, `card.js`, `cozinha.js`, `bordoes.js`) |
| Banco (Banco Imobiliário) | `banco.js` | `tabuleiro.js` (as casas e regras), e 5 scripts que rodam em ordem e **dividem as variáveis globais**. Ver a lista logo abaixo. |
| Uno | `uno.js` | `index.html` (tudo inline), `regras.js` |
| Truco | `truco.js` | `index.html` (tudo inline), `regras.js` |
| Dominó | `domino.js` | `index.html`, `regras.js` |
| Ludo | `ludo.js` | `index.html`, `regras.js` |
| Rumi (Rummikub) | `rumi.js` | `index.html`, `jogo.js`, `regras.js` |
| Palavra Proibida (Tabu) | `proibida.js` | `index.html`, `cartas.js` (200) + `cartas-mais.js` (2026 cartas, uma por linha "palavra\|5 proibidas") |
| Sinuca | `sinuca.js` | `fisica.js`, `mesa.js`, `mira.js`, `desenho.js`, `extras.js`, `sala.js` |
| Futebol de Botão | `botao.js` | mesma organização da Sinuca |
| Corrida (kart 3D) | `corrida.js` | `pistas.js` (pistas e carros), `pista.js`, `carros.js` (os karts), `cena.js`, `fisica.js`, `controles.js`, `rede.js`, `menus.js`, `hud.js`, `fantasma.js`, `estado.js`, `sons.js`, `jogo.js` |
| Batalha (balões de kart) | `batalha.js` | `index.html`, `jogo.js`, `regras.js` (arenas, física, itens, robôs) |
| Tiro (FPS) | `tiro.js` | `arena.js`, `bonecos.js`, `bots.js`, `cena.js`, `controles.js`, `efeitos.js`, `estado.js`, `hud.js`, `menus.js`, `rede.js`, `sons.js`, `jogo.js` |
| Pelada (futsal 3D) e Rocket (futebol de carro) | `pelada.js` (+ `peladaBots.js`) | ver logo abaixo |
| Tênis | `tenis.js` | `index.html`, `jogo.js`, `regras.js` (golpes, robôs; `ARMADO_MAX` = espera do golpe) |
| Pingue-Pongue | `pingpong.js` | `index.html`, `jogo.js`, `regras.js` (voo com efeito, juiz, placar, robô) |
| Vila (o mapa) + Galeramon | `vila.js` (+ `galeramon.js`) | `public/index.html` (tudo inline) e `public/galeramon/` |

**Banco: os 5 scripts, nesta ordem:**
1. `sala.js`: entrar/criar e a sala de espera;
2. `mesa.js`: o tabuleiro, os peões andando, os dados e o "você caiu em";
3. `painel.js`: o painel de ação, os jogadores e o dinheiro voando;
4. `efeitos.js`: os sons, as reações, a escritura voando e o cartão da casa (`mostrarCasa`);
5. `telas.js`: a carteira, os imóveis, o leilão e os modais (`propModal`, `deedHTML`).

**Leilão:** o visual fica em `estilo.css` (noite de estádio, verde-limão, cartas estilo FUT). Os scripts rodam em ordem e
**dividem as variáveis globais**:
1. `icones.js`: os ícones SVG (`Icones.ic`), a troca dos emojis da narração por ícones (`iconizar`) e o ícone de cada tema;
2. `inicio.js`: a tela inicial, os temas e criar/entrar;
3. `sala.js`: os botões da sala, o resultado revelado e o campinho (deitado) com a troca de posições;
4. `pratos.js`: o prato, a votação dos pratos, a chegada do `state` e as contas das regras (`capById`, `maxBidFor`...);
5. `rostos.js`: o rosto de cada jogador em pixel-art 16x16 (tabela de pele/cabelo/barba) com a camisa mais marcante: clube (`KITS`, `PRIORIDADE`, `EMBLEMA`) ou seleção;
6. `carta.js`: a carta de jogador (`cartaHTML`, `versoHTML`, bronze/prata/ouro/ícone) e as faíscas;
7. `palco.js`: o `render()`. O placar da galera, a cena do meio (só remonta quando muda de momento: `cenaChave`), o
   painel do lance, o elenco ao lado (um time por vez: `verTime`), a barra do organizador e a gaveta;
8. `roleta.js`: o sorteio (a fita de cartas que para no sorteado);
9. `ritmo.js`, `aovivo.js` (o campeonato ao vivo) e `elenco.js` (o voo até o time, os balõezinhos, o nome e as trocas).

**Pelada e Rocket:**
- A mesma página `public/pelada/index.html` serve os dois. `/rocket/` usa o modo carros.
- Arquivos:
  - `estado.js`, o estado comum: `E`, `G`, `FL`, socket;
  - `jogo.js`, o laço e o meu jogador;
  - `rede.js`, os pacotes;
  - `cena.js`, o renderer e os gráficos automáticos;
  - `arenas.js`, as quadras;
  - `bola.js`, a previsão da bola;
  - `controles.js` e `teclas.js`;
  - `bots.js`, o treino;
  - `hud.js`, `menus.js` e `sons.js`.

Para achar algo dentro de um jogo:
- **Ações do servidor:** procure `socket.on("act"` no servidor do jogo. Cada `type` é uma ação.
- **Estado mandado para o navegador:** procure `publicState`.
- **Efeitos visuais:** o servidor guarda uma lista `room.fx` (ou manda eventos `ev`), e o navegador toca os novos
  em `runFx()`.

## Noite da Galera (liga os jogos)

- **Servidor (`noite.js`):**
  - junta as salas numa "noite" (a primeira pessoa cria, quem entra na mesma sala cai nela);
  - cuida do "chamar" para outro jogo: manda o `destino` para todo mundo;
  - guarda o placar (vitórias, derrotas e títulos).
- **Fim de partida:** todo jogo chama `noite.vitoria("<jogo>", room.code, [nomes que ganharam], [nomes que
  perderam])` quando a partida acaba. Jogo novo precisa fazer isso também, e entrar na lista `JOGOS` do `noite.js`.
- **Navegador (`public/noite.js`):**
  - vai em toda página de jogo, logo depois do `socket.io.js`;
  - mostra a aba 🌙 na beirada esquerda;
  - descobre a sala pelo endereço: `?sala=` ou, nos jogos da lista `MESA`, `?mesa=`;
  - `?criar=1` / `?entrar=1` fazem a página criar/entrar sozinha, com os campos `hName`, `hCode`, `btnCreate` e
    `btnJoin`; o Leilão usa outros campos (`CAMPOS`).

## Vila (o mapa)

- **Tudo em `public/index.html`:**
  - `GAMES` lista os prédios: `x`, `y`, `w`, `h`, `doors`, `bairro`, cores do telhado e um sinal para o desenho do
    telhado (`casino`, `uno`, `tenis`...);
  - `BAIRROS` traz o nome de cada bairro e a posição da placa azul de rua;
  - o chão é feito de tipos de casa: `g` grama, `r` paralelepípedo, `p` pedra portuguesa, `q` pista de atletismo,
    `a` asfalto, `f` flores, `t` árvore, `m` capacho da porta;
  - `TREES`, `LAMPS`, `BENCHES` e `FOUNTAIN` são a decoração.
- `drawBuilding` desenha os prédios, e cada jogo tem o seu `if (g.<sinal>)` para o telhado.
- **Tamanho do mapa:** `MW` x `MH` (40x44). O `vila.js` repete esse tamanho e a lista `GAMES`: precisam bater.

## Testes

- **`npm test`:** `node --test` em `tests/*.test.js`.
  - Os testes de servidor sobem o `server.js` de verdade e jogam com clientes Socket.io (ajudas em
    `tests/ajuda.js`: `subirServidor`, `conectar`, `pedir`, `esperarEstado`).
- **`tests/salas.test.js`:** compara a forma do estado de cada jogo com `tests/salas-esperado.json`.
  - Se mudar o estado de propósito, regrave com `GRAVAR=1 node --test tests/salas.test.js` e confira que no diff só
    entrou o que devia.
  - Jogo novo entra na lista `CANAIS`.
- **`npm run test:e2e`:** Playwright em `tests/e2e`, usando o Chrome do sistema na tela de 480x270.
  - As páginas abrem com `#debug` e expõem `window.__<jogo>` (por exemplo `__pelada`, `__tenis`, `__rumi`,
    `__pingpong`) para o teste mexer no jogo.
  - Jogo novo entra na lista de `tests/e2e/paginas.spec.js`.
- **Testes que às vezes falham por tempo:** um do Dominó e um do relógio. Repetir antes de investigar.

## Jeito de trabalhar neste projeto

- **Escrita:** textos da tela, comentários e nomes de variáveis em português, no mesmo tom do resto do arquivo.
- **Finais de linha:** alguns arquivos usam CRLF e outros LF. Ao editar por script, mantenha o que o arquivo já usa,
  senão o diff vira o arquivo inteiro.
- **Branch e PR:** cada pedido vira uma branch nova a partir de `origin/main` e um PR para `main`. Nada de PR em cima
  de PR, que já deu problema. O `MUDANCAS.md` é reescrito com o resumo do PR, e o corpo do PR é esse mesmo texto.
- **Visual:** cada jogo tem a cara do objeto real (feltro, carta de baralho, quadra...). No topo, só o "← Vila", sem
  abas. Personagens usam os bonecos/skins da Pelada, não pacotes de modelos de fora.
- **Regras:** o jogo de mesa real; nada de "todo mundo aperta Pronto". Melhor pouca coisa bem feita do que muita
  coisa rasa: a Festa da Galera (15 minijogos de uma vez) foi rejeitada inteira.
- **Animações:**
  - quem pede "menos movimento" no sistema fica sem elas (`prefers-reduced-motion`);
  - quando a tela é redesenhada a cada estado do servidor, use um relógio único com `animation-delay` negativo para
    a animação não recomeçar (exemplo: a distribuição no Truco).
- **Socket:** se um módulo usa `await` no topo (carregar algo antes de começar), o `connect` do socket pode ter
  acontecido antes do `socket.on("connect")`. Confira `socket.connected`.
- **Conferir antes de terminar:**
  - mudança visível vai para o navegador do app e ganha uma foto;
  - mudança de servidor exige reiniciar o servidor de teste;
  - o painel do app pausa animações quando está escondido, e lá não dá para prender o mouse (jogos de mira não dão
    para jogar ali).
