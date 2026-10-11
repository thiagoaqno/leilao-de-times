# Carreira: a Série B também entra nas carreiras que já estavam rolando

**Antes:** uma carreira criada antes da Série B só ganhava a tabela da Série B depois de jogar mais um jogo. Se ela fosse aberta pela primeira vez com a temporada já encerrada e o técnico passasse direto para a temporada seguinte, a virada acontecia sem ninguém subir ou cair.

**Agora:** a virada confere se a tabela da Série B existe. Se não existir, refaz o mundo primeiro, com os mesmos placares, e os 4 últimos da Série A caem e os 4 primeiros da Série B sobem já nessa virada. Vale para a carreira solo e para a carreira em grupo. Ninguém precisa criar outra carreira, e os resultados já jogados continuam iguais.

**Como:** `garantirSerieB` (`carreira.js`) chama `recalcularMundo` quando o save do calendário mundial não tem `competicoes["serieb-2026"]`. `novaTemporada` e `novaTemporadaGrupo` a chamam antes de registrar a temporada e trocar as divisões. Dois testes novos em `tests/carreira-serieb.test.js` cobrem um save antigo no fim da temporada, solo e em grupo, e falham sem a correção.
