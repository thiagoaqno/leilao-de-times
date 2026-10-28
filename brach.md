# Corrida: as luzes dos refletores do Bahrein acendem de verdade

O #358 trocou as placas claras por `SpotLight`, mas na pista não aparecia nada. Dois motivos:

1. **As luzes ficavam presas na origem do mapa.** O `kit/fundir.js` roda a animação uma vez para ver o que se mexe e congela a matriz do resto (`matrixAutoUpdate = false`). As luzes só andam de noite e com o carro na pista, então no teste dele ficaram paradas e foram congeladas em (0, 1, 0), longe da pista. Agora ficam guardadas em `tr.luzesRefletores`, e o `fundir.js` deixa quem está em `tr` em paz (a regra do `kit/README.md`).
2. **A noite do jogo é clara demais para a luz aparecer.** A luz ambiente da noite (`hemi` 0,95, em `pista.js`) quase apagava o refletor. No Bahrein, à noite, ela baixa para 0,5 (`HEMI_NOITE`), e a força das luzes subiu de 230 para 1100. O asfalto continua visível e o trecho debaixo de cada torre fica claro, com o carro dentro da luz.

Só `kit/bahrein/luz.js`. As outras pistas e o dia do Bahrein não mudam.

## Conferido
- No navegador, Bahrein à noite com as regras de F1: as 6 luzes na posição das torres e apontadas para a pista (antes, na origem), e a luz aparecendo no asfalto.
- `node --test tests/corrida-pistas-desempenho.test.js tests/corrida-pistas-invasao.test.js tests/corrida-pistas-volta.test.js`: 76 de 76.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
