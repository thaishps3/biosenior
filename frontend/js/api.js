const API_URL = "http://localhost:3000/api";

async function apiGet(ruta) {
    const respuesta = await fetch(`${API_URL}${ruta}`);

    if (!respuesta.ok) {
        throw new Error(`Error GET ${ruta}`);
    }

    return await respuesta.json();
}

async function apiPost(ruta, datos) {
    const respuesta = await fetch(`${API_URL}${ruta}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(datos)
    });

    if (!respuesta.ok) {
        throw new Error(`Error POST ${ruta}`);
    }

    return await respuesta.json();
}