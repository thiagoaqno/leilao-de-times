# Carros de F1 mais parecidos com os reais

As 11 pinturas foram refeitas em cima das fotos de 2026 (fontes em `public/corrida/halo-referencias.md`), a Ferrari primeiro, como amostra aprovada pelo Thiago. Nada de modelo novo: o carro continua o mesmo, só muda o que é pintado nele.

- **Pinturas:** cada folha de `f1-pintura.js` segue a geometria real do modelo (medida com grade de s/y), com preto de baixo, asas de carbono, sombra pintada nas caixas e o número onde o carro de verdade usa.
- **Marcas:** `f1-marcas.js` desenha os patrocinadores no canvas, sem imagem baixada. **Decisão do Thiago:** imitar os logos, com cor e traço reconhecíveis. É a opção de maior risco de marca registrada num site público; para voltar atrás basta trocar as funções desse arquivo.
- **Reflexo:** pintura acetinada e opaca (`VERNIZ_*`), carbono sem espelhar o céu e assoalho escuro. O carro não acende no bloom: medido em HDR, em jogo, a luz máxima da Ferrari ficou em 0,89 (na `main`, até 0,98) e o limiar do bloom é 1.
- **Pneus:** letras PIRELLI e P ZERO na lateral, na cor do composto (uma textura só, de todos os carros), roda escura e borracha fosca.
- **Folha em 2×:** só o carro do jogador e o da garagem. Os outros seguem em 1×, para um grid de 22 não pesar.

## Medido (GPU real: RTX 2060 e Intel UHD)

| | `main` | esta branch |
| --- | --- | --- |
| Carro do jogador | 16 chamadas, 76.102 triângulos | 16 chamadas, 76.102 triângulos |
| Outros carros | 10 chamadas, 16.204 triângulos | 10 chamadas, 16.204 triângulos |
| Texturas do carro | 11 (leve: 9) | 12 (leve: 10): as letras do pneu |
| Memória | 11 folhas de 1024 x 1152 | as mesmas 11, mais 1 de 2048 x 2304 (~25 MB) |
| `medir.mjs monaco` (só a pista) | 188 chamadas, 282.633 triângulos | 188 chamadas, 282.634 triângulos |

## O que não foi verificado

- O FPS em jogo não foi medido: a janela ficou oculta durante os testes, e aí o navegador segura os quadros. As contagens acima são iguais às da `main`, mas falta jogar uma corrida para confirmar.
- Só a Ferrari foi vista em jogo. As outras 10 foram conferidas na página de prévia, com a luz de lá.
- A suíte de testes fica com o CI, como manda o projeto.
