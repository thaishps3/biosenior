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
// - Esta es la regla nueva:
//   Planning = turno + plan + residente.
// ============================================================

function residentesDelPlanActual() {
  return planResidentes.filter(
    (r) => r.plan_letra === currentPlan && r.turno === currentTurno
  );
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

  if (!esAdmin()) {
    if (adminBlock) adminBlock.style.display = "none";
  } else {
    if (adminBlock) adminBlock.style.display = "block";
  }

  const btnCambiar = document.querySelector(".btn-change-user");

  if (btnCambiar) {
    btnCambiar.style.display = "none";
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
// - El turno no se elige dentro del formulario porque se toma
//   del selector global de turno.
// ============================================================

function prepararFormularioAsignacion() {
  const formBox = document.querySelector(".form-box");
  if (!formBox) return;

  formBox.innerHTML = `
    <input type="hidden" id="editId" />

    <label>Residente</label>
    <select id="residenteSelect">
      <option value="">Seleccionar residente...</option>
    </select>

    <label>Orden</label>
    <input id="orden" type="number" min="1" placeholder="Orden dentro del plan" />

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
// - Si el admin abre ajustes, refresca la lista editable.
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

  if (esAdmin() && id === "adminBox") {
    renderChecklist();
    renderEditList();
  }
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
    orden: document.getElementById("orden").value || null,
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
  document.getElementById("orden").value = asignacion.orden || "";
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
  const campos = ["editId", "residenteSelect", "orden", "obs"];

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
// BLOQUE: Registrar incidencia
//
// Qué hace:
// - Permite agregar incidencia u observación al residente.
// - Si no existe registro, primero lo crea.
// - Usa la acción correspondiente al turno actual.
// ============================================================

async function addIncidencia(idResidente) {
  const plan = getPlanActual();
  const s = sesion();

  if (!plan || !s) return;

  let registro = registroDelResidente(idResidente);

  const texto = prompt(
    "Incidencia u observación:",
    registro?.incidencia || ""
  );

  if (texto === null) return;

  try {
    if (!registro) {
      await api.crearPlanningRegistro({
        id_plan: plan.id_plan,
        id_residente: idResidente,
        id_usuario: s.id_usuario,
        fecha: fechaHoy,
        turno: currentTurno,
        accion: accionPorTurno(currentTurno),
        incidencia: texto
      });
    } else {
      await api.editarPlanningRegistro(registro.id_registro, {
        incidencia: texto,
        observacion: registro.observacion || null,
        realizado: true
      });
    }

    await cargarDatos();
    render();
  } catch (error) {
    console.error(error);
    alert(error.message || "No se pudo guardar la incidencia.");
  }
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
// - Refresca historial.
// ============================================================

function render() {
  renderBotonesPlanes();
  renderChecklist();
  renderEditList();
  renderHistorial();
}


// ============================================================
// BLOQUE: Render de pendientes y atendidos
//
// Qué hace:
// - Admin ve lista compacta informativa.
// - Auxiliar ve cards operativas.
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

    if (residentesPlan.length === 0) {
      contenedor.innerHTML = `
        <section class="admin-plan-summary">
          <h3>Residentes asignados — ${escaparTexto(titulo)}</h3>
          <p>No hay residentes asignados a este plan y turno.</p>
        </section>
      `;
      return;
    }

    contenedor.innerHTML = `
      <section class="admin-plan-summary">
        <h3>Residentes asignados — ${escaparTexto(titulo)}</h3>
        <ul>
          ${residentesPlan
            .map((r) => {
              const nombre = r.residente_nombre || "Sin nombre";
              const apellidos = r.residente_apellidos
                ? ` ${r.residente_apellidos}`
                : "";
              const habitacion = r.habitacion
                ? ` · Hab. ${r.habitacion}`
                : "";
              const riesgo = r.riesgo ? " · ⚠️ Riesgo" : "";

              return `
                <li>
                  ${escaparTexto(nombre + apellidos + habitacion + riesgo)}
                </li>
              `;
            })
            .join("")}
        </ul>
      </section>
    `;
    return;
  }

  contenedor.style.display = "block";

  const pendientes = residentesPlan.filter(
    (r) => !registroDelResidente(r.id_residente)
  );

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
  <h3>Atendidos</h3>
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

  const residentesPlan = residentesDelPlanActual();

  contenedor.innerHTML = `
    <h4>Residentes en ${escaparTexto(etiquetaPlanActual())} · ${escaparTexto(currentTurno)}</h4>
  `;

  if (!residentesPlan.length) {
    contenedor.innerHTML += `
      <p>Sin residentes en este plan y turno.</p>
    `;
    return;
  }

  residentesPlan.forEach((r) => {
    const nombre = r.residente_nombre || "Sin nombre";
    const apellidos = r.residente_apellidos ? ` ${r.residente_apellidos}` : "";
    const riesgoTag = r.riesgo ? ` ⚠️` : "";

    contenedor.innerHTML += `
      <div class="edit-row">
        <span>
          ${escaparTexto(nombre + apellidos)}
          · Hab ${escaparTexto(r.habitacion || "-")}
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
// BLOQUE: Render historial del día
//
// Qué hace:
// - Muestra registros de hoy.
// - Filtra por turno actual.
// - Si viewAllMode está apagado, también filtra por plan actual.
// ============================================================

function renderHistorial() {
  const tbody = document.querySelector("#matrixTable tbody");
  if (!tbody) return;

  const filtrados = registros
    .filter((r) => fechaRegistro(r) === fechaHoy)
    .filter((r) => (viewAllMode ? true : r.plan_letra === currentPlan))
    .filter((r) => r.turno === currentTurno)
    .slice()
    .reverse();

  if (!filtrados.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">Sin registros hoy para ${escaparTexto(currentTurno)}.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtrados
    .map((r) => {
      const planCol = viewAllMode
        ? `${escaparTexto(r.plan_letra)} — ${escaparTexto(r.habitacion || "-")}`
        : escaparTexto(r.habitacion || "-");

      const incTag = r.incidencia
        ? `<br><strong>⚠️ ${escaparTexto(r.incidencia)}</strong>`
        : "";

      return `
        <tr>
          <td>${escaparTexto(r.hora || "")}</td>
          <td>${planCol}</td>
          <td>${escaparTexto(r.residente_nombre || "")}${incTag}</td>
          <td>${escaparTexto(r.accion || "")}</td>
          <td>${escaparTexto(r.auxiliar_nombre || "")}</td>
        </tr>
      `;
    })
    .join("");
}


// ============================================================
// BLOQUE: Crear fila compacta de residente
//
// Qué hace:
// - Crea una fila operativa compacta para móvil.
// - Toda la fila permite marcar/desmarcar atención.
// - Mantiene visible habitación, nombre, alertas y hora.
// - El botón Incidencia queda separado para no activar el check.
// - Sustituye las cards grandes por filas táctiles más eficientes.
// ============================================================

function crearTarjetaResidente(r) {
  const fila = document.createElement("div");
  const registro = registroDelResidente(r.id_residente);
  const atendido = !!registro;

  fila.className = `resident-row ${r.riesgo ? "is-risk" : ""} ${
    atendido ? "is-done" : ""
  }`;

  const nombre = r.residente_nombre || "Sin nombre";
  const apellidos = r.residente_apellidos ? ` ${r.residente_apellidos}` : "";
  const habitacion = r.habitacion || "-";

  const detalles = [];

  if (r.riesgo) {
    detalles.push("⚠️ Riesgo");
  }

  if (r.encamado) {
    detalles.push("🛏️ Encamado");
  }

  if (r.panal && r.panal !== "-") {
    detalles.push(`Pañal ${r.panal}`);
  }

  if (r.observacion) {
    detalles.push(r.observacion);
  }

  if (registro?.incidencia) {
    detalles.push(`⚠️ ${registro.incidencia}`);
  }

  const detalleHtml = detalles.length
    ? `<div class="resident-row-detail">${escaparTexto(detalles.join(" · "))}</div>`
    : "";

  const estadoHtml = atendido
  ? `<span class="resident-row-time">${escaparTexto(registro?.hora || "✓")}</span>`
  : "";

  fila.innerHTML = `
    <div class="resident-row-check">
      ${atendido ? "✓" : ""}
    </div>

    <div class="resident-row-main">
      <div class="resident-row-title">
        <strong>${escaparTexto(habitacion)} · ${escaparTexto(nombre + apellidos)}</strong>
      </div>

      ${detalleHtml}
    </div>

    <div class="resident-row-side">
      ${estadoHtml}

      <button type="button" class="btn-incidencia" onclick="addIncidencia(${r.id_residente})">
        Nota
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
// BLOQUE: Preparar impresión
//
// Qué hace:
// - Genera reporte imprimible del historial actual.
// - Filtra por fecha, turno y plan/todos los planes.
// - Usa impresión nativa del navegador.
// - Evita columnas redundantes para ahorrar tinta y espacio.
// ============================================================

function prepararImpresion() {
  const s = sesion();

  const registrosHoy = registros
    .filter((r) => fechaRegistro(r) === fechaHoy)
    .filter((r) => (viewAllMode ? true : r.plan_letra === currentPlan))
    .filter((r) => r.turno === currentTurno)
    .slice()
    .sort((a, b) => String(a.hora || "").localeCompare(String(b.hora || "")));

  if (!registrosHoy.length) {
    alert("No hay registros para imprimir.");
    return;
  }

  const tituloPlan = viewAllMode ? "TODOS LOS PLANES" : `PLAN ${currentPlan}`;

  const filas = registrosHoy
    .map(
      (r) => `
        <tr>
          <td>${escaparTexto(r.hora || "")}</td>
          <td>${escaparTexto(r.habitacion || "")}</td>
          <td>${escaparTexto(r.residente_nombre || "")}</td>
          <td>${escaparTexto(r.incidencia || "")}</td>
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
    <h2>REPORTE PLANNING ${escaparTexto(tituloPlan)}</h2>

    <p><strong>Fecha:</strong> ${dateFull.toUpperCase()}</p>
    <p><strong>Turno:</strong> ${currentTurno}</p>
    <p><strong>Acción:</strong> ${accionPorTurno(currentTurno)}</p>
    <p><strong>Auxiliar:</strong> ${escaparTexto(s?.nombre || "No identificado")}</p>

    <table>
      <thead>
        <tr>
          <th>Hora</th>
          <th>Hab.</th>
          <th>Residente</th>
          <th>Nota</th>
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
  } catch (error) {
    console.error(error);
    alert("No se pudo cargar Planning. Revisa backend, rutas API o consola.");
  }
}

window.onload = iniciarPlanning;