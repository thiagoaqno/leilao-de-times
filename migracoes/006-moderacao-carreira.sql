CREATE TABLE moderacao_carreira (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL,
  ator TEXT NOT NULL,
  tipo TEXT NOT NULL,
  clube TEXT NOT NULL,
  jogador TEXT,
  antes TEXT,
  depois TEXT,
  criado_em INTEGER NOT NULL
);
