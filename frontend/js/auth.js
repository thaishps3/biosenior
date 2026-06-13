// ── AUTENTICACIÓN COMPARTIDA ─────────────────────────────────────────────────
// Los usuarios viven en PostgreSQL.
// La sesión activa vive temporalmente en sessionStorage.

const API_URL_AUTH = `${window.location.origin}/api`;

const auth = {
    usuarios: [],

    get sesion() {
        return JSON.parse(sessionStorage.getItem("sgp_sesion") || "null");
    },

    set sesion(v) {
        sessionStorage.setItem("sgp_sesion", JSON.stringify(v));
    },

    async inicializar() {
        try {
            const respuesta = await fetch(`${API_URL_AUTH}/usuarios`);

            if (!respuesta.ok) {
                throw new Error("No se pudieron cargar los usuarios");
            }

            this.usuarios = await respuesta.json();

            renderLoginSelect();
        } catch (error) {
            console.error("Error cargando usuarios desde PostgreSQL:", error);
            this.usuarios = [];
        }
    },

    verificarSesion(rutaLogin = "index.html") {
        if (!this.sesion) {
            window.location.href = rutaLogin;
            return false;
        }

        return true;
    },

    cerrarSesion(rutaLogin = "index.html") {
        sessionStorage.removeItem("sgp_sesion");
        window.location.href = rutaLogin;
    },

    async login(nombre, pin) {
        const respuesta = await fetch(`${API_URL_AUTH}/usuarios/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ nombre, pin })
        });

        const data = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(data.mensaje || "Credenciales incorrectas");
        }

        this.sesion = {
            id_usuario: data.usuario.id_usuario,
            nombre: data.usuario.nombre,
            email: data.usuario.email,
            rol: data.usuario.rol
        };

        return data.usuario;
    }
};

// ── TECLADO PIN ───────────────────────────────────────────────────────────────

let pinActual = "";

function actualizarDots() {
    for (let i = 0; i < 4; i++) {
        const dot = document.getElementById("dot" + i);

        if (dot) {
            dot.classList.toggle("filled", i < pinActual.length);
        }
    }
}

function pinPress(digit) {
    if (pinActual.length >= 4) return;

    pinActual += digit;
    actualizarDots();

    const err = document.getElementById("pinError");

    if (err) {
        err.innerText = "";
    }

    if (pinActual.length === 4) {
        validarPin();
    }
}

function pinDel() {
    pinActual = pinActual.slice(0, -1);
    actualizarDots();
}

async function validarPin() {
    const loginSelect = document.getElementById("loginSelect");
    const err = document.getElementById("pinError");

    if (!loginSelect) return;

    const idx = loginSelect.value;

    if (idx === "") {
        if (err) {
            err.innerText = "Selecciona tu nombre primero";
        }

        pinActual = "";
        actualizarDots();
        return;
    }

    const usuario = auth.usuarios[parseInt(idx)];

    if (!usuario) {
        if (err) {
            err.innerText = "Usuario no encontrado";
        }

        pinActual = "";
        actualizarDots();
        return;
    }

    try {
        await auth.login(usuario.nombre, pinActual);

        pinActual = "";
        actualizarDots();

        window.location.href = "menu-principal.html";
    } catch (error) {
        if (err) {
            err.innerText = error.message || "PIN incorrecto, inténtalo de nuevo";
        }

        pinActual = "";
        actualizarDots();
    }
}

function renderLoginSelect() {
    const select = document.getElementById("loginSelect");

    if (!select) return;

    select.innerHTML = '<option value="">Seleccionar...</option>';

    const usuariosActivos = auth.usuarios.filter(u => u.activo === true);

    usuariosActivos.forEach((u, i) => {
        const rol = u.rol === "admin" ? "👩‍💼 Admin" : "👩 Auxiliar";

        select.innerHTML += `
            <option value="${i}">
                ${u.nombre} — ${rol}
            </option>
        `;
    });

    auth.usuarios = usuariosActivos;
}

// ── GESTIÓN LOCAL ANTIGUA DESACTIVADA ─────────────────────────────────────────
// La creación de usuarios ya no debe hacerse desde localStorage.
// Ahora se hará desde Gestión Admin usando POST /api/usuarios.

document.addEventListener("DOMContentLoaded", () => {
    auth.inicializar();
});