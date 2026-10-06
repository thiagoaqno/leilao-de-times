-- As carreiras de treinador: quem é a pessoa (só o hash do token e do código de recuperação) e o save da carreira.
CREATE TABLE carreiras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  recuperacao_hash TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  dados TEXT NOT NULL DEFAULT '{}',
  criada_em INTEGER NOT NULL,
  atualizada_em INTEGER NOT NULL
);
