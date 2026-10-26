# Temporada de F1 na Corrida: plano em PRs

A ideia: a Corrida da Galera (o F1 3D de `public/corrida/`) ganha um modo carreira de Fórmula 1.
- Cada jogador assume uma **equipe** do grid real de 2026 (como a Carreira assume um clube): monta o carro com peças,
  contrata o companheiro e os engenheiros, tudo dentro de um **teto de gastos**.
- Joga uma **temporada** de GPs, com classificação, corrida, pneus, pit stop, DRS, ERS, bandeiras e safety car.
- No fim de cada GP vale a **pontuação oficial**, e a temporada tem o **campeonato de pilotos** e o **de construtores**.
- As outras equipes são **robôs** com os **pilotos reais de 2026** (os de `corrida-robos.js`, agora com carro, piloto
  e estratégia). O jogo é só para os amigos, então os nomes de equipes e pilotos são os de verdade.
- **Primeiro solo.** Depois, a mesma temporada **em grupo**: cada amigo com a sua equipe, todos no mesmo grid.

A entrega agora está dividida em **5 PRs grandes**, um de cada vez, sempre a partir de `origin/main` depois do
anterior entrar. Cada PR termina jogável; sem as regras de F1, a Corrida da Galera continua como antes.

| PR | Entrega jogável | Detalhes originais |
| --- | --- | --- |
| 1 | Corrida F1 completa: estratégia dos robôs, pneus, DRS, ERS, bandeiras e safety car | PRs 2 a 4 |
| 2 | Fim de semana: classificação, grid de 20, cinco luzes, pontos e pilotos reais | PRs 5 e 7 |
| 3 | Equipe: orçamento, montagem do carro, pilotos e engenheiros | PRs 6 e 7 |
| 4 | Temporada solo: save, sede, calendário, campeonatos e desenvolvimento | PRs 8 a 10 |
| 5 | Temporada com amigos: sala, GP ao vivo e mercado disputado | PRs 11 a 13 |

As seções antigas abaixo continuam como referência de regras e números; a divisão acima define os PRs.
Cada branch registra apenas as suas novidades em `brach.md`.

Antes de começar, leia o `CLAUDE.md` inteiro (principalmente a linha da Corrida) e os arquivos que este plano cita:
`public/corrida/fisica.js`, `cambio.js`, `carros.js`, `pistas.js`, `estado.js`, `jogo.js`, `hud.js`, `menus.js` e, no
servidor, `corrida.js` e `corrida-robos.js`. Para o jeito de dividir uma carreira em PRs, veja `planos/carreira.md` e
`planos/carreira-online.md`: este plano segue o mesmo caminho (as regras primeiro, depois o solo, depois o grupo).

---

## 0. Regras do projeto (valem para todos os PRs)

- **Branch e PR:** uma branch nova a partir de `origin/main` por PR, e um PR para `main`. Nada de PR em cima de PR.
- **`brach.md`:** atualizado com as novidades desta branch; o corpo do PR usa esse texto.
- **`CLAUDE.md`:** atualizado com os arquivos e campos novos (a linha da Corrida e, quando nascer, uma linha nova para a
  Temporada).
- **Português** na tela, nos comentários e nos nomes, no tom dos arquivos de hoje.
- **Finais de linha:** mantenha os de cada arquivo (os da Corrida são CRLF). Se o diff virar o arquivo inteiro, está
  errado.
- **A Corrida de hoje continua igual.** Tudo o que é de F1 fica atrás de uma opção (`config.regras === "f1"` na sala,
  ou o modo GP da temporada). Sem a opção, a sala de hoje corre como antes: caixas, ajuda de pelotão, câmbio, robôs.
  Os testes de hoje (`tests/corrida-*.test.js`) continuam passando sem mudar.
- **Regras puras num arquivo só, para os dois lados.** As contas de pneu, DRS, ERS, pontuação e montagem vão para
  arquivos UMD como `pistas.js` (o mesmo código no navegador e no servidor, testável com `node --test`). A física do
  carro continua no navegador (`fisica.js`); o servidor confere o que dá para conferir (paradas, compostos, ordem,
  penalidades, pontos).
- **O servidor manda no resultado.** Tempo de volta, paradas registradas, penalidades, classificação final e pontos
  saem do servidor. O navegador só desenha e pede.
- **Sorteio com semente.** Quebra, incidente de robô e safety car saem de uma semente guardada no GP (`rng` de
  `estado.js`, ou um igual no servidor): recarregar a página nunca muda um resultado.
- **Nada no save muda no meio de um GP.** O resultado só entra no save quando a corrida termina.
- **Celular:** cada botão novo (ERS, box, DRS) tem o seu toque em `controles.js`, ao lado dos de hoje.
- **Animações:** respeite "menos movimento" (`prefers-reduced-motion`), como a lanterna de `carros.js` já faz.
- **Desempenho:** o grid de F1 tem 22 carros. Os outros 21 usam `f1/f1-leve.glb`, sem sombra projetada, como hoje.
  Meça em Mônaco (a pista mais pesada) e escreva no `MUDANCAS.md` os quadros por segundo antes e depois.
- **Regras de mesa (memória do projeto): nada de "todo mundo aperta Pronto".** No grupo, quem avança é o criador, e as
  decisões têm tempo (sem resposta, vale a padrão).
- **Qualidade antes de quantidade.** Se um PR ficar grande demais, corte o enfeite e entregue a base bem feita.
- **Conferir antes de abrir o PR:**
  - `npm test` passando, com os testes novos dentro do `"test"` do `package.json` (o padrão `tests/*.test.js` já pega);
  - jogar uma corrida de verdade com a opção nova e uma sem ela;
  - fotos em `planos/imagens/`;
  - se o navegador do teste não abrir no seu ambiente, diga isso no `MUDANCAS.md` em vez de dizer que conferiu.

---

## Decisões do Thiago

O Thiago respondeu às quatro perguntas da primeira versão deste plano:

| Pergunta | Resposta |
| --- | --- |
| Pilotos e equipes inventados ou os de verdade? | **Os reais de 2026.** |
| DRS clássico ou a aerodinâmica ativa de 2026? | **DRS clássico.** |
| Os 8 GPs e as pistas da tabela do PR 8 estão bons? | **Estão.** |
| Dois amigos na mesma equipe? | **Sim.** |

## Decisões tomadas (padrões que o Thiago pode mudar)

| Assunto | Decisão |
| --- | --- |
| Equipes | **As 11 equipes de 2026**, 2 carros cada: McLaren, Ferrari, Mercedes, Red Bull, Racing Bulls, Aston Martin, Williams, Audi, Alpine, Haas e Cadillac. Os nomes de verdade (o jogo é só para os amigos, como as marcas de `marcas.js`). |
| Pilotos | **Os 22 titulares de 2026** (a tabela do PR 7), mais alguns reservas para o mercado. Atributos estimados por nós; o Thiago revisa a tabela. |
| Você | **Assume uma das 11 equipes** e é o **piloto 1** dela (não custa salário): escolhe qual dos dois titulares sai do carro, e esse vai para o mercado. O piloto 2 é o outro titular, um robô (dá para trocar no mercado). |
| Grid | **22 carros.** Se o desempenho não deixar, o padrão cai para 12 (as 6 primeiras equipes do ano anterior mais a sua) e isso vai para o `MUDANCAS.md`. |
| Pintura | A de cada equipe. As que já existem em `MODS.pintura` viram as das equipes (Rosso: Ferrari; Papaia: McLaren; Flecha de Prata: Mercedes; Touro Azul: Red Bull; Verde Inglês: Aston Martin; Azul Francês: Alpine; Azul Marinho: Williams; Clássico 88: Haas; Preto e Ouro: Cadillac), e entram as que faltam (Audi e Racing Bulls), conferidas nas fotos de 2026. |
| Calendário | **8 GPs** (padrão). Curto: 4. Completo: 10. As pistas de fantasia (Luigi, Sorvete, Arco-íris) ficam de fora. |
| Voltas por GP | 3, 5 (padrão) ou 8. O desgaste dos pneus é medido em **fração da corrida**, então mesmo com 3 voltas há estratégia de uma parada. |
| Pontuação | A oficial: **25, 18, 15, 12, 10, 8, 6, 4, 2, 1** do 1º ao 10º. **Sem ponto pela volta mais rápida** (a F1 tirou em 2025). |
| Construtores | Soma dos pontos dos dois carros da equipe. |
| Desempate | Mais vitórias; depois mais 2ºs lugares; depois mais 3ºs; e assim por diante. |
| Classificado | Quem completou pelo menos 90% das voltas do vencedor entra no resultado (e pode pontuar), mesmo sem cruzar a chegada. |
| Pneus | Macio, médio e duro (secos). **Na corrida é obrigatório usar dois compostos diferentes.** Chuva fica para o PR 14. |
| Combustível | Não tem (a F1 não reabastece; o peso do tanque não muda o jogo o bastante para valer a conta). |
| DRS | **O clássico** (decisão do Thiago): a asa móvel com zonas por pista, ativação a menos de 1 s do carro da frente no ponto de detecção, desligada nas 2 primeiras voltas e com bandeira amarela ou safety car. Mesmo com os pilotos de 2026, não entra a aerodinâmica ativa. |
| ERS | Bateria que carrega na freada e gasta num botão de desdobrar. Automático por padrão; o jogador pode passar para manual. |
| Teto de gastos | **M$ 140 milhões** por temporada (moeda do jogo). Peças e desenvolvimento entram no teto; salários dos pilotos não (como na F1). |
| Sair no meio do GP (solo) | 60 s fora da corrida é **abandono**: o carro sai e o resultado vale. Não dá para "recomeçar o GP" para fugir de um resultado ruim. |
| Itens e ajuda de pelotão | **Desligados** no modo F1 (`caixas: false`, `equilibrio: false`). O vácuo e o estilingue continuam. |
| Câmbio | O da sala de hoje (`cambio.js`, automático ou manual). |
| Nível dos robôs | Fácil, médio (padrão) e difícil, os mesmos `RITMO` de hoje, multiplicados pelo carro e pelo piloto de cada robô. |

---

## Como a física de hoje recebe as regras de F1

Hoje cada carro é um conjunto de números (`CARROS` em `pistas.js`: `vmax`, `acc`, `brake`, `grip`, `kin`, `turn`,
`scrub`, `offMax`, `wall`), e `physics(dt, spec)` em `fisica.js` já recebe esse `spec` de fora
(`spec = carOf(me())`). Esse é o gancho de tudo:

- **A montagem do carro** (PR 6) gera um `spec` com os mesmos campos. `carOf(p)` em `estado.js` passa a devolver
  `p.spec` quando o jogador tem um, e `CARROS[p.car]` quando não tem. O servidor manda o `spec` no `publicState`, então
  todos os navegadores usam o mesmo número para o mesmo carro.
- **Os pneus** multiplicam a aderência na linha dos pneus de `fisica.js`
  (`const g = spec.grip * (road ? 1 : 0.5) * (c.slip > 30 ? spec.kin : 1) * dt`): `grip` vezes `pneu.grip` e `kin`
  vezes `pneu.kin`. O desgaste anda no fim do `physics`, pelo tempo e por `c.slip`.
- **DRS e ERS** entram no mesmo lugar que o vácuo, o turbo e a estrela: o `boostK` (velocidade final) e o fator da
  arrancada na linha do `keys.gas`. Nada de caminho novo; só termos novos na mesma conta.
- **O pit stop** usa o mesmo jeito da **bala** de hoje (o bico mira um ponto lá na frente e a velocidade vai para um
  alvo, sem escorregar): no corredor dos boxes o carro anda sozinho no limitador, para, troca os pneus e volta.
- **O safety car** é um teto na velocidade final (`Math.min(vmax, race.limite)`), mandado pelo servidor.
- **Os robôs** (`corrida-robos.js`) já têm a mesma arrancada e a mesma velocidade final de quem joga. Ganham os mesmos
  multiplicadores (pneu, DRS, ERS, limite do safety car) no `alvo` e no `c.acc`, e `perfil(pista, carro)` passa a
  aceitar um `spec` em vez do nome do carro (a chave do cache vira o `spec` em texto).

As contas novas ficam em **`public/corrida/f1-regras.js`** (UMD, como `pistas.js`: `window.F1Regras` no navegador,
`require` no servidor). Ele não importa nada de Three.js.

---

## Parte A: dirigibilidade e regras de F1 (na sala de hoje)

Os PRs 1 a 5 ligam as regras de F1 como uma **opção da sala** ("Regras: Corrida da Galera / Fórmula 1", em
`menus.js`, ao lado do câmbio). Assim a galera já testa os pneus e o pit stop numa sala comum, antes de existir a
temporada.

## PR 1: Os pneus (compostos, desgaste e temperatura)

**Objetivo:** o carro perde aderência com o desgaste, e cada composto tem um jeito.

- **`public/corrida/f1-regras.js`** (novo), com `PNEUS`:

| Composto | Aderência no auge | Dura (fração da corrida até o "penhasco") | Esquenta |
| --- | --- | --- | --- |
| Macio | 1,06 | 0,35 | rápido |
| Médio | 1,03 | 0,60 | médio |
| Duro | 1,00 | 0,90 | devagar |

  - `pneuNovo(composto)` → `{ composto, desgaste: 0, temp: 0.6 }`;
  - `gastarPneu(pneu, dt, { slip, v, vmax, voltas, tempoVolta })`: o desgaste cresce pelo tempo (escalado pela
    distância da corrida, `voltas × tempoVolta`) e mais quando o carro escorrega (`slip`). A temperatura sobe com a
    velocidade e o escorregão, e cai devagar;
  - `aderencia(pneu)` → `{ grip, kin }`: o auge do composto, menos o desgaste (devagar até o penhasco, aos 80% de
    desgaste, e rápido depois dele), e menos com pneu frio (0,92 de saída).
- **`fisica.js`:** com `config.regras === "f1"`, multiplica `grip` e `kin` pela `aderencia` e chama `gastarPneu` no
  fim do quadro. O estado fica em `race.pneu`.
- **Largada:** todo mundo sai de médio neste PR (a escolha vem com o pit stop, no PR 2).
- **Robôs:** `corrida-robos.js` guarda `ia.pneu`, gasta com a mesma função (com o `slip` estimado pela curvatura do
  traçado) e multiplica o `alvo` nas curvas pela aderência.
- **HUD (`hud.js`):** o pneu no canto do velocímetro: a cor do composto (vermelho, amarelo, branco, como a Pirelli),
  o anel que esvazia com o desgaste e um azulzinho quando está frio. As marcas de `marcas.js` já têm a Pirelli para
  enfeitar.
- **Testes** (`tests/corrida-f1-pneus.test.js`):
  - o macio é mais rápido no começo e chega ao penhasco antes do duro;
  - a mesma corrida com 3 e com 8 voltas gasta a mesma fração de pneu;
  - escorregar gasta mais que andar limpo;
  - `aderencia` nunca fica abaixo de 0,7 nem acima de 1,1.
- **Como testar na mão:** sala com "Fórmula 1", 8 voltas em Interlagos. Na última volta o carro escorrega mais nas
  curvas e o anel do pneu está quase vazio. A mesma sala com as regras de hoje corre igual a antes.
- **Fora deste PR:** trocar o pneu.

## PR 2: O pit stop (o corredor dos boxes e a troca de pneus)

**Objetivo:** parar no box, trocar de composto e voltar, perdendo o tempo certo.

- **`pistas.js`:** cada pista das que entram no calendário ganha `boxes: { entra, para, sai, lado }` (frações da volta
  e o lado da reta). O corredor é uma faixa paralela à reta dos boxes, do lado de dentro, atrás de uma mureta. Em
  Mônaco, a entrada e a saída casam com as linhas SC 1 e SC 2 que `monaco-detalhes.js` já pinta.
- **`pista.js`:** desenha o corredor (asfalto, a linha branca de entrada, a mureta e as 10 garagens com a cor de cada
  equipe). Uma só malha por material, como o resto da pista.
- **`fisica.js`:** o estado `race.box`:
  - o jogador aperta **B** (ou o toque "Box" no celular) para pedir a parada; o HUD mostra "BOX" e o composto escolhido
    (troca com as setas enquanto o aviso está aceso);
  - passando pela entrada com o pedido, o carro entra no corredor e anda sozinho (o mesmo controle da bala) no
    **limitador**, 30% da velocidade final;
  - na garagem, para por `tempoDeParada` (2,4 s de base, mais o sorteio do erro do mecânico, de 0 a 1,5 s, com a
    semente do GP);
  - sai com o pneu novo, frio, e volta para a pista na saída do corredor.
- **Servidor (`corrida.js`):** o evento `act` `box` (com o composto). O servidor registra a parada (volta, tempo,
  composto) em `p.paradas`, confere o limitador pelo tempo entre a entrada e a saída (rápido demais: 5 s de
  penalidade, que entra no PR 4) e anuncia no log.
- **Regra dos dois compostos:** quem termina a corrida sem ter usado dois compostos leva **+10 s** no resultado.
  Escolha do composto da largada no lobby da sala (macio, médio ou duro).
- **Robôs:** cada um sai com uma **estratégia** (`f1-regras.js`, `estrategia(voltas, nivel, semente)`: uma ou duas
  paradas, em que fração da corrida e com quais compostos). O robô entra no corredor pelo mesmo caminho (lado de
  dentro, limitador) e perde o mesmo tempo. Com o pneu no penhasco antes da hora, antecipa a parada.
- **Testes** (`tests/corrida-f1-box.test.js`):
  - uma parada custa entre 18 e 25 s em Interlagos (entrada + limitador + parada + saída), pelas contas da pista;
  - o servidor dá +10 s a quem usou um composto só;
  - a estratégia dos robôs sempre usa dois compostos e nunca para na última volta;
  - o mesmo GP com a mesma semente dá os mesmos erros de mecânico.
- **Como testar na mão:** 5 voltas de médio, box na volta 3 para o duro. A torre de posições mostra quem já parou.
  Os robôs param espalhados entre a volta 2 e a 4.

## PR 3: DRS e ERS

**Objetivo:** ultrapassar em reta tem ferramenta, e a energia vira escolha.

- **DRS** (o clássico, decisão do Thiago: nada de aerodinâmica ativa):
  - `pistas.js`: `drs: [[deteccao, abre, fecha], ...]` (frações da volta), uma ou duas zonas por pista do calendário
    (Interlagos: a reta dos boxes e a Reta Oposta; Mônaco: só a reta dos boxes);
  - **o servidor decide**: guarda a hora em que cada carro passou pelo ponto de detecção (pelo `prog` que já chega no
    `pos` e no robô); quem passou a menos de 1 s do carro da frente ganha `p.drs = true` até o fim da zona. Desligado
    nas 2 primeiras voltas, com bandeira amarela no setor e com safety car;
  - `fisica.js`: com `drs` e a asa aberta, `boostK` ganha +0,05 e o freio no fim da reta fecha a asa. Abrir é
    automático no começo da zona (botão opcional para quem quiser abrir na mão);
  - HUD: a placa "DRS" cinza (disponível na próxima zona), verde (aberto). Na pista, a placa "DRS" nos pontos de
    detecção e de abertura;
  - robôs: o mesmo `+0,05` no `alvo` da reta.
- **ERS:**
  - `f1-regras.js`: `ers = { carga: 0..1 }`, `carregarErs` (na freada forte e tirando o pé, até um máximo por volta) e
    `gastarErs` (enquanto desdobra);
  - desdobrar: `acc` × 1,25 e `boostK` + 0,03 enquanto houver carga;
  - **automático** (padrão): desdobra na saída das curvas lentas e nas retas, guardando um pouco para defender;
    **manual**: o botão **E** (e o toque "ERS" no celular) desdobra enquanto estiver apertado. Opção da sala, como o
    câmbio;
  - **ultrapassagem:** a menos de 1 s do carro da frente, o desdobrar rende +20% (o mesmo ponto de detecção do DRS);
  - HUD: a barra da bateria embaixo do velocímetro;
  - robôs: o modo automático, com uma pitada pela semente para não desdobrarem todos no mesmo lugar.
- **O vácuo de hoje continua** e soma com os dois (o vácuo já enche o estilingue; com DRS, a soma não pode passar de
  `+0,12` no `boostK`, para a reta não virar foguete).
- **Testes** (`tests/corrida-f1-drs-ers.test.js`):
  - DRS só abre a menos de 1 s, só depois da volta 2 e nunca com safety car;
  - a bateria nunca passa de 1 nem fica negativa, e não carrega acima do máximo por volta;
  - num carro igual, DRS + ERS ganham entre 6 e 12 de velocidade numa reta longa (Interlagos).
- **Como testar na mão:** grudar num robô na Reta Oposta: a placa fica verde e dá para passar no fim da reta. No manual,
  gastar a bateria inteira na reta e sentir a falta dela na próxima.

## PR 4: Bandeiras, limites de pista, penalidades e safety car

**Objetivo:** a corrida tem juiz, e um acidente muda a estratégia.

- **Bandeiras** (o servidor decide, o navegador mostra no HUD e nos postos de fiscais que `monaco-ambiente.js` já
  desenha):
  - **amarela:** um carro parado ou lento (menos de 30% da velocidade final por mais de 2 s) ou uma batida forte
    deixam o setor amarelo por alguns segundos. Ultrapassar ali dá aviso e, na segunda vez, 5 s;
  - **azul:** o líder a menos de 1,5 s atrás de um retardatário. O robô retardatário abre (o `passSide` de hoje); o
    humano vê o aviso e, se segurar o líder por 3 bandeiras, leva 5 s;
  - **preta e branca:** aviso de limites de pista;
  - **verde** e **quadriculada**, como hoje.
- **Limites de pista:** passar com o carro todo da largura da pista mais a zebra (`tr.W / 2` + margem, no navegador,
  conferido pelo servidor com o `pos`) conta um aviso; ganhou tempo com isso? O 4º aviso dá 5 s. Os checkpoints de
  hoje continuam cuidando do atalho.
- **Penalidades:** `p.penal` (segundos), somadas no tempo final pelo servidor. O resultado mostra "+5 s" ao lado do
  nome. Sem "drive-through" neste plano.
- **Safety car virtual (VSC)** primeiro: o servidor manda `room.limite` (uma fração da velocidade final de cada carro);
  `fisica.js` e os robôs respeitam o teto. HUD: "VSC" amarelo e o delta.
- **Safety car de verdade** depois, no mesmo PR se couber (se não couber, fica para o PR 5):
  - um carro do servidor (um robô especial com a pintura do SC e o pisca no teto) entra na frente do líder;
  - ninguém ultrapassa: o servidor compara a ordem pelo `prog`; quem passa tem que devolver em 5 s ou leva 5 s;
  - os carros ficam em fila atrás dele (os robôs miram 40 de distância do carro da frente);
  - "SC nesta volta" no HUD, o SC sai na entrada dos boxes e a relargada é lançada na linha de chegada;
  - box com SC custa menos (os outros andam devagar): a estratégia aparece sozinha.
- **Quando entra o SC:** um carro parado na pista (humano ou robô) por mais de 5 s, ou uma quebra de robô sorteada pela
  semente (a confiabilidade do motor, no PR 6). No máximo 2 por GP.
- **Testes** (`tests/corrida-f1-bandeiras.test.js`):
  - ultrapassar na amarela dá aviso e depois 5 s;
  - o 4º aviso de limite de pista dá 5 s;
  - com SC, o servidor pune quem passa e não pune quem devolve;
  - a classificação final soma as penalidades e mostra a ordem certa.
- **Como testar na mão:** parar o carro no meio de Mônaco. O setor fica amarelo, depois o SC entra e os robôs fazem
  fila. Na relargada, ninguém passa antes da linha.

## PR 5: Classificação, grid de 22 e a largada com as cinco luzes

**Objetivo:** o fim de semana de GP completo numa sala comum.

- **Classificação:** volta lançada (simples, como no jogo de F1 em modo curto): cada humano tem **uma volta de saída e
  duas lançadas**; vale a melhor. Os robôs ganham o tempo pelas contas de hoje (`tempoDaVolta(pf, escala)`, com o carro
  e o piloto) mais um ruído pela semente. O grid sai da ordem dos tempos (hoje é embaralhado em `startRace`).
  - Nesta fase só um carro na pista de cada vez para quem está classificando (os outros humanos não colidem: modo
    fantasma de `fantasma.js`).
- **Grid de 22:** `cleanConfig` aceita até 21 robôs no modo F1 (hoje são 7). Os robôs entram no mesmo pacote `ghosts`
  de hoje. Meça Mônaco com 22 carros; se cair demais, `desfoque.js` já baixa a qualidade sozinho, e o padrão vira 12.
- **Largada:** as cinco luzes vermelhas que acendem uma por segundo e apagam juntas (no lugar da contagem de hoje,
  só no modo F1). Queimar a largada (acelerar antes de apagar e sair) dá 5 s.
- **Resultado:** a tela de fim mostra a ordem com voltas, tempo, diferença, paradas, penalidades e os **pontos
  oficiais** (`f1-regras.js`, `PONTOS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]`, `pontosDoGP(classificacao)`), e quem
  não completou 90% aparece como "NC".
- **Testes** (`tests/corrida-f1-gp.test.js`):
  - o grid sai da classificação, com empate decidido por quem fez o tempo primeiro;
  - os pontos do 1º ao 10º são os oficiais; do 11º para trás, zero; NC, zero;
  - queimar a largada dá 5 s.
- **Como testar na mão:** sala com 1 humano e 21 robôs em Interlagos, 5 voltas: classificar, largar nas luzes, parar
  no box e ver os pontos no fim.

---

## Parte B: a equipe (o carro sob o teto de gastos)

## PR 6: A montagem do carro

**Objetivo:** cada equipe tem um carro feito de peças, e o carro vira o `spec` da física.

- **`public/corrida/temporada/montagem.js`** (UMD, novo):
  - as **peças**, cada uma em 3 a 4 opções com preço, e o que cada uma mexe nos números de `CARROS`:

| Peça | Mexe em | A escolha |
| --- | --- | --- |
| Unidade de potência (4 fornecedores) | `vmax`, `acc`, a bateria do ERS e a confiabilidade | potência contra quebra e preço |
| Aerodinâmica (asa e assoalho) | `grip` contra `vmax` (carga contra arrasto) e o ganho do DRS | carro de curva ou de reta |
| Suspensão | `turn`, `kin` e as zebras | firme (vira mais, escorrega mais) ou macia |
| Freios | `brake` e o calor dos discos (o efeito que `carros.js` já desenha) | |
| Câmbio | o tempo da troca no manual e a confiabilidade | |
| Chassi | `wall`, `offMax` e o desgaste dos pneus (carro que trata bem o pneu) | |

  - `specDaMontagem(montagem)` → um objeto com os campos de `CARROS`. **Todo número fica entre o pior e o melhor dos
    cinco carros de hoje** (por exemplo, `vmax` entre 236 e 360), então não existe carro quebrado;
  - `custoDaMontagem(montagem)` e `cabeNoTeto(montagem, teto)`.
- **`estado.js`:** `carOf(p)` devolve `p.spec` quando existe. `corrida.js` aceita o `spec` no modo F1 (vindo da
  temporada, no PR 9; neste PR, de uma montagem escolhida no lobby da sala para testar) e o confere com
  `specDaMontagem` (o navegador não manda números, manda a montagem).
- **`corrida-robos.js`:** `perfil(pista, carro)` aceita o `spec` (a chave do cache vira o `spec` em texto).
- **As 11 equipes de 2026** ganham uma montagem inicial numa tabela (`temporada/equipes.js`, com o nome, a pintura e a
  unidade de potência de verdade de cada uma: Mercedes, Ferrari, Honda, Red Bull Ford, Audi), na ordem de força de
  2025: 4 de ponta, 4 do meio e 3 do fundo, todas dentro do mesmo teto (as de ponta gastam melhor, como na vida real).
  A equipe que você assume começa com a montagem dela, e você pode remontar.
- **Tela:** na garagem da sala (modo F1), um "Montar o carro" com as peças em cartões, o custo contra o teto e as
  barras de reta, curva, freio e confiabilidade. A foto do carro (`carPreview`) com a pintura da equipe.
- **Testes** (`tests/corrida-temporada-montagem.test.js`):
  - toda montagem possível dá um `spec` dentro dos limites;
  - mais aerodinâmica sempre dá mais `grip` e menos `vmax`;
  - nenhuma equipe rival passa do teto;
  - o servidor recusa uma montagem que não cabe no teto.
- **Como testar na mão:** montar um carro de reta e um de curva, correr os dois em Mônaco e em Interlagos e sentir a
  diferença.

## PR 7: Pilotos e engenheiros

**Objetivo:** gente que faz diferença no resultado.

- **`public/corrida/temporada/pilotos.js`** (UMD, novo): **os 22 titulares reais de 2026** (decisão do Thiago), com o
  nome de verdade, o número e a bandeira:

| Equipe | Pilotos |
| --- | --- |
| McLaren | Lando Norris, Oscar Piastri |
| Ferrari | Charles Leclerc, Lewis Hamilton |
| Mercedes | George Russell, Kimi Antonelli |
| Red Bull | Max Verstappen, Isack Hadjar |
| Racing Bulls | Liam Lawson, Arvid Lindblad |
| Aston Martin | Fernando Alonso, Lance Stroll |
| Williams | Alexander Albon, Carlos Sainz |
| Audi | Nico Hülkenberg, Gabriel Bortoleto |
| Alpine | Pierre Gasly, Franco Colapinto |
| Haas | Esteban Ocon, Oliver Bearman |
| Cadillac | Sergio Pérez, Valtteri Bottas |

  Confira a lista no dia do PR (troca de piloto no meio do ano acontece) e diga no `MUDANCAS.md` de onde tirou. Mais
  uns 6 reservas reais para o mercado (os pilotos de teste e reserva das equipes). Cada um tem atributos de 60 a 99
  (estimados por nós, pela temporada de 2025; o Thiago revisa a tabela) e salário:
  - **ritmo** (o multiplicador do `RITMO` do robô), **constância** (o tamanho do ruído volta a volta e a chance de
    erro numa curva), **pneus** (quanto gasta), **largada** (o tempo de reação, o `ia.reacao` de hoje), **ataque** e
    **defesa** (o quanto o robô arrisca o `passSide` e o quanto segura a linha).
  - `ritmoDoRobo(piloto, spec, nivel)` junta tudo numa conta só, que `corrida-robos.js` usa.
- **Engenheiros** (um de cada, 3 opções com preço):
  - **de corrida:** a estratégia (o robô companheiro escolhe melhor a volta da parada) e o rádio (avisos no HUD:
    "pneu no fim", "box nesta volta", "chuva" depois);
  - **chefe de mecânicos:** o tempo base e o erro da parada (o `tempoDeParada` do PR 2);
  - **de aerodinâmica:** o quanto rende o desenvolvimento entre GPs (PR 10);
  - **de motor:** a confiabilidade (menos quebra sorteada).
- **Teto:** os engenheiros entram no teto; os pilotos não (têm um orçamento de salários à parte, para a escolha do
  piloto 2 continuar sendo escolha).
- **O piloto 2 da sua equipe** é um robô com os atributos dele, no seu carro. Ele pontua para os construtores. O
  titular que saiu para você entrar fica no mercado e pode ir para outra equipe na janela (PR 10).
- **Pinturas:** as duas que faltam (Audi e Racing Bulls) entram em `MODS.pintura`, e as de hoje ganham o nome da
  equipe na tela da temporada (a sala comum continua mostrando os nomes de hoje).
- **Testes** (`tests/corrida-temporada-pilotos.test.js`):
  - com o mesmo carro, o piloto de ritmo 95 fecha a volta mais rápido que o de 70, nos três níveis;
  - a constância baixa erra mais, com a mesma semente sempre nos mesmos lugares;
  - um mecânico melhor dá paradas mais curtas na média de 100 sorteios.
- **Como testar na mão:** sala com robôs de pilotos bem diferentes: o de ritmo alto termina na frente na maioria das
  vezes, e o de constância baixa às vezes roda sozinho.

---

## Parte C: a temporada solo

## PR 8: O save da temporada e a sede da equipe

**Objetivo:** criar a sua equipe, montar o carro e ver o calendário, com o save guardado como o da Carreira.

- **Banco:** `migracoes/018-corrida-temporadas.sql` (confira o número livre na hora), a tabela `corrida_temporadas`
  com `token_hash`, `recuperacao_hash`, `nome`, `dados` (JSON), `criada_em`, `atualizada_em`. Em `bd.js`, as mesmas
  funções da Carreira: `criarTemporada`, `temporadaPorToken`, `recuperarTemporada`, `salvarTemporada`,
  `excluirTemporada` (só o hash do token e do código vai para o banco).
- **Servidor:** `corrida-temporada.js` (novo), canal `/corrida-temporada` no Socket.io: `criar` (a equipe que você
  assume entre as 11, qual titular sai do carro, nível dos robôs, tamanho do calendário, voltas por GP), `abrir` (pelo
  token), `recuperar` (pelo código), `montar` (a montagem, conferida com o teto), `contratar` (piloto 2 e engenheiros).
- **O save:**

```
{ versao: 1, equipe: { id: "ferrari", montagem, sai: "hamilton", piloto2, engenheiros, caixa },
  nivel, voltas, calendario: [{ pista, nome, feito: false, resultado: null }], gp: 0, semente,
  rivais: [{ equipe, montagem, pilotos: [id, id] }], pilotos: { id: { pontos, vitorias, posicoes: [] } },
  construtores: { equipe: { pontos, posicoes: [] } } }
```

  `completar(save)` coloca os campos novos com padrão, para saves antigos abrirem sempre.
- **Página:** `/corrida/temporada/` (nova): a **sede** da equipe, no visual da Corrida (fundo do box, cartões):
  - a garagem com o carro (`carPreview`) e o "Montar o carro" do PR 6;
  - os pilotos e os engenheiros, com o mercado do PR 7;
  - o **calendário** (o próximo GP em destaque);
  - as duas **tabelas** (pilotos e construtores), vazias até o primeiro GP;
  - o código de recuperação, como na Carreira.
- **O calendário** (`temporada/calendario.js`, UMD): os GPs de cada tamanho, com o nome de cada um:

| Ordem | GP | Pista |
| --- | --- | --- |
| 1 | GP do Deserto | `deserto` |
| 2 | GP do Japão | `tokyo` |
| 3 | GP de Mônaco | `monaco` |
| 4 | GP do Rio | `rio` |
| 5 | GP da Alemanha | `nurburgring` |
| 6 | GP dos EUA | `laguna` |
| 7 | GP de Las Vegas (à noite) | `losangeles` |
| 8 | GP de São Paulo | `interlagos` |

  O curto (4) fica com Deserto, Mônaco, Nürburgring e Interlagos. O completo (10) põe mais dois: o GP da Áustria na
  Serra Verde (`serra`) e o GP de Singapura em Tóquio à noite. A final é sempre em Interlagos.
- **Na Vila:** a porta da Temporada ao lado do Autódromo (onde fica a torre de recordes), ou um botão na tela inicial
  da Corrida. Escolha no PR o que der menos trabalho e diga no `MUDANCAS.md`.
- **Testes** (`tests/corrida-temporada-save.test.js`): criar, abrir pelo token, recuperar pelo código (o token antigo
  para de valer), montar fora do teto é recusado, um save sem os campos novos abre com `completar`.
- **Como testar na mão:** criar a equipe, montar o carro, contratar, fechar a aba, abrir de novo e estar tudo lá; abrir
  em outro navegador com o código.
- **Fora deste PR:** correr o GP.

## PR 9: O GP pela temporada, a pontuação e os campeonatos

**Objetivo:** jogar a temporada inteira, do primeiro GP ao campeão.

- **"Correr o GP"** na sede: o servidor da temporada abre uma sala do modo F1 em `corrida.js` com uma função nova
  exportada (`abrirGP({ pista, voltas, nivel, semente, grid })`), onde o grid vem do save: você (com o `spec` da sua
  montagem), o seu piloto 2 e os 20 carros das outras 10 equipes, cada robô com o carro da equipe e os atributos do piloto. A sala é privada
  (não aparece na lista da Vila) e só aceita o seu token.
- **O fim de semana:** classificação (PR 5), corrida, resultado. No fim, `corrida.js` chama de volta
  `aoTerminarGP(resultado)` e a temporada aplica no save: pontos de pilotos e de construtores, posições (para o
  desempate), e marca o GP como feito.
- **As tabelas** (`f1-regras.js`: `tabelaPilotos(save)`, `tabelaConstrutores(save)`, com o desempate oficial) na sede
  e no fim de cada GP: quanto cada um ganhou e as setas de quem subiu.
- **Abandono:** 60 s fora da sala no meio do GP é abandono (NC, zero ponto); o GP vale assim mesmo.
- **Fim da temporada:** depois do último GP, a tela do campeão (pilotos e construtores), com o pódio em 3D da Corrida
  e a pintura de cada equipe.
- **Testes** (`tests/corrida-temporada-gp.test.js`):
  - um GP simulado (robôs contra robôs, sem navegador, com `Robos.passo` acelerado) termina, dá os pontos oficiais e
    soma os construtores certo;
  - o desempate por vitórias e depois por 2ºs lugares;
  - o mesmo GP com a mesma semente dá o mesmo resultado entre os robôs;
  - o resultado só entra no save no fim (recarregar no meio não muda nada).
- **Como testar na mão:** temporada curta (4 GPs, 3 voltas), jogar as quatro e ver o campeão. Também abandonar um GP e
  ver o NC na tabela.

## PR 10: Dinheiro, desenvolvimento e a segunda temporada

**Objetivo:** a equipe melhora ao longo do ano, e o ano seguinte começa diferente.

- **Dinheiro entre GPs:** prêmio pela posição no GP (pelos pontos da equipe) e patrocínio fixo pela posição no
  campeonato de construtores. Tudo em `equipe.caixa`, sempre dentro do teto para o que conta no teto.
- **Desenvolvimento:** entre os GPs, comprar melhorias de peça (cada uma +1 nível, até o limite da peça), com o
  rendimento do engenheiro de aerodinâmica. As rivais também evoluem, pela tabela delas e pela semente, para a ponta não
  ficar parada.
- **Confiabilidade:** a peça perto do limite de uso (o motor, por exemplo) aumenta a chance de quebra sorteada; a
  quebra tira o carro do GP (e pode chamar o SC, PR 4).
- **Segunda temporada** (opcional ao fim da primeira): o mercado de pilotos se mexe (contratos de 1 ou 2 anos), as
  rivais trocam de montagem pelo resultado e o teto se renova. A pontuação zera; o histórico fica (títulos, vitórias,
  pódios).
- **Testes** (`tests/corrida-temporada-dinheiro.test.js`):
  - o caixa nunca passa do teto no que conta no teto;
  - comprar uma melhoria muda o `spec` do próximo GP, nunca o do GP em andamento;
  - a segunda temporada zera os pontos e guarda o histórico.
- **Como testar na mão:** fechar a primeira temporada, gastar o prêmio numa asa nova e sentir o carro diferente no GP
  seguinte; começar a segunda.

---

## Parte D: o multiplayer

Segue o caminho da Carreira em grupo (`planos/carreira-online.md`): **a mesma temporada para todos**, com código de
sala, e o criador avançando.

## PR 11: A sala da temporada em grupo

**Objetivo:** abrir uma temporada com os amigos e cada um montar a sua equipe.

- **O save vira da sala:** `corrida_temporadas` ganha a sala (código) e uma lista de humanos, cada um com o seu token.
  A temporada solo continua sendo uma sala de um humano só (o mesmo código, para não ter dois caminhos).
- **Criar e entrar:** o criador escolhe o calendário, as voltas, o nível e o teto; os amigos entram pelo código (os
  campos de sempre, do jeito da Noite). Cada humano escolhe uma das 11 equipes, e **dois amigos podem
  dividir a mesma equipe** (decisão do Thiago), até 22 humanos no total:
  - dividindo a equipe, um é o piloto 1 e o outro o piloto 2: os dois titulares reais saem do carro e vão para o
    mercado;
  - os dois dividem o caixa, a montagem e os engenheiros. Quem entrou primeiro na equipe é o **chefe**: só ele confirma
    a montagem e as contratações; o outro propõe (a proposta aparece para o chefe, que aceita ou não). Ninguém espera
    ninguém: sem resposta do chefe até o GP, fica o que estava;
  - os pontos dos dois somam para a equipe no campeonato de construtores, e cada um tem os seus no de pilotos;
  - o chefe pode passar o cargo para o companheiro na sede.
- **Montagem:** cada um monta o seu carro na sede, ao mesmo tempo. O criador vê quem já montou; quem não montou no
  tempo vai com uma montagem padrão que cabe no teto.
- **Quem avança:** só o criador aperta "Ir para o GP". Nada de "todo mundo pronto".
- **Testes** (`tests/corrida-temporada-sala.test.js`): criar, entrar pelo código, dois na mesma equipe (só o chefe
  confirma a montagem, a proposta do outro chega para ele, os pontos somam nos construtores), a montagem padrão de quem
  não montou, a solo de hoje continua abrindo.
- **Como testar na mão:** três abas (ou três navegadores): duas na mesma equipe e uma em outra.

## PR 12: O GP ao vivo para todos

**Objetivo:** todos os humanos no mesmo grid, com os robôs completando o grid de 22.

- `abrirGP` recebe todos os humanos da sala. Cada navegador roda a física do próprio carro, como a Corrida já faz, e
  as batidas usam a `colisao.js` de hoje.
- **Classificação ao mesmo tempo:** todos na pista, os outros em modo fantasma (sem colisão), com a mesma janela de
  tempo para todos (por exemplo, 4 minutos).
- **Quem cai no meio do GP:** vira robô com o ritmo dele (`bd.ritmoCorrida` já tem a média das cinco melhores voltas de
  cada piloto) e a estratégia padrão; se voltar a tempo, retoma o carro de onde ele está. Ninguém trava a noite.
- **Rádio da equipe:** quem está na mesma equipe vê o HUD do companheiro (pneu, posição) e pode pedir "deixa passar".
- **Pontos e tabelas:** iguais aos do solo, agora com várias equipes humanas.
- **Testes** (`tests/corrida-temporada-grupo.test.js`):
  - dois humanos e 20 robôs: a classificação e os pontos fecham;
  - o humano que cai vira robô e o resultado continua valendo;
  - só o criador abre o GP.
- **Como testar na mão:** uma noite de verdade com dois ou três amigos, temporada curta.

## PR 13: O mercado disputado e o fim da noite

**Objetivo:** a disputa fora da pista, como no Leilão.

- **Mercado de pilotos entre os humanos:** entre as temporadas (e uma janela no meio do ano), o piloto livre vai para
  um **leilão aberto** entre as equipes humanas, com preço mínimo pelo salário. Piloto de uma equipe humana só sai se o
  dono aceitar.
- **Engenheiros** também vão a leilão quando mais de uma equipe quer o mesmo.
- **Fim da noite:** depois da última temporada, o ranking final (títulos de pilotos e construtores, vitórias, pódios,
  pontos), o placar da Noite da Galera (`noite.js`, como a Corrida já faz com o vencedor) e a sala se apaga depois de
  um tempo.
- **Testes** (`tests/corrida-temporada-mercado.test.js`): o lance maior leva, ninguém passa do orçamento de salários,
  o dono do piloto decide, o ranking final.
- **Como testar na mão:** duas equipes humanas disputando o mesmo piloto livre.

## PR 14 (opcional, depois): o acabamento

Só depois que a temporada inteira funcionar:
- chuva (pneus intermediário e de chuva, a pista que seca, `ceu.js` com nuvens) e a escolha de quando trocar;
- corrida sprint em alguns GPs (8, 7, 6, 5, 4, 3, 2, 1 pontos);
- o rádio com voz (a narração que o projeto já gera em `GERAR_NARRACAO.bat`);
- o replay dos melhores momentos (o `fantasma.js` já grava a volta);
- a bandeira vermelha.

---

## Ordem e tamanho

| PR | O quê | Tamanho | Precisa de |
| --- | --- | --- | --- |
| 1 | Pneus (compostos, desgaste, temperatura) | médio | nada |
| 2 | Pit stop e a regra dos dois compostos | grande (o corredor dos boxes em cada pista) | PR 1 |
| 3 | DRS e ERS | médio | PR 2 (o ponto de detecção e a ordem no servidor) |
| 4 | Bandeiras, limites, penalidades e safety car | grande | PR 3 |
| 5 | Classificação, grid de 22, luzes e pontos oficiais | médio | PR 4 |
| 6 | A montagem do carro sob o teto | médio | PR 5 |
| 7 | Pilotos e engenheiros | médio | PR 6 |
| 8 | O save da temporada e a sede | grande | PR 7 |
| 9 | O GP pela temporada e os campeonatos | grande | PR 8 |
| 10 | Dinheiro, desenvolvimento e a segunda temporada | médio | PR 9 |
| 11 | A sala da temporada em grupo | grande (o save vira da sala) | PR 10 |
| 12 | O GP ao vivo para todos | grande | PR 11 |
| 13 | Mercado disputado e fim da noite | médio | PR 12 |
| 14 | Acabamento | pequeno | PR 13 |

**Se precisar cortar para jogar logo:**
- os PRs 1, 2 e 5 já dão uma corrida de F1 com estratégia de pneus na sala de hoje, com os amigos, sem temporada;
- os PRs 3 e 4 podem vir depois do 9 (a temporada funciona sem DRS e sem safety car, só fica mais simples);
- o PR 10 pode vir depois do 12: a temporada em grupo fecha sem desenvolvimento entre GPs.

## Antes do PR 1

- As respostas do Thiago estão em "Decisões do Thiago", lá em cima. Não reabrir sem perguntar.
- Se aparecer algo fora das decisões, pergunte antes de inventar.
