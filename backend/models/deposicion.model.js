const pool = require("../db/connection");

async function obtenerTodas() {
    const resultado = await pool.query(`
        SELECT 
            rd.id_registro,
            rd.id_residente,
            r.nombre AS residente_nombre,
            r.apellidos AS residente_apellidos,
            r.genero,
            rd.id_tipo,
            td.nombre AS tipo_deposicion,
            rd.id_usuario,
            u.nombre AS usuario_nombre,
            rd.fecha_registro,
            TO_CHAR(rd.fecha_registro, 'YYYY-MM-DD') AS fecha_iso,
            TO_CHAR(rd.fecha_registro, 'HH24:MI') AS hora,
            rd.miccion,
            rd.turno,
            rd.observacion
        FROM registros_deposiciones rd
        INNER JOIN residentes r 
            ON rd.id_residente = r.id_residente
        INNER JOIN tipos_deposicion td 
            ON rd.id_tipo = td.id_tipo
        LEFT JOIN usuarios_sistema u 
            ON rd.id_usuario = u.id_usuario
        ORDER BY rd.fecha_registro DESC
    `);

    return resultado.rows;
}

async function crearDeposicion(datos) {
    const {
        id_residente,
        id_tipo,
        id_usuario,
        miccion,
        turno,
        observacion
    } = datos;

    const resultado = await pool.query(
        `
        INSERT INTO registros_deposiciones 
            (id_residente, id_tipo, id_usuario, miccion, turno, observacion)
        VALUES 
            ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `,
        [
            id_residente,
            id_tipo,
            id_usuario || null,
            miccion || null,
            turno || null,
            observacion || null
        ]
    );

    return resultado.rows[0];
}

async function eliminarDeposicion(id) {
    const resultado = await pool.query(
        `
        DELETE FROM registros_deposiciones
        WHERE id_registro = $1
        RETURNING *
        `,
        [id]
    );

    return resultado.rows[0];
}

async function obtenerAlertas() {
    const resultado = await pool.query(`
        SELECT 
            r.id_residente,
            r.nombre,
            r.apellidos,
            r.habitacion,
            MAX(rd.fecha_registro) AS ultima_fecha
        FROM residentes r
        LEFT JOIN registros_deposiciones rd 
            ON r.id_residente = rd.id_residente
        LEFT JOIN tipos_deposicion td
            ON rd.id_tipo = td.id_tipo
        WHERE r.activo = TRUE
        GROUP BY r.id_residente, r.nombre, r.apellidos, r.habitacion
        HAVING 
            MAX(rd.fecha_registro) IS NULL
            OR MAX(rd.fecha_registro) < CURRENT_TIMESTAMP - INTERVAL '2 days'
        ORDER BY ultima_fecha ASC NULLS FIRST
    `);

    return resultado.rows;
}

async function obtenerTipos() {
    const resultado = await pool.query(`
        SELECT 
            id_tipo,
            nombre,
            descripcion
        FROM tipos_deposicion
        ORDER BY id_tipo ASC
    `);

    return resultado.rows;
}

module.exports = {
    obtenerTodas,
    crearDeposicion,
    eliminarDeposicion,
    obtenerAlertas,
    obtenerTipos
};