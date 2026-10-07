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
| `bd.js` + `migracoes/` | **Banco de dados** (SQLite pelo `node:sqlite`). `DB_PATH` diz onde fica (no Fly, `/data/galera.db` num volume: ver `DEPLOY-FLY.md`); sem ele, `dados/galera.db`; os testes usam `:memory:`. As migrações `migracoes/NNN-nome.sql` rodam em ordem, uma vez só. Guarda as carreiras (`criarCarreira`, `carreiraPorToken`, `recuperarCarreira`, `salvarCarreira`; só o hash do token e do código de recuperação vai para o banco) e as cartas que já saíram nos jogos de baralho (`cartasSaidas`, `marcarCarta`, `zerarCartas`). |
| `carreira.js` + `public/carreira/` | **Carreira de Treinador, a temporada jogável (fase 3).** Canal `/carreira`: `criar`, `entrar` (token), `recuperar` (código), `escalacao`, `modo`, `jogar`, `decidir`, `novaTemporada`. O save inteiro fica em `carreiras.dados` (`bd.js`); a partida em andamento guarda a semente e as decisões, então recarregar volta no mesmo ponto. Página: `inicio.js` (conexão, escudos, começar), `telas.js` (sede, elenco e tática, tabela, calendário) e `partida.js` (narração ao vivo e as decisões). `temporada.js`: calendário, tabela e zonas. `base/brasileirao-2026.js`: a base das carreiras novas (Série A 2026), gerada por `ferramentas/base-brasileirao.js` (elencos da Wikipédia, notas estimadas na tabela `NOTAS` da ferramenta); `base/teste.js` continua para as carreiras antigas. `escudos.js`: os escudos em pixel-art a partir da receita `escudo` de cada clube. |
| `public/carreira/motor.js` | **Carreira de Treinador:** o motor da partida (UMD, com semente). `simularPartida({ casa, fora, semente, modo, controla, decisoes })`: modo 1 simulada, 2 com paradas táticas, 3 também com os lances decisivos; sem resposta em `decisoes[id]`, devolve `parado` e quem chama simula de novo. A calibragem fica em `AJUSTE`. Plano completo em `planos/carreira.md`. |
| `noite.js` + `public/noite.js` | **Noite da Galera.** Ver a seção própria abaixo. |
| `public/comum.js` | `window.Comum`. Ver a lista de funções logo abaixo. |
| `public/icones.js` | `window.Icones`: os ícones SVG do site (Leilão e Banco), no lugar dos emojis. `ic(nome)`, `iconizar(html)`, `peao(emoji)` (o símbolo de cada peão do Banco) e `observar(raiz)`, que troca sozinho por ícone todo emoji que aparecer na página. |
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
| Palavra Proibida (Tabu) | `proibida.js` (um monte só para o servidor; as cartas que saíram ficam no banco e só voltam depois que todas saírem) | `index.html`, `cartas.js` (200) + `cartas-mais.js` (2026 cartas, uma por linha "palavra\|5 proibidas") |
| Sinuca | `sinuca.js` | `fisica.js`, `mesa.js`, `mira.js`, `desenho.js`, `extras.js`, `sala.js` |
| Futebol de Botão | `botao.js` | mesma organização da Sinuca |
| Corrida (kart 3D) | `corrida.js` | `pistas.js` (pistas e carros), `pista.js`, `carros.js` (os karts), `cena.js`, `fisica.js`, `controles.js`, `rede.js`, `menus.js`, `hud.js`, `fantasma.js`, `estado.js`, `sons.js`, `jogo.js` |
| Batalha (balões de kart) | `batalha.js` | `index.html`, `jogo.js`, `regras.js` (arenas, física, itens, robôs) |
| Ginásio (Galeramon/Pokémon em tempo real) | `ginasio.js` | `regras.js` (motor), `gif.js`, `estilo.css`, `sala.js`, `desenho.js`, `animacao.js`, `golpes.js`, `controles.js`, `rede.js`, `sons.js`, `hud.js` |
| Tiro (FPS) | `tiro.js` | `arena.js`, `bonecos.js`, `bots.js`, `cena.js`, `controles.js`, `efeitos.js`, `estado.js`, `hud.js`, `menus.js`, `rede.js`, `sons.js`, `jogo.js` |
| Pelada (futsal 3D) e Rocket (futebol de carro) | `pelada.js` (+ `peladaBots.js`) | ver logo abaixo |
| Tênis | `tenis.js` | `index.html`, `jogo.js`, `regras.js` (golpes, robôs; `ARMADO_MAX` = espera do golpe) |
| Pingue-Pongue | `pingpong.js` | `index.html`, `jogo.js`, `regras.js` (voo com efeito, juiz, placar, robô) |
| Vila (o mapa) + Galeramon + estádios | `vila.js` (+ `galeramon.js`) | `public/index.html` (inline), `public/vila/estadios.js` e `public/galeramon/` |

**Ginásio:**
- `/ginasio/` abre a sala e a arena 2D de pixel-art. O prédio fica na Vila Esportiva, ao lado do Pingue-Pongue, abaixo do Tênis: `ginasio: true` desenha o telhado arredondado com Pokébola.
- Na Vila, clicar no amigo ou usar Batalha permite escolher turnos ou Ginásio. O convite `jogo: "ginasio"` reutiliza aceite/recusa; `vila.js` chama `ginasio.criarDesafio` só depois do aceite, reserva os dois lados de uma sala 1x1 sem robôs e envia `irGinasio` com credenciais privadas a cada participante.
- O navegador guarda essas credenciais em `ginasio:<código>` e abre `?sala=&entrar=1`; os tokens não vão no endereço ou no estado público. Voltar à Vila deixa o jogador na porta do Ginásio. As batalhas por turnos continuam no canal `/vila`.
- Os scripts dividem as variáveis globais, nesta ordem: `regras`, `gif`, `sala`, `desenho`, `animacao`, `golpes`, `controles`, `rede`, `sons`, `hud`.
- `sala.js` reaproveita `galeramon_time` e `pokemon_time`, monta o seletor de criaturas e guarda o token da sala.
- `desenho.js` desenha a quadra, a câmera e a ordem das coisas; `controles.js` usa teclado, mouse e `Toque.setup`.
- **Os bichos se mexendo (`animacao.js`):** os Pokémon tocam o GIF animado do Black/White (`PokeDex.spriteAnimado`, lido por `gif.js`, sem dependência), e os Galeramon, os quadros de `GaleramonSprite.quadros` (respirar, chamas, asas, piscar). `desenharBicho` monta o jeito de cada momento (andar, virar, antecipação do golpe, apanhar, esquiva, investida, giro, voo, buraco, mergulho, troca, desmaio) a partir dos eventos (`animarEvento`); as partículas ficam numa lista fixa (`PARTICULAS`).
- **Os golpes por tipo (`golpes.js`):** `desenharProjetil` (um desenho animado por família de tipo), `desenharCorte`, `estouro` e o golpe de área caindo.
- **Golpes que viram movimento** (`SUMIR` e `GIROS` em `regras.js`): Fly/Bounce, Dig/Escavar, Mergulho e Shadow Force deixam o bicho `oculto` (ninguém acerta) e caem no ponto mirado com uma área de aviso; os giros viram investida.
- `rede.js` manda comandos a 30/s, prevê só o movimento com `Ginasio.preverMovimento`, reconcilia pela sequência confirmada e interpola os outros com 100 ms de atraso. Vida, acertos, recargas e trocas continuam no servidor.
- `hud.js` atualiza a vida, os golpes, as recargas, as reservas e o resultado sem remontar a cada pacote. `#debug` expõe `window.__ginasio`.

**Banco:**
- O visual fica em `estilo.css` (a mesa à noite, as casas escuras que brilham na cor do dono, o dourado do dinheiro).
- A tela do jogo tem três colunas: as contas (o cartão do jogador e `#plates`, a conta de cada um), o tabuleiro (com o
  cofre do banco, `#cofre`, no miolo) e o momento da jogada com o extrato ao vivo (`#extrato`).
- Os peões são guardados pelo emoji e desenhados em 3D por `peoes.js` (`Peoes.svg(cor, emoji, { tam })`), que carrega
  antes dos 5 scripts.
- A página chama `Icones.observar`, então qualquer emoji que os scripts ou o servidor mandarem vira ícone.
- A mesa de todos e o histórico ficam na gaveta (`#gaveta`).

**Banco: os 5 scripts, nesta ordem:**
1. `sala.js`: entrar/criar e a sala de espera;
2. `mesa.js`: o tabuleiro, os peões andando, os dados e o "você caiu em";
3. `painel.js`: o painel de ação, as contas, as moedas voando (`chuvaMoedas`), o extrato e a cena do aluguel;
4. `efeitos.js`: os sons, as reações, a escritura voando e o cartão da casa (`mostrarCasa`);
5. `telas.js`: a carteira, os imóveis (por bairro), as cenas do meio (`spotPush`), o leilão e os modais (`propModal`,
   `deedHTML`, `deedCompacto`).

**Leilão:** o visual fica em `estilo.css` (noite de estádio, verde-limão, cartas estilo FUT). Os scripts rodam em ordem e
**dividem as variáveis globais**:
1. `/icones.js` (comum, na raiz de `public/`): os ícones SVG, a troca dos emojis da narração por ícones e o ícone de cada tema;
2. `inicio.js`: a tela inicial, os temas e criar/entrar;
3. `sala.js`: os botões da sala, o resultado revelado e o campinho (deitado) com a troca de posições;
4. `pratos.js`: o prato, a votação dos pratos, a chegada do `state` e as contas das regras (`capById`, `maxBidFor`...);
5. `rostos.js`: o rosto de cada jogador em pixel-art 16x16 (tabela de pele/cabelo/barba) com a camisa mais marcante: clube (`KITS`, `PRIORIDADE`, `EMBLEMA`) ou seleção;
   para os replays, também a cabeça sozinha (`cabeca`), a cor do cabelo (`cabelo`) e o uniforme inteiro (`uniformeDe`:
   calção, meião e chuteira);
6. `lances.js`, `lances-gols.js` e `lances-comemoracoes.js`: os replays dos gols do campeonato ao vivo em pixel-art, um
   telão por gol. Tudo sorteado pelo gol: todos veem o mesmo.
   - `lances.js` é o motor: o boneco (cabeça e uniforme de `rostos.js`, com enfeites como sem camisa e de costas com o
     número), o cenário, o goleiro, a rede, o close e o telão. As peças para os outros dois ficam em `Lances.kit`;
   - `lances-gols.js`: os 20 tipos de gol (`Lances.GOLS`), cada um com o seu roteiro; os preferidos dos craques somam no
     sorteio (`Lances.FINALIZACAO`);
   - `lances-comemoracoes.js`: as 45 comemorações (`Lances.COMEMORA`); a própria de cada craque (`Lances.ASSINATURA`) sai
     às vezes;
7. `carta.js`: a carta de jogador (`cartaHTML`, `versoHTML`, bronze/prata/ouro/ícone) e as faíscas;
8. `palco.js`: o `render()`. O placar da galera, a cena do meio (só remonta quando muda de momento: `cenaChave`), o
   painel do lance, o elenco ao lado (um time por vez: `verTime`), a barra do organizador e a gaveta;
9. `roleta.js`: o sorteio (a fita de cartas que para no sorteado);
10. `ritmo.js`, `aovivo.js` (o campeonato ao vivo: a carta de cada gol, lado a lado quando os gols saem juntos, e os
    replays, um embaixo do outro, o mais novo em cima) e `elenco.js` (o voo até o time, os balõezinhos, o nome e as trocas).

**Leilão: pênaltis da galera.** Quem bate escolhe um dos 6 cantos e o outro dono escolhe o pulo do goleiro (opção
`penaltis` da simulação, ligada por padrão).
- `ritmo.js` tem os cantos (`ZONAS`) e os tempos do duelo (`DUELO`).
- O `simulador.js` simula por partes com uma semente (`seed`) e para no primeiro pênalti sem decisão (`completo:
  false`). O servidor guarda as decisões em `r.decisoes` e simula de novo: o que já saiu continua igual.
- No servidor, o duelo aberto fica em `r.duelo`, e o relógio da parte para em `r.pausas` (`abreDuelo`, `fechaDuelo`,
  evento `penalti`). No navegador, o duelo é o `renderDuelo()` do `aovivo.js`.

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
    `a` asfalto, `f` flores, `t` árvore, `m` capacho da porta; fora da vila, `e` rodovia (só carro), `E`
    estacionamento, `c` calçada, `w` água, `s` areia, `j` jardim da orla;
  - `TREES`, `LAMPS`, `BENCHES` e `FOUNTAIN` são a decoração.
- `drawBuilding` desenha os prédios, e cada jogo tem o seu `if (g.<sinal>)` para o telhado.
- **Tamanho do mapa:** `MW` x `MH` (320x260). A vila (40x44) fica no meio, deslocada por `OX`, `OY` (140, 100): as
  coordenadas da vila em `GAMES`, `LAMPS`... continuam escritas de 0 a 39 / 0 a 43 e são deslocadas no carregamento.
  O `vila.js` repete `MW`, `MH`, `OX`, `OY`, a lista `GAMES` e as zonas dos estádios: precisam bater.
- **O mundo em volta (`montaMundo`):** `rodovia()` (trechos retos de duas faixas; passa por cima da água como ponte),
  `lote()` (estacionamento, com carros parados), `PREDIOS` (a cidade de enfeite), o Pinheiros, o Tietê, a Serra do Mar e
  Santos (praia). Fora da vila o pedestre não passa (`solid`): só de carro (`carOk`), que se pega num estacionamento.
- **O mapa é desenhado em pedaços** de 32x32 casas (`pedaco(cx, cy)`), só os que aparecem, e a luz da noite é do tamanho
  da tela. Coisa nova no mapa precisa ser desenhada dentro de `pedaco`.
- **Estádios (`public/vila/estadios.js`):** `LISTA` (onde fica cada um, a praça, o estacionamento e o portão), `fachada`
  (o lado de fora) e `interior` (o lado de dentro: gramado, arquibancada com torcida, túnel, gols). Na página, `INT` é o
  estádio em que a pessoa está, e a bola (`bola`, `chuta`, `gol`) só existe lá dentro.
- **Quem aparece para quem:** cada pessoa manda `z` (a zona: `""` na rua ou o id do estádio) e `car`; só se vê quem
  está na mesma zona.

## Testes

- **`npm test`:** `node --test` em `tests/*.test.js`.
  - Os testes de servidor sobem o `server.js` de verdade e jogam com clientes Socket.io (ajudas em
    `tests/ajuda.js`: `subirServidor`, `conectar`, `pedir`, `esperarEstado`).
- **Ginásio:** `tests/ginasio.test.js` cobre o motor; `tests/ginasio-servidor.test.js` cobre salas, comandos,
  reconexão, convites da Vila (Galeramon/Pokémon, tokens privados, recusa, saída e regressão dos turnos) e uma partida inteira com clientes Socket.io e robôs, incluindo o placar da Noite.
  `tests/e2e/ginasio.spec.js` cobre controles reais, seleção, sprites, toque com dois dedos, 2x2, espectador,
  reconexão, resultado e revanche. `tests/e2e/vila-ginasio.spec.js` cobre caminhada, porta, retorno, desafio pelo sprite/Batalha e aceite no toque; `#debug` expõe `window.__vila` para inspecionar mapa/câmera. `GINASIO_FOTOS=planos/imagens` salva capturas opcionais.
- **`tests/salas.test.js`:** compara a forma do estado de cada jogo com `tests/salas-esperado.json`.
  - Se mudar o estado de propósito, regrave com `GRAVAR=1 node --test tests/salas.test.js` e confira que no diff só
    entrou o que devia.
  - Jogo novo entra na lista `CANAIS`.
- **`npm run test:e2e`:** Playwright em `tests/e2e`, usando o Chrome do sistema na tela de 480x270.
  - As páginas abrem com `#debug` e expõem `window.__<jogo>` (por exemplo `__pelada`, `__tenis`, `__rumi`,
    `__pingpong`) para o teste mexer no jogo.
  - Jogo novo entra na lista de `tests/e2e/paginas.spec.js`.
- **Carreira:** `tests/bd.test.js` (banco em memória) e `tests/carreira-motor.test.js` (10 mil jogos conferem gols, mando e força; se mexer no `AJUSTE` do motor, esses testes dizem se o futebol continua com cara de futebol).
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
