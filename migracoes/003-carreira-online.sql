-- A carreira em grupo (carreira-online.js): a sala inteira (as pessoas, só com o hash do token, as opções e o save do
-- mundo) fica aqui, para o servidor poder reiniciar no meio da noite. A sala se apaga 24 h depois do último uso.
CREATE TABLE carreiras_online (
  codigo TEXT PRIMARY KEY,
  dados TEXT NOT NULL DEFAULT '{}',
  criada_em INTEGER NOT NULL,
  atualizada_em INTEGER NOT NULL
);
