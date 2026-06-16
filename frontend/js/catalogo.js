// catalogo.js
document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE = 'https://elrincondemibebe-production.up.railway.app/api';

    // Leer parámetros de la URL al cargar (solo una vez)
    const urlParams = new URLSearchParams(window.location.search);
    const initialFilters = {
        categoria: urlParams.get('categoria') || null,
        orden: urlParams.get('orden') || 'recent',
        minPrice: urlParams.get('precio_min') || '',
        maxPrice: urlParams.get('precio_max') || '',
        busqueda: urlParams.get('busqueda') || ''
    };

    let currentPage = 1;
    let totalPages = 1;
    let currentFilters = { ...initialFilters };

    // Elementos DOM
    const productsGrid = document.getElementById('productsGrid');
    const paginationDiv = document.getElementById('pagination');
    const categoriasList = document.getElementById('categoriasList');
    const sortSelect = document.getElementById('sortSelect');
    const toggleFiltrosBtn = document.getElementById('toggleFiltros');
    const sidebar = document.querySelector('.barra_lateral_filtros');
    const textoFiltro = document.getElementById('textoFiltro');
    const precioMinInput = document.getElementById('precioMin');
    const precioMaxInput = document.getElementById('precioMax');
    const searchInput = document.getElementById('searchInput');

    // Pre-cargar valores desde URL
    if (sortSelect) sortSelect.value = initialFilters.orden;
    if (precioMinInput) precioMinInput.value = initialFilters.minPrice;
    if (precioMaxInput) precioMaxInput.value = initialFilters.maxPrice;
    if (searchInput) searchInput.value = initialFilters.busqueda;

    // ========== ACTUALIZAR URL (sin recargar) ==========
    function updateURL() {
        const params = new URLSearchParams();
        if (currentFilters.categoria) params.set('categoria', currentFilters.categoria);
        if (currentFilters.orden && currentFilters.orden !== 'recent') params.set('orden', currentFilters.orden);
        if (currentFilters.minPrice) params.set('precio_min', currentFilters.minPrice);
        if (currentFilters.maxPrice) params.set('precio_max', currentFilters.maxPrice);
        if (currentFilters.busqueda) params.set('busqueda', currentFilters.busqueda);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({}, '', newUrl);
    }

    // ========== CARGAR CATEGORÍAS ==========
    async function loadCategorias() {
        try {
            const res = await fetch(`${API_BASE}/categoria`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const cats = await res.json();
            if (!cats.length) {
                categoriasList.innerHTML = '<li>No hay categorías</li>';
                return;
            }
            categoriasList.innerHTML = `
                <li><a href="#" data-categoria="all" class="categoria_enlace ${!currentFilters.categoria ? 'active' : ''}">Todos los productos</a></li>
                ${cats.map(c => `<li><a href="#" data-categoria="${c.id}" class="categoria_enlace ${currentFilters.categoria == c.id ? 'active' : ''}">${escapeHtml(c.nombre)}</a></li>`).join('')}
            `;
            document.querySelectorAll('.categoria_enlace').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.querySelectorAll('.categoria_enlace').forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    currentFilters.categoria = link.dataset.categoria === 'all' ? null : link.dataset.categoria;
                    currentPage = 1;
                    updateURL();
                    loadProducts();
                });
            });
        } catch (error) {
            console.error('Error en loadCategorias:', error);
            categoriasList.innerHTML = '<li>Error al cargar categorías</li>';
        }
    }

    // ========== CARGAR PRODUCTOS ==========
    async function loadProducts() {
async function loadProducts() {
    try {
        const params = new URLSearchParams();

        params.append('pagina', currentPage);
        params.append('limite', 12);

        console.log('URL:', `${API_BASE}/productos?${params}`);

        const res = await fetch(`${API_BASE}/productos?${params}`);
        const data = await res.json();

        console.log('Respuesta API:', data);

        let productos = [];

        if (data.data && Array.isArray(data.data)) {
            productos = data.data;
            totalPages = data.totalPages || 1;

            console.log('totalPages:', totalPages);
            console.log('currentPage:', currentPage);
        }

        renderProducts(productos);
        renderPagination();

    } catch (error) {
        console.error(error);
    }
}
    }

    // ========== RENDERIZAR PRODUCTOS ==========
    function renderProducts(productos) {
        if (!productos.length) {
            productsGrid.innerHTML = '<div class="no-results">No se encontraron productos</div>';
            return;
        }
        productsGrid.innerHTML = productos.map(p => {
            const img = p.imagen_principal || 'https://placehold.co/300x300?text=Sin+imagen';
            const tieneDescuento = p.descuento_total && p.descuento_total > 0;
            const badge = tieneDescuento ? `<span class="badge_producto descuento">-${p.descuento_total}%</span>` : '';
            const precioHtml = tieneDescuento ? `
                <div class="product-price">
                    <span class="old-price">C$ ${parseFloat(p.precio).toFixed(2)}</span>
                    <span class="discount-price">C$ ${p.precio_con_descuento}</span>
                </div>
            ` : `<div class="product-price-normal">C$ ${parseFloat(p.precio).toFixed(2)}</div>`;

            const rating = p.rating_promedio || 0;
            const totalRatings = p.rating_total || 0;
            const estrellasHtml = generarEstrellas(rating, totalRatings);

            return `
                <div class="tarjeta_producto" data-id="${p.id}">
                    <div class="contenedor_imagen_producto">
                        ${badge}
                        <img src="${img}" alt="${escapeHtml(p.nombre)}">
                    </div>
                    <div class="info_producto">
                        <div class="meta_producto">
                            <span class="categoria_producto">${escapeHtml(p.categoria_nombre || 'Categoría')}</span>
                            ${estrellasHtml}
                        </div>
                        <h3 class="nombre_producto">${escapeHtml(p.nombre)}</h3>
                        ${precioHtml}
                        <button class="boton_producto" data-id="${p.id}">Ver detalles</button>
                    </div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.boton_producto').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const id = btn.getAttribute('data-id');
                if (id) {
                    const currentState = window.location.search;
                    localStorage.setItem('catalogo_return_state', currentState);
                    window.location.href = `detalle.html?id=${id}`;
                }
            });
        });
    }

    function generarEstrellas(promedio, total) {
        if (total === 0) return '<span class="sin-opiniones">Sin opiniones</span>';
        const estrellaLlena = '<i class="fas fa-star"></i>';
        const estrellaMedia = '<i class="fas fa-star-half-alt"></i>';
        const estrellaVacia = '<i class="far fa-star"></i>';
        let html = '<div class="rating-estrellas">';
        const entero = Math.floor(promedio);
        const decimal = promedio - entero;
        for (let i = 1; i <= entero; i++) html += estrellaLlena;
        if (decimal >= 0.5) html += estrellaMedia;
        for (let i = 1; i <= 5 - Math.ceil(promedio); i++) html += estrellaVacia;
        html += `<span class="rating-count">(${total})</span>`;
        html += '</div>';
        return html;
    }

    // ========== PAGINACIÓN ==========
    function renderPagination() {

            console.log('Renderizando paginación');
    console.log('Página actual:', currentPage);
    console.log('Total páginas:', totalPages);
    
        if (totalPages <= 1) { paginationDiv.innerHTML = ''; return; }
        let html = '';
        if (currentPage > 1) html += `<button class="btn_pagina" data-page="${currentPage-1}"><i class="fas fa-chevron-left"></i></button>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="btn_pagina ${i === Number(currentPage) ? 'activa' : ''}" data-page="${i}">${i}</button>`;
        }
        if (currentPage < totalPages) html += `<button class="btn_pagina" data-page="${currentPage+1}"><i class="fas fa-chevron-right"></i></button>`;
        paginationDiv.innerHTML = html;
        document.querySelectorAll('.btn_pagina[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page && page !== currentPage && page >= 1 && page <= totalPages) {
                    currentPage = page;
                    loadProducts();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    // ========== FILTROS ==========
    if (sortSelect) {
        sortSelect.value = currentFilters.orden;
        sortSelect.addEventListener('change', () => {
            currentFilters.orden = sortSelect.value;
            currentPage = 1;
            updateURL();
            loadProducts();
        });
    }

    function applyPriceFilter() {
        currentFilters.minPrice = precioMinInput.value;
        currentFilters.maxPrice = precioMaxInput.value;
        currentPage = 1;
        updateURL();
        loadProducts();
    }

    if (precioMinInput && precioMaxInput) {
        precioMinInput.addEventListener('input', applyPriceFilter);
        precioMaxInput.addEventListener('input', applyPriceFilter);
        document.addEventListener('click', (e) => {
            const dentroPrecio = e.target === precioMinInput || e.target === precioMaxInput ||
                precioMinInput.contains(e.target) || precioMaxInput.contains(e.target);
            if (!dentroPrecio) applyPriceFilter();
        });
    }

    if (toggleFiltrosBtn && sidebar) {
        toggleFiltrosBtn.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar_oculto');
            const mainContainer = document.querySelector('.contenedor_catalogo');
            if (mainContainer) mainContainer.classList.toggle('sidebar-hidden');
            textoFiltro.textContent = sidebar.classList.contains('sidebar_oculto') ? 'Mostrar Filtros' : 'Ocultar Filtros';
        });
    }

    let debounceTimeout;
    if (searchInput) {
        searchInput.value = currentFilters.busqueda;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                currentFilters.busqueda = e.target.value.trim();
                currentPage = 1;
                updateURL();
                loadProducts();
            }, 400);
        });
    }

    // Restaurar estado desde localStorage
    const storedState = localStorage.getItem('catalogo_return_state');
    if (storedState && !window.location.search) {
        window.location.search = storedState;
        localStorage.removeItem('catalogo_return_state');
    } else if (storedState && window.location.search !== storedState) {
        const params = new URLSearchParams(storedState);
        if (params.get('categoria')) currentFilters.categoria = params.get('categoria');
        if (params.get('orden')) currentFilters.orden = params.get('orden');
        if (params.get('precio_min')) currentFilters.minPrice = params.get('precio_min');
        if (params.get('precio_max')) currentFilters.maxPrice = params.get('precio_max');
        if (params.get('busqueda')) currentFilters.busqueda = params.get('busqueda');
        updateURL();
        loadProducts();
        localStorage.removeItem('catalogo_return_state');
    }

    window.addEventListener('popstate', () => {
        location.reload();
    });

    function escapeHtml(str) {
        return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;'));
    }

    // Inicializar
    await loadCategorias();
    await loadProducts();
});