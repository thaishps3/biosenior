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

module.exports = {
    listarResidentes
};