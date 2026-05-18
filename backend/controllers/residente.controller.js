const ResidenteModel = require("../models/residente.model");

async function listarResidentes(req, res) {
    try {
        const residentes = await ResidenteModel.obtenerTodos();
        res.json(residentes);
    } catch (error) {
        console.error("Error al listar residentes:", error);
        res.status(500).json({
            mensaje: "Error al obtener residentes"
        });
    }
}

async function obtenerResidente(req, res) {
    try {
        const residente = await ResidenteModel.obtenerPorId(req.params.id);

        if (!residente) {
            return res.status(404).json({
                mensaje: "Residente no encontrado"
            });
        }

        res.json(residente);
    } catch (error) {
        console.error("Error al obtener residente:", error);
        res.status(500).json({
            mensaje: "Error al obtener residente"
        });
    }
}

async function crearResidente(req, res) {
    try {
        if (!req.body.nombre) {
            return res.status(400).json({
                mensaje: "El nombre del residente es obligatorio"
            });
        }

        const nuevoResidente = await ResidenteModel.crear(req.body);
        res.status(201).json(nuevoResidente);
    } catch (error) {
        console.error("Error al crear residente:", error);
        res.status(500).json({
            mensaje: "Error al crear residente"
        });
    }
}

async function actualizarResidente(req, res) {
    try {
        const residenteActualizado = await ResidenteModel.actualizar(
            req.params.id,
            req.body
        );

        if (!residenteActualizado) {
            return res.status(404).json({
                mensaje: "Residente no encontrado"
            });
        }

        res.json(residenteActualizado);
    } catch (error) {
        console.error("Error al actualizar residente:", error);
        res.status(500).json({
            mensaje: "Error al actualizar residente"
        });
    }
}

async function eliminarResidente(req, res) {
    try {
        const residenteEliminado = await ResidenteModel.eliminar(req.params.id);

        if (!residenteEliminado) {
            return res.status(404).json({
                mensaje: "Residente no encontrado"
            });
        }

        res.json({
            mensaje: "Residente desactivado correctamente",
            residente: residenteEliminado
        });
    } catch (error) {
        console.error("Error al eliminar residente:", error);
        res.status(500).json({
            mensaje: "Error al eliminar residente"
        });
    }
}

module.exports = {
    listarResidentes,
    obtenerResidente,
    crearResidente,
    actualizarResidente,
    eliminarResidente
};