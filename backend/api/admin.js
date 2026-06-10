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

// Ruta para verificar token (opcional)
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

module.exports = router;
