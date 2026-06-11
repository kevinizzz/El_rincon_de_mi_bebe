require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// ======================
// MIDDLEWARES
// ======================
app.use(cors({
    origin: '*'
}));

app.use(express.json());

// ======================
// BASE DE DATOS
// ======================
const db = require('./base_datos/database');

// ======================
// RUTA PRINCIPAL
// ======================
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'API funcionando en Railway'
    });
});

// ======================
// TEST DB
// ======================
app.get('/test-db', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT DATABASE() AS db');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: error.message
        });
    }
});

// ======================
// RUTAS API
// ======================

// EJEMPLO:
app.use('/api/productos', require('./api/productos'));
app.use('/api/categoria', require('./api/categoria'));
app.use('/api/promociones', require('./api/promociones'));
app.use('/api/favoritos', require('./api/favoritos'));
app.use('/api/calificaciones', require('./api/calificaciones'));
app.use('/api/interacciones', require('./api/interacciones'));
app.use('/api/temporada', require('./api/temporada'));
app.use('/api/sesiones', require('./api/sesiones'));
app.use('/api/admin', require('./api/admin'));
app.use('/api/actividad', require('./api/actividad'));

// ======================
// INICIAR SERVIDOR
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en puerto ${PORT}`);
});