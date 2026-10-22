# Corrida: sombra mais leve e sem a travada da primeira volta

## Sombra
- O mapa de sombra do sol caiu de 2048 × 2048 para 1024 × 1024. Ele cobre só 520 × 520 em volta do carro, então cada
  ponto da sombra ainda tem 5 cm e ela continua nítida.
- Medido em Mônaco: 6,3 ms por quadro com a sombra de 2048, 3,9 ms com a de 1024 e 3,3 ms sem sombra. A sombra antiga
  quase dobrava o tempo de cada quadro.

## A travada da primeira vez
Medido em Mônaco, 10 s depois da largada: o primeiro desenho de cada trecho novo levava ~260 ms (os seguintes, ~20 ms),
e a primeira vez que o desfoque de velocidade ligava compilava ~25 shaders de uma vez, no meio da reta. Os motivos:
- Cada shader tem duas versões, a de desenhar na tela e a de desenhar numa imagem (a que o desfoque usa). Só a da tela
  era compilada antes da largada. Agora as duas compilam em paralelo durante a contagem (`compilarTudo`), sem travar.
- As malhas só iam para a placa de vídeo na primeira vez que apareciam. Agora, na contagem, a pista inteira é
  desenhada fora da tela em 8 partes de mais ou menos o mesmo tanto de triângulos, uma a cada 30 ms (`subirMalhas`), o
  que também compila a sombra. A câmera desse desenho é de perspectiva, como a do jogo (com uma ortográfica o
  navegador compilaria outra versão de cada shader).
- O aquecimento espera o carro de F1 e os enfeites do Kenney chegarem, porque eles remontam os carros e a pista. Se a
  foto do céu chega depois dele, aquece de novo (a luz da foto muda todos os materiais).
- Resultado: na corrida, nenhum trecho novo passou de ~30–60 ms no primeiro desenho, e o desfoque não compila mais
  nada. O que sobra são umas paradinhas de 0,1–0,3 s durante a contagem (os shaders da sombra, que o navegador só
  compila desenhando), com o carro ainda parado.

## Testes
- Não rodei os testes. Medido no navegador do app, em Mônaco (o painel estava escondido, então os números de tempo são
  de um navegador em segundo plano, mais lento que o normal).
