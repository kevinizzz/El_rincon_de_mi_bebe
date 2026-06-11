// promociones.js
document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE = 'https://elrincondemibebe-production.up.railway.app/api';

    // ========== Crear modal para combos si no existe ==========
    let comboModal = document.getElementById('comboModal');
    if (!comboModal) {
        comboModal = document.createElement('div');
        comboModal.id = 'comboModal';
        comboModal.className = 'modal-overlay';
        comboModal.style.display = 'none';
        comboModal.innerHTML = `
            <div class="modal-container modal-large">
                <div class="modal-header">
                    <h2 id="comboModalTitle">Detalle del combo</h2>
                    <button class="modal-close" id="closeComboModalBtn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" id="comboModalBody"></div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="closeComboModalFooterBtn">Cerrar</button>
                    <button class="btn-primary" id="whatsappComboBtn"><i class="fab fa-whatsapp"></i> Consultar por WhatsApp</button>
                </div>
            </div>
        `;
        document.body.appendChild(comboModal);
        document.getElementById('closeComboModalBtn').addEventListener('click', closeComboModal);
        document.getElementById('closeComboModalFooterBtn').addEventListener('click', closeComboModal);
    }

    function closeComboModal() {
        comboModal.style.display = 'none';
    }

    function openComboModal(combo) {
        const modalTitle = document.getElementById('comboModalTitle');
        const modalBody = document.getElementById('comboModalBody');
        const whatsappBtn = document.getElementById('whatsappComboBtn');

        modalTitle.innerText = combo.titulo;

        // Lista de productos (si no viene, mostrar mensaje)
        let productosHtml = '';
        if (combo.productos_nombres) {
            const productosArray = combo.productos_nombres.split(' + ');
            productosHtml = `
                <div class="combo-productos-lista">
                    <strong>Productos incluidos:</strong>
                    <ul>
                        ${productosArray.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else {
            productosHtml = '<p><em>Productos no especificados</em></p>';
        }

        const fechas = `${formatDate(combo.fecha_inicio)} → ${formatDate(combo.fecha_fin)}`;

        modalBody.innerHTML = `
            <div class="combo-detalle">
                <p class="combo-descripcion">${escapeHtml(combo.descripcion || 'Ahorra con este combo especial')}</p>
                <div class="combo-descuento">${combo.descuento}% OFF</div>
                ${productosHtml}
                <div class="combo-fechas">Válido del ${fechas}</div>
            </div>
        `;

        // Configurar botón de WhatsApp
        const mensaje = `Hola, me interesa el combo "${combo.titulo}" con ${combo.descuento}% de descuento. ¿Podrían darme más información?`;
        const numeroWhatsApp = '50512345678'; // Cambia por el número real
        const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
        whatsappBtn.onclick = () => {
            window.open(url, '_blank');
            registrarInteraccion('consulta_combo', combo.id);
        };

        comboModal.style.display = 'flex';
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString();
    }

    function registrarInteraccion(tipo, comboId = null) {
        // Utiliza la función global si existe (de public-session.js)
        if (window.registrarInteraccion) {
            window.registrarInteraccion(tipo, null, 0);
        } else {
            console.warn('registrarInteraccion no está disponible');
        }
    }

    // ========== 1. Promociones destacadas ==========
    async function loadDestacadas() {
        const container = document.getElementById('destacadasContainer');
        if (!container) return;
        try {
            const res = await fetch(`${API_BASE}/promociones/destacadas`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const productos = await res.json();
            if (productos.length === 0) {
                container.innerHTML = '<div class="empty-state">No hay promociones destacadas</div>';
                return;
            }
            container.innerHTML = productos.map(p => renderTarjetaProducto(p)).join('');
        } catch (error) {
            console.error('Error en loadDestacadas:', error);
            container.innerHTML = '<div class="error">Error al cargar promociones destacadas</div>';
        }
    }

    // ========== 2. Combos especiales con evento click para modal ==========
    async function loadCombos() {
        const container = document.getElementById('combosContainer');
        if (!container) return;
        try {
            const res = await fetch(`${API_BASE}/promociones/combos`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const combos = await res.json();
            if (combos.length === 0) {
                container.innerHTML = '<div class="empty-state">No hay combos activos</div>';
                return;
            }
            container.innerHTML = combos.map(c => `
                <div class="tarjeta_combo" data-combo='${JSON.stringify(c)}'>
                    <div class="combo-badge">COMBO</div>
                    <h3>${escapeHtml(c.titulo)}</h3>
                    <p class="combo-descripcion">${escapeHtml(c.descripcion || 'Ahorra con este combo especial')}</p>
                    <div class="combo-productos">${escapeHtml(c.productos_nombres || 'Varios productos')}</div>
                    <div class="combo-precio">
                        <span class="descuento">-${c.descuento}%</span>
                        <span class="precio-combo">¡Descuento aplicado!</span>
                    </div>
                    <button class="boton_primario ver-combo-btn" data-combo='${JSON.stringify(c)}'>Ver combo</button>
                </div>
            `).join('');

            // Eventos para abrir modal
            document.querySelectorAll('.ver-combo-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const combo = JSON.parse(btn.dataset.combo);
                    openComboModal(combo);
                });
            });
        } catch (error) {
            console.error('Error en loadCombos:', error);
            container.innerHTML = '<div class="error">Error al cargar combos</div>';
        }
    }

    // ========== 3. Promociones por categoría ==========
    async function loadPromocionesPorCategoria() {
        const container = document.getElementById('categoriasPromoContainer');
        if (!container) return;
        try {
            const res = await fetch(`${API_BASE}/promociones?activa=1`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const promos = await res.json();
            const porCategoria = promos.filter(p => p.categoria_id && !p.producto_id).slice(0, 4);
            if (porCategoria.length === 0) {
                container.innerHTML = '<div class="empty-state">No hay ofertas por categoría</div>';
                return;
            }
            container.innerHTML = porCategoria.map(p => `
                <div class="tarjeta_promo_categoria">
                    <i class="fas fa-tags"></i>
                    <h3>${escapeHtml(p.titulo)}</h3>
                    <p>${escapeHtml(p.descripcion || `Hasta ${p.descuento}% de descuento en ${p.categoria_nombre || 'esta categoría'}`)}</p>
                    <a href="catalogo.html?categoria=${p.categoria_id}" class="boton_secundario">Ver ofertas</a>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error en loadPromocionesPorCategoria:', error);
            container.innerHTML = '<div class="error">Error al cargar ofertas por categoría</div>';
        }
    }

    // ========== 4. Ofertas por temporada ==========
    async function loadPromocionesPorTemporada() {
        const container = document.getElementById('temporadaPromoContainer');
        if (!container) return;
        try {
            const res = await fetch(`${API_BASE}/productos?orden=popular&limite=4`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const productos = data.data || [];
            const conDescuento = productos.filter(p => p.descuento_total > 0);
            const mostrar = conDescuento.length ? conDescuento : productos;
            if (mostrar.length === 0) {
                container.innerHTML = '<div class="empty-state">No hay ofertas de temporada</div>';
                return;
            }
            container.innerHTML = mostrar.map(p => renderTarjetaProducto(p)).join('');
        } catch (error) {
            console.error('Error en loadPromocionesPorTemporada:', error);
            container.innerHTML = '<div class="error">Error al cargar ofertas de temporada</div>';
        }
    }

    // ========== Función de tarjeta de producto ==========
    function renderTarjetaProducto(p) {
        const img = p.imagen_principal || 'https://placehold.co/300x300?text=Sin+imagen';
        const tieneDescuento = p.descuento_total > 0;
        const badge = tieneDescuento ? `<span class="badge_producto descuento">-${p.descuento_total}%</span>` : '';
        const precioHtml = tieneDescuento ? `
            <div class="product-price">
                <span class="old-price">C$ ${parseFloat(p.precio).toFixed(2)}</span>
                <span class="discount-price">C$ ${parseFloat(p.precio_con_descuento).toFixed(2)}</span>
            </div>
        ` : `<div class="product-price-normal">C$ ${parseFloat(p.precio).toFixed(2)}</div>`;

        return `
            <div class="tarjeta_producto" onclick="window.location.href='detalle.html?id=${p.id}'">
                <div class="contenedor_imagen_producto">
                    ${badge}
                    <img src="${img}" alt="${escapeHtml(p.nombre)}">
                </div>
                <div class="info_producto">
                    <h3 class="nombre_producto">${escapeHtml(p.nombre)}</h3>
                    ${precioHtml}
                    <button class="boton_producto">Ver producto</button>
                </div>
            </div>
        `;
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;'));
    }

    // Inicializar
    await loadDestacadas();
    await loadCombos();
    await loadPromocionesPorCategoria();
    await loadPromocionesPorTemporada();
});