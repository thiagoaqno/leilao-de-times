# Corrida: uma brita só no kit de pista

O kit tinha duas formas de desenhar brita: a opção `brita` do chão (`kit/chao.js`, usada por Barcelona) e a peça `escape` (`kit/escape.js`, usada por Interlagos). Agora só existe a `escape`.

**O que mudou**
- `kit/chao.js`: a opção `brita` saiu (junto com a linha do cabeçalho que a explicava).
- `kit/escape.js`: ganhou duas opções, que não mudam nada do que Interlagos já usa:
  - `britaCurvas: raio`: brita automática do lado de fora das curvas mais fechadas que `raio`, do ápice até a saída (era o `chao.brita.raio`, 450 por padrão);
  - `corBrita`: a cor da brita (sem ela, o bege de sempre).
- `gps/barcelona.js`: passou de `chao.brita` para `escape: { britaCurvas: 450, corBrita: "#e3d9bb", largura: 24 }`, os mesmos trechos, a mesma cor e a mesma largura de antes.
- `kit/README.md` (tabela) e a linha da Corrida no `CLAUDE.md` atualizados.

**Conferido**
- `node --test tests/corrida*.test.js`: 35 de 35.
- No navegador (`#debug`), fotos de cima de 3 curvas de Barcelona e 3 pontos de Interlagos, antes (`main`) e depois: iguais; sem erro no console. Mônaco não usa brita, então não muda.
- `git diff --check` limpo.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
