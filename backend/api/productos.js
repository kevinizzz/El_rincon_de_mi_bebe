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

router.get('/', async (req, res) => {
    try {
        let {
            categoria,
            tallas,
            precio_min,
            precio_max,
            precios,
            colores,
            orden,
            pagina = 1,
            limite = 12,
            busqueda = '',
            destacado,
            activo
        } = req.query;

        let whereClause = ' WHERE 1=1';
        const params = [];

        if (categoria && categoria !== 'all') {
            whereClause += ' AND p.categoria_id = ?';
            params.push(categoria);
        }
        if (busqueda) {
            whereClause += ' AND p.nombre LIKE ?';
            params.push(`%${busqueda}%`);
        }
        if (tallas) {
            const tallasArray = tallas.split(',');
            const tallasCond = tallasArray.map(() => 'p.talla LIKE ?').join(' OR ');
            whereClause += ` AND (${tallasCond})`;
            tallasArray.forEach(t => params.push(`%${t}%`));
        }
        if (precio_min !== undefined || precio_max !== undefined) {
            const min = parseFloat(precio_min);
            const max = parseFloat(precio_max);
            if (!isNaN(min) && !isNaN(max)) {
                whereClause += ' AND p.precio BETWEEN ? AND ?';
                params.push(min, max);
            } else if (!isNaN(min)) {
                whereClause += ' AND p.precio >= ?';
                params.push(min);
            } else if (!isNaN(max)) {
                whereClause += ' AND p.precio <= ?';
                params.push(max);
            }
        } else if (precios) {
            const rangos = precios.split(',');
            const precioCond = rangos.map(rango => {
                const [min, max] = rango.split('-');
                if (max === '999999') return `p.precio >= ?`;
                return `(p.precio BETWEEN ? AND ?)`;
            }).join(' OR ');
            whereClause += ` AND (${precioCond})`;
            rangos.forEach(rango => {
                const [min, max] = rango.split('-');
                if (max === '999999') params.push(parseFloat(min));
                else params.push(parseFloat(min), parseFloat(max));
            });
        }
        if (colores) {
            const coloresArray = colores.split(',');
            const colorCond = coloresArray.map(() => 'p.color = ?').join(' OR ');
            whereClause += ` AND (${colorCond})`;
            coloresArray.forEach(c => params.push(c));
        }
        if (destacado !== undefined) {
            whereClause += ' AND p.destacado = ?';
            params.push(destacado === '1' ? 1 : 0);
        }
        if (activo === undefined) {
            whereClause += ' AND p.activo = 1';
        } else if (activo !== 'todos') {
            whereClause += ' AND p.activo = ?';
            params.push(activo === '1' ? 1 : 0);
        }

        let orderBy = '';
        switch (orden) {
            case 'popular':
            case 'views':
                orderBy = ' ORDER BY p.visitas DESC';
                break;
            case 'price_asc':
                orderBy = ' ORDER BY p.precio ASC';
                break;
            case 'price_desc':
                orderBy = ' ORDER BY p.precio DESC';
                break;
            case 'rating':
                orderBy = ' ORDER BY rating_promedio IS NULL, rating_promedio DESC';
                break;
            case 'favoritos':
                orderBy = ' ORDER BY p.favoritos DESC';
                break;
            default:
                orderBy = ' ORDER BY p.fecha_publicacion DESC';
        }

        const [countResult] = await db.query(`SELECT COUNT(*) as total FROM productos p ${whereClause}`, params);
        const totalRegistros = countResult[0].total;
        const totalPaginas = Math.ceil(totalRegistros / limite);
        const offset = (parseInt(pagina) - 1) * parseInt(limite);

        const query = `
            SELECT p.*,
                   c.nombre as categoria_nombre,
                   t.nombre as temporada_nombre,
                   (SELECT imagen_url FROM producto_imagenes WHERE producto_id = p.id AND es_principal = 1 LIMIT 1) as imagen_principal,
                   (SELECT GROUP_CONCAT(imagen_url SEPARATOR '|') FROM producto_imagenes WHERE producto_id = p.id AND es_principal = 0) as fotos_concat,
                   (SELECT ROUND(AVG(puntuacion), 1) FROM calificaciones WHERE producto_id = p.id) as rating_promedio,
                   (SELECT COUNT(*) FROM calificaciones WHERE producto_id = p.id) as rating_total,
                   (SELECT COUNT(*) > 0 FROM combo_productos cp 
                    JOIN promociones_combo pc ON cp.combo_id = pc.id 
                    WHERE cp.producto_id = p.id AND pc.activa = 1 
                    AND pc.fecha_inicio <= NOW() AND pc.fecha_fin >= NOW()) as en_combo
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN temporadas t ON p.temporada_id = t.id
            ${whereClause}
            ${orderBy}
            LIMIT ? OFFSET ?
        `;
        const [productos] = await db.query(query, [...params, parseInt(limite), offset]);

        const hoy = new Date().toISOString().split('T')[0];
        const [promocionesActivas] = await db.query(
            `SELECT * FROM promociones WHERE activa = 1 AND fecha_inicio <= ? AND fecha_fin >= ?`,
            [hoy, hoy]
        );

        const productosConDescuento = [];
        for (const prod of productos) {
            let descuentoTotal = 0;
            let promoProducto = promocionesActivas.find(promo => promo.producto_id === prod.id);
            if (promoProducto) {
                descuentoTotal = promoProducto.descuento;
            } else {
                let promoCat = promocionesActivas.find(promo => promo.categoria_id === prod.categoria_id);
                if (promoCat) descuentoTotal = promoCat.descuento;
            }
            if (descuentoTotal > 100) descuentoTotal = 100;
            const precioConDescuento = prod.precio * (1 - descuentoTotal / 100);
            const fotos = prod.fotos_concat ? prod.fotos_concat.split('|') : [];
            productosConDescuento.push({
                ...prod,
                fotos: fotos,
                descuento_total: descuentoTotal,
                precio_con_descuento: precioConDescuento.toFixed(2)
            });
        }
        res.json({
            data: productosConDescuento,
            total: totalRegistros,
            page: parseInt(pagina),
            limit: parseInt(limite),
            totalPages: totalPaginas
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/', async (req, res) => {
    try {
        let {
            categoria,
            tallas,
            precio_min,
            precio_max,
            precios,
            colores,
            orden,
            pagina = 1,
            limite = 12,
            busqueda = '',
            destacado,
            activo
        } = req.query;

        let whereClause = ' WHERE 1=1';
        const params = [];

        if (categoria && categoria !== 'all') {
            whereClause += ' AND p.categoria_id = ?';
            params.push(categoria);
        }
        if (busqueda) {
            whereClause += ' AND p.nombre LIKE ?';
            params.push(`%${busqueda}%`);
        }
        if (tallas) {
            const tallasArray = tallas.split(',');
            const tallasCond = tallasArray.map(() => 'p.talla LIKE ?').join(' OR ');
            whereClause += ` AND (${tallasCond})`;
            tallasArray.forEach(t => params.push(`%${t}%`));
        }
        if (precio_min !== undefined || precio_max !== undefined) {
            const min = parseFloat(precio_min);
            const max = parseFloat(precio_max);
            if (!isNaN(min) && !isNaN(max)) {
                whereClause += ' AND p.precio BETWEEN ? AND ?';
                params.push(min, max);
            } else if (!isNaN(min)) {
                whereClause += ' AND p.precio >= ?';
                params.push(min);
            } else if (!isNaN(max)) {
                whereClause += ' AND p.precio <= ?';
                params.push(max);
            }
        } else if (precios) {
            const rangos = precios.split(',');
            const precioCond = rangos.map(rango => {
                const [min, max] = rango.split('-');
                if (max === '999999') return `p.precio >= ?`;
                return `(p.precio BETWEEN ? AND ?)`;
            }).join(' OR ');
            whereClause += ` AND (${precioCond})`;
            rangos.forEach(rango => {
                const [min, max] = rango.split('-');
                if (max === '999999') params.push(parseFloat(min));
                else params.push(parseFloat(min), parseFloat(max));
            });
        }
        if (colores) {
            const coloresArray = colores.split(',');
            const colorCond = coloresArray.map(() => 'p.color = ?').join(' OR ');
            whereClause += ` AND (${colorCond})`;
            coloresArray.forEach(c => params.push(c));
        }
        if (destacado !== undefined) {
            whereClause += ' AND p.destacado = ?';
            params.push(destacado === '1' ? 1 : 0);
        }
        if (activo === undefined) {
            whereClause += ' AND p.activo = 1';
        } else if (activo !== 'todos') {
            whereClause += ' AND p.activo = ?';
            params.push(activo === '1' ? 1 : 0);
        }

        let orderBy = '';
        switch (orden) {
            case 'popular':
            case 'views':
                orderBy = ' ORDER BY p.visitas DESC';
                break;
            case 'price_asc':
                orderBy = ' ORDER BY p.precio ASC';
                break;
            case 'price_desc':
                orderBy = ' ORDER BY p.precio DESC';
                break;
            case 'rating':
                orderBy = ' ORDER BY rating_promedio IS NULL, rating_promedio DESC';
                break;
            default:
                orderBy = ' ORDER BY p.fecha_publicacion DESC';
        }

        const [countResult] = await db.query(`SELECT COUNT(*) as total FROM productos p ${whereClause}`, params);
        const totalRegistros = countResult[0].total;
        const totalPaginas = Math.ceil(totalRegistros / limite);
        const offset = (parseInt(pagina) - 1) * parseInt(limite);

        const query = `
            SELECT p.*,
                   c.nombre as categoria_nombre,
                   t.nombre as temporada_nombre,
                   (SELECT imagen_url FROM producto_imagenes WHERE producto_id = p.id AND es_principal = 1 LIMIT 1) as imagen_principal,
                   (SELECT GROUP_CONCAT(imagen_url SEPARATOR '|') FROM producto_imagenes WHERE producto_id = p.id AND es_principal = 0) as fotos_concat,
                   (SELECT ROUND(AVG(puntuacion), 1) FROM calificaciones WHERE producto_id = p.id) as rating_promedio,
                   (SELECT COUNT(*) FROM calificaciones WHERE producto_id = p.id) as rating_total,
                   (SELECT COUNT(*) > 0 FROM combo_productos cp 
                    JOIN promociones_combo pc ON cp.combo_id = pc.id 
                    WHERE cp.producto_id = p.id AND pc.activa = 1 
                    AND pc.fecha_inicio <= NOW() AND pc.fecha_fin >= NOW()) as en_combo
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN temporadas t ON p.temporada_id = t.id
            ${whereClause}
            ${orderBy}
            LIMIT ? OFFSET ?
        `;
        const [productos] = await db.query(query, [...params, parseInt(limite), offset]);

        const hoy = new Date().toISOString().split('T')[0];
        const [promocionesActivas] = await db.query(
            `SELECT * FROM promociones WHERE activa = 1 AND fecha_inicio <= ? AND fecha_fin >= ?`,
            [hoy, hoy]
        );

        const productosConDescuento = [];
        for (const prod of productos) {
            let descuentoTotal = 0;
            let promoProducto = promocionesActivas.find(promo => promo.producto_id === prod.id);
            if (promoProducto) {
                descuentoTotal = promoProducto.descuento;
            } else {
                let promoCat = promocionesActivas.find(promo => promo.categoria_id === prod.categoria_id);
                if (promoCat) descuentoTotal = promoCat.descuento;
            }
            if (descuentoTotal > 100) descuentoTotal = 100;
            const precioConDescuento = prod.precio * (1 - descuentoTotal / 100);

            const fotos = prod.fotos_concat ? prod.fotos_concat.split('|') : [];

            productosConDescuento.push({
                ...prod,
                fotos: fotos,
                descuento_total: descuentoTotal,
                precio_con_descuento: precioConDescuento.toFixed(2)
            });
        }

        res.json({
            data: productosConDescuento,
            total: totalRegistros,
            page: parseInt(pagina),
            limit: parseInt(limite),
            totalPages: totalPaginas
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [productos] = await db.query(`
            SELECT p.*,
                   c.nombre as categoria_nombre,
                   t.nombre as temporada_nombre,
                   (SELECT ROUND(AVG(puntuacion), 1) FROM calificaciones WHERE producto_id = p.id) as rating_promedio,
                   (SELECT COUNT(*) FROM calificaciones WHERE producto_id = p.id) as rating_total,
                   (SELECT GROUP_CONCAT(imagen_url SEPARATOR '|') FROM producto_imagenes WHERE producto_id = p.id AND es_principal = 0) as fotos_concat,
                   (SELECT COUNT(*) > 0 FROM combo_productos cp 
                    JOIN promociones_combo pc ON cp.combo_id = pc.id 
                    WHERE cp.producto_id = p.id AND pc.activa = 1 
                    AND pc.fecha_inicio <= NOW() AND pc.fecha_fin >= NOW()) as en_combo
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN temporadas t ON p.temporada_id = t.id
            WHERE p.id = ?
        `, [id]);
        if (productos.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        const producto = productos[0];

        const hoy = new Date().toISOString().split('T')[0];
        const [promocionesActivas] = await db.query(
            `SELECT * FROM promociones WHERE activa = 1 AND fecha_inicio <= ? AND fecha_fin >= ?`,
            [hoy, hoy]
        );

        let descuentoTotal = 0;
        let promoProducto = promocionesActivas.find(promo => promo.producto_id === producto.id);
        if (promoProducto) {
            descuentoTotal = promoProducto.descuento;
        } else {
            let promoCat = promocionesActivas.find(promo => promo.categoria_id === producto.categoria_id);
            if (promoCat) descuentoTotal = promoCat.descuento;
        }
        if (descuentoTotal > 100) descuentoTotal = 100;
        producto.descuento_total = descuentoTotal;
        producto.precio_con_descuento = (producto.precio * (1 - descuentoTotal / 100)).toFixed(2);

        const [imagenes] = await db.query(
            'SELECT imagen_url, es_principal FROM producto_imagenes WHERE producto_id = ?',
            [id]
        );
        producto.imagen_principal = imagenes.find(i => i.es_principal === 1)?.imagen_url || '';
        producto.fotos = producto.fotos_concat ? producto.fotos_concat.split('|') : [];
        delete producto.fotos_concat;

        res.json(producto);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id/combos', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(`
            SELECT pc.id, pc.titulo, pc.descuento, 
                   DATE(pc.fecha_inicio) as fecha_inicio, 
                   DATE(pc.fecha_fin) as fecha_fin
            FROM promociones_combo pc
            JOIN combo_productos cp ON cp.combo_id = pc.id
            WHERE cp.producto_id = ? AND pc.activa = 1
              AND pc.fecha_inicio <= NOW() AND pc.fecha_fin >= NOW()
        `, [id]);
        res.json(rows);
    } catch (error) {
        console.error('Error en /:id/combos:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { nombre, categoria_id, precio, temporada_id, descripcion, imagen, fotos, tallas, activo, destacado } = req.body;
        if (!nombre || !categoria_id || precio === undefined) {
            return res.status(400).json({ error: 'Nombre, categoría y precio son obligatorios' });
        }
        const tallasStr = tallas ? tallas.join(',') : '';
        const [result] = await db.query(
            `INSERT INTO productos (nombre, categoria_id, precio, temporada_id, descripcion, talla, activo, destacado, visitas, favoritos, fecha_publicacion)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NOW())`,
            [nombre, categoria_id, precio, temporada_id || null, descripcion || '', tallasStr, activo !== undefined ? activo : 1, destacado !== undefined ? destacado : 0]
        );
        const productoId = result.insertId;
        if (imagen) {
            await db.query('INSERT INTO producto_imagenes (producto_id, imagen_url, es_principal) VALUES (?, ?, 1)', [productoId, imagen]);
        }
        if (fotos && fotos.length) {
            for (const url of fotos) {
                await db.query('INSERT INTO producto_imagenes (producto_id, imagen_url, es_principal) VALUES (?, ?, 0)', [productoId, url]);
            }
        }
        await registrarActividadAdmin('crear_producto', `Producto agregado: ${nombre} (ID ${productoId})`);
        res.status(201).json({ id: productoId, message: 'Producto creado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, categoria_id, precio, temporada_id, descripcion, imagen, fotos, tallas, activo, destacado } = req.body;
        const tallasStr = tallas ? tallas.join(',') : '';
        await db.query(
            `UPDATE productos SET nombre = ?, categoria_id = ?, precio = ?, temporada_id = ?, descripcion = ?, talla = ?, activo = ?, destacado = ? WHERE id = ?`,
            [nombre, categoria_id, precio, temporada_id || null, descripcion || '', tallasStr, activo, destacado, id]
        );
        await db.query('DELETE FROM producto_imagenes WHERE producto_id = ?', [id]);
        if (imagen) {
            await db.query('INSERT INTO producto_imagenes (producto_id, imagen_url, es_principal) VALUES (?, ?, 1)', [id, imagen]);
        }
        if (fotos && fotos.length) {
            for (const url of fotos) {
                await db.query('INSERT INTO producto_imagenes (producto_id, imagen_url, es_principal) VALUES (?, ?, 0)', [id, url]);
            }
        }
        await registrarActividadAdmin('editar_producto', `Producto actualizado: ${nombre} (ID ${id})`);
        res.json({ message: 'Producto actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [producto] = await db.query('SELECT nombre FROM productos WHERE id = ?', [id]);
        const nombre = producto.length ? producto[0].nombre : `ID ${id}`;
        await db.query('DELETE FROM productos WHERE id = ?', [id]);
        await registrarActividadAdmin('eliminar_producto', `Producto eliminado: ${nombre}`);
        res.json({ message: 'Producto eliminado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:id/destacar', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE productos SET destacado = NOT destacado WHERE id = ?', [id]);
        res.json({ message: 'Destacado actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:id/activo', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE productos SET activo = NOT activo WHERE id = ?', [id]);
        res.json({ message: 'Estado actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;