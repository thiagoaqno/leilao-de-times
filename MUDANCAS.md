# Painel visual privado para moderar carreiras

## O que muda

- Uma página separada em `/admin/carreira` permite escolher sala, clube e jogador, alterar caixa, energia, overall e atributos, transferir jogadores e desfazer uma transferência diretamente na lista.
- O acesso usa login GitHub OAuth e verifica a conta `thiagoaqno` pelo ID. A página não aparece no jogo, e as edições continuam salvas na sala ativa e no histórico do SQLite.
- O painel exige três configurações no servidor para ativar o login. As instruções estão em `DEPLOY-FLY.md`. Os workflows do Actions continuam disponíveis.

## Verificação

- Testes de autenticação do painel e moderação executados com sucesso.
