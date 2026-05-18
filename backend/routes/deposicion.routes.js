const express = require("express");
const router = express.Router();

const DeposicionController = require("../controllers/deposicion.controller");

router.get("/", DeposicionController.listarDeposiciones);
router.post("/", DeposicionController.crearDeposicion);
router.delete("/:id", DeposicionController.eliminarDeposicion);

router.get("/alertas", DeposicionController.listarAlertas);
router.get("/tipos", DeposicionController.listarTipos);

module.exports = router;