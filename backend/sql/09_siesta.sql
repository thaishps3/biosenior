-- ============================================================
-- 09_siesta.sql
-- Módulo Siesta
-- Registra el orden real de acostamiento y levantada de residentes.
-- ============================================================

CREATE TABLE IF NOT EXISTS siesta_residentes (
    id_siesta_residente SERIAL PRIMARY KEY,
    id_residente INTEGER NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    observacion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_siesta_residente
        FOREIGN KEY (id_residente)
        REFERENCES residentes(id_residente)
        ON DELETE CASCADE,

    CONSTRAINT uq_siesta_residente
        UNIQUE (id_residente)
);

CREATE TABLE IF NOT EXISTS siesta_registros (
    id_siesta_registro SERIAL PRIMARY KEY,
    id_residente INTEGER NOT NULL,
    id_usuario_acuesta INTEGER,
    id_usuario_levanta INTEGER,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_acostado TIME DEFAULT CURRENT_TIME,
    hora_levantado TIME,
    orden_acostado INTEGER NOT NULL,
    observacion_acostado TEXT,
    observacion_levantado TEXT,
    estado VARCHAR(20) DEFAULT 'acostado'
        CHECK (estado IN ('acostado', 'levantado', 'cancelado')),

    CONSTRAINT fk_siesta_registro_residente
        FOREIGN KEY (id_residente)
        REFERENCES residentes(id_residente)
        ON DELETE CASCADE,

    CONSTRAINT fk_siesta_usuario_acuesta
        FOREIGN KEY (id_usuario_acuesta)
        REFERENCES usuarios_sistema(id_usuario)
        ON DELETE SET NULL,

    CONSTRAINT fk_siesta_usuario_levanta
        FOREIGN KEY (id_usuario_levanta)
        REFERENCES usuarios_sistema(id_usuario)
        ON DELETE SET NULL,

    CONSTRAINT uq_siesta_residente_fecha
        UNIQUE (id_residente, fecha)
);