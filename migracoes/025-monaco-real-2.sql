-- Corrida: Mônaco ganhou a largura certa por trecho (a reta dos boxes e o porto mais largos; o Casino, a Massenet e o Mirabeau estreitos; o guard-rail colado no asfalto) e os escapes
-- de verdade (Sainte Dévote, Mirabeau e a saída do túnel / Nouvelle Chicane): as voltas e os recordes guardados são da pista larga de antes, mais rápida, e não valem mais.
-- O quadro de Mônaco recomeça.
DELETE FROM corrida_voltas WHERE pista = 'monaco';
DELETE FROM corrida_recordes WHERE pista = 'monaco';
DELETE FROM corrida_voltas_piloto WHERE pista = 'monaco';
