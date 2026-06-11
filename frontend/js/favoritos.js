// favoritos.js (frontend)
document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE = 'https://elrincondemibebe-production.up.railway.app/api';
    const session_uuid = localStorage.getItem('session_uuid');

    let favoritos = [];
    let currentFilter = 'todos';
    let currentSort = 'recientes';
    let categoriasUnicas = [];

    const grid = document.getElementById('favoritosGrid');
    const contadorSpan = document.getElementById('contadorFav');
    const filtrosContainer = document.querySelector('.filtros_categoria');
    const ordenarSelect = document.getElementById('ordenarSelect');
    const btnConsultarTodo = document.getElementById('btnConsultarTodo');
    const btnEnviarLista = document.getElementById('btnEnviarLista');
    const btnCompartir = document.getElementById('btnCompartirLista');

    if (!session_uuid) {
        grid.innerHTML = '<div class="error">Debes iniciar sesión para ver tus favoritos</div>';
        return;
    }

    async function loadFavoritos() {
        try {
            grid.innerHTML = '<div class="cargando">Cargando favoritos...</div>';
            const res = await fetch(`${API_BASE}/favoritos?session_uuid=${session_uuid}`);
            if (!res.ok) throw new Error('Error al cargar favoritos');
            favoritos = await res.json();
            actualizarCategorias();
            actualizarContador();
            aplicarFiltrosYOrden();
        } catch (error) {
            console.error(error);
            grid.innerHTML = '<div class="error">No se pudieron cargar tus favoritos. Intenta más tarde.</div>';
        }
    }

    function actualizarCategorias() {
        const cats = favoritos.map(p => p.categoria_nombre).filter(c => c && c !== 'General');
        categoriasUnicas = ['todos', ...new Set(cats)];
        renderizarFiltros();
    }

    function renderizarFiltros() {
        filtrosContainer.innerHTML = categoriasUnicas.map(cat => {
            const nombreMostrar = cat === 'todos' ? 'Todos' : cat;
            const claseActiva = (currentFilter === cat) ? 'filtro_activo' : '';
            return `<button data-categoria="${cat}" class="${claseActiva}">${nombreMostrar}</button>`;
        }).join('');

        document.querySelectorAll('.filtros_categoria button').forEach(btn => {
            btn.addEventListener('click', () => {
                currentFilter = btn.dataset.categoria;
                renderizarFiltros();
                aplicarFiltrosYOrden();
            });
        });
    }

    function actualizarContador() {
        contadorSpan.textContent = favoritos.length;
    }

    function filtrar() {
        if (currentFilter === 'todos') return favoritos;
        return favoritos.filter(p => p.categoria_nombre === currentFilter);
    }

    function ordenar(productos) {
        const copia = [...productos];
        switch (currentSort) {
            case 'price_asc': return copia.sort((a, b) => a.precio - b.precio);
            case 'price_desc': return copia.sort((a, b) => b.precio - a.precio);
            case 'antiguos': return copia.reverse();
            default: return copia;
        }
    }

    function renderizar(productos) {
        if (productos.length === 0) {
            grid.innerHTML = '<div class="empty-state">No tienes productos favoritos aún.</div>';
            return;
        }

        grid.innerHTML = productos.map(prod => {
            const img = prod.imagen_principal || 'https://placehold.co/300x300?text=Sin+imagen';
            const tieneDescuento = prod.descuento_total > 0;
            const badge = tieneDescuento ? `<span class="badge_oferta">-${prod.descuento_total}%</span>` : '';
            const precioHtml = tieneDescuento ? `
                <div class="precios_favorito">
                    <span class="precio_actual">C$ ${parseFloat(prod.precio_con_descuento).toFixed(2)}</span>
                    <span class="precio_anterior">C$ ${parseFloat(prod.precio).toFixed(2)}</span>
                </div>
            ` : `
                <div class="precios_favorito">
                    <span class="precio_actual">C$ ${parseFloat(prod.precio).toFixed(2)}</span>
                </div>
            `;

            return `
                <article class="tarjeta_favorito" data-id="${prod.id}">
                    <div class="imagen_favorito" style="background-image: url('${img}'); background-size: cover; background-position: center;">
                        ${badge}
                    </div>
                    <div class="info_favorito">
                        <span class="categoria_favorito">${escapeHtml(prod.categoria_nombre || 'General')}</span>
                        <h3>${escapeHtml(prod.nombre)}</h3>
                        ${precioHtml}
                        <button class="boton_consultar" data-id="${prod.id}" data-nombre="${escapeHtml(prod.nombre)}">Consultar por WhatsApp</button>
                    </div>
                </article>
            `;
        }).join('');

        document.querySelectorAll('.boton_consultar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const nombre = btn.dataset.nombre;
                const mensaje = `Hola, me interesa el producto: ${nombre}`;
                window.open(`https://wa.me/50512345678?text=${encodeURIComponent(mensaje)}`, '_blank');
            });
        });
    }

    function aplicarFiltrosYOrden() {
        const filtrados = filtrar();
        const ordenados = ordenar(filtrados);
        renderizar(ordenados);
    }

    ordenarSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        aplicarFiltrosYOrden();
    });

    btnConsultarTodo.addEventListener('click', () => {
        if (favoritos.length === 0) { alert('No tienes productos favoritos'); return; }
        const lista = favoritos.map(p => `- ${p.nombre} (C$${p.precio})`).join('\n');
        window.open(`https://wa.me/50512345678?text=${encodeURIComponent('Hola, me gustaría consultar por todos mis favoritos:\n' + lista)}`, '_blank');
    });

    btnEnviarLista.addEventListener('click', () => {
        if (favoritos.length === 0) { alert('No tienes productos favoritos'); return; }
        const lista = favoritos.map(p => `- ${p.nombre} (C$${p.precio})`).join('\n');
        window.open(`https://wa.me/50512345678?text=${encodeURIComponent('Te envío mi lista de favoritos:\n' + lista)}`, '_blank');
    });

    if (btnCompartir) {
        btnCompartir.addEventListener('click', () => {
            const lista = favoritos.map(p => `- ${p.nombre} (C$${p.precio})`).join('\n');
            navigator.clipboard.writeText(`Mis favoritos:\n${lista}`).then(() => alert('Lista copiada al portapapeles'));
        });
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;'));
    }

    await loadFavoritos();
});