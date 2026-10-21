-- Corrida: as cinco melhores voltas de cada piloto em cada pista (antes era só a melhor, e só de cinco pilotos).
-- O ritmo dos robôs sai da média delas; o traçado, da melhor volta de cada piloto.
CREATE TABLE corrida_voltas_piloto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pista TEXT NOT NULL,
  chave TEXT NOT NULL,
  piloto TEXT NOT NULL,
  tempo REAL NOT NULL,
  carro TEXT NOT NULL,
  dados TEXT NOT NULL,
  feita_em INTEGER NOT NULL
);
CREATE INDEX corrida_voltas_piloto_pista ON corrida_voltas_piloto (pista, chave, tempo);
INSERT INTO corrida_voltas_piloto (pista, chave, piloto, tempo, carro, dados, feita_em)
  SELECT pista, chave, piloto, tempo, carro, dados, feita_em FROM corrida_tracados;
DROP TABLE corrida_tracados;
