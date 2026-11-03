# Melhora a disputa dos robôs e o uso do ERS

Os robôs avaliam a ultrapassagem pela velocidade que teriam em pista livre, em vez de desistir depois de frear atrás do adversário, e podem usar mais espaço lateral quando ele existe. Em Mônaco, antecipam a freada nas sequências em que vinham batendo nos muros e respeitam a largura da pista adiante.

O ERS dá 22% de potência extra enquanto ativo (antes, 15%). O modo automático também usa energia em curvas muito suaves; os robôs usam o automático em pista livre e reservam o uso forte para as disputas. É uma adaptação para o jogo, não uma simulação completa das regras de 2026.

## Verificação

- Sintaxe dos arquivos alterados e `git diff --check`.
- Simulações locais de grid de 19 robôs em Mônaco; conferir também a corrida visualmente e as disputas com humanos.
- Nenhum teste novo criado, conforme solicitado.
