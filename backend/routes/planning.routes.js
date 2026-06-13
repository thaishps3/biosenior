// ============================================================
// ARCHIVO: planning.routes.js
// Rutas del módulo Planning.
//
// Qué hace:
// - Define los endpoints HTTP para planes.
// - Define los endpoints para residentes asignados.
// - Define los endpoints para asignaciones de auxiliares.
// - Define los endpoints para registros diarios.
// ============================================================

const express = require("express");
const router = express.Router();
const PlanningController = require("../controllers/planning.controller");

// ============================================================
// BLOQUE: Planes
//
// Qué hace:
// - Devuelve los planes activos del Planning.
// - Incluye A, B, C, D y Alterno.
// ============================================================

router.get("/planes", PlanningController.listarPlanes);

// ============================================================
// BLOQUE: Residentes asignados a planes
//
// Qué hace:
// - Lista residentes asignados.
// - Permite crear, editar o retirar residentes del Planning.
// - La asignación actual depende de:
//   plan + turno + residente.
// ============================================================

router.get("/plan-residentes", PlanningController.listarPlanResidentes);
router.post("/plan-residentes", PlanningController.asignarResidenteAPlan);
router.put("/plan-residentes/:id", PlanningController.actualizarPlanResidente);
router.delete("/plan-residentes/:id", PlanningController.quitarResidenteDePlan);

// ============================================================
// BLOQUE: Asignaciones de plan a auxiliar por turno
//
// Qué hace:
// - Define qué auxiliar lleva qué plan en una fecha y turno.
// - No asigna residentes individuales.
// ============================================================

router.get("/asignaciones", PlanningController.listarAsignacionesTurno);
router.post("/asignaciones", PlanningController.crearAsignacionTurno);

// ============================================================
// BLOQUE: Registros diarios
//
// Qué hace:
// - Lista registros de atención.
// - Crea registros cuando una auxiliar marca residente atendido.
// - Actualiza incidencia/observación.
// - Elimina registros si se marcó por error.
// ============================================================

router.get("/registros", PlanningController.listarRegistros);
router.post("/registros", PlanningController.crearRegistro);
router.put("/registros/:id", PlanningController.actualizarRegistro);
router.delete("/registros/:id", PlanningController.eliminarRegistro);

// ============================================================
// BLOQUE: Exportación de rutas
// ============================================================

module.exports = router;