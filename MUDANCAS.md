# Cozinha: música e controles de áudio

## O que muda
- Música sintetizada durante a partida, com andamento que sobe ao longo do último minuto.
- Faca, fritura e água acompanham o preparo. A entrega toca um sino; novos pedidos têm um chamado próprio; os últimos 10 segundos têm tic-tac.
- A pausa oferece volume e botão de silêncio separados para efeitos e música. As duas preferências ficam salvas no navegador.

## Testes
- `npx playwright test tests/e2e/cozinha-som.spec.js`: verificou os controles independentes, a persistência após recarregar e a ausência de erros no navegador.
