# Corrida em grupo sai do lobby ao preparar a pista

Quando uma pista era preparada em segundo plano pela primeira vez, a largada começava depois da resposta inicial sem atualizar imediatamente os jogadores. Eles podiam continuar no lobby enquanto a corrida já estava em andamento. O servidor agora envia o estado da sala assim que a preparação termina e a largada é iniciada.

## Verificação

- Conferência manual de uma sala local com dois jogadores em navegadores diferentes: ambos receberam a corrida após a preparação.
- Sintaxe e diff conferidos; verificações automatizadas no GitHub.
