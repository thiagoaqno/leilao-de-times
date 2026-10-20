-- Corrida: a melhor volta de cada pista (de gente, não de robô). Os robôs copiam a linha e as velocidades dela.
-- dados: JSON com as amostras da volta, [tempo ms, x, y, z, ângulo, progresso], uma a cada 0,1 s.
CREATE TABLE corrida_voltas (
  pista TEXT PRIMARY KEY,
  tempo REAL NOT NULL,
  carro TEXT NOT NULL,
  piloto TEXT NOT NULL,
  dados TEXT NOT NULL,
  feita_em INTEGER NOT NULL
);
