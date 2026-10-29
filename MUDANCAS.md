# Cenário próprio de Spa-Francorchamps

## Arquivos

- `public/corrida/gps/spa.js`: configuração visual da volta, escapes, arquibancadas, marcas reais, vegetação e ambiente.
- `public/corrida/spa.js`: implantação dos marcos, dois paddocks, riacho e face do pórtico.
- `public/corrida/kit/spa/pecas.js`: edifícios, chalés e camping exclusivos, modelados em código; repetições do camping em `InstancedMesh`.
- `public/corrida/kit/README.md` e `CLAUDE.md`: registro do novo cenário.

## Marcos e referências visuais

| Ponto na volta | Peça | Referência |
| --- | --- | --- |
| 0%, reta de largada | boxes modernos, terraço F1, torre, Gold 1 e pórtico perpendicular | [terraço e edifício F1](https://www.spa-francorchamps.be/en/directory/rooms/224_formula-1-terrace), [planta oficial do circuito](https://www.spa-francorchamps.be/assets/3541f0b5-47e5-483b-a5e6-059d99346600/all-plans-acces-csf.pdf) |
| 4–7%, La Source | arquibancada e escape de brita | [guia F1 das arquibancadas](https://www.formula1.com/en/latest/article/destination-guide-what-fans-can-eat-see-and-do-when-they-visit-spa-for-the.78Ku97BqWpH6n3wplKmmk2) |
| 10–16%, vale Eau Rouge e Raidillon | boxes antigos de Endurance, riacho, hotel, arquibancadas e escape vermelho e amarelo | [planta oficial](https://www.spa-francorchamps.be/assets/3541f0b5-47e5-483b-a5e6-059d99346600/all-plans-acces-csf.pdf), [obras e arquibancada do Raidillon](https://www.spa-francorchamps.be/en/news/244_workinprogress), [fotografia do escape](https://www.formula1.com/en/latest/article/the-best-corner-in-f1-racing-a-pictorial-history-of-eau-rouge.5v7FD8OVttEuJxr1Mw0OPc) |
| 22–34%, encostas das Ardenas/Les Combes | camping instanciado e chalés na floresta | [guia F1 de Spa](https://www.formula1.com/en/latest/article/destination-guide-what-fans-can-eat-see-and-do-when-they-visit-spa-for-the.78Ku97BqWpH6n3wplKmmk2) |
| 49–53%, Pouhon | arquibancadas, zebras e escape | [guia de curvas de Spa](https://www.formula1.com/en/latest/article/explained-how-every-corner-at-the-circuit-de-spa-francorchamps-got-its-name.1o6cyXf5F6q9VFFcgMqTqs.1o6cyXf5F6q9VFFcgMqTqs) |

## Limites e verificação

Os volumes são posicionados fora da faixa de rodagem com `livre`/`ocupado`; as fitas do riacho são recortadas junto a outros trechos. A face do pórtico segue a normal da malha da largada e olha contra a tangente. Não foram modelados o relevo externo além do terreno existente nem o interior dos edifícios. Não rodei testes, medição de draw calls ou navegador, conforme solicitado; a aparência e o desempenho ficam para a avaliação do Thiago no jogo.
