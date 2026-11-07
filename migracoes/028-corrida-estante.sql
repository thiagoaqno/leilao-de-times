-- A estante da F1 com os amigos (bd.guardarEstanteCorrida, bd.estanteCorrida): cada pódio de GP e cada título (pilotos e construtores) que um
-- amigo conquistou numa temporada em grupo, para sempre, mesmo depois que a sala expira. Só pessoas entram, nunca os robôs.
CREATE TABLE corrida_estante (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sala TEXT NOT NULL,          -- o código da sala e quando ela foi criada: o mesmo código pode voltar depois
  piloto TEXT NOT NULL,        -- o nome como a pessoa escreveu
  chave TEXT NOT NULL,         -- o nome em minúsculas e sem acento: o ranking junta as salas por ele
  equipe TEXT NOT NULL,
  tipo TEXT NOT NULL,          -- gp | pilotos | construtores
  pista TEXT,                  -- só no tipo gp
  colocacao INTEGER NOT NULL,  -- gp: 1 a 3; títulos: 1 campeão, 2 vice
  ano INTEGER NOT NULL,        -- a temporada da sala (1, 2...)
  gp INTEGER NOT NULL,         -- a etapa no calendário; -1 nos títulos
  criado_em INTEGER NOT NULL,
  UNIQUE (sala, ano, gp, tipo, chave)
);
CREATE INDEX corrida_estante_chave ON corrida_estante (chave);
CREATE INDEX corrida_estante_criado ON corrida_estante (criado_em);
