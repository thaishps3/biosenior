const pool = require("../db/connection");

async function obtenerTodos() {
    const resultado = await pool.query(`
        SELECT 
            id_usuario,
            nombre,
            email,
            rol,
            activo,
            pin,
            fecha_creacion
        FROM usuarios_sistema
        ORDER BY nombre ASC
    `);

    return resultado.rows;
}

async function obtenerPorId(id) {
    const resultado = await pool.query(
        `
        SELECT 
            id_usuario,
            nombre,
            email,
            password_hash,
            rol,
            activo,
            pin,
            fecha_creacion
        FROM usuarios_sistema
        WHERE id_usuario = $1
        `,
        [id]
    );

    return resultado.rows[0];
}

async function crear(datos) {
    const {
        nombre,
        email,
        password_hash,
        rol,
        pin
    } = datos;

    const emailFinal = email || `${nombre.toLowerCase().replaceAll(" ", ".")}@biosenior.local`;

    const resultado = await pool.query(
        `
        INSERT INTO usuarios_sistema (
            nombre,
            email,
            password_hash,
            rol,
            pin
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING 
            id_usuario,
            nombre,
            email,
            rol,
            activo,
            pin,
            fecha_creacion
        `,
        [
            nombre,
            emailFinal,
            password_hash || pin || "1234",
            rol || "auxiliar",
            pin || null
        ]
    );

    return resultado.rows[0];
}

async function actualizar(id, datos) {
    const {
        nombre,
        email,
        rol,
        pin,
        activo
    } = datos;

    const usuarioActual = await obtenerPorId(id);

    if (!usuarioActual) {
        return null;
    }

    const resultado = await pool.query(
        `
        UPDATE usuarios_sistema
        SET
            nombre = $1,
            email = $2,
            rol = $3,
            pin = $4,
            password_hash = $5,
            activo = $6
        WHERE id_usuario = $7
        RETURNING 
            id_usuario,
            nombre,
            email,
            rol,
            activo,
            pin,
            fecha_creacion
        `,
        [
            nombre || usuarioActual.nombre,
            email || usuarioActual.email,
            rol || usuarioActual.rol,
            pin || usuarioActual.pin,
            pin ? pin : usuarioActual.password_hash,
            activo !== undefined ? activo : usuarioActual.activo,
            id
        ]
    );

    return resultado.rows[0];
}

async function eliminar(id) {
    const resultado = await pool.query(
        `
        UPDATE usuarios_sistema
        SET activo = FALSE
        WHERE id_usuario = $1
        RETURNING 
            id_usuario,
            nombre,
            email,
            rol,
            activo,
            pin,
            fecha_creacion
        `,
        [id]
    );

    return resultado.rows[0];
}

async function loginPorPin(nombre, pin) {
    const resultado = await pool.query(
        `
        SELECT 
            id_usuario,
            nombre,
            email,
            rol,
            activo
        FROM usuarios_sistema
        WHERE LOWER(nombre) = LOWER($1)
        AND pin = $2
        AND activo = TRUE
        `,
        [nombre, pin]
    );

    return resultado.rows[0];
}

module.exports = {
    obtenerTodos,
    obtenerPorId,
    crear,
    actualizar,
    eliminar,
    loginPorPin
};