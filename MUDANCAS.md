# Corrida e Drag: menos peso na placa de vídeo

## Limite de quadros (Corrida e Drag)
- Em tela de 120/144 Hz os dois jogos desenhavam tudo a cada 7 ms, 144 vezes por segundo, e a placa de vídeo ficava
  perto de 80%. Agora um quadro precisa de pelo menos 11 ms: em 144 Hz desenha um sim e outro não (72 por segundo), em
  120 Hz fica em 60, e em 60 Hz nada muda.
- No Drag isso vale também para a garagem do menu, que ficava desenhando sem parar atrás do painel.

## Chão da Corrida em pedaços
- O chão de cada pista era uma malha só de quase 300 mil triângulos, desenhada inteira a cada quadro, mesmo com quase
  tudo fora da tela. Agora é cortado em 8 × 8 pedaços (`emPedacos`, em `pista.js`), e a placa só desenha os que aparecem.
  As normais são as da malha inteira, então não aparece emenda.
- Em Mônaco, com a câmera atrás do carro: de ~735 mil para ~360 mil triângulos por quadro.

## Testes
- Não rodei os testes. Conferido no navegador: a Corrida em Mônaco desenha igual, sem emenda no chão, e o Drag abre
  sem erro.
