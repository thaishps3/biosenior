const express = require("express");
const router = express.Router();

const PlanningController = require("../controllers/planning.controller");

// ─────────────────────────────────────────────
// PLANES
// ─────────────────────────────────────────────

router.get("/planes", PlanningController.listarPlanes);

// ─────────────────────────────────────────────
// RESIDENTES ASIGNADOS A PLANES
// ─────────────────────────────────────────────

router.get("/plan-residentes", PlanningController.listarPlanResidentes);
router.post("/plan-residentes", PlanningController.asignarResidenteAPlan);
router.put("/plan-residentes/:id", PlanningController.actualizarPlanResidente);
router.delete("/plan-residentes/:id", PlanningController.quitarResidenteDePlan);

// ─────────────────────────────────────────────
// ASIGNACIONES DE PLAN A AUXILIAR POR TURNO
// ─────────────────────────────────────────────

router.get("/asignaciones", PlanningController.listarAsignacionesTurno);
router.post("/asignaciones", PlanningController.crearAsignacionTurno);

// ─────────────────────────────────────────────
// REGISTROS DIARIOS
// ─────────────────────────────────────────────

router.get("/registros", PlanningController.listarRegistros);
router.post("/registros", PlanningController.crearRegistro);
router.delete("/registros/:id", PlanningController.eliminarRegistro);

module.exports = router;