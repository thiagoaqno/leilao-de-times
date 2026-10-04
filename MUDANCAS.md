# Karts com as skins da Pelada + Tênis com pulo

## Corrida e Batalha: o piloto é a sua skin, sentado num kart
- Novo `public/kart3d.js`: um kart de caixinhas pintado na cor do jogador, com o **boneco da Pelada sentado** (pernas
  para a frente, mãos no volante). O piloto vira o volante e inclina nas curvas, as rodas giram e as da frente esterçam.
- **Escolha da skin** (as mesmas da Pelada e do Tênis): na sala da Corrida ("Seu piloto"), na sala da Batalha e na tela
  inicial da Batalha (para o treino). A escolha fica salva e vale para os dois jogos. Os robôs têm skins próprias.
- **Corrida:** os 5 "carros" continuam (cada um com a sua física) e viraram variações do kart: bico mais comprido e asa
  no Raio V12, laterais largas e rodas maiores no Muscle 69 etc. Cor das rodas, aerofólio e faixas continuam valendo.
  Na primeira pessoa, o piloto some e a câmera fica no lugar dos olhos dele.
- **Batalha:** os balões ficam atrás do piloto; a estrela pisca a pintura do kart.
- Servidores (`corrida.js` e `batalha.js`) guardam a skin de cada um (`act("skin")`) e mandam junto com os jogadores.

## Câmera mais alta
- Corrida (perto, longe e primeira pessoa) e Batalha: a câmera de trás subiu e olha um pouco para baixo, para dar
  para ver a pista na frente do kart.

## Tênis
- O golpe armado espera no máximo **0,5 s** (antes, 1,9 s) para liberar o movimento.
- **Pulo:** Espaço (ou RB no controle, ou o botão "pular" no celular). Pula ~1 m e alcança bolas mais altas.

## Testes
- `npm test` (34) e os testes no navegador de páginas e do Tênis passando. Corrida e Batalha testadas na mão: sala,
  garagem com a skin, largada, treino com robôs.
