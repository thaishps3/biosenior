const API_URL = `${window.location.origin}/api`;

async function apiGet(ruta) {
    const respuesta = await fetch(`${API_URL}${ruta}`);

    const data = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(data.mensaje || `Error GET ${ruta}`);
    }

    return data;
}

async function apiPost(ruta, datos) {
    const respuesta = await fetch(`${API_URL}${ruta}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(datos)
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(data.mensaje || `Error POST ${ruta}`);
    }

    return data;
}

async function apiPut(ruta, datos) {
    const respuesta = await fetch(`${API_URL}${ruta}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(datos)
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(data.mensaje || `Error PUT ${ruta}`);
    }

    return data;
}

async function apiDelete(ruta) {
    const respuesta = await fetch(`${API_URL}${ruta}`, {
        method: "DELETE"
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(data.mensaje || `Error DELETE ${ruta}`);
    }

    return data;
}

const api = {
    // Residentes
    obtenerResidentes() {
        return apiGet("/residentes");
    },

    obtenerResidente(id) {
        return apiGet(`/residentes/${id}`);
    },

    crearResidente(datos) {
        return apiPost("/residentes", datos);
    },

    editarResidente(id, datos) {
        return apiPut(`/residentes/${id}`, datos);
    },

    eliminarResidente(id) {
        return apiDelete(`/residentes/${id}`);
    },

    // Usuarios
    obtenerUsuarios() {
        return apiGet("/usuarios");
    },

    crearUsuario(datos) {
        return apiPost("/usuarios", datos);
    },

    editarUsuario(id, datos) {
        return apiPut(`/usuarios/${id}`, datos);
    },

    eliminarUsuario(id) {
        return apiDelete(`/usuarios/${id}`);
    },

    reactivarUsuario(id) {
    return apiPut(`/usuarios/${id}`, { activo: true });
},

    login(datos) {
        return apiPost("/usuarios/login", datos);
    },

    // Deposiciones
    obtenerDeposiciones() {
        return apiGet("/deposiciones");
    },

    crearDeposicion(datos) {
        return apiPost("/deposiciones", datos);
    },

eliminarDeposicion(id) {
    return apiDelete(`/deposiciones/${id}`);
},

    obtenerTiposDeposicion() {
        return apiGet("/deposiciones/tipos");
    },

    obtenerAlertasDeposiciones() {
        return apiGet("/deposiciones/alertas");
    },


// Planning
obtenerPlanningPlanes() {
    return apiGet("/planning/planes");
},

obtenerPlanningPlanResidentes() {
    return apiGet("/planning/plan-residentes");
},

asignarResidenteAPlan(datos) {
    return apiPost("/planning/plan-residentes", datos);
},

editarResidentePlan(id, datos) {
    return apiPut(`/planning/plan-residentes/${id}`, datos);
},

quitarResidenteDePlan(id) {
    return apiDelete(`/planning/plan-residentes/${id}`);
},

obtenerPlanningAsignaciones() {
    return apiGet("/planning/asignaciones");
},

crearPlanningAsignacion(datos) {
    return apiPost("/planning/asignaciones", datos);
},

obtenerPlanningRegistros() {
    return apiGet("/planning/registros");
},

crearPlanningRegistro(datos) {
    return apiPost("/planning/registros", datos);
},

eliminarPlanningRegistro(id) {
    return apiDelete(`/planning/registros/${id}`);
},

editarPlanningRegistro(id, datos) {
    return apiPut(`/planning/registros/${id}`, datos);
},

// Siesta
obtenerSiestaResidentes() {
    return apiGet("/siesta/residentes");
},

agregarSiestaResidente(datos) {
    return apiPost("/siesta/residentes", datos);
},

quitarSiestaResidente(id) {
    return apiDelete(`/siesta/residentes/${id}`);
},

obtenerSiestaRegistrosHoy() {
    return apiGet("/siesta/registros/hoy");
},

acostarSiestaResidente(datos) {
    return apiPost("/siesta/acostar", datos);
},

levantarSiestaResidente(id, datos) {
    return apiPut(`/siesta/levantar/${id}`, datos);
},

cancelarSiestaRegistro(id) {
    return apiPut(`/siesta/cancelar/${id}`, {});
},
};



