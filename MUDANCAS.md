# Leilão: pênaltis decididos pela galera

## Como fica
- **No campeonato ao vivo, os pênaltis são decididos pelos donos dos times.**
  - Quem bate escolhe um dos 6 cantos: alto ou baixo, na esquerda, no meio ou na direita.
  - O dono do outro time escolhe para onde o goleiro pula. Se for o mesmo canto, é defesa.
  - Em 5% das cobranças o batedor isola: a bola vai para fora, seja qual for o canto.
- **No meio do jogo:** mais ou menos 1 jogo em cada 3 tem um pênalti.
- **Na disputa de pênaltis:** cada cobrança é um duelo, até a série estar decidida.
- **O relógio para durante o duelo.** O placar dos jogos daquela parte espera.
  - Abre uma tela com o gol dividido em 6 cantos, o nome de quem bate e do goleiro, e uma barra com o tempo.
  - São 15 segundos no jogo e 12 na disputa. Quem não escolher a tempo fica com um canto sorteado.
- **O resultado sai num replay do lance.**
  - Gol: a rede balança e a torcida vibra.
  - Defesa: o close é do goleiro.
  - Fora: a bola passa por cima, e o batedor leva as mãos à cabeça.
  - Depois, o jogo continua de onde parou.
- O gol de pênalti aparece como "(pên.)" na narração. Os perdidos também entram, com quem defendeu ou dizendo que foi para fora.
- **É uma opção da sala:** "Pênaltis da galera" na caixa da simulação, ligada por padrão. Desligada, tudo continua como antes.
- "Revelar tudo" sorteia os duelos que faltam e mostra o campeonato inteiro.

## Por dentro
- `simulador.js`:
  - O campeonato agora é simulado com uma semente: cada jogo e cada narração têm o seu sorteio. A mesma semente com as
    mesmas decisões sempre dá o mesmo campeonato.
  - A simulação para no primeiro pênalti ainda não decidido. Ela devolve as partes até ali e `completo: false`.
  - O servidor guarda cada decisão (`r.decisoes`) e simula de novo. O que já tinha saído continua igual.
  - Também devolve quantas partes o campeonato deve ter (`previstas`), para a tela mostrar o total.
- `server.js`:
  - O duelo aberto fica em `r.duelo` e só aceita o canto do dono certo (evento `penalti`).
  - O relógio da parte para em `r.pausas` enquanto o duelo está aberto.
  - A próxima parte só abre quando os jogos de agora terminam.
- `ritmo.js`: os cantos (`ZONAS`) e os tempos do duelo (`DUELO`), usados pelo servidor e pelo navegador.
- `aovivo.js`:
  - O placar para no pênalti pendente.
  - A tela do duelo (`renderDuelo`).
  - Os pênaltis perdidos também viram replay na lista.
- `lances.js` e `lances-gols.js`: o replay do pênalti segue o canto escolhido. O goleiro pula para o canto dele (no
  meio, ele fica), e o replay mostra a defesa com rebote e a bola para fora.

## Conferido
- `npm test`: 47 passaram, 0 falharam.
- Um teste à parte simulou 2 a 8 times, em liga e mata-mata, no futsal e no futebol, com 4 sementes.
  - Os pênaltis foram decididos um por um, simulando de novo a cada decisão.
  - O que já tinha saído nunca mudou, a mesma semente deu o mesmo resultado e a previsão de partes bateu.
  - Com a opção desligada, não há pênalti para decidir.
- No navegador, numa sala com robôs:
  - Num duelo entre robôs, a parte parou e o gol entrou como "Ronaldinho 26' (pên.)".
  - Num duelo meu, a tela mostrou "Pelé × Iker Casillas" e "Você bate!", o clique valeu e o gol saiu como "Pelé 38' (pên.)".
  - O console ficou sem erros.
