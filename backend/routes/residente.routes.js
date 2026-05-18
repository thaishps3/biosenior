const express = require("express");
const router = express.Router();

const ResidenteController = require("../controllers/residente.controller");

router.get("/", ResidenteController.listarResidentes);
router.get("/:id", ResidenteController.obtenerResidente);
router.post("/", ResidenteController.crearResidente);
router.put("/:id", ResidenteController.actualizarResidente);
router.delete("/:id", ResidenteController.eliminarResidente);

module.exports = router;