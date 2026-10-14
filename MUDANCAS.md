# Moderação da carreira em grupo pelo GitHub

## O que muda

- Workflows manuais na aba Actions do GitHub permitem listar e consultar salas, alterar caixa, energia, overall e atributos, transferir jogadores e usar um botão próprio para desfazer transferências simples.
- A edição vai ao servidor da sala ativa, atualiza os jogadores conectados e é salva no SQLite com registro de quem executou, valor anterior e novo valor.
- O workflow só roda para `thiagoaqno` na `main`; a API verifica a assinatura e a origem do token temporário OIDC do GitHub. Nenhum controle de moderação aparece no jogo e não há segredo novo para configurar.
- Enquanto há partida ao vivo, a edição espera o jogo terminar. Trocas entre técnicos e compras parceladas não são desfeitas automaticamente.
- As instruções de configuração estão em `DEPLOY-FLY.md`.

## Verificação

- Os testes de moderação, banco e carreira em grupo passaram. Um teste com servidor real confirmou a edição na sala conectada e a persistência após reiniciar.
