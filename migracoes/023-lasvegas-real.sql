-- Corrida: Las Vegas foi refeita em cima da linha central real do circuito (us-2023, 17 curvas, no sentido da corrida), com o relevo EU-DEM/SRTM, os prédios e as vias do
-- OpenStreetMap, o Sphere e a Strip acesos de noite e as barreiras só onde a pista real as tem: as voltas e os recordes guardados são do traçado antigo e não passam mais pela
-- pista. O quadro de Las Vegas recomeça.
DELETE FROM corrida_voltas WHERE pista = 'lasvegas';
DELETE FROM corrida_recordes WHERE pista = 'lasvegas';
DELETE FROM corrida_voltas_piloto WHERE pista = 'lasvegas';
