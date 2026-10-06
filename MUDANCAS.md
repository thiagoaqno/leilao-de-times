# Leilão: novas formações de futsal

## Como fica
- **Três formações novas no futsal**, além de 2-2, 3-1, 1-2-1 (losango) e 1-1-2:
  - **2-1-1 em T:** dois defensores, um meia e o pivô. Segura atrás sem abrir mão do pivô.
  - **1-3 ofensiva:** um defensor e três atacantes. Ataque lá em cima, defesa exposta.
  - **4-0 rodízio:** os quatro em linha no meio da quadra, sem pivô fixo. Para time de meias que sabem fazer de tudo.
- Aparecem na caixa "Formação" da sala, com a explicação de cada uma, e o campinho mostra os jogadores no lugar certo.
- A **automática** também testa as novas e fica com a que deixa o time mais forte.
- As regras da sala citam as 7 formações do futsal.

## Por dentro
- `public/escalacao.js`: as três entram em `FORMATIONS.futsal`.
  - O 4-0 é `{ DEF: 0, MID: 4, ATT: 0 }`.
  - `spotsOf` ignora a linha "0", então os quatro ficam numa linha só, no meio da quadra.
- `public/leilao/sala.js`: os nomes na lista `FORMS`.
- `public/leilao/index.html`: o texto das regras.
- O servidor já aceita qualquer formação de `FORMATIONS` (`ALL_FORMATIONS`), sem mudança.

## Conferido
- `npm test`: 62 passaram, 0 falharam.
- As vagas de cada formação batem com o número de jogadores (goleiro e mais 4), e a química liga o goleiro aos quatro do 4-0.
- Um campeonato de futsal simulado com um time em cada formação nova e um na automática terminou normal. A
  automática escolheu o 2-1-1 para aquele elenco.
- No navegador, numa sala de futsal com robôs:
  - a lista mostra as 7 formações;
  - trocar para 4-0 salvou e o campinho pôs os quatro em linha no meio;
  - no 1-3, os três ficaram na frente, com ataque 87 e defesa 71.
- Foto em `planos/imagens/leilao-formacao-4-0.jpg`.
