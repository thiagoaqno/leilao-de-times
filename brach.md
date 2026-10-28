# Corrida: cenário de Suzuka

Suzuka sai do GP simples genérico e ganha um cenário próprio, rico e reconhecível. Só cenário: `pistas.js` (traçado e `hills`), física, robôs, regras, HUD, menus, sala e carreira intocados. O kit 2 (#351) já está no main; este PR o usa.

## O que entrou
- **Viaduto do "8"** (`kit/suzuka/viaduto.js`): laje sobre vigas, mureta branca com grade de aço, postes de luz, pilares com viga de apoio, muros de arrimo com faixa vermelha e branca no trecho de baixo e faixas penduradas. O traçado e a altura continuam os de `pistas.js` (`cruza`).
- **Prédio dos boxes** (kit/boxes.js, atrás das garagens do corredor) com a torre de controle do kit 2 no teto e aterro de concreto (a reta desce 45 de ponta a ponta). **Arquibancada principal** coberta do outro lado (3 módulos de `tribunaCoberta`, seções coloridas, torcida), inclinada junto com a reta.
- **Alameda de entrada** atrás da arquibancada: pórtico "SUZUKA CIRCUIT" (kit 2), 4 torii vermelhos, fios de lanternas (chochin), estandartes nobori em japonês, tendas de hospitalidade (kit 2) e 5 estacionamentos cheios de carros (`kit/suzuka/japao.js`).
- **Parque do circuito** na bolsa aberta entre a Dunlop e a Degner: **roda-gigante** que gira (cabines penduradas, lâmpadas coloridas; `kit/suzuka/roda-gigante.js`), hotel, torre de queda, carrossel e pavilhão em velas.
- **Morros de floresta** (`kit/suzuka/colinas.js`): relevo de baixa resolução em uma malha só, com ~5 mil cedros, folhosas, bordos vermelhos e cerejeiras em flor; mais um bosque junto da pista (`kit/parque.js`) e ~100 cerejeiras na beira, no parque e na alameda.
- Zebras vermelhas e brancas, zebra alta nas Degner/Hairpin/Spoon/130R/Casio, brita bege e muros de pneus, 12 arquibancadas de curva com torcida japonesa, marcas em japonês (Suzuka, Japanese GP, Honda, Dunlop, Casio, Yokohama...), passarelas, bandeira do Japão e faixa "鈴鹿サーキット" no pórtico da largada (o pórtico das luzes é o de `pista.js`, perpendicular à pista na linha).

## Desempenho
Tudo em InstancedMesh ou uma malha por material (kit 2/`Montador`); árvores sem sombra e cortadas por região (`fundir.js`). `tests/ajuda-cena/medir.mjs suzuka`: ~207 chamadas de desenho na vista do jogo e ~460 mil triângulos (Melbourne: 167 e 356 mil). A roda só recalcula as cabines com a câmera a menos de 3800.

## Conferido
Navegador (Chromium, porta 3362): volta inteira em 12 pontos, largada, arquibancadas, boxes, alameda, parque, viaduto (de cima, de baixo e de lado) e morros; sem erro no console. `tests/ajuda-cena/invasao.mjs` em Suzuka: 0 peças na pista. `node --test tests/corrida*.test.js` rodou inteiro: só as falhas antigas conhecidas (pneus/estratégia, ritmo da IA, rádio); volta, invasão, desempenho e robôs (88 testes) passam.

## Fora / anotado
Fotos e descrições vieram da memória de como o circuito é e de buscas rápidas; nenhuma imagem foi baixada. O relevo de `pistas.js` deixa a pista numa plataforma acima do chão plano em volta: os morros só começam a 470 do eixo para não brigar com ele.
