# Carreira: mercado sem leilão, jogadores desvalorizados e o olheiro acertando o preço

## O que muda no jogo

Antes, comprar de outro clube era um vai e volta de propostas e o olheiro indicava jogadores pelo valor de mercado, mas o clube sempre pedia mais do que isso: a dica "cabia no caixa" e na hora de comprar não cabia. Agora:

- **O clube diz o que pede.** Na ficha de um jogador de outro clube aparece "o clube pede R$ X (N% do valor de mercado) e o jogador quer R$ Y por mês", e o botão **Comprar pelo preço pedido** fecha na hora, sem conversa nem limite de tentativas (dá para parcelar e para dar um jogador na troca como antes). A proposta livre continua existindo, já com o preço pedido preenchido.
- **Jogadores desvalorizados.** O valor agora considera a idade (a partir dos 29 vale menos a cada ano, aos 34 menos da metade; promessas até 21 anos valem um pouco mais) e a fase (a nota média nos jogos da temporada: abaixo de 6,1 desvaloriza, acima de 6,6 valoriza), além dos gols, eventos e de estar à venda. A ficha explica o porquê ("34 anos: 44% a menos") e o Mercado tem o filtro **Só desvalorizados**. O salário acompanha o valor.
- **Olheiro reajustado.** Ele escolhe quem melhora o time e cabe no caixa pelo preço que o clube de fato pede (o mesmo da compra), mostra esse preço e o salário, e dá preferência a quem está desvalorizado (avisa o motivo). Vale na carreira solo e na em grupo.

## Como

- `public/carreira/mercado.js`: `fatorIdade`, `valorDe` com a idade, `fatorForma` com a fase (`media`), `motivosDoValor`, `desvalorizado` e `pedidoDe` (o preço e o salário que o clube e o jogador pedem; `avaliarProposta` e `precoMinimo` usam a mesma conta).
- `carreira.js`: `fatorDe` lê `save.desempenho`; `pedidoDoClube`, `consultarPedido` (canal `pedido`, só leitura) e `propor` com `direto: true`; o `olheiro` pelo preço pedido.
- Navegador: `cartas.js` (pedido do clube e motivos do preço), `tela-mercado.js` (filtro e relatório do olheiro), `inicio.js` (a idade entra no `comNota`).
- Testes em `tests/carreira-mercado.test.js`.
