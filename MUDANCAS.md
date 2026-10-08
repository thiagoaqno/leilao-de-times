# Carreira: mercado e prancheta vivos

Este PR intermediário completa o polimento visual que ficou fora da repaginação do hub. Não muda as regras da carreira
nem implementa o encerramento do PR 7: anima somente resultados já confirmados pelo servidor.

## O que muda

- **Prancheta animada:** jogadores voam da posição antiga para a nova ao trocar titulares, banco ou formação. Depois
  da mudança, eles comentam o ajuste em balões; são 40 frases diferentes, separadas entre entrar em campo, ir para o
  banco, trocar de posição e mudar a formação.
- **Contratações e vendas:** a figurinha cruza a tela entre os clubes, o martelo bate e entra o carimbo de
  `CONTRATADO` ou `VENDIDO`. O efeito aparece na proposta aceita, na venda imediata, na disputa do mercado e no leilão
  em grupo.
- **Faixa do leilão:** agora mostra retrato, posição, clube, maior lance, líder, relógio circular e ações numa faixa de
  estádio que usa a cor do time. Um lance novo pulsa sem reiniciar a animação inteira a cada segundo.
- **Olheiro:** as sugestões viraram relatórios numerados, com selo de prioridade, posição, nota, valor e justificativa.
- **Notícias aleatórias:** os eventos do catálogo voltam a aparecer no feed da carreira mundial. Eles continuavam sendo
  sorteados e enviados à caixa de entrada, mas o calendário novo publicava no feed apenas resultados e transferências.
- **Acessibilidade:** quem pede menos movimento recebe os mesmos estados e informações sem voos, carimbadas ou entradas
  animadas.

## Conferido

- **Testes focados:** 12 testes de catálogo, temporada mundial e animações passaram, incluindo uma regressão nova que
  exige evento aleatório no feed mundial e impede notícia duplicada. Na rodada anterior, 10 de 12 testes de mercado e
  carreira online passaram juntos; os dois casos antigos de finanças simuladas oscilaram e passaram repetidos sozinhos.
- **E2E da carreira:** os quatro cenários passaram; o cenário em grupo foi repetido depois do ajuste do primeiro leilão
  da sessão e passou. Desktop, celular, olheiro, balões e venda em grupo ficaram cobertos.
- **Fotos:** `planos/imagens/carreira-formacao-1280.png`, `carreira-olheiro-1280.png`, `carreira-leilao.png` e
  `carreira-transferencia.png`.
