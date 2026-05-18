const express = require("express");
const router = express.Router();

const UsuarioController = require("../controllers/usuario.controller");

router.get("/", UsuarioController.listarUsuarios);
router.post("/", UsuarioController.crearUsuario);
router.put("/:id", UsuarioController.actualizarUsuario);
router.delete("/:id", UsuarioController.eliminarUsuario);
router.post("/login", UsuarioController.loginUsuario);

module.exports = router;