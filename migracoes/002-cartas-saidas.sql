-- As cartas que já saíram nos jogos de baralho (por enquanto, a Palavra Proibida). Guardar a carta pelo texto deixa
-- acrescentar cartas novas no baralho sem bagunçar o que já saiu. Quando todas saem, o jogo zera e recomeça.
CREATE TABLE cartas_saidas (
  jogo TEXT NOT NULL,
  carta TEXT NOT NULL,
  saiu_em INTEGER NOT NULL,
  PRIMARY KEY (jogo, carta)
);
