let residenteEditandoId = null;
let usuarioEditandoId = null;

document.addEventListener("DOMContentLoaded", async () => {
    if (typeof auth === "undefined" || !auth.verificarSesion("index.html")) {
        return;
    }

    const sesion = auth.sesion;

    if (!sesion || sesion.rol !== "admin") {
        alert("Acceso restringido a administradores");
        window.location.href = "menu-principal.html";
        return;
    }

    renderSesion(sesion);

    await cargarResidentes();
    await cargarUsuarios();
});

function renderSesion(sesion) {
    const contenedor = document.getElementById("gestionSesion");

    if (!contenedor) return;

    contenedor.innerHTML = `
        <span>${sesion.nombre}</span>
        <span class="badge-rol badge-admin">Admin</span>
        <button class="btn-secundario" onclick="window.location.href='menu-principal.html'">Menú principal</button>
        <button class="btn-secundario" onclick="auth.cerrarSesion('index.html')">Salir</button>
    `;
}

// ─────────────────────────────────────────────
// RESIDENTES
// ─────────────────────────────────────────────

async function cargarResidentes() {
    const lista = document.getElementById("listaResidentes");

    if (!lista) return;

    try {
        const residentes = await api.obtenerResidentes();

        if (!residentes.length) {
            lista.innerHTML = `<div class="item-admin">No hay residentes registrados.</div>`;
            return;
        }

        lista.innerHTML = `
            <div class="tabla-admin-wrap">
                <table class="tabla-admin">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Hab.</th>
                            <th>Género</th>
                            <th>Movilidad</th>
                            <th>Cognitivo</th>
                            <th>Alimentación</th>
                            <th>Riesgos</th>
                            <th>Obs.</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${residentes.map(renderFilaResidente).join("")}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error(error);
        lista.innerHTML = `<div class="item-admin">❌ Error al cargar residentes.</div>`;
    }
}

function renderFilaResidente(r) {
    const riesgos = [];

    if (r.riesgo_caida) riesgos.push("Caída");
    if (r.riesgo_atragantamiento) riesgos.push("Atrag.");
    if (r.ayuda_comer) riesgos.push("Ayuda comer");
    if (r.requiere_supervision) riesgos.push("Supervisión");

    const nombreSeguro = escaparTexto(r.nombre || "");

    return `
        <tr class="${r.activo ? "" : "fila-inactiva"}">
            <td>
                <strong>${escaparTexto(r.nombre || "-")}</strong><br>
                <small class="celda-muted">ID ${r.id_residente}</small>
            </td>
            <td>${escaparTexto(r.habitacion || "-")}</td>
            <td>${escaparTexto(r.genero || "-")}</td>
            <td>${escaparTexto(r.movilidad || "-")}</td>
            <td>${escaparTexto(r.condicion_cognitiva || "-")}</td>
            <td>${escaparTexto(r.tipo_alimentacion || "-")}</td>
            <td>
                ${
                    riesgos.length
                        ? riesgos.map(x => `<span class="riesgo">${x}</span>`).join("")
                        : '<span class="sin-riesgo">Sin riesgos</span>'
                }
            </td>
            <td>${escaparTexto(r.observaciones || "-")}</td>
            <td>
                <button class="btn-tabla" type="button" onclick="editarResidenteAdmin(${r.id_residente})">
                    Editar
                </button>

                <button class="btn-tabla btn-tabla-danger" type="button" onclick="eliminarResidenteAdmin(${r.id_residente}, '${nombreSeguro}')">
                    Eliminar
                </button>
            </td>
        </tr>
    `;
}

async function guardarResidenteAdmin() {
    const residente = obtenerDatosFormularioResidente();

    if (!residente.nombre || !residente.genero) {
        alert("Completa al menos nombre y género.");
        return;
    }

    try {
        if (residenteEditandoId) {
            await api.editarResidente(residenteEditandoId, residente);
            alert("Residente actualizado correctamente.");
        } else {
            await api.crearResidente(residente);
            alert("Residente guardado correctamente.");
        }

        limpiarFormularioResidente();
        await cargarResidentes();
    } catch (error) {
        console.error(error);
        alert(error.message || "No se pudo guardar el residente.");
    }
}

function obtenerDatosFormularioResidente() {
    return {
        nombre: document.getElementById("residenteNombre").value.trim(),
        genero: document.getElementById("residenteGenero").value,
        habitacion: document.getElementById("residenteHabitacion").value.trim(),
        movilidad: document.getElementById("residenteMovilidad").value,
        condicion_cognitiva: document.getElementById("residenteCognitivo").value,
        tipo_alimentacion: document.getElementById("residenteAlimentacion").value,
        ayuda_comer: document.getElementById("residenteAyudaComer").checked,
        riesgo_caida: document.getElementById("residenteRiesgoCaida").checked,
        riesgo_atragantamiento: document.getElementById("residenteRiesgoAtragantamiento").checked,
        requiere_supervision: document.getElementById("residenteSupervision").checked,
        observaciones: document.getElementById("residenteObservaciones").value.trim()
    };
}

function limpiarFormularioResidente() {
    document.getElementById("residenteNombre").value = "";
    document.getElementById("residenteGenero").value = "";
    document.getElementById("residenteHabitacion").value = "";
    document.getElementById("residenteMovilidad").value = "";
    document.getElementById("residenteCognitivo").value = "";
    document.getElementById("residenteAlimentacion").value = "";
    document.getElementById("residenteObservaciones").value = "";

    document.getElementById("residenteAyudaComer").checked = false;
    document.getElementById("residenteRiesgoCaida").checked = false;
    document.getElementById("residenteRiesgoAtragantamiento").checked = false;
    document.getElementById("residenteSupervision").checked = false;

    residenteEditandoId = null;

    const boton = document.getElementById("btnGuardarResidente");
    if (boton) {
        boton.textContent = "Guardar residente";
    }
}

async function editarResidenteAdmin(id) {
    try {
        const residente = await api.obtenerResidente(id);

        if (!residente) {
            alert("Residente no encontrado.");
            return;
        }

        residenteEditandoId = id;

        document.getElementById("residenteNombre").value = residente.nombre || "";
        document.getElementById("residenteGenero").value = residente.genero || "";
        document.getElementById("residenteHabitacion").value = residente.habitacion || "";
        document.getElementById("residenteMovilidad").value = residente.movilidad || "";
        document.getElementById("residenteCognitivo").value = residente.condicion_cognitiva || "";
        document.getElementById("residenteAlimentacion").value = residente.tipo_alimentacion || "";
        document.getElementById("residenteObservaciones").value = residente.observaciones || "";

        document.getElementById("residenteAyudaComer").checked = !!residente.ayuda_comer;
        document.getElementById("residenteRiesgoCaida").checked = !!residente.riesgo_caida;
        document.getElementById("residenteRiesgoAtragantamiento").checked = !!residente.riesgo_atragantamiento;
        document.getElementById("residenteSupervision").checked = !!residente.requiere_supervision;

        const details = document.querySelector(".form-details");
        if (details) details.open = true;

        const boton = document.getElementById("btnGuardarResidente");
        if (boton) {
            boton.textContent = "Actualizar residente";
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    } catch (error) {
        console.error(error);
        alert(error.message || "No se pudo cargar el residente para editar.");
    }
}

async function eliminarResidenteAdmin(id, nombre) {
    const confirmar = confirm(
        `⚠️ Vas a desactivar a ${nombre}.\n\n` +
        "El residente no se borrará físicamente de la base de datos.\n" +
        "Quedará marcado como inactivo.\n\n" +
        "¿Quieres continuar?"
    );

    if (!confirmar) return;

    try {
        const resultado = await api.eliminarResidente(id);

        alert(resultado.mensaje || "Residente desactivado correctamente.");

        await cargarResidentes();
    } catch (error) {
        console.error(error);
        alert(error.message || "No se pudo desactivar el residente.");
    }
}

// ─────────────────────────────────────────────
// USUARIOS
// ─────────────────────────────────────────────

async function cargarUsuarios() {
    const lista = document.getElementById("listaUsuariosApp");

    if (!lista) return;

    try {
        const usuarios = await api.obtenerUsuarios();

        if (!usuarios.length) {
            lista.innerHTML = `<div class="item-admin">No hay usuarios registrados.</div>`;
            return;
        }

        lista.innerHTML = `
            <div class="tabla-admin-wrap">
                <table class="tabla-admin tabla-usuarios">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Creado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${usuarios.map(renderFilaUsuario).join("")}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error(error);
        lista.innerHTML = `<div class="item-admin">❌ Error al cargar usuarios.</div>`;
    }
}

function renderFilaUsuario(u) {
    const badgeClass = u.rol === "admin" ? "badge-admin" : "badge-auxiliar";
    const rolTexto = u.rol === "admin" ? "Admin" : "Auxiliar";
    const estadoTexto = u.activo ? "Activo" : "Inactivo";
    const nombreSeguro = escaparTexto(u.nombre || "");

    return `
        <tr class="${u.activo ? "" : "fila-inactiva"}">
            <td>
                <strong>${escaparTexto(u.nombre || "-")}</strong><br>
                <small class="celda-muted">ID ${u.id_usuario}</small>
            </td>
            <td>
                <span class="badge-rol ${badgeClass}">${rolTexto}</span>
            </td>
            <td>${estadoTexto}</td>
            <td>${formatearFecha(u.fecha_creacion)}</td>
            <td>
                <button class="btn-tabla" type="button" onclick="editarUsuarioAdmin(${u.id_usuario})">
                    Editar
                </button>

                ${
    u.activo
        ? `
            <button class="btn-tabla btn-tabla-danger" type="button" onclick="eliminarUsuarioAdmin(${u.id_usuario}, '${nombreSeguro}')">
                Desactivar
            </button>
        `
        : `
            <button class="btn-tabla" type="button" onclick="reactivarUsuarioAdmin(${u.id_usuario}, '${nombreSeguro}')">
                Reactivar
            </button>
        `
}
            </td>
        </tr>
    `;
}

async function guardarUsuarioAdmin() {
    const usuario = {
        nombre: document.getElementById("usuarioNombre").value.trim(),
        rol: document.getElementById("usuarioRol").value,
        pin: document.getElementById("usuarioPin").value.trim()
    };

    if (!usuario.nombre || !usuario.rol || !usuario.pin) {
        alert("Completa nombre, rol y PIN.");
        return;
    }

    if (!/^\d{4}$/.test(usuario.pin)) {
        alert("El PIN debe tener exactamente 4 dígitos.");
        return;
    }

    try {
        if (usuarioEditandoId) {
            await api.editarUsuario(usuarioEditandoId, usuario);
            alert("Usuario actualizado correctamente.");
        } else {
            await api.crearUsuario(usuario);
            alert("Usuario guardado correctamente.");
        }

        limpiarFormularioUsuario();
        await cargarUsuarios();
    } catch (error) {
        console.error(error);
        alert(error.message || "No se pudo guardar el usuario.");
    }
}

function limpiarFormularioUsuario() {
    document.getElementById("usuarioNombre").value = "";
    document.getElementById("usuarioRol").value = "";
    document.getElementById("usuarioPin").value = "";

    usuarioEditandoId = null;

    const boton = document.getElementById("btnGuardarUsuario");
    if (boton) {
        boton.textContent = "Guardar usuario";
    }
}

async function editarUsuarioAdmin(id) {
    try {
        const usuarios = await api.obtenerUsuarios();
        const usuario = usuarios.find(u => u.id_usuario === id);

        if (!usuario) {
            alert("Usuario no encontrado.");
            return;
        }

        usuarioEditandoId = id;

        document.getElementById("usuarioNombre").value = usuario.nombre || "";
        document.getElementById("usuarioRol").value = usuario.rol || "";
        document.getElementById("usuarioPin").value = usuario.pin || "";

        const boton = document.getElementById("btnGuardarUsuario");
        if (boton) {
            boton.textContent = "Actualizar usuario";
        }

        const details = document.querySelectorAll(".form-details")[1];
        if (details) {
            details.open = true;
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    } catch (error) {
        console.error(error);
        alert(error.message || "No se pudo cargar el usuario para editar.");
    }
}

async function eliminarUsuarioAdmin(id, nombre) {
    const sesionActual = auth.sesion;

    if (sesionActual && sesionActual.id_usuario === id) {
        alert("No puedes eliminar tu propia cuenta activa.");
        return;
    }

    const confirmar = confirm(
        `⚠️ Vas a desactivar el usuario "${nombre}".\n\n` +
        "Esta acción quitará su acceso a la aplicación.\n\n" +
        "¿Quieres continuar?"
    );

    if (!confirmar) return;

    try {
        const resultado = await api.eliminarUsuario(id);

        alert(resultado.mensaje || "Usuario desactivado correctamente.");

        await cargarUsuarios();
    } catch (error) {
        console.error(error);
        alert(error.message || "No se pudo desactivar el usuario.");
    }
}

async function reactivarUsuarioAdmin(id, nombre) {
    const confirmar = confirm(
        `Vas a reactivar el usuario "${nombre}".\n\n` +
        "Ese usuario volverá a poder iniciar sesión.\n\n" +
        "¿Quieres continuar?"
    );

    if (!confirmar) return;

    try {
        const resultado = await api.reactivarUsuario(id);

        alert(resultado.mensaje || "Usuario reactivado correctamente.");

        await cargarUsuarios();
    } catch (error) {
        console.error(error);
        alert(error.message || "No se pudo reactivar el usuario.");
    }
}
// ─────────────────────────────────────────────
// BACKUP
// ─────────────────────────────────────────────

async function exportarBackup() {
    alert("Backup pendiente de implementar en backend.");
}

async function importarBackup(event) {
    event.target.value = "";
    alert("Restauración de backup pendiente de implementar en backend.");
}

// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────

function escaparTexto(valor) {
    return String(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatearFecha(fecha) {
    if (!fecha) return "-";

    try {
        return new Date(fecha).toLocaleDateString("es-ES");
    } catch {
        return "-";
    }
}