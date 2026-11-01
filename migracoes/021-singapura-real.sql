-- Corrida: Singapura foi refeita em cima da linha central real do circuito de 19 curvas (bacinger/f1-circuits, OpenStreetMap), no sentido
-- anti-horário de verdade (a de antes corria no horário), com muros só onde a pista real tem barreira: as voltas e os recordes guardados são
-- do traçado antigo e não passam mais pela pista. O quadro de Singapura recomeça.
DELETE FROM corrida_voltas WHERE pista = 'singapura';
DELETE FROM corrida_recordes WHERE pista = 'singapura';
DELETE FROM corrida_voltas_piloto WHERE pista = 'singapura';
