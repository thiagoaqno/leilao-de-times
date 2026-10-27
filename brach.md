# Corrida: engenheiro no rádio mais sério e só durante a corrida

- **Só falas de corrida:** o engenheiro fala apenas o que um engenheiro diria na corrida ou no fim dela: largada, volta mais rápida, posição ganha/perdida, pneus, box, safety car, bandeira amarela, dano, última volta e resultado (vitória, pódio, pontos, fora dos pontos, abandono). Saíram as falas da garagem, do próximo GP, de peças, de classificação e do DRS (o código que pedia essas falas continua, só não acha fala e fica quieto).
- **Mais variações:** 4 a 5 frases por situação (70 no total), todas curtas, sem exclamação e em tom sério.
- **Menos falação:** no máximo uma fala a cada 10 s (antes 6 s); a mesma situação não se repete antes de 30 s, e ganhou/perdeu posição só a cada 90 s, pneu e dano a cada 60 s. Box e safety car continuam passando na frente.
- **Voz mais contida:** `ferramentas/radio-engenheiro.js` usa estabilidade 0,8 e estilo 0 (antes 0,45 e 0,3).
- **`gerar-radio.bat`:** pergunta se deve refazer todas as falas (para trocar as antigas, mais animadas).

Testes: `node --test tests/corrida-radio.test.js` (4/4).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
