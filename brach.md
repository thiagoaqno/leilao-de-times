# GP da Áustria com cenário próprio: Red Bull Ring, em Spielberg

O Red Bull Ring usava só o kit genérico. Agora tem cenário feito para ele, no nível de Mônaco e de Spa, e o relevo e as barreiras vêm de dados reais. O traçado e o tamanho não mudaram.

## O que tem no cenário

Tudo é feito em código, sem modelo baixado e sem marca registrada: os painéis levam nomes de lugar e de comida da Estíria (Spielberg, Murtal, Zeltweg, Knittelfeld, Seckau, óleo de semente de abóbora, frango empanado, strudel, vinho Schilcher). Só as curvas têm os nomes que têm de verdade.

- **Reta dos boxes:** o prédio das garagens (as portas, o vidro, os brises brancos e a torre de controle) de um lado; do outro, a tribuna principal coberta e, atrás dela, no alto, a asa de aço: o prédio em forma de aerofólio de carro de corrida, com o centro de imprensa de vidro sob a lâmina inclinada. O paddock com as carretas fica atrás dos boxes.
- **O touro de aço:** no miolo do circuito, perto da curva 7. É feito de chapas de aço corten (marrom de ferrugem), com chifres de folha de ouro, em cima de um arco e de uma sapata de concreto.
- **As curvas:** placa com o número e o nome de cada uma (1 Niki Lauda, 3 Remus, 4 Schlossgold, 6 Rauch, 7 Würth, 9 Rindt; as outras só com o número). A tela "Sobre o GP" agora lista as 10 curvas.
- **Tribunas e torcida:** tribunas cobertas na curva 1, na reta de Schönberg (entre a 3 e a 4) e na curva 10; a galera de pé e sentada nas encostas, de laranja, vermelho e branco, com bandeiras da Áustria e da Estíria; acampamentos atrás das curvas 3, 4 e 10.
- **Paisagem:** uma bacia de morros verdes que fecha três lados e se abre para o vale do lado dos boxes; mata de abetos em manchas, com bétulas e lariços na borda e pastos limpos com fardos de feno; sítios e casas da Estíria (paredes brancas, madeira, telhado de duas águas), uma capela de aldeia com cúpula em cebola; torres de câmera; e as montanhas ao fundo.
- Nada fica dentro da pista nem entre a pista e a barreira.

## Relevo e barreiras reais

Rodei `node ferramentas/pista-real.js at-1969 redbullring --dem eudem25m --raio 3` e apliquei `hills`, `hillsSuave: true`, `flat: 60` e `fall: 380` em `pistas.js`.

- **Barreiras (`muros`):** a ferramenta achou a volta sem barreira em 24% de um lado e 22% do outro, abaixo dos 30%. Por isso usei os `muros`. Medido na pista montada, a matriz da barreira fica sem nada em 35% e 33% da volta, porque o gerador tira a barreira onde ela cortaria outro trecho da pista.
- **Inclinação:** a subida mais forte (antes da curva 3, em 26% da volta) chega a 16% no jogo; a real, segundo as fontes, é de no máximo 12%. A variação da inclinação entre pontos vizinhos é de no máximo 0,5 ponto percentual, sem lombada. O carro só sai do chão se o terreno cair mais de 2,5 unidades num passo, e aqui a queda máxima por passo fica bem abaixo disso.
- A brita e as zebras continuam as de antes (`SUPERFICIES_ESCAPE`), porque a física lê a mesma tabela e um teste exige brita nas curvas 9 e 10.

## O que não entrou porque não consegui confirmar

- **Asfalto de escape colorido:** não achei fonte de que o Red Bull Ring tenha. Não pintei.
- **Brita só nas curvas 4, 6, 7 e 8** (uma fonte diz que a curva 10 é de asfalto): não mudei, para não mexer na física e no teste que já existe.
- **Direção das montanhas:** as fontes dizem só que os morros fecham três lados. Deixei o vale aberto do lado dos boxes por escolha minha, e não nomeei nenhum pico.
- **Posição exata do touro, da asa e da torre:** a fonte diz que o touro fica no miolo e que a asa olha a arquibancada principal e a reta, mas não dá a posição. Pus onde faz sentido no traçado.
- **Curvas 2, 5, 8 e 10 sem nome:** as fontes discordam dos nomes.

## O que foi conferido

- Montei a cena no Node: sem erro, a conferência de invasão acusa 0 e a medida do desempenho dá 252 malhas, 141 chamadas de desenho e cerca de 340 mil triângulos na vista do jogo (Spa: 194 chamadas e 426 mil triângulos).
- No navegador (Chrome, renderização por software, `/corrida/#debug`), larguei no Red Bull Ring e tirei prints da largada, da curva 1, da curva 3 (Remus), das curvas 9 e 10, do touro, da asa e de uma vista das encostas. Conferi um a um e corrigi uma placa de curva que tocava a pista.
- Nos prints, os erros que apareceram no console foram de conexão do WebSocket, porque o teste teleportava o carro com o navegador lento. Não houve erro de JavaScript da pista.

## O que não foi conferido

- A suíte de testes não foi rodada aqui: o CI confere.
- Não joguei uma volta inteira: os prints são de pontos da pista com a câmera posta à mão.
- O desempenho foi medido no Node, não em placa de vídeo de verdade.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
