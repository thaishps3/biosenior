const DeposicionModel = require("../models/deposicion.model");

async function listarDeposiciones(req, res) {
    try {
        const deposiciones = await DeposicionModel.obtenerTodas();
        res.json(deposiciones);
    } catch (error) {
        console.error("Error al listar deposiciones:", error);
        res.status(500).json({
            mensaje: "Error al obtener deposiciones"
        });
    }
}

async function crearDeposicion(req, res) {
    try {
        const {
            id_residente,
            id_tipo,
            miccion,
            turno
        } = req.body;

        if (!id_residente || !id_tipo) {
            return res.status(400).json({
                mensaje: "Residente y tipo de deposición son obligatorios"
            });
        }

        if (!miccion || !turno) {
            return res.status(400).json({
                mensaje: "Micción y turno son obligatorios"
            });
        }

        const nuevaDeposicion = await DeposicionModel.crearDeposicion(req.body);
        res.status(201).json(nuevaDeposicion);
    } catch (error) {
        console.error("Error al crear deposición:", error);
        res.status(500).json({
            mensaje: "Error al crear deposición"
        });
    }
}

async function eliminarDeposicion(req, res) {
    try {
        const registroEliminado = await DeposicionModel.eliminarDeposicion(req.params.id);

        if (!registroEliminado) {
            return res.status(404).json({
                mensaje: "Registro no encontrado"
            });
        }

        res.json({
            mensaje: "Registro eliminado correctamente",
            registro: registroEliminado
        });
    } catch (error) {
        console.error("Error al eliminar deposición:", error);
        res.status(500).json({
            mensaje: "Error al eliminar deposición"
        });
    }
}

async function listarAlertas(req, res) {
    try {
        const alertas = await DeposicionModel.obtenerAlertas();
        res.json(alertas);
    } catch (error) {
        console.error("Error al obtener alertas:", error);
        res.status(500).json({
            mensaje: "Error al obtener alertas"
        });
    }
}

async function listarTipos(req, res) {
    try {
        const tipos = await DeposicionModel.obtenerTipos();
        res.json(tipos);
    } catch (error) {
        console.error("Error al obtener tipos de deposición:", error);
        res.status(500).json({
            mensaje: "Error al obtener tipos de deposición"
        });
    }
}

module.exports = {
    listarDeposiciones,
    crearDeposicion,
    eliminarDeposicion,
    listarAlertas,
    listarTipos
};