# Ginásio em 3D: HD, bichos com volume, golpes em 3D e cenários dos líderes

Continua o Ginásio em 3D do #92 e junta num PR só as partes 2 e 3 do plano e o volume dos bichos. É só visual:
`regras.js`, `ginasio.js` e `rede.js` não mudaram.

## Mais definição (HD)

- A cena agora sai na resolução da tela, inclusive em telas de alta densidade, com antisserrilhado e sombra macia. A
  versão do #92 desenhava em baixa resolução e deixava os sprites borrados.
- O sprite entra no atlas pixel por pixel: o GIF do Black/White sem reduzir nem suavizar, e cada pixel do Galeramon
  com 2 pixels do atlas.
- O chão ganhou mais definição (48 pixels por casa), a sombra um mapa de 2048 e os pilares 16 lados.
- As linhas finas, a barra de vida, os sinais e o clima de tela crescem junto com a resolução.
- No modo leve (celular fraco ou `?leve=1`), a cena fica em meia resolução, sem antisserrilhado e sem sombra de
  verdade.
- No celular em pé, a névoa do fundo acompanha a distância da câmera e não apaga mais a quadra.

## Os bichos com volume (`volume.js`)

- O sprite de sempre, já com o pisca branco, o esticar e o tombo, vira uma pilha de camadas, como voxels.
- Cada pixel ganha uma espessura que cresce com a distância até a borda do desenho. O bicho fica estufado no meio e
  fino nas bordas.
- O relevo recebe a luz do sol em três tons, e a sombra no chão sai da pilha inteira.
- O que é meio transparente (o rastro e o sumir do desmaio) fica num cartaz "fantasma" junto da pilha.
- Não precisa de uma malha por quadro do GIF: a espessura é medida no atlas a cada quadro.

## Os golpes com volume (`golpes3d.js`)

- **Projéteis em 3D, um desenho por família:**
  - fogo e dragão: bola de fogo com casca e cauda;
  - água: gota com brilho;
  - elétrico: raio em zigue-zague que pisca;
  - planta: folhas girando;
  - inseto: um cone com asinhas;
  - gelo: cristais cruzados;
  - aço: estrela de arremesso;
  - pedra e terra: rocha rolando;
  - psíquico: anéis;
  - fantasma: um fantasminha com olhos;
  - veneno: bolha com bolinhas;
  - sombrio: meia-lua;
  - voador: lâminas de vento;
  - lutador: punho;
  - fada: estrelinhas;
  - normal: estrela.
- Cada projétil deixa o seu rastro, e os que brilham acendem o chão por onde passam.
- **Estouro do impacto:** clarão, anel no chão e luz.
- **Corte do corpo a corpo:** um arco em volta de quem bate.
- **Golpes de área, por família:** coluna de fogo, raio do céu com clarão, gêiser, espinhos de gelo e de planta,
  pedras voando com poeira ou cúpula de energia. No fim do aviso, as pedras caem de verdade.
- **Anéis:** um no chão na esquiva; um que sobe com brilhinhos na cura, na troca e na mudança de atributo.
- **Partículas:** as de `animacao.js` (poeira, terra, gotas, brasas...) viram cubinhos 3D.
- **Câmera:** treme nos golpes fortes e dá um "soco" de aproximação nos críticos, nos desmaios, nas explosões e na
  volta do voo ou do buraco.
- Com "menos movimento" no sistema, não há tremor, aproximação nem clarão.
- Nos temas de chão claro, nenhum golpe usa a mistura que soma luz, porque lá ela estoura em branco.

## Os cenários dos líderes (`cenarios.js`)

- **Luz:** cada tema tem a cor do sol e do ambiente.
- **Enfeites em volta da quadra:**
  - Brasa: poças de lava que pulsam e braseiros;
  - Maré: água em volta do tablado, com marolas, e boias balançando;
  - Mata: árvores, arbustos e flores;
  - Faísca: torres com bobinas e uma esfera que pisca;
  - Rochedo: rochas e estalagmites;
  - Místico: cristais flutuando;
  - Casarão: lápides tortas e velas;
  - Toca do Dragão: braseiros roxos e chifres no muro;
  - Dojô: o pórtico vermelho e as lanternas;
  - Pista Geada: espinhos de gelo e montes de neve;
  - Ginásio da Galera: torres de refletor e bandeiras das duas cores.
- **Clima em 3D:** brasas, bolhas, folhas, neve, poeira, estrelas e névoa. As faíscas continuam desenhadas na tela.

## Código

- Novos: `public/ginasio/volume.js`, `golpes3d.js` e `cenarios.js`.
- Mudaram: `cena3d.js`, `desenho.js`, `animacao.js`, `golpes.js`, `temas.js` e `index.html`.
- `CLAUDE.md` atualizado.
- Fotos novas em `planos/imagens/ginasio-3d-*.png`.

## O que não foi conferido

- `npm test` e o e2e (`tests/e2e/ginasio.spec.js` e `vila-ginasio.spec.js`) não foram rodados neste PR, a pedido.
- A revisão foi feita pelas fotos, no Chrome com WebGL de software (SwiftShader). Ainda falta jogar de verdade num
  celular fraco para ver o modo leve.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
