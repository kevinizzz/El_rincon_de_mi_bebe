// admin-productos.js
document.addEventListener('DOMContentLoaded', () => {
    if (!sessionStorage.getItem('admin_logged')) window.location.href = 'login.html';

    const API_BASE = 'https://elrincondemibebe-production.up.railway.app/api';
    const IMGBB_API_KEY = 'e583e786cd21089f399a5d150447152e';
    const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

    async function uploadToImgBB(file) {
        const formData = new FormData();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', file);
        try {
            const response = await fetch(IMGBB_UPLOAD_URL, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success && data.data) return data.data.display_url || data.data.url;
            throw new Error(data.error?.message || 'Error al subir imagen');
        } catch (error) {
            console.error(error);
            alert('Error al subir la imagen a ImgBB');
            return null;
        }
    }

    let productos = [];
    let currentEditId = null;
    let currentPage = 1;
    let totalPages = 1;
    const itemsPerPage = 12;

    // Elementos DOM (con protección por si alguno no existe)
    const modal = document.getElementById('productModal');
    const modalTitle = document.getElementById('modalTitle');
    const formModal = document.getElementById('productFormModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const addProductBtn = document.getElementById('addProductBtn');

    const modalNombre = document.getElementById('modalNombre');
    const modalCategoria = document.getElementById('modalCategoria');
    const modalPrecio = document.getElementById('modalPrecio');
    const modalTemporada = document.getElementById('modalTemporada');
    const modalDescripcion = document.getElementById('modalDescripcion');
    const modalFotoPrincipal = document.getElementById('modalFotoPrincipal');
    const modalFotosSecundarias = document.getElementById('modalFotosSecundarias');
    const previewPrincipal = document.getElementById('previewPrincipal');
    const previewSecundarias = document.getElementById('previewSecundarias');
    const modalActivo = document.getElementById('modalActivo');
    const modalDestacado = document.getElementById('modalDestacado');
    const tallasCheckboxes = document.querySelectorAll('.tallas-grid input[type="checkbox"]');

    const productsGrid = document.getElementById('productsGrid');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const seasonFilter = document.getElementById('seasonFilter'); // puede ser null, se protege
    const statusFilter = document.getElementById('statusFilter');
    const sortBy = document.getElementById('sortBy');
    const paginationDiv = document.getElementById('pagination');

    // ==================== CARGAR CATEGORÍAS Y TEMPORADAS ====================
    async function loadCategorias() {
        try {
            const res = await fetch(`${API_BASE}/categoria`); // CORREGIDO: sin 's'
            const cats = await res.json();
            if (modalCategoria) {
                modalCategoria.innerHTML = '<option value="">Seleccionar</option>';
                cats.forEach(c => {
                    modalCategoria.innerHTML += `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`;
                });
            }
            if (categoryFilter) {
                categoryFilter.innerHTML = '<option value="all">Todas las categorías</option>';
                cats.forEach(c => {
                    categoryFilter.innerHTML += `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`;
                });
            }
        } catch (error) {
            console.error('Error cargando categorías:', error);
        }
    }

    async function loadTemporadas() {
        try {
            const res = await fetch(`${API_BASE}/temporada`); // CORREGIDO: sin 's'
            const temps = await res.json();
            if (modalTemporada) {
                modalTemporada.innerHTML = '<option value="">Sin temporada</option>';
                temps.forEach(t => {
                    modalTemporada.innerHTML += `<option value="${t.id}">${escapeHtml(t.nombre)}</option>`;
                });
            }
        } catch (error) {
            console.error('Error cargando temporadas:', error);
        }
    }

    // ==================== CARGAR PRODUCTOS ====================
    async function loadProductos() {
        try {
            const params = new URLSearchParams();
            const search = searchInput?.value.trim() || '';
            if (search) params.append('busqueda', search);
            const categoria = categoryFilter?.value;
            if (categoria && categoria !== 'all') params.append('categoria', categoria);
            const estado = statusFilter?.value;
            if (estado && estado !== 'all') params.append('activo', estado);
            const orden = sortBy?.value;
            if (orden) params.append('orden', orden);
            params.append('pagina', currentPage);
            params.append('limite', itemsPerPage);

            const response = await fetch(`${API_BASE}/productos?${params.toString()}`);
            if (!response.ok) throw new Error('Error al cargar productos');
            const result = await response.json();
            productos = result.data;
            totalPages = result.totalPages;
            renderProducts();
            renderPagination();
        } catch (error) {
            console.error(error);
            if (productsGrid) productsGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:60px;">Error al cargar productos. ¿El backend está corriendo?</div>';
            if (paginationDiv) paginationDiv.innerHTML = '';
        }
    }

    // ==================== RENDERIZAR PRODUCTOS ====================
    function renderProducts() {
        if (!productsGrid) return;
        if (productos.length === 0) {
            productsGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:60px;">No se encontraron productos</div>';
            return;
        }

        productsGrid.innerHTML = productos.map(p => {
            const imagenUrl = p.imagen_principal || 'https://placehold.co/300x300?text=Sin+imagen';
            const tieneDescuento = p.descuento_total > 0;
            const enCombo = p.en_combo === 1;

            let badgesHtml = '<div class="product-badges">';
            if (enCombo) badgesHtml += '<span class="badge-combo">En combo</span>';
            if (tieneDescuento) badgesHtml += `<span class="discount-badge">-${p.descuento_total}%</span>`;
            badgesHtml += '</div>';

            const precioHtml = tieneDescuento ? `
                <div class="product-price">
                    <span class="old-price">C$ ${parseFloat(p.precio).toFixed(2)}</span>
                    <span class="discount-price">C$ ${p.precio_con_descuento}</span>
                </div>
            ` : `<div class="product-price">C$ ${parseFloat(p.precio).toFixed(2)}</div>`;

            const rating = p.rating_promedio || 0;
            const totalRatings = p.rating_total || 0;
            let estrellasHtml = '';
            if (totalRatings > 0) {
                const estrellaLlena = '<i class="fas fa-star"></i>';
                const estrellaMedia = '<i class="fas fa-star-half-alt"></i>';
                const estrellaVacia = '<i class="far fa-star"></i>';
                let stars = '';
                const entero = Math.floor(rating);
                const decimal = rating - entero;
                for (let i = 0; i < entero; i++) stars += estrellaLlena;
                if (decimal >= 0.5) stars += estrellaMedia;
                for (let i = 0; i < 5 - Math.ceil(rating); i++) stars += estrellaVacia;
                estrellasHtml = `<div class="product-rating"><div class="stars">${stars}</div><span class="rating-count">(${totalRatings})</span></div>`;
            } else {
                estrellasHtml = `<div class="product-rating"><span class="rating-count">Sin opiniones</span></div>`;
            }

            return `
                <div class="product-card" data-id="${p.id}">
                    <div class="product-img">
                        ${badgesHtml}
                        <img src="${imagenUrl}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <div class="product-info">
                        <div>
                            <span class="status-badge ${p.activo ? 'status-active' : 'status-hidden'}">${p.activo ? 'Activo' : 'Oculto'}</span>
                            ${p.destacado ? '<span class="status-badge featured-badge">Destacado</span>' : ''}
                        </div>
                        <h3 class="product-title">${escapeHtml(p.nombre)}</h3>
                        <span class="product-category">${escapeHtml(p.categoria_nombre || '')}</span>
                        ${estrellasHtml}
                        ${precioHtml}
                        <div class="product-metrics">
                            <span><i class="fas fa-eye"></i> ${p.visitas || 0}</span>
                            <span><i class="fas fa-heart"></i> ${p.favoritos || 0}</span>
                            <span><i class="fas fa-calendar-alt"></i> ${new Date(p.fecha_publicacion).toLocaleDateString()}</span>
                        </div>
                        <div class="product-actions">
                            <button class="action-btn view-btn" data-id="${p.id}"><i class="fas fa-eye"></i> Ver</button>
                            <button class="action-btn edit-btn" data-id="${p.id}"><i class="fas fa-edit"></i> Editar</button>
                            <button class="action-btn delete-btn danger" data-id="${p.id}"><i class="fas fa-trash-alt"></i> Eliminar</button>
                            <button class="action-btn feature-btn" data-id="${p.id}"><i class="fas fa-star"></i> ${p.destacado ? 'Quitar destacado' : 'Destacar'}</button>
                            <button class="action-btn toggle-btn" data-id="${p.id}"><i class="fas ${p.activo ? 'fa-eye-slash' : 'fa-eye'}"></i> ${p.activo ? 'Ocultar' : 'Activar'}</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderPagination() {
        if (!paginationDiv) return;
        if (totalPages <= 1) { paginationDiv.innerHTML = ''; return; }
        let html = '';
        if (currentPage > 1) html += `<button class="page-btn" data-page="${currentPage - 1}"><i class="fas fa-chevron-left"></i></button>`;
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                html += `<button class="page-btn disabled">...</button>`;
            }
        }
        if (currentPage < totalPages) html += `<button class="page-btn" data-page="${currentPage + 1}"><i class="fas fa-chevron-right"></i></button>`;
        paginationDiv.innerHTML = html;
        document.querySelectorAll('.page-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (!isNaN(page) && page !== currentPage && page >= 1 && page <= totalPages) {
                    currentPage = page;
                    loadProductos();
                }
            });
        });
    }

    // ==================== MODAL AGREGAR/EDITAR ====================
    function openModal(editId = null) {
        currentEditId = editId;
        if (editId) {
            modalTitle.innerText = 'Editar Producto';
            fetch(`${API_BASE}/productos/${editId}`)
                .then(res => res.json())
                .then(prod => {
                    modalNombre.value = prod.nombre || '';
                    modalCategoria.value = prod.categoria_id || '';
                    modalPrecio.value = prod.precio || '';
                    if (modalTemporada) modalTemporada.value = prod.temporada_id || '';
                    modalDescripcion.value = prod.descripcion || '';
                    modalActivo.checked = prod.activo === 1;
                    modalDestacado.checked = prod.destacado === 1;
                    const tallasGuardadas = prod.tallas ? prod.tallas.split(',') : [];
                    tallasCheckboxes.forEach(cb => cb.checked = tallasGuardadas.includes(cb.value));
                    previewPrincipal.innerHTML = prod.imagen_principal ? `<img src="${prod.imagen_principal}" style="width:70px; height:70px; object-fit:cover; border-radius:16px;">` : '';
                    previewSecundarias.innerHTML = '';
                    if (prod.fotos && prod.fotos.length) {
                        prod.fotos.forEach(f => {
                            const img = document.createElement('img');
                            img.src = f;
                            img.style.cssText = 'width:70px; height:70px; object-fit:cover; border-radius:16px;';
                            previewSecundarias.appendChild(img);
                        });
                    }
                })
                .catch(err => console.error(err));
        } else {
            modalTitle.innerText = 'Agregar Producto';
            formModal.reset();
            modalActivo.checked = true;
            modalDestacado.checked = false;
            previewPrincipal.innerHTML = '';
            previewSecundarias.innerHTML = '';
            tallasCheckboxes.forEach(cb => cb.checked = false);
        }
        if (modal) modal.style.display = 'flex';
    }

    function closeModal() {
        if (modal) modal.style.display = 'none';
        currentEditId = null;
        if (formModal) formModal.reset();
        if (previewPrincipal) previewPrincipal.innerHTML = '';
        if (previewSecundarias) previewSecundarias.innerHTML = '';
        if (modalFotoPrincipal) modalFotoPrincipal.value = '';
        if (modalFotosSecundarias) modalFotosSecundarias.value = '';
    }

    async function saveProduct(event) {
        event.preventDefault();
        if (!modalNombre.value || !modalCategoria.value || !modalPrecio.value) {
            alert('Complete los campos obligatorios');
            return;
        }

        let imagenPrincipal = '';
        if (modalFotoPrincipal.files.length > 0) {
            const url = await uploadToImgBB(modalFotoPrincipal.files[0]);
            if (!url) return;
            imagenPrincipal = url;
        } else if (currentEditId) {
            const existing = productos.find(p => p.id === currentEditId);
            imagenPrincipal = existing?.imagen_principal || '';
        }

        let fotosArray = [];
        if (modalFotosSecundarias.files.length > 0) {
            for (let file of Array.from(modalFotosSecundarias.files)) {
                if (fotosArray.length < 3) {
                    const url = await uploadToImgBB(file);
                    if (url) fotosArray.push(url);
                }
            }
        } else if (currentEditId) {
            const existing = productos.find(p => p.id === currentEditId);
            fotosArray = existing?.fotos || [];
        }

        const tallasSeleccionadas = Array.from(tallasCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        const productoData = {
            nombre: modalNombre.value.trim(),
            categoria_id: parseInt(modalCategoria.value),
            precio: parseFloat(modalPrecio.value),
            temporada_id: modalTemporada ? (modalTemporada.value ? parseInt(modalTemporada.value) : null) : null,
            descripcion: modalDescripcion.value.trim(),
            imagen: imagenPrincipal,
            fotos: fotosArray,
            tallas: tallasSeleccionadas,
            activo: modalActivo.checked ? 1 : 0,
            destacado: modalDestacado.checked ? 1 : 0
        };

        try {
            let url = `${API_BASE}/productos`;
            let method = 'POST';
            if (currentEditId) {
                url += `/${currentEditId}`;
                method = 'PUT';
            }
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productoData)
            });
            if (response.ok) {
                alert(currentEditId ? 'Producto actualizado' : 'Producto agregado');
                closeModal();
                currentPage = 1;
                loadProductos();
            } else {
                const error = await response.json();
                alert('Error: ' + (error.error || 'No se pudo guardar'));
                console.error('Error response:', error);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            alert('Error de conexión con el servidor. ¿Está corriendo el backend?');
        }
    }

    // ==================== MODAL VER PRODUCTO ====================
    async function openViewModal(productId) {
        try {
            const response = await fetch(`${API_BASE}/productos/${productId}`);
            if (!response.ok) throw new Error('Error al cargar producto');
            const product = await response.json();

            // Obtener combos del producto
            let combosHtml = '';
            try {
                const resCombos = await fetch(`${API_BASE}/productos/${productId}/combos`);
                if (resCombos.ok) {
                    const combos = await resCombos.json();
                    if (combos.length > 0) {
                        combosHtml = `
                            <div class="modal-combos">
                                <strong>🧩 Combos activos:</strong>
                                <div class="combos-list">
                                    ${combos.map(c => `<span class="combo-tag">${escapeHtml(c.titulo)} (${c.descuento}% OFF)</span>`).join('')}
                                </div>
                            </div>
                        `;
                    }
                }
            } catch (e) { console.warn('Error cargando combos:', e); }

            // Galería de 4 fotos (sin relleno)
            const todasFotos = [];
            if (product.imagen_principal) todasFotos.push(product.imagen_principal);
            if (product.fotos && product.fotos.length) {
                todasFotos.push(...product.fotos); // exactamente las que tiene
            }
            const fotosHtml = todasFotos.map((url, idx) => `
                <div class="modal-foto-item" data-img="${url}">
                    <img src="${url}" alt="Foto ${idx+1}">
                </div>
            `).join('');

            // Estrellas
            const rating = product.rating_promedio || 0;
            const totalRatings = product.rating_total || 0;
            let estrellasHtml = '';
            if (totalRatings > 0) {
                const estrellaLlena = '<i class="fas fa-star"></i>';
                const estrellaMedia = '<i class="fas fa-star-half-alt"></i>';
                const estrellaVacia = '<i class="far fa-star"></i>';
                let stars = '';
                const entero = Math.floor(rating);
                const decimal = rating - entero;
                for (let i = 0; i < entero; i++) stars += estrellaLlena;
                if (decimal >= 0.5) stars += estrellaMedia;
                for (let i = 0; i < 5 - Math.ceil(rating); i++) stars += estrellaVacia;
                estrellasHtml = `<div class="modal-rating"><div class="stars">${stars}</div><span>${totalRatings} opiniones</span></div>`;
            } else {
                estrellasHtml = `<div class="modal-rating"><span>Sin opiniones</span></div>`;
            }

            const tieneDescuento = product.descuento_total > 0;
            const precioHtml = tieneDescuento ? `
                <div class="modal-price">
                    <span class="old-price">C$ ${parseFloat(product.precio).toFixed(2)}</span>
                    <span class="discount-price">C$ ${product.precio_con_descuento}</span>
                    <span class="discount-badge">-${product.descuento_total}%</span>
                </div>
            ` : `<div class="modal-price">C$ ${parseFloat(product.precio).toFixed(2)}</div>`;

            const tallasHtml = product.tallas ? `<div class="modal-tallas"><strong>Tallas:</strong> ${escapeHtml(product.tallas.split(',').join(', '))}</div>` : '';

            const viewBody = document.getElementById('viewProductBody');
            if (viewBody) {
                viewBody.innerHTML = `
                    <div class="modal-product-container">
                        <div class="modal-gallery" style="grid-template-columns: repeat(${Math.min(todasFotos.length, 2)}, 1fr);">
                            ${fotosHtml}
                        </div>
                        <div class="modal-info">
                            <h2>${escapeHtml(product.nombre)}</h2>
                            <p class="modal-category">${escapeHtml(product.categoria_nombre || 'Sin categoría')}</p>
                            ${estrellasHtml}
                            ${precioHtml}
                            <p class="modal-description">${escapeHtml(product.descripcion || 'Sin descripción')}</p>
                            ${tallasHtml}
                            ${combosHtml}
                            <div class="modal-meta">
                                <span><i class="fas fa-eye"></i> ${product.visitas || 0}</span>
                                <span><i class="fas fa-heart"></i> ${product.favoritos || 0}</span>
                                <span><i class="fas fa-calendar-alt"></i> ${new Date(product.fecha_publicacion).toLocaleDateString()}</span>
                            </div>
                            <div class="modal-status">
                                <span class="status-badge ${product.activo ? 'active' : 'inactive'}">${product.activo ? 'Activo' : 'Oculto'}</span>
                                ${product.destacado ? '<span class="status-badge featured">Destacado</span>' : ''}
                            </div>
                        </div>
                    </div>
                `;
            }

            document.querySelectorAll('.modal-foto-item').forEach(foto => {
                foto.addEventListener('click', () => {
                    window.open(foto.dataset.img, '_blank');
                });
            });

            const viewModal = document.getElementById('viewProductModal');
            if (viewModal) viewModal.style.display = 'flex';
        } catch (error) {
            console.error(error);
            alert('Error al cargar los detalles del producto');
        }
    }

    // ========== FUNCIONES PARA CERRAR EL MODAL DE DETALLE (CORREGIDO) ==========
    function closeViewModal() {
        const viewModal = document.getElementById('viewProductModal');
        if (viewModal) viewModal.style.display = 'none';
    }

    // ==================== ACCIONES ====================
    async function handleProductActions(e) {
        const target = e.target.closest('.action-btn');
        if (!target) return;
        const productId = parseInt(target.getAttribute('data-id'));
        if (target.classList.contains('delete-btn')) {
            if (confirm('¿Eliminar este producto?')) {
                try {
                    const res = await fetch(`${API_BASE}/productos/${productId}`, { method: 'DELETE' });
                    if (res.ok) {
                        if (productos.length === 1 && currentPage > 1) currentPage--;
                        loadProductos();
                    } else alert('Error al eliminar');
                } catch (err) { alert('Error de conexión'); }
            }
        } else if (target.classList.contains('feature-btn')) {
            try {
                const res = await fetch(`${API_BASE}/productos/${productId}/destacar`, { method: 'PATCH' });
                if (res.ok) loadProductos();
                else alert('Error al cambiar destacado');
            } catch (err) { alert('Error de conexión'); }
        } else if (target.classList.contains('toggle-btn')) {
            try {
                const res = await fetch(`${API_BASE}/productos/${productId}/activo`, { method: 'PATCH' });
                if (res.ok) loadProductos();
                else alert('Error al cambiar estado');
            } catch (err) { alert('Error de conexión'); }
        } else if (target.classList.contains('edit-btn')) {
            openModal(productId);
        } else if (target.classList.contains('view-btn')) {
            openViewModal(productId);
        }
    }

    // ==================== FILTROS ====================
    let debounceTimeout;
    function applyFilters() {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            currentPage = 1;
            loadProductos();
        }, 300);
    }

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', () => { currentPage = 1; loadProductos(); });
    if (statusFilter) statusFilter.addEventListener('change', () => { currentPage = 1; loadProductos(); });
    if (sortBy) sortBy.addEventListener('change', () => { currentPage = 1; loadProductos(); });
    if (productsGrid) productsGrid.addEventListener('click', handleProductActions);
    if (addProductBtn) addProductBtn.addEventListener('click', () => openModal(null));
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
    if (formModal) formModal.addEventListener('submit', saveProduct);

    // Eventos para cerrar el modal de detalle
    const closeViewModalBtn = document.getElementById('closeViewModalBtn');
    const closeViewModalBtns = document.querySelectorAll('.close-view-modal');
    if (closeViewModalBtn) closeViewModalBtn.addEventListener('click', closeViewModal);
    closeViewModalBtns.forEach(btn => btn.addEventListener('click', closeViewModal));

    if (modalFotoPrincipal) {
        modalFotoPrincipal.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if (previewPrincipal) previewPrincipal.innerHTML = `<img src="${ev.target.result}" style="width:70px; height:70px; object-fit:cover; border-radius:16px;">`;
                };
                reader.readAsDataURL(file);
            } else {
                if (previewPrincipal) previewPrincipal.innerHTML = '';
            }
        });
    }

    if (modalFotosSecundarias) {
        modalFotosSecundarias.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (previewSecundarias) previewSecundarias.innerHTML = '';
            files.slice(0, 3).forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = document.createElement('img');
                    img.src = ev.target.result;
                    img.style.cssText = 'width:70px; height:70px; object-fit:cover; border-radius:16px;';
                    if (previewSecundarias) previewSecundarias.appendChild(img);
                };
                reader.readAsDataURL(file);
            });
        });
    }

    // Sidebar y logout
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeSidebar = document.getElementById('closeSidebar');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
        if (closeSidebar) closeSidebar.addEventListener('click', () => sidebar.classList.remove('open'));
    }
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('admin_logged');
            window.location.href = '../index.html'; // redirige a inicio (fuera de pages/)
        });
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;'));
    }

 
    loadCategorias();
    loadTemporadas();
    loadProductos();
});