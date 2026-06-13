-- ============================================================
-- 08_ajustar_planning_turnos_alterno.sql
-- Ajustes Planning:
-- - Agregar Plan Alterno
-- - Organizar residentes por plan + turno
-- - Permitir residentes distintos por turno
-- - Evitar que un residente esté en dos planes dentro del mismo turno
-- - Mantener Siesta fuera de Planning
-- ============================================================


-- ============================================================
-- 1. Ajustar planning_planes para permitir Alterno
-- ============================================================

-- Quitar restricción CHECK antigua de letra si existe.
-- La restricción antigua solo permitía A, B, C, D.
ALTER TABLE planning_planes
DROP CONSTRAINT IF EXISTS planning_planes_letra_check;

-- Cambiar tipo de letra para permitir valores más largos como "ALT".
ALTER TABLE planning_planes
ALTER COLUMN letra TYPE VARCHAR(10);

-- Crear nueva restricción para aceptar A, B, C, D y ALT.
ALTER TABLE planning_planes
ADD CONSTRAINT planning_planes_letra_check
CHECK (letra IN ('A', 'B', 'C', 'D', 'ALT'));

-- Insertar Plan Alterno si no existe.
INSERT INTO planning_planes (letra, nombre, activo)
VALUES ('ALT', 'ALTERNO', TRUE)
ON CONFLICT (letra) DO NOTHING;


-- ============================================================
-- 2. Agregar turno a residentes asignados a planes
-- ============================================================

ALTER TABLE planning_plan_residentes
ADD COLUMN IF NOT EXISTS turno VARCHAR(20);

-- Para datos antiguos, asignamos Mañana como valor temporal.
-- Luego, si hace falta, se corrige manualmente desde Admin.
UPDATE planning_plan_residentes
SET turno = 'Mañana'
WHERE turno IS NULL;

-- Hacer obligatorio el turno.
ALTER TABLE planning_plan_residentes
ALTER COLUMN turno SET NOT NULL;

-- Validar solo los tres turnos reales.
ALTER TABLE planning_plan_residentes
DROP CONSTRAINT IF EXISTS planning_plan_residentes_turno_check;

ALTER TABLE planning_plan_residentes
ADD CONSTRAINT planning_plan_residentes_turno_check
CHECK (turno IN ('Mañana', 'Tarde', 'Noche'));


-- ============================================================
-- 3. Cambiar restricción de duplicados
-- ============================================================

-- Antes se impedía repetir residente dentro del mismo plan.
-- Ahora necesitamos impedir que un residente esté en dos planes
-- dentro del mismo turno.

ALTER TABLE planning_plan_residentes
DROP CONSTRAINT IF EXISTS uq_plan_residente;

-- Índice único parcial:
-- Un residente activo solo puede estar una vez por turno.
CREATE UNIQUE INDEX IF NOT EXISTS uq_residente_turno_activo
ON planning_plan_residentes (id_residente, turno)
WHERE activo = TRUE;


-- ============================================================
-- 4. Ajustar registros diarios: quitar "siesta" de Planning
-- ============================================================

-- La tabla planning_registros ya tiene turno.
-- Pero la acción actual permite 'siesta'.
-- Como Siesta queda fuera de Planning, cambiamos la lógica a:
-- Mañana -> levantar
-- Tarde  -> atender
-- Noche  -> acostar

ALTER TABLE planning_registros
DROP CONSTRAINT IF EXISTS planning_registros_accion_check;

ALTER TABLE planning_registros
ADD CONSTRAINT planning_registros_accion_check
CHECK (accion IN ('levantar', 'atender', 'acostar'));


-- ============================================================
-- 5. Corregir registros antiguos si tenían acción "siesta"
-- ============================================================

UPDATE planning_registros
SET accion = 'atender'
WHERE accion = 'siesta';


-- ============================================================
-- 6. Comprobación rápida
-- ============================================================

SELECT id_plan, letra, nombre, activo
FROM planning_planes
ORDER BY id_plan;