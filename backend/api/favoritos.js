const express = require('express');
const router = express.Router();
const db = require('../base_datos/database');

// Obtener favoritos del usuario por session_uuid
router.get('/', async (req, res) => {
    try {
        const { session_uuid } = req.query;
        if (!session_uuid) {
            return res.status(400).json({ error: 'session_uuid requerido' });
        }

        const [sesion] = await db.query('SELECT id FROM sesiones WHERE session_uuid = ?', [session_uuid]);
        if (sesion.length === 0) {
            return res.status(404).json({ error: 'Sesión no encontrada' });
        }
        const session_id = sesion[0].id;

        const [favoritos] = await db.query(`
            SELECT 
                p.id,
                p.nombre,
                p.descripcion,
                p.precio,
                p.talla,
                p.visitas,
                p.favoritos,
                c.nombre as categoria_nombre,
                (SELECT imagen_url FROM producto_imagenes WHERE producto_id = p.id AND es_principal = 1 LIMIT 1) as imagen_principal,
                COALESCE(
                    (
                        SELECT descuento
                        FROM promociones
                        WHERE producto_id = p.id
                          AND activa = 1
                          AND fecha_inicio <= NOW()
                          AND fecha_fin >= NOW()
                        ORDER BY descuento DESC
                        LIMIT 1
                    ),
                    (
                        SELECT descuento
                        FROM promociones
                        WHERE categoria_id = p.categoria_id
                          AND activa = 1
                          AND fecha_inicio <= NOW()
                          AND fecha_fin >= NOW()
                        ORDER BY descuento DESC
                        LIMIT 1
                    ),
                    0
                ) AS descuento
            FROM favoritos f
            JOIN productos p ON f.producto_id = p.id
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE f.session_id = ?
            ORDER BY f.fecha_favorito DESC
        `, [session_id]);

        const productosFavoritos = favoritos.map(p => ({
            ...p,
            descuento_total: p.descuento || 0,
            precio_con_descuento: (p.precio * (1 - (p.descuento || 0) / 100)).toFixed(2)
        }));

        res.json(productosFavoritos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Toggle favorito (agregar o quitar)
router.post('/toggle', async (req, res) => {
    try {
        const { session_uuid, producto_id, agregar } = req.body;
        if (!session_uuid || !producto_id) {
            return res.status(400).json({ error: 'session_uuid y producto_id requeridos' });
        }

        const [sesion] = await db.query('SELECT id FROM sesiones WHERE session_uuid = ?', [session_uuid]);
        if (sesion.length === 0) {
            return res.status(404).json({ error: 'Sesión no encontrada' });
        }
        const session_id = sesion[0].id;

        if (agregar) {
            await db.query(
                `INSERT INTO favoritos (session_id, producto_id, fecha_favorito) VALUES (?, ?, NOW())
                 ON DUPLICATE KEY UPDATE fecha_favorito = NOW()`,
                [session_id, producto_id]
            );
            await db.query('UPDATE productos SET favoritos = favoritos + 1 WHERE id = ?', [producto_id]);
        } else {
            await db.query('DELETE FROM favoritos WHERE session_id = ? AND producto_id = ?', [session_id, producto_id]);
            await db.query('UPDATE productos SET favoritos = favoritos - 1 WHERE id = ? AND favoritos > 0', [producto_id]);
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;