// NOTA DE NOMENCLATURA:
// En este archivo se mantiene el nombre interno "usuarios" por compatibilidad
// con versiones anteriores del MVP y con los backups existentes.
// En la interfaz, "usuarios" se refiere a residentes de la residencia.

const store = {
    get: (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
};

let usuarios = store.get('sgp_usuarios') || [];
let logs = store.get('logs_enfermeria') || [];
let registroActual = { nombre: "", genero: "", depo: "", mic: "", obs: "" };
let tempGen = "";
let letraActiva = "";
let filtroFechaActivo = 'hoy';
let filtroQuienModo = 'todos';
let filtroTurnoActivo = 'todos';
let filtroDepoActivo = 'todas';
// Convierte los registros que vienen de SQLite al formato que ya usa BioSenior
function normalizarRegistroServidor(registro) {
    return {
        id: registro.id,
        fechaISO: registro.fecha_iso,
        fechaFull: registro.hora,
        nombre: registro.residente_nombre,
        genero: registro.genero,
        depo: registro.deposicion,
        mic: registro.miccion,
        turno: registro.turno,
        auxiliar: registro.auxiliar,
        obs: registro.observacion
    };
}

// ── Toast ──────────────────────────────────────────────────────────────────
function mostrarToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 2500);
}

// ── Modal ──────────────────────────────────────────────────────────────────
let _modalCallback = null;
function abrirModal(mensaje, callback) {
    document.getElementById('modalMsg').textContent = mensaje;
    _modalCallback = callback;
    document.getElementById('modalOverlay').classList.add('visible');

    document.getElementById('modalConfirmBtn').onclick = () => {
        const accionConfirmada = _modalCallback;
        cerrarModal();

        if (accionConfirmada) {
            accionConfirmada();
        }
    };
}
function cerrarModal() {
    document.getElementById('modalOverlay').classList.remove('visible');
    _modalCallback = null;
}

// ── Collapsible ────────────────────────────────────────────────────────────
const btnCollapsible = document.getElementById('btnCollapsible');
const contentAdmin = document.getElementById('contentAdmin');
if (btnCollapsible) {
    btnCollapsible.onclick = function () {
        const isOpen = contentAdmin.style.maxHeight;
        if (isOpen) {
            contentAdmin.style.maxHeight = null;
            document.getElementById("arrow").innerText = "▼";
            sessionStorage.setItem('adminOpen', '0');
        } else {
            contentAdmin.style.maxHeight = 'none';
            const h = contentAdmin.scrollHeight;
            contentAdmin.style.maxHeight = '0';
            setTimeout(() => { contentAdmin.style.maxHeight = h + "px"; }, 10);
            document.getElementById("arrow").innerText = "▲";
            sessionStorage.setItem('adminOpen', '1');
        }
    };
}

// ── Observaciones toggle ───────────────────────────────────────────────────
function toggleObs() {
    const obs = document.getElementById('obs');
    const arrow = document.getElementById('obsArrow');
    const visible = obs.style.display !== 'none';
    obs.style.display = visible ? 'none' : 'block';
    arrow.innerText = visible ? '▶' : '▼';
}

// ── Alertas ────────────────────────────────────────────────────────────────
function diasSinDeposicion(nombre) {
    let dias = 0;
    for (let i = 0; i <= 7; i++) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        const fechaISO = fecha.toISOString().split('T')[0];
        const registrosDia = logs.filter(l => l.nombre === nombre && l.fechaISO === fechaISO);
        if (registrosDia.length === 0) {
            if (i === 0) continue;
            break;
        }
        const tuvoDepo = registrosDia.some(l => l.depo !== 'No');
        if (tuvoDepo) break;
        dias++;
    }
    return dias;
}

function renderAlertas() {
    const bloque = document.getElementById('bloqueAlertas');

    if (!bloque) return;

    const alertas = [];

    usuarios.forEach(u => {
        const nombre = u.nombre || u;
        const dias = diasSinDeposicion(nombre);

        if (dias >= 2) {
            alertas.push({ nombre, dias });
        }
    });

    alertas.sort((a, b) => b.dias - a.dias);

    if (alertas.length === 0) {
        bloque.style.display = 'none';
        bloque.innerHTML = '';
        return;
    }

    const filas = alertas.map(a => {
        const nivel = a.dias >= 3 ? 'nivel-3' : 'nivel-2';

        return `
            <div class="alerta-fila ${nivel}">
                <span class="alerta-nombre-txt ${nivel}">${a.nombre}</span>
                <span class="alerta-pill ${nivel}">⚠ ${a.dias} días</span>
            </div>
        `;
    }).join('');

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

    bloque.style.display = 'block';
}

function toggleListaAlertas() {
    const lista = document.getElementById('listaAlertasResidentes');

    if (!lista) return;

    lista.style.display = lista.style.display === 'none' ? 'block' : 'none';
}
// ── Gestión de residentes ────────────────────────────────────────────────────
function selectGenAdmin(g, el) {
    tempGen = g;
    document.querySelectorAll('.btn-o[onclick*="selectGenAdmin"]').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
}

async function agregarUsuario() {
    const n = document.getElementById('nuevoNombre').value.trim();

    if (!n || !tempGen) {
        alert("Escribe un nombre y selecciona género");
        return;
    }

    try {
        const residenteCreado = await api.crearResidente({
            nombre: n,
            genero: tempGen
        });

        usuarios.push(residenteCreado);
        usuarios.sort((a, b) => a.nombre.localeCompare(b.nombre));
        store.set('sgp_usuarios', usuarios);

        document.getElementById('nuevoNombre').value = '';
        tempGen = '';
        document.querySelectorAll('.btn-o[onclick*="selectGenAdmin"]').forEach(b => b.classList.remove('active'));

        renderGestion();
        actualizarSelectUsuarios();
        renderABC();
        renderAlertas();

        if (contentAdmin.style.maxHeight) {
            contentAdmin.style.maxHeight = contentAdmin.scrollHeight + "px";
        }

        mostrarToast("✅ Residente guardado en servidor");

    } catch (error) {
        console.error(error);
        mostrarToast("❌ No se pudo guardar el residente");
    }
}

function renderGestion() {
    const lista = document.getElementById('gestionLista');

    lista.innerHTML = usuarios.map((p) => {
        const nombre = p.nombre || p;
        const gen = p.genero ? (p.genero === 'Hombre' ? '♂️' : '♀️') : '';
        const id = p.id;

        return `
            <div style="display:flex; justify-content:space-between; gap:8px; padding:10px; border-bottom:1px solid #eee; align-items:center;">
                <span>${nombre} ${gen}</span>

                <div style="display:flex; gap:8px;">
                    <button onclick="editarUsuario(${id})" style="border:none; background:#eef6ff; color:#1f5f99; padding:6px 10px; border-radius:8px; cursor:pointer;">
                        Editar
                    </button>

                    <button onclick="eliminarUsuario(${id}, '${nombre.replace(/'/g, "\\'")}')" style="border:none; background:#fff0f0; color:var(--red); padding:6px 10px; border-radius:8px; cursor:pointer;">
                        ✕
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

function eliminarUsuario(id, nombre) {
    abrirModal(`¿Desactivar a ${nombre}?`, async () => {
        try {
            await api.desactivarResidente(id);

            usuarios = usuarios.filter(p => p.id !== id);
            store.set('sgp_usuarios', usuarios);

            renderGestion();
            actualizarSelectUsuarios();
            renderABC();
            renderAlertas();

            document.getElementById('listaUsuarios').innerHTML = '';

            mostrarToast("✅ Residente desactivado");

        } catch (error) {
            console.error(error);
            mostrarToast("❌ No se pudo desactivar el residente");
        }
    });
}

function editarUsuario(id) {
    const residente = usuarios.find(p => p.id === id);

    if (!residente) {
        mostrarToast("❌ Residente no encontrado");
        return;
    }

    const nuevoNombre = prompt("Editar nombre del residente:", residente.nombre);

    if (!nuevoNombre || !nuevoNombre.trim()) {
        return;
    }

    const nuevoGenero = prompt("Editar género: Hombre o Mujer", residente.genero || "");

    if (nuevoGenero !== "Hombre" && nuevoGenero !== "Mujer") {
        mostrarToast("⚠ El género debe ser Hombre o Mujer");
        return;
    }

    api.editarResidente(id, {
        nombre: nuevoNombre.trim(),
        genero: nuevoGenero
    })
        .then(residenteEditado => {
            usuarios = usuarios.map(p => p.id === id ? residenteEditado : p);
            usuarios.sort((a, b) => a.nombre.localeCompare(b.nombre));

            store.set('sgp_usuarios', usuarios);

            renderGestion();
            actualizarSelectUsuarios();
            renderABC();
            renderAlertas();

            mostrarToast("✅ Residente editado");
        })
        .catch(error => {
            console.error(error);
            mostrarToast("❌ No se pudo editar el residente");
        });
}

// ── Formulario de registro ─────────────────────────────────────────────────
function selectDepo(v, el) {
    registroActual.depo = v;
    document.querySelectorAll('#depoSection .btn-o').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    if (v !== "No") selectMic('Sí', document.getElementById('micSi'));
}

function selectMic(v, el) {
    registroActual.mic = v;
    document.querySelectorAll('#micSection .btn-o').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
}

function calcularTurno(hora) {
    // hora es un número 0-23
    if (hora >= 7 && hora < 14) return 'Mañana';
    if (hora >= 14 && hora < 20) return 'Tarde';
    return 'Noche'; // 20:00 - 06:59
}

async function guardar() {
    if (!registroActual.nombre || !registroActual.depo || !registroActual.mic) {
        return mostrarToast("⚠ Selecciona residente y datos");
    }

    const ahora = new Date();
    const fechaISO = ahora.toISOString().split('T')[0];
    const hora = ahora.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const uObj = usuarios.find(u => u.nombre === registroActual.nombre);

    const nuevoRegistro = {
        residente_id: uObj ? uObj.id : null,
        residente_nombre: registroActual.nombre,
        genero: uObj ? uObj.genero : "---",
        deposicion: registroActual.depo,
        miccion: registroActual.mic,
        observacion: document.getElementById('obs').value,
        auxiliar: (typeof auth !== "undefined" && auth.sesion) ? auth.sesion.nombre : "---",
        turno: calcularTurno(ahora.getHours()),
        fecha_iso: fechaISO,
        hora: hora
    };

    try {
        const registroGuardado = await api.crearRegistroBiosenior(nuevoRegistro);

        logs.push({
            id: registroGuardado.id,
            fechaISO: registroGuardado.fecha_iso,
            fechaFull: registroGuardado.hora,
            nombre: registroGuardado.residente_nombre,
            genero: registroGuardado.genero,
            depo: registroGuardado.deposicion,
            mic: registroGuardado.miccion,
            turno: registroGuardado.turno,
            auxiliar: registroGuardado.auxiliar,
            obs: registroGuardado.observacion
        });

        store.set('logs_enfermeria', logs);

        const nombreGuardado = registroActual.nombre;

        registroActual = { nombre: "", genero: "", depo: "", mic: "", obs: "" };
        letraActiva = "";

        document.getElementById('obs').value = '';
        document.getElementById('obs').style.display = 'none';
        document.getElementById('obsArrow').innerText = '▶';

        document.querySelectorAll('.btn-o').forEach(b => b.classList.remove('active'));
        document.getElementById('listaUsuarios').innerHTML = '';

        renderABC();
        //renderUltimos();
        renderAlertas();
const histContent = document.getElementById('histContent');
if (histContent && histContent.classList.contains('open')) {
    renderTabla();
}
        mostrarToast("✅ Guardado en servidor: " + nombreGuardado);

    } catch (error) {
        console.error(error);
        mostrarToast("❌ No se pudo guardar en el servidor");
    }
}
// ── ABC y lista de residentes ────────────────────────────────────────────────
function renderABC() {
    const bar = document.getElementById('abcBar');
    bar.innerHTML = "";
    "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split('').forEach(l => {
        const b = document.createElement('button');
        b.className = 'btn-l' + (letraActiva === l ? ' active' : '');
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
    const box = document.getElementById('listaUsuarios');
    box.innerHTML = "";
    usuarios.filter(p => {
        const nombre = p.nombre || p;
        return nombre.normalize('NFD')[0].toUpperCase() === letra || nombre[0].toUpperCase() === letra;
    }).forEach(p => {
        const nombre = p.nombre || p;
        const dias = diasSinDeposicion(nombre);
        const div = document.createElement('div');
        const isSelected = registroActual.nombre === nombre;
        let claseAlerta = '';
        if (!isSelected && dias >= 3) claseAlerta = ' alerta-3';
        else if (!isSelected && dias === 2) claseAlerta = ' alerta-2';
        div.className = 'usuario-opt' + (isSelected ? ' selected' : claseAlerta);
        const span = document.createElement('span');
        span.className = 'u-nombre';
        span.innerText = nombre;
        div.appendChild(span);
        if (!isSelected && dias >= 2) {
            const badge = document.createElement('span');
            badge.className = 'alerta-badge ' + (dias >= 3 ? 'b-3' : 'b-2');
            badge.innerText = `⚠ ${dias}d`;
            div.appendChild(badge);
        }
        div.onclick = () => {
            registroActual.nombre = nombre;
            document.querySelectorAll('.usuario-opt').forEach(d => {
                d.classList.remove('selected');
                const n = d.querySelector('.u-nombre') ? d.querySelector('.u-nombre').innerText : '';
                const d2 = diasSinDeposicion(n);
                d.classList.remove('alerta-2', 'alerta-3');
                if (d2 >= 3) d.classList.add('alerta-3');
                else if (d2 === 2) d.classList.add('alerta-2');
            });
            div.classList.remove('alerta-2', 'alerta-3');
            div.classList.add('selected');
            // Scroll automático al paso 2
            setTimeout(() => {
                document.getElementById('depoSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        };
        box.appendChild(div);
    });
}

// ── Filtros historial ──────────────────────────────────────────────────────
function selFiltroFecha(valor, el) {
    filtroFechaActivo = valor;
    document.querySelectorAll('#tagFecha .tag-btn').forEach(t => t.className = 'tag-btn');
    el.classList.add('act-blue');
    const hoy = new Date().toISOString().split('T')[0];
    if (valor === 'hoy') document.getElementById('filtro').value = hoy;
    else if (valor === 'ayer') {
        const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
        document.getElementById('filtro').value = ayer.toISOString().split('T')[0];
    } else { document.getElementById('filtro').value = ''; }
    if (document.getElementById('histContent').classList.contains('open')) renderTabla();
}

function selQuien(modo, el, cls) {
    filtroQuienModo = modo;
    document.querySelectorAll('#quienGrid .quien-icono').forEach(t => t.className = 'quien-icono');
    document.getElementById('filtroUsuario').value = '';
    document.getElementById('filtroUsuario').classList.remove('act');
    document.getElementById('filtroGenero').value = modo === 'Hombre' || modo === 'Mujer' ? modo : '';
    el.classList.add(cls);
    renderTabla();
}

function selTurnoSelect() {
    const select = document.getElementById('filtroTurno');

    if (!select) return;

    filtroTurnoActivo = select.value;

    renderTabla();
}

function selDeposicionSelect() {
    const select = document.getElementById('filtroDeposicion');

    if (!select) return;

    filtroDepoActivo = select.value;

    renderTabla();
}

function selUsuarioConcreto() {
    const val = document.getElementById('filtroUsuario').value;
    if (!val) { limpiarFiltros(); return; }
    filtroQuienModo = 'usuario';
    document.querySelectorAll('#quienGrid .quien-icono').forEach(t => t.className = 'quien-icono' + (t.querySelector('.quien-icono-label') ? '' : ''));
    document.getElementById('filtroGenero').value = '';
    document.getElementById('filtroUsuario').classList.add('act');
    renderTabla();
}

function depoEmoji(depo) {
    const map = { 'Normal': '🌭', 'Blanda': '☁️', 'Pastosa': '💩', 'Líquida': '💧', 'Estreñida': '🪨', 'No': '❌' };
    return (map[depo] || '') + ' ' + depo;
}
function turnoEmoji(turno) {
    const map = { 'Mañana': '🌅', 'Tarde': '🌇', 'Noche': '🌙' };
    return (map[turno] || '') + ' ' + (turno || '---');
}

function renderTarjetas(registros) {
    const box = document.getElementById('historialTarjetas');
    if (!box) return;
    if (registros.length === 0) {
        box.innerHTML = '<p style="text-align:center; color:#aaa; font-size:13px; padding:20px 0;">Sin registros para este filtro</p>';
        return;
    }
    box.innerHTML = registros.map(l => {
        const genClass = l.genero === 'Mujer' ? 'pill-gen' : 'pill-gen-h';
        const genIcon = l.genero === 'Mujer' ? '♀' : '♂';
        const obsHtml = (l.obs && l.obs !== '-') ? `<div class="reg-obs">${l.obs}</div>` : '';
        const micHtml = l.mic === 'Sí'
            ? '<span class="pill pill-mic">✅ Micción</span>'
            : '<span class="pill" style="background:#fff5f5;color:#c0392b;">❌ Micción</span>';
        return `<div class="reg-card">
                <div class="reg-card-top">
                    <span class="reg-nombre">${l.nombre}</span>
                    <span class="reg-hora">${l.fechaISO.substring(5)} · ${l.fechaFull}</span>
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
            </div>`;
    }).join('');
}

function renderUltimos() {
    const box = document.getElementById('ultimosRegistros');
    if (!box) return;
    const hoy = new Date().toISOString().split('T')[0];
    const hoy_logs = logs.filter(l => l.fechaISO === hoy).slice().reverse();
    const total = hoy_logs.length;
    if (total === 0) { box.innerHTML = ''; return; }
    const ultimos = hoy_logs.slice(0, 2);
    const filas = ultimos.map(l => {
        const micPill = l.mic === 'Sí'
            ? '<span class="mpill mp-turno">✅ Mic</span>'
            : '<span class="mpill mp-mic-no">❌ Mic</span>';
        const turnoEmoji = { 'Mañana': '🌅', 'Tarde': '🌇', 'Noche': '🌙' };
        const tEmoji = turnoEmoji[l.turno] || '';
        return `<div class="reg-mini">
                <div class="reg-mini-info">
                    <div class="reg-mini-nombre">${l.nombre}</div>
                    <div class="reg-mini-pills">
                        <span class="mpill mp-depo">${l.depo}</span>
                        ${micPill}
                        ${l.turno && l.turno !== '---' ? `<span class="mpill mp-turno">${tEmoji} ${l.turno}</span>` : ''}
                    </div>
                </div>
                <span class="reg-mini-hora">${l.fechaFull}</span>
            </div>`;
    }).join('');
    box.innerHTML = `<div class="ultimos-card">
            <div class="ultimos-tit">
                <span>Últimos registros de hoy</span>
                <span class="ultimos-count">${total} hoy</span>
            </div>
            ${filas}
        </div>`;
}

function toggleHistorial() {
    const content = document.getElementById('histContent');
    const arrow = document.getElementById('histArrow');
    const toggle = document.getElementById('histToggle');
    const open = content.classList.toggle('open');
    arrow.style.transform = open ? 'rotate(180deg)' : '';
    toggle.style.borderBottomLeftRadius = open ? '0' : '10px';
    toggle.style.borderBottomRightRadius = open ? '0' : '10px';
    toggle.style.borderBottom = open ? 'none' : '';
    if (open) renderTabla();

    // Mostrar/ocultar botón flotante
    const btnFlotante = document.getElementById('btnPrintFlotante');
    if (btnFlotante) btnFlotante.classList.toggle('visible', open);
}

function actualizarSubtitulo() {
    const sub = document.getElementById('subtituloHistorial');
    const partes = [];
    // Fecha
    if (filtroFechaActivo === 'hoy') partes.push('Hoy');
    else if (filtroFechaActivo === 'ayer') partes.push('Ayer');
    else if (filtroFechaActivo === 'semana') partes.push('Esta semana');
    else partes.push('Historial completo');
    // Quién
    const fU = document.getElementById('filtroUsuario').value;
    if (filtroQuienModo === 'Hombre') partes.push('Solo hombres');
    else if (filtroQuienModo === 'Mujer') partes.push('Solo mujeres');
    else if (filtroQuienModo === 'usuario' && fU) partes.push(fU);
    sub.innerText = partes.join(' · ');
}

function renderTabla() {
    const cuerpo = document.getElementById('cuerpo');
    const fU = document.getElementById('filtroUsuario').value;

    const hoy = new Date().toISOString().split('T')[0];

    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const ayerISO = ayer.toISOString().split('T')[0];

    const semana = new Date();
    semana.setDate(semana.getDate() - 6);
    const semanaISO = semana.toISOString().split('T')[0];

    const registrosFiltrados = logs.filter(l => {
        let matchFecha = true;

        if (filtroFechaActivo === 'hoy') {
            matchFecha = l.fechaISO === hoy;
        } else if (filtroFechaActivo === 'ayer') {
            matchFecha = l.fechaISO === ayerISO;
        } else if (filtroFechaActivo === 'semana') {
            matchFecha = l.fechaISO >= semanaISO && l.fechaISO <= hoy;
        }

        let matchQuien = true;

        if (filtroQuienModo === 'usuario') {
            matchQuien = l.nombre === fU;
        } else if (filtroQuienModo === 'Hombre') {
            matchQuien = l.genero === 'Hombre';
        } else if (filtroQuienModo === 'Mujer') {
            matchQuien = l.genero === 'Mujer';
        }

        let matchTurno = true;

if (filtroTurnoActivo !== 'todos') {
    matchTurno = l.turno === filtroTurnoActivo;
}

let matchDeposicion = true;

if (filtroDepoActivo !== 'todas') {
    matchDeposicion = l.depo === filtroDepoActivo;
}

return matchFecha && matchQuien && matchTurno && matchDeposicion;
    }).slice().reverse();

    const filas = registrosFiltrados.map(l => {
        return `
            <tr>
                <td>${l.fechaISO ? l.fechaISO.substring(5) : ''}<br><small style="color:#888;">${l.fechaFull || ''}</small></td>
                <td><b>${l.nombre || ''}</b></td>
                <td>${l.auxiliar || '---'}</td>
                <td>${l.turno || '---'}</td>
                <td>${l.depo || '---'}</td>
                <td>${l.mic || '---'}</td>
                <td>${l.obs || '-'}</td>
                <td class="no-print">
                    <button onclick="borrarLog(${l.id})" style="border:none; background:none; color:red; cursor:pointer;" aria-label="Borrar registro">✕</button>
                </td>
            </tr>
        `;
    });

    cuerpo.innerHTML = filas.join('');

    actualizarSubtitulo();
}

function limpiarFiltros() {
    filtroFechaActivo = 'hoy';
    filtroQuienModo = 'todos';
    document.getElementById('filtroUsuario').value = '';
    document.getElementById('filtroUsuario').classList.remove('act');
    document.getElementById('filtroGenero').value = '';
    document.getElementById('filtro').value = new Date().toISOString().split('T')[0];
    document.querySelectorAll('#tagFecha .tag-btn').forEach(t => t.className = 'tag-btn');
    document.querySelector('#tagFecha .tag-btn').classList.add('act-blue');
    document.querySelectorAll('#quienGrid .quien-icono').forEach(t => t.className = 'quien-icono' + (t.querySelector('.quien-icono-label') ? '' : ''));
    document.querySelector('#quienGrid .quien-btn').classList.add('act');
    renderTabla();
}

function actualizarSelectUsuarios() {
    const select = document.getElementById('filtroUsuario');
    select.innerHTML = '<option value="">Seleccionar residente...</option>';
    usuarios.forEach(p => {
        const nombre = p.nombre || p;
        select.innerHTML += `<option value="${nombre}">${nombre}</option>`;
    });
}

// ── Backup ─────────────────────────────────────────────────────────────────
function exportarDatos() {
    // Backup clínico: residentes + registros
    const data = { usuarios, logs };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup_clinico_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function exportarCuentas() {
    // Backup de cuentas: auxiliares y admins
    const data = { cuentas: auth.cuentas };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup_cuentas_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function importarCuentas(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        let data;
        try { data = JSON.parse(e.target.result); }
        catch (err) { alert("❌ Error al leer el archivo."); return; }
        if (!Array.isArray(data.cuentas)) {
            alert("❌ Formato de backup de cuentas inválido."); return;
        }
        const ok = confirm(`¿Importar ${data.cuentas.length} cuentas? Se reemplazarán las actuales.`);
        if (!ok) return;
        auth.cuentas = data.cuentas;
        renderGestionAuxiliares();
        auth.renderLoginSelect();
        mostrarToast('✅ Cuentas importadas correctamente');
    };
    reader.readAsText(file);
}

function importarDatos(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        let data;
        try { data = JSON.parse(e.target.result); }
        catch (err) { alert("❌ Error al leer el archivo."); return; }
        if (!Array.isArray(data.usuarios) || !Array.isArray(data.logs)) {
            alert("❌ Formato de backup inválido."); return;
        }
        const ok = confirm(`¿Importar backup?\n${data.usuarios.length} residentes · ${data.logs.length} registros`);
        if (!ok) return;
        usuarios = data.usuarios;
        logs = data.logs;
        store.set('sgp_usuarios', usuarios);
        store.set('logs_enfermeria', logs);
        registroActual = { nombre: "", genero: "", depo: "", mic: "", obs: "" };
        letraActiva = "";
        document.querySelectorAll('.btn-o').forEach(b => b.classList.remove('active'));
        document.getElementById('obs').value = '';
        document.getElementById('listaUsuarios').innerHTML = '';
        renderGestion();
        actualizarSelectUsuarios();
        renderABC();
        renderTabla();
        renderAlertas();
        mostrarToast('✅ ' + data.usuarios.length + ' residentes, ' + data.logs.length + ' registros importados');
    };
    reader.readAsText(file);
}

async function borrarLog(id) {
    abrirModal("¿Borrar este registro?", async () => {
        try {
            await api.borrarRegistroBiosenior(id);

            logs = logs.filter(l => l.id !== id);
            store.set('logs_enfermeria', logs);

            renderTabla();
            //renderUltimos();
            renderAlertas();

            mostrarToast("✅ Registro borrado");

        } catch (error) {
            console.error(error);
            mostrarToast("❌ No se pudo borrar el registro");
        }
    });
}

function prepararImpresion() {
    const fF = document.getElementById('filtro').value;
    const fU = document.getElementById('filtroUsuario').value;
    const fechaTexto = fF ? new Date(fF + 'T00:00:00').toLocaleDateString('es-ES') : 'Historial completo';
    let quienTexto = 'Todos los residentes';
    if (filtroQuienModo === 'usuario' && fU) quienTexto = fU;
    else if (filtroQuienModo === 'Hombre') quienTexto = 'Solo hombres';
    else if (filtroQuienModo === 'Mujer') quienTexto = 'Solo mujeres';
    const auxiliarNombre = (typeof auth !== 'undefined' && auth.sesion) ? auth.sesion.nombre : '';

    const hoy = new Date().toISOString().split('T')[0];
    const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
    const ayerISO = ayer.toISOString().split('T')[0];
    const semana = new Date(); semana.setDate(semana.getDate() - 6);
    const semanaISO = semana.toISOString().split('T')[0];

    const registros = logs.filter(l => {
        let matchFecha = true;
        if (filtroFechaActivo === 'hoy') matchFecha = l.fechaISO === hoy;
        else if (filtroFechaActivo === 'ayer') matchFecha = l.fechaISO === ayerISO;
        else if (filtroFechaActivo === 'semana') matchFecha = l.fechaISO >= semanaISO && l.fechaISO <= hoy;
        let matchQuien = true;
        if (filtroQuienModo === 'usuario') matchQuien = l.nombre === fU;
        else if (filtroQuienModo === 'Hombre') matchQuien = l.genero === 'Hombre';
        else if (filtroQuienModo === 'Mujer') matchQuien = l.genero === 'Mujer';
        return matchFecha && matchQuien;
    }).slice().reverse();

    const filas = registros.map(l =>
        `<tr>
                <td>${l.fechaISO.substring(5)} ${l.fechaFull}</td>
                <td>${l.nombre}</td>
                <td>${l.auxiliar || '---'}</td>
                <td>${l.turno || '---'}</td>
                <td>${l.depo}</td>
                <td>${l.mic}</td>
                <td>${l.obs || '-'}</td>
            </tr>`
    ).join('');

    const logoUrl = window.location.origin + window.location.pathname.replace('biosenior.html', '') + 'img/Logo-SGP-blanc.png';

    // Eliminar reporte anterior si existe
    const anterior = document.getElementById('zonaImpresion');
    if (anterior) anterior.remove();

    // Crear zona de impresión invisible en la página
    const zona = document.createElement('div');
    zona.id = 'zonaImpresion';
    zona.innerHTML = `
            <div class="rh">
                <img src="${logoUrl}" alt="SGP" onerror="this.style.display='none'">
                <div class="rh-info">
                    <p class="rh-titulo">Reporte Bio-Senior</p>
                    <p class="rh-meta">Fecha: ${fechaTexto} &nbsp;·&nbsp; ${quienTexto}${auxiliarNombre ? ' &nbsp;·&nbsp; Auxiliar: ' + auxiliarNombre : ''}</p>
                </div>
            </div>
            <div class="rb">
                <table>
                    <thead>
                        <tr><th>Hora</th><th>Residente</th><th>Auxiliar</th><th>Turno</th><th>Deposición</th><th>Micción</th><th>Observaciones</th></tr>
                    </thead>
                    <tbody>
                        ${filas || '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:16px;">Sin registros</td></tr>'}
                    </tbody>
                </table>
                <p class="rf">Diseño funcional por TP &copy; 2026 &nbsp;·&nbsp; ${registros.length} registros</p>
            </div>`;
    document.body.appendChild(zona);

    window.print();
}


// ── IMPORTAR DESDE EXCEL ─────────────────────────────────────────
function leerExcel(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        callback(rows);
    };
    reader.readAsArrayBuffer(file);
}

function importarExcelUsuarios(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    leerExcel(file, (rows) => {
        const nuevos = rows
            .filter(r => r['Nombre completo'] && r['Género'])
            .map(r => ({
                nombre: String(r['Nombre completo']).trim(),
                genero: String(r['Género']).trim()
            }));
        if (nuevos.length === 0) {
            mostrarToast('❌ No se encontraron residentes válidos');
            return;
        }
        // Añadir solo los que no existen ya (sin duplicados por nombre)
        const nombresExistentes = new Set(usuarios.map(u => u.nombre.toLowerCase()));
        const sinDuplicados = nuevos.filter(u => !nombresExistentes.has(u.nombre.toLowerCase()));
        const yaExistian = nuevos.length - sinDuplicados.length;

        if (sinDuplicados.length === 0) {
            mostrarToast('⚠ Todos los residentes ya existen en la lista');
            return;
        }
        if (!confirm(`Se añadirán ${sinDuplicados.length} residentes nuevos.${yaExistian > 0 ? ' (' + yaExistian + ' ya existían y se omiten)' : ''}`)) return;

        usuarios = [...usuarios, ...sinDuplicados].sort((a, b) => a.nombre.localeCompare(b.nombre));
        store.set('sgp_usuarios', usuarios);
        renderGestion();
        actualizarSelectUsuarios();
        renderABC();
        renderAlertas();
        mostrarToast(`✅ ${sinDuplicados.length} residentes añadidos`);
    });
}

function importarExcelCuentas(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    leerExcel(file, (rows) => {
        const nuevas = rows
            .filter(r => r['Nombre completo'] && r['Rol'] && r['PIN (4 dígitos)'])
            .map(r => ({
                nombre: String(r['Nombre completo']).trim(),
                rol: String(r['Rol']).trim().toLowerCase(),
                pin: String(r['PIN (4 dígitos)']).trim().padStart(4, '0')
            }))
            .filter(c => c.rol === 'admin' || c.rol === 'auxiliar');
        if (nuevas.length === 0) {
            mostrarToast('❌ No se encontraron cuentas válidas');
            return;
        }
        // Añadir solo las que no existen ya (sin duplicados por nombre)
        const nombresExistentes = new Set(auth.cuentas.map(c => c.nombre.toLowerCase()));
        const sinDuplicados = nuevas.filter(c => !nombresExistentes.has(c.nombre.toLowerCase()));
        const yaExistian = nuevas.length - sinDuplicados.length;

        if (sinDuplicados.length === 0) {
            mostrarToast('⚠ Todas las cuentas ya existen');
            return;
        }
        if (!confirm(`Se añadirán ${sinDuplicados.length} cuentas nuevas.${yaExistian > 0 ? ' (' + yaExistian + ' ya existían y se omiten)' : ''}`)) return;

        auth.cuentas = [...auth.cuentas, ...sinDuplicados];
        renderGestionAuxiliares();
        mostrarToast(`✅ ${sinDuplicados.length} cuentas añadidas`);
    });
}

function cargarDatosPrueba() {
    const data = {
        "usuarios": [
            { "nombre": "Ana García", "genero": "Mujer" }, { "nombre": "Carmen López", "genero": "Mujer" },
            { "nombre": "Dolores Martín", "genero": "Mujer" }, { "nombre": "Elena Ruiz", "genero": "Mujer" },
            { "nombre": "Francisca Torres", "genero": "Mujer" }, { "nombre": "José Martínez", "genero": "Hombre" },
            { "nombre": "Luis Fernández", "genero": "Hombre" }, { "nombre": "Manuel Gómez", "genero": "Hombre" },
            { "nombre": "Ñoño Pérez", "genero": "Hombre" }, { "nombre": "Rafael Sánchez", "genero": "Hombre" }
        ],
        "logs": []
    };
    usuarios = data.usuarios;
    logs = data.logs;
    store.set('sgp_usuarios', usuarios);
    store.set('logs_enfermeria', logs);
    registroActual = { nombre: "", genero: "", depo: "", mic: "", obs: "" };
    letraActiva = "";
    document.querySelectorAll('.btn-o').forEach(b => b.classList.remove('active'));
    document.getElementById('obs').value = '';
    document.getElementById('listaUsuarios').innerHTML = '';
    renderGestion();
    actualizarSelectUsuarios();
    renderABC();
    //renderUltimos();
    renderAlertas();
    mostrarToast('✅ Datos de prueba cargados');
}

// ── Init ───────────────────────────────────────────────────────────────────
function renderSesionBar() {
    const s = auth.sesion;
    if (!s) return;
    const bar = document.getElementById('sesionBar');
    if (!bar) return;
    const rolColor = s.rol === 'admin'
        ? 'background:#fef3e2;color:#7a4a00'
        : 'background:#e6f4f6;color:#0a5a68';
    bar.innerHTML = `
            <span class="sesion-nombre">${s.nombre}</span>
            <span class="sesion-rol" style="${rolColor};padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;">${s.rol === 'admin' ? 'Admin' : 'Auxiliar'}</span>
            <button class="sesion-hub" onclick="window.location.href='menu-principal.html'">← Menú principal</button>
            <button class="sesion-salir" onclick="auth.cerrarSesion('index.html')">Salir</button>`;
}

async function iniciarApp() {
    const s = auth.sesion;

    // Bloque gestión — solo admin
    const bloqueAdmin = document.getElementById('bloqueAdmin');
    if (bloqueAdmin) bloqueAdmin.style.display = 'none';

    // Bloque registro — solo auxiliar
    const bloqueRegistro = document.getElementById('bloqueRegistro');
    if (bloqueRegistro) bloqueRegistro.style.display = s.rol === 'auxiliar' ? 'block' : 'none';

    // Cargar residentes y registros desde el servidor
    if (typeof api !== "undefined") {
        try {
            usuarios = await api.obtenerResidentes();
            store.set('sgp_usuarios', usuarios);

            const registrosServidor = await api.obtenerRegistrosBiosenior();
            logs = registrosServidor.map(normalizarRegistroServidor);
            store.set('logs_enfermeria', logs);

        } catch (error) {
            console.error(error);
            mostrarToast('⚠ No se pudieron cargar datos del servidor');
        }
    }
    // Barra de sesión
    renderSesionBar();

    document.getElementById('filtro').value = new Date().toISOString().split('T')[0];
    filtroFechaActivo = 'hoy';
    filtroQuienModo = 'todos';

    renderGestion();
    actualizarSelectUsuarios();
    renderABC();
    //renderUltimos();
    renderAlertas();
    renderGestionAuxiliares();
}

window.onload = () => {
    if (typeof auth !== "undefined" && auth.sesion) iniciarApp();
};