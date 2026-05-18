-- ============================================================
-- 04_expandir_modelo_real.sql
-- Ampliación del modelo para Gestión Admin, Alimentación,
-- Comedor, Tablón, Parte del día y Chat.
-- ============================================================

-- 1. Ampliar residentes para Gestión Admin, Alimentación y Comedor

ALTER TABLE residentes
ADD COLUMN IF NOT EXISTS movilidad VARCHAR(50),
ADD COLUMN IF NOT EXISTS condicion_cognitiva VARCHAR(100),
ADD COLUMN IF NOT EXISTS tipo_alimentacion VARCHAR(100),
ADD COLUMN IF NOT EXISTS ayuda_comer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS riesgo_caida BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS riesgo_atragantamiento BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requiere_supervision BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- 2. Ampliar usuarios para login con PIN

ALTER TABLE usuarios_sistema
ADD COLUMN IF NOT EXISTS pin VARCHAR(10);

-- 3. Tabla de tipos de alimentación

CREATE TABLE IF NOT EXISTS tipos_alimentacion (
    id_tipo_alimentacion SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
);

-- 4. Registros de alimentación por residente

CREATE TABLE IF NOT EXISTS registros_alimentacion (
    id_registro_alimentacion SERIAL PRIMARY KEY,
    id_residente INTEGER NOT NULL,
    id_tipo_alimentacion INTEGER,
    id_usuario INTEGER,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacion TEXT,

    CONSTRAINT fk_alimentacion_residente
        FOREIGN KEY (id_residente)
        REFERENCES residentes(id_residente)
        ON DELETE CASCADE,

    CONSTRAINT fk_alimentacion_tipo
        FOREIGN KEY (id_tipo_alimentacion)
        REFERENCES tipos_alimentacion(id_tipo_alimentacion),

    CONSTRAINT fk_alimentacion_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios_sistema(id_usuario)
);

-- 5. Registros de comedor

CREATE TABLE IF NOT EXISTS registros_comedor (
    id_registro_comedor SERIAL PRIMARY KEY,
    id_residente INTEGER NOT NULL,
    id_usuario INTEGER,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comida VARCHAR(50) CHECK (comida IN ('desayuno', 'comida', 'merienda', 'cena')),
    ingesta VARCHAR(50) CHECK (ingesta IN ('completa', 'media', 'poca', 'rechaza', 'no_aplica')),
    liquidos VARCHAR(50),
    observacion TEXT,

    CONSTRAINT fk_comedor_residente
        FOREIGN KEY (id_residente)
        REFERENCES residentes(id_residente)
        ON DELETE CASCADE,

    CONSTRAINT fk_comedor_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios_sistema(id_usuario)
);

-- 6. Mensajes del tablón

CREATE TABLE IF NOT EXISTS mensajes_tablon (
    id_mensaje SERIAL PRIMARY KEY,
    id_usuario INTEGER,
    titulo VARCHAR(150) NOT NULL,
    contenido TEXT NOT NULL,
    prioridad VARCHAR(30) DEFAULT 'normal'
        CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tablon_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios_sistema(id_usuario)
);

-- 7. Parte del día

CREATE TABLE IF NOT EXISTS partes_dia (
    id_parte SERIAL PRIMARY KEY,
    id_usuario INTEGER,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    turno VARCHAR(50),
    resumen TEXT NOT NULL,
    incidencias TEXT,
    pendientes TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_parte_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios_sistema(id_usuario)
);

-- 8. Chat interno

CREATE TABLE IF NOT EXISTS chat_mensajes (
    id_chat SERIAL PRIMARY KEY,
    id_usuario INTEGER,
    mensaje TEXT NOT NULL,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    leido BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_chat_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios_sistema(id_usuario)
);

-- 9. Datos base para alimentación

INSERT INTO tipos_alimentacion (nombre, descripcion)
VALUES
('Normal', 'Alimentación normal'),
('Fácil masticación', 'Dieta de fácil masticación'),
('Triturada', 'Dieta triturada'),
('Espesantes', 'Líquidos con espesante'),
('Sonda', 'Alimentación por sonda')
ON CONFLICT (nombre) DO NOTHING;

-- 10. Actualizar PIN de usuarios demo si existen

UPDATE usuarios_sistema
SET pin = '1234'
WHERE email IN ('admin@biosenior.local', 'auxiliar@biosenior.local')
AND pin IS NULL;