# Carreira de Treinador: plano

Plano para o Codex fazer por fases. Cada fase vira **uma branch nova a partir de `origin/main` e um PR**. Nada de PR em
cima de PR.

## Como usar este plano
- Antes de tudo, leia `CLAUDE.md`, que é o mapa do projeto e o jeito de trabalhar. Siga do mesmo jeito:
  - português na tela, nos comentários e nas variáveis;
  - manter os finais de linha (CRLF/LF) de cada arquivo;
  - reescrever o `MUDANCAS.md` a cada PR.
- Peça ao Codex **uma fase por vez**: "Leia `planos/carreira.md` e faça a Fase N".
  - No fim, ele roda `npm test` e escreve no PR o que conferiu.
  - Depois, o PR passa pela revisão do Claude antes do merge.
- As decisões de "Decisões fechadas" já foram tomadas. Não reabrir sem perguntar.
- É o maior projeto do site. Cada fase tem que deixar algo **jogável ou testável** e não pode quebrar os outros jogos.

## A ideia
Um modo carreira de treinador em pixel-art 8 bits, dentro do universo da Vila da Galera.
- Você assume um clube do **Brasileirão**, com os times e os jogadores reais, e joga as temporadas.
- Vai ao CT, vai aos jogos (de **avião** quando é fora de casa), contrata e vende, e tem vida social fora do campo.
- O que acontece em campo repercute: um jogo ruim vira manchete e crítica no programa de TV; um bom também.
- No começo é só treinador e para uma pessoa (cada um com a sua carreira). Depois:
  - mais ligas (Premier League e LaLiga);
  - multijogador;
  - talvez um "Rumo ao Estrelato".

## O que já existe e deve ser reaproveitado
| O quê | Onde |
| --- | --- |
| Sorteio com semente (`sorteDe`), simulação de jogo, formações, encaixe por posição | `simulador.js` (`FORMATIONS`, `FIT`) |
| Duelo de pênalti nos 6 cantos, tempos e chance de isolar | `public/leilao/ritmo.js` (`ZONAS`, `DUELO`), servidor em `server.js` (`abreDuelo`) |
| Replays de gol em pixel-art (20 tipos de gol, 45 comemorações) | `public/leilao/lances*.js` |
| Rosto 16x16 de cada jogador e uniforme por clube | `public/leilao/rostos.js` (`KITS`, `cabeca`, `uniformeDe`) |
| Notas dos jogadores (estilo FC) | `public/ratings.js` |
| Mapa da Vila, estádios, rodovia, Santos | `public/index.html` (inline) e `public/vila/estadios.js` |
| Ícones desenhados no lugar de emoji | `public/icones.js` |

## Decisões fechadas
1. **Banco de dados: SQLite**, com o `node:sqlite` que já vem no Node (sem dependência nativa).
   - Subir o `Dockerfile` para `node:24-slim`. No Fly, um volume montado em `/data` (`DB_PATH=/data/galera.db`).
   - Sem `DB_PATH`, usa `./dados/galera.db` no computador. Nos testes, `:memory:`.
   - Um arquivo `bd.js` na raiz abre o banco, roda as migrações (`migracoes/NNN-nome.sql`, em ordem, guardadas na tabela
     `migracoes`) e expõe funções pequenas. Nada de ORM.
2. **Quem é você:** sem senha.
   - Ao criar a carreira, nasce um token secreto, guardado no navegador (`carreira:token`).
   - Também aparece um **código de recuperação** (12 letras) para continuar em outro aparelho.
   - O servidor guarda só o hash do token.
3. **O que fica em arquivo e o que fica no banco:**
   - A **base** (clubes, jogadores e atributos no início da temporada) fica em arquivo versionado,
     `public/carreira/base/brasileirao.js` (UMD).
   - O banco guarda só a **carreira de cada um**: o elenco atual de cada clube depois das transferências, os contratos, a
     tabela, os resultados, as finanças, a moral, a reputação, as notícias e a semana atual.
   - Liga nova = arquivo novo de base.
4. **O servidor manda e o sorteio tem semente.**
   - Cada carreira tem uma semente. Cada jogo usa `sorteDe(semente + rodada + jogo)`.
   - As escolhas da pessoa ficam guardadas: recarregar a página não muda resultado nem dá para "tentar de novo".
5. **Canal `/carreira`** no Socket.io, com a página em `public/carreira/`.
   - Na Vila, um prédio novo, a **Sede da Carreira**, leva para lá.
6. **Clubes e jogadores reais, sem escudo oficial.**
   - O escudo é desenhado por nós, com as cores do clube. Nada de logo de clube, de liga ou de patrocinador.
   - Os nomes dos jogadores são os reais.
7. **Três jeitos de jogar cada partida** (escolhidos antes do jogo, com um padrão nas configurações):
   1. **Simulada:** só o resultado e os lances principais.
   2. **Simulada com decisões táticas:** o jogo para no intervalo e em momentos-chave (gol sofrido, cartão vermelho,
      cansaço, aos 70') para trocar mentalidade, formação ou fazer substituições.
   3. **Jogar os momentos decisivos:** além das paradas táticas, você escolhe nos **lances decisivos** (ver abaixo).

## Os lances decisivos (modo 3)
O motor gera os lances; quando um é decisivo, a partida para e mostra a situação com 3 ou 4 opções.
- Cada opção mostra a **chance aproximada de dar certo**, calculada pelas notas de quem está no lance, dos dois lados,
  e pelo encaixe com a tática.
- Exemplo:

  > Ataque perigoso do Real Madrid... você:
  > a) Faz linha de impedimento (35%) · b) Marca em bloco baixo (60%) · c) Mano a mano (45%) · d) Deixa o time pronto para o contra-ataque (30%, mas se der certo vira ataque seu)

| Lance | Opções (cada uma com chance e risco próprios) | Quem conta |
| --- | --- | --- |
| Ataque perigoso contra | linha de impedimento · bloco baixo · mano a mano · preparar o contra-ataque | zagueiros, volantes, goleiro × atacantes |
| Ataque perigoso a favor | chutar de primeira · tocar para quem chega · driblar · cruzar na área | atacantes e meias × defesa |
| Falta a favor perto da área | chute direto (canto da barreira ou do goleiro) · cruzamento · jogada ensaiada | batedor, cabeceadores × goleiro e barreira |
| Falta contra | barreira com mais gente · goleiro adiantado · marcar por zona | goleiro, zaga × batedor |
| Pênalti a favor/contra | os **6 cantos** do Leilão (`ZONAS`); o adversário escolhe sozinho, pela "mania" do batedor/goleiro | batedor × goleiro |

- O tempo para decidir é de 20 s; sem resposta, vai a opção mais segura.
- O resultado sai numa **cena curta em pixel-art**: o gol reaproveita os replays do Leilão; a defesa e o desarme ganham
  uma cena simples nova.
- Em média, de 3 a 6 lances decisivos por jogo, para não cansar.

## O mundo (o universo da Vila)
- **A cidade da carreira** é o mapa grande da Vila, em modo de um jogador só: você anda com o seu boneco.
  - Os lugares, cada um com uma porta:
    - **CT**: treino da semana e conversa com jogadores;
    - **Estádio do clube**: os estádios que já existem viram a casa dos clubes paulistas, e os outros clubes ganham
      um estádio genérico;
    - **Aeroporto** (novo): jogos fora;
    - **Casa**: descanso, família;
    - **Bar / restaurante**: vida social;
    - **Estúdio de TV**: o programa;
    - **Banca de jornal**: notícias;
    - **Sala da diretoria**.
  - Para usar o mesmo mapa, a Fase 7 primeiro tira o desenho do mapa do `public/index.html` para um módulo
    `public/vila/mapa.js`, usado pela Vila e pela Carreira.
- **Jogo fora:** no Aeroporto, uma cena curta do avião voando sobre um mapa do Brasil em pixel, até a cidade do jogo.
  - Na volta, você está de novo na cidade.
  - Viajar gasta tempo da semana e cansa o elenco: o custo da viagem conta no motor.
- **A semana:** cada semana tem de 3 a 5 "horários" livres. Cada atividade gasta um e mexe nos números:
  - treino tático: entrosamento;
  - treino físico: preparo, com risco de lesão;
  - descanso: energia;
  - jantar com o elenco: moral;
  - entrevista: reputação, que pode subir ou descer;
  - festa: moral do técnico e risco de manchete;
  - família: o humor do técnico.
  - Não precisa andar no mapa: dá para escolher pelo menu também (o mapa é o jeito bonito, o menu é o jeito rápido).

## Repercussão (mídia, torcida e diretoria)
- **Números da carreira:** reputação do técnico (0 a 100), **pressão da diretoria**, humor da torcida, moral do
  elenco e confiança de cada jogador.
- **Notícias:** geradas por modelo (template) a partir dos fatos.
  - Exemplos de fatos: goleada, virada, sequência de derrotas, contratação, briga com jogador, lance decisivo errado.
  - Cada notícia tem manchete, linha fina e um ícone desenhado.
  - Uma notícia ruim é mais provável quando o técnico gastou "festa" na semana.
- **Programa de TV** ("Mesa Redonda da Galera"): depois de cada rodada, 3 comentaristas fictícios em pixel-art dão
  nota ao técnico e falam dos jogos dele. Pelo menos 60 bordões, com variáveis (nome do técnico, do clube, do placar).
  - Quem quiser pode reaproveitar a ideia do `bordoes.js` do Leilão.
- **Diretoria:** a meta da temporada depende do tamanho do clube (título, Libertadores, meio da tabela, não cair).
  - Com a pressão no máximo, você é **demitido** e recebe propostas de clubes menores (ou fica desempregado umas rodadas).
  - Com uma temporada boa, chegam propostas de clubes maiores.

## Transferências
- **Janelas:** a do começo da temporada e a do meio do ano. Fora delas, só jogador sem contrato.
- **Fazer uma proposta:** valor, salário e duração.
  - O clube aceita, recusa ou faz contraproposta conforme o valor do jogador, a vontade de vender e o caixa.
  - O jogador também precisa topar, conforme o salário, o tamanho do clube e o tempo de jogo prometido.
- Os **outros clubes** também compram e vendem entre si, com uma IA simples por necessidade de posição e caixa. Tudo
  vira notícia.
- **Finanças:** caixa, folha salarial e as receitas (bilheteria por mando de campo, TV por posição, premiação), mais as
  vendas.
- Atributos mudam com idade, treino e minutos jogados. Do fim dos 31 anos em diante, caem. Há aposentadoria e jovens
  da base surgindo.

## A base de jogadores (Brasileirão)
- Os 20 clubes da Série A, cada um com:
  - nome;
  - nome curto (3 letras);
  - cidade;
  - as cores (camisa 1 e 2);
  - o estádio (nome popular);
  - o tamanho (de 1 a 5);
  - o caixa inicial.
- Cada clube tem de 25 a 30 jogadores, cada um com:
  - nome e idade;
  - posição principal e as secundárias;
  - pé;
  - nota geral (estilo FC);
  - 6 atributos (ritmo, finalização, passe, drible, defesa, físico), mais os de goleiro;
  - valor de mercado, salário e fim de contrato;
  - a "mania" no pênalti, para batedores e goleiros.
- **Atenção à verdade:** elenco muda toda semana.
  - O arquivo tem um cabeçalho com a data em que os elencos foram montados.
  - Jogador com nota estimada leva a marca `est`, como no `ratings.js`.
  - O Codex **não pode inventar jogador**. Se não tiver certeza de um elenco, deixe o clube com os nomes de que tem
    certeza e complete com jovens da base fictícios marcados `base: true`, para a gente revisar.
- Um teste confere cada clube:
  - pelo menos 3 goleiros, 8 defensores, 7 meias e 5 atacantes;
  - notas de 50 a 92;
  - nomes sem repetir no mesmo clube.

## Fases (um PR cada)

### Fase 0: banco de dados
- `bd.js` e `migracoes/001-inicio.sql` (tabelas `carreiras`, `migracoes`).
- `node:sqlite`, `DB_PATH`, `Dockerfile` em `node:24-slim`, `.gitignore` com `dados/*.db`.
- `DEPLOY-FLY.md` explica como criar o volume e montar em `/data` (`[mounts]` no `fly.toml`), e o backup (os snapshots
  diários do Fly e como baixar o arquivo).
- Testes com `:memory:`.
- **Pronto quando:** o servidor sobe com e sem `DB_PATH`, as migrações rodam uma vez só, e o resto do site continua igual
  (`npm test` passa).

### Fase 1: a base do Brasileirão
- `public/carreira/base/brasileirao.js` com os 20 clubes, os elencos, os escudos desenhados (cores e um desenho simples
  por clube) e os uniformes.
- O teste de validação da seção acima.
- **Pronto quando:** o teste passa e o PR traz um resumo por clube (quantos jogadores, a média das notas e os 5 melhores)
  para a gente revisar.

### Fase 2: o motor da partida (sem tela)
- `public/carreira/motor.js` (UMD): uma partida minuto a minuto, com semente.
  - As forças por setor vêm da escalação e da formação (`FORMATIONS`/`FIT` do `simulador.js`).
  - Tática: mentalidade, pressão e altura da linha.
  - Cansaço, cartões, lesões, substituições e mando de campo.
- Gera eventos (gol, chance, defesa, falta, cartão, lance decisivo) e para nos pontos de decisão conforme o modo (1, 2
  ou 3), como o Leilão já faz com o pênalti (`PARAR` e simular de novo com as decisões).
- Os lances decisivos com as opções e as chances da tabela acima.
- **Testes estatísticos** em 10 mil jogos:
  - média de 2,2 a 2,8 gols por jogo;
  - mandante vence de 42% a 50%;
  - empate de 24% a 30%;
  - o clube mais forte (+8 de nota média) vence pelo menos 60%;
  - a mesma semente com as mesmas decisões dá o mesmo jogo.
- **Pronto quando:** os testes passam e o PR traz uma tabela com uma temporada inteira simulada.

### Fase 3: a temporada jogável, por menus
- Canal `/carreira` e página `public/carreira/` com:
  - criar a carreira (nome do técnico, skin e clube) e o código de recuperação;
  - escalação e tática;
  - calendário das 38 rodadas (turno e returno, sorteado pela semente);
  - tabela;
  - os outros jogos da rodada simulados;
  - fim de temporada e a próxima.
- A partida aparece como texto ao vivo com placar, nos 3 modos, e tudo fica salvo no banco.
- **Pronto quando:** dá para jogar uma temporada inteira do começo ao fim, fechar o navegador no meio e voltar de onde
  parou (inclusive em outro aparelho, com o código).

### Fase 4: a partida na tela
- Um campinho em pixel-art visto de cima, com os bonecos nas cores dos clubes (`rostos.js`), a bola andando pelos
  eventos e o placar.
- A tela do lance decisivo com as opções e as chances.
- O pênalti com os 6 cantos (o mesmo visual do Leilão).
- Os replays dos gols com `lances.js`.
- **Pronto quando:** um jogo no modo 3 é jogável e bonito, com fotos no PR.

### Fase 5: transferências e dinheiro
- As janelas, as propostas e contrapropostas, os contratos e as finanças.
- A IA dos outros clubes.
- A evolução dos jogadores entre as temporadas, as aposentadorias e a base.
- **Pronto quando:** em 3 temporadas simuladas os elencos mudam de forma razoável (sem clube com 50 jogadores nem caixa
  infinito; o PR mostra os números).

### Fase 6: repercussão
- As notícias, o programa de TV, a reputação, a pressão da diretoria, a demissão e as propostas, a torcida e a moral.
- **Pronto quando:** uma goleada sofrida gera manchete e crítica, uma vitória grande gera elogio, e uma sequência ruim
  leva à demissão.

### Fase 7: o mundo 8 bits
- Tirar o desenho do mapa para `public/vila/mapa.js` (a Vila tem que continuar idêntica: foto antes e depois).
- A cidade da carreira com os lugares, a semana com os horários e as atividades, o Aeroporto com a cena do voo e a Sede
  da Carreira na Vila.
- **Pronto quando:** dá para viver uma semana inteira andando pelo mapa (CT → casa → estádio, ou aeroporto num jogo fora).

### Depois (cada um vira um plano próprio)
- Premier League e LaLiga (arquivos de base novos e o avião internacional).
- Copa do Brasil e Libertadores.
- Multijogador (ligas com amigos, cada um num clube).
- Rumo ao Estrelato.

## Perguntas em aberto (responder antes da fase indicada)
- **Fase 1:** a temporada da base é a de 2026, com os elencos de agora?
- **Fase 3:** dá para trocar de clube ao criar a carreira, ou é obrigatório começar num clube pequeno?
- **Fase 6:** os comentaristas do programa são fictícios ou inspirados em gente real (só no estilo, sem nome)?
