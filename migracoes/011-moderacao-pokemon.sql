-- O registro das edições do painel /admin/pokedex: quem mexeu (a conta do GitHub), em qual treinador (o hash), em qual
-- Pokémon (a linha de capturas) e o que era antes e depois.
CREATE TABLE IF NOT EXISTS moderacao_pokemon (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  treinador TEXT NOT NULL,
  ator TEXT NOT NULL,
  tipo TEXT NOT NULL,
  captura INTEGER,
  antes TEXT,
  depois TEXT,
  criado_em INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS moderacao_pokemon_treinador ON moderacao_pokemon(treinador, criado_em);
