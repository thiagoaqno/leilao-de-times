# Corrida F1: ritmo em Mônaco e pausas do servidor

Em Mônaco, os robôs aproveitam mais a largura da pista e não recebem os limites extras de velocidade que os deixavam lentos em alguns trechos. Em pista livre podem aliviar o acelerador antes de frear. As cinco voltas humanas mais rápidas da pista passam a fornecer traçado, inclusive voltas com batida e de classificação, também em salas sem robôs; voltas com recolocação do carro continuam excluídas.

A otimização inicial do traçado de F1 passa para uma thread separada, para não interromper as atualizações das outras salas quando uma pista é carregada pela primeira vez. O servidor registra atrasos relevantes no laço de eventos para ajudar a investigar outras pausas. Essa mudança reduz uma causa identificada, mas não garante eliminar todo lag de rede ou de processamento.

## Verificação

- Conferência de sintaxe, do diff e medição local da preparação de Mônaco na thread separada.
- Sem testes novos; validação automatizada pelo GitHub. Ritmo e classificação precisam de validação em corrida.
