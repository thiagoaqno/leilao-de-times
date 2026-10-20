# Corrida: de volta ao kart, mais leve, e Nürburgring e Laguna Seca

O PR #257 foi mesclado antes do segundo commit dele entrar. Este PR traz esse commit e as duas pistas novas.

## O que muda

- **Pilotagem e som de kart de volta**: a física e o motor sintetizado de antes. O carro de F1 fica só no visual. O câmbio manual (opção da sala) continua, com 5 marchas.
- **Pistas voltam a ~13 mil por volta** (os traçados novos, no tamanho certo para a velocidade de kart).
- **Robôs sem "derrapar"**: o bico aponta para onde eles estão andando, não para a linha lá na frente.
- **Mais leve**:
  - os carros dos outros usam uma versão do F1 com ~1/5 dos triângulos (`f1/f1-leve.glb`) e sem sombra projetada (a sombra redonda no chão fica);
  - minimapa, bandeiras e torcida trabalham menos a cada quadro;
  - a resolução começa um pouco menor;
  - abaixo de ~50 quadros por segundo, a qualidade cai sozinha, até tirar sombras e desfoque.
- **Nürburgring** (inspirado na Nordschleife, ~17,5 mil, a pista mais longa): floresta fechada, neblina, guard-rail de aço, o salto do Flugplatz, a descida da Fuchsröhre, o Karussell, o Hohe Acht (ponto mais alto) e o salto do Pflanzgarten, terminando na reta Döttinger Höhe.
- **Laguna Seca** (~12,5 mil): morros dourados com poucos carvalhos, fim de tarde, brita nas áreas de escape. Tem a reta, o grampo Andretti, a subida pela Rahal até o Corkscrew (o S que despenca morro abaixo) e a curva longa Rainey.
- O número do velocímetro ficou mais legível.

## Verificação

- `node --test tests/corrida-robos.test.js tests/corrida-experiencia.test.js tests/corrida-colisao.test.js`: passaram. As duas pistas novas entram no teste de traçado sem trechos encostando.
- No navegador, com 8 carros: ~57 quadros por segundo e ~10 ms de JavaScript por quadro. Os robôs andam alinhados.
- Conferido o Nürburgring rodando e Laguna Seca no grid.
