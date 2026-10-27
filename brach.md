# Corrida F1: pilotagem refeita, rede autoritativa, HUD de F1 e pistas mais leves

Tudo vale nas regras de F1 (`config.regras === "f1"`); a sala arcade continua com a física antiga, agora em passo fixo.

## Física nova, do zero (`public/corrida/dinamica.js` e `sim.js`)

- Carro com massa e inércia, arrasto e downforce crescendo com v², pneu com pico de força lateral em ~6° e queda depois, círculo de atrito (frear ou acelerar tira aderência para virar), transferência de peso e freio progressivo que trava a roda.
- Subidas e descidas: a gravidade da rampa entra na força longitudinal.
- Câmbio de 8 marchas, corte em 12 mil rpm, troca de 50 ms.
- Calibragem: 0-200 km/h em 5,4 s; de 300 a 100 km/h em ~94 m; grampo a ~27% da velocidade final. Segurar W tira o carro da pista em Interlagos, Barcelona e Monza.
- Pneus, DRS, ERS, vácuo/ar sujo, dano e o carro montado pela equipe continuam valendo dentro da física nova.

## Bugs

- **FPS:** passo fixo de 1/120 s no navegador e no servidor; quem tem mais quadros não anda mais rápido.
- **Teleporte para trás:** o servidor manda no carro. O navegador envia as entradas, prevê com a mesma física e corrige aos poucos (só salta acima de 260 u); os outros carros são interpolados com atraso fixo.
- **Batidas:** sem punição de tempo; 1% de dano por batida, que tira 1% do desempenho, com cooldown de 4 s por par (muro ou cada carro). 100% continua sendo perda total.
- **Linha de chegada:** quem recebeu a bandeirada vira fantasma, sai para a beira e desacelera.

## HUD de F1 (`hud.js`, `hud-torre.js`, `hud-f1.css`)

Torre de posições à esquerda (logo F1, volta, posição, cor da equipe, sigla, diferença, pneu, volta mais rápida, BOX/punição/Out), velocidade, marcha, BOOST/ERS, OVERTAKE/DRS, pneu e dano embaixo à direita, minimapa pequeno e banner da direção de prova no alto.

## Pistas e desempenho

- Volta que não contava nas pistas novas: corrigida, com teste que percorre a linha central de todas as pistas (`tests/corrida-pistas-volta.test.js`).
- Elementos que invadiam a pista nas pistas novas: checagem em `tests/corrida-pistas-invasao.test.js` e as peças do kit corrigidas.
- Desempenho: `kit/fundir.js` junta as malhas paradas por material e região; Mônaco caiu de ~920 malhas e 371 chamadas de desenho por quadro para ~270 malhas e ~160 chamadas.

## Testes e o que falta

- Só os da Corrida: `node --test tests/corrida*.test.js`, 194 de 197 passando. Falham 3 do teste de desempenho: a fusão aumenta as malhas em Baku (267 → 277) e Las Vegas (257 → 260), porque as instâncias espalhadas pela volta são divididas por região de propósito, e o teste não desconta essa divisão.
- **Robôs não foram refeitos:** continuam com a física e as contas antigas (curvam mais rápido que os humanos). Ultrapassagem e pilotagem mais solta ficam para o próximo PR, em cima de `Dinamica`/`Sim`.
- Não conferido no navegador depois de juntar tudo; `CLAUDE.md` não foi atualizado.
