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
        const nuevaDeposicion = await DeposicionModel.crearDeposicion(req.body);
        res.status(201).json(nuevaDeposicion);
    } catch (error) {
        console.error("Error al crear deposición:", error);
        res.status(500).json({
            mensaje: "Error al crear deposición"
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
    listarAlertas,
    listarTipos
};