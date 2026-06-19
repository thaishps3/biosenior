// ============================================================
// ARCHIVO: planning/js/script.js
// Frontend principal del módulo Planning.
//
// Qué hace:
// - Carga planes, residentes, asignaciones y registros desde PostgreSQL.
// - Permite al admin asignar residentes a plan + turno.
// - Permite al auxiliar marcar residentes como atendidos.
// - Muestra pendientes, atendidos e historial del día.
// - Mantiene Siesta fuera del Planning.
// ============================================================


// ============================================================
// BLOQUE: Estado global del Planning
//
// Qué hace:
// - Guarda el plan actual seleccionado.
// - Guarda el turno actual seleccionado.
// - Guarda datos cargados desde API.
// - Define fecha actual para filtrar registros del día.
// ============================================================

let currentPlan = "A";
let currentTurno = "Mañana";
let viewAllMode = false;

let planes = [];
let residentes = [];
let planResidentes = [];
let registros = [];

const fechaHoy = new Date().toISOString().split("T")[0];

// ============================================================
// BLOQUE: Fecha compacta para cabecera
//
// Qué hace:
// - Genera una fecha corta para ahorrar espacio en móvil.
// - Formato esperado: Dom 14/06/26.
// - Mantiene la interfaz más limpia en cabecera.
// ============================================================

const fechaActual = new Date();

const dateFull = fechaActual
  .toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  })
  .replace(".", "");


// ============================================================
// BLOQUE: Helpers generales
//
// Qué hace:
// - Obtiene sesión actual.
// - Comprueba si el usuario es admin.
// - Limpia texto antes de insertarlo en HTML.
// - Define la acción operativa según turno.
// ============================================================

function sesion() {
  return auth?.sesion || null;
}

function esAdmin() {
  return sesion()?.rol === "admin";
}

function escaparTexto(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function accionPorTurno(turno) {
  if (turno === "Mañana") return "levantar";
  if (turno === "Tarde") return "atender";
  return "acostar";
}

function nombrePlanVisible(plan) {
  if (!plan) return "";
  return plan.letra === "ALT" ? "Alterno" : `Plan ${plan.letra}`;
}

function nombrePlanVisiblePorLetra(letra) {
  if (!letra) return "";
  return letra === "ALT" ? "Alterno" : `Plan ${letra}`;
}

function etiquetaPlanActual() {
  const plan = getPlanActual();
  return nombrePlanVisible(plan) || `Plan ${currentPlan}`;
}

function getPlanActual() {
  return planes.find((p) => p.letra === currentPlan);
}


// ============================================================
// BLOQUE: Filtro de residentes del plan actual
//
// Qué hace:
// - Devuelve solo residentes del plan seleccionado.
// - También filtra por turno seleccionado.
// - No renderiza nada.
// - No debe llamar a render(), porque causaría bucle infinito.
// ============================================================

function residentesDelPlanActual() {
  return planResidentes.filter(
    (r) => r.plan_letra === currentPlan && r.turno === currentTurno
  );
}

// ============================================================
// BLOQUE: Alarma de residentes pendientes por turno
//
// Qué hace:
// - Activa alarma solo para el turno Tarde desde las 21:45.
// - Auxiliar: muestra pendientes del plan actual.
// - Admin: muestra pendientes agrupados por plan.
// - Permite al admin identificar qué plan necesita seguimiento.
// - No modifica datos ni crea registros.
// ============================================================

function actualizarAlarmaPendientes() {
  const alarma = document.getElementById("planningPendingAlarm");
  if (!alarma) return;

  //const ahora = new Date();
  //const horaActual = ahora.getHours();
  //const minutoActual = ahora.getMinutes();

  //const yaEsHoraAlarmaTarde =
  //horaActual > 21 || (horaActual === 21 && minutoActual >= 45);
  const yaEsHoraAlarmaTarde = esHoraAlarmaTardeActiva();

  if (!yaEsHoraAlarmaTarde) {
    alarma.innerHTML = "";
    alarma.classList.remove("active");
    return;
  }

  // ============================================================
  // CASO ADMIN:
  // Revisa todos los planes del turno Tarde, sin depender del plan
  // seleccionado en pantalla.
  // ============================================================

  if (esAdmin()) {
    const asignacionesTarde = planResidentes.filter(
      (r) => r.turno === "Tarde"
    );

    const pendientesTarde = asignacionesTarde.filter(
      (r) => !registroDelResidentePorDatos(r.id_residente, "Tarde")
    );

    if (!pendientesTarde.length) {
      alarma.innerHTML = "";
      alarma.classList.remove("active");
      return;
    }

    const pendientesPorPlan = {};

    pendientesTarde.forEach((r) => {
      const plan = r.plan_letra || "SIN_PLAN";

      if (!pendientesPorPlan[plan]) {
        pendientesPorPlan[plan] = 0;
      }

      pendientesPorPlan[plan]++;
    });

    const ordenPlanes = ["A", "B", "C", "D", "ALT"];

    const detallePlanes = ordenPlanes
      .filter((plan) => pendientesPorPlan[plan])
      .map((plan) => {
        const nombreVisible = plan === "ALT" ? "Alterno" : `Plan ${plan}`;
        const total = pendientesPorPlan[plan];

        return `${nombreVisible}: ${total}`;
      })
      .join(" · ");

    alarma.classList.add("active");

    alarma.innerHTML = `
      ⚠️ Turno Tarde pendiente — ${escaparTexto(detallePlanes)}
    `;

    return;
  }

  // ============================================================
  // CASO AUXILIAR:
  // Revisa solo el plan actual del turno Tarde.
  // ============================================================

  const esTurnoTarde = currentTurno === "Tarde";

  const residentesPlan = residentesDelPlanActual();

  const pendientes = residentesPlan.filter(
    (r) => !registroDelResidente(r.id_residente)
  );

  if (!esTurnoTarde || pendientes.length === 0) {
    alarma.innerHTML = "";
    alarma.classList.remove("active");
    return;
  }

  alarma.classList.add("active");

  alarma.innerHTML = `
    ⚠️ Quedan ${pendientes.length} residente${pendientes.length === 1 ? "" : "s"} 
    por atender en ${escaparTexto(etiquetaPlanActual())} · Tarde
  `;
}
// ============================================================
// BLOQUE: Helpers de registros diarios
//
// Qué hace:
// - Normaliza la fecha recibida desde PostgreSQL.
// - Busca si un residente ya fue atendido hoy en el turno actual.
// - Evita confundir registros de Mañana, Tarde y Noche.
// ============================================================

function fechaRegistro(r) {
  if (r.fecha_iso) return r.fecha_iso;
  if (r.fecha) return String(r.fecha).substring(0, 10);
  return "";
}

function registroDelResidente(idResidente) {
  return registros.find(
    (r) =>
      Number(r.id_residente) === Number(idResidente) &&
      fechaRegistro(r) === fechaHoy &&
      r.turno === currentTurno
  );
}

// ============================================================
// BLOQUE: Buscar registro del residente en el plan/turno actual
//
// Qué hace:
// - Comprueba si un residente ya fue atendido hoy.
// - Usa el turno actual seleccionado.
// - Se usa para separar pendientes y atendidos.
// ============================================================

function registroDelResidente(idResidente) {
  return registros.find(
    (r) =>
      Number(r.id_residente) === Number(idResidente) &&
      fechaRegistro(r) === fechaHoy &&
      r.turno === currentTurno
  );
}


// ============================================================
// BLOQUE: Buscar registro por residente y turno concreto
//
// Qué hace:
// - Comprueba si un residente ya fue atendido hoy en un turno específico.
// - No depende del turno actual seleccionado.
// - Se usa para la alarma general del administrador.
// ============================================================

function registroDelResidentePorDatos(idResidente, turno) {
  return registros.find(
    (r) =>
      Number(r.id_residente) === Number(idResidente) &&
      fechaRegistro(r) === fechaHoy &&
      r.turno === turno
  );
}

// ============================================================
// BLOQUE: Comprobar si la alarma de tarde está activa
//
// Qué hace:
// - Centraliza la regla horaria de la alarma.
// - Evita repetir la condición de 21:45 en varias funciones.
// - Se usa para la cabecera y para resaltar cards del admin.
// ============================================================

function esHoraAlarmaTardeActiva() {
  const ahora = new Date();
  const horaActual = ahora.getHours();
  const minutoActual = ahora.getMinutes();

  return horaActual > 21 || (horaActual === 21 && minutoActual >= 45);
}


// ============================================================
// BLOQUE: Comprobar residente pendiente en turno Tarde
//
// Qué hace:
// - Indica si un residente sigue pendiente en el turno Tarde.
// - Se usa para marcar en amarillo los cards del admin.
// ============================================================

function residentePendienteAlarmaTarde(idResidente) {
  return !registroDelResidentePorDatos(idResidente, "Tarde");
}
// ============================================================
// BLOQUE: Buscar registro por residente y turno concreto
//
// Qué hace:
// - Permite revisar registros sin depender del turno actual.
// - Se usa para la alarma general del administrador.
// - Mantiene la fecha actual como criterio obligatorio.
// ============================================================

function registroDelResidentePorDatos(idResidente, turno) {
  return registros.find(
    (r) =>
      Number(r.id_residente) === Number(idResidente) &&
      fechaRegistro(r) === fechaHoy &&
      r.turno === turno
  );
}

// ============================================================
// BLOQUE: Carga de datos desde API
//
// Qué hace:
// - Carga planes activos.
// - Carga residentes activos.
// - Carga residentes asignados al Planning.
// - Carga registros diarios.
// - Usa la API centralizada de frontend/js/api.js.
// ============================================================

async function cargarDatos() {
  const [planesApi, residentesApi, planResidentesApi, registrosApi] =
    await Promise.all([
      api.obtenerPlanningPlanes(),
      api.obtenerResidentes(),
      api.obtenerPlanningPlanResidentes(),
      api.obtenerPlanningRegistros()
    ]);

  planes = planesApi;
  residentes = residentesApi.filter((r) => r.activo !== false);
  planResidentes = planResidentesApi;
  registros = registrosApi;
}


// ============================================================
// BLOQUE: Preparación inicial de interfaz
//
// Qué hace:
// - Muestra fecha compacta.
// - Muestra usuario o rol de sesión.
// - Crea selector de turno.
// - Prepara formulario admin.
// - Aplica permisos según rol.
// ============================================================

function prepararInterfazPlanning() {
  const displayDate = document.getElementById("displayDate");

  if (displayDate) {
    displayDate.innerText = dateFull.charAt(0).toUpperCase() + dateFull.slice(1);
  }

  const s = sesion();

  const headerAuxiliar = document.getElementById("headerAuxiliar");

  if (headerAuxiliar) {
    headerAuxiliar.innerText = esAdmin()
      ? "Administrador"
      : s?.nombre || "Auxiliar";
  }

  crearSelectorTurnoSiNoExiste();
  prepararFormularioAsignacion();
  aplicarPermisosPorRol();

}
// ============================================================
// BLOQUE: Aplicar permisos y datos de sesión por rol
//
// Qué hace:
// - Muestra la sesión como badge debajo del título del módulo.
// - No crea el botón Salir, porque ahora está fijo en planning.html.
// - Oculta el bloque admin cuando el usuario no es administrador.
// - Oculta controles antiguos de cambio de usuario si existen.
// ============================================================

function aplicarPermisosPorRol() {
  const s = sesion();
  const info = document.getElementById("planSesionInfo");

  if (info && s) {
    info.innerHTML = `
      <span class="session-badge ${s.rol === "admin" ? "is-admin" : "is-aux"}">
        ${s.rol === "admin" ? "Administrador" : escaparTexto(s.nombre || "Auxiliar")}
      </span>
    `;
  }

  const adminBlock = document.querySelector(".collapsible-box");
  const historyBox = document.querySelector(".history-box");
  const reportButton = document.querySelector(".btn-report");
  const miHistorialBox = document.getElementById("miHistorialBoxWrapper");

  if (!esAdmin()) {
    if (adminBlock) adminBlock.style.display = "none";
    if (historyBox) historyBox.style.display = "none";
    if (reportButton) reportButton.style.display = "none";
    if (miHistorialBox) miHistorialBox.style.display = "block";
  } else {
    if (adminBlock) adminBlock.style.display = "block";
    if (historyBox) historyBox.style.display = "block";
    if (miHistorialBox) miHistorialBox.style.display = "none";

    // El reporte pertenece al Historial, por eso inicia oculto.
    if (reportButton) reportButton.style.display = "none";
  }
}


// ============================================================
// BLOQUE: Selector de turno
//
// Qué hace:
// - Crea selector Mañana/Tarde/Noche.
// - Lo coloca cerca de los botones de planes.
// - Refuerza visualmente la lógica: Turno + Plan.
// - Siesta no aparece porque queda fuera de Planning.
// ============================================================

function crearSelectorTurnoSiNoExiste() {
  if (document.getElementById("turnoSelect")) return;

  const tabs = document.querySelector(".tabs");
  if (!tabs) return;

  const contenedor = document.createElement("section");
  contenedor.className = "planning-context-bar";

  contenedor.innerHTML = `
    <label for="turnoSelect" class="planning-context-label">
      Turno
    </label>

    <select id="turnoSelect" class="turno-select">
      <option value="Mañana">Mañana</option>
      <option value="Tarde">Tarde</option>
      <option value="Noche">Noche</option>
    </select>
  `;

  tabs.parentNode.insertBefore(contenedor, tabs);

  const select = document.getElementById("turnoSelect");

  select.addEventListener("change", () => {
    currentTurno = select.value;
    resetForm();
    render();
  });
}

// ============================================================
// BLOQUE: Formulario admin de asignación
//
// Qué hace:
// - Crea los campos para asignar residente a plan + turno.
// - No usa campo Orden porque la prioridad operativa la define:
//   1. Residente de riesgo.
//   2. Criterio de la auxiliar durante el turno.
// ============================================================

function prepararFormularioAsignacion() {
  const formBox = document.querySelector(".form-box");
  if (!formBox) return;

  formBox.innerHTML = `
    <section class="admin-form-panel">
      <h4 class="admin-section-title">Añadir residente al plan</h4>

      <input type="hidden" id="editId" />

      <label>Residente</label>
      <select id="residenteSelect">
        <option value="">Seleccionar residente...</option>
      </select>

      <label>Pañal</label>
      <select id="pañal">
        <option value="-">Pañal — sin cambio programado</option>
        <option value="S">Talla S</option>
        <option value="M">Talla M</option>
        <option value="L">Talla L</option>
        <option value="XL">Talla XL</option>
      </select>

      <label>Observación</label>
      <textarea id="obs" placeholder="Indicaciones para la auxiliar"></textarea>

      <label class="checkline">
        <input type="checkbox" id="riesgo" />
        ⚠️ Residente de riesgo
      </label>

      <label class="checkline">
        <input type="checkbox" id="encamado" />
        🛏️ Residente encamado
      </label>

      <button type="button" onclick="guardarAsignacionPlan()">
        ASIGNAR AL PLAN
      </button>
    </section>
  `;
}

// ============================================================
// BLOQUE: Cargar select de residentes
//
// Qué hace:
// - Llena el select del formulario admin.
// - Solo muestra residentes activos.
// ============================================================

function cargarSelectResidentes() {
  const select = document.getElementById("residenteSelect");
  if (!select) return;

  select.innerHTML = `<option value="">Seleccionar residente...</option>`;

  residentes.forEach((r) => {
    const nombre = escaparTexto(r.nombre);
    const apellidos = r.apellidos ? ` ${escaparTexto(r.apellidos)}` : "";
    const hab = r.habitacion ? ` · Hab. ${escaparTexto(r.habitacion)}` : "";

    select.innerHTML += `
      <option value="${r.id_residente}">
        ${nombre}${apellidos}${hab}
      </option>
    `;
  });
}


// ============================================================
// BLOQUE: Cambio de plan
//
// Qué hace:
// - Cambia el plan actual.
// - Actualiza botones activos.
// - Refresca la vista usando el turno actual.
// ============================================================

function setPlan(plan) {
  currentPlan = plan;

  const label = document.getElementById("planLabelTop");
  if (label) {
    label.innerText = plan === "ALT" ? "Alterno" : plan;
  }

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.plan === plan);
  });

  resetForm();
  render();
}


// ============================================================
// BLOQUE: Render dinámico de botones de planes
//
// Qué hace:
// - Crea botones para los planes que vienen desde PostgreSQL.
// - Así Alterno aparece automáticamente si existe en la base.
// - Usa data-plan para evitar depender del texto visible.
// ============================================================

function renderBotonesPlanes() {
  const contenedor = document.querySelector(".tabs");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  planes.forEach((plan) => {
    const boton = document.createElement("button");

    boton.type = "button";
    boton.className = "tab-btn";
    boton.dataset.plan = plan.letra;
    boton.innerText = plan.letra === "ALT" ? "Alt" : plan.letra;

    boton.addEventListener("click", () => {
      setPlan(plan.letra);
    });

    if (plan.letra === currentPlan) {
      boton.classList.add("active");
    }

    contenedor.appendChild(boton);
  });
}


// ============================================================
// BLOQUE: Toggle de cajas desplegables
//
// Qué hace:
// - Abre/cierra secciones colapsables.
// - Si el admin abre "Asignar residentes al plan",
//   oculta historial y reporte para dejar solo gestión del plan.
// - Si el admin cierra el bloque, vuelve a mostrar supervisión.
// ============================================================

function toggleBox(id) {
  const el = document.getElementById(id);
  const arrow = document.getElementById(id + "-arrow");

  if (!el) return;

  el.classList.toggle("open");

  const estaAbierto = el.classList.contains("open");

  if (arrow) {
    arrow.innerText = estaAbierto ? "▲" : "▼";
  }

  if (esAdmin() && id === "historialBox") {
    gestionarModoHistorial(estaAbierto);
  }
  if (esAdmin() && id === "adminBox") {
    const historyBox = document.querySelector(".history-box");
    const reportButton = document.querySelector(".btn-report");
    const checklist = document.getElementById("checklist");

    if (historyBox) {
      historyBox.style.display = estaAbierto ? "none" : "block";
    }

    if (reportButton) {
      reportButton.style.display = estaAbierto ? "none" : "block";
    }

    if (checklist) {
      checklist.style.display = estaAbierto ? "none" : "block";
    }

    renderChecklist();
    renderEditList();
  }
}

// ============================================================
// BLOQUE: Modo revisión de Historial
//
// Qué hace:
// - Cuando el admin abre Historial, lo mueve debajo de los tabs A/B/C/D/Alt.
// - Oculta la vista principal del plan para revisar sin distracciones.
// - Oculta el bloque de asignación de residentes.
// - Al cerrar Historial, devuelve todo a su posición normal.
// ============================================================

let historialPlaceholder = null;

function gestionarModoHistorial(estaAbierto) {
  const historyBox = document.querySelector(".history-box");
  const tabs = document.querySelector(".tabs");
  const adminBlock = document.querySelector(".collapsible-box");
  const checklist = document.getElementById("checklist");
  const reportButton = document.querySelector(".btn-report");

  if (!historyBox) return;

  if (estaAbierto) {
    if (reportButton) {
      reportButton.style.display = "block";
    }
    if (!historialPlaceholder) {
      historialPlaceholder = document.createComment("posicion-original-historial");
      historyBox.parentNode.insertBefore(historialPlaceholder, historyBox);
    }

    if (tabs) {
      tabs.insertAdjacentElement("afterend", historyBox);
    }

    if (adminBlock) {
      adminBlock.style.display = "none";
    }

    if (checklist) {
      checklist.innerHTML = "";
      checklist.style.display = "none";
    }

    historyBox.classList.add("history-focus-mode");

    renderHistorial();

    setTimeout(() => {
      historyBox.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 80);

    return;
  }

  if (historialPlaceholder && historialPlaceholder.parentNode) {
    historialPlaceholder.parentNode.insertBefore(
      historyBox,
      historialPlaceholder.nextSibling
    );

    historialPlaceholder.remove();
    historialPlaceholder = null;
  }

  historyBox.classList.remove("history-focus-mode");

  if (adminBlock) {
    adminBlock.style.display = esAdmin() ? "block" : "none";
  }

  if (checklist) {
    checklist.style.display = "block";
  }
  if (reportButton) {
    reportButton.style.display = "none";
  }
  renderChecklist();
}
// ============================================================
// BLOQUE: Guardar asignación de residente a plan + turno
//
// Qué hace:
// - Admin asigna un residente al plan actual y turno actual.
// - Si edita, modifica datos operativos.
// - Si crea, envía id_plan + id_residente + turno.
// - El backend bloquea duplicados dentro del mismo turno.
// ============================================================

async function guardarAsignacionPlan() {
  if (!esAdmin()) {
    alert("Solo el administrador puede asignar residentes a un plan.");
    return;
  }

  const plan = getPlanActual();

  if (!plan) {
    alert("No se encontró el plan actual.");
    return;
  }

  const idAsignacion = document.getElementById("editId").value;
  const idResidente = document.getElementById("residenteSelect").value;

  const datos = {
    id_plan: plan.id_plan,
    id_residente: Number(idResidente),
    turno: currentTurno,
    panal: document.getElementById("pañal").value,
    observacion: document.getElementById("obs").value.trim(),
    riesgo: document.getElementById("riesgo").checked,
    encamado: document.getElementById("encamado").checked
  };

  if (!idAsignacion && !datos.id_residente) {
    alert("Selecciona un residente.");
    return;
  }

  try {
    if (idAsignacion) {
      await api.editarResidentePlan(idAsignacion, datos);
    } else {
      await api.asignarResidenteAPlan(datos);
    }

    resetForm();
    await cargarDatos();
    cargarSelectResidentes();
    render();
  } catch (error) {
    console.error(error);
    alert(error.message || "No se pudo guardar la asignación.");
  }
}


// ============================================================
// BLOQUE: Editar residente asignado
//
// Qué hace:
// - Carga la asignación seleccionada en el formulario.
// - Solo edita datos operativos.
// - No cambia plan, turno ni residente.
// ============================================================

function startEdit(id) {
  if (!esAdmin()) return;

  const asignacion = planResidentes.find(
    (r) => Number(r.id_plan_residente) === Number(id)
  );

  if (!asignacion) return;

  currentTurno = asignacion.turno;
  currentPlan = asignacion.plan_letra;

  const turnoSelect = document.getElementById("turnoSelect");
  if (turnoSelect) turnoSelect.value = currentTurno;

  document.getElementById("editId").value = asignacion.id_plan_residente;
  document.getElementById("residenteSelect").value = asignacion.id_residente;
  document.getElementById("pañal").value = asignacion.panal || "-";
  document.getElementById("obs").value = asignacion.observacion || "";
  document.getElementById("riesgo").checked = !!asignacion.riesgo;
  document.getElementById("encamado").checked = !!asignacion.encamado;

  renderBotonesPlanes();
  render();

  const adminBox = document.getElementById("adminBox");

  if (adminBox && !adminBox.classList.contains("open")) {
    toggleBox("adminBox");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}


// ============================================================
// BLOQUE: Retirar residente del plan
//
// Qué hace:
// - Marca la asignación como inactiva en backend.
// - No borra físicamente el historial.
// - Permite reasignar residente a otro plan del mismo turno.
// ============================================================

async function deleteUser(id) {
  if (!esAdmin()) {
    alert("Solo el administrador puede retirar residentes del plan.");
    return;
  }

  const confirmar = confirm("¿Retirar este residente del plan?");
  if (!confirmar) return;

  try {
    await api.quitarResidenteDePlan(id);
    await cargarDatos();
    cargarSelectResidentes();
    render();
  } catch (error) {
    console.error(error);
    alert(error.message || "No se pudo retirar el residente.");
  }
}


// ============================================================
// BLOQUE: Limpiar formulario admin
//
// Qué hace:
// - Limpia los campos editables.
// - No cambia plan ni turno actual.
// ============================================================

function resetForm() {
  const campos = ["editId", "residenteSelect", "obs"];

  campos.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const panal = document.getElementById("pañal");
  if (panal) panal.value = "-";

  const riesgo = document.getElementById("riesgo");
  if (riesgo) riesgo.checked = false;

  const encamado = document.getElementById("encamado");
  if (encamado) encamado.checked = false;
}


// ============================================================
// BLOQUE: Marcar residente como atendido
//
// Qué hace:
// - Solo auxiliares pueden marcar atención.
// - Si el residente está pendiente, crea registro.
// - Si ya está atendido, elimina registro.
// - El registro usa fecha + turno + plan + residente.
// ============================================================

async function toggleCheck(idResidente) {
  if (esAdmin()) {
    alert("El administrador solo supervisa. La atención debe registrarla un auxiliar.");
    return;
  }

  const plan = getPlanActual();
  const s = sesion();

  if (!plan || !s) return;

  const existente = registroDelResidente(idResidente);

  try {
    if (existente) {
      await api.eliminarPlanningRegistro(existente.id_registro);
    } else {
      await api.crearPlanningRegistro({
        id_plan: plan.id_plan,
        id_residente: idResidente,
        id_usuario: s.id_usuario,
        fecha: fechaHoy,
        turno: currentTurno,
        accion: accionPorTurno(currentTurno)
      });
    }

    await cargarDatos();
    render();
  } catch (error) {
    console.error(error);

    if (error.message && error.message.includes("ya fue registrado")) {
      await cargarDatos();
      render();
      return;
    }

    alert(error.message || "No se pudo actualizar el registro.");
  }
}


// ============================================================
// BLOQUE: Registrar nota/incidencia
//
// Qué hace:
// - Permite agregar una nota al residente.
// - Si ya existe una nota previa, NO la borra.
// - Agrega la nueva nota debajo de la anterior.
// - Si el residente aún no está atendido, crea el registro.
// - Si ya está atendido, actualiza el registro existente.
// ============================================================

function addIncidencia(idResidente) {
  const plan = getPlanActual();
  const s = sesion();

  if (!plan || !s) return;

  const registro = registroDelResidente(idResidente);
  const notaAnterior = registro?.incidencia || "";

  const nuevaNota = prompt("Escribe la nueva nota:");

  if (nuevaNota === null) return;

  const textoLimpio = nuevaNota.trim();

  if (!textoLimpio) return;

  const horaNota = new Date().toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit"
  });

  const notaFinal = notaAnterior
    ? `${notaAnterior}\n${horaNota} - ${textoLimpio}`
    : `${horaNota} - ${textoLimpio}`;

  const guardarNota = registro?.id_registro
    ? api.editarPlanningRegistro(registro.id_registro, {
      incidencia: notaFinal,
      observacion: registro.observacion || null,
      realizado: true
    })
    : api.crearPlanningRegistro({
      id_plan: plan.id_plan,
      id_residente: idResidente,
      id_usuario: s.id_usuario,
      fecha: fechaHoy,
      turno: currentTurno,
      accion: accionPorTurno(currentTurno),
      incidencia: notaFinal
    });

  guardarNota
    .then(() => cargarDatos())
    .then(() => render())
    .catch((error) => {
      console.error(error);
      alert(error.message || "No se pudo guardar la nota.");
    });
}

// ============================================================
// BLOQUE: Alternar historial todos los planes / plan actual
//
// Qué hace:
// - Cambia entre ver registros del plan actual o todos los planes.
// - Siempre mantiene filtro por turno actual.
// ============================================================

function toggleMatrixView() {
  viewAllMode = !viewAllMode;

  const btn = document.getElementById("btnToggleMatrix");

  if (btn) {
    btn.innerText = viewAllMode
      ? "Ver solo " + etiquetaPlanActual()
      : "Ver Todos los Planes";
  }

  renderHistorial();
}




// ============================================================
// BLOQUE: Render general
//
// Qué hace:
// - Refresca botones de planes.
// - Refresca lista de residentes.
// - Refresca lista editable admin.
// - Refresca historial admin si existe.
// - Refresca Mi historial auxiliar si existe.
// - Actualiza alarma de pendientes si existe.
// ============================================================

function render() {
  renderBotonesPlanes();
  renderChecklist();
  renderEditList();
  cargarFiltroAuxiliaresHistorial();
  renderHistorial();

  if (typeof renderMiHistorialAuxiliar === "function") {
    renderMiHistorialAuxiliar();
  }

  if (typeof actualizarAlarmaPendientes === "function") {
    actualizarAlarmaPendientes();
  }
}

// ============================================================
// BLOQUE: Render de pendientes y atendidos
//
// Qué hace:
// - Admin ve lista compacta informativa.
// - Auxiliar ve cards operativas.
// - Pendientes no muestra contador.
// - Atendidos muestra contador limpio en el título.
// - Siempre filtra por plan actual y turno actual.
// ============================================================

function renderChecklist() {
  const contenedor = document.getElementById("checklist");
  if (!contenedor) return;

  const residentesPlan = residentesDelPlanActual();
  const titulo = `${etiquetaPlanActual()} · ${currentTurno}`;

  if (esAdmin()) {
    const adminBox = document.getElementById("adminBox");
    const ajustesAbiertos = adminBox && adminBox.classList.contains("open");

    if (ajustesAbiertos) {
      contenedor.innerHTML = "";
      contenedor.style.display = "none";
      return;
    }

    contenedor.style.display = "block";

    const residentesOrdenados = residentesPlan
      .slice()
      .sort((a, b) => {
        if (a.riesgo === b.riesgo) {
          return String(a.residente_nombre || "").localeCompare(
            String(b.residente_nombre || "")
          );
        }

        return a.riesgo ? -1 : 1;
      });

    contenedor.innerHTML = `
      <section class="admin-plan-summary">
        <h3>Residentes asignados — ${escaparTexto(titulo)}</h3>

        <div class="admin-list-panel admin-main-list-panel">
          <div id="adminMainResidentRows"></div>
        </div>
      </section>
    `;

    const lista = document.getElementById("adminMainResidentRows");
    if (!lista) return;

    if (!residentesOrdenados.length) {
      lista.innerHTML = `
        <p class="admin-empty-text">
          No hay residentes asignados a este plan y turno.
        </p>
      `;
      return;
    }

    residentesOrdenados.forEach((r) => {
      const nombre = r.residente_nombre || "Sin nombre";
      const apellidos = r.residente_apellidos ? ` ${r.residente_apellidos}` : "";

      const riesgoTag = r.riesgo
        ? `<span class="admin-risk-tag">Riesgo</span>`
        : "";

      const estaEnAlarma =
        esAdmin() &&
        currentTurno === "Tarde" &&
        esHoraAlarmaTardeActiva() &&
        residentePendienteAlarmaTarde(r.id_residente);

      const alarmaTag = estaEnAlarma
        ? `<span class="admin-alert-tag">Pendiente 21:45</span>`
        : "";

      lista.innerHTML += `
    <div class="edit-row admin-main-row ${r.riesgo ? "is-risk" : ""} ${estaEnAlarma ? "is-alert-pending" : ""}">
      <span>
        <strong>${escaparTexto(nombre + apellidos)}</strong>
        <small>Hab. ${escaparTexto(r.habitacion || "-")}</small>
        ${riesgoTag}
        ${alarmaTag}
      </span>
    </div>
  `;
    });

    return;
  }
  contenedor.style.display = "block";

  const pendientes = residentesPlan
    .filter((r) => !registroDelResidente(r.id_residente))
    .sort((a, b) => {
      if (a.riesgo === b.riesgo) {
        return Number(a.orden || 999) - Number(b.orden || 999);
      }

      return a.riesgo ? -1 : 1;
    });

  const atendidos = residentesPlan.filter((r) =>
    registroDelResidente(r.id_residente)
  );

  const bloquePendientes = pendientes.length
    ? `
      <section class="section-group pendientes-section">
        <h3>Pendientes</h3>
        <div id="listaPendientes" class="cards-list"></div>
      </section>
    `
    : "";

  const bloqueAtendidos = atendidos.length
    ? `
      <section class="section-group atendidos-section">
        <h3 class="atendidos-title">✓ ATENDIDOS (${atendidos.length})</h3>
        <div id="listaAtendidos" class="cards-list done-list"></div>
      </section>
    `
    : "";

  contenedor.innerHTML = `
    ${bloquePendientes}
    ${bloqueAtendidos}
  `;

  const listaPendientes = document.getElementById("listaPendientes");
  const listaAtendidos = document.getElementById("listaAtendidos");

  if (listaPendientes) {
    pendientes.forEach((r) => {
      listaPendientes.appendChild(crearTarjetaResidente(r));
    });
  }

  if (listaAtendidos) {
    atendidos.forEach((r) => {
      listaAtendidos.appendChild(crearTarjetaResidente(r));
    });
  }
}
// ============================================================
// BLOQUE: Render lista editable admin
//
// Qué hace:
// - Muestra residentes del plan + turno actual.
// - Separa claramente la gestión de la lista asignada.
// - Permite editar o retirar residentes.
// - Solo aparece para admin.
// ============================================================

function renderEditList() {
  const contenedor = document.getElementById("editList");

  if (!esAdmin()) {
    if (contenedor) contenedor.innerHTML = "";
    return;
  }

  if (!contenedor) return;

  const residentesPlan = residentesDelPlanActual()
    .slice()
    .sort((a, b) => {
      if (a.riesgo === b.riesgo) {
        return String(a.residente_nombre || "").localeCompare(
          String(b.residente_nombre || "")
        );
      }

      return a.riesgo ? -1 : 1;
    });

  contenedor.innerHTML = `
    <section class="admin-list-panel">
      <div class="admin-list-header">
        <h4>Residentes asignados</h4>
        <span>${escaparTexto(etiquetaPlanActual())} · ${escaparTexto(currentTurno)}</span>
      </div>

      <div id="adminResidentRows"></div>
    </section>
  `;

  const lista = document.getElementById("adminResidentRows");
  if (!lista) return;

  if (!residentesPlan.length) {
    lista.innerHTML = `
      <p class="admin-empty-text">
        Sin residentes en este plan y turno.
      </p>
    `;
    return;
  }

  residentesPlan.forEach((r) => {
    const nombre = r.residente_nombre || "Sin nombre";
    const apellidos = r.residente_apellidos ? ` ${r.residente_apellidos}` : "";
    const riesgoTag = r.riesgo ? ` <span class="admin-risk-tag">Riesgo</span>` : "";

    lista.innerHTML += `
      <div class="edit-row ${r.riesgo ? "is-risk" : ""}">
        <span>
          <strong>${escaparTexto(nombre + apellidos)}</strong>
          <small>Hab. ${escaparTexto(r.habitacion || "-")}</small>
          ${riesgoTag}
        </span>

        <div class="edit-actions">
          <button type="button" onclick="startEdit(${r.id_plan_residente})">✏️</button>
          <button type="button" onclick="deleteUser(${r.id_plan_residente})">🗑️</button>
        </div>
      </div>
    `;
  });
}

// ============================================================
// BLOQUE: Cargar filtro de auxiliares en historial admin
//
// Qué hace:
// - Lee los auxiliares desde los registros cargados.
// - Evita duplicados por id_usuario.
// - Llena el select del historial admin.
// - No crea usuarios ni modifica datos.
// ============================================================

function cargarFiltroAuxiliaresHistorial() {
  const select = document.getElementById("historialAuxiliar");

  if (!select || !esAdmin()) return;

  const valorActual = select.value || "TODOS";

  const auxiliaresMap = new Map();

  registros.forEach((r) => {
    if (!r.id_usuario) return;

    const nombre = r.auxiliar_nombre || `Usuario ${r.id_usuario}`;

    auxiliaresMap.set(String(r.id_usuario), nombre);
  });

  const auxiliaresOrdenados = Array.from(auxiliaresMap.entries()).sort((a, b) =>
    String(a[1]).localeCompare(String(b[1]))
  );

  select.innerHTML = `<option value="TODOS">Todas</option>`;

  auxiliaresOrdenados.forEach(([idUsuario, nombre]) => {
    select.innerHTML += `
      <option value="${escaparTexto(idUsuario)}">
        ${escaparTexto(nombre)}
      </option>
    `;
  });

  if ([...auxiliaresMap.keys()].includes(valorActual)) {
    select.value = valorActual;
  } else {
    select.value = "TODOS";
  }
}
// ============================================================
// BLOQUE: Render historial administrativo
//
// Qué hace:
// - Muestra registros filtrados por fecha, turno y plan.
// - Permite al administrador revisar incidencias/notas.
// - Muestra fecha, hora, plan, habitación, residente, auxiliar e incidencia.
// - La auxiliar no necesita consultar este historial.
// ============================================================

function renderHistorial() {
  const tbody = document.querySelector("#matrixTable tbody");
  if (!tbody) return;

  if (!esAdmin()) {
    tbody.innerHTML = "";
    return;
  }

  const inputFecha = document.getElementById("historialFecha");
  const selectPlan = document.getElementById("historialPlan");
  const selectAuxiliar = document.getElementById("historialAuxiliar");

  if (inputFecha && !inputFecha.value) {
    inputFecha.value = fechaHoy;
  }

  const fechaFiltro = inputFecha?.value || fechaHoy;
const planFiltro = selectPlan?.value || "TODOS";
const auxiliarFiltro = selectAuxiliar?.value || "TODOS";

  const filtrados = registros
  .filter((r) => fechaRegistro(r) === fechaFiltro)
  .filter((r) => r.turno === currentTurno)
  .filter((r) => {
    if (planFiltro === "TODOS") return true;
    return r.plan_letra === planFiltro;
  })
  .filter((r) => {
    if (auxiliarFiltro === "TODOS") return true;
    return String(r.id_usuario) === String(auxiliarFiltro);
  })
    .slice()
    .sort((a, b) => {
      const planA = String(a.plan_letra || "");
      const planB = String(b.plan_letra || "");

      if (planA !== planB) {
        return planA.localeCompare(planB);
      }

      return String(a.hora || "").localeCompare(String(b.hora || ""));
    });

  if (!filtrados.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          Sin registros para la fecha, turno y plan seleccionados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtrados
    .map((r) => {
      const nombre = r.residente_nombre || "";
      const apellidos = r.residente_apellidos ? ` ${r.residente_apellidos}` : "";
      const incidencia = r.incidencia || "";

      return `
        <tr>
          <td>${escaparTexto(fechaRegistro(r))}</td>
          <td>${escaparTexto(r.hora || "")}</td>
          <td>${escaparTexto(r.plan_letra || "")}</td>
          <td>${escaparTexto(r.habitacion || "")}</td>
          <td>${escaparTexto(nombre + apellidos)}</td>
          <td>${escaparTexto(r.auxiliar_nombre || "")}</td>
          <td>${escaparTexto(incidencia)}</td>
        </tr>
      `;
    })
    .join("");
}


// ============================================================
// BLOQUE: Mi historial auxiliar
//
// Qué hace:
// - Usa planning_registros ya cargado desde PostgreSQL.
// - Filtra por id_usuario de la sesión actual.
// - Agrupa por id_usuario + fecha + turno + plan.
// - Muestra solo Fecha, Turno y Plan.
// - No muestra residentes, habitaciones, auxiliares ni incidencias.
// ============================================================

function obtenerMiHistorialAgrupado() {
  const s = sesion();

  if (!s || esAdmin()) return [];

  const inputFecha = document.getElementById("miHistorialFecha");
  const selectTurno = document.getElementById("miHistorialTurno");
  const selectPlan = document.getElementById("miHistorialPlan");

  const fechaFiltro = inputFecha?.value || "TODOS";
  const turnoFiltro = selectTurno?.value || "TODOS";
  const planFiltro = selectPlan?.value || "TODOS";

  const mapa = new Map();

  registros
    .filter((r) => Number(r.id_usuario) === Number(s.id_usuario))
    .filter((r) => {
      if (fechaFiltro === "TODOS") return true;
      return fechaRegistro(r) === fechaFiltro;
    })
    .filter((r) => {
      if (turnoFiltro === "TODOS") return true;
      return r.turno === turnoFiltro;
    })
    .filter((r) => {
      if (planFiltro === "TODOS") return true;
      return r.plan_letra === planFiltro;
    })
    .forEach((r) => {
      const fecha = fechaRegistro(r);
      const turno = r.turno || "";
      const plan = r.plan_letra || "";
      const clave = `${s.id_usuario}|${fecha}|${turno}|${plan}`;

      if (!mapa.has(clave)) {
        mapa.set(clave, { fecha, turno, plan });
      }
    });

  const ordenTurnos = { "Mañana": 1, "Tarde": 2, "Noche": 3 };
  const ordenPlanes = { A: 1, B: 2, C: 3, D: 4, ALT: 5 };

  return Array.from(mapa.values()).sort((a, b) => {
    if (a.fecha !== b.fecha) return String(b.fecha).localeCompare(String(a.fecha));

    const turnoA = ordenTurnos[a.turno] || 99;
    const turnoB = ordenTurnos[b.turno] || 99;

    if (turnoA !== turnoB) return turnoA - turnoB;

    return (ordenPlanes[a.plan] || 99) - (ordenPlanes[b.plan] || 99);
  });
}

function renderMiHistorialAuxiliar() {
  const tbody = document.querySelector("#miHistorialTable tbody");
  if (!tbody) return;

  if (esAdmin()) {
    tbody.innerHTML = "";
    return;
  }

  const historial = obtenerMiHistorialAgrupado();

  if (!historial.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3">
          No tienes planes registrados con los filtros seleccionados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = historial
    .map(
      (item) => `
        <tr>
          <td>${escaparTexto(item.fecha)}</td>
          <td>${escaparTexto(item.turno)}</td>
          <td>${escaparTexto(nombrePlanVisiblePorLetra(item.plan))}</td>
        </tr>
      `
    )
    .join("");
}

function prepararImpresionMiHistorial() {
  if (esAdmin()) {
    alert("El historial propio solo está disponible para auxiliares.");
    return;
  }

  const s = sesion();
  const historial = obtenerMiHistorialAgrupado();

  if (!historial.length) {
    alert("No hay registros en tu historial para imprimir.");
    return;
  }

  const inputFecha = document.getElementById("miHistorialFecha");
  const selectTurno = document.getElementById("miHistorialTurno");
  const selectPlan = document.getElementById("miHistorialPlan");

  const fechaFiltro = inputFecha?.value || "Todas";
  const turnoFiltro = selectTurno?.value || "TODOS";
  const planFiltro = selectPlan?.value || "TODOS";

  const filas = historial
    .map(
      (item) => `
        <tr>
          <td>${escaparTexto(item.fecha)}</td>
          <td>${escaparTexto(item.turno)}</td>
          <td>${escaparTexto(nombrePlanVisiblePorLetra(item.plan))}</td>
        </tr>
      `
    )
    .join("");

  const printArea = document.getElementById("printArea");

  if (!printArea) {
    alert("No existe el área de impresión.");
    return;
  }

  printArea.innerHTML = `
    <div class="report-header">
      <h2>MI HISTORIAL - PLANNING</h2>
      <p><strong>Auxiliar:</strong> ${escaparTexto(s?.nombre || "Auxiliar")}</p>
      <p><strong>Fecha:</strong> ${escaparTexto(fechaFiltro)}</p>
      <p><strong>Turno:</strong> ${escaparTexto(turnoFiltro === "TODOS" ? "Todos" : turnoFiltro)}</p>
      <p><strong>Plan:</strong> ${escaparTexto(planFiltro === "TODOS" ? "Todos" : nombrePlanVisiblePorLetra(planFiltro))}</p>
    </div>

    <table class="report-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Turno</th>
          <th>Plan</th>
        </tr>
      </thead>
      <tbody>
        ${filas}
      </tbody>
    </table>
  `;

  window.print();
}

// ============================================================
// BLOQUE: Crear card operativo de residente
//
// Qué hace:
// - En Pendientes muestra card amplio y legible.
// - En Pendientes muestra riesgo, pañal, encamado y observación base.
// - En Atendidos no repite riesgo ni pañal.
// - En Atendidos solo muestra la nota registrada por la auxiliar.
// - La nota se muestra como ícono de lápiz.
// ============================================================

function crearTarjetaResidente(r) {
  const fila = document.createElement("div");
  const registro = registroDelResidente(r.id_residente);
  const atendido = !!registro;

  fila.className = `resident-row ${r.riesgo ? "is-risk" : ""} ${atendido ? "is-done" : "is-pending"
    }`;

  const nombre = r.residente_nombre || "Sin nombre";
  const apellidos = r.residente_apellidos ? ` ${r.residente_apellidos}` : "";
  const habitacion = r.habitacion || "-";

  const chips = [];

  if (!atendido) {
    if (r.riesgo) {
      chips.push(`<span class="resident-chip risk">⚠️ Riesgo</span>`);
    }

    if (r.encamado) {
      chips.push(`<span class="resident-chip">🛏️ Encamado</span>`);
    }

    if (r.panal && r.panal !== "-") {
      chips.push(
        `<span class="resident-chip">🩺 Pañal ${escaparTexto(r.panal)}</span>`
      );
    }
  }

  const chipsHtml = chips.length
    ? `<div class="resident-row-detail">${chips.join("")}</div>`
    : "";

  const notaVisible = atendido
    ? ""
    : r.observacion || "";

  const notaHtml = notaVisible
    ? `<div class="resident-row-note"><strong>Nota:</strong> ${escaparTexto(notaVisible)}</div>`
    : "";

  const estadoHtml = atendido
    ? `<span class="resident-row-time">${escaparTexto(registro?.hora || "✓")}</span>`
    : "";

  fila.innerHTML = `
    <div class="resident-row-main">
      <div class="resident-row-title">
        <strong>${escaparTexto(nombre + apellidos)}</strong>
        <span>Hab. ${escaparTexto(habitacion)}</span>
      </div>

      ${chipsHtml}
      ${notaHtml}
    </div>

    <div class="resident-row-side">
      ${estadoHtml}

      <button 
        type="button" 
        class="btn-nota-icon" 
        onclick="addIncidencia(${r.id_residente})"
        aria-label="Agregar nota"
        title="Agregar nota"
      >
        📝
      </button>
    </div>
  `;

  fila.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    toggleCheck(r.id_residente);
  });

  return fila;
}


// ============================================================
// BLOQUE: Preparar impresión desde Historial
//
// Qué hace:
// - Genera reporte imprimible usando los mismos filtros del historial.
// - Respeta fecha seleccionada, turno actual y plan seleccionado.
// - No depende de la lista principal de residentes asignados.
// - Usa impresión nativa del navegador.
// ============================================================

function prepararImpresion() {
  if (!esAdmin()) {
    alert("Solo el administrador puede generar reportes.");
    return;
  }

  const s = sesion();

  const inputFecha = document.getElementById("historialFecha");
  const selectPlan = document.getElementById("historialPlan");
  const selectAuxiliar = document.getElementById("historialAuxiliar");

  const fechaFiltro = inputFecha?.value || fechaHoy;
  const planFiltro = selectPlan?.value || "TODOS";
  const auxiliarFiltro = selectAuxiliar?.value || "TODOS";

  const registrosFiltrados = registros
    .filter((r) => fechaRegistro(r) === fechaFiltro)
    .filter((r) => r.turno === currentTurno)
    .filter((r) => {
      if (planFiltro === "TODOS") return true;
      return r.plan_letra === planFiltro;
    })
    .filter((r) => {
    if (auxiliarFiltro === "TODOS") return true;
    return String(r.id_usuario) === String(auxiliarFiltro);
  })
    .slice()
    .sort((a, b) => {
      const planA = String(a.plan_letra || "");
      const planB = String(b.plan_letra || "");

      if (planA !== planB) {
        return planA.localeCompare(planB);
      }

      return String(a.hora || "").localeCompare(String(b.hora || ""));
    });

  if (!registrosFiltrados.length) {
    alert("No hay registros en el historial para imprimir.");
    return;
  }

  const tituloPlan =
    planFiltro === "TODOS"
      ? "TODOS LOS PLANES"
      : planFiltro === "ALT"
        ? "ALTERNO"
        : `PLAN ${planFiltro}`;

  const filas = registrosFiltrados
    .map((r) => {
      const nombre = r.residente_nombre || "";
      const apellidos = r.residente_apellidos ? ` ${r.residente_apellidos}` : "";

      return `
        <tr>
          <td>${escaparTexto(r.hora || "")}</td>
          <td>${escaparTexto(r.plan_letra || "")}</td>
          <td>${escaparTexto(r.habitacion || "")}</td>
          <td>${escaparTexto(nombre + apellidos)}</td>
          <td>${escaparTexto(r.auxiliar_nombre || "")}</td>
          <td>${escaparTexto(r.incidencia || "")}</td>
        </tr>
      `;
    })
    .join("");

  const printArea = document.getElementById("printArea");

  if (!printArea) {
    alert("No existe el área de impresión.");
    return;
  }

  printArea.innerHTML = `
    <h2>REPORTE PLANNING - ${escaparTexto(tituloPlan)}</h2>

    <p><strong>Fecha:</strong> ${escaparTexto(fechaFiltro)}</p>
    <p><strong>Turno:</strong> ${escaparTexto(currentTurno)}</p>
    <p><strong>Generado por:</strong> ${escaparTexto(s?.nombre || "Administrador")}</p>

    <table>
      <thead>
        <tr>
          <th>Hora</th>
          <th>Plan</th>
          <th>Hab.</th>
          <th>Residente</th>
          <th>Auxiliar</th>
          <th>Incidencia</th>
        </tr>
      </thead>
      <tbody>
        ${filas}
      </tbody>
    </table>
  `;

  window.print();
}

// ============================================================
// BLOQUE: Inicio del módulo Planning
//
// Qué hace:
// - Verifica sesión.
// - Muestra pantalla principal.
// - Selecciona turno según hora aproximada.
// - Carga datos y renderiza la interfaz.
// ============================================================

async function iniciarPlanning() {
  if (!auth.verificarSesion("index.html")) return;

  const appScreen = document.getElementById("appScreen");
  if (appScreen) appScreen.style.display = "block";

  const loginScreen = document.getElementById("loginScreen");
  if (loginScreen) loginScreen.style.display = "none";

  const hora = new Date().getHours();

  if (hora >= 7 && hora < 14) {
    currentTurno = "Mañana";
  } else if (hora >= 14 && hora < 22) {
    currentTurno = "Tarde";
  } else {
    currentTurno = "Noche";
  }

  try {
    prepararInterfazPlanning();

    const turnoSelect = document.getElementById("turnoSelect");
    if (turnoSelect) turnoSelect.value = currentTurno;

    await cargarDatos();

    if (planes.length && !planes.some((p) => p.letra === currentPlan)) {
      currentPlan = planes[0].letra;
    }

    renderBotonesPlanes();
    cargarSelectResidentes();
    render();
    if (typeof actualizarAlarmaPendientes === "function") {
      setInterval(actualizarAlarmaPendientes, 60000);
    }

  } catch (error) {
    console.error(error);
    alert("No se pudo cargar Planning. Revisa backend, rutas API o consola.");
  }
}

window.onload = iniciarPlanning;