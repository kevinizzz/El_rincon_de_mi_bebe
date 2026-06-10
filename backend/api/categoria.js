const express = require('express');
const router = express.Router();
const db = require('../base_datos/database');

// Obtener todas las categorías (sin conteo)
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM categorias ORDER BY nombre');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener categorías con conteo de productos
router.get('/con-conteo', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT c.*, COUNT(p.id) as total_productos
            FROM categorias c
            LEFT JOIN productos p ON p.categoria_id = c.id
            GROUP BY c.id
            ORDER BY c.nombre
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener una categoría por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM categorias WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear nueva categoría
router.post('/', async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
        const [result] = await db.query('INSERT INTO categorias (nombre) VALUES (?)', [nombre]);
        res.status(201).json({ id: result.insertId, nombre });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Actualizar categoría
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;
        if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
        await db.query('UPDATE categorias SET nombre = ? WHERE id = ?', [nombre, id]);
        res.json({ message: 'Categoría actualizada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar categoría (solo si no tiene productos asociados)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [productos] = await db.query('SELECT COUNT(*) as total FROM productos WHERE categoria_id = ?', [id]);
        if (productos[0].total > 0) {
            return res.status(400).json({ error: 'No se puede eliminar la categoría porque tiene productos asociados' });
        }
        await db.query('DELETE FROM categorias WHERE id = ?', [id]);
        res.json({ message: 'Categoría eliminada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener categorías populares (top 6)
router.get('/populares', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT c.id, c.nombre,
                   COALESCE(SUM(p.visitas), 0) as total_visitas,
                   COALESCE(SUM(p.favoritos), 0) as total_favoritos,
                   COALESCE(AVG(cal.promedio), 0) as avg_rating
            FROM categorias c
            LEFT JOIN productos p ON p.categoria_id = c.id
            LEFT JOIN (
                SELECT producto_id, AVG(puntuacion) as promedio
                FROM calificaciones
                GROUP BY producto_id
            ) cal ON cal.producto_id = p.id
            GROUP BY c.id
            ORDER BY (total_visitas * 0.4 + total_favoritos * 0.4 + avg_rating * 10) DESC
            LIMIT 6
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;