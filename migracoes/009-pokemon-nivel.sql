-- Cada Pokémon da coleção vira um indivíduo com nível e experiência (a do nível em que está). origem: "captura" (da
-- grama alta) ou "inicial" (os três de todo treinador, que agora também sobem de nível e evoluem). A evolução troca o
-- bicho da linha; a Pokédex guarda todas as espécies que o treinador já teve (capturou ou evoluiu).
ALTER TABLE capturas ADD COLUMN nivel INTEGER NOT NULL DEFAULT 5;
ALTER TABLE capturas ADD COLUMN xp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE capturas ADD COLUMN origem TEXT NOT NULL DEFAULT 'captura';
CREATE TABLE IF NOT EXISTS pokedex (
  treinador TEXT NOT NULL,
  bicho TEXT NOT NULL,
  primeiro_em INTEGER NOT NULL,
  PRIMARY KEY (treinador, bicho)
);
INSERT OR IGNORE INTO pokedex (treinador, bicho, primeiro_em) SELECT treinador, bicho, MIN(capturado_em) FROM capturas GROUP BY treinador, bicho;
