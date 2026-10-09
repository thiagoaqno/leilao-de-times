# Carreira: os escudos de todos os clubes refeitos em vetor, e os brasileiros desenhados um a um

Os 142 escudos da carreira mudaram. Antes eram pixel-art de 16x18, com as letras borradas e vários clubes quase iguais
(a mesma forma com cores diferentes). Agora são desenhos em SVG, nítidos em qualquer tamanho, e nenhum escudo é cópia
de escudo de verdade.

## Os 20 do Brasileirão, feitos à mão
Cada um com o jeito do clube (as cores e um elemento que lembra o escudo, sem copiar o desenho):
- **Flamengo:** listras vermelhas e pretas com o monograma CRF numa pílula.
- **Palmeiras:** redondo verde com anel branco e o P grande.
- **Cruzeiro:** redondo azul com o Cruzeiro do Sul (as cinco estrelas).
- **Mirassol:** amarelo com faixa verde e o M grande.
- **Fluminense:** as três faixas grená, branca e verde.
- **Botafogo:** preto com a estrela branca grande.
- **Bahia:** redondo tricolor com o B no centro.
- **São Paulo:** branco com as faixas vermelha e preta e as três estrelas.
- **Grêmio:** as faixas azul, preta e branca.
- **Bragantino:** branco e vermelho com a bola.
- **Atlético-MG:** listras pretas e brancas com a estrela dourada.
- **Santos:** branco com as listras pretas em cima.
- **Corinthians:** redondo branco e preto com a âncora.
- **Vasco:** preto com a faixa diagonal e a cruz.
- **Vitória:** listras vermelhas e pretas com as estrelas douradas.
- **Internacional:** redondo vermelho com o SCI.
- **Coritiba:** redondo verde e branco com o CFC.
- **Athletico-PR:** pontudo, listras vermelhas e pretas na diagonal e o raio.
- **Chapecoense:** verde com o ACF.
- **Remo:** azul-marinho com os remos cruzados e a estrela.

## Todos os outros
- Os escudos das outras ligas usam a receita que já estava na base (cores, listras, anel, símbolo, estrelas) no
  desenho novo.
- Quando a receita era só fundo, borda e três letras (a maioria), o escudo ganha um de 7 desenhos (faixa no topo, duas
  metades, faixa no meio, V, diagonal, listras ou cantos) e uma de 3 formas (escudo, tábua ou ponta), sorteados pelo id
  do clube: com as mesmas cores, dois clubes não ficam iguais. Nenhum dos 142 se repete.
- As letras ficam numa pílula na cor que dá leitura (se a cor das letras é parecida com a do fundo, a pílula troca de cor).
- Contorno escuro, brilho suave por cima, e cada escudo na tela traz os seus próprios ids (sem choque quando o mesmo
  escudo aparece várias vezes).

## O que não mudou
- A API é a mesma (`Escudos.svg(clube)`), então todas as telas já usam os escudos novos. Ficou de fora a `grade`, que só o
  teste antigo usava.

## Conferido
- Folhas de contato de todas as ligas no navegador (os 142 clubes, sem erro no console) e a sede e a tabela com os escudos novos. Fotos: `planos/imagens/carreira-escudos-*.png`.
- `npm test`: 175 de 175. O e2e da carreira não foi rodado desta vez.
- A arte pixel-art das notícias (o feed) continua com o desenho dela: não usa estes escudos.
- `tests/carreira-base.test.js`: todo clube tem escudo montado certo, os 20 do Brasileirão têm desenho próprio, nenhum
  clube repete o desenho de outro e os ids mudam a cada escudo.
