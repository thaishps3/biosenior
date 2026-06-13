/* ============================================================
   PLANNING — PostgreSQL / API REST
   ============================================================ */

let currentPlan = "A";
let currentTurno = "Mañana";
let viewAllMode = false;

let planes = [];
let residentes = [];
let planResidentes = [];
let registros = [];

const fechaHoy = new Date().toISOString().split("T")[0];

const dateFull = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
});

/* ============================================================
   HELPERS
   ============================================================ */

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
    if (turno === "Tarde") return "siesta";
    return "acostar";
}

function getPlanActual() {
    return planes.find(p => p.letra === currentPlan);
}

function residentesDelPlanActual() {
    return planResidentes.filter(r => r.plan_letra === currentPlan);
}

function fechaRegistro(r) {
    if (r.fecha_iso) return r.fecha_iso;
    if (r.fecha) return String(r.fecha).substring(0, 10);
    return "";
}

function registroDelResidente(idResidente) {
    return registros.find(r =>
        Number(r.id_residente) === Number(idResidente) &&
        fechaRegistro(r) === fechaHoy &&
        r.turno === currentTurno
    );
}

/* ============================================================
   CARGA DE DATOS
   ============================================================ */

async function cargarDatos() {
    const [
        planesApi,
        residentesApi,
        planResidentesApi,
        registrosApi
    ] = await Promise.all([
        api.obtenerPlanningPlanes(),
        api.obtenerResidentes(),
        api.obtenerPlanningPlanResidentes(),
        api.obtenerPlanningRegistros()
    ]);

    planes = planesApi;
    residentes = residentesApi.filter(r => r.activo !== false);
    planResidentes = planResidentesApi;
    registros = registrosApi;
}

/* ============================================================
   UI INICIAL
   ============================================================ */

function prepararInterfazPlanning() {
    document.getElementById("displayDate").innerText = dateFull.toUpperCase();

    const s = sesion();

    if (document.getElementById("headerAuxiliar")) {
        document.getElementById("headerAuxiliar").innerText = s?.nombre || "Sin usuario";
    }

    crearSelectorTurnoSiNoExiste();
    prepararFormularioAsignacion();
        aplicarPermisosPorRol();
}

function aplicarPermisosPorRol() {
    const s = sesion();

    const info = document.getElementById("planSesionInfo");

    if (info && s) {
        const rolColor = s.rol === "admin"
            ? "background:#fef3e2;color:#7a4a00"
            : "background:#e6f4f6;color:#0a5a68";

        info.innerHTML = `
            <span style="font-size:12px;font-weight:500;color:white;">${escaparTexto(s.nombre)}</span>
            <span style="${rolColor};font-size:10px;padding:2px 8px;border-radius:20px;font-weight:600;margin-left:6px;">
                ${s.rol === "admin" ? "Admin" : "Auxiliar"}
            </span>
            <button onclick="auth.cerrarSesion('index.html')"
                style="font-size:11px;margin-left:8px;
                       background:rgba(255,255,255,0.2);
                       border:1px solid rgba(255,255,255,0.4);
                       color:white;border-radius:20px;
                       padding:3px 10px;cursor:pointer;
                       font-family:inherit;">
                Salir
            </button>
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

function crearSelectorTurnoSiNoExiste() {
    if (document.getElementById("turnoSelect")) return;

    const headerRight = document.querySelector(".header-right");

    if (!headerRight) return;

    const select = document.createElement("select");
    select.id = "turnoSelect";
    select.style.marginTop = "8px";
    select.style.padding = "8px";
    select.style.borderRadius = "8px";
    select.style.border = "1px solid #dde4ea";

    select.innerHTML = `
        <option value="Mañana">Mañana · levantar</option>
        <option value="Tarde">Tarde · siesta</option>
        <option value="Noche">Noche · acostar</option>
    `;

    select.addEventListener("change", () => {
        currentTurno = select.value;
        render();
    });

    headerRight.appendChild(select);
}

function prepararFormularioAsignacion() {
    const formBox = document.querySelector(".form-box");

    if (!formBox) return;

    formBox.innerHTML = `
        <input type="hidden" id="editId">

        <select id="residenteSelect">
            <option value="">Seleccionar residente...</option>
        </select>

        
        <select id="pañal">
            <option value="-">Pañal — sin cambio programado</option>
            <option value="S">Talla S</option>
            <option value="M">Talla M</option>
            <option value="L">Talla L</option>
            <option value="XL">Talla XL</option>
        </select>

        <input type="text" id="obs" placeholder="Observaciones para este plan">

        <label class="option-check risk">
            <input type="checkbox" id="riesgo"> ⚠️ Residente de riesgo
        </label>

        <label class="option-check">
            <input type="checkbox" id="encamado"> 🛏️ Residente encamado
        </label>

        <button class="btn-save" onclick="guardarAsignacionPlan()">
            💾 ASIGNAR AL PLAN
        </button>
    `;
}

function cargarSelectResidentes() {
    const select = document.getElementById("residenteSelect");

    if (!select) return;

    select.innerHTML = `<option value="">Seleccionar residente...</option>`;

    residentes.forEach(r => {
        const nombre = escaparTexto(r.nombre);
        const hab = r.habitacion ? ` · Hab. ${escaparTexto(r.habitacion)}` : "";

        select.innerHTML += `
            <option value="${r.id_residente}">
                ${nombre}${hab}
            </option>
        `;
    });
}

/* ============================================================
   CAMBIO DE PLAN
   ============================================================ */

function setPlan(plan) {
    currentPlan = plan;

    const label = document.getElementById("planLabelTop");
    if (label) label.innerText = plan;

    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.innerText.trim() === plan);
    });

    resetForm();
    render();
}

/* ============================================================
   TOGGLE CAJAS
   ============================================================ */

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
    }
}

/* ============================================================
   ASIGNAR RESIDENTE A PLAN
   ============================================================ */

async function guardarAsignacionPlan() {
    console.log("⚠️ guardarAsignacionPlan ejecutado");

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

function startEdit(id) {

        if (!esAdmin()) return;
    const asignacion = planResidentes.find(r =>
        Number(r.id_plan_residente) === Number(id)
    );

    if (!asignacion) return;

    document.getElementById("editId").value = asignacion.id_plan_residente;
    document.getElementById("residenteSelect").value = asignacion.id_residente;
   
    document.getElementById("pañal").value = asignacion.panal || "-";
    document.getElementById("obs").value = asignacion.observacion || "";
    document.getElementById("riesgo").checked = !!asignacion.riesgo;
    document.getElementById("encamado").checked = !!asignacion.encamado;

    const adminBox = document.getElementById("adminBox");

    if (adminBox && !adminBox.classList.contains("open")) {
        toggleBox("adminBox");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

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

function resetForm() {
    const campos = ["editId", "residenteSelect", "obs"];

    campos.forEach(id => {
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

/* ============================================================
   MARCAR ATENDIDO / INCIDENCIA
   ============================================================ */

async function toggleCheck(idResidente) {
    if (esAdmin()) {
    alert("El administrador solo supervisa. La atención debe registrarla un auxiliar.");
    return;
}
    console.log("✅ toggleCheck ejecutado con id_residente:", idResidente);
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

/* ============================================================
   HISTORIAL
   ============================================================ */

function toggleMatrixView() {
    viewAllMode = !viewAllMode;

    const btn = document.getElementById("btnToggleMatrix");

    if (btn) {
        btn.innerText = viewAllMode
            ? "Ver solo Plan " + currentPlan
            : "Ver Todos los Planes";
    }

    renderHistorial();
}

/* ============================================================
   RENDER
   ============================================================ */

function render() {
    renderChecklist();
    renderEditList();
    renderHistorial();
}

function renderChecklist() {
    const contenedor = document.getElementById("checklist");
    if (!contenedor) return;

    const residentesPlan = residentesDelPlanActual();

    // Vista ADMIN: lista compacta informativa, sin cards
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
            <div class="admin-plan-list no-print">
                <h3>Residentes asignados al PLAN ${currentPlan}</h3>
                <p class="empty-msg">No hay residentes asignados a este plan.</p>
            </div>
        `;
        return;
    }

    contenedor.innerHTML = `
        <div class="admin-plan-list no-print">
            <h3>Residentes asignados al PLAN ${currentPlan}</h3>
            <ul>
                ${residentesPlan.map(r => {
                    const nombreResidente = r.nombre || r.residente_nombre || r.nombre_residente || "Sin nombre";

                    return `
                        <li>
                            <strong>${escaparTexto(nombreResidente)}</strong>
                            ${r.habitacion ? `<span>Hab. ${escaparTexto(r.habitacion)}</span>` : ""}
                        </li>
                    `;
                }).join("")}
            </ul>
        </div>
    `;

    return;
}

    // Vista AUXILIAR: cards operativas
    contenedor.style.display = "block";

    const pendientes = residentesPlan.filter(r => !registroDelResidente(r.id_residente));
    const atendidos = residentesPlan.filter(r => registroDelResidente(r.id_residente));

    contenedor.innerHTML = `
        <div class="section-title">
            Pendientes — PLAN ${currentPlan}
        </div>
        <div id="listaPendientes" class="cards-list"></div>

        <div class="section-title">
            Atendidos
        </div>
        <div id="listaAtendidos" class="cards-list"></div>
    `;

    const listaPendientes = document.getElementById("listaPendientes");
    const listaAtendidos = document.getElementById("listaAtendidos");

    pendientes.forEach(r => {
        listaPendientes.appendChild(crearTarjetaResidente(r));
    });

    atendidos.forEach(r => {
        listaAtendidos.appendChild(crearTarjetaResidente(r));
    });
}
function renderEditList() {
    const contenedor = document.getElementById("editList");

    if (!esAdmin()) {
        if (contenedor) contenedor.innerHTML = "";
        return;
    }
    if (!contenedor) return;

    const residentesPlan = residentesDelPlanActual();

    contenedor.innerHTML = `
        <div style="padding:12px 18px; font-weight:700; color:var(--muted); font-size:0.78em; text-transform:uppercase; letter-spacing:0.3px;">
            Residentes en Plan ${currentPlan}
        </div>
    `;

    if (!residentesPlan.length) {
        contenedor.innerHTML += `
            <div style="padding:14px 18px; color:var(--muted); font-size:0.85em;">
                Sin residentes en este plan.
            </div>
        `;
        return;
    }

    residentesPlan.forEach(r => {
        const riesgoTag = r.riesgo
            ? `<span style="color:var(--danger); font-size:0.8em;"> ⚠️</span>`
            : "";

        contenedor.innerHTML += `
            <div class="edit-item">
                <span>
                    ${escaparTexto(r.residente_nombre)}
                    <small style="color:var(--muted)">
                        · Hab ${escaparTexto(r.habitacion || "-")}
                    </small>
                    ${riesgoTag}
                </span>

                <div>
                    <button onclick="startEdit(${r.id_plan_residente})"
                        style="background:var(--primary-lt);color:var(--primary-dk);border:none;padding:8px 10px;border-radius:7px;cursor:pointer;font-size:0.9em;">
                        ✏️
                    </button>

                    <button onclick="deleteUser(${r.id_plan_residente})"
                        style="background:var(--danger-lt);color:var(--danger);border:none;padding:8px 10px;border-radius:7px;cursor:pointer;font-size:0.9em;margin-left:6px;">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    });
}

function renderHistorial() {
    const tbody = document.querySelector("#matrixTable tbody");

    if (!tbody) return;

    const filtrados = registros
        .filter(r => fechaRegistro(r) === fechaHoy)
        .filter(r => viewAllMode ? true : r.plan_letra === currentPlan)
        .filter(r => r.turno === currentTurno)
        .slice()
        .reverse();

    if (!filtrados.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align:center; color:var(--muted); padding:18px;">
                    Sin registros hoy.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtrados.map(r => {
        const planCol = viewAllMode
            ? `<b>${escaparTexto(r.plan_letra)}</b> — ${escaparTexto(r.habitacion || "-")}`
            : escaparTexto(r.habitacion || "-");

        const incTag = r.incidencia
            ? `<br><small style="color:var(--danger)">⚠️ ${escaparTexto(r.incidencia)}</small>`
            : "";

        return `
            <tr>
                <td>${escaparTexto(r.hora || "")}</td>
                <td>${planCol}</td>
                <td>${escaparTexto(r.residente_nombre || "")}${incTag}</td>
            </tr>
        `;
    }).join("");
}

/* ============================================================
   TARJETA RESIDENTE
   ============================================================ */

function crearTarjetaResidente(r) {
    const card = document.createElement("div");
    const registro = registroDelResidente(r.id_residente);
    const done = !!registro;

    card.className = `user-card ${r.riesgo ? "is-risk" : ""} ${done ? "checked" : ""}`;

    let badges = "";

    if (r.riesgo) {
        badges += `<span class="badge badge-risk">⚠️ RIESGO</span>`;
    }

    if (r.encamado) {
        badges += `<span class="badge badge-cama">🛏️ Encamado</span>`;
    }

    if (r.panal && r.panal !== "-") {
        badges += `<span class="badge badge-pañal">🩺 Pañal ${escaparTexto(r.panal)}</span>`;
    }

    if (done && registro?.hora) {
        badges += `<span class="badge badge-done">✓ ${escaparTexto(registro.hora)}</span>`;
    }

    const obsHtml = r.observacion
        ? `<small>${escaparTexto(r.observacion)}</small>`
        : "";

    const incHtml = registro?.incidencia
        ? `<div class="incidencia-txt">⚠️ <b>Incidencia:</b> ${escaparTexto(registro.incidencia)}</div>`
        : "";

    const badgesHtml = badges
        ? `<div style="margin-top:5px;">${badges}</div>`
        : "";

    card.innerHTML = `
        ${esAdmin()
    ? `<span class="check-round" style="display:inline-flex;align-items:center;justify-content:center;">
           ${done ? "✓" : ""}
       </span>`
    : `<input type="checkbox"
           class="check-round"
           ${done ? "checked" : ""}
           onclick="event.stopPropagation(); toggleCheck(${r.id_residente})">`
}
        <div class="user-info">
            <strong>
                ${escaparTexto(r.residente_nombre)}
                <span style="font-weight:500; color:var(--muted); font-size:0.88rem;">
                    · Hab ${escaparTexto(r.habitacion || "-")}
                </span>
            </strong>

            ${obsHtml}
            ${badgesHtml}
            ${incHtml}
        </div>

        <button class="btn-nota"
                onclick="addIncidencia(${r.id_residente})"
                title="Añadir/editar incidencia">
            📝
        </button>
    `;
    card.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        if (event.target.closest("input")) return;

        toggleCheck(r.id_residente);
    });
    return card;
}

/* ============================================================
   IMPRESIÓN
   ============================================================ */

function prepararImpresion() {
    const s = sesion();

    const registrosHoy = registros
        .filter(r => fechaRegistro(r) === fechaHoy)
        .filter(r => viewAllMode ? true : r.plan_letra === currentPlan)
        .filter(r => r.turno === currentTurno)
        .slice()
        .sort((a, b) => String(a.hora || "").localeCompare(String(b.hora || "")));

    if (!registrosHoy.length) {
        alert("No hay registros para imprimir.");
        return;
    }

    const filas = registrosHoy.map(r => `
        <tr>
            <td>${escaparTexto(r.hora || "")}</td>
            <td>${escaparTexto(r.plan_letra || "")}</td>
            <td>${escaparTexto(r.habitacion || "")}</td>
            <td>${escaparTexto(r.residente_nombre || "")}</td>
            <td>${escaparTexto(r.accion || "")}</td>
            <td>${escaparTexto(r.auxiliar_nombre || s?.nombre || "")}</td>
            <td>${escaparTexto(r.incidencia || "")}</td>
        </tr>
    `).join("");

    const printArea = document.getElementById("printArea");

    if (!printArea) {
        alert("No existe el área de impresión.");
        return;
    }

    printArea.innerHTML = `
        <div class="report-header">
            <h2>REPORTE DE PLANNING</h2>
            <p><strong>Fecha:</strong> ${dateFull.toUpperCase()}</p>
            <p><strong>Turno:</strong> ${currentTurno}</p>
            <p><strong>Acción:</strong> ${accionPorTurno(currentTurno)}</p>
            <p><strong>Auxiliar:</strong> ${escaparTexto(s?.nombre || "No identificado")}</p>
        </div>

        <table class="report-table">
            <thead>
                <tr>
                    <th>Hora</th>
                    <th>Plan</th>
                    <th>Hab.</th>
                    <th>Residente</th>
                    <th>Acción</th>
                    <th>Auxiliar</th>
                    <th>Incidencia</th>
                </tr>
            </thead>
            <tbody>${filas}</tbody>
        </table>
    `;

    window.print();
}

/* ============================================================
   INICIO
   ============================================================ */

async function iniciarPlanning() {
    if (!auth.verificarSesion("index.html")) return;

      const appScreen = document.getElementById("appScreen");
    if (appScreen) appScreen.style.display = "block";

    const loginScreen = document.getElementById("loginScreen");
    if (loginScreen) loginScreen.style.display = "none";
    
    const hora = new Date().getHours();

    if (hora >= 7 && hora < 14) {
        currentTurno = "Mañana";
    } else if (hora >= 14 && hora < 20) {
        currentTurno = "Tarde";
    } else {
        currentTurno = "Noche";
    }

    try {
        prepararInterfazPlanning();

        const turnoSelect = document.getElementById("turnoSelect");
        if (turnoSelect) turnoSelect.value = currentTurno;

        await cargarDatos();
        cargarSelectResidentes();
        render();

    } catch (error) {
        console.error(error);
        alert("No se pudo cargar Planning. Revisa backend, rutas API o consola.");
    }
}

  

window.onload = iniciarPlanning;