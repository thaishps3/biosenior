const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const pool = require("./db/connection");

const residenteRoutes = require("./routes/residente.routes");
const deposicionRoutes = require("./routes/deposicion.routes");
const planningRoutes = require("./routes/planning.routes");
const usuarioRoutes = require("./routes/usuario.routes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Servir frontend
app.use(express.static(path.join(__dirname, "../frontend")));


// Rutas API
app.use("/api/residentes", residenteRoutes);
app.use("/api/deposiciones", deposicionRoutes);
app.use("/api/planning", planningRoutes);
app.use("/api/usuarios", usuarioRoutes);

app.get("/", (req, res) => {
    res.send("Servidor Control Bio-Senior funcionando");
});

app.get("/api/test", (req, res) => {
    res.json({
        mensaje: "API funcionando correctamente"
    });
});

app.get("/api/db-test", async (req, res) => {
    try {
        const resultado = await pool.query("SELECT NOW()");
        res.json({
            mensaje: "Conexión a PostgreSQL correcta",
            fecha_servidor: resultado.rows[0].now
        });
    } catch (error) {
        console.error("Error conectando a PostgreSQL:", error);
        res.status(500).json({
            mensaje: "Error conectando a PostgreSQL",
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});