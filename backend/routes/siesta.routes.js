const express = require("express");
const router = express.Router();

const SiestaController = require("../controllers/siesta.controller");

// Residentes configurados para siesta
router.get("/residentes", SiestaController.listarResidentesSiesta);
router.post("/residentes", SiestaController.agregarResidenteSiesta);
router.delete("/residentes/:id", SiestaController.quitarResidenteSiesta);

// Registros diarios
router.get("/registros/hoy", SiestaController.listarRegistrosHoy);
router.post("/acostar", SiestaController.acostarResidente);
router.put("/levantar/:id", SiestaController.levantarResidente);
router.put("/cancelar/:id", SiestaController.cancelarRegistro);

module.exports = router;