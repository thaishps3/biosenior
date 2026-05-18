const express = require("express");
const router = express.Router();

const ResidenteController = require("../controllers/residente.controller");

router.get("/", ResidenteController.listarResidentes);

module.exports = router;