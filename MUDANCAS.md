# Carreira em grupo: a rodada ao vivo para todos (PR 5) e o mercado disputado com o olheiro (PR 6)

Os PRs 5 e 6 do plano `planos/carreira-online.md`, juntos. A turma já joga a carreira inteira em grupo: o anfitrião
começa a rodada, todos assistem juntos (cada um o seu jogo), decidem nas paradas, e entre as rodadas disputam
jogadores em leilão.

## PR 5: a rodada ao vivo (`carreira-rodada.js`, novo)
- **Quem começa:** o anfitrião aperta "Jogar a rodada" no hub; os outros veem quem já mexeu no time. A rodada é a
  próxima semana do calendário mundial com jogo de algum humano. Quem não joga naquela semana espera.
- **Relógio único do servidor:** cada jogo anda a 1,5 minuto de jogo por segundo (cerca de 1 minuto por partida). O
  navegador só desenha o relógio que o servidor manda (sem 3x e sem "Pular" no grupo).
- **Paradas:** quando o jogo de um humano chega numa parada (tática ou lance decisivo), só aquele jogo pausa.
  - A decisão tem 20 s. Sem resposta, vale a padrão (`Motor.decisaoAutomatica`), e ninguém trava os outros jogos.
  - Quem joga "só o resultado" (modo 1) ou não quer os lances (modo 2) recebe a decisão automática na hora.
- **Humano contra humano:** o motor ganhou o modo dos dois lados (`controla: 2`):
  - as paradas táticas do intervalo e dos 70 minutos pedem os dois técnicos ao mesmo tempo;
  - no lance decisivo, quem ataca escolhe a jogada e quem defende escolhe a defesa;
  - o pênalti vira o duelo do Leilão: quem bate escolhe o canto, e o goleiro, o pulo;
  - o jogo espera os dois (ou o tempo), e quem já decidiu vê "Esperando o outro técnico".
- **Turbo:** as rodadas sem humano contra humano e sem final saem na hora, e o jogo para nas que importam.
- **Fim da rodada:** cada jogo fecha para o seu clube (dinheiro, moral, feed, pós-jogo), e o que é de todos (gols,
  cartões, desempenho, resultado) fecha uma vez só. O mundo é recalculado uma vez por rodada.
- **Temporada nova em grupo** (`novaTemporadaGrupo`): o anfitrião começa a próxima temporada quando a de todos acabou,
  com a evolução de todos de uma vez, as copas pela tabela e o calendário novo de cada um.
- **Recarregar no meio** volta no mesmo ponto: a rodada fica salva na sala (no banco).
- **Organização do `carreira.js`:**
  - `fecharJogoMundo` agora separa o que é de todos do que é do clube;
  - `virarTemporada` aceita vários clubes humanos;
  - `venderAcao` e `eventoAcao` viraram funções, usadas pelo solo e pelo grupo.

  A carreira solo continua igual.

## PR 6: o mercado disputado e o olheiro
- **Leilão de jogador da CPU:** qualquer humano abre o leilão pela ficha do jogador.
  - O preço mínimo é o pedido do clube (`Mercado.precoMinimo`, a mesma conta da proposta de hoje).
  - Todos dão lance pela faixa do leilão, embaixo da tela. Cada lance reinicia o relógio de 15 s, e o lance precisa
    cobrir o anterior em pelo menos 3% (ou R$ 500 mil).
  - Quando o relógio acaba, o maior lance que ainda cabe no caixa leva: paga, o salário entra e vira notícia.
  - Há um leilão por vez na sala, e nunca durante a rodada.
- **Jogador de um amigo:** o leilão começa em 70% do valor, e quem bate o martelo é o dono. Ele pode bater a qualquer
  momento, ou ficar com o jogador. No fim do relógio, o dono tem 30 s para decidir; sem decisão, fica com ele.
- **Regras:** só na janela; ninguém dá lance acima do caixa; o limite de elenco continua; a carência continua (sem
  lucro em revenda na hora); a venda na hora nunca vai para outro humano.
- **Olheiro** (botão "Chamar o olheiro" no mercado, no solo e no grupo): olha o pior titular de cada setor, comparado
  com a média dos titulares, e sugere 2 ou 3 jogadores que cabem no caixa e melhoram ali, com o porquê. Exemplo: "Seu
  defensor mais fraco é Danilo, que rende 77 ali. Hakimi rende 89 e custa R$ 122 mi."

## O que ficou para depois (combinado)
- A repaginada das outras telas (elenco, mercado, tabela, calendário) no visual do hub.
- As animações de contratação e de transferência.

  Neste PR, a faixa do leilão e as dicas do olheiro têm um visual simples, só o necessário para funcionar.

## Testes
- **`tests/carreira-rodada.test.js` (novo, com o relógio andando à mão):**
  - o jogo de um humano pausa e o do outro continua;
  - sem resposta, vale a decisão padrão;
  - humano contra humano espera os dois (ou o tempo);
  - o pênalti em duelo.
- **`tests/carreira-online-mercado.test.js` (novo, pelo canal, com os tempos acelerados):**
  - a rodada só pelo anfitrião, a parada esperando, e recarregar no meio voltando no mesmo ponto;
  - o leilão com três amigos: o mínimo, o caixa, o lance que reinicia o relógio, o maior que leva e o caixa certo;
  - o martelo e a recusa do dono;
  - o olheiro sugerindo só o que cabe no caixa e melhora a posição.
- **`tests/salas-esperado.json`:** regravado (só os campos novos do estado do `/carreira-online`).
- **E2E da carreira (4 de 4):** o teste em grupo agora joga uma rodada ao vivo com duas páginas até o fim e faz um
  leilão.
- **`npm test`:** 143 testes. Falhou só o "feed e pós-jogo", que é instável e já falhava no `main` (1 em 10); rodando
  de novo, passou 3 de 3.
