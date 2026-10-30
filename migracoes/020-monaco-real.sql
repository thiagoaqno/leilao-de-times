-- Corrida: Mônaco foi refeito em cima da linha central real do circuito (OpenStreetMap), no norte e na proporção de verdade, com o relevo
-- de verdade: as voltas e os recordes guardados são do traçado antigo e não passam mais pela pista. O quadro de Mônaco recomeça.
DELETE FROM corrida_voltas WHERE pista = 'monaco';
DELETE FROM corrida_recordes WHERE pista = 'monaco';
DELETE FROM corrida_tracados WHERE pista = 'monaco';
DELETE FROM corrida_voltas_piloto WHERE pista = 'monaco';
