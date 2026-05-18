// ─────────────────────────────────────────────────────────────
// BioSenior conectado a PostgreSQL
// Residentes y registros se cargan desde la API.
// No se usa localStorage para datos clínicos.
// ─────────────────────────────────────────────────────────────

let residentes = [];
let logs = [];
let tiposDeposicion = [];

let registroActual = {
    id_residente: null,
    nombre: "",
    genero: "",
    depo: "",
    mic: "",
    obs: ""
};

let letraActiva = "";
let filtroFechaActivo = "hoy";
let filtroQuienModo = "todos";
let filtroTurnoActivo = "todos";
let filtroDepoActivo = "todas";

let _modalCallback = null;

// ─────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────

function mostrarToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;

    t.innerText = msg;
    t.classList.add("visible");

    setTimeout(() => t.classList.remove("visible"), 2500);
}

function escaparTexto(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function generoTexto(genero) {
    if (genero === "femenino") return "Femenino";
    if (genero === "masculino") return "Masculino";
    return genero || "-";
}

function generoIcono(genero) {
    if (genero === "femenino") return "♀️";
    if (genero === "masculino") return "♂️";
    return "";
}

function calcularTurno(hora) {
    if (hora >= 7 && hora < 14) return "Mañana";
    if (hora >= 14 && hora < 20) return "Tarde";
    return "Noche";
}

function depoEmoji(depo) {
    const map = {
        Normal: "🌭",
        Blanda: "☁️",
        Pastosa: "💩",
        Líquida: "💧",
        Estreñida: "🪨",
        No: "❌"
    };

    return `${map[depo] || ""} ${depo || "---"}`;
}

function turnoEmoji(turno) {
    const map = {
        Mañana: "🌅",
        Tarde: "🌇",
        Noche: "🌙"
    };

    return `${map[turno] || ""} ${turno || "---"}`;
}

function obtenerIdTipoDeposicion(nombreTipo) {
    const tipo = tiposDeposicion.find(t => t.nombre === nombreTipo);
    return tipo ? tipo.id_tipo : null;
}

function normalizarRegistroApi(registro) {
    return {
        id: registro.id_registro,
        id_residente: registro.id_residente,
        fechaISO: registro.fecha_iso,
        fechaFull: registro.hora,
        nombre: registro.residente_nombre,
        genero: registro.genero,
        depo: registro.tipo_deposicion,
        mic: registro.miccion,
        turno: registro.turno,
        auxiliar: registro.usuario_nombre,
        obs: registro.observacion
    };
}

// ─────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────

function abrirModal(mensaje, callback) {
    const msg = document.getElementById("modalMsg");
    const overlay = document.getElementById("modalOverlay");
    const btn = document.getElementById("modalConfirmBtn");

    if (!msg || !overlay || !btn) {
        if (confirm(mensaje)) callback();
        return;
    }

    msg.textContent = mensaje;
    _modalCallback = callback;
    overlay.classList.add("visible");

    btn.onclick = () => {
        const accionConfirmada = _modalCallback;
        cerrarModal();

        if (accionConfirmada) {
            accionConfirmada();
        }
    };
}

function cerrarModal() {
    const overlay = document.getElementById("modalOverlay");
    if (overlay) overlay.classList.remove("visible");

    _modalCallback = null;
}

// ─────────────────────────────────────────────────────────────
// Sesión
// ─────────────────────────────────────────────────────────────

function renderSesionBar() {
    const s = auth.sesion;
    const bar = document.getElementById("sesionBar");

    if (!s || !bar) return;

    const rolColor = s.rol === "admin"
        ? "background:#fef3e2;color:#7a4a00"
        : "background:#e6f4f6;color:#0a5a68";

    bar.innerHTML = `
        <span class="sesion-nombre">${escaparTexto(s.nombre)}</span>
        <span class="sesion-rol" style="${rolColor};padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;">
            ${s.rol === "admin" ? "Admin" : "Auxiliar"}
        </span>
        <button class="sesion-hub" onclick="window.location.href='menu-principal.html'">← Menú principal</button>
        <button class="sesion-salir" onclick="auth.cerrarSesion('index.html')">Salir</button>
    `;
}

// ─────────────────────────────────────────────────────────────
// Observaciones
// ─────────────────────────────────────────────────────────────

function toggleObs() {
    const obs = document.getElementById("obs");
    const arrow = document.getElementById("obsArrow");

    if (!obs || !arrow) return;

    const visible = obs.style.display !== "none";

    obs.style.display = visible ? "none" : "block";
    arrow.innerText = visible ? "▶" : "▼";
}

// ─────────────────────────────────────────────────────────────
// Alertas
// ─────────────────────────────────────────────────────────────

function diasSinDeposicion(nombre) {
    let dias = 0;

    for (let i = 0; i <= 7; i++) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);

        const fechaISO = fecha.toISOString().split("T")[0];
        const registrosDia = logs.filter(l => l.nombre === nombre && l.fechaISO === fechaISO);

        if (registrosDia.length === 0) {
            if (i === 0) continue;
            break;
        }

        const tuvoDepo = registrosDia.some(l => l.depo !== "No");

        if (tuvoDepo) break;

        dias++;
    }

    return dias;
}

function renderAlertas() {
    const bloque = document.getElementById("bloqueAlertas");

    if (!bloque) return;

    const alertas = [];

    residentes
        .filter(r => r.activo !== false)
        .forEach(r => {
            const dias = diasSinDeposicion(r.nombre);

            if (dias >= 2) {
                alertas.push({
                    nombre: r.nombre,
                    dias
                });
            }
        });

    alertas.sort((a, b) => b.dias - a.dias);

    if (!alertas.length) {
        bloque.style.display = "none";
        bloque.innerHTML = "";
        return;
    }

    const filas = alertas.map(a => {
        const nivel = a.dias >= 3 ? "nivel-3" : "nivel-2";

        return `
            <div class="alerta-fila ${nivel}">
                <span class="alerta-nombre-txt ${nivel}">${escaparTexto(a.nombre)}</span>
                <span class="alerta-pill ${nivel}">⚠ ${a.dias} días</span>
            </div>
        `;
    }).join("");

    bloque.innerHTML = `
        <div class="alertas-bloque">
            <p class="alertas-titulo">⚠ Atención: hay residentes sin evacuación prolongada</p>

            <button class="btn-ver-alertas" onclick="toggleListaAlertas()">
                Ver residentes en alerta (${alertas.length})
            </button>

            <div id="listaAlertasResidentes" style="display:none;">
                ${filas}
            </div>
        </div>
    `;

    bloque.style.display = "block";
}

function toggleListaAlertas() {
    const lista = document.getElementById("listaAlertasResidentes");

    if (!lista) return;

    lista.style.display = lista.style.display === "none" ? "block" : "none";
}

// ─────────────────────────────────────────────────────────────
// Registro
// ─────────────────────────────────────────────────────────────

function selectDepo(v, el) {
    registroActual.depo = v;

    document
        .querySelectorAll("#depoSection .btn-o")
        .forEach(b => b.classList.remove("active"));

    if (el) el.classList.add("active");

    if (v !== "No") {
        const micSi = document.getElementById("micSi");
        selectMic("Sí", micSi);
    }
}

function selectMic(v, el) {
    registroActual.mic = v;

    document
        .querySelectorAll("#micSection .btn-o")
        .forEach(b => b.classList.remove("active"));

    if (el) el.classList.add("active");
}

async function guardar() {
    if (!registroActual.id_residente || !registroActual.depo || !registroActual.mic) {
        mostrarToast("⚠ Selecciona residente y datos");
        return;
    }

    const idTipo = obtenerIdTipoDeposicion(registroActual.depo);

    if (!idTipo) {
        mostrarToast("❌ Tipo de deposición no encontrado");
        return;
    }

    const ahora = new Date();

    const datos = {
        id_residente: registroActual.id_residente,
        id_tipo: idTipo,
        id_usuario: auth.sesion ? auth.sesion.id_usuario : null,
        miccion: registroActual.mic,
        turno: calcularTurno(ahora.getHours()),
        observacion: document.getElementById("obs")?.value.trim() || null
    };

    try {
        await api.crearDeposicion(datos);

        await cargarDatosServidor();

        const nombreGuardado = registroActual.nombre;

        limpiarFormularioRegistro();
        renderTodo();

        mostrarToast(`✅ Registro guardado: ${nombreGuardado}`);
    } catch (error) {
        console.error(error);
        mostrarToast(error.message || "❌ No se pudo guardar el registro");
    }
}

function limpiarFormularioRegistro() {
    registroActual = {
        id_residente: null,
        nombre: "",
        genero: "",
        depo: "",
        mic: "",
        obs: ""
    };

    letraActiva = "";

    const obs = document.getElementById("obs");
    const obsArrow = document.getElementById("obsArrow");
    const listaUsuarios = document.getElementById("listaUsuarios");

    if (obs) {
        obs.value = "";
        obs.style.display = "none";
    }

    if (obsArrow) obsArrow.innerText = "▶";
    if (listaUsuarios) listaUsuarios.innerHTML = "";

    document
        .querySelectorAll(".btn-o")
        .forEach(b => b.classList.remove("active"));
}

// ─────────────────────────────────────────────────────────────
// ABC y selección de residentes
// ─────────────────────────────────────────────────────────────

function renderABC() {
    const bar = document.getElementById("abcBar");

    if (!bar) return;

    bar.innerHTML = "";

    "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("").forEach(l => {
        const b = document.createElement("button");

        b.className = "btn-l" + (letraActiva === l ? " active" : "");
        b.innerText = l;

        b.onclick = () => {
            letraActiva = l;
            renderABC();
            renderUsuarios(l);
        };

        bar.appendChild(b);
    });
}

function renderUsuarios(letra) {
    const box = document.getElementById("listaUsuarios");

    if (!box) return;

    box.innerHTML = "";

    residentes
        .filter(r => r.activo !== false)
        .filter(r => {
            const nombre = r.nombre || "";
            const inicial = nombre.normalize("NFD")[0]?.toUpperCase();

            return inicial === letra || nombre[0]?.toUpperCase() === letra;
        })
        .forEach(r => {
            const dias = diasSinDeposicion(r.nombre);
            const div = document.createElement("div");
            const isSelected = registroActual.id_residente === r.id_residente;

            let claseAlerta = "";

            if (!isSelected && dias >= 3) claseAlerta = " alerta-3";
            else if (!isSelected && dias === 2) claseAlerta = " alerta-2";

            div.className = "usuario-opt" + (isSelected ? " selected" : claseAlerta);

            const span = document.createElement("span");
            span.className = "u-nombre";
            span.innerText = r.nombre;

            div.appendChild(span);

            if (!isSelected && dias >= 2) {
                const badge = document.createElement("span");
                badge.className = "alerta-badge " + (dias >= 3 ? "b-3" : "b-2");
                badge.innerText = `⚠ ${dias}d`;
                div.appendChild(badge);
            }

            div.onclick = () => {
                registroActual.id_residente = r.id_residente;
                registroActual.nombre = r.nombre;
                registroActual.genero = r.genero;

                document.querySelectorAll(".usuario-opt").forEach(d => d.classList.remove("selected"));
                div.classList.remove("alerta-2", "alerta-3");
                div.classList.add("selected");

                setTimeout(() => {
                    const depoSection = document.getElementById("depoSection");
                    if (depoSection) {
                        depoSection.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                    }
                }, 100);
            };

            box.appendChild(div);
        });
}

// ─────────────────────────────────────────────────────────────
// Gestión de residentes dentro de BioSenior
// ─────────────────────────────────────────────────────────────
// La gestión completa de residentes vive en Gestión Admin.
// Este bloque se mantiene solo como lectura simple para no romper el HTML.

function renderGestion() {
    const lista = document.getElementById("gestionLista");

    if (!lista) return;

    lista.innerHTML = residentes
        .filter(r => r.activo !== false)
        .map(r => `
            <div style="display:flex; justify-content:space-between; gap:8px; padding:10px; border-bottom:1px solid #eee; align-items:center;">
                <span>${escaparTexto(r.nombre)} ${generoIcono(r.genero)}</span>
                <small style="color:#999;">ID ${r.id_residente}</small>
            </div>
        `)
        .join("");
}

function selectGenAdmin() {
    mostrarToast("La gestión de residentes se realiza desde Gestión Admin");
}

function agregarUsuario() {
    mostrarToast("Alta de residentes disponible en Gestión Admin");
}

function editarUsuario() {
    mostrarToast("Edición de residentes disponible en Gestión Admin");
}

function eliminarUsuario() {
    mostrarToast("Desactivación de residentes disponible en Gestión Admin");
}

// ─────────────────────────────────────────────────────────────
// Filtros historial
// ─────────────────────────────────────────────────────────────

function selFiltroFecha(valor, el) {
    filtroFechaActivo = valor;

    document
        .querySelectorAll("#tagFecha .tag-btn")
        .forEach(t => t.className = "tag-btn");

    if (el) el.classList.add("act-blue");

    const filtro = document.getElementById("filtro");
    const hoy = new Date().toISOString().split("T")[0];

    if (filtro) {
        if (valor === "hoy") {
            filtro.value = hoy;
        } else if (valor === "ayer") {
            const ayer = new Date();
            ayer.setDate(ayer.getDate() - 1);
            filtro.value = ayer.toISOString().split("T")[0];
        } else {
            filtro.value = "";
        }
    }

    if (document.getElementById("histContent")?.classList.contains("open")) {
        renderTabla();
    }
}

function selQuien(modo, el, cls) {
    filtroQuienModo = modo;

    document
        .querySelectorAll("#quienGrid .quien-icono")
        .forEach(t => t.className = "quien-icono");

    const filtroUsuario = document.getElementById("filtroUsuario");
    const filtroGenero = document.getElementById("filtroGenero");

    if (filtroUsuario) {
        filtroUsuario.value = "";
        filtroUsuario.classList.remove("act");
    }

    if (filtroGenero) {
        filtroGenero.value = modo === "masculino" || modo === "femenino" ? modo : "";
    }

    if (el) el.classList.add(cls);

    renderTabla();
}

function selTurnoSelect() {
    const select = document.getElementById("filtroTurno");
    if (!select) return;

    filtroTurnoActivo = select.value;
    renderTabla();
}

function selDeposicionSelect() {
    const select = document.getElementById("filtroDeposicion");
    if (!select) return;

    filtroDepoActivo = select.value;
    renderTabla();
}

function selUsuarioConcreto() {
    const val = document.getElementById("filtroUsuario")?.value;

    if (!val) {
        limpiarFiltros();
        return;
    }

    filtroQuienModo = "usuario";

    document
        .querySelectorAll("#quienGrid .quien-icono")
        .forEach(t => t.className = "quien-icono");

    const filtroGenero = document.getElementById("filtroGenero");
    const filtroUsuario = document.getElementById("filtroUsuario");

    if (filtroGenero) filtroGenero.value = "";
    if (filtroUsuario) filtroUsuario.classList.add("act");

    renderTabla();
}

// ─────────────────────────────────────────────────────────────
// Historial
// ─────────────────────────────────────────────────────────────

function toggleHistorial() {
    const content = document.getElementById("histContent");
    const arrow = document.getElementById("histArrow");
    const toggle = document.getElementById("histToggle");

    if (!content || !arrow || !toggle) return;

    const open = content.classList.toggle("open");

    arrow.style.transform = open ? "rotate(180deg)" : "";
    toggle.style.borderBottomLeftRadius = open ? "0" : "10px";
    toggle.style.borderBottomRightRadius = open ? "0" : "10px";
    toggle.style.borderBottom = open ? "none" : "";

    if (open) renderTabla();

    const btnFlotante = document.getElementById("btnPrintFlotante");
    if (btnFlotante) btnFlotante.classList.toggle("visible", open);
}

function actualizarSubtitulo() {
    const sub = document.getElementById("subtituloHistorial");

    if (!sub) return;

    const partes = [];

    if (filtroFechaActivo === "hoy") partes.push("Hoy");
    else if (filtroFechaActivo === "ayer") partes.push("Ayer");
    else if (filtroFechaActivo === "semana") partes.push("Esta semana");
    else partes.push("Historial completo");

    const fU = document.getElementById("filtroUsuario")?.value;

    if (filtroQuienModo === "masculino") partes.push("Masculino");
    else if (filtroQuienModo === "femenino") partes.push("Femenino");
    else if (filtroQuienModo === "usuario" && fU) partes.push(fU);

    sub.innerText = partes.join(" · ");
}

function obtenerRegistrosFiltrados() {
    const fU = document.getElementById("filtroUsuario")?.value;

    const hoy = new Date().toISOString().split("T")[0];

    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const ayerISO = ayer.toISOString().split("T")[0];

    const semana = new Date();
    semana.setDate(semana.getDate() - 6);
    const semanaISO = semana.toISOString().split("T")[0];

    return logs.filter(l => {
        let matchFecha = true;

        if (filtroFechaActivo === "hoy") {
            matchFecha = l.fechaISO === hoy;
        } else if (filtroFechaActivo === "ayer") {
            matchFecha = l.fechaISO === ayerISO;
        } else if (filtroFechaActivo === "semana") {
            matchFecha = l.fechaISO >= semanaISO && l.fechaISO <= hoy;
        }

        let matchQuien = true;

        if (filtroQuienModo === "usuario") {
            matchQuien = l.nombre === fU;
        } else if (filtroQuienModo === "masculino") {
            matchQuien = l.genero === "masculino";
        } else if (filtroQuienModo === "femenino") {
            matchQuien = l.genero === "femenino";
        }

        let matchTurno = true;

        if (filtroTurnoActivo !== "todos") {
            matchTurno = l.turno === filtroTurnoActivo;
        }

        let matchDeposicion = true;

        if (filtroDepoActivo !== "todas") {
            matchDeposicion = l.depo === filtroDepoActivo;
        }

        return matchFecha && matchQuien && matchTurno && matchDeposicion;
    });
}

function renderTabla() {
    const cuerpo = document.getElementById("cuerpo");

    if (!cuerpo) return;

    const registrosFiltrados = obtenerRegistrosFiltrados();

    const filas = registrosFiltrados.map(l => `
        <tr>
            <td>${l.fechaISO ? l.fechaISO.substring(5) : ""}<br><small style="color:#888;">${l.fechaFull || ""}</small></td>
            <td><b>${escaparTexto(l.nombre || "")}</b></td>
            <td>${escaparTexto(l.auxiliar || "---")}</td>
            <td>${escaparTexto(l.turno || "---")}</td>
            <td>${escaparTexto(l.depo || "---")}</td>
            <td>${escaparTexto(l.mic || "---")}</td>
            <td>${escaparTexto(l.obs || "-")}</td>
            <td class="no-print">
                <button onclick="borrarLog(${l.id})" style="border:none; background:none; color:red; cursor:pointer;" aria-label="Borrar registro">✕</button>
            </td>
        </tr>
    `).join("");

    cuerpo.innerHTML = filas;

    actualizarSubtitulo();
}

function renderTarjetas(registros) {
    const box = document.getElementById("historialTarjetas");

    if (!box) return;

    if (!registros.length) {
        box.innerHTML = '<p style="text-align:center; color:#aaa; font-size:13px; padding:20px 0;">Sin registros para este filtro</p>';
        return;
    }

    box.innerHTML = registros.map(l => {
        const obsHtml = l.obs && l.obs !== "-"
            ? `<div class="reg-obs">${escaparTexto(l.obs)}</div>`
            : "";

        const micHtml = l.mic === "Sí"
            ? '<span class="pill pill-mic">✅ Micción</span>'
            : '<span class="pill" style="background:#fff5f5;color:#c0392b;">❌ Micción</span>';

        return `
            <div class="reg-card">
                <div class="reg-card-top">
                    <span class="reg-nombre">${escaparTexto(l.nombre)}</span>
                    <span class="reg-hora">${l.fechaISO ? l.fechaISO.substring(5) : ""} · ${l.fechaFull || ""}</span>
                </div>

                <div class="reg-pills">
                    <span class="pill pill-depo">${depoEmoji(l.depo)}</span>
                    ${micHtml}
                    <span class="pill pill-turno">${turnoEmoji(l.turno)}</span>
                </div>

                ${obsHtml}

                <div class="reg-del">
                    <button onclick="borrarLog(${l.id})" aria-label="Borrar registro">✕ borrar</button>
                </div>
            </div>
        `;
    }).join("");
}

function limpiarFiltros() {
    filtroFechaActivo = "hoy";
    filtroQuienModo = "todos";
    filtroTurnoActivo = "todos";
    filtroDepoActivo = "todas";

    const filtroUsuario = document.getElementById("filtroUsuario");
    const filtroGenero = document.getElementById("filtroGenero");
    const filtro = document.getElementById("filtro");
    const filtroTurno = document.getElementById("filtroTurno");
    const filtroDeposicion = document.getElementById("filtroDeposicion");

    if (filtroUsuario) {
        filtroUsuario.value = "";
        filtroUsuario.classList.remove("act");
    }

    if (filtroGenero) filtroGenero.value = "";
    if (filtro) filtro.value = new Date().toISOString().split("T")[0];
    if (filtroTurno) filtroTurno.value = "todos";
    if (filtroDeposicion) filtroDeposicion.value = "todas";

    document
        .querySelectorAll("#tagFecha .tag-btn")
        .forEach(t => t.className = "tag-btn");

    const primerTag = document.querySelector("#tagFecha .tag-btn");
    if (primerTag) primerTag.classList.add("act-blue");

    document
        .querySelectorAll("#quienGrid .quien-icono")
        .forEach(t => t.className = "quien-icono");

    const primerQuien = document.querySelector("#quienGrid .quien-btn");
    if (primerQuien) primerQuien.classList.add("act");

    renderTabla();
}

function actualizarSelectUsuarios() {
    const select = document.getElementById("filtroUsuario");

    if (!select) return;

    select.innerHTML = '<option value="">Seleccionar residente...</option>';

    residentes
        .filter(r => r.activo !== false)
        .forEach(r => {
            select.innerHTML += `<option value="${escaparTexto(r.nombre)}">${escaparTexto(r.nombre)}</option>`;
        });
}

// ─────────────────────────────────────────────────────────────
// Borrar registro
// ─────────────────────────────────────────────────────────────

async function borrarLog(id) {
    abrirModal("¿Borrar este registro?", async () => {
        try {
            await api.eliminarDeposicion(id);

            await cargarDatosServidor();

            renderTodo();

            mostrarToast("✅ Registro eliminado");
        } catch (error) {
            console.error(error);
            mostrarToast(error.message || "❌ No se pudo eliminar el registro");
        }
    });
}

// ─────────────────────────────────────────────────────────────
// Impresión
// ─────────────────────────────────────────────────────────────

function prepararImpresion() {
    const fF = document.getElementById("filtro")?.value;
    const fU = document.getElementById("filtroUsuario")?.value;

    const fechaTexto = fF
        ? new Date(fF + "T00:00:00").toLocaleDateString("es-ES")
        : "Historial completo";

    let quienTexto = "Todos los residentes";

    if (filtroQuienModo === "usuario" && fU) quienTexto = fU;
    else if (filtroQuienModo === "masculino") quienTexto = "Masculino";
    else if (filtroQuienModo === "femenino") quienTexto = "Femenino";

    const auxiliarNombre = auth.sesion ? auth.sesion.nombre : "";
    const registros = obtenerRegistrosFiltrados();

    const filas = registros.map(l => `
        <tr>
            <td>${l.fechaISO ? l.fechaISO.substring(5) : ""} ${l.fechaFull || ""}</td>
            <td>${escaparTexto(l.nombre)}</td>
            <td>${escaparTexto(l.auxiliar || "---")}</td>
            <td>${escaparTexto(l.turno || "---")}</td>
            <td>${escaparTexto(l.depo || "---")}</td>
            <td>${escaparTexto(l.mic || "---")}</td>
            <td>${escaparTexto(l.obs || "-")}</td>
        </tr>
    `).join("");

    const logoUrl = window.location.origin + window.location.pathname.replace("biosenior.html", "") + "img/Logo-SGP-blanc.png";

    const anterior = document.getElementById("zonaImpresion");
    if (anterior) anterior.remove();

    const zona = document.createElement("div");
    zona.id = "zonaImpresion";

    zona.innerHTML = `
        <div class="rh">
            <img src="${logoUrl}" alt="SGP" onerror="this.style.display='none'">
            <div class="rh-info">
                <p class="rh-titulo">Reporte Bio-Senior</p>
                <p class="rh-meta">Fecha: ${fechaTexto} &nbsp;·&nbsp; ${quienTexto}${auxiliarNombre ? " &nbsp;·&nbsp; Auxiliar: " + escaparTexto(auxiliarNombre) : ""}</p>
            </div>
        </div>

        <div class="rb">
            <table>
                <thead>
                    <tr>
                        <th>Hora</th>
                        <th>Residente</th>
                        <th>Auxiliar</th>
                        <th>Turno</th>
                        <th>Deposición</th>
                        <th>Micción</th>
                        <th>Observaciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas || '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:16px;">Sin registros</td></tr>'}
                </tbody>
            </table>

            <p class="rf">Diseño funcional por TP &copy; 2026 &nbsp;·&nbsp; ${registros.length} registros</p>
        </div>
    `;

    document.body.appendChild(zona);
    window.print();
}

// ─────────────────────────────────────────────────────────────
// Backup/importación antigua desactivada
// ─────────────────────────────────────────────────────────────

function exportarDatos() {
    mostrarToast("Backup pendiente desde módulo Gestión Admin");
}

function exportarCuentas() {
    mostrarToast("Gestión de cuentas disponible en Gestión Admin");
}

function importarCuentas(event) {
    if (event) event.target.value = "";
    mostrarToast("Importación de cuentas desactivada. Usa Gestión Admin.");
}

function importarDatos(event) {
    if (event) event.target.value = "";
    mostrarToast("Importación antigua desactivada. Usa PostgreSQL.");
}

function importarExcelUsuarios(event) {
    if (event) event.target.value = "";
    mostrarToast("Importación Excel pendiente para PostgreSQL.");
}

function importarExcelCuentas(event) {
    if (event) event.target.value = "";
    mostrarToast("Importación de cuentas disponible desde Gestión Admin.");
}

function cargarDatosPrueba() {
    mostrarToast("Datos de prueba locales desactivados.");
}

// ─────────────────────────────────────────────────────────────
// Carga de datos
// ─────────────────────────────────────────────────────────────

async function cargarDatosServidor() {
    const [residentesApi, deposicionesApi, tiposApi] = await Promise.all([
        api.obtenerResidentes(),
        api.obtenerDeposiciones(),
        api.obtenerTiposDeposicion()
    ]);

    residentes = residentesApi;
    logs = deposicionesApi.map(normalizarRegistroApi);
    tiposDeposicion = tiposApi;
}

function renderTodo() {
    renderGestion();
    actualizarSelectUsuarios();
    renderABC();
    renderAlertas();

    const histContent = document.getElementById("histContent");

    if (histContent && histContent.classList.contains("open")) {
        renderTabla();
    }
}

async function iniciarApp() {
    if (!auth.verificarSesion("index.html")) return;

    const s = auth.sesion;

    const bloqueAdmin = document.getElementById("bloqueAdmin");
    if (bloqueAdmin) bloqueAdmin.style.display = "none";

    const bloqueRegistro = document.getElementById("bloqueRegistro");
    if (bloqueRegistro) {
        bloqueRegistro.style.display = s.rol === "auxiliar" ? "block" : "none";
    }

    renderSesionBar();

    const filtro = document.getElementById("filtro");
    if (filtro) filtro.value = new Date().toISOString().split("T")[0];

    filtroFechaActivo = "hoy";
    filtroQuienModo = "todos";

    try {
        await cargarDatosServidor();
        renderTodo();
    } catch (error) {
        console.error(error);
        mostrarToast("⚠ No se pudieron cargar datos desde PostgreSQL");
    }
}

window.onload = () => {
    if (typeof auth !== "undefined") {
        iniciarApp();
    }
};