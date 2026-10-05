# Banco: trocas mais claras, com casas, e a vez passa sozinha

## Como fica
- **Trocas em vermelho e verde:** na proposta e na janela de propor troca, o que **sai de você** fica num quadro
  vermelho ("➖ Sai de você") e o que **vem para você** num quadro verde ("➕ Vem para você").
- **Trocar imóvel com casas:** cidade com casas ou hotel agora pode entrar na troca, e as construções vão junto. A
  proposta mostra quantas casas têm (🏠2, 🏨), e o histórico diz "Mooca (com 2 casas)".
- **Sem "Passar a vez":** o botão saiu. Quando a jogada termina (comprou, mandou a leilão, pagou o que devia), a vez
  passa sozinha para o próximo depois de uma pausa curta. Enquanto alguém deve, a vez espera o pagamento.
  Construir, hipotecar e trocar continuam valendo a qualquer hora.
- As regras da página foram atualizadas.

## Por dentro
- `banco.js`:
  - `settle` chama `autoPass` quando a jogada chega em "done": um relógio de `PASS_MS` (1,2 s) que só passa a vez se
    nada mudou (mesma vez, mesma jogada, ainda em "done"). A ação `endTurn` saiu.
  - `checkSide` não trava mais imóvel com construção; o dono muda e as casas ficam.
  - Como o grupo pode ficar dividido entre dois donos depois de uma troca, a trava de hipoteca e a regra de vender
    por igual só olham as cidades do mesmo dono.
- `public/banco/painel.js`, `telas.js` e `index.html`: os quadros vermelho/verde, as casinhas nos imóveis da troca e
  o painel "Jogada feita ✓" no lugar do botão.

## Conferido
- **Teste novo (`tests/banco.test.js`):** uma partida inteira só com dados, comprar e pagar (ninguém passa a vez) e
  uma troca de cidade com casa, que chega no outro jogador com a casa.
- **No navegador:** a proposta com Mooca (2 casas) em vermelho e Liberdade + R$ 200 mil em verde; a janela de propor
  troca deixa marcar a cidade com casas; aceitar levou a Mooca com as 2 casas para o outro jogador.
- `npm test` passando.
