const pool = require("../db/connection");

// ============================================================
// RESIDENTES CONFIGURADOS PARA SIESTA
// ============================================================

async function obtenerResidentesSiesta() {
    const resultado = await pool.query(`
        SELECT 
            sr.id_siesta_residente,
            sr.id_residente,
            r.nombre,
            r.apellidos,
            r.habitacion,
            sr.observacion,
            sr.activo
        FROM siesta_residentes sr
        INNER JOIN residentes r
            ON sr.id_residente = r.id_residente
        WHERE sr.activo = TRUE
        AND r.activo = TRUE
        ORDER BY r.nombre ASC
    `);

    return resultado.rows;
}

async function agregarResidenteSiesta(datos) {
    const { id_residente, observacion } = datos;

    const resultado = await pool.query(
        `
        INSERT INTO siesta_residentes (
            id_residente,
            observacion
        )
        VALUES ($1, $2)
        RETURNING *
        `,
        [id_residente, observacion || null]
    );

    return resultado.rows[0];
}

async function quitarResidenteSiesta(id) {
    const resultado = await pool.query(
        `
        UPDATE siesta_residentes
        SET activo = FALSE
        WHERE id_siesta_residente = $1
        RETURNING *
        `,
        [id]
    );

    return resultado.rows[0];
}

// ============================================================
// REGISTROS DIARIOS DE SIESTA
// ============================================================

async function obtenerRegistrosHoy() {
    const resultado = await pool.query(`
        SELECT 
            sg.id_siesta_registro,
            sg.id_residente,
            r.nombre,
            r.apellidos,
            r.habitacion,
            sg.id_usuario_acuesta,
            sg.id_usuario_levanta,
            ua.nombre AS auxiliar_acuesta,
            ul.nombre AS auxiliar_levanta,
            sg.fecha,
            TO_CHAR(sg.hora_acostado, 'HH24:MI') AS hora_acostado,
            TO_CHAR(sg.hora_levantado, 'HH24:MI') AS hora_levantado,
            sg.orden_acostado,
            sg.observacion_acostado,
            sg.observacion_levantado,
            sg.estado,
            ROUND(EXTRACT(EPOCH FROM (CURRENT_TIME - sg.hora_acostado)) / 60) AS minutos_siesta
        FROM siesta_registros sg
        INNER JOIN residentes r
            ON sg.id_residente = r.id_residente
        LEFT JOIN usuarios_sistema ua
            ON sg.id_usuario_acuesta = ua.id_usuario
        LEFT JOIN usuarios_sistema ul
            ON sg.id_usuario_levanta = ul.id_usuario
        WHERE sg.fecha = CURRENT_DATE
        ORDER BY sg.orden_acostado ASC
    `);

    return resultado.rows;
}

async function obtenerSiguienteOrden() {
    const resultado = await pool.query(`
        SELECT COALESCE(MAX(orden_acostado), 0) + 1 AS siguiente_orden
        FROM siesta_registros
        WHERE fecha = CURRENT_DATE
    `);

    return resultado.rows[0].siguiente_orden;
}

async function acostarResidente(datos) {
    const { id_residente, id_usuario_acuesta, observacion_acostado } = datos;
    const siguienteOrden = await obtenerSiguienteOrden();

    const resultado = await pool.query(
        `
        INSERT INTO siesta_registros (
            id_residente,
            id_usuario_acuesta,
            fecha,
            hora_acostado,
            orden_acostado,
            observacion_acostado,
            estado
        )
        VALUES ($1, $2, CURRENT_DATE, CURRENT_TIME, $3, $4, 'acostado')
        RETURNING *
        `,
        [
            id_residente,
            id_usuario_acuesta || null,
            siguienteOrden,
            observacion_acostado || null
        ]
    );

    return resultado.rows[0];
}

async function levantarResidente(id, datos) {
    const { id_usuario_levanta, observacion_levantado } = datos;

    const resultado = await pool.query(
        `
        UPDATE siesta_registros
        SET
            id_usuario_levanta = $1,
            hora_levantado = CURRENT_TIME,
            observacion_levantado = $2,
            estado = 'levantado'
        WHERE id_siesta_registro = $3
        RETURNING *
        `,
        [
            id_usuario_levanta || null,
            observacion_levantado || null,
            id
        ]
    );

    return resultado.rows[0];
}

async function cancelarRegistro(id) {
    const resultado = await pool.query(
        `
        UPDATE siesta_registros
        SET estado = 'cancelado'
        WHERE id_siesta_registro = $1
        RETURNING *
        `,
        [id]
    );

    return resultado.rows[0];
}

module.exports = {
    obtenerResidentesSiesta,
    agregarResidenteSiesta,
    quitarResidenteSiesta,
    obtenerRegistrosHoy,
    acostarResidente,
    levantarResidente,
    cancelarRegistro
};