# Taças da Estante salvas no Git

- Corrige as imagens ausentes da Estante do PR #241. O endpoint `www.thesportsdb.com` não entregava as fotos de forma estável; a consulta passa a usar `api.thesportsdb.com` e normaliza os arquivos para o domínio de mídia `r2.thesportsdb.com`.
- As 14 imagens de `strTrophy` da [TheSportsDB](https://www.thesportsdb.com/docs_artwork) foram baixadas e salvas no Git. A Estante agora carrega os PNGs locais, sem depender da API durante o jogo; se um arquivo faltar, mantém a ilustração de reserva.
- Se o clube do jogador ainda não tiver taças, a Estante abre no primeiro campeão para mostrar a vitrine preenchida. O clube do jogador continua disponível na lista.

## Verificação

- Cinco testes direcionados passaram, incluindo a validação dos 14 PNGs locais.
- Os arquivos foram inspecionados visualmente em uma montagem; cada imagem corresponde à competição esperada.
