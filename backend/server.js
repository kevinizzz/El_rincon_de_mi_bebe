const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Importar rutas
const productosRoutes = require("./api/productos");
const categoriasRoutes = require("./api/categoria");
const temporadasRoutes = require("./api/temporada");
const promocionesRoutes = require("./api/promociones");
const sesionesRoutes = require("./api/sesiones");
const interaccionesRoutes = require("./api/interacciones");
const actividadRoutes = require("./api/actividad");
const calificacionesRoutes = require("./api/calificaciones");
const adminRoutes = require("./api/admin");

// Middleware de autenticación para rutas protegidas (opcional – puedes aplicarlo solo a POST/PUT/DELETE)
const { verificarAdmin } = require('./middlewares/auth');

// Rutas públicas (sin autenticación)
app.use("/api/productos", productosRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/temporadas", temporadasRoutes);
app.use("/api/promociones", promocionesRoutes);
app.use("/api/sesiones", sesionesRoutes);
app.use("/api/interacciones", interaccionesRoutes);
app.use("/api/actividad", actividadRoutes);
app.use("/api/calificaciones", calificacionesRoutes);
app.use("/api/admin", adminRoutes); // login y verificación

// Ejemplo de protección de rutas específicas (solo para operaciones de escritura en productos)
// Puedes extenderlo a otras rutas de administración
app.use("/api/productos", (req, res, next) => {
    // Solo proteger POST, PUT, DELETE, PATCH
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return verificarAdmin(req, res, next);
    }
    next();
});
// Proteger también categorías, temporadas, promociones en escritura
app.use("/api/categorias", (req, res, next) => {
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) return verificarAdmin(req, res, next);
    next();
});
app.use("/api/temporadas", (req, res, next) => {
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) return verificarAdmin(req, res, next);
    next();
});
app.use("/api/promociones", (req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) return verificarAdmin(req, res, next);
    next();
});

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('Servidor funcionando - El Rincón de mi Bebé');
});

app.get('/test-db', async (req, res) => {
    try {
        const db = require('./base_datos/database');
        const [rows] = await db.query('SELECT DATABASE() AS bd');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor iniciado en puerto ${PORT}`);
});