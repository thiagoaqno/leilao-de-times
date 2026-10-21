-- Corrida: os recordes de volta de cada pista, para sempre. Cada piloto entra uma vez por pista (com a melhor volta
-- dele) e só os 5 mais rápidos ficam (bd.registrarRecordeCorrida apaga o resto). chave: o nome em minúsculas, para
-- "Ana" e "ana" serem a mesma pessoa. Começa com a melhor volta que já estava guardada (corrida_voltas).
CREATE TABLE corrida_recordes (
  pista TEXT NOT NULL,
  chave TEXT NOT NULL,
  piloto TEXT NOT NULL,
  tempo REAL NOT NULL,
  carro TEXT NOT NULL,
  feita_em INTEGER NOT NULL,
  PRIMARY KEY (pista, chave)
);
INSERT INTO corrida_recordes (pista, chave, piloto, tempo, carro, feita_em)
  SELECT pista, lower(piloto), piloto, tempo, carro, feita_em FROM corrida_voltas;
