ALTER TABLE registros_deposiciones
ADD COLUMN IF NOT EXISTS miccion VARCHAR(10),
ADD COLUMN IF NOT EXISTS turno VARCHAR(20);

ALTER TABLE registros_deposiciones
DROP CONSTRAINT IF EXISTS registros_deposiciones_miccion_check;

ALTER TABLE registros_deposiciones
ADD CONSTRAINT registros_deposiciones_miccion_check
CHECK (miccion IN ('Sí', 'No'));

ALTER TABLE registros_deposiciones
DROP CONSTRAINT IF EXISTS registros_deposiciones_turno_check;

ALTER TABLE registros_deposiciones
ADD CONSTRAINT registros_deposiciones_turno_check
CHECK (turno IN ('Mañana', 'Tarde', 'Noche'));