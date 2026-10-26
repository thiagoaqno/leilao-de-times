# Plano: a temporada de F1 na Corrida

Só o documento, sem código: `planos/temporada-f1.md`, o plano para levar a Corrida da Galera a um modo carreira de Fórmula 1, dividido em 14 PRs pequenos, cada um com o que entrega e como testar.

**As quatro partes**
- **Dirigibilidade e regras de F1** (PRs 1 a 5), como opção da sala de hoje: pneus (macio, médio e duro, desgaste medido em fração da corrida e temperatura), pit stop pelo corredor dos boxes com a regra dos dois compostos, DRS clássico e ERS, bandeiras, limites de pista, penalidades e safety car, classificação, grid de 22, as cinco luzes e a pontuação oficial. O plano mostra onde cada regra entra em `fisica.js` (o `spec` que a física já recebe, a linha da aderência dos pneus, o `boostK` do vácuo e do turbo, o piloto automático da bala no corredor dos boxes).
- **A equipe** (PRs 6 e 7): as peças viram o `spec` do carro sob um teto de gastos, mais os pilotos reais de 2026 e quatro engenheiros.
- **A temporada solo** (PRs 8 a 10): o save como o da Carreira, a sede da equipe, 8 GPs com a final em Interlagos, os campeonatos de pilotos e de construtores, o dinheiro e o desenvolvimento entre GPs.
- **O multiplayer** (PRs 11 a 14): a sala com código, dois amigos podendo dividir a mesma equipe, o GP ao vivo para todos, o mercado de pilotos em leilão e o acabamento.

**Decisões do Thiago** (já no plano)
- Pilotos e equipes reais de 2026 (as 11 equipes e os 22 titulares; o jogador assume uma equipe e é o piloto 1 dela).
- DRS clássico.
- A lista de GPs está boa.
- Dois amigos podem dividir a mesma equipe (o primeiro que entrou é o chefe e confirma a montagem).

Nenhum código mudou.
