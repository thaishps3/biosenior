// ============================================================
// ARCHIVO: api.js
// Cliente centralizado para llamadas HTTP al backend.
//
// Qué hace:
// - Define la URL base de la API.
// - Centraliza GET, POST, PUT y DELETE.
// - Expone funciones por módulo: Residentes, Usuarios,
//   Deposiciones, Planning y Siesta.
// - Evita repetir fetch() en cada archivo del frontend.
// ============================================================

const API_URL = `${window.location.origin}/api`;

// ============================================================
// BLOQUE: Función auxiliar para construir query params
//
// Qué hace:
// - Recibe un objeto con filtros.
// - Elimina valores vacíos, null o undefined.
// - Devuelve una cadena tipo:
//   ?id_plan=1&turno=Tarde
// - Sirve para filtrar Planning por plan y turno.
// ============================================================

function construirQueryParams(filtros = {}) {
  const params = new URLSearchParams();

  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== "") {
      params.append(clave, valor);
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

// ============================================================
// BLOQUE: Peticiones HTTP base
//
// Qué hace:
// - Envuelve fetch() para cada método HTTP.
// - Convierte la respuesta a JSON.
// - Lanza errores con mensajes enviados por el backend.
// ============================================================

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

// ============================================================
// BLOQUE: API pública del frontend
//
// Qué hace:
// - Agrupa las funciones disponibles para los demás scripts.
// - Cada módulo usa estas funciones en vez de llamar fetch()
//   directamente.
// ============================================================

const api = {
  // ============================================================
  // BLOQUE: Residentes
  //
  // Qué hace:
  // - Gestiona residentes activos/inactivos.
  // - Usado por BioSenior, Admin, Planning y Siesta.
  // ============================================================

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

  // ============================================================
  // BLOQUE: Usuarios
  //
  // Qué hace:
  // - Gestiona auxiliares/admins.
  // - Permite login y mantenimiento de usuarios.
  // ============================================================

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

  // ============================================================
  // BLOQUE: Deposiciones / BioSenior
  //
  // Qué hace:
  // - Gestiona registros de deposiciones.
  // - Consulta tipos y alertas.
  // ============================================================

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

  // ============================================================
  // BLOQUE: Planning - planes
  //
  // Qué hace:
  // - Obtiene los planes activos.
  // - Actualmente deben existir A, B, C, D y Alterno.
  // ============================================================

  obtenerPlanningPlanes() {
    return apiGet("/planning/planes");
  },

  // ============================================================
  // BLOQUE: Planning - residentes por plan y turno
  //
  // Qué hace:
  // - Obtiene residentes asignados al Planning.
  // - Puede traer todos o filtrar por:
  //   id_plan
  //   turno
  // - Ejemplo:
  //   api.obtenerPlanningPlanResidentes({ id_plan: 1, turno: "Tarde" })
  // ============================================================

  obtenerPlanningPlanResidentes(filtros = {}) {
    const queryParams = construirQueryParams(filtros);
    return apiGet(`/planning/plan-residentes${queryParams}`);
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

  // ============================================================
  // BLOQUE: Planning - asignación de planes a auxiliares
  //
  // Qué hace:
  // - Gestiona qué auxiliar tiene qué plan en una fecha y turno.
  // - No asigna residentes individuales.
  // ============================================================

  obtenerPlanningAsignaciones() {
    return apiGet("/planning/asignaciones");
  },

  crearPlanningAsignacion(datos) {
    return apiPost("/planning/asignaciones", datos);
  },

  // ============================================================
  // BLOQUE: Planning - registros diarios
  //
  // Qué hace:
  // - Guarda y consulta residentes atendidos.
  // - El registro depende de fecha, turno, plan y residente.
  // ============================================================

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

  // ============================================================
  // BLOQUE: Siesta
  //
  // Qué hace:
  // - Gestiona el módulo Siesta de forma separada al Planning.
  // - Planning ya no debe usar acción "siesta".
  // ============================================================

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
  }
};