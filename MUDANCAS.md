# Carreira: pênaltis jogados, notícias iguais, trocas entre técnicos e temporadas anteriores

## Pênaltis jogados (sem sorte)
- Mata-mata empatado (jogo único ou agregado) agora vai para uma **disputa de pênaltis de verdade**, como no Leilão: 5 cobranças de cada lado
  e depois uma de cada vez. Nos modos com paradas e lances, **você escolhe o canto** quando o seu time bate e **o pulo** quando o goleiro é
  seu; humano contra humano escolhem ao mesmo tempo. Cada canto mostra a chance, e o batedor e o goleiro têm as manias deles.
  No modo simulado, os cantos saem dessas manias (nada de sorteio de quem passa).
- A tela mostra a disputa cobrança a cobrança, com o placar dos pênaltis ao lado do placar do jogo. O resultado jogado vai para o
  chaveamento: quem ganha nos pênaltis passa de verdade para a fase seguinte.

## Notícias de transferência iguais para todos
- Na sala, toda transferência (compra, venda ou troca de qualquer técnico) vira o **mesmo post** no feed de todos: mesmo texto, perfil e arte.
  Antes, cada técnico via a versão do seu lado.

## Trocas entre técnicos (sem limites)
- Nova tela **Trocas** (na sede, só na sala): escolha o técnico, os jogadores dos dois lados e o dinheiro (quem paga). O outro aceita ou
  recusa na tela dele; quem propôs pode cancelar. Vale **qualquer jogador, de qualquer nota**, com a janela fechada, e **não conta** na
  cota de compras da turma. O servidor só confere se os jogadores ainda são de quem disse, o tamanho dos elencos (18 a 36) e o caixa.
- A troca fechada vira aviso para os dois e uma notícia igual para toda a sala.

## Temporadas anteriores e conquistas
- Quando a temporada acaba, o servidor guarda tudo: campeões e vices de cada competição, as tabelas finais, as chaves, a festa do campeão,
  a artilharia, os **prêmios** (artilheiro, maior goleada, melhor negócio) e os **pontos de cada técnico**.
- Nova tela **Temporadas**: ranking dos técnicos (pontos acumulados e títulos), e uma aba por ano com os prêmios, os campeões
  (com "Rever a festa"), os técnicos da temporada e as tabelas e chaves de cada competição.
- Pontos: título de liga 10, vice 6, 3º 4; copas 5 (Libertadores, Champions e mundiais 8) e metade no vice.

## Conferido
- `tests/carreira-penaltis.test.js`: a disputa (sem humano, com humano pedindo canto e pulo, e o canto de maior chance converte mais) e o resultado jogado indo para o chaveamento.
- `tests/carreira-noticias-iguais.test.js`: a mesma notícia no feed de três técnicos.
- `tests/carreira-trocas.test.js`: a troca desigual, os erros e o arquivo da temporada (tabelas, chaves, prêmios, técnicos).
- `tests/salas-esperado.json`: só entrou o campo `trocas`. Na tela (`planos/imagens/carreira-trocas.jpg`, `carreira-temporadas.jpg`, `carreira-penaltis-disputa.jpg`).
