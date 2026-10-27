-- A temporada de F1 em grupo (corrida-temporada-grupo.js): a sala inteira (as pessoas, só com o hash do token de cada uma,
-- as equipes, o caixa, o mercado e os resultados dos GPs) fica aqui, para o servidor poder reiniciar no meio da noite.
-- A sala se apaga 72 horas depois do último uso.
CREATE TABLE corrida_temporadas_grupo (
  codigo TEXT PRIMARY KEY,
  dados TEXT NOT NULL DEFAULT '{}',
  criada_em INTEGER NOT NULL,
  atualizada_em INTEGER NOT NULL
);
