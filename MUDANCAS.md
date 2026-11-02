# Corrida: Xangai com cenário próprio (boxes com as asas sobre a reta, paddock de folhas de lótus, lagos e o skyline na névoa)

## O que estava errado
Xangai era o GP simples do kit (`gpSimples`): asfalto, zebras, uma tribuna e um prédio de boxes genéricos, árvores sorteadas e nada do que faz o Shanghai International Circuit ser reconhecível: as asas que cruzam a reta dos boxes, o paddock de pavilhões de folha de lótus sobre o lago, o caracol das curvas 1 e 2, os canais em volta e a cidade no horizonte.

## O que mudou
O traçado (`pistas.js`) **não mudou**. `gps/xangai.js` agora é uma configuração própria (zebras vermelhas e brancas, brita, arquibancadas, painéis, passarelas, placas de 200/150/100/50 m) com o cenário em `public/corrida/xangai.js` e as peças exclusivas em `public/corrida/kit/xangai/` (só código, sem modelo 3D baixado, sem marca registrada nova: os painéis são nomes de lugar e de comida de Xangai, mais as marcas que já estavam em `kit/marcas.js`).

- **Reta dos boxes** (`predios.js`): o prédio das garagens comprido e baixo (térreo cinza entre nervuras, marquise escura, andar de vidro verde-acinzentado, terraço com a galera de pé), a torre de controle de prova sobre o teto quase em cima da linha de chegada e uma torre de vidro em cada ponta. **As duas asas** em forma de folha (laje branca de borda levantada, ventre de vidro, claraboias e estais nos mastros) atravessam a pista ligando a torre dos boxes à torre da tribuna principal coberta do outro lado, que é de torcida vermelha e amarela. A tribuna só existe atrás da linha de chegada: à frente dela a curva 1 volta e passa colada (conferido no mapa, `cabeNaPista`).
- **Paddock sobre o lago** (`lotus.js`, `agua.js`): 11 pavilhões em palafitas com a folha de lótus de borda ondulada (verde com nervuras por cima, branca por baixo) e a flor rosa no alto, passadiços em zigue-zague e os caminhos até a porta de trás do prédio dos boxes.
- **Lagos e canais** (`agua.js`): o lago do paddock, o do miolo da volta, um por fora do caracol e dois canais (a reta de trás e a reta dos boxes), como um campo de distância contínuo. A opção `terreno` do GP (`altura` e `cor`, que já existiam em `pista.js`) afunda o chão com a margem em rampa e pinta o gramado em manchas; a água é UMA lâmina só abaixo do chão de todo lugar menos das bacias, e `tr.ocupado` diz "é água" (nada nasce dentro).
- **Curva 1 e 2 (o caracol)**: a maior arquibancada do circuito por fora do giro (16 degraus, coberta) e o telão. **Curva 14** (o grampo no fim da reta de trás de 1,2 km): arquibancada grande, telão e placas de frenagem. As outras curvas fechadas ganham arquibancada sozinhas (`arquibancadasDasCurvas` acha as curvas de raio menor que 330 pela curvatura e põe a arquibancada do lado de fora).
- **Vegetação baixa** (`vegetacao.js`): arbustos podados, canforeiras baixas, salgueiros-chorões na beira da água, juncos e bambu, tudo em InstancedMesh, em manchas por ruído, só onde `livre` e `ocupado` deixam.
- **Skyline na névoa** (`cidade.js`): um anel de torres de apartamentos e de vidro bem além do terreno e, para o sudeste, a Torre da Pérola Oriental, o Jin Mao, o Shanghai World Financial Center e a Shanghai Tower. `fog: false` com a bruma pintada nos vértices (mais forte embaixo e nas torres mais longe) e uma coroa da cor da neblina como chão de longe. `LOOK.xangai` ganhou neblina de 700 a 3700 (era 900 a 4200).

## Desempenho
Medido no Node (`node tests/ajuda-cena/medir.mjs xangai`): 284 malhas, 149 chamadas de desenho e ~376 mil triângulos na vista do jogo (Spa: 193 chamadas e ~417 mil). A vegetação é InstancedMesh e o `kit/fundir.js` junta o resto; a conferência de invasão (`tests/ajuda-cena/invasao.mjs`) acusa 0.

## Conferido
Só `node --check` nos arquivos e as conferências acima (os testes rodam no CI). No navegador (Playwright com o Chrome, `/corrida/#debug`), sem erro de página: prints (em `C:/Users/thiag/Downloads/lts/xangai-prints/`) da reta dos boxes com as asas, da curva 1, da reta de trás e de uma vista alta.

## Limitações
- O skyline é uma silhueta de caixas e esferas, não os prédios de verdade; a Shanghai Tower é uma torre de fatias que giram.
- Atrás da linha de chegada há uma só tribuna principal com as duas asas; a terceira tribuna do plano não coube (a pista vizinha passa perto).
- As asas ficam a uns 15 m acima do asfalto, mas a câmera aérea não foi conferida passando por elas.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
