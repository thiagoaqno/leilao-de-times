# Corrida: cenário de Melbourne (refeito)

O PR #348 (primeira versão do cenário de Melbourne) foi para o `main` com defeitos. Este PR refaz só o cenário do Albert Park Circuit, sem mexer em traçado, relevo, física, robôs, regras, HUD ou menus.

## O que estava errado

- **Pórtico da largada girado 90°**: a viga corria ao longo da pista e ainda ficava duplicada com o pórtico das cinco luzes que `pista.js` já monta. Saiu; vale o de `pista.js`.
- **Lago invisível**: a forma da água estava com o eixo z espelhado (a malha gira -90° em X) e caía fora do mundo. As coordenadas eram fixas, não vinham do traçado.
- **Skyline flutuando**: a cidade estava ao sul, fora do chão do mundo. Melbourne fica ao norte do parque.
- Lista de arquibancadas do som da torcida diferente das arquibancadas desenhadas.

## O que foi refeito (`public/corrida/melbourne.js` e `gps/melbourne.js`)

- **Lago Albert Park** calculado a partir do traçado: o ponto do miolo mais longe da pista e um contorno por raios que param a uma folga da pista, alisado. Nível da água acima do terreno do contorno. Ilha Gunn com árvores e clube de remo/vela (deque, galpão e veleiros) na margem, virado para a água.
- **Cidade ao norte** (z menor): Eureka Tower (coroa dourada, faixa vermelha), Australia 108 (anel dourado), Rialto, 101 Collins e 70 prédios de vidro, tudo checado com `livre()` e registrado em `tr.reservado`. Torres com janelas desenhadas em canvas.
- **Pórticos azul-escuros "MELBOURNE / Australia"** atravessando a reta dos boxes, perpendiculares ao traçado, com os pilares fora da pista (referência das fotos da largada).
- Arquibancadas passam a ser só as do kit (`arquibancadas.trechos`); o som da torcida vem delas.
- Gaivotas e som de água seguem o lago calculado.
- Prédio dos boxes do kit (`prediosDosBoxes`), zebras verde e amarelo, escape, painéis e árvores do parque, como já estavam na configuração.

## Conferência

- Navegador (`#debug`, sala de teste na pista Melbourne): pórtico de largada atravessa a pista na linha, pórticos azuis perpendiculares, lago visível no miolo com a ilha, sem erro no console.
- `tests/corrida-pistas-invasao.test.js`, `-volta` e `-desempenho`: Melbourne sem invasões.
- `node --test tests/corrida*.test.js` (só os testes da Corrida): as falhas restantes (ritmo dos níveis de IA, estratégia/pneus, fala sem mp3) já falham no `main`, sem relação com o cenário.

## Ficou de fora

- Faixa magenta de entrada dos boxes, alambrado alto e grama listrada das fotos de referência.
- Relevo (`hills`) não foi tocado.
