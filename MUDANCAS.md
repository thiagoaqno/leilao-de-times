# Carreira: 109 eventos inesperados novos e a rodada igual para todos na carreira em grupo

## 109 eventos inesperados novos
- **`carreira-catalogo-extra.js` (novo):** 109 eventos, somados ao catálogo de `carreira-catalogo.js`. Com os antigos,
  são 224.
- **Grupos:** vestiário, torcida, imprensa, dinheiro, treino, jogo, mercado, vida pessoal e comissão técnica. Alguns
  exemplos:
  - um cachorro que não sai do CT;
  - a faixa polêmica da organizada;
  - o meme do técnico;
  - o patrocínio pago em moeda digital;
  - um drone espião no treino;
  - o ônibus que quebrou;
  - o eclipse no dia do jogo;
  - a proposta das arábias;
  - a cartomante do presidente;
  - a nutricionista que proibiu o pão de queijo.
- Cada escolha mexe em alguma coisa do jogo de verdade: a moral, o caixa, a nota do time, de um jogador ou do próximo
  adversário. Alguns só aparecem na hora certa: fora de casa, com a janela aberta, depois de derrotas.
- O formato e as ajudas são os mesmos do catálogo de antes (o começo de `carreira-catalogo.js`).

## Carreira em grupo: todo mundo na mesma rodada
- **O que acontecia:** na mesma rodada da turma, uma pessoa via "jogo 3" e outra "jogo 1" (ou 2). Os jogos eram da
  mesma semana, mas:
  - o número do hub contava todos os jogos do clube, inclusive os de copa;
  - o botão do anfitrião contava as rodadas da turma, que incluem as semanas de copa;
  - a janela de transferências usava o contador de cada clube: quem jogava Libertadores ou Champions via a janela
    fechar antes dos outros.
- **Agora:**
  - a rodada que aparece no hub e a que vale para a janela é a **rodada da liga** (`rodadaDaJanela` em
    `carreira.js`, e `estado.rodadaLiga` para a tela). Os jogos de copa não contam, então todo mundo da mesma liga
    está sempre na mesma rodada, e a janela abre e fecha junto para todos;
  - o botão do anfitrião diz só "Jogar a próxima rodada";
  - na carreira solo, a janela também passa a contar as rodadas da liga, e não mais os jogos de copa.

## Extrato do pós-jogo
- Às vezes o pós-jogo vinha sem o extrato do jogo: quando um evento da rodada seguinte mexia no caixa, ele abria a
  linha nova do extrato, e o fechamento do jogo pegava a primeira linha em vez da linha da rodada jogada.
- Agora ele procura a linha pela rodada. Era essa a causa dos testes que falhavam de vez em quando ("feed e pós-jogo"
  e "orçamentos").

## Testes
- **`tests/carreira-rodada.test.js`:** teste novo. Um humano com Libertadores e outro sem ficam na mesma rodada da
  liga e com a mesma janela, rodada a rodada.
- **Testes que procuravam o extrato na primeira linha:** agora procuram pela rodada. O teste da rodada ao vivo pelo
  canal ganhou mais tempo de decisão, porque falhava quando o computador estava lento.
- **`npm test`:** 152 de 152 passando.
- **E2E da carreira:** 6 de 6.
