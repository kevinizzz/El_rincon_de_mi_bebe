// catalogo.js
document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE = 'http://localhost:3000/api';
    let currentPage = 1;
    let totalPages = 1;
    let currentFilters = { 
        categoria: null, 
        orden: 'recent', 
        minPrice: '', 
        maxPrice: '', 
        busqueda: '' 
    };

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

    window.verDetalle = function(id) {
        if (id) window.location.href = `detalle.html?id=${id}`;
    };

    // ==================== CARGAR CATEGORÍAS ====================
    async function loadCategorias() {
        try {
            const res = await fetch(`${API_BASE}/categorias`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const cats = await res.json();
            if (!cats.length) {
                categoriasList.innerHTML = '<li>No hay categorías</li>';
                return;
            }
            categoriasList.innerHTML = `
                <li><a href="#" data-categoria="all" class="categoria_enlace active">Todos los productos</a></li>
                ${cats.map(c => `<li><a href="#" data-categoria="${c.id}" class="categoria_enlace">${escapeHtml(c.nombre)}</a></li>`).join('')}
            `;
            document.querySelectorAll('.categoria_enlace').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.querySelectorAll('.categoria_enlace').forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    currentFilters.categoria = link.dataset.categoria === 'all' ? null : link.dataset.categoria;
                    currentPage = 1;
                    loadProducts();
                });
            });
        } catch (error) {
            console.error('Error en loadCategorias:', error);
            categoriasList.innerHTML = '<li>Error al cargar categorías</li>';
        }
    }

    // ==================== CARGAR PRODUCTOS ====================
    async function loadProducts() {
        try {
            const params = new URLSearchParams();
            params.append('pagina', currentPage);
            params.append('limite', 12);
            if (currentFilters.categoria) params.append('categoria', currentFilters.categoria);
            if (currentFilters.orden) params.append('orden', currentFilters.orden);
            if (currentFilters.minPrice !== '') params.append('precio_min', currentFilters.minPrice);
            if (currentFilters.maxPrice !== '') params.append('precio_max', currentFilters.maxPrice);
            if (currentFilters.busqueda !== '') params.append('busqueda', currentFilters.busqueda);

            const res = await fetch(`${API_BASE}/productos?${params}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            let productos = [];
            if (Array.isArray(data)) {
                productos = data;
                totalPages = Math.ceil(productos.length / 12);
            } else if (data.data && Array.isArray(data.data)) {
                productos = data.data;
                totalPages = data.totalPages || 1;
            } else {
                throw new Error('Formato de respuesta no reconocido');
            }
            renderProducts(productos);
            renderPagination();
        } catch (error) {
            console.error('Error en loadProducts:', error);
            productsGrid.innerHTML = '<div class="error">Error al cargar productos</div>';
        }
    }

    // ==================== RENDERIZAR PRODUCTOS ====================
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
                        <button class="boton_producto" onclick="verDetalle(${p.id})">Ver detalles</button>
                    </div>
                </div>
            `;
        }).join('');
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

    // ==================== PAGINACIÓN ====================
    function renderPagination() {
        if (totalPages <= 1) { paginationDiv.innerHTML = ''; return; }
        let html = '';
        if (currentPage > 1) html += `<button class="btn_pagina" data-page="${currentPage-1}"><i class="fas fa-chevron-left"></i></button>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="btn_pagina ${i === currentPage ? 'activa' : ''}" data-page="${i}">${i}</button>`;
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

    // ==================== FILTROS Y EVENTOS ====================
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            currentFilters.orden = sortSelect.value;
            currentPage = 1;
            loadProducts();
        });
    }
    if (precioMinInput && precioMaxInput) {
        const applyPriceFilter = () => {
            currentFilters.minPrice = precioMinInput.value;
            currentFilters.maxPrice = precioMaxInput.value;
            currentPage = 1;
            loadProducts();
        };
        precioMinInput.addEventListener('change', applyPriceFilter);
        precioMaxInput.addEventListener('change', applyPriceFilter);
    }

    // Toggle de filtros responsive (mejorado)
    if (toggleFiltrosBtn && sidebar) {
        toggleFiltrosBtn.addEventListener('click', () => {
            sidebar.classList.toggle('filtros-visible');
            const estaVisible = sidebar.classList.contains('filtros-visible');
            textoFiltro.textContent = estaVisible ? 'Ocultar Filtros' : 'Mostrar Filtros';
        });
    }

    let debounceTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                currentFilters.busqueda = e.target.value.trim();
                currentPage = 1;
                loadProducts();
            }, 400);
        });
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;'));
    }

    // Inicializar
    await loadCategorias();
    await loadProducts();
});