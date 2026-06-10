// admin-configuracion.js
document.addEventListener('DOMContentLoaded', () => {
    if (!sessionStorage.getItem('admin_logged')) window.location.href = 'login.html';

    // Cargar configuración desde localStorage (o inicializar por defecto)
    let config = JSON.parse(localStorage.getItem('configuracion_db')) || {
        tiendaNombre: 'El rincón de mi Bebé',
        tiendaDescripcion: 'Ropa infantil de calidad, cómoda y moderna para los más pequeños.',
        moneda: 'C$',
        direccion: 'Del Semáforo de La Virgen 1c al Norte, Local 4, Managua, Nicaragua',
        telefono: '+505 8888 1234',
        email: 'hola@elrincondemibebe.com',
        horario: 'Lunes a viernes 9am-7pm, Sábados 9am-6pm, Domingos 10am-3pm',
        instagram: 'https://instagram.com/elrincondemibebe',
        facebook: 'https://facebook.com/elrincondemibebe',
        tiktok: 'https://tiktok.com/@elrincondemibebe',
        whatsapp: '+505 8888 1234',
        notificacionesEmail: false,
        modoMantenimiento: false,
        productosPorPagina: 12
    };

    // Rellenar formularios con los datos cargados
    document.getElementById('tiendaNombre').value = config.tiendaNombre || '';
    document.getElementById('tiendaDescripcion').value = config.tiendaDescripcion || '';
    document.getElementById('moneda').value = config.moneda || 'C$';
    document.getElementById('direccion').value = config.direccion || '';
    document.getElementById('telefono').value = config.telefono || '';
    document.getElementById('email').value = config.email || '';
    document.getElementById('horario').value = config.horario || '';

    document.getElementById('instagram').value = config.instagram || '';
    document.getElementById('facebook').value = config.facebook || '';
    document.getElementById('tiktok').value = config.tiktok || '';
    document.getElementById('whatsapp').value = config.whatsapp || '';

    document.getElementById('notificacionesEmail').checked = config.notificacionesEmail || false;
    document.getElementById('modoMantenimiento').checked = config.modoMantenimiento || false;
    document.getElementById('productosPorPagina').value = config.productosPorPagina || 12;

    // Función genérica para guardar cualquier sección
    function saveConfig(newData) {
        config = { ...config, ...newData };
        localStorage.setItem('configuracion_db', JSON.stringify(config));
        alert('Configuración guardada correctamente');
    }

    // Formulario de información de la tienda
    const infoForm = document.getElementById('infoForm');
    infoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveConfig({
            tiendaNombre: document.getElementById('tiendaNombre').value.trim(),
            tiendaDescripcion: document.getElementById('tiendaDescripcion').value.trim(),
            moneda: document.getElementById('moneda').value.trim(),
            direccion: document.getElementById('direccion').value.trim(),
            telefono: document.getElementById('telefono').value.trim(),
            email: document.getElementById('email').value.trim(),
            horario: document.getElementById('horario').value.trim()
        });
    });

    // Formulario de redes sociales
    const socialForm = document.getElementById('socialForm');
    socialForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveConfig({
            instagram: document.getElementById('instagram').value.trim(),
            facebook: document.getElementById('facebook').value.trim(),
            tiktok: document.getElementById('tiktok').value.trim(),
            whatsapp: document.getElementById('whatsapp').value.trim()
        });
    });

    // Formulario de preferencias
    const prefsForm = document.getElementById('prefsForm');
    prefsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveConfig({
            notificacionesEmail: document.getElementById('notificacionesEmail').checked,
            modoMantenimiento: document.getElementById('modoMantenimiento').checked,
            productosPorPagina: parseInt(document.getElementById('productosPorPagina').value)
        });
    });

    // Sidebar y logout (código estándar)
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeSidebar = document.getElementById('closeSidebar');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
        closeSidebar.addEventListener('click', () => sidebar.classList.remove('open'));
    }
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        sessionStorage.removeItem('admin_logged');
        window.location.href = 'login.html';
    });
});