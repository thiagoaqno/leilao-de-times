CREATE TABLE corrida_temporadas (
  id INTEGER PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  recuperacao_hash TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  dados TEXT NOT NULL,
  criada_em INTEGER NOT NULL,
  atualizada_em INTEGER NOT NULL
);
