// favoritos.js
document.addEventListener('DOMContentLoaded', function() {
    const btnCompartir = document.getElementById('btnCompartirLista');
    const btnConsultarTodo = document.getElementById('btnConsultarTodo');
    const btnEnviarLista = document.getElementById('btnEnviarLista');

    if (btnCompartir) {
        btnCompartir.addEventListener('click', () => {
            alert('Función de compartir lista próximamente');
            // Aquí podrías copiar al portapapeles un enlace o generar un mensaje
        });
    }

    if (btnConsultarTodo) {
        btnConsultarTodo.addEventListener('click', () => {
            const mensaje = 'Hola, me gustaría consultar por todos los productos en mi lista de favoritos.';
            const url = `https://wa.me/50588881234?text=${encodeURIComponent(mensaje)}`;
            window.open(url, '_blank');
        });
    }

    if (btnEnviarLista) {
        btnEnviarLista.addEventListener('click', () => {
            const mensaje = 'Hola, te envío mi lista de favoritos para consultar disponibilidad y precios:';
            // Aquí podrías construir la lista de productos seleccionados
            const url = `https://wa.me/50588881234?text=${encodeURIComponent(mensaje)}`;
            window.open(url, '_blank');
        });
    }

    // Filtrar por categoría (simulación, puedes implementar lógica de filtrado)
    const filtros = document.querySelectorAll('.filtros_categoria button');
    filtros.forEach(btn => {
        btn.addEventListener('click', function() {
            filtros.forEach(b => b.classList.remove('filtro_activo'));
            this.classList.add('filtro_activo');
            const categoria = this.innerText;
            // Lógica de filtrado (por implementar según datos reales)
            console.log(`Filtrando por: ${categoria}`);
        });
    });
});