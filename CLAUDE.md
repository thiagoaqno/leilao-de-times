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
| `bd.js` + `migracoes/` | **Banco de dados** (SQLite pelo `node:sqlite`). `DB_PATH` diz onde fica (no Fly, `/data/galera.db` num volume: ver `DEPLOY-FLY.md`); sem ele, `dados/galera.db`; os testes usam `:memory:`. As migrações `migracoes/NNN-nome.sql` rodam em ordem, uma vez só. Guarda as carreiras (`criarCarreira`, `carreiraPorToken`, `recuperarCarreira`, `salvarCarreira`, `novoCodigoDe` (outro código: o antigo para de valer) e `excluirCarreira`; só o hash do token e do código de recuperação vai para o banco) e as cartas que já saíram nos jogos de baralho (`cartasSaidas`, `marcarCarta`, `zerarCartas`). |
| `carreira.js` + `carreira-eventos.js` + `public/carreira/` | **Carreira de Treinador.** Canal `/carreira`: `criar`, `entrar` (token), `recuperar` (código), `escalacao` (com `fixo`: cada titular no seu lugar), `modo`, `jogar`, `decidir`, `proposta`, `vender` (lista ou na hora), `evento`, `novaTemporada`, `codigo` (o código de recuperação de novo; o navegador também guarda o código em `carreira:codigo`) e `excluir`. **Várias temporadas:** `save.temporadasMax` (de 1 a 5, escolhido ao assinar); no fim de cada uma, `registrarTemporada` guarda o resumo em `save.historico` (títulos, artilheiro do time, melhor negócio, força); `novaTemporada` evolui o elenco, aposenta e sobe jovens (`virarTemporada`) e monta as copas com a tabela do ano (`save.classificados`). `public/carreira/evolucao.js` (servidor e navegador): idade (`idadeNa`), nota de cada jogo (`notasDaPartida`, guardada em `save.desempenho`), evolução de -2 a +3 (`evolucaoDe`, somada em `bonusNota` e em `save.evolucao`), aposentadoria (dono `aposentado`) e jovens da base (`criarJovem`, em `save.jovens`; o navegador recebe os que precisa em `estado.jovens`). Os jogos sem você usam os elencos do começo da temporada (`basesDaTemporada`, de `save.donosInicio`). Carreiras novas usam `mundo-2026`: as seis ligas jogáveis rodam junto com Libertadores, Champions, Copa do Brasil, Sul-Americana, Super Mundial e Mundial (as três últimas entram só nas carreiras criadas depois: `save.formatoCopas === 2`, e na virada de temporada; `simularMundo({ copasNovas })`; a Copa do Brasil tem 20 clubes com fase preliminar e o campeão leva vaga na Libertadores; a Sul-Americana tem 16, com os terceiros dos grupos da Libertadores; o Super Mundial tem 16, em grupos e jogos únicos); `save.caixaIgual` (100 ou 300 mi) dá o mesmo caixa a todos os clubes no começo, e na sala em grupo é a opção `caixaIgual`; `temporada.js` gera grupos, mata-matas, pênaltis e semanas alternadas de liga/copa, e `save.competicoes` guarda tipo, fase, grupos, jogos e resultados. Jogos da CPU passam pelo motor e têm cache determinístico; o placar humano substitui a simulação e recalcula o futuro. Saves antigos seguem na base original, só com o Brasileirão. O save inteiro fica em `carreiras.dados` (`bd.js`): competições, resultados ao vivo, escalação, caixa, moral, `donos` (quem mudou de clube), lesões, suspensões, amarelos, caixa de entrada e a partida em andamento (semente e decisões). A tabela tem abas internas por competição e o calendário mistura liga e copa. `carreira-eventos.js`: os eventos entre as rodadas (propostas, mercado dos outros clubes, torcida) e o catálogo de `carreira-catalogo.js` com `carreira-catalogo-extra.js` (224 eventos com alvo, condição e escolhas). Página: `estilo.css` (o visual inteiro, escuro e minimalista: tokens em `:root`, a cor do clube só como `--acento`, as animações no fim; as cartas por nota: bronze até 79, prata 80-84, ouro 85-89 e elite 90+, em `faixa` de `inicio.js`) e `simbolos.js` (os ícones da carreira em SVG, um sprite que entra antes do de `/icones.js` e ganha dele). Scripts em ordem: `inicio.js` (conexão, base mundial, contas do elenco; `?sala=` liga o modo grupo), `grupo.js` (a sala da carreira em grupo), `escudos.js` (os escudos em SVG: `Escudos.svg(clube)`; os 20 do Brasileirão e os 96 das cinco ligas europeias têm desenho feito à mão em `ESPECIAIS` (as peças: formas, listras, faixas, cruz, chevron, losangos, símbolos como a torre, o morcego, o submarino e a flor-de-lis), os outros (Argentina e sul-americanos) saem da receita `clube.escudo` da base, e o escudo simples (fundo, borda e letras) ganha um de 7 jeitos e uma de 3 formas sorteados pelo id; cada `<svg>` traz ids próprios), `cartas.js` (a camisa vem de `camisas.js`: `Camisas.de(clube)`, [cor, detalhe, desenho, calção], porque o escudo não diz como é a camisa; o visitante troca de camisa se parecer com a do mandante, `uniformeDoClube(clube, contra)`), `telas.js` (a sede é o **hub** no estilo EA FC: no PC, três colunas, com o próximo jogo e o botão de jogar, os blocos da gestão (`.hub-tiles`), as notícias em destaque no meio (`feedNaSede`: manchete e grade) e a caixa de entrada ao lado; o acento segue a cor do campeonato, `body[data-liga]`; tabelas, calendário), `elenco.js`, `tela-mercado.js`, `feed.js`, `posjogo.js`, `painel.js` (o painel do time na sede, `#painelTime`: visão geral, setores, elenco e finanças, com as abas, os números contando e as cartas inclinando atrás do mouse), `disputa.js`, `estadios.js` e `partida.js`. `mercado.js` é compartilhado por servidor e navegador; `orcamentos.js` é a reserva para clubes sem orçamento gerado; `carreira-feed.js` também publica classificação, eliminação e título das copas. Na Vila, o prédio é a **Sede da Carreira**, na Praça. |
| `carreira-online.js` | **Carreira em grupo** (canal `/carreira-online`, PR 4 de `planos/carreira-online.md`): a sala com código (`create`/`join`/`act` como os outros jogos: `opcoes` do anfitrião, `clube` sem repetir, `comecar`), o token por pessoa (só o hash vai para o banco), a sala inteira na tabela `carreiras_online` (`bd.salvarSalaCarreira`, `salasCarreira`, `apagarSalaCarreira`; o servidor recarrega ao subir e apaga 48 h depois do último uso: `HORAS_PARADA`). Depois do começo, um mundo só (`carreira.js`, `grupo.novaCarreiraGrupo`): o que é de cada clube fica em `save.humanos[clube].estado` (`CAMPOS_CLUBE`) e as funções da carreira solo rodam na visão do clube (`vistaDe` / `guardarVista`). Cada um recebe o estado do seu clube no evento `carreira`. A página é a mesma da carreira solo: `?sala=`, `?grupo=1` ou `?criar=1` usam o canal novo (`public/carreira/grupo.js`: a sala de espera, `#grupo`). Rodada ao vivo (PR 5): `carreira-rodada.js` (relógio único, paradas com tempo, humano contra humano com `controla: 2` no motor, turbo; o anfitrião usa `act` `rodada` e `novaTemporada`; os humanos recebem o evento leve `rodada` e decidem com `decidir`). Quem saiu da sala (fora há mais de `CARREIRA_AUSENTE_MS`, 15 s) é "ausente": `Rd.tick(save, rod, agora, ausentes)` anda o jogo só de ausentes na hora e resolve as paradas deles com a decisão automática, sem segurar a rodada. O anfitrião usa `act` `dispensar` (`pessoa`, o id): na espera, a pessoa sai da sala; na carreira, o clube volta para o computador (`caixaIA`, o leilão dela é cancelado) e a pessoa vira espectador (evento `dispensado`); com a bola rolando, sai no fim da rodada (`limparDispensados`). A sede mostra o painel `#cartaoTurma` (`desenharTurma`, em `grupo.js`, com o código e o convite). **Entrar no meio:** com a carreira rolando, `join` aceita novos técnicos (sem clube); a tela mostra os clubes livres (`entradaNoMeio`, com o caixa de `publicState.caixas`) e `act` `clube` chama `entrarNaCarreira` (`carreira.js`): o clube do computador vira humano no ponto do mundo (`jogosJogados` = jogos da semana para trás, o caixa que ele tinha e o aporte da sala); só com a rodada e o leilão parados. **Regras de compra da turma** (`janelaDeCompras`, `erroDeRegra`, `regraDeCompras`; o estado de cada técnico guarda `comprasJanela` e `entrada`): começo da temporada, 1 jogador de 90+, ou 2 de até 87, ou 3 de até 83; meio da temporada (rodadas 17 a 21), 1 de até 88; quem entra com a janela fechada tem uma entrada (1 de até 88). Valem para abrir leilão, dar lance e para o martelo. **Posições, formações e estilos de jogo:** `public/carreira/taticas.js` (UMD, `window.Taticas`): as 13 formações em linhas de vagas finas (`FORMACOES`, `vagasDe`, `spots`: LE, LD, ZAG, VOL, MC, MEI, PE, PD, ATA; o grupo DEF/MID/ATT continua valendo para a força do time em `escalacao.js`, que o Leilão também usa e não muda), o encaixe de cada posição em cada vaga (`afinidade`: perde 3,5% por linha e 4% por lado trocado, mais 6% de lateral na zaga; goleiro fora do gol rende 50%) e os 7 estilos (`ESTILOS`: bônus que vale pelo encaixe do elenco, custo fixo e ajuste nas opções dos lances). O motor guarda `fino` em cada vaga do campo, `p.fit` e `p.efGrp` em cada titular (valem na força do time, nos pesos de quem chuta e passa, nas contas dos lances e em `doGrupo`); `tatica.estilo` vem do navegador (`limparEscalacao`) e `"auto"` é o computador escolhendo o que mais combina (`estiloIdeal`). As formações têm variações (`DEFS` em `taticas.js`: o nome é o esquema, ou o esquema mais uma letra; `ESQUEMAS`, `variacoesDe`, `ROTULO_FORMACAO`; `F9` é o falso 9) e a prancheta tem duas linhas (esquema e variação). O equilíbrio dos estilos foi medido em pontos por jogo contra o equilibrado do mesmo elenco: com o perfil ideal (atributo 88) ganham de +0,10 a +0,14, com elenco médio de +0,04 a +0,08 e sem o perfil perdem (a regressão está em `tests/carreira-taticas.test.js`). **Impulso da defesa arriscada:** nos lances `ataque_contra` cada opção traz `bonus` (impedimento 0,32, bloco 0,04, mano a mano 0,36, contra-ataque 0,63: quanto menor a chance de evitar o gol, maior o bônus); se a defesa dá certo, `time.impulso = { v, ate }` soma o bônus à chance do próximo lance do time (a conversão, ou as opções do lance decisivo, com `impulso` no pedido), por `AJUSTE.IMPULSO_MIN` minutos. **Escudos da API:** `tools/baixar-escudos.js` (TheSportsDB, chave gratuita de teste; roda uma vez, com espera entre os pedidos, e continua de onde parou) grava `public/carreira/escudos-api.js` (`window.ESCUDOS_API`: id do clube → url do escudo); `escudo()` (`inicio.js`) põe a imagem (`/small`) por cima do escudo desenhado, que aparece enquanto ela carrega e no lugar dela se o clube não está no arquivo ou a imagem não abre. **Pós-jogo:** `save.posJogo` leva `jogoId` e `rotulo` (competição e rodada ou fase); `mostrarPosJogo(forcar, esperado)` só abre o pós-jogo do jogo que acabou de terminar e espera o estado novo se o que tem é de outro. **Vaga aberta (expulsão ou lesão sem troca):** a parada tática manda `campo[i].id` nulo e a resposta pode trazer `ocupar: [["m", id, vaga]]` (alguém do campo muda de lugar) e `["e", id, vaga]` (um reserva entra, gasta uma substituição), na ordem em que o técnico fez (`aplicarTatica`, eventos `reposicao` e `entrada`). **Campinho por função:** `Taticas.spots` põe laterais e pontas na linha, o único volante (ou o único meia) no meio, o volante mais recuado, o meia mais avançado e o falso 9 atrás do centroavante. **Cansaço da temporada:** `t.energia` (mapa por jogador, de `save.energia`, por clube na sala: `CAMPOS_CLUBE`) é a energia com que cada um chega ao jogo; o motor devolve `r.energia` no fim e `aplicarFadiga` (`carreira.js`, chamada em `fecharJogoMundo`) grava `fim + RECUPERA` (16, entre 20 e 100); a virada de temporada zera; a energia tira de 0 a 3 pontos da nota (`Taticas.penalidadeEnergia`: 85% ou mais, 0; 70 a 84, -1; 50 a 69, -2; abaixo, -3; nos atributos dos lances também), aumenta a chance de lesão e no aviso de cansaço; `estado().energia` alimenta as barras da prancheta e do banco. Os MC contam nos dois lados dos lances (`doGrupo` com `MID`). `Taticas.efeitos` e `Motor.resumoDoEstilo` alimentam as contas na tela (`taticas-ui.js`: `chipsDeEfeito`, `dicaDaOpcao`, `estiloHTML`), na prancheta e na parada do jogo. **Disputa de pênaltis jogada:** `Motor.simularPartida({ desempate: { agregado } })` (`motor.js`, `disputaDePenaltis`): mata-mata empatado no agregado depois dos 90 min vai para 5 cobranças de cada lado e depois uma de cada vez; nos modos 2 e 3 quem tem humano pede o canto (ao bater) e o pulo (ao defender), como o pênalti do lance (`penalti_favor`/`penalti_contra` com `disputa`), sem humano os cantos saem das manias. Eventos `disputa_inicio`/`disputa`, resultado em `r.penaltis`; `agregadoDe` (`carreira.js`) conta as pernas anteriores e `fecharJogoMundo`/`fecharJogoGrupo` gravam os pênaltis em `resultadosFixos`, e o mundo recalculado segue com quem ganhou. **Notícias na sala:** `Feed.transferencia` (e `Feed.troca`) posta a mesma notícia no feed de todos os técnicos (`outrosHumanos` e `humanoDe`, propriedades não enumeráveis da visão em `vistaDe`). **Trocas entre técnicos (sala):** `erroDeTroca` e `executarTroca` (`carreira.js`), eventos `trocaPropor` e `trocaResponder` (`carreira-online.js`, `room.trocas`, `publicState.trocas`); sem limite de nota, janela ou cota de compras; tela `public/carreira/trocas.js`. **Temporadas anteriores:** `arquivarTemporada` guarda em `save.arquivo` (de todos; `estado().arquivo`) os campeões, tabelas, chaves, festa (com `elenco`), artilharia, prêmios (artilheiro, maior goleada, melhor negócio) e os pontos de cada técnico; tela `public/carreira/temporadas.js` com o ranking dos técnicos e `Campeoes.reverArquivo`. **Festa do campeão:** `public/carreira/campeoes.js` (`window.Campeoes`: `verificar`, `rever`), adaptada da festa do Leilão (`public/leilao/campeao.js`), abre um pop-up com cenas (fim de jogo ou de campeonato, gols da final, campanha, artilheiros, foto do elenco com a taça) quando uma liga ou copa acaba, para todos da sala. Os dados vêm em `competicoes[id].festa` (`festaDaCompeticao`, em `carreira.js`, só com a competição encerrada e visível; `golsDetalhados` é a versão com minuto e autor de `golsDeJogo`). `receber` chama `Campeoes.verificar`; cada competição abre uma vez por temporada (`carreira:festas` no navegador); várias que acabam juntas viram fichinhas na mesma festa, sem fila; a Tabela tem o botão "Rever a festa do campeão". **Artilharia:** `save.gols` guarda os gols dos jogos de humanos; `golsDoMundo(save, limite)` soma a eles os gols dos jogos do computador que já aconteceram (do mesmo jogo simulado do mundo, `golsDeJogo`, com cache por jogo), e `estadoMundo` manda o top 10. **Chaves:** `chaveDaCopa` (em `estadoMundo`) monta o mata-mata de cada copa em `competicoes[id].chave`, fase por fase: a fase só aparece quando a anterior acabou (e o mata-mata, depois dos grupos), com a ida, a volta, o agregado, os pênaltis e quem passou, sem resultado que ainda não aconteceu; a Tabela desenha com `chaveHTML`. Mercado (PR 6): o leilão de um jogador por vez (`act` `leilao`, `lance`, `martelo`, `recusar`; `carreira.js` `infoLeilao`, `erroDoLance`, `concluirLeilao`) e o olheiro (`olheiro`, também no solo). Os tempos aceleram pelo ambiente (`CARREIRA_VEL`, `CARREIRA_DECISAO_MS`, `CARREIRA_LANCE_MS`, `CARREIRA_ESPERA_MS`). |
| `public/carreira/motor.js` | **Carreira de Treinador:** o motor da partida (UMD, com semente). `simularPartida({ casa, fora, semente, modo, controla, decisoes })`: modo 1 simulada, 2 com paradas táticas, 3 também com os lances decisivos; sem resposta em `decisoes[id]`, devolve `parado` e quem chama simula de novo. A calibragem fica em `AJUSTE`. Plano completo em `planos/carreira.md`. |

Na página da carreira, `animacoes.js` roda depois de `cartas.js`: ele faz o voo da figurinha, o martelo/carimbo das
transferências e o movimento da prancheta com 40 falas. As regras continuam nos módulos existentes; a animação só
começa depois da resposta confirmada do servidor. `grupo.js` também monta a faixa viva do leilão e
`tela-mercado.js`, os relatórios do olheiro.
`carreira-feed.js` usa `entreRodadas` nos dois calendários (o antigo e o mundial), para que os eventos aleatórios do
catálogo e as transferências da IA apareçam no feed além da caixa de entrada.
Na prancheta, `elenco.js` mostra a nota nominal e, quando `Escalacao.FIT` é menor que 100%, o rendimento efetivo na
posição (`nota → rendimento`). `bonusNota` aparece como selo permanente nas peças e figurinhas; efeitos de evento
válidos para o próximo jogo usam outro selo, temporário, para as duas mudanças não serem confundidas.
No calendário mundial, `save.rodada`/`partida.rodada` contam todos os jogos do técnico. Para decidir o fim da fase de
grupos, use `rodada` do jogo correspondente em `competicao.jogos`; não confunda os dois contadores.
O estado público do calendário só envia mata-matas já disputados e o próximo jogo eliminatório do clube; fases
posteriores simuladas ficam no servidor para não antecipar classificação, eliminação ou adversário. Empates decisivos
guardam `penaltis` em `resultadosFixos`, `ultimo` e `posJogo`; o resultado do pós-jogo usa o vencedor desse desempate.
`completar` recupera esses campos e corrige as notícias de saves que terminaram empatados antes dessa mudança.
Na rodada ao vivo em grupo, o anfitrião controla `1×`/`3×` para todos pelo servidor. `carreira-rodada.js` guarda os
segmentos de ritmo em `rod.ritmos`, para trocar a velocidade sem saltar o minuto dos jogos ativos ou pausados.
| `ferramentas/base-mundo.js` + `dados/ea_fc27/` + `public/carreira/base/*-2026.js` | **Base mundial da Carreira.** `npm run base:mundo` lê o CSV completo do EA FC 27 (`dados/ea_fc27/README.md`: o conjunto do Kaggle tirado da API de notas da EA; as colunas são traduzidas para os nomes antigos em `jogadoresDoCSV`, só o futebol masculino) com parser próprio, converte as cinco grandes ligas, seis argentinos e os clubes sul-americanos, calibra a base brasileira e gera um módulo UMD por liga. `mundo-2026.js` é o índice das ligas e dos 32 clubes da Libertadores. A chave de origem é sempre `leagueName + team`; jogadores guardam `ea`, e jovens fictícios que completam elenco têm `base: true`. Desde o PR 2 de `planos/carreira-online.md`, todas essas bases são carregadas pela carreira solo e pelo mercado mundial. Os saves apontam para a base pelos ids (de clube e de jogador, que é a posição no elenco): trocar a base exige subir a `VERSAO` de `carreira.js` (hoje 2, a do FC 27), e as carreiras antigas não abrem mais (mensagem `ANTIGA`; as salas em grupo antigas são apagadas). |
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
- `makePlayer(kit, num, nome, { skin, praia })`, `animate` e `descartarJogador` (`praia`: os jogadores de camisa de time
  ficam descalços e de regata, com a bermuda do time; os personagens continuam com a roupa deles. O Futevôlei usa);
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
| Ginásio (Galeramon/Pokémon em tempo real) | `ginasio.js` | `regras.js` (motor), `gif.js`, `estilo.css`, `sala.js`, `cena3d.js` (a cena 3D), `volume.js`, `cenarios.js`, `desenho.js`, `temas.js` (a quadra de cada líder), `animacao.js`, `golpes.js`, `marcas.js`, `controles.js`, `rede.js`, `sons.js`, `hud.js` |
| Tiro (FPS) | `tiro.js` | `arena.js`, `bonecos.js`, `bots.js`, `cena.js`, `controles.js`, `efeitos.js`, `estado.js`, `hud.js`, `menus.js`, `rede.js`, `sons.js`, `jogo.js` |
| Pelada (futsal 3D) e Rocket (futebol de carro) | `pelada.js` (+ `peladaBots.js`) | ver logo abaixo |
| Tênis | `tenis.js` | `index.html`, `jogo.js`, `regras.js` (golpes, robôs; `ARMADO_MAX` = espera do golpe) |
| Pingue-Pongue | `pingpong.js` | `index.html`, `jogo.js`, `regras.js` (voo com efeito, juiz, placar, robô) |
| Futevôlei | `futevolei.js` | `index.html`, `regras.js`, `atleta.js`, `cenarios.js`, `jogo.js` (ver logo abaixo) |
| Vila (o mapa) + Galeramon/Pokémon/Naruto por turnos + estádios | `vila.js` (+ `galeramon.js`) | `public/index.html` (inline), `public/vila/estadios.js` e `public/galeramon/` |

**Futevôlei:**
- 1x1 ou duplas (2x2), robôs completando, set de 10, 15 ou 18 pontos com 2 de vantagem, ponto corrido. Na Vila, a **Arena
  de Futevôlei** fica na areia de Santos (bairro `praia`, fora da cerca: o prédio volta a ser sólido depois do
  `montaMundo`).
- **Controles: só dois botões**, passar (`J`, clique) e atacar (`K`, botão direito), mais o direcional (corre e mira o
  ataque). O toque é armado: aperta antes e o jogador toca quando a bola entra no alcance; com o toque armado, o "ímã"
  (`ima` no `jogo.js`) leva o jogador até o ponto bom (`F.pontoDeToque`). O pulo é sozinho.
- **`regras.js` (`window.Futevolei`):** bola nova (gravidade, arrasto do ar e o efeito que mergulha; não quica: na areia
  acabou o ponto), `lancar` (acha a velocidade para chegar no alvo com o arrasto e sobe a bola até passar da rede),
  `golpeDe` (o golpe pela altura e pelo lugar da bola: cabeca, peito, frente, lado, letra, calcanhar e, só atacando,
  voleio, bicicleta e shark; o **Shark Attack é sempre de pé**, voleio ou bicicleta no alto perto da rede, com
  `estilo` no evento), os 3 toques (em duplas, ninguém toca duas vezes seguidas), o 2º toque é a levantada perto da
  rede, o saque e os robôs (`DIF`). A calibragem dos robôs está nos tempos de `GOLPES` e em `DIF.espirra`.
- **`atleta.js`:** o atleta (o "FutevoleiPlayer"): um transform (`raiz`) que **não cria malha**. O gancho de skin é
  `vestir(visual)` (o `jogo.js` monta o visual com o `makePlayer` e entrega); as animações saem por gatilhos
  (`disparar("cabeca")`, `disparar("shark", { estilo })`...), mexendo nas juntas do boneco (`CLIPES` com as poses; os
  grupos `comemora`, `lamenta` e `mania` sorteiam uma versão). **O golpe começa antes do toque:** cada clipe tem o seu
  `impacto`; o `jogo.js` usa `F.previsaoToque` para `antecipar` o golpe e o evento do toque só `confirmar` (acerta o
  impacto). Online, os eventos levam a hora do servidor (`e.t`) e esperam a bola chegar na tela (`INTERP`). O saque tem
  0,3 s de preparo (`PREPARO_SAQUE`, evento `preSaque`). Parado, o boneco respira, troca o peso de perna, quica na base
  e, de vez em quando, faz uma mania; tudo passa por uma suavização (cada junta vai atrás do alvo).
- **`cenarios.js`:** `montarCenario(renderer, scene, "praia" | "arena")`. A praia: céu `Sky` com nuvens (o sol fica
  atrás do time Amarelo; exposição baixa porque o céu é forte), o ambiente (reflexos) tirado do próprio céu, areia com
  relevo, mar e espuma animados, coqueiros, guarda-sóis, quiosque, torre do salva-vidas, calçadão e prédios. A arena
  coberta: `RoomEnvironment`, tanque de areia, treliças com refletores, arquibancada, placas de LED e o telão com o
  placar (`placar(a, b, texto)`).
- **Câmera:** alta, atrás do meu time, vendo a quadra inteira, e acompanha o atleta (lados e profundidade).
- `#debug` expõe `window.__futevolei` (`avancar(seg)`, `toque(tipo)` e `congelar()` para fotos do quadro exato).

**Ginásio:**
- **Líderes e treinadores (`public/galeramon/lideres.js`):** 4 líderes de ginásio (fogo, água, grama, elétrico) e 6 treinadores (pedra, psíquico, fantasma, dragão, lutador, gelo), cada um com o time nos dois modos. `/ginasio/?lider=<id>` abre o desafio (1x1 contra o robô com o time dele; `config.lider`); vencer um líder guarda a insígnia no navegador (`ginasio:insignias`). Os robôs comuns ganham um dos times temáticos, sorteado. Na Vila, os ginásios ficam fora da cerca, em cima dos estacionamentos oeste e leste (`lider: l` em `GAMES`), e os treinadores são `GAMES` de 1x1 com `npc` (desenhados como bonecos). Cada tipo tem a sua quadra em `temas.js` (`TEMAS`: cores, `chao` e `clima`).
- `/ginasio/` abre a sala e a arena 2D de pixel-art. O prédio fica na Vila Esportiva, ao lado do Pingue-Pongue, abaixo do Tênis: `ginasio: true` desenha o telhado arredondado com Pokébola.
- Na Vila, clicar no amigo ou usar Batalha permite escolher turnos ou Ginásio. O convite `jogo: "ginasio"` reutiliza aceite/recusa; `vila.js` chama `ginasio.criarDesafio` só depois do aceite, reserva os dois lados de uma sala 1x1 sem robôs e envia `irGinasio` com credenciais privadas a cada participante.
- **Naruto Shippuden** é o terceiro modo, nas batalhas por turnos da Vila e no Ginásio em tempo real.
  - `public/galeramon/naruto.js`: 30 ninjas (`MONS`) e 71 jutsus (`MOVES`); `galeramon.js` resolve chakra, Concentrar e Substituição no servidor. Cada golpe tem `forma` (como sai no Ginásio: `corpo`, `projetil`, `area` ou `investida`; `habilidadeDeGolpe` em `regras.js` obedece), `fx` (o desenho em `golpes-naruto.js`) e, nas áreas, `raio`. Cada ninja tem `quadros` (parado), `quadrosAtaque`, `quadrosLance`, `quadrosDano` quando há essas poses, `altura` (em casas da arena) e `imagem`.
  - **Base de dados:** `public/galeramon/naruto-base.js` (`NarutoBase`, GERADO por `node ferramentas/base-naruto.js` a partir da Dattebayo API: vila, clã, patente e jutsus de cada ninja; para pôr um ninja, acrescente o número dele na tabela `ELENCO` da ferramenta). `NarutoDex.perfil(id)` e `NarutoDex.ficha(id)` lêem dela; a ficha aparece na escolha do ninja (os dois modos).
  - **Sprites:** `public/galeramon/naruto-sprites/<imagem>.png` (imagem parada) e `<imagem>-idle.png` (respiração), no tamanho original. `ferramentas/sprites-naruto.py` extrai das folhas do The Spriters Resource (Naruto vs. Sasuke e Ninja Council 4); `LISTA` guarda os intervalos do parado, `ACOES` os de ataque, lance e dano, escolhidos com `ferramentas/contato-naruto.py`. As tiras novas são `<imagem>-ataque.png`, `-lance.png` e `-dano.png`. O site pede verificação de robô: se o script não baixar, ponha as folhas em `NARUTO_FOLHAS` (nome `<número>.png`). Os cinco lendários são desenhados por `ferramentas/sprites-lendarios.py`: Hashirama, Minato, Madara, Obito e Shisui têm quatro quadros de respiração, três tons internos por peça e detalhes de cabelo, rosto, roupa, mãos e sandálias.
  - **Na Vila:** a Casa do Naruto (o Ichiraku Ramen, na Praça, ao lado da fonte; `id: "naruto"` em `GAMES`, com `naruto: true` para o telhado) abre `/ginasio/?modo=naruto`, e o `sala.js` do Ginásio lê o `?modo=` do endereço. O `vila.js` repete o id na lista `GAMES`.
  - **No Ginásio:** `animacao.js` (`carregarTiraNaruto`, `quadroAcaoNaruto`, `escalaNinja`) anima o parado, o golpe de perto, o arremesso/selo e a reação ao dano pelo tempo de `v.golpe`/`v.dano`; sem tira de ação ou com `prefers-reduced-motion`, fica no parado. `golpes-naruto.js` continua desenhando cada jutsu em 3D (`projetilNaruto`, `corpoNaruto`, `areaNaruto`, `efeitoNaruto` para investidas e reforços, `impactoNaruto`), chamado por `golpes3d.js` só quando `modoAtual() === "naruto"`. Jutsu novo: `forma` e `fx` em `MOVES`, e o desenho do `fx` na tabela certa (`PROJETIL_N`, `CORPO_N`, `AREA_N`, `INVESTIDA_N`, `REFORCO_N`). Fotos: `planos/imagens/naruto-ataque-dano.png`, `naruto-lance-dano.png` e `naruto-lendarios.png`.
- O navegador guarda essas credenciais em `ginasio:<código>` e abre `?sala=&entrar=1`; os tokens não vão no endereço ou no estado público. Voltar à Vila deixa o jogador na porta do Ginásio. As batalhas por turnos continuam no canal `/vila`.
- Os scripts dividem as variáveis globais, nesta ordem: `regras`, `gif`, `sala`, `cena3d`, `volume`, `cenarios`, `desenho`, `temas`, `animacao`, `golpes`, `golpes3d`, `golpes-naruto`, `marcas`, `controles`, `rede`, `sons`, `hud`. O Three chega depois, por um `<script type="module">` no fim do `index.html` (`window.THREE`).
- `sala.js` reaproveita `galeramon_time` e `pokemon_time`, monta o seletor de criaturas e guarda o token da sala.
- **3D (`cena3d.js` + `desenho.js`):** uma cena Three.js inclinada, desenhada na resolução da tela (com `devicePixelRatio` até 1,5, antisserrilhado e sombra PCF; meia resolução no modo leve) e copiada para o `#cv`. Os sprites entram no atlas pixel por pixel (`PX_CARTAZ = 96 / 3.1`; o Galeramon com 2 pixels do atlas por pixel): não baixar a resolução, que o Thiago achou feio. Linhas finas e tamanhos fixos da tela usam `camera.traco`. Cada quadro tem três passadas: o chão visto de cima (`chaoCv`: piso do tema, marcas, avisos de área, mira, sombra e anel dos bichos), que vira a textura do tablado; o atlas (`atlasCv`, casas de 128 px), em que cada bicho e cada projétil vira um cartaz em pé na cena; e o `#cv`, com a cena e, por cima, partículas, estouros, números de dano, vida e clima. Quem desenha usa o `ctx` e a `camera` da passada da vez: `pontoTela(x, y, altura)`, `pontoMundo(clientX, clientY)`, `escalaEm` e `anguloTela`. `cena3d.js`: `montarTema` (tablado, arquibancada com torcida instanciada, letreiro, pilares), `enquadrar3d` (a câmera que faz a quadra caber), `renderizar3d`, `projetar3d` e `chao3d`. Sombra de verdade (sol do fundo à esquerda, a sombra cai para a frente); o cartaz precisa de `shadowSide = DoubleSide`. Modo leve (`cena3d.leve`): celular fraco, quadros lentos ou `?leve=1`; menos pixels, sem sombra de verdade e torcida parada. Sem WebGL, o `#cv` mostra o chão reto (`desenharReto`).
- **Desempenho do 3D:** o chão e o atlas são canvases na memória (`willReadFrequently`, e os quadros dos bichos também);
  a cada quadro, `compararParcial` (`cena3d.js`) compara com o quadro anterior em ladrilhos de 32 px e `subirRetangulos` sobe
  só o que mudou (a espessura, só as casas medidas). Subir as texturas inteiras a cada quadro, ou desenhar um canvas da placa
  de vídeo num da memória, faz o processador esperar a placa e derruba o FPS (numa Intel UHD: 23 contra 90 quadros por
  segundo).
- **Bichos com volume (`volume.js`):** depois de pintar o bicho no atlas, `medirEspessura` mede a distância até a borda de cada pixel (textura `ESPESSURA`); a malha de cada casa é uma pilha de `CAMADAS` folhas para cada lado, e o shader corta o pixel que não chega até a camada e acende o relevo com o sol em três tons. O meio transparente (rastro, desmaio) vai num cartaz "fantasma". No modo leve, só o cartaz plano.
- **Golpes em 3D (`golpes3d.js`, estado em `G3`):** `montarProjetil` (um desenho por família), `estouro3d`, `corte3d`, `area3d` (coluna de fogo, raio do céu, gêiser, espinhos, pedras, cúpula), anéis e `pedrasCaindo`. Nascem da lista `efeitos` (cada um uma vez: `f.g3`) e dos projéteis do pacote. As `PARTICULAS` viram cubinhos (uma malha instanciada). Três luzes fixas (`pedirLuz`; não mude a quantidade, senão os materiais recompilam). `sacudir(forca, soco)` treme e aproxima a câmera (nunca com menos movimento). Em tema de chão claro (`G3.claro`), nada usa mistura aditiva. Com 3D, a tela só desenha os números de dano e a vida por cima.
- **Cenários (`cenarios.js`):** `montarCenario(T, grupo, toon)`, chamado por `montarTema`, põe a luz do tema (`LUZ_DO_CHAO`), os enfeites (pelo `T.chao`: lava, ondas, flores, placas, pedras, runas, rachaduras, escamas, tatame, gelo ou o padrão) e o clima 3D (`montarClima3d`; as faíscas continuam na tela, em `temas.js`). Devolve a função que anima tudo a cada quadro.
- O bicho é desenhado em partes (`animacao.js`): `poseBicho` (o jeito do momento), `bichoNoChao`, `bichoNoQuadro` (o corpo no atlas) e `bichoInfo` (a vida na tela). `controles.js` usa teclado, mouse e `Toque.setup`.
- **Os bichos se mexendo (`animacao.js`):** os Pokémon tocam o GIF animado do Black/White (`PokeDex.spriteAnimado`, lido por `gif.js`, sem dependência), e os Galeramon, os quadros de `GaleramonSprite.quadros` (respirar, chamas, asas, piscar). `desenharBicho` monta o jeito de cada momento (andar, virar, antecipação do golpe, apanhar, esquiva, investida, giro, voo, buraco, mergulho, troca, desmaio) a partir dos eventos (`animarEvento`); as partículas ficam numa lista fixa (`PARTICULAS`). Mirando para o fundo, o bicho vira de costas (`animacaoCostas`: GIF de costas dos Pokémon; Galeramon sem o rosto, `semRosto`).
- **Os golpes por tipo (`golpes.js`):** `desenharProjetil` (um desenho animado por família de tipo), `desenharCorte`, `estouro` e o golpe de área caindo.
- **As marcas no chão (`marcas.js`):** golpe de área que cai, Dig (e a saída dele), Fly/Bounce, mergulho e Shadow Force deixam uma marca na quadra, do jeito do tipo: cratera, buraco com terra, chamusco com brasas, rachaduras de raio, poça com marolinha, gelo trincado, mato arrancado ou runa. Nasce dos eventos `explosao` e `sumiu` que o navegador já recebe (`registrarMarca`, chamado por `efeitoVisual`), então é só enfeite: não vai para o servidor nem muda dano. Cada marca esmaece linearmente do momento em que nasce até o fim da partida (`alfaDaMarca`, com o tempo de jogo do último pacote; as que nascem nos últimos 6 s ainda duram o mínimo), guarda no máximo 48 e é limpa a cada partida (`limparRede`). `desenharMarcas` roda logo depois da quadra, por baixo dos bichos e dos pilares.
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
5. `rostos.js`: o rosto de cada jogador em pixel-art 16x16 (tabela de pele/cabelo/barba; quem não está na tabela e foi registrado com `Rostos.registrar(nome, { nat, idade })`, como os jogadores da Carreira, sai com o tom de pele e o cabelo da região do país e fica grisalho com a idade) com a camisa mais marcante: clube (`KITS`, `PRIORIDADE`, `EMBLEMA`) ou seleção;
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
11. `campeao.js`, que carrega entre `aovivo.js` e `elenco.js`: a **festa do campeão**. É um `<dialog>` que passa como um vídeo
    em cenas: o fim de jogo com o placar da final, os gols da final, os pênaltis, a campanha, os artilheiros e a foto do
    elenco com a faixa CAMPEÕES.
    - O telão é um canvas de 160x90, com os bonecos e as comemorações de `Lances.kit`. Os textos ficam em HTML por cima.
    - Abre uma vez por campeonato: `abrirFesta`, chamada no `renderReveal` quando o `summary` chega e nada está rolando.
      A chave fica em `lt_festa_<código>`. `reverFesta()` é o botão "Rever a festa do título".
    - "Baixar a foto" gera um PNG que passa por `ChampionCard.baixar`.
    - `#debug` expõe `window.__festa`.
    - Tudo vem do `summary` do simulador: `final` (o jogo que decidiu o título, igual ao de `lives`), `id` do campeão,
      `dono` e a `pos` dos titulares. Esses campos só copiam o que já saiu, sem sortear nada.

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
- **Ginásio:** `tests/ginasio.test.js` cobre o motor; `tests/ginasio-marcas.test.js` cobre as marcas no chão (o tipo de marca de cada golpe e o esmaecer até o fim); `tests/ginasio-servidor.test.js` cobre salas, comandos,
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
- **Futevôlei:** `tests/futevolei.test.js` (o golpe de cada posição da bola, os 3 toques, passe e ataque passando a rede,
  o juiz da areia, robô contra robô e uma partida pelo servidor).
- **Leilão:**
  - `tests/leilao-campeao.test.js`: o resumo do campeão em todos os formatos, e a mesma semente dando o mesmo campeonato.
  - `tests/e2e/leilao-campeao.spec.js`: a festa numa sala de verdade e com menos movimento.
- **Carreira:** `tests/bd.test.js` (banco em memória), `tests/carreira-motor.test.js` (10 mil jogos conferem gols, mando e força; se mexer no `AJUSTE` do motor, esses testes dizem se o futebol continua com cara de futebol) `tests/carreira-rodada.test.js` (a rodada ao vivo com o relógio à mão), `tests/carreira-online-mercado.test.js` (rodada e leilão pelo canal), `tests/carreira-online.test.js` (a sala em grupo: opções, clubes sem repetir, aporte, reconexão e o servidor reiniciando), `tests/carreira-evolucao.test.js` (evolução, aposentadoria, jovens, virada de temporada e limite) e `tests/carreira-base.test.js` (Brasileirão, base mundial, nomes licenciados, elencos, calibragem, Libertadores e Liverpool × Sunderland).
  `tests/carreira-animacoes.test.js` confere as 40 falas únicas da prancheta; o E2E da carreira cobre o balão, o relatório do olheiro, a animação ao terminar o leilão, o ritmo 3× compartilhado, os pênaltis eliminatórios e a leitura da evolução/perda por posição na prancheta.
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
