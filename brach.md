# Corrida: cenário de Silverstone (aeródromo inglês, The Wing, campos e camping)

**Usa o kit 2 (#351), já mergeado no main; este branch inclui o merge do main.** Só aparência: `pistas.js` (traçado e `hills`), física, robôs, regras, HUD, menus, sala e carreira não foram tocados.

## O que entrou
- `public/corrida/gps/silverstone.js`: configuração do GP. Arquibancadas de curva do kit em 12 trechos (Club, Abbey, Farm, a Arena por dentro de Village e The Loop, Aintree, Brooklands e Luffield, Woodcote, Copse, Maggotts e Becketts, Chapel, Stowe, Vale), `escape` de brita em Copse e Stowe e asfalto pintado, placas de frenagem, 3 passarelas de pedestres com faixa "SILVERSTONE", torcida de branco, azul e vermelho.
- `public/corrida/silverstone.js` (novo): o cenário que só Silverstone tem.
  - **The Wing**: garagens com portas abertas e fechadas, laje de vidro e frisão azul "SILVERSTONE", vidro inclinado do Paddock Club e o teto em asa que sobe para trás com os painéis dos patrocinadores; atrás, a torre da direção de prova com a Union Jack, o piso do paddock, tendas, motorhomes e carretas das equipes.
  - **Tribunas cobertas** do kit 2 (`tribunaCoberta`) nas retas: a principal em frente ao Wing, a Wellington Straight, a reta de Copse, a de Maggotts e a Hangar Straight, com torcida e bandeiras Union Jack em cima de todas as arquibancadas (1 `InstancedMesh` de hastes e 1 de bandeiras).
  - **Aeródromo da RAF**: três pistas de pouso paralelas às retas (recortadas onde cruzam pista, escape e arquibancada), dois hangares em arco com porta de correr e barracas Nissen ao lado da Hangar Straight, a torre de controle de tijolo com cabine de vidro.
  - **Pórticos** de patrocínio (Silverstone, Pirelli, Rolex, Heineken) sobre as retas, perpendiculares à pista; faixa "British Grand Prix" no pórtico da largada; 2 telões de LED; **placas com o nome e o número de cada curva** (Abbey a Club, uma textura e uma malha).
  - **Inglaterra em volta**: patchwork de campos (cores e fileiras), sebes, cinturão de árvores e bosques, aldeias de casinhas com a igreja de torre quadrada, turbinas de vento ao longe e 4 campings (barracas em cúpula, trailers, carros, mastros com a Union Jack e a tenda da fan zone).
- `public/corrida/kit/silverstone/pecas.js` (novo): `hangarRAF`, `torreRAF`, `torreCorrida`, `igreja`, `turbina`, `telao`, `bandeiraUK` e `prismaGeo`. Montados com o `Montador` do kit 2 (cor por vértice, canvas pequeno só em letreiro e bandeira).
- `kit/README.md` (uma linha) e a linha da Corrida no `CLAUDE.md`.

## Referências
Mapa e descrição do circuito (Wikipédia, "Silverstone Circuit"): a antiga base RAF Silverstone (1943-46) com as três pistas de pouso em triângulo, a Hamilton Straight para Abbey, a Hangar Straight de uns 770 m até Stowe, o complexo The Wing de 2011 ao longo da reta dos boxes, o Arena (Village, The Loop, Aintree). Os desenhos são procedurais; nenhuma imagem ou modelo foi baixado.

## Conferido
- No navegador (porta 3363, regras de F1), percorrendo a volta: pórtico de largada perpendicular, The Wing, tribunas, hangares, placas das curvas, pórticos e passarelas, camping e visão de cima do circuito inteiro. Sem erro no console.
- `tests/ajuda-cena/invasao.mjs` em Silverstone: 0 peças dentro da pista. `medir.mjs`: ~185 chamadas de desenho com sombra na vista do jogo (era ~139), ~410 mil triângulos na vista (era ~313 mil; Melbourne tem 356 mil) e 348 malhas.
- `node --test tests/corrida*.test.js` (uma vez, no fim): 7 falhas, as 6 antigas conhecidas (pneus/estratégia, ritmo da IA, rádio) e a do "servidor de verdade" (acks e snaps), que não tem a ver com cenário e vale rodar de novo; nenhuma de pista, invasão ou desempenho.

## Ficou de fora
Árvores e campos são estáticos (sem vento) e a torcida das tribunas é só geometria baixa; os motorhomes do paddock só se veem de cima ou de longe, escondidos atrás do Wing.
