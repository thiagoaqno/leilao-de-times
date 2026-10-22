# Cozinha: Mundo 4, "Casa cheia" (seis fases novas)

Seis cozinhas novas com receitas que já existiam, cada uma numa planta diferente. Entram três receitas que ainda não
tinham cozinha: sopa de cogumelo, salada completa e hambúrguer completo. Não muda nada no motor: são só desenhos novos
em `COZINHAS` (`public/cozinha/regras.js`), e as metas das estrelas saem do planejador, como nas outras fases.

| Fase | Nome | Receitas | O que muda no caminho |
| --- | --- | --- | --- |
| 4-1 | Cozinha comprida | as três sopas (cebola, tomate e cogumelo) | caixas de um lado, panelas do outro, ilha no meio |
| 4-2 | Cozinha dividida | saladas (com tomate, completa) e hambúrgueres (com alface, completo) | parede de bancadas com uma passagem só; a comida passa por cima do balcão |
| 4-3 | Ilha do sushi | sashimi e os dois sushis | tábuas e panelas numa ilha no centro, com um corredor em volta |
| 4-4 | Cruzamento | os dois burritos | divisórias em cruz que descem juntas a cada 25 s, com o meio sempre aberto |
| 4-5 | Forno no meio | as duas pizzas | o forno numa ilha central |
| 4-6 | Banquete | sopa de tomate, salada completa e hambúrguer completo | a final: três cardápios juntos, com uma coluna no meio |

- O mapa das fases ganhou o Mundo 4 ("Casa cheia"). Como nos outros mundos, cada fase abre com 1 estrela na anterior.
- Cozinha 4-3 e 4-5 marcam onde começam os cozinheiros 3 e 4 (o lugar automático cairia em cima da ilha).

## Testes
- `tests/cozinha.test.js`: novo teste de que o Mundo 4 tem seis fases, só com receitas que existem e cada uma com uma
  planta diferente de todas as outras. O teste "toda cozinha do catálogo dá para jogar" já confere as fases novas.
- `tests/e2e/cozinha-fases.spec.js`: agora espera quatro mundos e abre também as fases 4-1 a 4-6.
- Não rodei os testes. Conferido à parte: nas seis, todos os lugares e bancadas se alcançam, todas as receitas dão
  para fazer, e as metas ficam na faixa das fases com o mesmo cardápio. No navegador, as seis abrem e chegam à
  contagem sem erro.
