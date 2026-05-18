ALTER TABLE residentes
DROP CONSTRAINT IF EXISTS residentes_genero_check;

ALTER TABLE residentes
ADD CONSTRAINT residentes_genero_check
CHECK (genero IN ('femenino', 'masculino'));