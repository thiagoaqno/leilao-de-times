-- Até cinco voltas limpas, uma por piloto e pista, para variar os traçados dos robôs.
CREATE TABLE corrida_tracados (
  pista TEXT NOT NULL,
  chave TEXT NOT NULL,
  piloto TEXT NOT NULL,
  tempo REAL NOT NULL,
  carro TEXT NOT NULL,
  dados TEXT NOT NULL,
  feita_em INTEGER NOT NULL,
  PRIMARY KEY (pista, chave)
);
INSERT INTO corrida_tracados (pista, chave, piloto, tempo, carro, dados, feita_em)
  SELECT pista, lower(piloto), piloto, tempo, carro, dados, feita_em FROM corrida_voltas;
