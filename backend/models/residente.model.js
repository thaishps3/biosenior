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
            fecha_alta
        FROM residentes
        ORDER BY nombre ASC
    `);

    return resultado.rows;
}

module.exports = {
    obtenerTodos
};