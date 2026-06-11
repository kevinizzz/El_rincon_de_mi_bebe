const express = require('express');

const cors = require('cors');
const path = require('path');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor iniciado en puerto ${PORT}`));

// Configurar CORS (permitir cualquier origen en desarrollo)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/css', express.static(path.join(__dirname, '../frontend/css')));
app.use('/js', express.static(path.join(__dirname, '../frontend/js')));
app.use('/images', express.static(path.join(__dirname, '../frontend/images')));

// Rutas para páginas HTML
app.get('/inicio', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/inicio.html'));
});
app.get('/catalogo', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/catalogo.html'));
});
app.get('/favoritos', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/favoritos.html'));
});
// Agrega otras páginas que necesites

// Importar rutas API
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

// Rutas públicas
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

// Protección de rutas de administración (escritura)
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