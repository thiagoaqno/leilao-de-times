# Leilão: campeonato ao vivo, palpites, carta do gol, tabela que se mexe e Noite da Galera

O campeonato simulado deixa de ser só texto para ler. Cada parte revelada que tem jogos toca como um placar de TV,
e a galera palpita antes de cada parte.

## 1. Jogo ao vivo
- **O relógio:** ao revelar uma rodada (ou semifinal, final...), os jogos dela começam juntos e o relógio corre do
  apito ao fim em uns 16 segundos.
- **Os gols:** entram no minuto em que saíram. O placar pula, e a lista de quem marcou vai crescendo de cada lado.
- **Prorrogação e pênaltis:** a prorrogação aparece com o relógio continuando. Os pênaltis vêm cobrança por cobrança
  (bolinha verde para gol, vermelha para erro).
- **Todo mundo junto:** o tempo conta da hora em que o organizador revelou, no relógio do servidor. Quem entra no
  meio pega o jogo no ponto certo, e quem recarrega a página vê o jogo já terminado.
- **Depois do apito:** aparece o texto de sempre, com a narração e as pérolas.
- **O organizador:** enquanto os jogos rolam, o botão mostra "⏱️ Jogo rolando…" e a próxima parte espera. "Revelar
  tudo" mostra os jogos já terminados, sem tocar.
- O seu time aparece em azul no placar.

## 2. Palpites e bolão
- **Palpitar:** antes de cada parte com jogos, cada participante escolhe quem ganha cada jogo (ou empate, nos pontos
  corridos), com um toque. Aparece embaixo de cada opção quem escolheu o quê.
- **Quando abrem:** os palpites da próxima parte só abrem quando os jogos de agora terminam na tela. Senão, os
  confrontos da final entregariam quem ganhou a semi. Eles fecham quando o organizador revela.
- **O bolão:** acertou o resultado, ganha 1 ponto. Cada jogo mostra quem acertou, e o ranking do bolão fica embaixo.
  Os pontos só entram quando o jogo termina na tela, para não entregar o resultado antes.
- No fim do campeonato, quem fez mais pontos ganha a coroa de 👑 rei do bolão.

## 3. A carta do jogador no gol
- A cada gol, a carta de quem marcou aparece do lado do time dele (esquerda ou direita do placar), com a nota, a
  posição, o nome, o time e o minuto.
- **As cores:** bronze, prata, ouro e ouro brilhante para 85 ou mais, conforme a nota.
- **Hat-trick:** o terceiro gol do mesmo jogador vem numa carta especial roxa e rosa, "Hat-trick! 🎩".
- **Muitos gols seguidos:** as cartas passam mais rápido, e as que sobrarem depois do apito não entram.

## 4. Tabela que se mexe
- Nos pontos corridos, depois dos jogos de cada rodada, a classificação aparece com cada time deslizando da posição
  de antes para a nova. Ao lado do nome, quem subiu ganha ▲ e quem caiu, ▼. Os pontos ganhos na rodada aparecem
  como "+3" ou "+1".
- O seu time aparece em azul na tabela.

## 5. Leilão na Noite da Galera
- O campeão do campeonato simulado agora entra no placar da noite: ganha o dono do time campeão, perdem os outros
  que tinham time. Conta quando a última parte (o campeão) é revelada.

## Por dentro
- **`simulador.js`:** além do texto, devolve os dados de cada jogo (gols com minuto e autor, prorrogação, cada
  pênalti) e a tabela antes e depois de cada rodada.
- **`public/leilao/ritmo.js`:** guarda quanto dura cada pedaço do jogo na tela. O servidor usa a mesma conta para
  saber quando abrir os palpites.
- **`public/leilao/aovivo.js`:** o placar ao vivo, as cartas, a tabela, os palpites e o bolão.

## Conferido
- No navegador, com leilões de teste de 4 participantes (1 pessoa e 3 robôs que palpitam), em pontos corridos e em
  mata-mata:
  - os palpites e quem escolheu o quê;
  - o relógio, os gols e a carta do lado do time;
  - a tabela mexendo com ▲▼ e os pontos;
  - "acertou o palpite" em cada jogo e o bolão sem entregar o resultado;
  - os palpites da final fechados durante a semi e abrindo no fim dela;
  - o botão do organizador esperando os jogos e a coroa de rei do bolão no fim.
- Noite da Galera: um leilão ligado a uma noite, revelado até o fim, mandou o campeão para o placar da noite.
