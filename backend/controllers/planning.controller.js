const PlanningModel = require("../models/planning.model");

async function listarAuxiliares(req, res) {
    try {
        const auxiliares = await PlanningModel.obtenerAuxiliares();
        res.json(auxiliares);
    } catch (error) {
        console.error("Error al obtener auxiliares:", error);
        res.status(500).json({
            mensaje: "Error al obtener auxiliares"
        });
    }
}

async function listarTareas(req, res) {
    try {
        const tareas = await PlanningModel.obtenerTareas();
        res.json(tareas);
    } catch (error) {
        console.error("Error al obtener tareas:", error);
        res.status(500).json({
            mensaje: "Error al obtener tareas"
        });
    }
}

async function listarPlanning(req, res) {
    try {
        const planning = await PlanningModel.obtenerPlanning();
        res.json(planning);
    } catch (error) {
        console.error("Error al obtener planning:", error);
        res.status(500).json({
            mensaje: "Error al obtener planning"
        });
    }
}

async function crearAsignacion(req, res) {
    try {
        const asignacion = await PlanningModel.crearAsignacion(req.body);
        res.status(201).json(asignacion);
    } catch (error) {
        console.error("Error al crear asignación:", error);
        res.status(500).json({
            mensaje: "Error al crear asignación"
        });
    }
}

module.exports = {
    listarAuxiliares,
    listarTareas,
    listarPlanning,
    crearAsignacion
};