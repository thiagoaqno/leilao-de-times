-- Times Pokémon dos líderes e treinadores do Ginásio editados pela moderação.
-- Sem linha, prevalece o time original definido em lideres.js.
CREATE TABLE IF NOT EXISTS ginasio_times_pokemon (
  treinador TEXT PRIMARY KEY,
  time_json TEXT NOT NULL,
  ator TEXT NOT NULL,
  atualizado_em INTEGER NOT NULL
);
