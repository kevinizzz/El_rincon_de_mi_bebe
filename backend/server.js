const express = require('express');
const cors = require('cors');
const path = require('path');

// Solo carga .env en desarrollo local
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// MIDDLEWARES
// ======================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ======================
// FRONTEND ESTÁTICO
// ======================
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/css', express.static(path.join(__dirname, '../frontend/css')));
app.use('/js', express.static(path.join(__dirname, '../frontend/js')));
app.use('/images', express.static(path.join(__dirname, '../frontend/images')));

// ======================
// PÁGINAS HTML
// ======================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/inicio.html'));
});

app.get('/inicio', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/inicio.html'));
});

app.get('/catalogo', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/catalogo.html'));
});

app.get('/favoritos', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/favoritos.html'));
});

// ======================
// API ROUTES
// ======================
const productosRoutes = require("./api/productos");
const categoriasRoutes = require("./api/categoria");
const temporadasRoutes = require("./api/temporada");
const promocionesRoutes = require("./api/promociones");
const sesionesRoutes = require("./api/sesiones");
const interaccionesRoutes = require("./api/interacciones");
const actividadRoutes = require("./api/actividad");
const calificacionesRoutes = require("./api/calificaciones");
const adminRoutes = require("./api/admin");
const favoritosRoutes = require("./api/favoritos");

const { verificarAdmin } = require('./middlewares/auth');

app.use("/api/productos", productosRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/temporadas", temporadasRoutes);
app.use("/api/promociones", promocionesRoutes);
app.use("/api/sesiones", sesionesRoutes);
app.use("/api/interacciones", interaccionesRoutes);
app.use("/api/actividad", actividadRoutes);
app.use("/api/calificaciones", calificacionesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/favoritos", favoritosRoutes);

// ======================
// PROTECCIÓN ADMIN
// ======================
app.use("/api/productos", (req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return verificarAdmin(req, res, next);
    }
    next();
});

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

// ======================
// TEST DB
// ======================
app.get('/test-db', async (req, res) => {
    try {
        const db = require('./base_datos/database');
        const [rows] = await db.query('SELECT DATABASE() AS db');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ======================
// START SERVER
// ======================
app.listen(PORT, () => {
    console.log(`✅ Servidor iniciado en puerto ${PORT}`);
});