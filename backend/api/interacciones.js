const express = require('express');
const router = express.Router();
const db = require('../base_datos/database');

router.get('/contar', async (req, res) => {
    try {
        const { tipo, fecha, desde } = req.query;
        let sql = `SELECT COUNT(*) AS total FROM interacciones WHERE 1=1`;
        const params = [];
        if (tipo) { sql += ' AND tipo_interaccion = ?'; params.push(tipo); }
        if (fecha) { sql += ' AND DATE(fecha_interaccion) = ?'; params.push(fecha); }
        if (desde) { sql += ' AND fecha_interaccion >= ?'; params.push(desde); }
        const [rows] = await db.query(sql, params);
        res.json({ total: rows[0].total });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: error.message
        });
    }
});


router.post('/registrar', async (req, res) => {
    try {
        const { session_uuid, producto_id, tipo_interaccion, tiempo_visualizacion_seg } = req.body;
        if (!session_uuid || !tipo_interaccion) {
            return res.status(400).json({ error: 'session_uuid y tipo_interaccion son requeridos' });
        }

        const [sesion] = await db.query('SELECT id FROM sesiones WHERE session_uuid = ?', [session_uuid]);
        if (sesion.length === 0) {
            return res.status(404).json({ error: 'Sesión no encontrada' });
        }
        const session_id = sesion[0].id;
        let productoExiste = false;
        if (producto_id) {
            const [prod] = await db.query('SELECT id FROM productos WHERE id = ?', [producto_id]);
            productoExiste = prod.length > 0;
            if (!productoExiste) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }
        }

        await db.query(
            `INSERT INTO interacciones (session_id, producto_id, tipo_interaccion, tiempo_visualizacion_seg, fecha_interaccion)
             VALUES (?, ?, ?, ?, NOW())`,
            [session_id, producto_id || null, tipo_interaccion, tiempo_visualizacion_seg || 0]
        );

        if (producto_id && productoExiste) {
            if (tipo_interaccion === 'ver_producto') {
                await db.query('UPDATE productos SET visitas = visitas + 1 WHERE id = ?', [producto_id]);
            } 
            else if (tipo_interaccion === 'agregar_favorito') {
                await db.query('UPDATE productos SET favoritos = favoritos + 1 WHERE id = ?', [producto_id]);
                await db.query(
                    `INSERT INTO favoritos (session_id, producto_id, fecha_favorito) 
                     VALUES (?, ?, NOW())
                     ON DUPLICATE KEY UPDATE fecha_favorito = NOW()`,
                    [session_id, producto_id]
                );
            }
            else if (tipo_interaccion === 'quitar_favorito') {
                await db.query('UPDATE productos SET favoritos = favoritos - 1 WHERE id = ? AND favoritos > 0', [producto_id]);
                await db.query('DELETE FROM favoritos WHERE session_id = ? AND producto_id = ?', [session_id, producto_id]);
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/recientes', async (req, res) => {
    try {
        const { limite = 5 } = req.query;
        const [rows] = await db.query(`
            SELECT i.tipo_interaccion, 
                   p.nombre as producto_nombre,
                   i.fecha_interaccion,
                   TIMESTAMPDIFF(MINUTE, i.fecha_interaccion, NOW()) as minutos_desde
            FROM interacciones i
            LEFT JOIN productos p ON i.producto_id = p.id
            ORDER BY i.fecha_interaccion DESC
            LIMIT ?
        `, [parseInt(limite)]);
        const actividades = rows.map(r => ({
            texto: formatearTextoInteraccion(r.tipo_interaccion),
            detalle: r.producto_nombre || '',
            tiempo: r.minutos_desde < 1 ? 'hace unos segundos' : `hace ${r.minutos_desde} ${r.minutos_desde === 1 ? 'minuto' : 'minutos'}`,
            icono: obtenerIconoInteraccion(r.tipo_interaccion)
        }));
        res.json(actividades);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/ultimas-categorias', async (req, res) => {
    try {
        const { session_uuid, limite = 3 } = req.query;
        if (!session_uuid) return res.status(400).json({ error: 'session_uuid requerido' });
        const [rows] = await db.query(`
            SELECT p.categoria_id
            FROM interacciones i
            JOIN sesiones s ON i.session_id = s.id
            JOIN productos p ON i.producto_id = p.id
            WHERE s.session_uuid = ? AND p.categoria_id IS NOT NULL
            GROUP BY p.categoria_id
            ORDER BY MAX(i.fecha_interaccion) DESC
            LIMIT ?
        `, [session_uuid, parseInt(limite)]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

function formatearTextoInteraccion(tipo) {
    const textos = {
        'ver_producto': 'Producto visto',
        'agregar_favorito': 'Añadido a favoritos',
        'quitar_favorito': 'Eliminado de favoritos',
        'buscar_producto': 'Búsqueda realizada',
        'ver_promocion': 'Promoción vista',
        'consulta_producto': 'Consulta por WhatsApp'
    };
    return textos[tipo] || tipo;
}

function obtenerIconoInteraccion(tipo) {
    const iconos = {
        'ver_producto': 'fas fa-eye',
        'agregar_favorito': 'fas fa-heart',
        'quitar_favorito': 'fas fa-heart-broken',
        'buscar_producto': 'fas fa-search',
        'ver_promocion': 'fas fa-tag',
        'consulta_producto': 'fab fa-whatsapp'
    };
    return iconos[tipo] || 'fas fa-bell';
}


router.get('/contar', async (req, res) => {
    try {
        const { tipo, fecha, desde } = req.query;
        let sql = 'SELECT COUNT(*) AS total FROM interacciones WHERE 1=1';
        const params = [];
        if (tipo) {
            sql += ' AND tipo_interaccion = ?';
            params.push(tipo);
        }
        if (fecha) {
            sql += ' AND DATE(fecha_interaccion) = ?';
            params.push(fecha);
        }
        if (desde) {
            sql += ' AND fecha_interaccion >= ?';
            params.push(desde);
        }
        const [rows] = await db.query(sql, params);
        res.json({ total: rows[0].total });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;