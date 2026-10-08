# Naruto: os cinco lendários desenhados em 8 bits

No #101 o Primeiro Hokage, o Quarto Hokage, o Madara, o Obito e o Shisui entraram com o sprite de outro ninja com as cores
trocadas. Agora cada um tem o seu sprite de verdade, desenhado em 8 bits.

- **Como foram feitos:** `ferramentas/sprites-lendarios.py` desenha cada um do zero, por código (cabeça, cabelo, roupa, braços
  e pernas), com contorno escuro, luz nas bordas de cima e sombra nas de baixo. Mesmo tamanho e mesma pose de guarda dos
  outros ninjas, respirando em 4 quadros. O visual e as cores vêm das imagens de referência da Narutopedia (as da Dattebayo
  API).
- **Primeiro Hokage:** cabelo preto comprido, pele morena, armadura vermelha com ombreiras.
- **Quarto Hokage:** cabelo loiro espetado com as duas mechas, bandana azul com a placa, colete verde e o casaco branco com
  a barra vermelha nas costas.
- **Madara:** cabelo enorme de pontas, franja sobre um olho, armadura vermelha com gola alta e o leque de guerra.
- **Obito:** cabelo curto e espetado, cicatrizes no rosto, olho vermelho e a capa cinza de gola alta.
- **Shisui:** cabelo bagunçado, bandana preta com a placa de Konoha, Sharingan e o casaco azul-marinho com cachecol.
- Saiu o código de troca de cores de `ferramentas/sprites-naruto.py`, que só servia para esses cinco. Os `quadros` deles em
  `naruto.js` agora são 4. `CLAUDE.md` e `NARUTO-ASSETS.md` atualizados.
- Fotos: `planos/imagens/naruto-lendarios.png` (os cinco) e `naruto-elenco.png` (os 30 na arena).
- Eles são mais simples e blocados que os rips dos jogos de DS. Um retoque pixel a pixel deixaria mais perto deles.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
