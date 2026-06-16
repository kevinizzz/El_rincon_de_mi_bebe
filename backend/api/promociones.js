const express = require('express');
const router = express.Router();
const db = require('../base_datos/database');

async function registrarActividadAdmin(accion, descripcion) {
    try {
        await db.query(
            'INSERT INTO actividades_admin (accion, descripcion) VALUES (?, ?)',
            [accion, descripcion]
        );
    } catch (error) {
        console.error('Error registrando actividad:', error);
    }
}


router.get('/destacadas', async (req, res) => {
    try {
        const hoy = new Date().toISOString().split('T')[0];
        const [rows] = await db.query(`
            SELECT DISTINCT 
                p.id, 
                p.nombre, 
                p.precio, 
                p.visitas,
                (SELECT imagen_url FROM producto_imagenes WHERE producto_id = p.id AND es_principal = 1 LIMIT 1) AS imagen_principal,
                pr.descuento
            FROM productos p
            INNER JOIN promociones pr ON (pr.producto_id = p.id OR pr.categoria_id = p.categoria_id)
            WHERE p.activo = 1
              AND pr.activa = 1
              AND pr.fecha_inicio <= ?
              AND pr.fecha_fin >= ?
            ORDER BY p.visitas DESC
            LIMIT 6
        `, [hoy, hoy]);

        const resultados = rows.map(p => ({
            id: p.id,
            nombre: p.nombre,
            precio: parseFloat(p.precio),
            visitas: p.visitas,
            imagen_principal: p.imagen_principal || '',
            descuento_total: p.descuento || 0,
            precio_con_descuento: (p.precio * (1 - (p.descuento || 0) / 100)).toFixed(2)
        }));
        res.json(resultados);
    } catch (error) {
        console.error('❌ Error en /destacadas:', error);
        res.status(500).json({ error: error.message, sqlMessage: error.sqlMessage });
    }
});

router.get('/combos', async (req, res) => {
    try {
        const hoy = new Date().toISOString().split('T')[0];
        const [rows] = await db.query(`
            SELECT c.*,
                   (SELECT GROUP_CONCAT(p.nombre SEPARATOR ' + ') FROM combo_productos cp JOIN productos p ON cp.producto_id = p.id WHERE cp.combo_id = c.id) as productos_nombres
            FROM promociones_combo c
            WHERE c.activa = 1 AND c.fecha_inicio <= ? AND c.fecha_fin >= ?
            ORDER BY c.id DESC
        `, [hoy, hoy]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/combos/todos', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                c.*,
                (
                    SELECT GROUP_CONCAT(p.nombre SEPARATOR ' + ')
                    FROM combo_productos cp
                    JOIN productos p ON cp.producto_id = p.id
                    WHERE cp.combo_id = c.id
                ) AS productos_nombres,
                (
                    SELECT GROUP_CONCAT(cp.producto_id)
                    FROM combo_productos cp
                    WHERE cp.combo_id = c.id
                ) AS productos_ids
            FROM promociones_combo c
            ORDER BY c.id DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/', async (req, res) => {
    try {
        let { activa, limite } = req.query;
        let sql = `
            SELECT p.*, 
                   c.nombre as categoria_nombre,
                   prod.nombre as producto_nombre
            FROM promociones p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN productos prod ON p.producto_id = prod.id
        `;
        const params = [];
        if (activa !== undefined) {
            sql += ` WHERE p.activa = ?`;
            params.push(activa === '1' ? 1 : 0);
        }
        sql += ` ORDER BY p.fecha_inicio DESC`;
        if (limite) {
            sql += ` LIMIT ?`;
            params.push(parseInt(limite));
        }
        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(`
            SELECT p.*, 
                   c.nombre as categoria_nombre,
                   prod.nombre as producto_nombre
            FROM promociones p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN productos prod ON p.producto_id = prod.id
            WHERE p.id = ?
        `, [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Promoción no encontrada' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { titulo, categoria_id, producto_id, descuento, descripcion, fecha_inicio, fecha_fin, activa } = req.body;
        if (!titulo || !descuento || !fecha_inicio || !fecha_fin) {
            return res.status(400).json({ error: 'Título, descuento, fecha inicio y fin son obligatorios' });
        }
        if ((!categoria_id && !producto_id) || (categoria_id && producto_id)) {
            return res.status(400).json({ error: 'Debe seleccionar una categoría O un producto específico (no ambos)' });
        }

        if (producto_id) {
            const [existe] = await db.query(
                `SELECT id FROM promociones WHERE producto_id = ? AND activa = 1`,
                [producto_id]
            );
            if (existe.length > 0) {
                return res.status(400).json({ error: 'Este producto ya tiene una promoción activa. Solo puede tener una.' });
            }
        }

        const [result] = await db.query(
            `INSERT INTO promociones (titulo, categoria_id, producto_id, descuento, descripcion, fecha_inicio, fecha_fin, activa)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [titulo, categoria_id || null, producto_id || null, descuento, descripcion || '', fecha_inicio, fecha_fin, activa !== undefined ? activa : 1]
        );

        await registrarActividadAdmin('crear_promocion', `Promoción creada: ${titulo}`);

        res.status(201).json({ id: result.insertId, message: 'Promoción creada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, categoria_id, producto_id, descuento, descripcion, fecha_inicio, fecha_fin, activa } = req.body;
        if (!titulo || !descuento || !fecha_inicio || !fecha_fin) {
            return res.status(400).json({ error: 'Título, descuento, fecha inicio y fin son obligatorios' });
        }
        if ((!categoria_id && !producto_id) || (categoria_id && producto_id)) {
            return res.status(400).json({ error: 'Debe seleccionar una categoría O un producto específico (no ambos)' });
        }

        if (producto_id) {
            const [existe] = await db.query(
                `SELECT id FROM promociones WHERE producto_id = ? AND activa = 1 AND id != ?`,
                [producto_id, id]
            );
            if (existe.length > 0) {
                return res.status(400).json({ error: 'Este producto ya tiene otra promoción activa. Solo puede tener una.' });
            }
        }

        await db.query(
            `UPDATE promociones SET 
                titulo = ?, categoria_id = ?, producto_id = ?, descuento = ?, 
                descripcion = ?, fecha_inicio = ?, fecha_fin = ?, activa = ?
             WHERE id = ?`,
            [titulo, categoria_id || null, producto_id || null, descuento, descripcion || '', fecha_inicio, fecha_fin, activa, id]
        );

        await registrarActividadAdmin('editar_promocion', `Promoción actualizada: ${titulo} (ID ${id})`);

        res.json({ message: 'Promoción actualizada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [promo] = await db.query('SELECT titulo FROM promociones WHERE id = ?', [id]);
        const titulo = promo.length ? promo[0].titulo : `ID ${id}`;

        await db.query('DELETE FROM promociones WHERE id = ?', [id]);

        await registrarActividadAdmin('eliminar_promocion', `Promoción eliminada: ${titulo}`);

        res.json({ message: 'Promoción eliminada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE promociones SET activa = NOT activa WHERE id = ?', [id]);

        const [promo] = await db.query('SELECT titulo, activa FROM promociones WHERE id = ?', [id]);
        const estado = promo[0].activa ? 'activada' : 'desactivada';
        await registrarActividadAdmin('toggle_promocion', `Promoción ${promo[0].titulo} ${estado}`);

        res.json({ message: 'Estado actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/combos', async (req, res) => {
    try {
        const { titulo, descripcion, descuento, fecha_inicio, fecha_fin, activa, productos_ids } = req.body;
        if (!titulo || !descuento || !fecha_inicio || !fecha_fin || !productos_ids || productos_ids.length === 0) {
            return res.status(400).json({ error: 'Faltan datos obligatorios' });
        }
        const [result] = await db.query(
            `INSERT INTO promociones_combo (titulo, descripcion, descuento, fecha_inicio, fecha_fin, activa)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [titulo, descripcion || '', descuento, fecha_inicio, fecha_fin, activa !== undefined ? activa : 1]
        );
        const comboId = result.insertId;
        for (const prodId of productos_ids) {
            await db.query('INSERT INTO combo_productos (combo_id, producto_id) VALUES (?, ?)', [comboId, prodId]);
        }

        await registrarActividadAdmin('crear_combo', `Combo creado: ${titulo}`);

        res.status(201).json({ id: comboId, message: 'Combo creado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/combos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(`SELECT * FROM promociones_combo WHERE id = ?`, [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Combo no encontrado' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/combos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, descripcion, descuento, fecha_inicio, fecha_fin, activa, productos_ids } = req.body;
        await db.query(
            `UPDATE promociones_combo SET titulo=?, descripcion=?, descuento=?, fecha_inicio=?, fecha_fin=?, activa=? WHERE id=?`,
            [titulo, descripcion || '', descuento, fecha_inicio, fecha_fin, activa, id]
        );
        await db.query('DELETE FROM combo_productos WHERE combo_id = ?', [id]);
        for (const prodId of productos_ids) {
            await db.query('INSERT INTO combo_productos (combo_id, producto_id) VALUES (?, ?)', [id, prodId]);
        }

        await registrarActividadAdmin('editar_combo', `Combo actualizado: ${titulo} (ID ${id})`);

        res.json({ message: 'Combo actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/combos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [combo] = await db.query('SELECT titulo FROM promociones_combo WHERE id = ?', [id]);
        const titulo = combo.length ? combo[0].titulo : `ID ${id}`;

        await db.query('DELETE FROM promociones_combo WHERE id = ?', [id]);

        await registrarActividadAdmin('eliminar_combo', `Combo eliminado: ${titulo}`);

        res.json({ message: 'Combo eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/combos/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE promociones_combo SET activa = NOT activa WHERE id = ?', [id]);

        const [combo] = await db.query('SELECT titulo, activa FROM promociones_combo WHERE id = ?', [id]);
        const estado = combo[0].activa ? 'activado' : 'desactivado';
        await registrarActividadAdmin('toggle_combo', `Combo ${combo[0].titulo} ${estado}`);

        res.json({ message: 'Estado actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;