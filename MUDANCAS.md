# Fly: a máquina passou de 256 MB para 1 GB de memória

- A máquina de produção (`leilao-de-times`, região gru) foi ampliada com `fly scale memory 1024`: continua `shared-cpu-1x`, agora com **1 GB** de memória (antes 256 MB).
- O `fly.toml` foi atualizado (`memory = '1gb'`) para o próximo `fly deploy` não voltar para 256 MB.
- Motivo: criar uma carreira usa ~9 MB de memória e ~3 s de CPU, e uma sala de grupo fica na memória; com 256 MB poucos jogadores simultâneos esgotavam a memória.
- Para mais CPU (o gargalo seguinte): `fly scale vm shared-cpu-2x --memory 1024 -a leilao-de-times` (e trocar `size` no `fly.toml`). Para voltar: `fly scale memory 256 -a leilao-de-times`.
