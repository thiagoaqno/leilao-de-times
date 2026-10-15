# Copa do Mundo na Carreira de Treinador

## Fluxo

A seleção agora aparece por oferta depois do desempenho da primeira temporada. O técnico pode aceitar uma das propostas ou recusar. Ao aceitar, mantém o clube e dirige a seleção na Copa da segunda temporada. Funciona na carreira solo e em grupo; em uma sala, duas pessoas não podem aceitar a mesma seleção.

A lista de convocados tem 26 atletas, com pelo menos dois goleiros. O técnico pode trocar nomes apenas por jogadores da mesma seleção até a estreia. O mercado de clubes continua separado da convocação, e os atletas das seleções não aparecem para compra.

## Copa e calendário

A base gerada do EA FC 27 tem 48 seleções nos 12 grupos do formato de 2026. A competição simula 72 jogos de grupos e 32 jogos eliminatórios, incluindo o terceiro lugar: 104 partidas. As oito melhores terceiras avançam com as duas primeiras de cada grupo. A pausa da Copa ocupa as semanas 40 a 47; os jogos de clubes que vinham depois da semana 39 são deslocados em oito semanas sem mudar sua ordem. As janelas de transferência seguem a rodada da liga, não o número absoluto da semana.

Quando a base EA FC 27 tem poucos ou nenhum atleta de uma nação, o gerador completa a lista com atletas locais genéricos para garantir uma convocação válida. Esses atletas têm nomes explícitos na interface.

## Painel administrativo

Editar um atributo individual agora invalida as simulações e as bases pré-calculadas, refazendo as partidas futuras com o valor salvo. Isso também vale para a primeira temporada, quando a base original era usada diretamente. O overall editado entra no mesmo recálculo.

## Verificação

- Teste determinístico da Copa: 48 equipes, 12 grupos, 104 jogos, campeão repetível e calendário sem conflitos.
- Teste das ofertas, dos limites da convocação e da proibição de atletas de outra nação.
- Teste de moderação: atributo salvo aparece no time do motor e na base usada para projetar jogos futuros.
- Suíte de calendário e moderação existente.
