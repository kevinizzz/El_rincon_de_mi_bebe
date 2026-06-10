const express = require('express');
const router = express.Router();
const db = require('../base_datos/database');

// Obtener promedio y total de calificaciones de un producto
router.get('/producto/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            `SELECT 
                ROUND(AVG(puntuacion), 1) as promedio,
                COUNT(*) as total
             FROM calificaciones
             WHERE producto_id = ?`,
            [id]
        );
        res.json({
            promedio: rows[0].promedio || 0,
            total: rows[0].total || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener calificación del usuario actual (por session_uuid)
router.get('/usuario', async (req, res) => {
    try {
        const { session_uuid, producto_id } = req.query;
        if (!session_uuid || !producto_id) {
            return res.status(400).json({ error: 'session_uuid y producto_id requeridos' });
        }
        const [rows] = await db.query(
            'SELECT puntuacion, comentario FROM calificaciones WHERE session_uuid = ? AND producto_id = ?',
            [session_uuid, producto_id]
        );
        res.json(rows[0] || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Guardar o actualizar calificación
router.post('/', async (req, res) => {
    try {
        const { session_uuid, producto_id, puntuacion, comentario } = req.body;
        if (!session_uuid || !producto_id || !puntuacion) {
            return res.status(400).json({ error: 'Faltan datos' });
        }
        if (puntuacion < 1 || puntuacion > 5) {
            return res.status(400).json({ error: 'Puntuación debe ser 1-5' });
        }
        // Verificar que la sesión existe
        const [sesion] = await db.query('SELECT id FROM sesiones WHERE session_uuid = ?', [session_uuid]);
        if (sesion.length === 0) {
            return res.status(404).json({ error: 'Sesión no encontrada' });
        }
        await db.query(
            `INSERT INTO calificaciones (producto_id, session_uuid, puntuacion, comentario)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE puntuacion = VALUES(puntuacion), comentario = VALUES(comentario), fecha = NOW()`,
            [producto_id, session_uuid, puntuacion, comentario || null]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;