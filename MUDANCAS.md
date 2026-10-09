# Carreira — pênalti cinematográfico em 3D

- Replay 3D no navegador nas cobranças decisivas durante as partidas e nas disputas de pênaltis de mata-mata. A câmera fica atrás do batedor, com aproximação na corrida e destaque para o desfecho.
- Cena procedural em Three.js (já usada pelo projeto): estádio com arquibancada, gramado e área marcados, gol de 7,32 × 2,44 m com rede, personagens articulados no estilo de caixinhas da Pelada e bola com trajetória dirigida.
- Seis zonas **esquerda/meio/direita × alto/baixo**. O motor existente continua decidindo a cobrança no servidor, inclusive as escolhas independentes dos dois técnicos no modo grupo e a probabilidade **fixa de 5%** de chute para fora; a animação não altera o resultado.
- Variações de movimento para corrida e chute, defesa com salto ou deslocamento, comemoração e frustração. O relógio visual aguarda a conclusão do replay para não anunciar gol ou defesa antes do chute; a rodada multiplayer continua sob controle do servidor.
- Botão **Pular animação**, fechamento ao esconder a aba e liberação dos recursos WebGL. Se WebGL falhar ou houver preferência por movimento reduzido, o fluxo e os replays existentes continuam disponíveis.
- Teste de regressão em `tests/carreira-penaltis.test.js` garantindo as seis zonas e os 5% de chance de erro. A sintaxe de `partida.js` e `penalti-3d.js` foi verificada; não foi possível executar os testes Node/Playwright nem inspecionar o resultado no navegador nesta sessão.

**Arquivos:** `public/carreira/penalti-3d.js` (novo), `public/carreira/index.html`, `public/carreira/partida.js`, `public/carreira/estilo.css`, `tests/carreira-penaltis.test.js`, `MUDANCAS.md`.
