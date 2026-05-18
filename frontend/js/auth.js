// ── AUTENTICACIÓN COMPARTIDA ─────────────────────────────────────────────────
// Usado por el hub y todos los módulos.
// Las cuentas viven en localStorage.
// La sesión activa vive en sessionStorage.

const auth = {
    get cuentas() {
        return JSON.parse(localStorage.getItem('sgp_cuentas') || '[]');
    },

    set cuentas(v) {
        localStorage.setItem('sgp_cuentas', JSON.stringify(v));
    },

    get sesion() {
        return JSON.parse(sessionStorage.getItem('sgp_sesion') || 'null');
    },

    set sesion(v) {
        sessionStorage.setItem('sgp_sesion', JSON.stringify(v));
    },

    async inicializar() {
    try {
        const respuesta = await fetch('/api/usuarios');
        const data = await respuesta.json();

        if (data.ok && Array.isArray(data.usuarios)) {
            this.cuentas = data.usuarios;
            return;
        }

        this.cuentas = [];

    } catch (error) {
        console.error('Error cargando usuarios desde servidor:', error);
        this.cuentas = [];
    }
},

    // Verifica sesión activa.
    // Si no hay sesión, redirige al login.
    verificarSesion(rutaLogin = 'index.html') {
        if (!this.sesion) {
            window.location.href = rutaLogin;
            return false;
        }

        return true;
    },

    cerrarSesion(rutaLogin = 'index.html') {
        sessionStorage.removeItem('sgp_sesion');
        window.location.href = rutaLogin;
    }
};

// ── TECLADO PIN ───────────────────────────────────────────────────────────────

let pinActual = '';

function actualizarDots() {
    for (let i = 0; i < 4; i++) {
        const dot = document.getElementById('dot' + i);

        if (dot) {
            dot.classList.toggle('filled', i < pinActual.length);
        }
    }
}

function pinPress(digit) {
    if (pinActual.length >= 4) return;

    pinActual += digit;
    actualizarDots();

    const err = document.getElementById('pinError');

    if (err) {
        err.innerText = '';
    }

    if (pinActual.length === 4) {
        validarPin();
    }
}

function pinDel() {
    pinActual = pinActual.slice(0, -1);
    actualizarDots();
}

function validarPin() {
    const loginSelect = document.getElementById('loginSelect');
    const err = document.getElementById('pinError');

    if (!loginSelect) return;

    const idx = loginSelect.value;

    if (idx === '') {
        if (err) {
            err.innerText = 'Selecciona tu nombre primero';
        }

        pinActual = '';
        actualizarDots();
        return;
    }

    const cuenta = auth.cuentas[parseInt(idx)];

    if (!cuenta) {
        if (err) {
            err.innerText = 'Cuenta no encontrada';
        }

        pinActual = '';
        actualizarDots();
        return;
    }

    if (cuenta.pin === pinActual) {
        auth.sesion = {
            nombre: cuenta.nombre,
            rol: cuenta.rol
        };

        pinActual = '';
        actualizarDots();

        window.location.href = 'menu-principal.html';
    } else {
        if (err) {
            err.innerText = 'PIN incorrecto, inténtalo de nuevo';
        }

        pinActual = '';
        actualizarDots();
    }
}

function renderLoginSelect() {
    const select = document.getElementById('loginSelect');

    if (!select) return;

    select.innerHTML = '<option value="">Seleccionar...</option>';

    auth.cuentas.forEach((c, i) => {
        const rol = c.rol === 'admin' ? '👩‍💼 Admin' : '👩 Auxiliar';

        select.innerHTML += `
            <option value="${i}">
                ${c.nombre} — ${rol}
            </option>
        `;
    });
}

// ── GESTIÓN DE AUXILIARES ─────────────────────────────────────────────────────

let tempRolAux = '';

function selectRolAux(rol, el) {
    tempRolAux = rol;

    document
        .querySelectorAll('.btn-o[onclick*="selectRolAux"]')
        .forEach(b => b.classList.remove('active'));

    if (el) {
        el.classList.add('active');
    }
}

function agregarAuxiliar() {
    const nombreInput = document.getElementById('nuevoAuxiliarNombre');
    const pinInput = document.getElementById('nuevoAuxiliarPin');

    if (!nombreInput || !pinInput) return;

    const nombre = nombreInput.value.trim();
    const pin = pinInput.value.trim();

    if (!nombre || !tempRolAux || pin.length !== 4 || isNaN(pin)) {
        alert('Completa nombre, rol y PIN de 4 dígitos');
        return;
    }

    const cuentas = auth.cuentas;

    cuentas.push({
        nombre,
        rol: tempRolAux,
        pin
    });

    auth.cuentas = cuentas;

    nombreInput.value = '';
    pinInput.value = '';
    tempRolAux = '';

    document
        .querySelectorAll('.btn-o[onclick*="selectRolAux"]')
        .forEach(b => b.classList.remove('active'));

    renderGestionAuxiliares();
    renderLoginSelect();

    if (typeof mostrarToast === 'function') {
        mostrarToast('✅ Auxiliar guardado');
    }
}

function renderGestionAuxiliares() {
    const lista = document.getElementById('gestionAuxiliares');

    if (!lista) return;

    lista.innerHTML = auth.cuentas.map((c, i) => {
        if (c.nombre === 'Administrador' && i === 0) return '';

        const icon = c.rol === 'admin' ? '👩‍💼' : '👩';

        return `
            <div style="display:flex;justify-content:space-between;padding:8px 10px;border-bottom:1px solid #eee;align-items:center;font-size:13px;">
                <span>
                    ${icon} ${c.nombre}
                    <small style="color:#aaa;">(PIN: ****)</small>
                </span>

                <span onclick="eliminarAuxiliar(${i})" style="color:#c0392b;cursor:pointer;padding:4px 8px;font-weight:bold;">
                    ✕
                </span>
            </div>
        `;
    }).join('');
}

function eliminarAuxiliar(i) {
    const cuentas = auth.cuentas;

    if (!cuentas[i]) return;

    if (auth.sesion && cuentas[i].nombre === auth.sesion.nombre) {
        alert('No puedes eliminar tu propia cuenta');
        return;
    }

    if (confirm(`¿Eliminar a ${cuentas[i].nombre}?`)) {
        cuentas.splice(i, 1);
        auth.cuentas = cuentas;

        renderGestionAuxiliares();
        renderLoginSelect();
    }
}

function exportarCuentas() {
    const blob = new Blob(
        [JSON.stringify({ cuentas: auth.cuentas }, null, 2)],
        { type: 'application/json' }
    );

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

        try {
            data = JSON.parse(e.target.result);
        } catch {
            alert('❌ Archivo inválido');
            return;
        }

        if (!Array.isArray(data.cuentas)) {
            alert('❌ Formato incorrecto');
            return;
        }

        if (confirm(`¿Importar ${data.cuentas.length} cuentas?`)) {
            auth.cuentas = data.cuentas;

            renderGestionAuxiliares();
            renderLoginSelect();

            if (typeof mostrarToast === 'function') {
                mostrarToast('✅ Cuentas importadas');
            }
        }
    };

    reader.readAsText(file);
}

// ── INICIO ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    await auth.inicializar();
    renderLoginSelect();
});