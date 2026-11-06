-- Ajustes de perfil dos pilotos de F1 editados no admin (/admin/pilotos).
-- Sem linha, prevalece o perfil original de corrida-estilos.js.
CREATE TABLE IF NOT EXISTS corrida_perfis_piloto (
  piloto TEXT PRIMARY KEY,
  perfil_json TEXT NOT NULL,
  ator TEXT NOT NULL,
  atualizado_em INTEGER NOT NULL
);
