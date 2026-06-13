let residentes = [];
let residentesSiesta = [];
let registrosHoy = [];

function sesion() {
    return auth.sesion;
}

function escaparTexto(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function minutosTexto(minutos) {
    const n = Number(minutos || 0);

    if (n < 10) {
        return `⏳ ${n} min · esperar`;
    }

    return `✅ ${n} min · puede levantarse`;
}

function registroPorResidente(idResidente) {
    return registrosHoy.find(r => Number(r.id_residente) === Number(idResidente));
}

async function cargarDatos() {
    const [residentesApi, residentesSiestaApi, registrosApi] = await Promise.all([
        api.obtenerResidentes(),
        api.obtenerSiestaResidentes(),
        api.obtenerSiestaRegistrosHoy()
    ]);

    residentes = residentesApi.filter(r => r.activo !== false);
    residentesSiesta = residentesSiestaApi;
    registrosHoy = registrosApi.filter(r => r.estado !== "cancelado");
}

function render() {
    document.getElementById("sesionInfo").innerText =
        `Usuario: ${sesion()?.nombre || ""} · Rol: ${sesion()?.rol || ""}`;

    renderSelectResidentes();
    renderConfigurados();
    renderAcostar();
    renderLevantar();

    const cardConfig = document.getElementById("configSiestaCard");

    if (sesion()?.rol !== "admin") {
        cardConfig.style.display = "none";
    }
}

function renderSelectResidentes() {
    const select = document.getElementById("residenteSelect");

    const idsConfigurados = residentesSiesta.map(r => Number(r.id_residente));

    const disponibles = residentes.filter(r =>
        !idsConfigurados.includes(Number(r.id_residente))
    );

    select.innerHTML = `
        <option value="">Seleccionar residente...</option>
        ${disponibles.map(r => `
            <option value="${r.id_residente}">
                ${escaparTexto(r.nombre)}
                ${r.habitacion ? " · Hab. " + escaparTexto(r.habitacion) : ""}
            </option>
        `).join("")}
    `;
}

function renderConfigurados() {
    const contenedor = document.getElementById("listaConfigurados");

    if (!residentesSiesta.length) {
        contenedor.innerHTML = `<div class="item">No hay residentes configurados para siesta.</div>`;
        return;
    }

    contenedor.innerHTML = residentesSiesta.map(r => `
        <div class="item">
            <div class="item-top">
                <div>
                    <strong>${escaparTexto(r.nombre)}</strong>
                    <div class="meta">
                        Hab. ${escaparTexto(r.habitacion || "-")}
                    </div>
                    ${r.observacion ? `<div class="meta">${escaparTexto(r.observacion)}</div>` : ""}
                </div>

                <button class="btn-small btn-danger" onclick="quitarResidenteSiesta(${r.id_siesta_residente})">
                    Quitar
                </button>
            </div>
        </div>
    `).join("");
}

function renderAcostar() {
    const contenedor = document.getElementById("listaAcostar");

    if (!residentesSiesta.length) {
        contenedor.innerHTML = `<div class="item">No hay residentes configurados para siesta.</div>`;
        return;
    }

    contenedor.innerHTML = residentesSiesta.map(r => {
        const registro = registroPorResidente(r.id_residente);
        const yaAcostado = !!registro;

        return `
            <div class="item">
                <div class="item-top">
                    <div>
                        <strong>${escaparTexto(r.nombre)}</strong>
                        <div class="meta">
                            Hab. ${escaparTexto(r.habitacion || "-")}
                        </div>

                        ${
                            yaAcostado
                                ? `
                                    <span class="badge">Orden ${registro.orden_acostado}</span>
                                    <span class="badge">${registro.hora_acostado}</span>
                                    <span class="badge">${escaparTexto(registro.auxiliar_acuesta || "")}</span>
                                `
                                : `<span class="badge">Pendiente de acostar</span>`
                        }
                    </div>

                    ${
                        yaAcostado
                            ? `<button class="btn-small btn-danger" onclick="cancelarRegistro(${registro.id_siesta_registro})">Cancelar</button>`
                            : `<button class="btn-small" onclick="acostarResidente(${r.id_residente})">Acostar</button>`
                    }
                </div>
            </div>
        `;
    }).join("");
}

function renderLevantar() {
    const contenedor = document.getElementById("listaLevantar");

    const acostados = registrosHoy
        .filter(r => r.estado === "acostado" || r.estado === "levantado")
        .sort((a, b) => Number(a.orden_acostado) - Number(b.orden_acostado));

    if (!acostados.length) {
        contenedor.innerHTML = `<div class="item">Todavía no hay residentes acostados hoy.</div>`;
        return;
    }

    contenedor.innerHTML = acostados.map(r => {
        const levantado = r.estado === "levantado";
        const puedeLevantarse = Number(r.minutos_siesta || 0) >= 10;

        return `
            <div class="item">
                <div class="item-top">
                    <div>
                        <strong>
                            ${r.orden_acostado}. ${escaparTexto(r.nombre)}
                        </strong>

                        <div class="meta">
                            Hab. ${escaparTexto(r.habitacion || "-")}
                        </div>

                        <div>
                            <span class="badge">Acostado: ${r.hora_acostado}</span>
                            ${
                                levantado
                                    ? `<span class="badge">Levantado: ${r.hora_levantado}</span>`
                                    : `<span class="badge ${puedeLevantarse ? "" : "badge-danger"}">${minutosTexto(r.minutos_siesta)}</span>`
                            }
                        </div>

                        <div class="meta">
                            Acostó: ${escaparTexto(r.auxiliar_acuesta || "-")}
                            ${
                                r.auxiliar_levanta
                                    ? ` · Levantó: ${escaparTexto(r.auxiliar_levanta)}`
                                    : ""
                            }
                        </div>

                        ${
                            r.observacion_acostado
                                ? `<div class="meta">Obs. acostado: ${escaparTexto(r.observacion_acostado)}</div>`
                                : ""
                        }

                        ${
                            r.observacion_levantado
                                ? `<div class="meta">Obs. levantado: ${escaparTexto(r.observacion_levantado)}</div>`
                                : ""
                        }
                    </div>

                    ${
                        levantado
                            ? `<span class="badge">Finalizado</span>`
                            : `<button class="btn-small" onclick="levantarResidente(${r.id_siesta_registro})">Levantar</button>`
                    }
                </div>
            </div>
        `;
    }).join("");
}

async function agregarResidenteSiesta() {
    const idResidente = Number(document.getElementById("residenteSelect").value);
    const observacion = document.getElementById("observacionConfig").value.trim();

    if (!idResidente) {
        alert("Selecciona un residente");
        return;
    }

    try {
        await api.agregarSiestaResidente({
            id_residente: idResidente,
            observacion
        });

        document.getElementById("observacionConfig").value = "";

        await cargarDatos();
        render();
    } catch (error) {
        alert(error.message || "No se pudo agregar el residente a siesta");
    }
}

async function quitarResidenteSiesta(id) {
    if (!confirm("¿Quitar este residente del módulo Siesta?")) return;

    try {
        await api.quitarSiestaResidente(id);
        await cargarDatos();
        render();
    } catch (error) {
        alert(error.message || "No se pudo quitar el residente");
    }
}

async function acostarResidente(idResidente) {
    const observacion = prompt("Observación opcional al acostar:", "");

    if (observacion === null) return;

    try {
        await api.acostarSiestaResidente({
            id_residente: idResidente,
            id_usuario_acuesta: sesion()?.id_usuario || null,
            observacion_acostado: observacion.trim()
        });

        await cargarDatos();
        render();
    } catch (error) {
        alert(error.message || "No se pudo registrar el acostamiento");
    }
}

async function levantarResidente(idRegistro) {
    const registro = registrosHoy.find(r =>
        Number(r.id_siesta_registro) === Number(idRegistro)
    );

    if (!registro) return;

    const minutos = Number(registro.minutos_siesta || 0);

    if (minutos < 10) {
        const continuar = confirm(
            `Este residente solo lleva ${minutos} minutos de siesta. ¿Quieres levantarlo igualmente?`
        );

        if (!continuar) return;
    }

    const observacion = prompt("Observación opcional al levantar:", "");

    if (observacion === null) return;

    try {
        await api.levantarSiestaResidente(idRegistro, {
            id_usuario_levanta: sesion()?.id_usuario || null,
            observacion_levantado: observacion.trim()
        });

        await cargarDatos();
        render();
    } catch (error) {
        alert(error.message || "No se pudo registrar la levantada");
    }
}

async function cancelarRegistro(idRegistro) {
    if (!confirm("¿Cancelar este registro de siesta?")) return;

    try {
        await api.cancelarSiestaRegistro(idRegistro);
        await cargarDatos();
        render();
    } catch (error) {
        alert(error.message || "No se pudo cancelar el registro");
    }
}

async function iniciar() {
    if (!auth.verificarSesion("index.html")) return;

    try {
        await cargarDatos();
        render();
    } catch (error) {
        console.error(error);
        alert("No se pudo cargar el módulo Siesta");
    }
}

window.onload = iniciar;