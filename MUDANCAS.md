# Carreira: foto do estádio no fundo da sede e três pop-ups (antes do jogo, diretoria e troca recebida)

## Fundo da sede com a foto do estádio
- A sede ganhou, atrás de tudo, a **foto do estádio do clube**, borrada e com pouco brilho para não atrapalhar a leitura, com um degradê escuro por cima e um toque da cor do clube.
  O **crédito** fica no canto de baixo ("Estádio do Maracanã · foto: TheSportsDB"). Só na sede.
- As fotos vêm da TheSportsDB (`tools/baixar-estadios.js` achou 135 dos 141 clubes e gravou em `estadios-api.js`). Quando falta a foto (Werder Bremen, Marseille, Bournemouth, Sporting Cristal, Lille e PSG) ou não há internet,
  a sede usa o **estádio desenhado em pixel-art** do próprio jogo, também borrado ("ilustração" no crédito).
- Consertei também o empilhamento da página: as manchas de cor do vidro e a marca do clube estavam escondidas atrás do fundo do body e agora aparecem.

## Pop-up antes do jogo
- Ao tocar em **Jogar** (e, na sala, no botão do anfitrião), se há algo errado aparece o aviso: titulares cansados (com a energia e o que perdem na nota), jogadores da escalação fixa que não jogam (lesão ou suspensão) e
  improvisados (com os pontos que perdem). Botões: **Ajustar a escalação**, **Escalação automática e jogar** (descansa quem está cansado) e **Jogar assim mesmo**. Sem problema nenhum, o jogo começa direto.

## A diretoria: meta da temporada
- No começo de cada temporada (e quando o técnico entra no meio) a **diretoria define a meta pela força do elenco em relação aos outros clubes da mesma liga**:
  os 2 mais fortes devem **brigar pelo título** (G2); do 3º ao 6º, **vaga continental** (G6); do 7º ao 12º, **meio de tabela** (top 12); do 13º para baixo, **fugir do rebaixamento** (fora dos 4 últimos).
  Aparece num pop-up (reunião com a diretoria) e no topo da sede ("Meta da diretoria: 2º ou melhor", verde quando está cumprindo e amarelo quando está atrás).
- **Aviso de risco:** nas rodadas 8, 18 e 28 da liga, se o clube está abaixo da meta, a diretoria avisa, com a diferença de pontos e o que fazer.
- **No fim da temporada:** meta cumprida rende bônus no caixa e +8 de moral; não cumprida, -6 de moral e a diretoria cobra. O resultado vai para o histórico.

## Pop-up de proposta de troca (na sala)
- Quando chega uma proposta de troca para você, aparece o pop-up com o que você manda, o que recebe e o dinheiro, com um **som discreto** (duas notas curtas). Botões: **Aceitar a troca**, **Recusar** e **Ver depois**.
  Cada proposta avisa uma vez. Os pop-ups nunca ficam um por cima do outro: o seguinte abre quando o anterior fecha.

## Também
- O time da prancheta e dos avisos agora usa a energia de cada jogador (a escalação mostrada no cliente bate com a do servidor, que descansa os cansados na escalação automática).

## Conferido
- `tests/carreira-diretoria.test.js`: a meta por força na liga (de 7 clubes do Brasileirão e de um da Espanha), a avaliação no fim da temporada e a meta nova na seguinte, e a página ligada
  (pop-ups, fundo e fotos). Na tela: `planos/imagens/carreira-popup-*.jpg`, `carreira-estadio-fundo.jpg`, `carreira-estadio-desenho.jpg`.
