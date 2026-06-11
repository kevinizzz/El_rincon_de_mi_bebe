const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ======================
// MIDDLEWARES
// ======================
app.use(cors({
    origin: '*'
}));

app.use(express.json());

// ======================
// TEST ROUTE
// ======================
app.get('/', (req, res) => {
    res.json({
        status: "OK",
        message: "API funcionando en Vercel"
    });
});

// ======================
// DB TEST
// ======================
app.get('/test-db', async (req, res) => {
    try {
        const db = require('./database');
        const [rows] = await db.query('SELECT DATABASE() AS db');
        res.json(rows);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// ======================
// EXPORT (IMPORTANTE EN VERCEL)
// ======================
module.exports = app;