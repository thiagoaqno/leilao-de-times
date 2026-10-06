# Leilão: replay de cada gol em pixel-art e as cartas lado a lado

## Como fica
- **Cada gol do campeonato ao vivo ganha um replay em pixel-art (8 bits)**, no jeito das ilustrações de futebol em
  8 bits. Na hora do gol, um telão liga como uma TV embaixo do placar e mostra o lance de lado: o jogador (com o mesmo
  rosto e a mesma camisa da carta dele) chuta, o goleiro voa, a rede balança e sobe o "GOL!". Depois corta para a
  comemoração em close, com papel picado e a faixa com o nome e o minuto.
- **Os replays ficam um embaixo do outro, o mais novo em cima**, logo abaixo do placar (não precisa rolar para ver o
  que acabou de sair). Depois de tocar, cada um fica parado na comemoração, como uma ilustração, e um toque nele toca
  de novo. Quem chega depois (ou revela tudo de uma vez) vê todos parados.
- **Cinco tipos de gol**: chute, no ângulo, de voleio (depois de um cruzamento), de cabeça e de cavadinha (o goleiro
  sai e a bola passa por cima). O tipo depende da posição e da nota de quem marcou: zagueiro faz mais de cabeça; craque,
  mais no ângulo e de voleio. O futsal é na quadra azul, com a área do futsal; o futebol de campo, no gramado listrado.
- **As comemorações**: soco no ar, aviãozinho, de joelhos deslizando, mão na orelha, dedos para o céu, dancinha e
  braços abertos. Os craques têm a deles:
  - o soco no ar do Pelé, o "siu" do Cristiano e o aviãozinho do Ronaldo;
  - o Messi e o Kaká apontando para o céu, o Bebeto embalando o nenê e o coraçãozinho do Neymar;
  - o Haaland meditando, o Mbappé de braços cruzados e o Cole Palmer tremendo de frio;
  - a dancinha do Roger Milla, do Vini Jr., do Ronaldinho e do Griezmann;
  - a cambalhota do Klose, o "alô" do Gabriel Jesus e os braços abertos do Bellingham.
- **No apito final**, o replay do gol da vitória (o do vencedor que deixou o placar a favor de vez) ganha a etiqueta
  dourada "Gol da vitória".
- **A carta de cada gol continua, sem atraso.** Antes as cartas entravam numa fila e, com muito gol (o futsal tem
  muitos), chegavam atrasadas ou nem apareciam. Agora cada carta entra na hora do gol. Se outra ainda está na tela, as
  duas ficam lado a lado e a fila vai para o meio, deslizando; com três ou mais, as cartas ficam menores.
- **O nome curto de quem marcou ficou certo.** Antes, "Lionel Messi" aparecia como "Lionel Me" (a conta separava o nome
  pela letra "s"). Agora é "Messi", com a partícula junto quando tem ("van Basten", "Di Stéfano"), e o primeiro nome
  para quem é conhecido assim ("Vinícius", "Ronaldinho").
- Todo mundo vê o mesmo lance: o tipo de gol, a comemoração e o goleiro são sorteados pelo jogo, pelo minuto e pelo
  nome.
- Quem pede "menos movimento" no sistema vê os replays parados (e um toque toca).

## Por dentro
- `public/leilao/lances.js` (novo): `Lances.criar(gol, jogo, { nome, hat, auto })` monta o telão. O boneco é desenhado
  num canvas de 48x48 (os braços e as pernas por ângulos, com o contorno escuro) e a cena num de 160x90, ampliado sem
  borrar. `COMEMORA` tem as comemorações, e `ASSINATURA`, os craques com comemoração própria.
- `public/leilao/rostos.js`: a cabeça virou uma função à parte (`Rostos.cabeca`), usada pela carta e pelo boneco, e
  entrou o uniforme inteiro (`Rostos.uniformeDe`: calção, meião e chuteira; as lendas de chuteira preta, os atuais de
  chuteira colorida). Os rostos das cartas não mudaram (conferido nos 625 jogadores das listas).
- `public/leilao/aovivo.js`: as cartas lado a lado (`cartaNaFila`), os replays (`replayDoGol`), o gol da vitória
  (`golDaVitoria`) e o nome curto (`sobrenome`).
- `public/leilao/estilo.css`: a fila das cartas e o telão.
- O servidor não mudou.

## Conferido
- Os testes de navegador do Leilão passando (a página abre sem erro e outra pessoa entra pelo convite).
- No navegador, numa copa de futsal simulada (robôs dando os lances):
  - as cartas lado a lado quando os gols saem juntos;
  - os replays tocando na hora de cada gol, um embaixo do outro, e o gol da vitória marcado no fim;
  - cada tipo de gol e cada comemoração, quadro a quadro;
  - o celular (375 px), sem a página passar da largura da tela, e o console sem erros.
