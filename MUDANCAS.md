# Rumi: combinações não "teleportam" mais ao mexer na mesa

## A causa (reproduzida antes de corrigir)
Numa mesa larga com 8 combinações, tocar em **uma** peça mudava de lugar 7 delas. Uma pulou do fim da primeira linha
para o começo da segunda: de (871, 150) para (38, 234).

- **Por quê:** ao escolher qualquer peça, a página acrescentava um botão "＋" (34px) no fim de **todas** as
  combinações. Todas ficavam mais largas de uma vez e, como a mesa quebra linha sozinha, as combinações mudavam de
  linha.
- **O que não era:** o estado lógico (o rascunho), o servidor e a ordem das combinações. A seleção estava mexendo
  no layout por causa desse botão.

No mesmo fluxo, mais três problemas:
1. **Grupo inteiro escolhido:** quem escolhia todas as peças de uma combinação e tocava nela mesma via a combinação
   ser esvaziada e recriada **no fim da mesa**.
2. **Quem assiste:** quando o jogador da vez tocava na primeira peça, aparecia do nada a faixa "✋ Fulano está
   mexendo na mesa" no topo, empurrando a mesa inteira para baixo.
3. **Ordem das peças:** na sua vez, a peça posta numa sequência ficava no fim (3-4-5-2) e só se arrumava quando o
   servidor confirmava. Era um pulo na hora de confirmar.

## A correção (só na apresentação e no rascunho local)
- **O "＋":** virou um selo redondo por cima do canto de cada combinação e não ocupa espaço na mesa. Escolher ou
  desescolher peças não muda a largura de nada.
- **Tocar numa combinação:** só as peças escolhidas que estão **fora** dela vão para lá. Se todas já estão nela,
  nada muda (só desescolhe).
- **A linha de cima, na vez dos outros:** fica sempre lá, numa linha só. Só o texto muda, de "⏳ Vez de Fulano" para
  "✋ Fulano está mexendo na mesa".
- **A ordem das peças:** quando você mexe na estrutura (põe peça, cria combinação), a combinação que ficou válida já
  passa para a ordem em que o servidor vai guardar. Na confirmação nada pula.

**Não mudou:** as regras, o servidor (que continua validando a jogada), o protocolo e a ordem das combinações.
Escolher peças continua mandando para quem assiste quais peças estão sendo pegas, que aparecem levantadas, sem
mexer em nada.

## Arquivos
- `public/rumi/jogo.js`: o toque na combinação, a ordem das peças depois de uma mudança e a linha de cima.
- `public/rumi/index.html`: o "＋" como selo e a linha de cima numa linha só.
- `tests/e2e/rumi.spec.js` (novo): o teste de navegador abaixo.

## Testes
- **Novo teste de navegador** (`tests/e2e/rumi.spec.js`). Uma pessoa joga contra 3 robôs numa mesa larga e outra
  assiste. Ele confere que:
  - escolher peças de duas combinações não muda o lugar nem a largura de nenhuma combinação;
  - para quem assiste também não muda nada;
  - desescolher não muda nada;
  - escolher a combinação inteira e tocar nela mesma a deixa no lugar;
  - mexer de verdade (criar combinação nova) e depois "Desfazer tudo" deixa a mesa exatamente como estava;
  - uma jogada inválida mandada direto é recusada pelo servidor, e a mesa de verdade não muda.
- **Com o código antigo**, o mesmo teste falha (as combinações mudam de lugar). Com a correção, passa.
- `npm test` (46, incluindo as regras do Rumi no servidor) e o teste de abrir as páginas (22) passando.

## Limitações
- **Arrastar:** o Rumi não tem arrastar e soltar (é por toque: escolhe as peças, toca no destino), e isso
  continua assim.
- **Combinação esvaziada:** quando uma combinação perde todas as peças e some, as que vêm depois andam uma casa.
  Isso é uma mudança real da mesa, não de seleção.
