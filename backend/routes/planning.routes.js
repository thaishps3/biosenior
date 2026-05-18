const express = require("express");
const router = express.Router();

const PlanningController = require("../controllers/planning.controller");

router.get("/auxiliares", PlanningController.listarAuxiliares);
router.get("/tareas", PlanningController.listarTareas);
router.get("/", PlanningController.listarPlanning);
router.post("/", PlanningController.crearAsignacion);

module.exports = router;