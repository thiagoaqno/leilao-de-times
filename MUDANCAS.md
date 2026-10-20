# Fly: máquina com 2 GB de memória

## O que muda
- `fly.toml`: o `[[vm]]` passa de 1 GB para 2 GB de memória (continua `shared-cpu-2x`). Sem isso, cada deploy devolve a
  máquina para 1 GB, mesmo depois de aumentada à mão.

## Contexto
- Em 20/10 a região de São Paulo (`gru`) ficou sem CPU e memória livres, e a máquina não conseguia nem religar. O app
  passou a rodar numa máquina em Ashburn (`iad`), com o banco restaurado da foto do volume tirada com o site parado. A
  máquina de São Paulo ficou parada e fora do tráfego (`cordon`), como backup; o `primary_region` continua `gru` para a
  volta, quando houver espaço lá.
