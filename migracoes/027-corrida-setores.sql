-- Corrida: o melhor tempo de cada setor de cada pista, com o nome de quem fez (corrida.js: fecharSetor). Vale a mesma regra do quadro de recordes:
-- voltas de corrida com as regras de F1 e robôs na pista, e só as limpas. Setor 0, 1 e 2 são os terços da volta do cronômetro do jogo.
CREATE TABLE corrida_setores (
  pista TEXT NOT NULL,
  setor INTEGER NOT NULL,
  piloto TEXT NOT NULL,
  tempo REAL NOT NULL,
  feita_em INTEGER NOT NULL,
  PRIMARY KEY (pista, setor)
);
