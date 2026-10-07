# Carreira online em grupo: plano em PRs para o Codex

A ideia: uma turma de amigos joga a mesma carreira numa noite.
- O criador abre uma sala com código e os amigos entram. Cada um escolhe um clube, e a CPU controla os outros.
- As rodadas acontecem ao mesmo tempo para todo mundo, com escolhas no meio do jogo.
- O mercado é disputado entre os humanos, como no Leilão.
- Jogam-se o Brasileirão e a Libertadores, as 5 grandes ligas europeias rodando ao mesmo tempo e, no fim, o Mundial.
- São de 1 a 5 temporadas (2 por padrão). Depois da última vem o ranking final e a sala se apaga.

Este plano divide tudo em **8 PRs, um depois do outro**, cada um a partir de `origin/main` depois que o anterior
entrou. Cada PR funciona sozinho, tem testes e não quebra a carreira solo de hoje.

Antes de começar, leia o `CLAUDE.md` inteiro e os planos que já existem: `planos/carreira.md` e
`planos/carreira-feed-e-mercado.md`.

---

## 0. Regras do projeto (valem para todos os PRs)

- **Branch e PR:** uma branch nova a partir de `origin/main` por PR, e um PR para `main`. Nada de PR em cima de PR.
- **`MUDANCAS.md`:** reescrito a cada PR; o corpo do PR é esse mesmo texto.
- **`CLAUDE.md`:** atualizado com os arquivos e campos novos.
- **Português** na tela, nos comentários e nos nomes, no tom dos arquivos de hoje.
- **Sem emojis na tela.** Os ícones vêm de `public/icones.js`; a arte é pixel-art feita por nós.
- **Topo:** só o "← Vila".
- **Finais de linha:** mantenha os de cada arquivo. Se o diff virar o arquivo inteiro, está errado.
- **O servidor manda:**
  - o navegador só desenha e pede;
  - todo sorteio tem semente (`Motor.sorteDe`): recarregar nunca muda um resultado;
  - nada no save muda enquanto há partida em andamento.
- **Nomes globais:** os scripts da página dividem as variáveis globais. Antes de criar `const`/`function` no topo de um
  arquivo, confira que o nome não existe em outro script da mesma página. Esse erro já derrubou o Ginásio inteiro uma
  vez (`semente` repetida).
- **A carreira solo continua funcionando.** Carreiras antigas abrem; campos novos entram com padrão em `completar(save)`.
- **Animações:** respeite "menos movimento" (`prefers-reduced-motion`). Efeitos simultâneos aparecem lado a lado, na
  hora, nunca em fila.
- **Regras de mesa (memória do projeto): nada de "todo mundo aperta Pronto".**
  - Quem avança a rodada é o **criador da sala**, e as decisões têm **tempo** (sem resposta, vale a padrão).
  - Ninguém trava a noite dos outros.
- **Qualidade antes de quantidade.** Se um PR ficar grande demais, corte o enfeite e entregue a base bem feita.
- **Conferir antes de abrir o PR:**
  - `npm test` passando, com os testes novos dentro do `"test"` do `package.json`;
  - `npm run test:e2e` da carreira;
  - fotos em `planos/imagens/`;
  - se o navegador do teste não abrir no seu ambiente, diga isso no `MUDANCAS.md` em vez de dizer que conferiu.

---

## Decisões tomadas

O Thiago já respondeu: notas do CSV do EA FC 26, clube europeu jogável e Mundial com 4 clubes. O resto são padrões que
ele pode mudar depois.

| Assunto | Decisão |
| --- | --- |
| Notas | **CSV do EA FC 26**, que o Thiago já baixou (ver a seção da base, logo abaixo). |
| Clube europeu | **Pode escolher.** Quem pega um clube europeu joga a liga dele (e a Champions, se classificar); quem pega um brasileiro joga o Brasileirão e a Libertadores. Os dois caminhos se cruzam no Mundial. |
| Mundial | **4 clubes**, no fim de cada temporada: semifinais (o campeão da Libertadores contra o vice da Champions, e o campeão da Champions contra o vice da Libertadores) e a final, tudo em jogo único. |
| Temporadas | O criador escolhe de 1 a 5 (padrão 2). Depois da última: ranking final e a sala se apaga. |
| Aporte inicial | O criador escolhe: nenhum, R$ 250 mi, R$ 500 mi ou **R$ 1 bi** (padrão) para cada humano, por cima do caixa do clube. |
| Quem avança | O criador aperta "Jogar rodada". Os outros só precisam estar com a escalação salva (se não estiverem, vale a última). |
| Decisões no jogo | Paradas táticas e lances decisivos com 20 s (como hoje). Sem resposta, vale a padrão. |
| Humano contra humano | Os dois decidem no mesmo lance; o pênalti vira o duelo do Leilão (um escolhe o canto, o outro o pulo). |
| Mercado | Jogador da CPU: leilão aberto entre os humanos, com preço mínimo do clube. Jogador de um humano: o dono bate o martelo. Vale entre ligas (um brasileiro pode comprar um jogador da Premier League). |
| Evolução | Entre temporadas, cada jogador sobe até **+3** ou cai até **−2** (idade, minutos e notas). |
| Duração da noite | Rodadas só de CPU são simuladas na hora. Só os jogos com humano passam ao vivo. A meta é 1 temporada em cerca de 1 hora. |

---

## A base de jogadores: o CSV do EA FC 26 (já conferido)

O Thiago baixou o conjunto do EA FC 26. Os arquivos estão em `C:\Users\thiag\Documents\leilão\archive`:

| Arquivo | O que tem |
| --- | --- |
| `ea_fc26_players.csv` | **Use este.** 16.228 jogadores, todas as colunas (linha e goleiro). Data de nascimento no formato `6/15/1992 12:00:00 AM`. |
| `ea_fc26_outfield.csv` | Só jogadores de linha, com `age` e a data em ISO. |
| `ea_fc26_goalkeepers.csv` | Só goleiros, com `age` e a data em ISO. |

- **Onde estão:** os três CSVs **já estão no repositório**, em `dados/ea_fc26/` (decisão do Thiago: assim quem for
  fazer os PRs recebe tudo pelo git). A base gerada a partir deles (`public/carreira/base/*.js`) também entra no git.
- **Colunas usadas:**
  - `id`, `overallRating`, `firstName`, `lastName`, `commonName` (quando existe, é o nome de tela);
  - `birthdate`, `position`, `alternatePositions`, `nationality`, `team`, `leagueName`;
  - `pac`, `sho`, `pas`, `dri`, `def`, `phy`, e para goleiro `gkDiving`, `gkHandling`, `gkKicking`, `gkPositioning`,
    `gkReflexes`.

### O que tem no CSV, por liga (contado)

| Liga no CSV (`leagueName`) | Clubes | Uso |
| --- | --- | --- |
| `Premier League` | 20 | Liga jogável |
| `LALIGA EA SPORTS` | 20 | Liga jogável |
| `Serie A Enilive` | 20 | Liga jogável (com nomes trocados, ver abaixo) |
| `Bundesliga` | 18 | Liga jogável |
| `Ligue 1 McDonald's` | 18 | Liga jogável |
| `LPF` (Argentina) | 30 | Os argentinos da Libertadores (Boca, River, Racing, Estudiantes, Vélez...) |
| `Libertadores` | 19 | Os clubes sul-americanos de fora de Brasil e Argentina (Peñarol, Nacional, Colo-Colo, LDU, Olimpia, Cerro Porteño, Atl. Nacional, Universitario...) |
| `Sudamericana` | 19 | Reserva para completar a Libertadores |

### Achados importantes (o Codex precisa tratar)

1. **Não há nenhum clube brasileiro no CSV.** O EA FC 26 não tem a licença do Brasileirão. Os brasileiros que jogam no
   Brasil (Arrascaeta, Hulk, Neymar...) não aparecem; só os que jogam fora (Estêvão no Chelsea, por exemplo).
   - Os **20 clubes da Série A continuam vindo da base de hoje** (`public/carreira/base/brasileirao-2026.js`, elencos
     da Wikipédia, notas estimadas).
   - O PR 1 **calibra** essas notas na escala do CSV com uma conta só, em vez de redigitar.
   - Conferido: a média dos 11 melhores do Flamengo na base é 80,4 e a do Palmeiras é 78,8. No CSV, a do River é
     77,1, a do Boca é 76,2, a do Peñarol é 72,4, a do Sunderland é 77,7 e a do Liverpool é 86,9. A base de hoje já
     está numa escala parecida.
   - A regra: o topo do Brasil fica de 1 a 3 pontos acima de River e Boca, e o fim da tabela perto do meio da LPF
     (cerca de 70). Um teste trava essa coerência (`tests/carreira-base.test.js`).
2. **Nomes trocados na Itália** (o EA não tem a licença). Faça uma tabela de nomes reais na ferramenta:
   - `Lombardia FC` → Inter de Milão;
   - `Milano FC` → Milan;
   - `Latium` → Lazio;
   - `Bergamo Calcio` → Atalanta.

   Confira os outros clubes de todas as ligas: nome que pareça inventado vai para a mesma tabela.
3. **Mesmo nome em ligas diferentes:** `Racing Club` está na LPF (Argentina) e na Sudamericana (Uruguai), e há
   `Nacional` no Uruguai e em Portugal. **A chave de um clube é `leagueName` + `team`**, nunca só o nome.
4. **Duas datas:** `players.csv` usa o formato `M/D/AAAA`, e os outros dois usam ISO. Leia os dois. A idade sai da data
   de nascimento no dia 1º de julho da temporada.
5. **Elencos grandes:** alguns clubes têm 30 a 35 jogadores. Fique com os **28 de maior nota**, garantindo pelo menos 3
   goleiros. Clube com menos de 18 completa com jovens da base (`base: true`), como a ferramenta de hoje faz.

### Como o CSV vira a base do jogo

- **Posição:**

| CSV | Jogo |
| --- | --- |
| GK | GOL |
| CB | ZAG |
| RB, RWB | LD |
| LB, LWB | LE |
| CDM | VOL |
| CM | MC |
| CAM | MEI |
| LM, LW | PE |
| RM, RW | PD |
| ST, CF | ATA |

- **Atributos** (os de hoje: `rit`, `fin`, `pas`, `dri`, `def`, `fis`, `gol`):
  - `pac` → `rit`, `sho` → `fin`, `pas` → `pas`, `dri` → `dri`, `def` → `def`, `phy` → `fis`;
  - goleiro: `gol` = média de `gkDiving`, `gkHandling`, `gkPositioning` e `gkReflexes`. Os de linha do goleiro saem da
    própria linha do CSV, se vierem, ou de valores baixos padrão.
- `nota` = `overallRating`.
- `nome` = `commonName`, ou então `firstName lastName`.
- `nat` em português (a ferramenta de hoje já tem a tabela de países), `idade`, e o `id` próprio do jogo:
  `<clube>-<n>`. O `id` do EA fica guardado em `ea` para conferir depois.
- `est: false` para quem veio do CSV; os brasileiros ficam com `est: true`.
- **O motor aguenta?** A carreira de hoje calibrou o `AJUSTE` do motor com notas de 70 a 85. A Premier League chega a
  91. O teste `tests/carreira-motor.test.js` (10 mil jogos) precisa continuar passando, mais um teste novo: Liverpool
  contra Sunderland dá vitória do Liverpool na maioria, mas não em todas.

---

## PR 1: A base do mundo (o CSV do EA FC 26 + o Brasileirão de hoje)

**Objetivo:** ter os dados de todas as competições, gerados por ferramenta, sem nota feita à mão.

- **`ferramentas/base-mundo.js`:**
  - lê `dados/ea_fc26/ea_fc26_players.csv` com um leitor de CSV pequeno, escrito ali mesmo, que entende aspas (as
    colunas `playStyles` têm vírgula dentro das aspas);
  - aplica tudo o que está na seção de cima;
  - lê a base do Brasileirão de hoje e aplica a calibragem;
  - gera os arquivos da base.
- **Saída:** um arquivo por liga, para o navegador carregar só o que precisa:
  - `public/carreira/base/inglaterra-2026.js`, `espanha-2026.js`, `italia-2026.js`, `alemanha-2026.js`,
    `franca-2026.js`;
  - `argentina-2026.js` (só os clubes que vão para a Libertadores, não a LPF inteira);
  - `sulamericanos-2026.js` (os da `Libertadores` e, se faltar, da `Sudamericana`);
  - o Brasileirão continua em `brasileirao-2026.js`;
  - um índice `public/carreira/base/mundo-2026.js` com as ligas, os clubes de cada uma e a lista da Libertadores do
    ano: 7 brasileiros (os 6 primeiros + o campeão da Copa do Brasil, que pode ser sorteado entre os 12 primeiros),
    6 argentinos e 19 dos outros países, 32 no total.
- **Formato de cada clube:** o de hoje (`id`, `nome`, `curto`, `cores`, `estadio`, `tamanho`, `formacao`, `escudo`,
  `jogadores`), mais `liga`, `pais` e `orcamento`.
  - **Cores, sigla e estádio:** o CSV não tem. Faça uma tabela na ferramenta para os 96 clubes europeus e os
    sul-americanos (o estádio e as duas cores bastam). Clube sem entrada na tabela fica com cores neutras e o aviso
    na saída da ferramenta.
  - **Escudo:** a receita de hoje (`escudos.js`, parecido mas sem copiar). Os grandes ganham uma receita feita; o
    resto, uma receita simples pelas cores e pela sigla.
  - **Orçamento:** pela soma do valor de mercado (`Mercado.valorDe`) do elenco, com o fator da liga (a Premier League
    paga mais). Substitui a tabela de `orcamentos.js`, que fica como reserva para os brasileiros.
  - **Tamanho (de 1 a 5):** pela média dos 11 melhores.
- **Testes** (`tests/carreira-base.test.js`):
  - todo clube tem de 18 a 28 jogadores, pelo menos 3 goleiros, as notas entre 40 e 95 e os ids únicos no mundo
    inteiro;
  - Inter, Milan, Lazio e Atalanta com o nome certo;
  - os dois `Racing Club` são clubes diferentes;
  - a calibragem do Brasil fica entre a LPF e a Premier League;
  - a Libertadores tem 32 clubes, sem repetir.
- **Fora deste PR:** usar as ligas novas no jogo.

## PR 2: A temporada com várias competições (ainda na carreira solo)

**Objetivo:** a carreira solo de hoje passa a ter o calendário de verdade, com campeonato e copa e as outras ligas
rodando ao mesmo tempo. Testável sem multiplayer.

- **`public/carreira/temporada.js`** ganha o calendário do mundo, em semanas:
  - fim de semana: as ligas;
  - meio de semana: Libertadores e Champions.
- **Libertadores:** fase de grupos (8 grupos de 4) e mata-mata ida e volta até a final em jogo único. Os brasileiros do
  ano anterior (os 6 primeiros, ou a lista da base na primeira temporada) mais os de fora da base.
- **Champions (rápida):** os 4 primeiros de cada liga europeia (20 clubes), mais 12 pela força. Grupos e mata-mata, só
  para dar o campeão da Europa.
- **Mundial:** depois da última rodada:
  - semifinais e final, em jogo único;
  - o campeão da Libertadores contra o vice da Champions, e o campeão da Champions contra o vice da Libertadores;
  - quem tiver humano é jogado ao vivo.
- **Simulação dos jogos sem humano:** `Motor.simularPartida` sem decisões, na hora. Hoje o motor roda 10 mil jogos nos
  testes, então aguenta.
- **Telas:**
  - tabela com abas por competição (Brasileirão, Libertadores, Champions, as ligas), dentro da tela que já existe,
    sem abas novas no topo da página;
  - o calendário mostra os jogos de copa;
  - o feed (`carreira-feed.js`) ganha posts das copas: classificou, foi eliminado, campeão.
- **Partida de copa:** a mesma tela; no mata-mata, empate vai para os pênaltis (o motor já tem pênalti).
- **Clube europeu:** a carreira solo também deixa escolher um clube europeu. Ele joga a liga dele e, se classificar, a
  Champions e o Mundial. O mercado vale entre todas as ligas, e o salário e o orçamento seguem o fator da liga.
- **Save:** `save.competicoes = { id: { tipo, fase, grupos, jogos, resultados } }`. As carreiras antigas seguem só com
  o Brasileirão (`completar`).
- **Testes:**
  - uma temporada inteira simulada termina com um campeão em cada competição, e o mesmo save sempre dá os mesmos
    campeões;
  - o Mundial tem os 4 certos;
  - o calendário não põe dois jogos do mesmo clube na mesma semana.

## PR 3: Várias temporadas e a evolução dos jogadores

**Objetivo:** jogar de 1 a 5 temporadas, com jogadores evoluindo e o fim de carreira com o resumo.

- **Entre temporadas** (no `novaTemporada` que já existe), cada jogador muda de **−2 a +3** de nota (sorteio com
  semente), pesando:
  - **idade:** até 23 tende a subir, de 24 a 29 fica perto de zero, 30+ tende a cair;
  - **minutos:** quem jogou mais de 60% dos jogos ganha um pouco;
  - **nota média nos jogos:** o motor já sabe quem fez gol, deu passe e levou cartão. Faça uma nota simples por jogo e
    guarde a média em `save.desempenho[pid]`.
- A nota nova vai para `save.bonusNota` (que já existe), com o limite por temporada. A idade sobe 1.
- **Aposentadoria:** acima de 35 anos, chance de se aposentar (sai do elenco e vira post no feed).
- **Base:** cada clube ganha 1 ou 2 jovens da base por temporada (já existe o `base: true`), para os elencos não
  minguarem.
- **Contratos:** fora deste PR (fica para depois, se o Thiago quiser).
- **Limite:** `save.temporadasMax` (de 1 a 5). Na última, a tela de fim mostra os títulos, o artilheiro de cada
  temporada, o melhor negócio (o maior lucro) e a evolução do time. Não aparece o botão "Nova temporada".
- **Testes:**
  - a evolução nunca passa de +3 nem de −2 numa temporada;
  - jovens sobem em média e veteranos caem;
  - a mesma carreira evolui sempre igual;
  - depois da temporada máxima, `novaTemporada` recusa.

## PR 4: A sala da carreira online (criar, entrar, escolher o clube)

**Objetivo:** o esqueleto do multiplayer, com o estado compartilhado, ainda sem a rodada ao vivo.

- **Canal novo `/carreira-online`**, num arquivo novo `carreira-online.js`. Ele reaproveita as funções de `carreira.js`:
  `carreira.js` passa a exportar o "mundo" (`timeDe`, `fecharRodada`, mercado, eventos) para servir os dois modos. Esse
  refactor é a parte delicada; faça com testes antes e depois.
- **Sala:**
  - o código de 5 letras (`salas.novoCodigo`);
  - o criador vira o **anfitrião** e escolhe as opções: temporadas (de 1 a 5), aporte (de 0 a R$ 1 bi), ligas jogáveis
    (só Brasil, ou Brasil + Europa) e o ritmo (normal ou turbo);
  - os amigos entram pelo código.
- **Escolha do clube:** cada um escolhe um clube livre (dois humanos nunca no mesmo). A lista mostra o orçamento e a
  situação. O aporte entra no caixa como "Aporte do investidor".
- **Reconexão:** token por pessoa (`salas.quemVolta`, como os outros jogos). O token fica no navegador em
  `carreira-online:<CÓDIGO>`. Fechar a aba não tira ninguém da sala.
- **Banco:** a sala inteira fica salva numa tabela nova (`migracoes/003-carreira-online.sql`: código, dados em JSON,
  criada e atualizada) para o servidor poder reiniciar no meio da noite. **A sala se apaga** 24 h depois do fim (ou do
  último uso), com `limparSalasParadas`.
- **Save:** um só para a sala, com `humanos = { [clube]: { nome, token_hash, skin } }`. O que hoje é "o meu clube"
  passa a ser "os clubes humanos": a caixa de entrada, os eventos, as finanças e a moral **por clube**. `save.clube`
  vira `save.humanos`, e o modo solo é a sala com 1 humano.
- **Página:** `public/carreira/online.html`, ou um modo da página de hoje com `?sala=` (a página já sabe criar e entrar
  pela Noite da Galera: `?criar=1` e `?entrar=1`, com `hName`, `hCode`, `btnCreate` e `btnJoin`). Há uma sala de espera
  com os escudos de quem já escolheu.
- **Vila:** a Sede da Carreira oferece "Carreira solo" e "Carreira em grupo".
- **Noite da Galera:**
  - entre na lista `JOGOS` do `noite.js`;
  - no fim, `noite.vitoria("carreira", código, [campeões], [os outros])`.
- **Testes:**
  - `tests/carreira-online.test.js`: criar, entrar, escolher (sem repetir clube), reconectar pelo token, o aporte no
    caixa e o servidor reiniciado mantendo a sala;
  - entra na lista `CANAIS` do `tests/salas.test.js`.

## PR 5: A rodada ao mesmo tempo para todos (ao vivo, com as decisões)

**Objetivo:** o coração da noite. O anfitrião aperta "Jogar rodada" e todos assistem juntos.

- **Relógio único do servidor:** a mesma ideia do campeonato ao vivo do Leilão (`r.quando`, `r.pausas`, `Ritmo` em
  `public/leilao/ritmo.js`). Leia como o Leilão faz antes de começar.
- **Cada um vê o seu jogo**, com o placar dos outros jogos da rodada numa faixa (os gols dos outros humanos aparecem na
  hora).
- **Paradas:** quando o jogo de um humano chega numa parada (tática ou lance decisivo), **só aquele jogo pausa**:
  - os outros continuam;
  - a decisão tem 20 s e, sem resposta, vale a padrão (`Motor.decisaoAutomatica`);
  - ninguém trava os outros.
- **Humano contra humano:** os dois decidem.
  - No lance decisivo, cada um escolhe o seu lado da jogada (ataque contra defesa).
  - No pênalti, é o **duelo do Leilão** (`renderDuelo` no `aovivo.js`, `abreDuelo`/`fechaDuelo` no servidor): quem
    bate escolhe um dos 6 cantos e o outro escolhe o pulo do goleiro.
- **Ritmo:**
  - rodada sem nenhum humano em campo (por exemplo, só Europa): simulada na hora;
  - **turbo:** o anfitrião pode simular várias rodadas seguidas, parando só nos jogos entre humanos e nas finais.
- **Entre as rodadas:**
  - cada humano mexe na escalação, no mercado e na caixa de entrada;
  - o anfitrião vê quem já salvou a escalação (só informação, não trava);
  - o pós-jogo (`posjogo.js`) abre para cada um com o seu clube.
- **Testes:**
  - dois clientes numa rodada: o jogo de um pausa, e o do outro continua;
  - a decisão vencida pelo tempo usa a padrão;
  - humano contra humano: o pênalti espera os dois (ou o tempo);
  - recarregar no meio da rodada volta no mesmo ponto;
  - e2e com duas páginas abertas.

## PR 6: O mercado disputado (o leilão entre os amigos) e o olheiro

**Objetivo:** "a gente briga por aquele jogador, igual no leilão, e o dono bate o martelo".

- **Jogador da CPU:** um humano abre o **leilão** do jogador, com o preço mínimo dado pelo clube: o pedido de
  `Mercado.avaliarProposta`, como hoje.
  - Todos os humanos veem o leilão ao vivo e dão lances.
  - Cada lance novo **reinicia um relógio curto** (15 s).
  - Quando o relógio acaba, ganha o maior lance acima do mínimo, que paga e leva (o salário entra como hoje).
  - **Um leilão por vez na sala**, para todo mundo poder prestar atenção.
- **Jogador de um humano:**
  - os outros mandam propostas, e quando há duas ou mais, vira leilão como acima;
  - **quem bate o martelo é o dono**, quando achar que está bom (a mecânica da `disputa.js`, só que com gente de
    verdade);
  - o dono pode recusar e ficar com o jogador.
- **Regras:**
  - só na janela;
  - ninguém lança mais do que tem no caixa;
  - o limite de elenco continua;
  - a carência (sem lucro em revenda na hora) continua valendo.
- **Tela:** a mesma linguagem da disputa (o lance grande, os escudos de quem está na briga, o histórico e o martelo),
  com o relógio do lance. Quem não está no leilão vê um aviso pequeno ("Leilão por X: R$ 30 mi, Fulano na frente").
- **Olheiro** (botão no mercado):
  - olha as posições mais fracas do seu time: a menor nota por posição em relação à média dos titulares, usando
    `Motor.escalacaoDetalhada`;
  - sugere **2 ou 3 jogadores** que **cabem no orçamento** e **melhoram aquela posição**, explicando o porquê ("Seu
    lateral-esquerdo é 68; este é 76 e custa R$ 18 mi");
  - não inventa jogador: escolhe da base, com a regra do valor de hoje.
- **Testes:**
  - leilão com três clientes: o relógio reinicia a cada lance, o maior leva e o caixa fecha certo;
  - ninguém lança acima do caixa;
  - o dono do jogador bate o martelo;
  - o olheiro sugere jogadores da posição mais fraca e dentro do caixa.

## PR 7: O fim da noite (ranking, Mundial e a sala que reseta)

**Objetivo:** fechar a noite com graça.

- **Fim de cada temporada:**
  - o Mundial ao vivo, se houver humano;
  - a tela de títulos da temporada, com todos os campeões;
  - o feed com o "resumo do ano".
- **Ranking da noite:** pontos por título (Mundial, Libertadores, Champions, ligas, vice), mais a posição na liga e o
  lucro no mercado como desempate. A tabela de pontos fica no topo de um arquivo, fácil de ajustar.
- **Tela final:**
  - o pódio dos amigos (os bonecos com as skins, como os outros jogos da Vila);
  - os números de cada um: títulos, gols, a maior compra e a maior venda;
  - o botão "Nova carreira com a mesma turma", que cria uma sala nova com o mesmo grupo (e esta se apaga).
- **Noite da Galera:** `noite.vitoria` com o campeão da noite.
- **Testes:** as contas do ranking; a sala que se apaga depois do fim; a nova sala com a mesma turma.

## PR 8 (opcional, depois): o acabamento

Só depois que a noite inteira funcionar:
- notificação no celular quando a rodada começa;
- o anfitrião passar o cargo para outro (se ele cair);
- espectador (quem chega sem clube assiste);
- contratos com tempo e renovação.

---

## Ordem e tamanho

| PR | O quê | Tamanho | Precisa de |
| --- | --- | --- | --- |
| 1 | Base do mundo (o CSV do EA FC 26 + o Brasileirão de hoje) | grande (ferramenta e dados) | nada (os CSVs já estão em `dados/ea_fc26/`) |
| 2 | Calendário com copas e Europa (solo) | grande | PR 1 |
| 3 | Várias temporadas e evolução | médio | PR 2 |
| 4 | Sala online (criar, entrar, escolher) | grande (refactor do save) | PR 3 |
| 5 | Rodada ao vivo para todos | grande | PR 4 |
| 6 | Mercado disputado e olheiro | médio | PR 5 |
| 7 | Fim da noite e ranking | médio | PR 6 |
| 8 | Acabamento | pequeno | PR 7 |

**Andamento:** os PRs 1 e 2 entraram (#77 e #78). Os PRs 3 e 4 entraram juntos, a pedido do Thiago, no mesmo PR da
repaginada da sede (o hub no estilo EA FC) e das camisas e rostos dos jogadores importados. O próximo é o PR 5.

**Se precisar cortar para jogar logo:** os PRs 4 a 7 funcionam só com o Brasileirão e a Libertadores (o PR 2 pode
deixar a Europa para depois). A noite em grupo já fica completa sem as ligas europeias, e elas entram depois.

## Antes do PR 1

- Os três CSVs já estão em `dados/ea_fc26/` (no `main`). Não precisa copiar nada.
- As decisões já estão na tabela lá de cima. Se aparecer algo fora delas, pergunte antes de inventar.
