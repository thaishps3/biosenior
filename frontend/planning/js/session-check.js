// Verificar sesión del hub y arrancar Planning sin mostrar su login propio

document.addEventListener('DOMContentLoaded', () => {
    if (typeof auth === 'undefined' || !auth.sesion) {
        window.location.href = 'index.html';
        return;
    }

    const s = auth.sesion;

    // Ocultar login propio de Planning, mostrar app
    const loginScreen = document.getElementById('loginScreen');
    const appScreen   = document.getElementById('appScreen');
    if (loginScreen) loginScreen.style.display = 'none';
    if (appScreen)   appScreen.style.display   = 'block';

    // Sincronizar nombre del auxiliar con script.js
    window.currentAuxiliar = s.nombre;
    localStorage.setItem('geria_auxiliar_v2', s.nombre);

    // Rellenar header que doLogin() normalmente rellena
    const displayDate = document.getElementById('displayDate');
    const headerAux   = document.getElementById('headerAuxiliar');
    const dateFull    = new Date().toLocaleDateString('es-ES', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
    if (displayDate) displayDate.innerText = dateFull.toUpperCase();
    if (headerAux)   headerAux.innerText   = s.nombre;

    // FIX 2: ocultar bloques de gestión y backup si es auxiliar
    if (s.rol !== 'admin') {
        // Ocultar gestión de lista permanente
        const adminBlock = document.querySelector('.collapsible-box');
        if (adminBlock) adminBlock.style.display = 'none';
        // Ocultar backup
        const backupBlock = document.querySelector('.backup-box');
        if (backupBlock) backupBlock.style.display = 'none';
    }

    // Renombrar "GESTIONAR LISTA PERMANENTE" por "Gestión de usuarios"
    const adminHeader = document.querySelector('#adminBox-arrow');
    if (adminHeader && adminHeader.previousElementSibling) {
        adminHeader.previousElementSibling.innerText = '⚙️ Gestión de usuarios';
    }
    // También buscar por texto directo
    document.querySelectorAll('.collapsible-header span').forEach(span => {
        if (span.innerText.includes('GESTIONAR LISTA PERMANENTE')) {
            span.innerText = '⚙️ Gestión de usuarios';
        }
    });

    // FIX 1: barra de sesión con colores visibles sobre fondo oscuro
    const info = document.getElementById('planSesionInfo');
    if (info) {
        const rolColor = s.rol === 'admin'
            ? 'background:#fef3e2;color:#7a4a00'
            : 'background:#e6f4f6;color:#0a5a68';
        info.innerHTML = `
            <span style="font-size:12px;font-weight:500;color:white;">${s.nombre}</span>
            <span style="${rolColor};font-size:10px;padding:2px 8px;border-radius:20px;font-weight:600;margin-left:6px;">${s.rol === 'admin' ? 'Admin' : 'Auxiliar'}</span>
            <button onclick="auth.cerrarSesion('index.html')"
                style="font-size:11px;margin-left:8px;
                       background:rgba(255,255,255,0.2);
                       border:1px solid rgba(255,255,255,0.4);
                       color:white;border-radius:20px;
                       padding:3px 10px;cursor:pointer;
                       font-family:inherit;">Salir</button>`;
    }

    // Llamar render() de script.js
    if (typeof render === 'function') render();
});
