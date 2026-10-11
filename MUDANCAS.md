# Carreira: transferências mais caras e o valor de mercado escondido

## O que muda no jogo

Depois do mercado novo, comprar jogador bom ficou barato demais: a idade derrubava o preço dos craques e o clube pedia perto do valor. Agora:

- **O clube pede mais.** O preço pedido sobe (titular ×1,5 do valor, reserva ×1,2, e um piso de 90% do valor da nota sem desconto de idade ou fase), então veterano e jogador em má fase continuam mais baratos, mas nunca de graça.
- **Desconto de idade mais leve:** só a partir dos 31 anos (aos 34, -20%; 36+, -38%). A fase também pesa menos.
- **O valor de mercado não aparece mais** na ficha nem na figurinha dos jogadores de outros clubes, nem a porcentagem do pedido: só o que o clube pede e o salário. O valor segue visível para o seu elenco, onde ajuda a vender.

## Como

- `public/carreira/mercado.js`: `fatorIdade`, `fatorForma` e `pedidoDe` (apego e piso).
- `carreira.js`: `consultarPedido` não devolve mais o valor.
- `public/carreira/cartas.js`: valor só nos seus jogadores.
- Teste ajustado em `tests/carreira-mercado.test.js`.
