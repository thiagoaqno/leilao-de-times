-- Os Pokémon capturados na grama alta da Vila (em frente ao Ginásio). O treinador é o hash do código guardado no
-- navegador (galera:treinador): o código não vai para o banco.
CREATE TABLE IF NOT EXISTS capturas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  treinador TEXT NOT NULL,
  nome TEXT NOT NULL,
  bicho TEXT NOT NULL,
  raridade TEXT NOT NULL,
  brilhante INTEGER NOT NULL DEFAULT 0,
  capturado_em INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS capturas_treinador ON capturas(treinador, capturado_em);
