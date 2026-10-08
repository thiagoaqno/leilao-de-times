# Carreira em grupo: rodada em 3×

Este PR permite que o anfitrião acelere para `3×` os jogos multiplayer que estão acontecendo ao vivo. A velocidade
é uma decisão única da sala: todas as partidas humanas avançam juntas e todos os participantes enxergam o mesmo
ritmo.

## O que muda

- **Controle do anfitrião:** durante a rodada, quem criou a sala pode alternar entre `1×` e `3×`; para os demais, os
  botões aparecem sincronizados e desabilitados.
- **Relógio contínuo:** mudar o ritmo não pula o minuto atual. O servidor guarda os segmentos de velocidade e aplica
  o cálculo também aos jogos que estiverem pausados.
- **Decisões preservadas:** o 3× acelera somente o relógio da partida. O prazo real para decisões táticas e lances
  decisivos não fica três vezes menor.
- **Sem atalhos locais:** o botão `Pular` continua oculto no multiplayer. O modo `Turbo` da sala permanece separado:
  ele encurta a temporada, enquanto o 3× apenas acelera a rodada em andamento.
- **Fim de jogo estável:** se o servidor fechar uma rodada em 3× antes do último quadro visual, o cliente usa o
  resultado confirmado para mostrar o apito final normalmente.

## Conferido

- **Testes focados:** 6 testes passaram no relógio da rodada e no canal multiplayer, incluindo troca de velocidade,
  pausas, permissão exclusiva do anfitrião e sincronização com o outro participante.
- **E2E focado:** 1 cenário passou em 48,0 s, confirmando o controle do anfitrião, o botão bloqueado para o convidado,
  o 3× visível para os dois e a conclusão normal da rodada.
- **Foto:** `planos/imagens/carreira-grupo-3x.png`.
