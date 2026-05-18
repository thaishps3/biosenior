const UsuarioModel = require("../models/usuario.model");

async function listarUsuarios(req, res) {
    try {
        const usuarios = await UsuarioModel.obtenerTodos();
        res.json(usuarios);
    } catch (error) {
        console.error("Error al listar usuarios:", error);
        res.status(500).json({
            mensaje: "Error al obtener usuarios"
        });
    }
}

async function crearUsuario(req, res) {
    try {
        if (!req.body.nombre) {
            return res.status(400).json({
                mensaje: "El nombre del usuario es obligatorio"
            });
        }

        if (!req.body.rol) {
            return res.status(400).json({
                mensaje: "El rol del usuario es obligatorio"
            });
        }

        const nuevoUsuario = await UsuarioModel.crear(req.body);
        res.status(201).json(nuevoUsuario);
    } catch (error) {
        console.error("Error al crear usuario:", error);
        res.status(500).json({
            mensaje: "Error al crear usuario"
        });
    }
}

async function actualizarUsuario(req, res) {
    try {
        const usuarioActualizado = await UsuarioModel.actualizar(
            req.params.id,
            req.body
        );

        if (!usuarioActualizado) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado"
            });
        }

        res.json(usuarioActualizado);
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        res.status(500).json({
            mensaje: "Error al actualizar usuario"
        });
    }
}

async function eliminarUsuario(req, res) {
    try {
        const usuarioEliminado = await UsuarioModel.eliminar(req.params.id);

        if (!usuarioEliminado) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado"
            });
        }

        res.json({
            mensaje: "Usuario desactivado correctamente",
            usuario: usuarioEliminado
        });
    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        res.status(500).json({
            mensaje: "Error al eliminar usuario"
        });
    }
}

async function loginUsuario(req, res) {
    try {
        const { nombre, pin } = req.body;

        if (!nombre || !pin) {
            return res.status(400).json({
                mensaje: "Nombre y PIN son obligatorios"
            });
        }

        const usuario = await UsuarioModel.loginPorPin(nombre, pin);

        if (!usuario) {
            return res.status(401).json({
                mensaje: "Credenciales incorrectas"
            });
        }

        res.json({
            mensaje: "Login correcto",
            usuario
        });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({
            mensaje: "Error al iniciar sesión"
        });
    }
}

module.exports = {
    listarUsuarios,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    loginUsuario
};