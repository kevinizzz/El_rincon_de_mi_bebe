// public-session.js
const API_BASE = 'http://localhost:3000/api';

// Obtener o generar session_uuid
let session_uuid = localStorage.getItem('session_uuid');
if (!session_uuid) {
    session_uuid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    localStorage.setItem('session_uuid', session_uuid);
}

// Detectar dispositivo y navegador
const dispositivo = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'Móvil' : 'PC';
const navegador = navigator.userAgent.substring(0, 255);

// Iniciar sesión
fetch(`${API_BASE}/sesiones/iniciar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_uuid, dispositivo, navegador })
}).catch(err => console.error('Error iniciando sesión:', err));

// Heartbeat cada 30 segundos
setInterval(() => {
    fetch(`${API_BASE}/sesiones/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_uuid })
    }).catch(err => console.error('Error heartbeat:', err));
}, 30000);

// Función global para registrar interacciones
window.registrarInteraccion = function(tipo, productoId = null, tiempo = 0) {
    fetch(`${API_BASE}/interacciones/registrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session_uuid,
            producto_id: productoId,
            tipo_interaccion: tipo,
            tiempo_visualizacion_seg: tiempo
        })
    }).catch(err => console.error('Error registrando interacción:', err));
};