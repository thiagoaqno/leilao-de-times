## Engenheiro de equipe no rádio e tema base da carreira F1

### Rádio
- `public/corrida/radio/falas.js`: 42 falas curtas em 21 situações (boas-vindas, próximo GP, largada, volta rápida, ganhou/perdeu posição, pneu, box, safety car, amarela, dano, DRS, última volta, vitória, pódio, pontos, fora dos pontos, abandono, classificação boa/ruim, peças).
- `ferramentas/radio-engenheiro.js` + `gerar-radio.bat`: geram `public/corrida/radio/<id>.mp3` pela ElevenLabs (chave só no ambiente, nunca gravada nem impressa; pula o que já existe; `--refazer`). **Os mp3 não vão no git** (`.gitignore`).
- `public/corrida/radio.js`: toca a fala certa nos eventos da corrida F1 (largada, pneu, box, safety car, amarela, DRS, posição, última volta, resultado, classificação) e na sede/box (boas-vindas, próximo GP, peças). Fila sem sobrepor, uma fala a cada ~6 s (box e safety car passam na frente), não repete a mesma seguida, filtro de rádio (300-3000 Hz, chiado e clique) no volume geral. Sem mp3: não toca nada e não dá erro. Sem legenda.
- Botão do fone (silenciar o engenheiro) na barra do box, no HUD e na sede, salvo em `corrida:radio`, independente do som geral.

### Tema
- `public/corrida/tema-f1.css`: variáveis, fundo claro de estúdio, barra de abas em caixa alta, cartões escuros com filete da equipe, botões e campos. Aplicado à sede (abertura, criar/recuperar/excluir carreira, temporada em grupo, calendário, classificação, peças, desenvolvimento, fim de temporada), à sala/box F1 e às telas de classificação e resultado do GP. Celular com 16 px de margem e sem rolagem lateral. Nenhuma regra ou lógica mudou.

### Como usar as vozes
Dê dois cliques em `gerar-radio.bat`, cole a chave da ElevenLabs (Enter na voz = padrão) e espere.

### Testes
`tests/corrida-radio.test.js` (falas por situação, ids únicos, textos curtos, sem repetir, sem mp3 sem erro).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
