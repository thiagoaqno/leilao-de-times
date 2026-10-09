# Fly: a máquina passou de shared-cpu-1x com 256 MB para shared-cpu-2x com 1 GB

- A máquina de produção (`leilao-de-times`, região gru) foi ampliada com `fly scale vm shared-cpu-2x --memory 1024`: **2 vCPUs compartilhados e 1 GB de memória** (antes 1 vCPU e 256 MB).
- O `fly.toml` foi atualizado (`size = 'shared-cpu-2x'`, `memory = '1gb'`) para o próximo `fly deploy` não voltar para a máquina pequena.
- Motivo: criar uma carreira usa ~9 MB de memória e ~3 s de CPU, e uma sala de grupo fica na memória; com 256 MB poucos jogadores simultâneos esgotavam a memória, e o Node faz o trabalho pesado numa thread só, então o segundo vCPU ajuda a coleta de lixo e as respostas dos outros jogadores.
- Para voltar: `fly scale vm shared-cpu-1x --memory 256 -a leilao-de-times` (e trocar `size` e `memory` no `fly.toml`).
