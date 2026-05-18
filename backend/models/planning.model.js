const pool = require("../db/connection");

async function obtenerAuxiliares() {
    const resultado = await pool.query(`
        SELECT 
            id_auxiliar,
            nombre,
            grupo_letra,
            activo
        FROM auxiliares
        WHERE activo = TRUE
        ORDER BY grupo_letra ASC, nombre ASC
    `);

    return resultado.rows;
}

async function obtenerTareas() {
    const resultado = await pool.query(`
        SELECT 
            id_tarea,
            nombre,
            descripcion,
            activa
        FROM tareas
        WHERE activa = TRUE
        ORDER BY nombre ASC
    `);

    return resultado.rows;
}

async function obtenerPlanning() {
    const resultado = await pool.query(`
        SELECT 
            pa.id_asignacion,
            pa.fecha,
            pa.estado,
            pa.observacion,
            a.id_auxiliar,
            a.nombre AS auxiliar_nombre,
            a.grupo_letra,
            t.id_tarea,
            t.nombre AS tarea_nombre,
            tr.id_turno,
            tr.nombre AS turno_nombre
        FROM planning_asignaciones pa
        INNER JOIN auxiliares a 
            ON pa.id_auxiliar = a.id_auxiliar
        INNER JOIN tareas t 
            ON pa.id_tarea = t.id_tarea
        LEFT JOIN turnos tr 
            ON pa.id_turno = tr.id_turno
        ORDER BY pa.fecha DESC, tr.nombre ASC, a.nombre ASC
    `);

    return resultado.rows;
}

async function crearAsignacion(datos) {
    const { id_auxiliar, id_tarea, id_turno, fecha, estado, observacion } = datos;

    const resultado = await pool.query(
        `
        INSERT INTO planning_asignaciones
            (id_auxiliar, id_tarea, id_turno, fecha, estado, observacion)
        VALUES
            ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `,
        [
            id_auxiliar,
            id_tarea,
            id_turno || null,
            fecha,
            estado || "pendiente",
            observacion || null
        ]
    );

    return resultado.rows[0];
}

module.exports = {
    obtenerAuxiliares,
    obtenerTareas,
    obtenerPlanning,
    crearAsignacion
};