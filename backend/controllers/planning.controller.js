const PlanningModel = require("../models/planning.model");

// ─────────────────────────────────────────────
// PLANES
// ─────────────────────────────────────────────

async function listarPlanes(req, res) {
    try {
        const planes = await PlanningModel.obtenerPlanes();
        res.json(planes);
    } catch (error) {
        console.error("Error al obtener planes:", error);
        res.status(500).json({
            mensaje: "Error al obtener planes"
        });
    }
}

// ─────────────────────────────────────────────
// RESIDENTES POR PLAN
// ─────────────────────────────────────────────

async function listarPlanResidentes(req, res) {
    try {
        const residentes = await PlanningModel.obtenerPlanResidentes();
        res.json(residentes);
    } catch (error) {
        console.error("Error al obtener residentes del planning:", error);
        res.status(500).json({
            mensaje: "Error al obtener residentes del planning"
        });
    }
}

async function asignarResidenteAPlan(req, res) {
    try {
        const { id_plan, id_residente } = req.body;

        if (!id_plan || !id_residente) {
            return res.status(400).json({
                mensaje: "Plan y residente son obligatorios"
            });
        }

        const asignacion = await PlanningModel.asignarResidenteAPlan(req.body);
        res.status(201).json(asignacion);
    } catch (error) {
        console.error("Error al asignar residente al plan:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                mensaje: "Este residente ya está asignado a ese plan"
            });
        }

        res.status(500).json({
            mensaje: "Error al asignar residente al plan"
        });
    }
}

async function actualizarPlanResidente(req, res) {
    try {
        const asignacion = await PlanningModel.actualizarPlanResidente(
            req.params.id,
            req.body
        );

        if (!asignacion) {
            return res.status(404).json({
                mensaje: "Asignación de residente no encontrada"
            });
        }

        res.json(asignacion);
    } catch (error) {
        console.error("Error al actualizar residente del plan:", error);
        res.status(500).json({
            mensaje: "Error al actualizar residente del plan"
        });
    }
}

async function quitarResidenteDePlan(req, res) {
    try {
        const asignacion = await PlanningModel.quitarResidenteDePlan(req.params.id);

        if (!asignacion) {
            return res.status(404).json({
                mensaje: "Asignación de residente no encontrada"
            });
        }

        res.json({
            mensaje: "Residente retirado del plan correctamente",
            asignacion
        });
    } catch (error) {
        console.error("Error al retirar residente del plan:", error);
        res.status(500).json({
            mensaje: "Error al retirar residente del plan"
        });
    }
}

// ─────────────────────────────────────────────
// ASIGNACIONES DE PLAN A AUXILIAR POR TURNO
// ─────────────────────────────────────────────

async function listarAsignacionesTurno(req, res) {
    try {
        const asignaciones = await PlanningModel.obtenerAsignacionesTurno();
        res.json(asignaciones);
    } catch (error) {
        console.error("Error al obtener asignaciones de turno:", error);
        res.status(500).json({
            mensaje: "Error al obtener asignaciones de turno"
        });
    }
}

async function crearAsignacionTurno(req, res) {
    try {
        const { id_plan, id_usuario, turno } = req.body;

        if (!id_plan || !id_usuario || !turno) {
            return res.status(400).json({
                mensaje: "Plan, usuario y turno son obligatorios"
            });
        }

        const asignacion = await PlanningModel.crearAsignacionTurno(req.body);
        res.status(201).json(asignacion);
    } catch (error) {
        console.error("Error al crear asignación de turno:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                mensaje: "Ya existe una asignación para ese plan, fecha y turno"
            });
        }

        res.status(500).json({
            mensaje: "Error al crear asignación de turno"
        });
    }
}

// ─────────────────────────────────────────────
// REGISTROS DIARIOS
// ─────────────────────────────────────────────

async function listarRegistros(req, res) {
    try {
        const registros = await PlanningModel.obtenerRegistros();
        res.json(registros);
    } catch (error) {
        console.error("Error al obtener registros de planning:", error);
        res.status(500).json({
            mensaje: "Error al obtener registros de planning"
        });
    }
}

async function crearRegistro(req, res) {
    try {
        const {
            id_plan,
            id_residente,
            id_usuario,
            turno,
            accion
        } = req.body;

        if (!id_plan || !id_residente || !id_usuario || !turno || !accion) {
            return res.status(400).json({
                mensaje: "Plan, residente, usuario, turno y acción son obligatorios"
            });
        }

        const registro = await PlanningModel.crearRegistro(req.body);
        res.status(201).json(registro);
    } catch (error) {
        console.error("Error al crear registro de planning:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                mensaje: "Este residente ya fue registrado en ese turno"
            });
        }

        res.status(500).json({
            mensaje: "Error al crear registro de planning"
        });
    }
}

async function eliminarRegistro(req, res) {
    try {
        const registro = await PlanningModel.eliminarRegistro(req.params.id);

        if (!registro) {
            return res.status(404).json({
                mensaje: "Registro no encontrado"
            });
        }

        res.json({
            mensaje: "Registro eliminado correctamente",
            registro
        });
    } catch (error) {
        console.error("Error al eliminar registro de planning:", error);
        res.status(500).json({
            mensaje: "Error al eliminar registro de planning"
        });
    }
}

module.exports = {
    listarPlanes,
    listarPlanResidentes,
    asignarResidenteAPlan,
    actualizarPlanResidente,
    quitarResidenteDePlan,
    listarAsignacionesTurno,
    crearAsignacionTurno,
    listarRegistros,
    crearRegistro,
    eliminarRegistro
};