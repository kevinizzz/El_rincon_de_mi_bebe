const express = require('express');
const router = express.Router();
const db = require('../base_datos/database');
const { randomUUID } = require('crypto');

// Iniciar nueva sesión (o recuperar existente)
router.post('/iniciar', async (req, res) => {
    try {
        let { session_uuid, dispositivo } = req.body;
        let uuid = session_uuid;

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
        const [result] = await db.query(
            `INSERT INTO sesiones (session_uuid, dispositivo, fecha_inicio, fecha_ultima_actividad)
             VALUES (?, ?, NOW(), NOW())`,
            [uuid, dispositivoShort]
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
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// ========== NUEVOS ENDPOINTS PARA EL DASHBOARD ==========

// Usuarios activos (últimos 5 minutos) – divide por dispositivo
router.get('/activas', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                COUNT(*) as activos,
                SUM(CASE WHEN dispositivo LIKE '%Móvil%' THEN 1 ELSE 0 END) as movil,
                SUM(CASE WHEN dispositivo NOT LIKE '%Móvil%' THEN 1 ELSE 0 END) as pc
            FROM sesiones
            WHERE fecha_ultima_actividad >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        `);

        res.json({
            activos: rows[0].activos || 0,
            movil: rows[0].movil || 0,
            pc: rows[0].pc || 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Últimos visitantes (últimas sesiones)
router.get('/ultimas', async (req, res) => {
    try {
        const { limite = 10 } = req.query;
        const [rows] = await db.query(`
            SELECT
                dispositivo,
                fecha_inicio,
                fecha_ultima_actividad
            FROM sesiones
            ORDER BY fecha_ultima_actividad DESC
            LIMIT ?
        `, [parseInt(limite)]);

        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;