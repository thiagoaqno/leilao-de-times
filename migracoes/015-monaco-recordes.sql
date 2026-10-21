-- Corrida: os recordes de Mônaco (corrida_recordes, migração 013) eram do traçado antigo, que a 014 trocou pelo oficial.
-- O quadro de Mônaco recomeça (as voltas antigas não passam mais pela pista nova).
DELETE FROM corrida_recordes WHERE pista = 'monaco';
