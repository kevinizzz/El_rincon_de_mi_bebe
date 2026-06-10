const express = require('express');
const router = express.Router();
const db = require('../base_datos/database');
const { randomUUID } = require('crypto');

// Iniciar nueva sesión (o recuperar existente)
router.post('/iniciar', async (req, res) => {
    try {
        let { session_uuid, dispositivo, navegador, ciudad, pais } = req.body;
        let uuid = session_uuid;

        // Validar formato UUID si se proporciona
        if (uuid && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
            return res.status(400).json({ error: 'UUID inválido' });
        }

        if (!uuid) {
            uuid = randomUUID();
        } else {
            const [existente] = await db.query('SELECT id FROM sesiones WHERE session_uuid = ?', [uuid]);
            if (existente.length > 0) {
                await db.query('UPDATE sesiones SET fecha_ultima_actividad = NOW() WHERE session_uuid = ?', [uuid]);
                const [rows] = await db.query('SELECT id FROM sesiones WHERE session_uuid = ?', [uuid]);
                return res.json({ success: true, session_id: rows[0].id, session_uuid: uuid });
            }
        }

        const dispositivoShort = dispositivo ? dispositivo.substring(0, 100) : null;
        const navegadorShort = navegador ? navegador.substring(0, 255) : null;

        const [result] = await db.query(
            `INSERT INTO sesiones (session_uuid, dispositivo, navegador, ciudad, pais, fecha_inicio, fecha_ultima_actividad)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [uuid, dispositivoShort, navegadorShort, ciudad || null, pais || null]
        );
        res.json({ success: true, session_id: result.insertId, session_uuid: uuid });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Heartbeat
router.post('/heartbeat', async (req, res) => {
    try {
        const { session_uuid } = req.body;
        if (!session_uuid) return res.status(400).json({ error: 'session_uuid requerido' });
        await db.query('UPDATE sesiones SET fecha_ultima_actividad = NOW() WHERE session_uuid = ?', [session_uuid]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Sesiones por día (para dashboard)
router.get('/por-dia', async (req, res) => {
    try {
        const { dias = 7 } = req.query;
        const [rows] = await db.query(`
            SELECT DATE(fecha_inicio) as dia, COUNT(*) as total
            FROM sesiones
            WHERE fecha_inicio >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(fecha_inicio)
            ORDER BY dia ASC
        `, [dias]);
        const daysMap = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' };
        const result = rows.map(r => ({ dia: daysMap[new Date(r.dia).getDay()], total: r.total }));
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;