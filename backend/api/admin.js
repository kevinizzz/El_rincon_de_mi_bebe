const express = require('express');
const router = express.Router();
const db = require('../base_datos/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mi_clave_super_secreta_cambiar_en_produccion';

router.post('/login', async (req, res) => {
    try {
        const { usuario, contrasena } = req.body;
        if (!usuario || !contrasena) {
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
        }
        // Buscar por correo (o nombre de usuario – aquí uso correo)
        const [admins] = await db.query('SELECT * FROM administradores WHERE correo = ?', [usuario]);
        if (admins.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        const admin = admins[0];
        const passwordValida = await bcrypt.compare(contrasena, admin.contrasena);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        if (!admin.activo) {
            return res.status(403).json({ error: 'Cuenta desactivada' });
        }
        // Generar token JWT
        const token = jwt.sign(
            { id: admin.id, correo: admin.correo, rol: 'admin' },
            JWT_SECRET,
            { expiresIn: '8h' }
        );
        res.json({ success: true, token, admin: { id: admin.id, nombre: admin.nombre, correo: admin.correo } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/verificar', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ valid: true, usuario: decoded });
    } catch (error) {
        res.status(401).json({ valid: false, error: error.message });
    }
});

router.get('/actividades', async (req, res) => {
    try {
        const { limite = 10 } = req.query;
        const [rows] = await db.query(
            `SELECT * FROM actividades_admin ORDER BY fecha DESC LIMIT ?`,
            [parseInt(limite)]
        );
        // Formatear tiempo relativo
        const actividades = rows.map(a => ({
            texto: a.accion,
            detalle: a.descripcion,
            tiempo: timeAgo(new Date(a.fecha)),
            icono: getIconoActividad(a.accion)
        }));
        res.json(actividades);
    } catch (error) {
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

function getIconoActividad(accion) {
    if (accion.includes('crear')) return 'fas fa-plus-circle';
    if (accion.includes('editar')) return 'fas fa-edit';
    if (accion.includes('eliminar')) return 'fas fa-trash-alt';
    if (accion.includes('promocion')) return 'fas fa-percent';
    if (accion.includes('combo')) return 'fas fa-gift';
    return 'fas fa-user-cog';
}

module.exports = router;
