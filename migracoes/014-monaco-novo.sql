-- Corrida: Mônaco foi redesenhado em cima do traçado oficial (as 19 curvas). A melhor volta guardada era do traçado
-- antigo: os robôs copiariam uma linha que não passa mais pela pista, então ela sai e a próxima volta limpa vale.
DELETE FROM corrida_voltas WHERE pista = 'monaco';
