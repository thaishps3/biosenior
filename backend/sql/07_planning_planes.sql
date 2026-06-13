-- ============================================================
-- 07_planning_planes.sql
-- Modelo específico para Planning:
-- PLAN A, PLAN B, PLAN C y PLAN D.
-- Coordinación asigna residentes a planes y planes a auxiliares.
-- ============================================================

-- 1. Planes A, B, C y D

CREATE TABLE IF NOT EXISTS planning_planes (
    id_plan SERIAL PRIMARY KEY,
    letra CHAR(1) NOT NULL UNIQUE CHECK (letra IN ('A', 'B', 'C', 'D')),
    nombre VARCHAR(20) NOT NULL UNIQUE,
    activo BOOLEAN DEFAULT TRUE
);

-- 2. Residentes asignados a cada plan

CREATE TABLE IF NOT EXISTS planning_plan_residentes (
    id_plan_residente SERIAL PRIMARY KEY,
    id_plan INTEGER NOT NULL,
    id_residente INTEGER NOT NULL,
    orden INTEGER,
    panal VARCHAR(10),
    observacion TEXT,
    riesgo BOOLEAN DEFAULT FALSE,
    encamado BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,

    CONSTRAINT fk_plan_residente_plan
        FOREIGN KEY (id_plan)
        REFERENCES planning_planes(id_plan)
        ON DELETE CASCADE,

    CONSTRAINT fk_plan_residente_residente
        FOREIGN KEY (id_residente)
        REFERENCES residentes(id_residente)
        ON DELETE CASCADE,

    CONSTRAINT uq_plan_residente
        UNIQUE (id_plan, id_residente)
);

-- 3. Asignación de un plan a una auxiliar por fecha y turno

CREATE TABLE IF NOT EXISTS planning_asignaciones_turno (
    id_asignacion SERIAL PRIMARY KEY,
    id_plan INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    turno VARCHAR(20) NOT NULL CHECK (turno IN ('Mañana', 'Tarde', 'Noche')),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_asignacion_plan
        FOREIGN KEY (id_plan)
        REFERENCES planning_planes(id_plan)
        ON DELETE CASCADE,

    CONSTRAINT fk_asignacion_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios_sistema(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT uq_asignacion_plan_fecha_turno
        UNIQUE (id_plan, fecha, turno)
);

-- 4. Registros diarios del trabajo realizado

CREATE TABLE IF NOT EXISTS planning_registros (
    id_registro SERIAL PRIMARY KEY,
    id_asignacion INTEGER,
    id_plan INTEGER NOT NULL,
    id_residente INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    turno VARCHAR(20) NOT NULL CHECK (turno IN ('Mañana', 'Tarde', 'Noche')),
    accion VARCHAR(30) NOT NULL CHECK (accion IN ('levantar', 'siesta', 'acostar')),
    realizado BOOLEAN DEFAULT TRUE,
    hora TIME DEFAULT CURRENT_TIME,
    incidencia TEXT,
    observacion TEXT,

    CONSTRAINT fk_registro_asignacion
        FOREIGN KEY (id_asignacion)
        REFERENCES planning_asignaciones_turno(id_asignacion)
        ON DELETE SET NULL,

    CONSTRAINT fk_registro_plan
        FOREIGN KEY (id_plan)
        REFERENCES planning_planes(id_plan)
        ON DELETE CASCADE,

    CONSTRAINT fk_registro_residente
        FOREIGN KEY (id_residente)
        REFERENCES residentes(id_residente)
        ON DELETE CASCADE,

    CONSTRAINT fk_registro_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios_sistema(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT uq_registro_residente_fecha_turno
        UNIQUE (id_residente, fecha, turno)
);

-- 5. Insertar planes base

INSERT INTO planning_planes (letra, nombre)
VALUES
('A', 'PLAN A'),
('B', 'PLAN B'),
('C', 'PLAN C'),
('D', 'PLAN D')
ON CONFLICT (letra) DO NOTHING;