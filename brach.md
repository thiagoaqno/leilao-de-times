# PR4: temporada solo de Fórmula 1

Branch `feat/corrida-f1-temporada-solo`, criada a partir de `origin/main` após a incorporação do PR intermediário #322.

## Adicionado nesta branch

- Sede da temporada em `/corrida/temporada/`: criação, recuperação, próximo GP, calendário, tabelas de pilotos e construtores, garagem, mercado, caixa e limite anual de gastos. A entrada da Corrida agora aponta para ela; o resultado do GP e o botão de saída voltam à sede.
- Save próprio no SQLite (`corrida_temporadas`, migração 018), com hash do token e do código de recuperação. O save mantém equipe, carro, companheiro, engenheiros, dinheiro, calendário e histórico de resultados. A recuperação troca o token; o código pode ser renovado.
- Mini temporada de 4 GPs ou temporada de 8 GPs, com pistas que já existem no jogo e ordem baseada no [calendário oficial de 2026](https://www.formula1.com/en/latest/article/formula-1-reveals-calendar-for-2026-season.YctbMZWqBvrgyddrnauo8). O grid usa 20 carros: o jogador, seu companheiro contratado e 18 rivais de 2026. O companheiro permanece na equipe escolhida durante o campeonato.
- Cada etapa abre classificação Q1/Q2/Q3 e corrida F1 já existentes, em sala privada que não aparece na Vila. Um acesso válido permite voltar ao GP. Abandono sem retorno após 20 segundos vira DNF; os bots continuam. Só a bandeirada registra o resultado e avança o calendário, uma vez por GP.
- Pontuação oficial de pilotos e construtores, desempate por vitórias e melhores colocações, histórico do último GP e campeões ao fim do calendário. O ano seguinte preserva caixa, contratos, carro e desenvolvimento; zera pontos e gastos anuais.
- Contratação de companheiro e engenheiros, desenvolvimento de até quatro pontos extras de montagem, prêmios, patrocínio, salários e teto anual de R$ 140 milhões. A equipe de box dá crédito de tempo por parada no resultado do GP. A validação financeira e da montagem acontece no servidor.

## Conferência

- `node --test tests/corrida*.test.js`: testes da Corrida passaram.
- Teste novo: quatro bandeiradas simuladas atravessam o canal da sede, produzem quatro saves e 74 pontos para o jogador; callback repetida não duplica GP. Também cobre grid e contrato, orçamento, token e recuperação, persistência após reabrir SQLite, sala privada e acesso à classificação.
- Navegador real: criação e sede conferidas em 1440 px e 390 px, sem erros de JavaScript nem rolagem horizontal; botão Iniciar GP abriu a classificação em Melbourne. Capturas conferidas localmente.
- `git diff --check`.

## Fontes consultadas

- [Calendário oficial de 2026](https://www.formula1.com/en/latest/article/formula-1-reveals-calendar-for-2026-season.YctbMZWqBvrgyddrnauo8): ordem das oito etapas disponíveis no jogo.
- [F1DB](https://github.com/f1db/f1db): referência para dados históricos; nenhum pacote ou base externa foi importado nesta branch.
- [awesome-f1](https://github.com/subinium/awesome-f1#tools-and-apps): índice de ferramentas para aferição futura de pistas e telemetria.
