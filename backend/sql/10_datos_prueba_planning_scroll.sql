-- ============================================================
-- 10_datos_prueba_planning_scroll.sql
-- Datos de prueba para Planning
--
-- Qué hace:
-- - Crea 10 residentes por cada combinación de turno + plan.
-- - Permite probar scroll en móvil.
-- - Respeta la regla:
--   un residente no puede estar en dos planes dentro del mismo turno.
-- - No toca registros diarios ni historial.
--
-- Total esperado:
-- 3 turnos x 5 planes x 10 residentes = 150 asignaciones.
-- ============================================================


-- ============================================================
-- BLOQUE: Tabla temporal de datos de prueba
--
-- Qué hace:
-- - Prepara residentes ficticios con turno, plan y orden.
-- - Usa habitaciones ficticias para distinguirlos rápido.
-- - Se elimina automáticamente al terminar la sesión SQL.
-- ============================================================

CREATE TEMP TABLE tmp_planning_test_residentes (
  plan_letra VARCHAR(10),
  turno VARCHAR(20),
  orden INTEGER,
  nombre VARCHAR(100),
  apellidos VARCHAR(150),
  habitacion VARCHAR(20),
  genero VARCHAR(20),
  panal VARCHAR(10),
  observacion TEXT,
  riesgo BOOLEAN,
  encamado BOOLEAN
);


-- ============================================================
-- BLOQUE: Generar 10 residentes por plan y turno
--
-- Qué hace:
-- - Genera combinaciones automáticas.
-- - Planes: A, B, C, D, ALT.
-- - Turnos: Mañana, Tarde, Noche.
-- - Orden: 1 a 10 dentro de cada plan/turno.
-- ============================================================

INSERT INTO tmp_planning_test_residentes (
  plan_letra,
  turno,
  orden,
  nombre,
  apellidos,
  habitacion,
  genero,
  panal,
  observacion,
  riesgo,
  encamado
)
SELECT
  p.plan_letra,
  t.turno,
  n.orden,
  'Residente ' || p.plan_letra || '-' || LEFT(t.turno, 1) || '-' || n.orden AS nombre,
  'Prueba Planning' AS apellidos,
  CASE
    WHEN t.turno = 'Mañana' THEN '1'
    WHEN t.turno = 'Tarde' THEN '2'
    ELSE '3'
  END || p.plan_num || LPAD(n.orden::TEXT, 2, '0') AS habitacion,
  CASE
    WHEN n.orden % 2 = 0 THEN 'femenino'
    ELSE 'masculino'
  END AS genero,
  CASE
    WHEN n.orden IN (3, 7) THEN 'M'
    WHEN n.orden = 5 THEN 'L'
    ELSE '-'
  END AS panal,
  CASE
    WHEN n.orden = 2 THEN 'Revisar movilidad.'
    WHEN n.orden = 6 THEN 'Precisa supervisión.'
    WHEN n.orden = 9 THEN 'Avisar si rechaza atención.'
    ELSE NULL
  END AS observacion,
  CASE
    WHEN n.orden IN (1, 8) THEN TRUE
    ELSE FALSE
  END AS riesgo,
  CASE
    WHEN n.orden = 10 THEN TRUE
    ELSE FALSE
  END AS encamado
FROM
  (VALUES
    ('A', 1),
    ('B', 2),
    ('C', 3),
    ('D', 4),
    ('ALT', 5)
  ) AS p(plan_letra, plan_num)
CROSS JOIN
  (VALUES
    ('Mañana'),
    ('Tarde'),
    ('Noche')
  ) AS t(turno)
CROSS JOIN
  generate_series(1, 10) AS n(orden);


-- ============================================================
-- BLOQUE: Insertar residentes ficticios
--
-- Qué hace:
-- - Inserta residentes en la tabla residentes.
-- - Evita duplicarlos si el script se ejecuta más de una vez.
-- ============================================================

INSERT INTO residentes (
  nombre,
  apellidos,
  habitacion,
  genero,
  activo
)
SELECT
  tmp.nombre,
  tmp.apellidos,
  tmp.habitacion,
  tmp.genero,
  TRUE
FROM tmp_planning_test_residentes tmp
WHERE NOT EXISTS (
  SELECT 1
  FROM residentes r
  WHERE r.nombre = tmp.nombre
    AND r.apellidos = tmp.apellidos
    AND r.habitacion = tmp.habitacion
);


-- ============================================================
-- BLOQUE: Asignar residentes a plan + turno
--
-- Qué hace:
-- - Relaciona cada residente ficticio con su plan y turno.
-- - Usa planning_planes para obtener id_plan.
-- - Respeta la restricción id_residente + turno activo.
-- - Evita duplicar asignaciones si se ejecuta otra vez.
-- ============================================================

INSERT INTO planning_plan_residentes (
  id_plan,
  id_residente,
  turno,
  orden,
  panal,
  observacion,
  riesgo,
  encamado,
  activo
)
SELECT
  pp.id_plan,
  r.id_residente,
  tmp.turno,
  tmp.orden,
  tmp.panal,
  tmp.observacion,
  tmp.riesgo,
  tmp.encamado,
  TRUE
FROM tmp_planning_test_residentes tmp
INNER JOIN planning_planes pp
  ON pp.letra = tmp.plan_letra
INNER JOIN residentes r
  ON r.nombre = tmp.nombre
 AND r.apellidos = tmp.apellidos
 AND r.habitacion = tmp.habitacion
WHERE NOT EXISTS (
  SELECT 1
  FROM planning_plan_residentes ppr
  WHERE ppr.id_residente = r.id_residente
    AND ppr.turno = tmp.turno
    AND ppr.activo = TRUE
);


-- ============================================================
-- BLOQUE: Comprobación final
--
-- Qué hace:
-- - Muestra cuántos residentes hay por turno y plan.
-- - Debe devolver 10 por cada combinación.
-- ============================================================

SELECT
  ppr.turno,
  pp.letra AS plan,
  COUNT(*) AS total_residentes
FROM planning_plan_residentes ppr
INNER JOIN planning_planes pp
  ON pp.id_plan = ppr.id_plan
WHERE ppr.activo = TRUE
GROUP BY ppr.turno, pp.letra
ORDER BY
  CASE
    WHEN ppr.turno = 'Mañana' THEN 1
    WHEN ppr.turno = 'Tarde' THEN 2
    WHEN ppr.turno = 'Noche' THEN 3
    ELSE 4
  END,
  CASE
    WHEN pp.letra = 'A' THEN 1
    WHEN pp.letra = 'B' THEN 2
    WHEN pp.letra = 'C' THEN 3
    WHEN pp.letra = 'D' THEN 4
    WHEN pp.letra = 'ALT' THEN 5
    ELSE 6
  END;