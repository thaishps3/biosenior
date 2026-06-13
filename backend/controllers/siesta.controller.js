const SiestaModel = require("../models/siesta.model");

// ============================================================
// RESIDENTES CONFIGURADOS PARA SIESTA
// ============================================================

async function listarResidentesSiesta(req, res) {
    try {
        const residentes = await SiestaModel.obtenerResidentesSiesta();
        res.json(residentes);
    } catch (error) {
        console.error("Error al obtener residentes de siesta:", error);
        res.status(500).json({
            mensaje: "Error al obtener residentes de siesta"
        });
    }
}

async function agregarResidenteSiesta(req, res) {
    try {
        const { id_residente } = req.body;

        if (!id_residente) {
            return res.status(400).json({
                mensaje: "El residente es obligatorio"
            });
        }

        const residente = await SiestaModel.agregarResidenteSiesta(req.body);
        res.status(201).json(residente);
    } catch (error) {
        console.error("Error al agregar residente a siesta:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                mensaje: "Este residente ya está configurado para siesta"
            });
        }

        res.status(500).json({
            mensaje: "Error al agregar residente a siesta"
        });
    }
}

async function quitarResidenteSiesta(req, res) {
    try {
        const residente = await SiestaModel.quitarResidenteSiesta(req.params.id);

        if (!residente) {
            return res.status(404).json({
                mensaje: "Residente de siesta no encontrado"
            });
        }

        res.json({
            mensaje: "Residente retirado de siesta correctamente",
            residente
        });
    } catch (error) {
        console.error("Error al retirar residente de siesta:", error);
        res.status(500).json({
            mensaje: "Error al retirar residente de siesta"
        });
    }
}

// ============================================================
// REGISTROS DIARIOS DE SIESTA
// ============================================================

async function listarRegistrosHoy(req, res) {
    try {
        const registros = await SiestaModel.obtenerRegistrosHoy();
        res.json(registros);
    } catch (error) {
        console.error("Error al obtener registros de siesta:", error);
        res.status(500).json({
            mensaje: "Error al obtener registros de siesta"
        });
    }
}

async function acostarResidente(req, res) {
    try {
        const { id_residente } = req.body;

        if (!id_residente) {
            return res.status(400).json({
                mensaje: "El residente es obligatorio"
            });
        }

        const registro = await SiestaModel.acostarResidente(req.body);
        res.status(201).json(registro);
    } catch (error) {
        console.error("Error al acostar residente:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                mensaje: "Este residente ya fue acostado hoy"
            });
        }

        res.status(500).json({
            mensaje: "Error al acostar residente"
        });
    }
}

async function levantarResidente(req, res) {
    try {
        const registro = await SiestaModel.levantarResidente(req.params.id, req.body);

        if (!registro) {
            return res.status(404).json({
                mensaje: "Registro de siesta no encontrado"
            });
        }

        res.json(registro);
    } catch (error) {
        console.error("Error al levantar residente:", error);
        res.status(500).json({
            mensaje: "Error al levantar residente"
        });
    }
}

async function cancelarRegistro(req, res) {
    try {
        const registro = await SiestaModel.cancelarRegistro(req.params.id);

        if (!registro) {
            return res.status(404).json({
                mensaje: "Registro de siesta no encontrado"
            });
        }

        res.json({
            mensaje: "Registro cancelado correctamente",
            registro
        });
    } catch (error) {
        console.error("Error al cancelar registro de siesta:", error);
        res.status(500).json({
            mensaje: "Error al cancelar registro de siesta"
        });
    }
}

module.exports = {
    listarResidentesSiesta,
    agregarResidenteSiesta,
    quitarResidenteSiesta,
    listarRegistrosHoy,
    acostarResidente,
    levantarResidente,
    cancelarRegistro
};