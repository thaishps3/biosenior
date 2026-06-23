-- ============================================================
-- ARCHIVO: 09_planning_auxiliares_plan.sql
-- Qué hace:
-- - Crea la tabla para asignar auxiliares a planes.
-- - Permite rango de fechas.
-- - Evita modificar planning_registros.
-- - La colisión de fechas se validará desde backend.
-- ============================================================

CREATE TABLE IF NOT EXISTS planning_auxiliares_plan (
    id_asignacion_auxiliar SERIAL PRIMARY KEY,

    id_plan INTEGER NOT NULL REFERENCES planning_planes(id_plan),
   id_usuario INTEGER NOT NULL REFERENCES usuarios_sistema(id_usuario),

    turno VARCHAR(20) NOT NULL CHECK (turno IN ('Mañana', 'Tarde', 'Noche')),

    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,

    activo BOOLEAN DEFAULT TRUE,

    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_planning_auxiliar_rango_fechas
        CHECK (fecha_fin >= fecha_inicio)
);