// inicio.js
document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE = 'http://localhost:3000/api';

    // ========== 1. Cargar 6 categorías populares ==========
    async function loadCategoriasPopulares() {
        const container = document.getElementById('categoriasContainer');
        if (!container) return;

        try {
            const res = await fetch(`${API_BASE}/categorias/populares`);
            if (!res.ok) throw new Error('Error al cargar categorías populares');
            const cats = await res.json();
            // Asegurar que solo se muestren 6 (el endpoint ya debe devolver 6)
            const top6 = cats.slice(0, 6);
            container.innerHTML = top6.map(c => `
                <a href="catalogo.html?categoria=${c.id}" class="tarjeta_categoria">
                    <i class="fas fa-tag"></i>
                    <span>${escapeHtml(c.nombre)}</span>
                    <small>⭐ ${c.avg_rating ? parseFloat(c.avg_rating).toFixed(1) : '0.0'}</small>
                </a>
            `).join('');
        } catch (error) {
            console.error('Error cargando categorías populares:', error);
            // Fallback: cargar categorías normales (sin orden especial)
            try {
                const res = await fetch(`${API_BASE}/categorias`);
                const cats = await res.json();
                const primeras6 = cats.slice(0, 6);
                container.innerHTML = primeras6.map(c => `
                    <a href="catalogo.html?categoria=${c.id}" class="tarjeta_categoria">
                        <i class="fas fa-tag"></i>
                        <span>${escapeHtml(c.nombre)}</span>
                    </a>
                `).join('');
            } catch (err) {
                container.innerHTML = '<div class="error">No se pudieron cargar las categorías</div>';
            }
        }
    }

    // ========== 2. Productos destacados (mejor calificados) ==========
    async function loadDestacados() {
        try {
            const res = await fetch(`${API_BASE}/productos?orden=rating&limite=4`);
            const data = await res.json();
            const productos = data.data || [];
            const container = document.getElementById('destacadosContainer');
            if (!container) return;
            container.innerHTML = productos.map(p => renderTarjetaProducto(p)).join('');
        } catch (error) {
            console.error('Error cargando destacados:', error);
            const container = document.getElementById('destacadosContainer');
            if (container) container.innerHTML = '<div class="error">Error al cargar productos destacados</div>';
        }
    }

    // ========== 3. Tendencias de la semana (más vistos) ==========
    async function loadTendencias() {
        try {
            const res = await fetch(`${API_BASE}/productos?orden=views&limite=3`);
            const data = await res.json();
            const productos = data.data || [];
            const container = document.getElementById('tendenciasContainer');
            if (!container) return;
            container.innerHTML = productos.map(p => `
                <div class="tarjeta_tendencia">
                    <span>🔥 Popular</span>
                    <h3>${escapeHtml(p.nombre)}</h3>
                    <p>${p.visitas || 0} visitas esta semana</p>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error cargando tendencias:', error);
        }
    }

    // ========== 4. Promoción destacada (la primera activa) ==========
    async function loadPromocion() {
        try {
            const res = await fetch(`${API_BASE}/promociones?activa=1&limite=1`);
            const promos = await res.json();
            const promo = promos[0];
            const container = document.getElementById('promocionContainer');
            if (!container || !promo) return;
            container.innerHTML = `
                <div class="contenido_promocion">
                    <span class="etiqueta_promocion">PROMOCIÓN</span>
                    <h2>${escapeHtml(promo.titulo)}</h2>
                    <p>${escapeHtml(promo.descripcion || 'Aprovecha este descuento especial.')}</p>
                    <a href="catalogo.html?promocion=${promo.id}" class="boton_primario">Ver promociones</a>
                </div>
            `;
        } catch (error) {
            console.error('Error cargando promoción:', error);
        }
    }

    // ========== 5. Recomendados para ti (basado en últimas interacciones) ==========
    async function loadRecomendados() {
        const container = document.getElementById('recomendadosContainer');
        if (!container) return;

        try {
            const session_uuid = localStorage.getItem('session_uuid');
            if (!session_uuid) {
                // Usuario nuevo: mostrar productos más populares
                const res = await fetch(`${API_BASE}/productos?orden=popular&limite=4`);
                const data = await res.json();
                const productos = data.data || [];
                container.innerHTML = productos.map(p => renderTarjetaProducto(p)).join('');
                return;
            }

            // Obtener últimas 3 categorías visitadas por el usuario
            const interaccionesRes = await fetch(`${API_BASE}/interacciones/ultimas-categorias?session_uuid=${session_uuid}&limite=3`);
            let categoriasIds = [];
            if (interaccionesRes.ok) {
                const cats = await interaccionesRes.json();
                categoriasIds = cats.map(c => c.categoria_id).filter(Boolean);
            }

            let productosRecomendados = [];
            if (categoriasIds.length) {
                const promesas = categoriasIds.map(catId =>
                    fetch(`${API_BASE}/productos?categoria=${catId}&limite=2`).then(r => r.json())
                );
                const resultados = await Promise.all(promesas);
                productosRecomendados = resultados.flatMap(r => r.data || []);
                // Eliminar duplicados y limitar a 4
                productosRecomendados = [...new Map(productosRecomendados.map(p => [p.id, p])).values()].slice(0, 4);
            }

            if (!productosRecomendados.length) {
                // Fallback: productos más populares
                const res = await fetch(`${API_BASE}/productos?orden=popular&limite=4`);
                const data = await res.json();
                productosRecomendados = data.data || [];
            }

            container.innerHTML = productosRecomendados.map(p => renderTarjetaProducto(p)).join('');
        } catch (error) {
            console.error('Error cargando recomendados:', error);
            container.innerHTML = '<div class="error">No se pudieron cargar los productos recomendados</div>';
        }
    }

    // ========== Función reutilizable para renderizar tarjeta de producto ==========
    function renderTarjetaProducto(p) {
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
            <div class="tarjeta_producto">
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
                    <a href="detalle.html?id=${p.id}" class="boton_producto">Ver detalles</a>
                </div>
            </div>
        `;
    }

    function generarEstrellas(promedio, total) {
        if (total === 0) return '<span class="sin-opiniones">Sin opiniones</span>';
        const llena = '<i class="fas fa-star"></i>';
        const media = '<i class="fas fa-star-half-alt"></i>';
        const vacia = '<i class="far fa-star"></i>';
        let html = '<div class="rating-estrellas">';
        const entero = Math.floor(promedio);
        const decimal = promedio - entero;
        for (let i = 0; i < entero; i++) html += llena;
        if (decimal >= 0.5) html += media;
        for (let i = 0; i < 5 - Math.ceil(promedio); i++) html += vacia;
        html += `<span class="rating-count">(${total})</span>`;
        html += '</div>';
        return html;
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;'));
    }

    // Ejecutar todas las cargas
    await loadCategoriasPopulares();
    await loadDestacados();
    await loadTendencias();
    await loadPromocion();
    await loadRecomendados();
});