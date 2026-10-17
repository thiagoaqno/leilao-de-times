-- As campanhas do Road to Champions são isoladas das salas da Carreira.
-- Tokens dos participantes ficam apenas como hash dentro do JSON do estado.
CREATE TABLE IF NOT EXISTS rtc_campanhas (
  codigo TEXT PRIMARY KEY,
  dados TEXT NOT NULL,
  criada_em INTEGER NOT NULL,
  atualizada_em INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rtc_campanhas_atualizadas ON rtc_campanhas(atualizada_em);
