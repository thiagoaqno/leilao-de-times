# Carreira: duas variações novas do 4-3-3

- **Antes**, o 4-3-3 tinha cinco variações de meio: 1 volante + 2 meio-campistas, 1 volante + 2 meias, 2 volantes + 1 meia, 3 meio-campistas e falso 9. Não dava para montar o 4-3-3 ofensivo com um meia na frente de dois meio-campistas, nem o meio do Barcelona do Guardiola (Busquets, Xavi e Iniesta).
- **Agora**, a prancheta e a parada tática têm mais duas:
  - **4-3-3 O, ofensivo:** 2 meio-campistas + 1 meia. O meia joga no meio, mais à frente, e os dois meio-campistas ficam dos lados.
  - **4-3-3 G, Guardiola:** volante, meio-campista e meia. O volante fica no meio e mais atrás, o meia mais à frente pela esquerda e o meio-campista entre os dois pela direita, em escada.

## Como

- `public/carreira/taticas.js`: as duas entradas novas em `DEFS`. O resto sai sozinho dessa lista: a prancheta (`variacoesDe`), a parada tática (`NOMES_FORMACOES`), o encaixe de cada jogador na vaga (`afinidade`), o campinho (`spots`) e o motor (`vagasDe`, força do time e lances).
- Teste: `tests/carreira-taticas.test.js` confere as variações do 4-3-3 e o desenho do meio das duas novas.
