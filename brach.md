# Corrida F1: pilotagem refeita, rede autoritativa, HUD de F1 e pistas mais leves

Tudo vale nas regras de F1 (`config.regras === "f1"`); a sala arcade continua com a física antiga, agora em passo fixo.

## Física nova, do zero (`public/corrida/dinamica.js` e `sim.js`)

- Carro com massa e inércia, arrasto e downforce crescendo com v², pneu com pico de força lateral em ~6° e queda depois, círculo de atrito (frear ou acelerar tira aderência para virar), transferência de peso e freio progressivo que trava a roda.
- Subidas e descidas: a gravidade da rampa entra na força longitudinal.
- Câmbio de 8 marchas, corte em 12 mil rpm, troca de 50 ms.
- Calibragem: 0-200 km/h em 5,4 s; de 300 a 100 km/h em ~94 m; grampo a ~27% da velocidade final. Segurar W tira o carro da pista em Interlagos, Barcelona e Monza.
- Pneus, DRS, ERS, vácuo/ar sujo, dano e o carro montado pela equipe continuam valendo dentro da física nova.
- A força lateral base subiu cerca de 30%; o pneu macio novo chega perto da guinada arcade em curvas lentas e médias. Mesmo com o freio pressionado, o carro conserva direção. O pneu duro vira menos e o macio perde aderência mais depressa com o desgaste.

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

## Testes e integração

- O teste de desempenho desconta apenas as malhas extras criadas pela divisão de instâncias por região, mantendo o teto total em cada pista. Isso resolve Baku e Las Vegas sem desfazer a otimização.
- **Robôs de F1:** agora usam `Sim.passo` a 120 Hz para direção, motor, freio, pneus, relevo e box. O ritmo da classificação usa o limite de curva e a aceleração de `Dinamica`; a IA escolhe linha, alvo de velocidade e momento da ultrapassagem. Na ultrapassagem usa ERS quando há espaço e freia se o lado fecha. O arcade continua com a física antiga.
- A sala de F1 foi aberta no Chromium, com largada em Mônaco; `CLAUDE.md` descreve a física e a IA atuais.
