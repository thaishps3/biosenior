// ============================================================
// ARCHIVO: planning.controller.js
// Controlador del módulo Planning.
//
// Qué hace:
// - Recibe las peticiones HTTP del frontend.
// - Valida datos obligatorios antes de llamar al modelo.
// - Devuelve respuestas claras al frontend.
// - Traduce errores de PostgreSQL a mensajes comprensibles.
// ============================================================

const PlanningModel = require("../models/planning.model");

// ============================================================
// BLOQUE: Validaciones generales del Planning
//
// Qué hace:
// - Centraliza validaciones simples usadas por varias funciones.
// - Evita repetir listas de turnos permitidos en cada endpoint.
// ============================================================

const TURNOS_VALIDOS = ["Mañana", "Tarde", "Noche"];

function esTurnoValido(turno) {
  return TURNOS_VALIDOS.includes(turno);
}

// ============================================================
// BLOQUE: Listar planes
//
// Qué hace:
// - Devuelve los planes activos del Planning.
// - Incluye A, B, C, D y Alterno.
// ============================================================

async function listarPlanes(req, res) {
  try {
    const planes = await PlanningModel.obtenerPlanes();
    res.json(planes);
  } catch (error) {
    console.error("Error al obtener planes:", error);
    res.status(500).json({ mensaje: "Error al obtener planes" });
  }
}

// ============================================================
// BLOQUE: Listar residentes asignados al Planning
//
// Qué hace:
// - Devuelve residentes asignados a planes.
// - Permite filtrar por plan y/o turno usando query params.
// - Ejemplos:
//   /api/planning/plan-residentes
//   /api/planning/plan-residentes?id_plan=1
//   /api/planning/plan-residentes?turno=Tarde
//   /api/planning/plan-residentes?id_plan=1&turno=Tarde
// ============================================================

async function listarPlanResidentes(req, res) {
  try {
    const { id_plan, turno } = req.query;

    if (turno && !esTurnoValido(turno)) {
      return res.status(400).json({
        mensaje: "Turno no válido. Use Mañana, Tarde o Noche."
      });
    }

    const residentes = await PlanningModel.obtenerPlanResidentes({
      id_plan: id_plan || null,
      turno: turno || null
    });

    res.json(residentes);
  } catch (error) {
    console.error("Error al obtener residentes del planning:", error);
    res.status(500).json({
      mensaje: "Error al obtener residentes del planning"
    });
  }
}

// ============================================================
// BLOQUE: Asignar residente a plan y turno
//
// Qué hace:
// - Recibe id_plan, id_residente y turno desde el frontend.
// - Comprueba que el turno sea válido.
// - Antes de insertar, revisa si el residente ya está activo
//   en otro plan dentro del mismo turno.
// - Si ya existe, devuelve un mensaje claro para el admin.
// ============================================================

async function asignarResidenteAPlan(req, res) {
  try {
    const { id_plan, id_residente, turno } = req.body;

    if (!id_plan || !id_residente || !turno) {
      return res.status(400).json({
        mensaje: "Plan, residente y turno son obligatorios"
      });
    }

    if (!esTurnoValido(turno)) {
      return res.status(400).json({
        mensaje: "Turno no válido. Use Mañana, Tarde o Noche."
      });
    }

    const asignacionExistente =
      await PlanningModel.obtenerAsignacionActivaPorResidenteTurno(
        id_residente,
        turno
      );

    if (asignacionExistente) {
      return res.status(409).json({
        mensaje: `Este residente ya pertenece al ${asignacionExistente.plan_nombre} en el turno ${turno}. Debe quitarlo primero antes de asignarlo a otro plan.`,
        asignacion: asignacionExistente
      });
    }

    const asignacion = await PlanningModel.asignarResidenteAPlan(req.body);
    res.status(201).json(asignacion);
  } catch (error) {
    console.error("Error al asignar residente al plan:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        mensaje:
          "Este residente ya está asignado a un plan activo dentro de ese turno."
      });
    }

    res.status(500).json({
      mensaje: "Error al asignar residente al plan"
    });
  }
}

// ============================================================
// BLOQUE: Actualizar residente asignado al Planning
//
// Qué hace:
// - Actualiza datos operativos del residente asignado.
// - No cambia plan, residente ni turno.
// - Sirve para editar orden, pañal, observación,
//   riesgo, encamado o estado activo.
// ============================================================

async function actualizarPlanResidente(req, res) {
  try {
    const asignacion = await PlanningModel.actualizarPlanResidente(
      req.params.id,
      req.body
    );

    if (!asignacion) {
      return res.status(404).json({
        mensaje: "Asignación de residente no encontrada"
      });
    }

    res.json(asignacion);
  } catch (error) {
    console.error("Error al actualizar residente del plan:", error);
    res.status(500).json({
      mensaje: "Error al actualizar residente del plan"
    });
  }
}

// ============================================================
// BLOQUE: Quitar residente del Planning
//
// Qué hace:
// - Marca la asignación como inactiva.
// - No borra físicamente la fila.
// - Permite conservar trazabilidad y reasignar después.
// ============================================================

async function quitarResidenteDePlan(req, res) {
  try {
    const asignacion = await PlanningModel.quitarResidenteDePlan(req.params.id);

    if (!asignacion) {
      return res.status(404).json({
        mensaje: "Asignación de residente no encontrada"
      });
    }

    res.json({
      mensaje: "Residente retirado del plan correctamente",
      asignacion
    });
  } catch (error) {
    console.error("Error al retirar residente del plan:", error);
    res.status(500).json({
      mensaje: "Error al retirar residente del plan"
    });
  }
}

// ============================================================
// BLOQUE: Listar asignaciones de plan a auxiliar
//
// Qué hace:
// - Devuelve qué auxiliar tiene asignado cada plan.
// - La asignación depende de fecha + turno + plan.
// ============================================================

async function listarAsignacionesTurno(req, res) {
  try {
    const asignaciones = await PlanningModel.obtenerAsignacionesTurno();
    res.json(asignaciones);
  } catch (error) {
    console.error("Error al obtener asignaciones de turno:", error);
    res.status(500).json({
      mensaje: "Error al obtener asignaciones de turno"
    });
  }
}

// ============================================================
// BLOQUE: Crear asignación de plan a auxiliar
//
// Qué hace:
// - Asigna un plan completo a una auxiliar.
// - Valida plan, usuario y turno.
// - PostgreSQL evita duplicar el mismo plan en la misma fecha y turno.
// ============================================================

async function crearAsignacionTurno(req, res) {
  try {
    const { id_plan, id_usuario, turno } = req.body;

    if (!id_plan || !id_usuario || !turno) {
      return res.status(400).json({
        mensaje: "Plan, usuario y turno son obligatorios"
      });
    }

    if (!esTurnoValido(turno)) {
      return res.status(400).json({
        mensaje: "Turno no válido. Use Mañana, Tarde o Noche."
      });
    }

    const asignacion = await PlanningModel.crearAsignacionTurno(req.body);
    res.status(201).json(asignacion);
  } catch (error) {
    console.error("Error al crear asignación de turno:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        mensaje: "Ya existe una asignación para ese plan, fecha y turno"
      });
    }

    res.status(500).json({
      mensaje: "Error al crear asignación de turno"
    });
  }
}

// ============================================================
// BLOQUE: Listar asignaciones auxiliar-plan por rango
//
// Qué hace:
// - Devuelve qué auxiliar tiene asignado cada plan.
// - Permite filtrar por fecha y turno desde query params.
// - Usa planning_auxiliares_plan.
// ============================================================

async function listarAuxiliaresPlan(req, res) {
  try {
    const { fecha, turno } = req.query;

    if (turno && !esTurnoValido(turno)) {
      return res.status(400).json({
        mensaje: "Turno no válido. Use Mañana, Tarde o Noche."
      });
    }

    const asignaciones = await PlanningModel.obtenerAuxiliaresPlan({
      fecha: fecha || null,
      turno: turno || null
    });

    res.json(asignaciones);
  } catch (error) {
    console.error("Error al obtener auxiliares asignados a planes:", error);
    res.status(500).json({
      mensaje: "Error al obtener auxiliares asignados a planes"
    });
  }
}


// ============================================================
// BLOQUE: Crear asignación auxiliar-plan por rango
//
// Qué hace:
// - Asigna una auxiliar a un plan durante un rango de fechas.
// - Valida plan, usuario, turno, fecha inicio y fecha fin.
// - El modelo valida colisiones de fecha.
// ============================================================

async function crearAuxiliarPlan(req, res) {
  try {
    const {
      id_plan,
      id_usuario,
      turno,
      fecha_inicio,
      fecha_fin
    } = req.body;

    if (!id_plan || !id_usuario || !turno || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        mensaje: "Plan, auxiliar, turno, fecha inicio y fecha fin son obligatorios"
      });
    }

    if (!esTurnoValido(turno)) {
      return res.status(400).json({
        mensaje: "Turno no válido. Use Mañana, Tarde o Noche."
      });
    }

    if (fecha_fin < fecha_inicio) {
      return res.status(400).json({
        mensaje: "La fecha fin no puede ser anterior a la fecha inicio"
      });
    }

    const asignacion = await PlanningModel.crearAuxiliarPlan(req.body);
    res.status(201).json(asignacion);
  } catch (error) {
    console.error("Error al crear asignación auxiliar-plan:", error);

    if (error.codigo === "COLISION_AUXILIAR_PLAN") {
      return res.status(409).json({
        mensaje: error.message
      });
    }

    res.status(500).json({
      mensaje: "Error al crear asignación auxiliar-plan"
    });
  }
}


// ============================================================
// BLOQUE: Actualizar asignación auxiliar-plan
//
// Qué hace:
// - Permite editar auxiliar, plan, turno o rango de fechas.
// - Valida datos mínimos.
// - El modelo evita solapamientos con otras asignaciones activas.
// ============================================================

async function actualizarAuxiliarPlan(req, res) {
  try {
    const {
      id_plan,
      id_usuario,
      turno,
      fecha_inicio,
      fecha_fin
    } = req.body;

    if (!id_plan || !id_usuario || !turno || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        mensaje: "Plan, auxiliar, turno, fecha inicio y fecha fin son obligatorios"
      });
    }

    if (!esTurnoValido(turno)) {
      return res.status(400).json({
        mensaje: "Turno no válido. Use Mañana, Tarde o Noche."
      });
    }

    if (fecha_fin < fecha_inicio) {
      return res.status(400).json({
        mensaje: "La fecha fin no puede ser anterior a la fecha inicio"
      });
    }

    const asignacion = await PlanningModel.actualizarAuxiliarPlan(
      req.params.id,
      req.body
    );

    if (!asignacion) {
      return res.status(404).json({
        mensaje: "Asignación auxiliar-plan no encontrada"
      });
    }

    res.json(asignacion);
  } catch (error) {
    console.error("Error al actualizar asignación auxiliar-plan:", error);

    if (error.codigo === "COLISION_AUXILIAR_PLAN") {
      return res.status(409).json({
        mensaje: error.message
      });
    }

    res.status(500).json({
      mensaje: "Error al actualizar asignación auxiliar-plan"
    });
  }
}


// ============================================================
// BLOQUE: Desactivar asignación auxiliar-plan
//
// Qué hace:
// - No borra físicamente la asignación.
// - Marca activo = false.
// - Conserva trazabilidad.
// ============================================================

async function desactivarAuxiliarPlan(req, res) {
  try {
    const asignacion = await PlanningModel.desactivarAuxiliarPlan(req.params.id);

    if (!asignacion) {
      return res.status(404).json({
        mensaje: "Asignación auxiliar-plan no encontrada"
      });
    }

    res.json({
      mensaje: "Asignación auxiliar-plan desactivada correctamente",
      asignacion
    });
  } catch (error) {
    console.error("Error al desactivar asignación auxiliar-plan:", error);
    res.status(500).json({
      mensaje: "Error al desactivar asignación auxiliar-plan"
    });
  }
}
// ============================================================
// BLOQUE: Listar registros diarios del Planning
//
// Qué hace:
// - Devuelve historial de residentes atendidos.
// - Incluye fecha, hora, turno, plan, residente y auxiliar.
// ============================================================

async function listarRegistros(req, res) {
  try {
    const registros = await PlanningModel.obtenerRegistros();
    res.json(registros);
  } catch (error) {
    console.error("Error al obtener registros de planning:", error);
    res.status(500).json({
      mensaje: "Error al obtener registros de planning"
    });
  }
}

// ============================================================
// BLOQUE: Crear registro diario del Planning
//
// Qué hace:
// - Marca un residente como atendido en un turno concreto.
// - Valida plan, residente, usuario, turno y acción.
// - La acción esperada es:
//   Mañana -> levantar
//   Tarde  -> atender
//   Noche  -> acostar
// ============================================================

async function crearRegistro(req, res) {
  try {
    const { id_plan, id_residente, id_usuario, turno, accion } = req.body;

    if (!id_plan || !id_residente || !id_usuario || !turno || !accion) {
      return res.status(400).json({
        mensaje: "Plan, residente, usuario, turno y acción son obligatorios"
      });
    }

    if (!esTurnoValido(turno)) {
      return res.status(400).json({
        mensaje: "Turno no válido. Use Mañana, Tarde o Noche."
      });
    }

    const registro = await PlanningModel.crearRegistro(req.body);
    res.status(201).json(registro);
  } catch (error) {
    console.error("Error al crear registro de planning:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        mensaje: "Este residente ya fue registrado en ese turno"
      });
    }

    res.status(500).json({
      mensaje: "Error al crear registro de planning"
    });
  }
}

// ============================================================
// BLOQUE: Actualizar registro diario
//
// Qué hace:
// - Actualiza incidencia, observación o estado realizado.
// - Lo usa el frontend cuando se añade una incidencia
//   a un residente que ya estaba marcado como atendido.
// ============================================================

async function actualizarRegistro(req, res) {
  try {
    const registro = await PlanningModel.actualizarRegistro(
      req.params.id,
      req.body
    );

    if (!registro) {
      return res.status(404).json({
        mensaje: "Registro no encontrado"
      });
    }

    res.json(registro);
  } catch (error) {
    console.error("Error al actualizar registro de planning:", error);
    res.status(500).json({
      mensaje: "Error al actualizar registro de planning"
    });
  }
}

// ============================================================
// BLOQUE: Eliminar registro diario
//
// Qué hace:
// - Borra un registro cuando se marcó por error.
// - Devuelve mensaje claro al frontend.
// ============================================================

async function eliminarRegistro(req, res) {
  try {
    const registro = await PlanningModel.eliminarRegistro(req.params.id);

    if (!registro) {
      return res.status(404).json({
        mensaje: "Registro no encontrado"
      });
    }

    res.json({
      mensaje: "Registro eliminado correctamente",
      registro
    });
  } catch (error) {
    console.error("Error al eliminar registro de planning:", error);
    res.status(500).json({
      mensaje: "Error al eliminar registro de planning"
    });
  }
}

// ============================================================
// BLOQUE: Exportación del controlador
//
// Qué hace:
// - Expone las funciones usadas por planning.routes.js.
// ============================================================

module.exports = {
  listarPlanes,
  listarPlanResidentes,
  asignarResidenteAPlan,
  actualizarPlanResidente,
  quitarResidenteDePlan,

  listarAsignacionesTurno,
  crearAsignacionTurno,

  listarAuxiliaresPlan,
  crearAuxiliarPlan,
  actualizarAuxiliarPlan,
  desactivarAuxiliarPlan,

  listarRegistros,
  crearRegistro,
  actualizarRegistro,
  eliminarRegistro
};