const express = require('express');
const router = express.Router();
const db = require('../base_datos/database');

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM temporadas ORDER BY nombre');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/con-conteo', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT t.*, COUNT(p.id) as total_productos
            FROM temporadas t
            LEFT JOIN productos p ON p.temporada_id = t.id
            GROUP BY t.id
            ORDER BY t.nombre
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM temporadas WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Temporada no encontrada' });
        res.json(rows[0]);
         } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
        const [result] = await db.query('INSERT INTO temporadas (nombre) VALUES (?)', [nombre]);
        res.status(201).json({ id: result.insertId, nombre });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;
        if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
        await db.query('UPDATE temporadas SET nombre = ? WHERE id = ?', [nombre, id]);
        res.json({ message: 'Temporada actualizada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [productos] = await db.query('SELECT COUNT(*) as total FROM productos WHERE temporada_id = ?', [id]);
        if (productos[0].total > 0) {
            return res.status(400).json({ error: 'No se puede eliminar la temporada porque tiene productos asociados' });
        }
        await db.query('DELETE FROM temporadas WHERE id = ?', [id]);
        res.json({ message: 'Temporada eliminada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;