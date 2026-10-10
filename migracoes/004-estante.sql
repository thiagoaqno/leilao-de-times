-- A estante de troféus da galera (bd.guardarConquistas, bd.estante): cada título e cada vice dos técnicos de verdade, da
-- carreira solo e da carreira em grupo, fica guardado aqui para sempre, mesmo depois que a carreira é excluída ou a sala
-- expira. A tela "Estante" da carreira mostra o ranking de todos os técnicos e as últimas conquistas.
CREATE TABLE estante (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  carreira TEXT NOT NULL,      -- a semente da carreira (uma por carreira solo ou por sala)
  modo TEXT NOT NULL,          -- solo | grupo
  tecnico TEXT NOT NULL,       -- o nome como o técnico escreveu
  chave TEXT NOT NULL,         -- o nome em minúsculas e sem acento: o ranking junta as carreiras por ele
  clube TEXT NOT NULL,
  competicao TEXT NOT NULL,
  nome TEXT NOT NULL,          -- o nome da competição
  colocacao INTEGER NOT NULL,  -- 1 campeão, 2 vice
  pontos INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  temporada INTEGER NOT NULL,
  criado_em INTEGER NOT NULL,
  UNIQUE (carreira, temporada, competicao, clube)
);
CREATE INDEX estante_chave ON estante (chave);
CREATE INDEX estante_criado ON estante (criado_em);
