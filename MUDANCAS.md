# Ginásio em 3D pixelado (parte 1: arena, câmera, luz e sombras)

O Ginásio deixa de ser um desenho 2D visto de cima e vira uma cena Three.js inclinada, desenhada em baixa resolução
(perto de 180 linhas) e ampliada com pixels nítidos. Continua 8 bits, mas agora tem cara de jogo 3D. É só visual:
`regras.js`, `ginasio.js` e `rede.js` não mudaram.

## O que mudou na tela

- **Câmera inclinada em perspectiva**, que se ajusta para a quadra inteira caber em qualquer tela: no computador, em
  pé no celular e deitado com os controles de toque.
- **Luz do sol mais ambiente, com sombreado chapado** (três tons) e sombras de borda dura. Os pilares e a torcida fazem
  sombra, e os bichos também: a silhueta do sprite cai no chão, mais uma mancha de contato embaixo.
- **A quadra do tema (`temas.js`) virou um tablado 3D**, com as linhas, o desenho do chão de cada líder (lava, ondas,
  flores, tatame...), as marcas dos golpes, os avisos de área e a mira, tudo em perspectiva.
- **Arquibancada de verdade**: degraus no fundo e nos lados, com a torcida das duas cores pulando, o muro do fundo com o
  letreiro do ginásio e a mureta na frente.
- **Os bichos continuam com os sprites de hoje** (GIF do Black/White e os quadros dos Galeramon), como cartazes em pé
  na quadra, na profundidade certa: quem está na frente cobre quem está atrás, e os pilares escondem quem passa por
  trás. Pulo, voo, Dig, desmaio, rastro e pisca branco continuam iguais.
- **Os projéteis são cartazes na cena** e deixam uma sombrinha no chão. Os estouros, cortes, golpes de área, números
  de dano, partículas e o clima continuam desenhados por cima da cena (os golpes com volume ficam para a parte 2).
- **Modo leve**: liga sozinho num celular fraco ou se os quadros saem lentos no começo da partida (dá para forçar com
  `?leve=1` ou desligar com `?leve=0`). Fica com menos pixels, sem sombra de verdade (só a mancha) e com a torcida
  parada.
- **Menos movimento** no sistema (`prefers-reduced-motion`): sem tremor de câmera e com a torcida parada.
- Sem WebGL (ou nos primeiros quadros, enquanto o Three carrega), a quadra aparece reta, vista de cima, com os mesmos
  desenhos.

## Como ficou o código

- `public/ginasio/cena3d.js` (novo): a cena Three.js. Renderizador, câmera (`enquadrar3d`), luzes, o cenário de cada
  tema (`montarTema`), a torcida, os 32 cartazes e as contas entre a tela e a arena (`projetar3d`, `chao3d`).
- `public/ginasio/desenho.js`: três passadas por quadro. O chão (`chaoCv`, visto de cima, vira textura do piso), o
  atlas dos cartazes (`atlasCv`) e o `#cv` (a cena 3D e, por cima, o que é da tela). `pontoTela(x, y, altura)` e
  `pontoMundo` funcionam em qualquer passada; `escalaEm` e `anguloTela` dão o tamanho e o ângulo na tela de um ponto
  da arena.
- `public/ginasio/animacao.js`: o bicho foi dividido em `poseBicho` (o jeito do momento), `bichoNoChao`,
  `bichoNoQuadro` (o corpo no atlas) e `bichoInfo` (a vida na tela). As partículas agora têm altura de verdade.
- `public/ginasio/golpes.js`: o corte e as pedras caindo usam o ângulo e a altura da tela 3D.
- `index.html` carrega o Three pelo importmap (`/vendor/three/three.module.js`).
- Fotos novas em `planos/imagens/ginasio-3d-*.png`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
