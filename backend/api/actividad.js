const express = require('express');
const router = express.Router();
const db = require('../base_datos/database');

// Obtener actividad reciente
router.get('/reciente', async (req, res) => {
    try {
        const { limite = 6 } = req.query;
        const [interacciones] = await db.query(`
            (SELECT 
                'interaccion' as tipo,
                CONCAT('Usuario ', i.session_id, ' ', 
                    CASE i.tipo_interaccion 
                        WHEN 'ver_producto' THEN 'vio el producto'
                        WHEN 'agregar_favorito' THEN 'agregó a favoritos'
                        ELSE i.tipo_interaccion 
                    END) as texto,
                p.nombre as detalle,
                i.fecha_interaccion as fecha
            FROM interacciones i
            LEFT JOIN productos p ON i.producto_id = p.id
            WHERE i.tipo_interaccion IN ('ver_producto', 'agregar_favorito')
            ORDER BY i.fecha_interaccion DESC
            LIMIT ?)
            UNION ALL
            (SELECT 
                'producto' as tipo,
                'Nuevo producto agregado' as texto,
                nombre as detalle,
                fecha_publicacion as fecha
            FROM productos
            ORDER BY fecha_publicacion DESC
            LIMIT ?)
            UNION ALL
            (SELECT 
                'promocion' as tipo,
                'Promoción activada/creada' as texto,
                titulo as detalle,
                fecha_inicio as fecha
            FROM promociones
            ORDER BY fecha_inicio DESC
            LIMIT ?)
            ORDER BY fecha DESC
            LIMIT ?
        `, [limite, limite, limite, limite]);
        
        const actividades = interacciones.map(a => ({
            texto: a.texto,
            detalle: a.detalle,
            tiempo: timeAgo(new Date(a.fecha)),
            icono: getIcono(a.tipo, a.texto)
        }));
        res.json(actividades);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'hace unos segundos';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    const days = Math.floor(hours / 24);
    return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
}

function getIcono(tipo, texto) {
    if (tipo === 'producto') return 'fas fa-box';
    if (tipo === 'promocion') return 'fas fa-tag';
    if (texto.includes('vio')) return 'fas fa-eye';
    if (texto.includes('favorito')) return 'fas fa-heart';
    return 'fas fa-clock';
}

module.exports = router;