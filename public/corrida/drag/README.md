# Modo drag — no jeito do Need for Speed Underground 2

Abra `/corrida/drag/` pelo botão na entrada da Corrida da Galera. Corrida local contra três rivais, em três pistas noturnas (Ponte Estaiada, Debaixo do Elevado, Porto à Noite), retas com curvas leves e quatro faixas.

- `logic.mjs`: as regras, puras (testadas em `tests/corrida-drag.test.mjs`). `criarCorrida` e `passoCorrida` rodam a corrida inteira: aquecimento dos pneus (`aquecer`, `ZONA_PNEU`), as luzes, a largada (`largar`: perfeita, boa, patinou ou fraca), câmbio manual (`shift` devolve a qualidade pelo giro: perfeita na faixa verde, boa na azul, cedo ou tarde), nitro (patina na 1ª e 2ª), vácuo (`atualizarVacuo`), freio, tráfego e obras (`gerarTrafego`: cada faixa num ritmo, nada atrás das obras), perda total (bater de frente com `PERDA_TOTAL_KMH` de diferença), raspão na troca de faixa e motor que estoura no corte (`ENGINE_LIMIT_SECONDS`). Os rivais (`RIVAIS`, `pilotar`) trocam marcha mirando um giro, usam nitro, desviam e freiam conforme a habilidade.
- `main.js`: desenha a corrida (cenário varrido ao longo da curva com `varrer`/`instanciar`, brilho com bloom, neon, lanternas, fumaça dos pneus, cones que voam), o HUD (conta-giros com as faixas e a luz de troca, N2O, vácuo, motor, posição, árvore de luzes) e o som sintetizado. A qualidade cai sozinha se os quadros ficarem lentos (`drag:qualidade`; `?leve=1` já começa leve). `#debug` expõe `window.__drag`.
- Carros: os seis GLB de `models/`, empacotados por `tools/importar-carros-drag.py`. O jogador usa o escolhido; os rivais usam três dos outros (carregados enquanto você escolhe; até chegarem, aparece um carro provisório). O brilho das lanternas vai nas peças de lanterna de cada modelo (`acharLanternas`; `LANTERNAS_FIXAS` para o 911 e a SF90). O Skyline R33 não trouxe arquivo de licença; verificar os direitos antes de distribuir.

Controles: W/↑ acelera, S/↓ freia, ←/→ (A/D) trocam de faixa, Shift ou E sobe marcha, Q reduz, Espaço (ou N) nitro. No toque: GÁS, FREIO, N2O, + e − e as setas.

Músicas: coloque `.mp3` em `musicas/`; a pasta é lida a cada corrida.
