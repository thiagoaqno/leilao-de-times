# Corrida: cinco poderes novos do Mario Kart

A Corrida ganhou os poderes do Mario Kart que faltavam, além dos seis da Batalha (banana, casco verde, casco vermelho,
cogumelo, estrela e bomba). A Batalha continua igual.

| Poder | O que faz |
| --- | --- |
| Casco azul | Voa por cima de todo mundo até o líder e explode em cima dele, derrubando também quem estiver colado. Se o líder cruza a chegada, vai atrás do novo líder. |
| Raio | Todos os outros rodam, perdem o item que tinham e ficam pequenos e lentos (72% da velocidade final). Quem vai na frente fica mais tempo pequeno (de 2,5 a 6 s). A estrela e a bala protegem. Na tela de todo mundo, um clarão. |
| Cogumelo triplo | Três turbos, um de cada vez (o botão do item mostra quantos sobram). |
| Lula | Joga tinta na tela de quem está na frente de quem usou: manchas pretas que escorrem e somem em 4,5 s. |
| Bala | Piloto automático por 3,5 s: o carro vira a bala, segue a pista sozinho a 145% da velocidade final e não roda com nada. |

- **Roleta pela colocação, como no Mario Kart:** na frente saem mais banana e casco verde; lá atrás, cogumelos, estrela,
  bala, casco azul e raio. O líder nunca tira estrela, bala, casco azul nem raio. Antes a Corrida usava a roleta da
  Batalha; agora tem a própria (`rollItem` em `corrida-itens.js`).
- **De estrela ou de bala, quem encosta nos outros derruba (como no Mario Kart).** Antes a estrela só protegia.
- **Os robôs usam todos os poderes novos e sofrem com eles:** encolhidos andam mais devagar, com tinta tiram o pé, e de
  bala aceleram e passam por cima do trânsito.
- Os modelos 3D dos poderes novos (`modelos.js`): o casco azul com asas e espinhos, o raio aceso, os três cogumelos, a
  lula e a bala com os olhos bravos. Os ícones do botão do item saem desses modelos.

## Testes
- Novo `tests/corrida-poderes.test.js`: a roleta pela colocação, o cogumelo triplo, o raio, a lula, o casco azul até o
  líder e a bala derrubando quem encosta.
- Não rodei os testes. Conferido no navegador: uma corrida com 7 robôs usando os itens sem erro (no navegador e no
  servidor), os ícones dos poderes novos, a tinta da lula, a bala no lugar do carro e o carro encolhido pelo raio.
