# Carreira: várias temporadas, carreira em grupo (a sala), o hub novo e camisas e rostos de verdade

Este PR junta os PRs 3 e 4 do plano `planos/carreira-online.md`, a repaginada da sede da carreira (o hub no estilo
EA FC), as camisas e os rostos dos jogadores importados do EA FC 26, e o código de recuperação e a exclusão da
carreira solo.

## 1. Várias temporadas e a evolução dos jogadores (PR 3)
- **Contrato:** ao assinar, o técnico escolhe de 1 a 5 temporadas (padrão 2), e o limite fica em `save.temporadasMax`.
  As carreiras antigas ficam com 5 (ou com a temporada em que já estão).
- **Fim da temporada** (`registrarTemporada`): o histórico guarda a posição, a liga, os títulos e vices, o artilheiro
  do seu time, o melhor negócio e a força do elenco. Também paga a premiação da posição e R$ 15 mi por título, uma vez
  só por temporada.
- **`novaTemporada`** agora funciona no calendário mundial. Ela:
  - resolve com a opção padrão os avisos sem resposta;
  - evolui o elenco, aposenta veteranos e sobe jovens da base;
  - monta a Champions com os 4 primeiros de cada liga europeia e a Libertadores com os 6 primeiros do Brasileirão,
    mais um sorteado entre o 7º e o 12º (o campeão da Copa do Brasil);
  - avisa quem subiu, quem caiu, quem se aposentou e quem veio da base.
- **Última temporada:** a sede mostra o resumo da carreira (as taças, a liga, o artilheiro e a força de cada ano, e o
  melhor negócio), sem o botão de nova temporada. `novaTemporada` recusa.
- **`public/carreira/evolucao.js`** (novo, servidor e navegador):
  - **idade:** sobe 1 por temporada. A base brasileira não tem data de nascimento, então a idade é estimada pelo id do
    jogador (sempre a mesma), e a ficha mostra "(estimada)";
  - **nota de cada jogo:** guardada em `save.desempenho`;
  - **evolução de −2 a +3:** pesa a idade, os minutos, a nota média e a sorte (com semente). Entra em `bonusNota` e em
    `save.evolucao`;
  - **aposentadoria:** a partir dos 35 anos (o dono vira `"aposentado"`);
  - **jovens da base:** 1 ou 2 por clube por temporada, guardados em `save.jovens`.
- Os jogos sem você usam os elencos do começo da temporada (`basesDaTemporada`). Assim, os resultados já jogados
  nunca mudam, nem depois de reiniciar o servidor.

## 2. A carreira em grupo: a sala (PR 4)
- **Canal novo `/carreira-online`** (`carreira-online.js`):
  - o criador abre a sala com código de 5 letras e vira o anfitrião;
  - o anfitrião escolhe as temporadas (1 a 5), o aporte do investidor (nenhum, R$ 250 mi, R$ 500 mi ou R$ 1 bi), as
    ligas (só o Brasileirão, ou Brasil e Europa) e o ritmo (normal ou turbo, guardado para o PR 5);
  - os amigos entram pelo código, e cada um escolhe um clube livre (dois humanos nunca no mesmo);
  - o anfitrião começa quando todo mundo tem clube. Até 8 técnicos; quem chega depois do começo só assiste.
- **Um mundo só:** `carreira.js` agora separa o mundo (`mundoNovo`) do técnico que assume o clube (`assumirClube`). A
  carreira solo continua igual.
  - Na sala, `novaCarreiraGrupo` faz cada humano assumir o seu clube no mesmo mundo, com o aporte no caixa ("Aporte
    do investidor", com aviso na caixa de entrada).
  - O que é de cada clube fica em `save.humanos[clube].estado`: caixa, moral, escalação, caixa de entrada, feed,
    calendário e o resto da lista `CAMPOS_CLUBE`. O que é de todos fica no save: donos, notas, competições, lesões...
  - As funções da carreira solo rodam na visão do clube (`vistaDe` / `guardarVista`).
- **Reconexão:** cada um tem um token, guardado no navegador em `carreira-online:<CÓDIGO>`. O servidor guarda só o
  hash. Fechar a aba ou recarregar não tira ninguém da sala.
- **Banco:** a sala inteira fica na tabela nova `carreiras_online` (`migracoes/003-carreira-online.sql`). O servidor
  recarrega as salas ao subir e apaga cada uma 24 h depois do último uso.
- **Página:** a mesma da carreira. `?sala=CÓDIGO`, `?grupo=1` ou `?criar=1` (vindo da Noite) usam o canal novo
  (`public/carreira/grupo.js`).
  - A sala de espera mostra o código grande, o convite para copiar, os técnicos com o escudo de cada um, as regras do
    anfitrião (os outros só veem) e a grade dos clubes (os já escolhidos ficam bloqueados, com o dono).
  - Depois do começo, cada um vai para o hub do seu clube e mexe na escalação e na tática.
- **O que ainda não tem (PRs 5 e 6):** a rodada ao vivo para todos e o mercado disputado. Na sala, o botão de jogar
  aparece desativado ("Rodada da turma: em breve"), e o mercado responde que ainda está chegando.
- **Vila e Noite:** a tela inicial da carreira ganhou o convite "Carreira em grupo", e a descrição da Sede na Vila fala
  dos dois modos. A Noite da Galera lista a "Carreira em grupo" (`JOGOS` do `noite.js`): chamar a galera abre a sala
  sozinho (`?criar=1`), com os campos `hName`, `hCode`, `btnCreate` e `btnJoin`. O `noite.vitoria` da carreira fica
  para o fim da noite (PR 7), porque ainda não há partidas.

## 3. O hub novo da carreira (a sede no estilo EA FC)
- **No PC, três colunas** (CSS Grid, até 1520 px de largura):
  - à esquerda, o **próximo jogo**, com o maior destaque da tela: o confronto, os modos de jogo e o botão "Jogar a
    próxima partida", grande, com brilho pulsando e um reflexo no hover. Logo abaixo ficam os **blocos da gestão**
    (`.hub-tiles`, 2×2): Elenco e tática (com a força do time e a formação), Mercado (o caixa e a janela), Tabela (a
    posição e os pontos) e Calendário (o próximo adversário);
  - no meio, as **notícias em destaque**: a manchete com a arte grande e a etiqueta da editoria (Transferência,
    Resultado, Copa, Rumor...) e a grade com as seguintes;
  - à direita, a **caixa de entrada** como central de avisos curtos: o que pede resposta fica aberto, com as opções; o
    resto é uma linha que abre ao tocar. Ela gruda na tela ao rolar, e o último jogo fica logo abaixo;
  - embaixo, a tabela resumida, as finanças e o histórico.
- **Telas menores:** duas colunas até 1240 px e uma no celular (primeiro o jogo e a gestão, depois as notícias e os
  avisos).
- **Visual:**
  - escuro, com o **tema na cor do seu clube**: o acento (o botão de jogar, os destaques, o brilho) é a primeira cor
    colorida do clube, clareada só o necessário para dar leitura no fundo escuro (o Flamengo fica vermelho, o
    Palmeiras verde, o Real Madrid dourado). Clube preto e branco (Corinthians, Botafogo, Santos, Juventus) fica com o
    branco, e a letra em cima do acento sempre contrasta. Na sala em grupo, a tela pega a cor do clube escolhido;
  - as cores ficam em variáveis no `:root` (`--acento`, `--vidro`...);
  - o fundo é um estádio à noite feito só com CSS (os refletores e o gramado listrado), e os painéis têm efeito de
    vidro (`backdrop-filter`);
  - os blocos e as notícias sobem e brilham na borda no hover;
  - quem pede "menos movimento" fica sem o pulso e sem as animações de hover.
- O hub mostra os dados de verdade da carreira, não dados de exemplo: dá para ver o resultado em qualquer carreira
  (as fotos abaixo).

## 4. Camisas e rostos dos jogadores importados do EA FC 26
- **Uniformes:** a camisa saía das listras do **escudo**. Os grandes europeus têm listras de enfeite no escudo, então o
  Liverpool, o Chelsea e o City jogavam de listrado, e o Newcastle e a Juventus de camisa lisa.
  - `public/carreira/camisas.js` (novo) tem a camisa de verdade de cada clube europeu e sul-americano: a cor, o
    detalhe, o desenho (lisa, listras, aros, faixa, diagonal, metades) e o calção.
  - Os brasileiros seguem as listras do escudo, que já batiam com a camisa.
  - Nos replays, o visitante troca para a camisa reserva quando a dele parece com a do mandante.
- **Rostos:** quem não está na tabela de craques do Leilão ganhava um rosto sorteado só pelo nome (um norueguês podia
  sair negro, e um senegalês, loiro).
  - Agora a Carreira registra o país e a idade de cada jogador (`Rostos.registrar`). O tom de pele, o corte e a cor do
    cabelo saem da região do país, e os veteranos podem ficar grisalhos ou calvos.
  - O mesmo nome continua dando sempre o mesmo rosto, e o Leilão não muda.
- **Cards:** o número e a posição no topo do card usavam a segunda cor do clube mesmo quando ela não dava para ler (o
  89 vermelho no fundo azul do Barcelona). Agora a letra contrasta com o fundo (`--clube-tinta`).

## 5. Código de recuperação e excluir a carreira (solo)
- **Correção:** quando a página reconectava na tela inicial (computador lento), ela se redesenhava e apagava o nome que a
  pessoa já tinha digitado. Agora ela não se redesenha à toa e nunca apaga o que já está escrito.
- **"Código de recuperação" na sede:** mostra o código de novo. O banco só guarda o hash, então o navegador guarda o
  código em `carreira:codigo`. "Gerar outro" pede um código novo (`codigo`, `bd.novoCodigoDe`), e o antigo deixa de
  valer.
- **Sair:** antes de sair, o código aparece na tela para anotar.
- **"Excluir esta carreira":** pede para escrever EXCLUIR e apaga a carreira de vez (`excluir`, `bd.excluirCarreira`).

## Testes
- **`npm test`:** 136 testes passando.
- **Novos no `npm test`:**
  - `tests/carreira-evolucao.test.js`: limites da evolução, jovens contra veteranos, aposentadoria, nota de cada jogo,
    histórico, virada sempre igual, copas pela tabela e o limite de temporadas;
  - `tests/carreira-online.test.js`: criar e entrar; as opções só do anfitrião e dentro do permitido; os clubes sem
    repetir e só das ligas da sala; começar com todos com clube; o aporte no caixa de cada um; a escalação de cada um;
    só assistir depois do começo; a reconexão pelo token; o servidor reiniciado mantendo a sala (com o banco num
    arquivo); e o token fora do banco.
- **Testes que já existiam:**
  - `tests/salas.test.js`: o canal `/carreira-online` entrou em `CANAIS`, e `tests/salas-esperado.json` foi regravado
    (o diff só acrescenta o canal novo);
  - `tests/bd.test.js`: o código novo, excluir e as salas guardadas;
  - `tests/carreira-servidor.test.js`: o contrato de temporadas, o código e excluir pelo canal;
  - `tests/carreira-base.test.js`: todo clube tem camisa, e as camisas de Liverpool, Chelsea, Newcastle, Juventus e
    Flamengo estão certas.
- **E2E, só o da carreira** (`npx playwright test tests/e2e/carreira.spec.js`): o fluxo de antes (que passa pelo hub
  novo), o código, sair e excluir, e a carreira em grupo com duas pessoas (a sala, as regras, os clubes bloqueados,
  começar, cada um no hub do seu clube e recarregar voltando ao mesmo clube). **4 de 4 passando.**
- **Instável, já era assim no `main`:** o teste "feed e pós-jogo" (`tests/carreira-mercado.test.js`, linha 116) falha
  de vez em quando (o extrato do último jogo sem a "Cota de TV"). Falhou 1 de 10 vezes no `main`, sem este PR.

## Fotos (`planos/imagens/`)
- `carreira-hub-pc.png`: o hub no PC (Flamengo, depois de 4 jogos, no vermelho do clube).
- `carreira-hub-celular.png`: o hub no celular.
- `carreira-cards-camisas.png`: os cards no mercado, com as camisas de verdade e os rostos pela nacionalidade.
- `carreira-grupo-sala.png`: a sala de espera da carreira em grupo.
- `carreira-fim-da-carreira.png` e `carreira-fim-celular.png`: o resumo do fim da carreira.
- `carreira-codigo-de-novo.png` e `carreira-excluir.png`: o código e a exclusão.
