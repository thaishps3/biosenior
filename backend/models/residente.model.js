const pool = require("../db/connection");

async function obtenerTodos() {
    const resultado = await pool.query(`
        SELECT 
            id_residente,
            nombre,
            apellidos,
            genero,
            habitacion,
            activo,
            fecha_alta,
            movilidad,
            condicion_cognitiva,
            tipo_alimentacion,
            ayuda_comer,
            riesgo_caida,
            riesgo_atragantamiento,
            requiere_supervision,
            observaciones
        FROM residentes
        ORDER BY nombre ASC
    `);

    return resultado.rows;
}

async function obtenerPorId(id) {
    const resultado = await pool.query(
        `
        SELECT 
            id_residente,
            nombre,
            apellidos,
            genero,
            habitacion,
            activo,
            fecha_alta,
            movilidad,
            condicion_cognitiva,
            tipo_alimentacion,
            ayuda_comer,
            riesgo_caida,
            riesgo_atragantamiento,
            requiere_supervision,
            observaciones
        FROM residentes
        WHERE id_residente = $1
        `,
        [id]
    );

    return resultado.rows[0];
}

async function crear(datos) {
    const {
        nombre,
        apellidos,
        genero,
        habitacion,
        movilidad,
        condicion_cognitiva,
        tipo_alimentacion,
        ayuda_comer,
        riesgo_caida,
        riesgo_atragantamiento,
        requiere_supervision,
        observaciones
    } = datos;

    const resultado = await pool.query(
        `
        INSERT INTO residentes (
            nombre,
            apellidos,
            genero,
            habitacion,
            movilidad,
            condicion_cognitiva,
            tipo_alimentacion,
            ayuda_comer,
            riesgo_caida,
            riesgo_atragantamiento,
            requiere_supervision,
            observaciones
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
        `,
        [
            nombre,
            apellidos || null,
            genero || null,
            habitacion || null,
            movilidad || null,
            condicion_cognitiva || null,
            tipo_alimentacion || null,
            ayuda_comer || false,
            riesgo_caida || false,
            riesgo_atragantamiento || false,
            requiere_supervision || false,
            observaciones || null
        ]
    );

    return resultado.rows[0];
}

async function actualizar(id, datos) {
    const {
        nombre,
        apellidos,
        genero,
        habitacion,
        movilidad,
        condicion_cognitiva,
        tipo_alimentacion,
        ayuda_comer,
        riesgo_caida,
        riesgo_atragantamiento,
        requiere_supervision,
        observaciones,
        activo
    } = datos;

    const resultado = await pool.query(
        `
        UPDATE residentes
        SET
            nombre = $1,
            apellidos = $2,
            genero = $3,
            habitacion = $4,
            movilidad = $5,
            condicion_cognitiva = $6,
            tipo_alimentacion = $7,
            ayuda_comer = $8,
            riesgo_caida = $9,
            riesgo_atragantamiento = $10,
            requiere_supervision = $11,
            observaciones = $12,
            activo = $13
        WHERE id_residente = $14
        RETURNING *
        `,
        [
            nombre,
            apellidos || null,
            genero || null,
            habitacion || null,
            movilidad || null,
            condicion_cognitiva || null,
            tipo_alimentacion || null,
            ayuda_comer || false,
            riesgo_caida || false,
            riesgo_atragantamiento || false,
            requiere_supervision || false,
            observaciones || null,
            activo !== undefined ? activo : true,
            id
        ]
    );

    return resultado.rows[0];
}

async function eliminar(id) {
    const resultado = await pool.query(
        `
        UPDATE residentes
        SET activo = FALSE
        WHERE id_residente = $1
        RETURNING *
        `,
        [id]
    );

    return resultado.rows[0];
}

module.exports = {
    obtenerTodos,
    obtenerPorId,
    crear,
    actualizar,
    eliminar
};