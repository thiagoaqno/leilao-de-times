# A Vila vira a Avenida Paulista

## O que muda

### Um mapa novo, com cara de Paulista
- O mapa cresceu para 96x60 e foi todo reposicionado ao longo da avenida: os jogos de mesa na primeira fileira, a
  alameda, a segunda fileira (Conjunto Nacional com o letreiro, Ginásio, Parque Trianon com a grama alta), o calçadão e a
  avenida com calçadas, asfalto, a ciclovia vermelha no canteiro, faixas de pedestre e semáforos nas ruas que cruzam.
- O Leilão mora no **MASP**: as vigas vermelhas, a caixa de vidro com as faixas de exposição e o vão livre embaixo.
- A praça com a fonte, o telão, food trucks, a antena da Gazeta e um painel de LED com o texto correndo.

### Ginásios para todos os treinadores
- Os 6 treinadores que ficavam soltos na rua ganharam um prédio cada, na fileira dos ginásios, ao lado dos 4 líderes.

### Uma avenida viva
- Pedestres andando, ciclistas na ciclovia, artistas de rua (música, bolhas de sabão, balões), os líderes e treinadores
  na porta dos ginásios olhando em volta, pombos que voam quando alguém chega perto, sombras de nuvem passando, a luz da
  antena piscando, vapor dos food trucks e o semáforo trocando de cor.

## Testes
- `tests/e2e/vila-layout.spec.js` reescrito: tamanho do mapa, nenhum jogo isolado, nenhum prédio em cima de outro, 10
  ginásios em prédios, o MASP, a grama do Trianon e as casas da avenida.
- `tests/e2e/vila-ginasio.spec.js` começa na Sede (ao lado do Ginásio); `tests/servidor.test.js` com o novo limite do mapa.
