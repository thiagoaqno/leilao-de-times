# Remove cinco testes de corrida que falham no CI

Remove os cinco casos apontados para chegada estimada, ritmo da IA, voltas de bots, viaduto de Suzuka e turbo do cogumelo. O arquivo de chegada estimada é removido porque continha apenas o caso indicado; os demais testes são preservados.

A remoção reduz a cobertura dessas funcionalidades e não corrige os comportamentos que provocaram as falhas.

## Verificação

- Sintaxe dos quatro arquivos de teste restantes conferida com `node --check`.
- Três testes de recordes e migração passaram localmente.
- A execução completa dos arquivos afetados foi interrompida antes de terminar; o resultado completo dependerá do CI.
