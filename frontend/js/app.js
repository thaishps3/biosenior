const store = {
        get: (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch(e) { return null; } },
        set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} }
    };

    let usuarios = store.get('sgp_usuarios') || [];
    let logs = store.get('logs_enfermeria') || [];
    let registroActual = { nombre: "", genero: "", depo: "", mic: "", obs: "" };
    let tempGen = "";
    let letraActiva = "";
    let filtroFechaActivo = 'hoy';
    let filtroQuienModo = 'todos';

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
        document.getElementById('modalConfirmBtn').onclick = () => { cerrarModal(); if (_modalCallback) _modalCallback(); };
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
        const alertas = [];
        usuarios.forEach(u => {
            const nombre = u.nombre || u;
            const dias = diasSinDeposicion(nombre);
            if (dias >= 2) alertas.push({ nombre, dias });
        });
        alertas.sort((a, b) => b.dias - a.dias);
        if (alertas.length === 0) { bloque.style.display = 'none'; bloque.innerHTML = ''; return; }
        const filas = alertas.map(a => {
            const nivel = a.dias >= 3 ? 'nivel-3' : 'nivel-2';
            return `<div class="alerta-fila ${nivel}">
                <span class="alerta-nombre-txt ${nivel}">${a.nombre}</span>
                <span class="alerta-pill ${nivel}">⚠ ${a.dias} días</span>
            </div>`;
        }).join('');
        bloque.innerHTML = `<div class="alertas-bloque"><p class="alertas-titulo">⚠ Requieren atención</p>${filas}</div>`;
        bloque.style.display = 'block';
    }

    // ── Gestión de usuarios ────────────────────────────────────────────────────
    function selectGenAdmin(g, el) {
        tempGen = g;
        document.querySelectorAll('.btn-o[onclick*="selectGenAdmin"]').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
    }

    function agregarUsuario() {
        const n = document.getElementById('nuevoNombre').value.trim();
        if (n && tempGen) {
            usuarios.push({ nombre: n, genero: tempGen });
            usuarios.sort((a, b) => a.nombre.localeCompare(b.nombre));
            store.set('sgp_usuarios', usuarios);
            document.getElementById('nuevoNombre').value = '';
            tempGen = '';
            document.querySelectorAll('.btn-o[onclick*="selectGenAdmin"]').forEach(b => b.classList.remove('active'));
            renderGestion();
            actualizarSelectUsuarios();
            renderABC();
            if (contentAdmin.style.maxHeight) contentAdmin.style.maxHeight = contentAdmin.scrollHeight + "px";
        } else { alert("Escribe un nombre y selecciona género"); }
    }

    function renderGestion() {
        const lista = document.getElementById('gestionLista');
        lista.innerHTML = usuarios.map((p) => {
            const nombre = p.nombre || p;
            const gen = p.genero ? (p.genero === 'Hombre' ? '♂️' : '♀️') : '';
            return `<div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee; align-items:center;">
                <span>${nombre} ${gen}</span>
                <span class="btn-eliminar-usuario" data-nombre="${nombre}" style="color:var(--red); cursor:pointer; font-weight:bold; padding:5px 10px;" aria-label="Eliminar ${nombre}">✕</span>
            </div>`;
        }).join("");
        lista.querySelectorAll('.btn-eliminar-usuario').forEach(btn => {
            btn.addEventListener('click', () => eliminarUsuario(btn.dataset.nombre));
        });
    }

    function eliminarUsuario(n) {
        abrirModal(`¿Eliminar a ${n}?`, () => {
            usuarios = usuarios.filter(p => (p.nombre || p) !== n);
            store.set('sgp_usuarios', usuarios);
            renderGestion();
            actualizarSelectUsuarios();
            renderABC();
            document.getElementById('listaUsuarios').innerHTML = '';
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

    function guardar() {
        if (!registroActual.nombre || !registroActual.depo || !registroActual.mic) {
            return mostrarToast("⚠ Selecciona usuario y datos");
        }
        const ahora = new Date();
        const uObj = usuarios.find(u => u.nombre === registroActual.nombre);
        logs.push({
            id: Date.now(),
            fechaISO: ahora.toISOString().split('T')[0],
            fechaFull: ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            nombre: registroActual.nombre,
            genero: uObj ? uObj.genero : "---",
            depo: registroActual.depo,
            mic: registroActual.mic,
            turno: calcularTurno(ahora.getHours()),
            auxiliar: (typeof auth !== "undefined" && auth.sesion) ? auth.sesion.nombre : "---",
            obs: document.getElementById('obs').value
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
        renderUltimos();
        renderAlertas();
        mostrarToast("✅ Guardado: " + nombreGuardado);
    }

    // ── ABC y lista de usuarios ────────────────────────────────────────────────
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
        const map = { 'Normal':'🌭', 'Blanda':'☁️', 'Pastosa':'💩', 'Líquida':'💧', 'Estreñida':'🪨', 'No':'❌' };
        return (map[depo] || '') + ' ' + depo;
    }
    function turnoEmoji(turno) {
        const map = { 'Mañana':'🌅', 'Tarde':'🌇', 'Noche':'🌙' };
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
            const turnoEmoji = { 'Mañana':'🌅', 'Tarde':'🌇', 'Noche':'🌙' };
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
        const fG = document.getElementById('filtroGenero').value;
        const hoy = new Date().toISOString().split('T')[0];
        const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
        const ayerISO = ayer.toISOString().split('T')[0];
        const semana = new Date(); semana.setDate(semana.getDate() - 6);
        const semanaISO = semana.toISOString().split('T')[0];
        const filas = [];
        const registrosFiltrados = logs.filter(l => {
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
        registrosFiltrados.forEach(l => {
            filas.push(`<tr>
                <td>${l.fechaISO.substring(5)}<br><small style="color:#888;">${l.fechaFull}</small></td>
                <td><b>${l.nombre}</b></td>
                <td>${l.auxiliar || '---'}</td>
                <td>${l.turno || '---'}</td>
                <td>${l.depo}</td>
                <td>${l.mic}</td>
                <td>${l.obs || "-"}</td>
                <td class="no-print"><button onclick="borrarLog(${l.id})" style="border:none; background:none; color:red; cursor:pointer;" aria-label="Borrar registro">✕</button></td>
            </tr>`);
        });
        cuerpo.innerHTML = filas.join('');
        renderTarjetas(registrosFiltrados);
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
        select.innerHTML = '<option value="">Seleccionar usuario...</option>';
        usuarios.forEach(p => {
            const nombre = p.nombre || p;
            select.innerHTML += `<option value="${nombre}">${nombre}</option>`;
        });
    }

    // ── Backup ─────────────────────────────────────────────────────────────────
    function exportarDatos() {
        // Backup clínico: usuarios (ancianos) + registros
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
        reader.onload = function(e) {
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
        reader.onload = function(e) {
            let data;
            try { data = JSON.parse(e.target.result); }
            catch (err) { alert("❌ Error al leer el archivo."); return; }
            if (!Array.isArray(data.usuarios) || !Array.isArray(data.logs)) {
                alert("❌ Formato de backup inválido."); return;
            }
            const ok = confirm(`¿Importar backup?\n${data.usuarios.length} usuarios · ${data.logs.length} registros`);
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
            mostrarToast('✅ ' + data.usuarios.length + ' usuarios, ' + data.logs.length + ' registros importados');
        };
        reader.readAsText(file);
    }

    function borrarLog(id) {
        abrirModal("¿Borrar este registro?", () => {
            logs = logs.filter(l => l.id !== id);
            store.set('logs_enfermeria', logs);
            renderTabla();
        });
    }

    function prepararImpresion() {
        const fF = document.getElementById('filtro').value;
        const fU = document.getElementById('filtroUsuario').value;
        const fechaTexto = fF ? new Date(fF + 'T00:00:00').toLocaleDateString('es-ES') : 'Historial completo';
        let quienTexto = 'Todos los usuarios';
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
                <td><b>${l.nombre}</b></td>
                <td>${l.auxiliar || '---'}</td>
                <td>${l.turno || '---'}</td>
                <td>${l.depo}</td>
                <td>${l.mic}</td>
                <td>${l.obs || '-'}</td>
            </tr>`
        ).join('');

        // Guardar contenido original y reemplazar con página de impresión
        const bodyOriginal = document.body.innerHTML;
        const titleOriginal = document.title;

        document.title = 'Reporte Bio-Senior';
        document.body.innerHTML = `
            <style>
                @page { margin: 15mm; }
                body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; color: #333; }
                .reporte-header { background: #0f7b8c; color: white; padding: 16px 20px 14px; display: flex; align-items: center; justify-content: space-between; }
                .reporte-header-left img { height: 32px; }
                .reporte-header-center { text-align: center; flex: 1; }
                .reporte-titulo { font-size: 18px; font-weight: 700; margin: 0 0 2px; letter-spacing: 0.5px; }
                .reporte-meta { font-size: 11px; opacity: 0.85; margin: 0; }
                .reporte-aux { font-size: 11px; opacity: 0.7; margin: 2px 0 0; }
                .reporte-body { padding: 16px 20px; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px; }
                th { background: #0f7b8c; color: white; padding: 8px 8px; text-align: left; font-size: 11px; font-weight: 600; }
                td { padding: 7px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
                tr:nth-child(even) td { background: #f5f9fa; }
                td b { color: #0f7b8c; }
                .reporte-footer { text-align: center; font-size: 10px; color: #aaa; margin-top: 16px; padding-top: 10px; border-top: 1px dotted #ccc; }
            </style>
            <div class="reporte-header">
                <div class="reporte-header-left">
                    <img src="img/Logo-SGP-blanc.png" alt="SGP">
                </div>
                <div class="reporte-header-center">
                    <p class="reporte-titulo">Reporte Bio-Senior</p>
                    <p class="reporte-meta"><b>Fecha:</b> ${fechaTexto} &nbsp;·&nbsp; ${quienTexto}</p>
                    ${auxiliarNombre ? `<p class="reporte-aux">Auxiliar: ${auxiliarNombre}</p>` : ''}
                </div>
                <div style="width:80px;"></div>
            </div>
            <div class="reporte-body">
                <table>
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Usuario</th>
                            <th>Auxiliar</th>
                            <th>Turno</th>
                            <th>Deposición</th>
                            <th>Micción</th>
                            <th>Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filas || '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:20px;">Sin registros para este filtro</td></tr>'}
                    </tbody>
                </table>
                <p class="reporte-footer">Diseño funcional por Thais Perruolo &copy; 2026 &nbsp;·&nbsp; ${registros.length} registros</p>
            </div>`;

        // Esperar a que el navegador repinte el DOM antes de imprimir
        setTimeout(() => {
            window.print();

            // Restaurar página original tras imprimir
            document.body.innerHTML = bodyOriginal;
            document.title = titleOriginal;

            // Reinicializar la app tras restaurar el DOM
            if (typeof auth !== 'undefined' && auth.sesion) iniciarApp();
        }, 300);
    }


    function cargarDatosPrueba() {
        const data = {
            "usuarios": [
                {"nombre":"Ana García","genero":"Mujer"},{"nombre":"Carmen López","genero":"Mujer"},
                {"nombre":"Dolores Martín","genero":"Mujer"},{"nombre":"Elena Ruiz","genero":"Mujer"},
                {"nombre":"Francisca Torres","genero":"Mujer"},{"nombre":"José Martínez","genero":"Hombre"},
                {"nombre":"Luis Fernández","genero":"Hombre"},{"nombre":"Manuel Gómez","genero":"Hombre"},
                {"nombre":"Ñoño Pérez","genero":"Hombre"},{"nombre":"Rafael Sánchez","genero":"Hombre"}
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
        renderUltimos();
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
            <button class="sesion-salir" onclick="auth.cerrarSesion('login.html')">Salir</button>`;
    }

    function iniciarApp() {
        const s = auth.sesion;

        // Bloque gestión — solo admin
        const bloqueAdmin = document.getElementById('bloqueAdmin');
        if (bloqueAdmin) bloqueAdmin.style.display = s.rol === 'admin' ? 'block' : 'none';

        // Bloque registro — solo auxiliar
        const bloqueRegistro = document.getElementById('bloqueRegistro');
        if (bloqueRegistro) bloqueRegistro.style.display = s.rol === 'auxiliar' ? 'block' : 'none';

        // Barra de sesión
        renderSesionBar();

        document.getElementById('filtro').value = new Date().toISOString().split('T')[0];
        filtroFechaActivo = 'hoy';
        filtroQuienModo = 'todos';

        renderGestion();
        actualizarSelectUsuarios();
        renderABC();
        renderUltimos();
        renderAlertas();
        renderGestionAuxiliares();
    }

    window.onload = () => {
        if (typeof auth !== "undefined" && auth.sesion) iniciarApp();
    };