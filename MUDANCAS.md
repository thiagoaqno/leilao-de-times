# Corrida: volta para antes dos carros do Drag

O jogo ficou travado depois do PR #285 ("Corrida: libera carros do Drag e aquece primeira largada"). Este PR desfaz
só ele: o código volta a ser o do `main` logo depois do PR #284.

- Os carros do Drag ficam só no Drag, comprimidos (meshopt + WebP), como no PR #283.
- A Corrida volta a ter só os carros de F1 de sempre (os cinco acertos).
- Saem `public/corrida/carros-drag.js`, `tests/corrida-carros-drag.test.js` e `tests/e2e/corrida-carros-drag.spec.js`.
- O aquecimento da primeira largada, que veio no mesmo PR, também sai.

## Testes
- Não rodei os testes. O código é o mesmo do `main` do PR #284, que já estava no ar.
