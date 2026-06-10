const jwt = require('jsonwebtoken');

// Clave secreta – debe estar en .env (JWT_SECRET)
const JWT_SECRET = process.env.JWT_SECRET || 'mi_clave_super_secreta_cambiar_en_produccion';

function verificarAdmin(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. No hay token.' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.rol !== 'admin') {
            return res.status(403).json({ error: 'No tienes permisos de administrador.' });
        }
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado.' });
    }
}

module.exports = { verificarAdmin };