-- Corrida: Baku foi refeito em cima da linha central real do circuito (az-2016), com o relevo SRTM, os prédios do OpenStreetMap e as barreiras só onde a pista
-- real as tem, e a pista estreita na Cidade Velha: as voltas e os recordes guardados são do traçado antigo e não passam mais pela pista. O quadro de Baku recomeça.
DELETE FROM corrida_voltas WHERE pista = 'baku';
DELETE FROM corrida_recordes WHERE pista = 'baku';
DELETE FROM corrida_voltas_piloto WHERE pista = 'baku';
