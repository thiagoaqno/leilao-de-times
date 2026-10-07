# Carreira de Treinador: a temporada jogável (fase 3)

A fase 3 de `planos/carreira.md`: dá para jogar uma temporada inteira por menus, em `/carreira/`. Os clubes ainda são de
teste (20 clubes fictícios do universo da Vila). Os clubes e jogadores de verdade entram na fase 1, no mesmo formato.

## Como fica
- **Começar:** você põe o seu nome de técnico e escolhe qualquer um dos 20 clubes (o tamanho de cada um aparece nas
  estrelas).
  - Aparece um **código de recuperação** de 12 letras, para continuar em outro aparelho.
  - Neste aparelho, a carreira volta sozinha.
- **A sede:**
  - o próximo jogo, com o estádio e se é em casa ou fora;
  - os 3 jeitos de jogar: só o resultado, com decisões táticas, ou jogando os lances decisivos;
  - o último jogo, com quem marcou;
  - a sua parte da tabela;
  - no fim da temporada, a posição final, o campeão e o botão da temporada seguinte;
  - o histórico das temporadas.
- **Elenco e tática:**
  - formação, mentalidade, pressão e linha de defesa;
  - escalação automática ou do seu jeito: toque nos jogadores para escolher os 11, com goleiro obrigatório;
  - o elenco por posição, com idade, nota e atributos.
- **Tabela e artilharia:**
  - a tabela completa, com os critérios do Brasileirão e as zonas (campeão, Libertadores, Sul-Americana, rebaixamento) e os últimos 5 jogos de cada clube;
  - os 10 artilheiros;
  - os jogos da última rodada.
- **Calendário:** as 38 rodadas, com placar e V/E/D.
- **A partida ao vivo:**
  - placar eletrônico e relógio (2 minutos de jogo por segundo, 3x ou "Pular");
  - narração dos gols, chances, defesas, cartões, lesões, trocas, intervalo e fim.
- **Nas paradas táticas** (intervalo, 70', gol sofrido, vermelho, cansaço): mentalidade, pressão, linha, formação e as
  trocas, com a energia de cada titular.
- **Nos lances decisivos:** as opções com a chance de cada uma e 20 segundos para escolher. Sem resposta, vai a de maior
  chance. O pênalti é o gol dividido nos 6 cantos.
- **Os outros jogos da rodada** são simulados quando a sua partida acaba.
- **Tudo fica salvo no banco:** fechar o navegador no meio de uma partida, mesmo esperando uma decisão, volta exatamente
  no mesmo ponto. Não dá para "tentar de novo".

## Por dentro
- `carreira.js` (canal `/carreira`):
  - os eventos são `criar`, `entrar` (token), `recuperar` (código), `escalacao`, `modo`, `jogar`, `decidir` e `novaTemporada`;
  - o save inteiro fica em `carreiras.dados`, com a semente, o calendário, os resultados, os gols, a escalação, a partida em andamento (semente e decisões) e o histórico;
  - o servidor só aceita a decisão que a partida parada está pedindo.
- `public/carreira/temporada.js`: o calendário de turno e returno sorteado pela semente, a tabela e as zonas.
- `public/carreira/base/teste.js`: os 20 clubes de teste, com 26 jogadores cada.
  - Os elencos nascem de um sorteio com semente, sempre iguais.
  - O formato é o mesmo que a base real vai usar.
- A página, com os scripts em ordem que dividem as variáveis globais:
  - `inicio.js`: a conexão, os escudos desenhados com as cores, e começar ou continuar;
  - `telas.js`: a sede, o elenco, a tabela e o calendário;
  - `partida.js`: a narração ao vivo e as decisões.
- `motor.js` ganhou `escalacaoAutomatica` (a mesma escolha da partida, para a tela do elenco), e a defesa nos lances
  decisivos agora diz o nome do goleiro.

## Conferido
- `npm test`: 82 passaram, 0 falharam.
  - Os 3 testes novos de `tests/carreira-servidor.test.js`:
    - cria, joga uma rodada (10 jogos e a tabela andando), volta pelo token e pelo código, e o token antigo deixa de valer;
    - a partida parada fica salva, recusa decisão errada e mudança de escalação, volta igual depois de recarregar e vai até o fim decidindo;
    - salva a escalação, joga as 38 rodadas, recusa jogar depois do fim e começa a temporada seguinte com o histórico.
- `npx playwright test tests/e2e/paginas.spec.js`: a página `/carreira/` abre sem erro.
- No navegador:
  - criar a carreira mostrou o código;
  - a sede apareceu com o próximo jogo e os 3 modos;
  - no modo dos lances decisivos, o placar, o relógio e a narração andaram;
  - a tela do lance abriu com as 4 opções, as porcentagens e o tempo.

## Ainda não
- A Sede da Carreira na Vila: por enquanto a carreira abre por `/carreira/`.
- Cartões e lesões que passam de um jogo para o outro, transferências e dinheiro (fase 5), e a repercussão (fase 6).
