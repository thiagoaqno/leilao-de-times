-- Corrida: o quadro de recordes da Vila (a torre ao lado do Autódromo) passa a mostrar só as voltas de corrida com as regras de F1 e
-- com robôs na pista (corrida.js: registrarRecorde). As que já estão aqui não dizem de onde vieram: ficam com f1 = 0, fora do quadro,
-- e a primeira volta de F1 com robôs de cada piloto toma o lugar delas (bd.js: registrarRecordeCorrida).
ALTER TABLE corrida_recordes ADD COLUMN f1 INTEGER NOT NULL DEFAULT 0;
