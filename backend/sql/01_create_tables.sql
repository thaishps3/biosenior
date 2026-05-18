DROP TABLE IF EXISTS planning_asignaciones;
DROP TABLE IF EXISTS registros_deposiciones;
DROP TABLE IF EXISTS tareas;
DROP TABLE IF EXISTS turnos;
DROP TABLE IF EXISTS auxiliares;
DROP TABLE IF EXISTS tipos_deposicion;
DROP TABLE IF EXISTS residentes;
DROP TABLE IF EXISTS usuarios_sistema;

CREATE TABLE usuarios_sistema (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(30) NOT NULL CHECK (rol IN ('admin', 'auxiliar', 'coordinacion')),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE residentes (
    id_residente SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(150),
    genero VARCHAR(20) CHECK (genero IN ('femenino', 'masculino', 'otro')),
    habitacion VARCHAR(20),
    activo BOOLEAN DEFAULT TRUE,
    fecha_alta TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tipos_deposicion (
    id_tipo SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE registros_deposiciones (
    id_registro SERIAL PRIMARY KEY,
    id_residente INTEGER NOT NULL,
    id_tipo INTEGER NOT NULL,
    id_usuario INTEGER,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacion TEXT,

    CONSTRAINT fk_registro_residente
        FOREIGN KEY (id_residente)
        REFERENCES residentes(id_residente)
        ON DELETE CASCADE,

    CONSTRAINT fk_registro_tipo
        FOREIGN KEY (id_tipo)
        REFERENCES tipos_deposicion(id_tipo),

    CONSTRAINT fk_registro_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios_sistema(id_usuario)
);

CREATE TABLE auxiliares (
    id_auxiliar SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    grupo_letra CHAR(1),
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE turnos (
    id_turno SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    hora_inicio TIME,
    hora_fin TIME
);

CREATE TABLE tareas (
    id_tarea SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT TRUE
);

CREATE TABLE planning_asignaciones (
    id_asignacion SERIAL PRIMARY KEY,
    id_auxiliar INTEGER NOT NULL,
    id_tarea INTEGER NOT NULL,
    id_turno INTEGER,
    fecha DATE NOT NULL,
    estado VARCHAR(30) DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'realizada', 'cancelada')),
    observacion TEXT,

    CONSTRAINT fk_planning_auxiliar
        FOREIGN KEY (id_auxiliar)
        REFERENCES auxiliares(id_auxiliar),

    CONSTRAINT fk_planning_tarea
        FOREIGN KEY (id_tarea)
        REFERENCES tareas(id_tarea),

    CONSTRAINT fk_planning_turno
        FOREIGN KEY (id_turno)
        REFERENCES turnos(id_turno)
);