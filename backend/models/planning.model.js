const pool = require("../db/connection");

// ─────────────────────────────────────────────
// PLANES
// ─────────────────────────────────────────────

async function obtenerPlanes() {
    const resultado = await pool.query(`
        SELECT 
            id_plan,
            letra,
            nombre,
            activo
        FROM planning_planes
        WHERE activo = TRUE
        ORDER BY letra ASC
    `);

    return resultado.rows;
}

// ─────────────────────────────────────────────
// RESIDENTES ASIGNADOS A PLANES
// ─────────────────────────────────────────────

async function obtenerPlanResidentes() {
    const resultado = await pool.query(`
        SELECT 
            ppr.id_plan_residente,
            ppr.id_plan,
            pp.letra AS plan_letra,
            pp.nombre AS plan_nombre,
            ppr.id_residente,
            r.nombre AS residente_nombre,
            r.apellidos AS residente_apellidos,
            r.habitacion,
            ppr.orden,
            ppr.panal,
            ppr.observacion,
            ppr.riesgo,
            ppr.encamado,
            ppr.activo
        FROM planning_plan_residentes ppr
        INNER JOIN planning_planes pp
            ON ppr.id_plan = pp.id_plan
        INNER JOIN residentes r
            ON ppr.id_residente = r.id_residente
        WHERE ppr.activo = TRUE
        AND r.activo = TRUE
        ORDER BY pp.letra ASC, ppr.orden ASC, r.nombre ASC
    `);

    return resultado.rows;
}

async function asignarResidenteAPlan(datos) {
    const {
        id_plan,
        id_residente,
        orden,
        panal,
        observacion,
        riesgo,
        encamado
    } = datos;

    const resultado = await pool.query(
        `
        INSERT INTO planning_plan_residentes (
            id_plan,
            id_residente,
            orden,
            panal,
            observacion,
            riesgo,
            encamado
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        `,
        [
            id_plan,
            id_residente,
            orden || null,
            panal || null,
            observacion || null,
            riesgo || false,
            encamado || false
        ]
    );

    return resultado.rows[0];
}

async function actualizarPlanResidente(id, datos) {
    const {
        orden,
        panal,
        observacion,
        riesgo,
        encamado,
        activo
    } = datos;

    const resultado = await pool.query(
        `
        UPDATE planning_plan_residentes
        SET
            orden = $1,
            panal = $2,
            observacion = $3,
            riesgo = $4,
            encamado = $5,
            activo = $6
        WHERE id_plan_residente = $7
        RETURNING *
        `,
        [
            orden || null,
            panal || null,
            observacion || null,
            riesgo || false,
            encamado || false,
            activo !== undefined ? activo : true,
            id
        ]
    );

    return resultado.rows[0];
}

async function quitarResidenteDePlan(id) {
    const resultado = await pool.query(
        `
        UPDATE planning_plan_residentes
        SET activo = FALSE
        WHERE id_plan_residente = $1
        RETURNING *
        `,
        [id]
    );

    return resultado.rows[0];
}

// ─────────────────────────────────────────────
// ASIGNACIONES DE PLAN A AUXILIAR POR TURNO
// ─────────────────────────────────────────────

async function obtenerAsignacionesTurno() {
    const resultado = await pool.query(`
        SELECT 
            pat.id_asignacion,
            pat.id_plan,
            pp.letra AS plan_letra,
            pp.nombre AS plan_nombre,
            pat.id_usuario,
            u.nombre AS auxiliar_nombre,
            pat.fecha,
            pat.turno,
            pat.activo,
            pat.fecha_creacion
        FROM planning_asignaciones_turno pat
        INNER JOIN planning_planes pp
            ON pat.id_plan = pp.id_plan
        INNER JOIN usuarios_sistema u
            ON pat.id_usuario = u.id_usuario
        WHERE pat.activo = TRUE
        ORDER BY pat.fecha DESC, pat.turno ASC, pp.letra ASC
    `);

    return resultado.rows;
}

async function crearAsignacionTurno(datos) {
    const {
        id_plan,
        id_usuario,
        fecha,
        turno
    } = datos;

    const resultado = await pool.query(
        `
        INSERT INTO planning_asignaciones_turno (
            id_plan,
            id_usuario,
            fecha,
            turno
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [
            id_plan,
            id_usuario,
            fecha || new Date().toISOString().split("T")[0],
            turno
        ]
    );

    return resultado.rows[0];
}

// ─────────────────────────────────────────────
// REGISTROS DIARIOS
// ─────────────────────────────────────────────

async function obtenerRegistros() {
    const resultado = await pool.query(`
        SELECT 
            pr.id_registro,
            pr.id_asignacion,
            pr.id_plan,
            pp.letra AS plan_letra,
            pp.nombre AS plan_nombre,
            pr.id_residente,
            r.nombre AS residente_nombre,
            r.habitacion,
            pr.id_usuario,
            u.nombre AS auxiliar_nombre,
            pr.fecha,
            TO_CHAR(pr.fecha, 'YYYY-MM-DD') AS fecha_iso,
            TO_CHAR(pr.hora, 'HH24:MI') AS hora,
            pr.turno,
            pr.accion,
            pr.realizado,
            pr.incidencia,
            pr.observacion
        FROM planning_registros pr
        INNER JOIN planning_planes pp
            ON pr.id_plan = pp.id_plan
        INNER JOIN residentes r
            ON pr.id_residente = r.id_residente
        INNER JOIN usuarios_sistema u
            ON pr.id_usuario = u.id_usuario
        ORDER BY pr.fecha DESC, pr.hora DESC
    `);

    return resultado.rows;
}

async function crearRegistro(datos) {
    const {
        id_asignacion,
        id_plan,
        id_residente,
        id_usuario,
        fecha,
        turno,
        accion,
        incidencia,
        observacion
    } = datos;

    const resultado = await pool.query(
        `
        INSERT INTO planning_registros (
            id_asignacion,
            id_plan,
            id_residente,
            id_usuario,
            fecha,
            turno,
            accion,
            incidencia,
            observacion
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        `,
        [
            id_asignacion || null,
            id_plan,
            id_residente,
            id_usuario,
            fecha || new Date().toISOString().split("T")[0],
            turno,
            accion,
            incidencia || null,
            observacion || null
        ]
    );

    return resultado.rows[0];
}

async function eliminarRegistro(id) {
    const resultado = await pool.query(
        `
        DELETE FROM planning_registros
        WHERE id_registro = $1
        RETURNING *
        `,
        [id]
    );

    return resultado.rows[0];
}

module.exports = {
    obtenerPlanes,
    obtenerPlanResidentes,
    asignarResidenteAPlan,
    actualizarPlanResidente,
    quitarResidenteDePlan,
    obtenerAsignacionesTurno,
    crearAsignacionTurno,
    obtenerRegistros,
    crearRegistro,
    eliminarRegistro
};