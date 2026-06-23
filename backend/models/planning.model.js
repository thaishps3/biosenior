// ============================================================
// ARCHIVO: planning.model.js
// Capa de acceso a datos del módulo Planning.
//
// Qué hace:
// - Consulta planes activos.
// - Consulta residentes asignados por plan y turno.
// - Asigna residentes a planes dentro de un turno.
// - Actualiza detalles operativos del residente dentro del plan.
// - Retira residentes del planning sin borrarlos físicamente.
// - Gestiona asignaciones de planes a auxiliares.
// - Gestiona registros diarios de atención.
// ============================================================

const pool = require("../db/connection");

// ============================================================
// BLOQUE: Orden lógico de turnos y planes
//
// Qué hace:
// - Define un orden más natural para mostrar los turnos.
// - Evita que PostgreSQL ordene alfabéticamente Mañana/Noche/Tarde.
// - Coloca el plan Alterno después de A, B, C y D.
// ============================================================

const ORDEN_TURNOS_SQL = `
  CASE
    WHEN turno = 'Mañana' THEN 1
    WHEN turno = 'Tarde' THEN 2
    WHEN turno = 'Noche' THEN 3
    ELSE 4
  END
`;

const ORDEN_PLANES_SQL = `
  CASE
    WHEN letra = 'A' THEN 1
    WHEN letra = 'B' THEN 2
    WHEN letra = 'C' THEN 3
    WHEN letra = 'D' THEN 4
    WHEN letra = 'ALT' THEN 5
    ELSE 6
  END
`;

// ============================================================
// BLOQUE: Planes activos
//
// Qué hace:
// - Devuelve los planes disponibles para Planning.
// - Incluye A, B, C, D y Alterno.
// - Solo devuelve planes activos.
// ============================================================

async function obtenerPlanes() {
  const resultado = await pool.query(`
    SELECT
      id_plan,
      letra,
      nombre,
      activo
    FROM planning_planes
    WHERE activo = TRUE
    ORDER BY ${ORDEN_PLANES_SQL} ASC
  `);

  return resultado.rows;
}

// ============================================================
// BLOQUE: Residentes asignados a planes por turno
//
// Qué hace:
// - Devuelve residentes activos asignados al Planning.
// - Incluye el turno porque ahora la asignación es:
//   turno + plan + residente.
// - Permite filtrar opcionalmente por id_plan y/o turno.
// - Si no recibe filtros, devuelve todas las asignaciones activas.
// ============================================================

async function obtenerPlanResidentes(filtros = {}) {
  const { id_plan, turno } = filtros;

  const condiciones = [
    "ppr.activo = TRUE",
    "r.activo = TRUE"
  ];

  const valores = [];

  if (id_plan) {
    valores.push(id_plan);
    condiciones.push(`ppr.id_plan = $${valores.length}`);
  }

  if (turno) {
    valores.push(turno);
    condiciones.push(`ppr.turno = $${valores.length}`);
  }

  const resultado = await pool.query(
    `
    SELECT
      ppr.id_plan_residente,
      ppr.id_plan,
      pp.letra AS plan_letra,
      pp.nombre AS plan_nombre,
      ppr.id_residente,
      r.nombre AS residente_nombre,
      r.apellidos AS residente_apellidos,
      r.habitacion,
      ppr.turno,
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
    WHERE ${condiciones.join(" AND ")}
    ORDER BY
      ${ORDEN_TURNOS_SQL} ASC,
      ${ORDEN_PLANES_SQL} ASC,
      ppr.orden ASC NULLS LAST,
      r.nombre ASC,
      r.apellidos ASC
    `,
    valores
  );

  return resultado.rows;
}

// ============================================================
// BLOQUE: Buscar asignación activa de residente dentro de un turno
//
// Qué hace:
// - Comprueba si un residente ya pertenece a algún plan
//   dentro del mismo turno.
// - Sirve para mostrar mensajes claros antes de intentar insertar.
// - Refuerza la regla funcional:
//   un residente no puede estar en dos planes dentro del mismo turno.
// ============================================================

async function obtenerAsignacionActivaPorResidenteTurno(id_residente, turno) {
  const resultado = await pool.query(
    `
    SELECT
      ppr.id_plan_residente,
      ppr.id_plan,
      pp.letra AS plan_letra,
      pp.nombre AS plan_nombre,
      ppr.id_residente,
      r.nombre AS residente_nombre,
      r.apellidos AS residente_apellidos,
      ppr.turno,
      ppr.activo
    FROM planning_plan_residentes ppr
    INNER JOIN planning_planes pp
      ON ppr.id_plan = pp.id_plan
    INNER JOIN residentes r
      ON ppr.id_residente = r.id_residente
    WHERE ppr.id_residente = $1
      AND ppr.turno = $2
      AND ppr.activo = TRUE
    LIMIT 1
    `,
    [id_residente, turno]
  );

  return resultado.rows[0];
}

// ============================================================
// BLOQUE: Asignar residente a plan y turno
//
// Qué hace:
// - Inserta una asignación en planning_plan_residentes.
// - Ahora exige turno.
// - Guarda datos operativos como orden, pañal, observación,
//   riesgo y encamado.
// - La base de datos impide duplicados mediante el índice único:
//   residente + turno cuando activo = TRUE.
// ============================================================

async function asignarResidenteAPlan(datos) {
  const {
    id_plan,
    id_residente,
    turno,
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
      turno,
      orden,
      panal,
      observacion,
      riesgo,
      encamado
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
    `,
    [
      id_plan,
      id_residente,
      turno,
      orden || null,
      panal || null,
      observacion || null,
      riesgo || false,
      encamado || false
    ]
  );

  return resultado.rows[0];
}

// ============================================================
// BLOQUE: Actualizar datos operativos de residente asignado
//
// Qué hace:
// - Actualiza información de trabajo del residente dentro del plan.
// - No cambia residente, plan ni turno.
// - Sirve para modificar orden, pañal, observación,
//   riesgo, encamado o estado activo.
// ============================================================

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

// ============================================================
// BLOQUE: Quitar residente del plan
//
// Qué hace:
// - No borra físicamente la fila.
// - Marca activo = FALSE.
// - Esto conserva historial y permite que el residente pueda
//   ser asignado después a otro plan del mismo turno.
// ============================================================

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

// ============================================================
// BLOQUE: Asignaciones de plan a auxiliar por fecha y turno
//
// Qué hace:
// - Devuelve qué auxiliar tiene asignado cada plan.
// - La asignación depende de fecha + turno + plan.
// - No define qué residentes hay en el plan;
//   eso lo gestiona planning_plan_residentes.
// ============================================================

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
      TO_CHAR(pat.fecha, 'YYYY-MM-DD') AS fecha_iso,
      pat.turno,
      pat.activo,
      pat.fecha_creacion
    FROM planning_asignaciones_turno pat
    INNER JOIN planning_planes pp
      ON pat.id_plan = pp.id_plan
    INNER JOIN usuarios_sistema u
      ON pat.id_usuario = u.id_usuario
    WHERE pat.activo = TRUE
    ORDER BY
      pat.fecha DESC,
      ${ORDEN_TURNOS_SQL} ASC,
      ${ORDEN_PLANES_SQL} ASC
  `);

  return resultado.rows;
}

// ============================================================
// BLOQUE: Crear asignación de plan a auxiliar
//
// Qué hace:
// - Asigna un plan completo a una auxiliar en una fecha y turno.
// - No asigna residentes individualmente.
// - PostgreSQL evita duplicar el mismo plan en la misma fecha y turno.
// ============================================================

async function crearAsignacionTurno(datos) {
  const { id_plan, id_usuario, fecha, turno } = datos;

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

// ============================================================
// BLOQUE: Asignaciones de auxiliares a planes por rango de fechas
//
// Qué hace:
// - Devuelve asignaciones activas de auxiliar a plan.
// - Usa rango de fechas: fecha_inicio y fecha_fin.
// - Permite saber qué auxiliar ejecuta cada plan en una fecha/turno.
// - No modifica residentes ni registros.
// ============================================================

async function obtenerAuxiliaresPlan(filtros = {}) {
  const { fecha, turno } = filtros;

  const condiciones = ["pap.activo = TRUE"];
  const valores = [];

  if (fecha) {
    valores.push(fecha);
    condiciones.push(`
      pap.fecha_inicio <= $${valores.length}
      AND pap.fecha_fin >= $${valores.length}
    `);
  }

  if (turno) {
    valores.push(turno);
    condiciones.push(`pap.turno = $${valores.length}`);
  }

  const resultado = await pool.query(
    `
    SELECT
      pap.id_asignacion_auxiliar,
      pap.id_plan,
      pp.letra AS plan_letra,
      pp.nombre AS plan_nombre,
      pap.id_usuario,
      u.nombre AS auxiliar_nombre,
      pap.turno,
      pap.fecha_inicio,
      TO_CHAR(pap.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio_iso,
      pap.fecha_fin,
      TO_CHAR(pap.fecha_fin, 'YYYY-MM-DD') AS fecha_fin_iso,
      pap.activo,
      pap.creado_en
    FROM planning_auxiliares_plan pap
    INNER JOIN planning_planes pp
      ON pap.id_plan = pp.id_plan
    INNER JOIN usuarios_sistema u
      ON pap.id_usuario = u.id_usuario
    WHERE ${condiciones.join(" AND ")}
    ORDER BY
      pap.fecha_inicio DESC,
      ${ORDEN_TURNOS_SQL.replaceAll("turno", "pap.turno")} ASC,
      ${ORDEN_PLANES_SQL.replaceAll("letra", "pp.letra")} ASC,
      u.nombre ASC
    `,
    valores
  );

  return resultado.rows;
}


// ============================================================
// BLOQUE: Buscar colisión de auxiliar asignado a plan
//
// Qué hace:
// - Detecta si ya existe una asignación activa para el mismo
//   plan + turno con fechas solapadas.
// - Evita que dos auxiliares queden asignados al mismo plan
//   durante el mismo rango.
// ============================================================

async function buscarColisionAuxiliarPlan(datos) {
  const {
    id_plan,
    turno,
    fecha_inicio,
    fecha_fin,
    id_asignacion_auxiliar
  } = datos;

  const valores = [
    id_plan,
    turno,
    fecha_inicio,
    fecha_fin
  ];

  let condicionExcluir = "";

  if (id_asignacion_auxiliar) {
    valores.push(id_asignacion_auxiliar);
    condicionExcluir = `AND id_asignacion_auxiliar <> $${valores.length}`;
  }

  const resultado = await pool.query(
    `
    SELECT
      id_asignacion_auxiliar,
      id_plan,
      id_usuario,
      turno,
      fecha_inicio,
      fecha_fin
    FROM planning_auxiliares_plan
    WHERE activo = TRUE
      AND id_plan = $1
      AND turno = $2
      AND fecha_inicio <= $4
      AND fecha_fin >= $3
      ${condicionExcluir}
    LIMIT 1
    `,
    valores
  );

  return resultado.rows[0];
}


// ============================================================
// BLOQUE: Crear asignación auxiliar-plan
//
// Qué hace:
// - Asigna un auxiliar a un plan durante un rango de fechas.
// - Valida colisión antes de insertar.
// - Si hay solapamiento, lanza error controlado.
// ============================================================

async function crearAuxiliarPlan(datos) {
  const {
    id_plan,
    id_usuario,
    turno,
    fecha_inicio,
    fecha_fin
  } = datos;

  const colision = await buscarColisionAuxiliarPlan({
    id_plan,
    turno,
    fecha_inicio,
    fecha_fin
  });

  if (colision) {
    const error = new Error(
      "Ya existe una auxiliar asignada a este plan, turno y rango de fechas."
    );
    error.codigo = "COLISION_AUXILIAR_PLAN";
    throw error;
  }

  const resultado = await pool.query(
    `
    INSERT INTO planning_auxiliares_plan (
      id_plan,
      id_usuario,
      turno,
      fecha_inicio,
      fecha_fin
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [
      id_plan,
      id_usuario,
      turno,
      fecha_inicio,
      fecha_fin
    ]
  );

  return resultado.rows[0];
}


// ============================================================
// BLOQUE: Actualizar asignación auxiliar-plan
//
// Qué hace:
// - Permite cambiar auxiliar, turno o rango de fechas.
// - Valida que no se solape con otra asignación activa.
// ============================================================

async function actualizarAuxiliarPlan(id, datos) {
  const {
    id_plan,
    id_usuario,
    turno,
    fecha_inicio,
    fecha_fin,
    activo
  } = datos;

  const colision = await buscarColisionAuxiliarPlan({
    id_plan,
    turno,
    fecha_inicio,
    fecha_fin,
    id_asignacion_auxiliar: id
  });

  if (colision) {
    const error = new Error(
      "Ya existe una auxiliar asignada a este plan, turno y rango de fechas."
    );
    error.codigo = "COLISION_AUXILIAR_PLAN";
    throw error;
  }

  const resultado = await pool.query(
    `
    UPDATE planning_auxiliares_plan
    SET
      id_plan = $1,
      id_usuario = $2,
      turno = $3,
      fecha_inicio = $4,
      fecha_fin = $5,
      activo = $6
    WHERE id_asignacion_auxiliar = $7
    RETURNING *
    `,
    [
      id_plan,
      id_usuario,
      turno,
      fecha_inicio,
      fecha_fin,
      activo !== undefined ? activo : true,
      id
    ]
  );

  return resultado.rows[0];
}


// ============================================================
// BLOQUE: Desactivar asignación auxiliar-plan
//
// Qué hace:
// - No borra físicamente.
// - Marca activo = FALSE.
// - Conserva trazabilidad de asignaciones anteriores.
// ============================================================

async function desactivarAuxiliarPlan(id) {
  const resultado = await pool.query(
    `
    UPDATE planning_auxiliares_plan
    SET activo = FALSE
    WHERE id_asignacion_auxiliar = $1
    RETURNING *
    `,
    [id]
  );

  return resultado.rows[0];
}

// ============================================================
// BLOQUE: Registros diarios del Planning
//
// Qué hace:
// - Devuelve el historial de residentes atendidos.
// - Incluye fecha, hora, turno, plan, residente y auxiliar.
// - El historial permite saber qué ocurrió en cada turno.
// ============================================================

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
      r.apellidos AS residente_apellidos,
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
    ORDER BY
      pr.fecha DESC,
      pr.hora DESC
  `);

  return resultado.rows;
}

// ============================================================
// BLOQUE: Crear registro diario
//
// Qué hace:
// - Marca un residente como atendido en una fecha y turno.
// - La acción debe ser compatible con la nueva regla:
//   Mañana -> levantar
//   Tarde  -> atender
//   Noche  -> acostar
// - PostgreSQL evita duplicar residente + fecha + turno.
// ============================================================

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

// ============================================================
// BLOQUE: Actualizar registro diario
//
// Qué hace:
// - Actualiza incidencia, observación o estado realizado.
// - Se usa cuando un residente ya fue marcado como atendido
//   y luego se añade o modifica una incidencia.
// - No cambia plan, residente, usuario, fecha ni turno.
// ============================================================

async function actualizarRegistro(id, datos) {
  const {
    incidencia,
    observacion,
    realizado
  } = datos;

  const resultado = await pool.query(
    `
    UPDATE planning_registros
    SET
      incidencia = $1,
      observacion = $2,
      realizado = $3
    WHERE id_registro = $4
    RETURNING *
    `,
    [
      incidencia || null,
      observacion || null,
      realizado !== undefined ? realizado : true,
      id
    ]
  );

  return resultado.rows[0];
}

// ============================================================
// BLOQUE: Eliminar registro diario
//
// Qué hace:
// - Borra un registro del historial.
// - Se usa cuando una marca de atención fue registrada por error.
// ============================================================

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

// ============================================================
// BLOQUE: Exportación del modelo
//
// Qué hace:
// - Expone las funciones que usará planning.controller.js.
// ============================================================

module.exports = {
  obtenerPlanes,
  obtenerPlanResidentes,
  obtenerAsignacionActivaPorResidenteTurno,
  asignarResidenteAPlan,
  actualizarPlanResidente,
  quitarResidenteDePlan,

  obtenerAsignacionesTurno,
  crearAsignacionTurno,

  obtenerAuxiliaresPlan,
  crearAuxiliarPlan,
  actualizarAuxiliarPlan,
  desactivarAuxiliarPlan,

  obtenerRegistros,
  crearRegistro,
  actualizarRegistro,
  eliminarRegistro
};