# Corrida: Kit 2, assets de cenário para as próximas pistas

Assets novos em código (three.js procedural, low poly, cor chapada) feitos a partir das fotos de referência: os modelos baixados são cenas de ~1 milhão de triângulos sem peças nomeadas, então o kit ganha as peças próprias. Só cenário novo e solto: nenhuma pista foi alterada (`pistas.js`, física, robôs, regras, HUD, menus, sala e carreira intocados; Melbourne, Bahrein, Mônaco e Interlagos idem).

## O que entrou (`public/corrida/kit/`)
- `montagem.js`: o `Montador` junta caixas e formas por material (cor por vértice: um box inteiro fica em ~4 chamadas de desenho) e canvas pequenos só para letreiros. Não depende de `cena.js`.
- `box-equipe.js`: `boxEquipe` (prédio de 2 andares, vidros inclinados, faixa de letreiro, portas de enrolar abertas com rack de pneus, carrinho de ferramentas e carro), `retaDosBoxes` (prédio longo com toldo por equipe, muretinha com faixa amarela e arquibancada coberta em cima), `pilhaPneus`, `rackPneus`, `carrinhoFerramentas`, `carroF1`, `muretaPit` (com logo).
- `coberturas.js`: `velas` (cobertura tensionada), `tendaPaddock` (velas, faixa, mesas) e `tribunaCoberta` (degraus coloridos em seções, torcida, painéis brancos sobre aço, `alcance` da cobertura).
- `torres.js`: `torreControle` (anéis, corpo, coroa em velas, cúpula ou plana, bandeira) e `portico` (viga com letreiro nos dois lados e semáforos de largada).
- `demo.html`: página solta para ver tudo (`/corrida/kit/demo.html#box | reta | tribuna | torre | portico | tenda | tudo`), com o contador de chamadas e triângulos.
- `README.md`: tabela com os parâmetros de cada função.

Ficou de fora de propósito: nada duplica `boxes.js`/`arquibancadas.js` (esses seguem a curva da pista; os novos são peças soltas, e a cobertura em velas serve às duas).

## Conferido
- No navegador, comparando com as fotos: box vermelho (faixa amarela, vidros, portas, pneus, carro, mureta com logo), reta de 12 baias com toldos coloridos e arquibancada azul/roxa coberta, tribunas, torre de anéis com velas, pórtico e tenda de paddock. Console sem erros. Medido: reta dos boxes 6 chamadas e 13 mil triângulos; box de equipe ~26 chamadas na demo com texturas de letreiro separadas.
- `node --test tests/corrida*.test.js`: as mesmas 6 falhas antigas (pneus, ritmo da IA e rádio), nenhuma nova.

## Próximos passos
Usar em `cenario` das próximas pistas depois de conferir `livre`/`ocupado` (o `userData` de cada asset traz as medidas).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
