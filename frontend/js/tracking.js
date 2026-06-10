// tracking.js
(function() {
    const API_BASE = 'http://localhost:3000/api';
    let sessionUUID = localStorage.getItem('session_uuid');
    let sessionId = null;

    // Función para obtener datos del dispositivo
    function getDeviceInfo() {
        const ua = navigator.userAgent;
        let dispositivo = 'PC';
        if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) dispositivo = 'Móvil';
        else if (/Tablet|iPad/i.test(ua)) dispositivo = 'Tablet';
        let navegador = 'Desconocido';
        if (ua.indexOf('Chrome') > -1) navegador = 'Chrome';
        else if (ua.indexOf('Firefox') > -1) navegador = 'Firefox';
        else if (ua.indexOf('Safari') > -1) navegador = 'Safari';
        else if (ua.indexOf('Edge') > -1) navegador = 'Edge';
        return { dispositivo, navegador };
    }

    // Obtener ubicación aproximada (opcional, con API gratuita)
    async function getLocation() {
        try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            return { ciudad: data.city || '', pais: data.country_name || '' };
        } catch(e) {
            return { ciudad: '', pais: '' };
        }
    }

    // Iniciar o recuperar sesión
    async function initSession() {
        const deviceInfo = getDeviceInfo();
        const location = await getLocation();
        const payload = {
            session_uuid: sessionUUID || undefined,
            dispositivo: deviceInfo.dispositivo,
            navegador: deviceInfo.navegador,
            ciudad: location.ciudad,
            pais: location.pais
        };
        try {
            const res = await fetch(`${API_BASE}/sesiones/iniciar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                sessionUUID = data.session_uuid;
                sessionId = data.session_id;
                localStorage.setItem('session_uuid', sessionUUID);
            }
        } catch (error) {
            console.error('Error iniciando sesión:', error);
        }
    }

    // Registrar interacción (genérico)
    window.registrarInteraccion = async function(tipo, productoId = null, tiempo = null) {
        if (!sessionUUID) return;
        const payload = {
            session_uuid: sessionUUID,
            producto_id: productoId,
            tipo_interaccion: tipo,
            tiempo_visualizacion_seg: tiempo
        };
        try {
            await fetch(`${API_BASE}/interacciones/registrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Error registrando interacción:', error);
        }
    };

    // Heartbeat periódico (cada 30 segundos)
    let heartbeatInterval;
    function startHeartbeat() {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(async () => {
            if (sessionUUID) {
                try {
                    await fetch(`${API_BASE}/sesiones/heartbeat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ session_uuid: sessionUUID })
                    });
                } catch(e) {}
            }
        }, 30000);
    }

    // Inicializar
    if (!sessionUUID) {
        initSession().then(() => {
            startHeartbeat();
        });
    } else {
        // Ya tiene UUID, renovar heartbeat (por si la página se recarga)
        startHeartbeat();
        // También actualizar última actividad al cargar
        fetch(`${API_BASE}/sesiones/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_uuid: sessionUUID })
        }).catch(e=>console.warn);
    }

    // Capturar evento de cierre de página (para enviar última actividad, no es obligatorio)
    window.addEventListener('beforeunload', () => {
        if (sessionUUID) {
            navigator.sendBeacon(`${API_BASE}/sesiones/heartbeat`, JSON.stringify({ session_uuid: sessionUUID }));
        }
    });
})();