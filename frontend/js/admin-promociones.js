// admin-promociones.js - Gestión de promociones (producto, categoría, combo)
document.addEventListener('DOMContentLoaded', async () => {
    if (!sessionStorage.getItem('admin_logged')) {
        window.location.href = 'login.html';
        return;
    }

    const API_BASE = 'https://elrincondemibebe-production.up.railway.app/api';
    let promocionesNormales = [];
    let combos = [];
    let currentEdit = null;

    // Elementos DOM
    const promoGrid = document.getElementById('promoGrid');
    const searchInput = document.getElementById('searchPromo');
    const tipoFilter = document.getElementById('tipoFilter');

    const btnProducto = document.getElementById('btnProducto');
    const btnCategoria = document.getElementById('btnCategoria');
    const btnCombo = document.getElementById('btnCombo');

    const modalProducto = document.getElementById('modalProducto');
    const modalCategoria = document.getElementById('modalCategoria');
    const modalCombo = document.getElementById('modalCombo');
    const closeModalBtns = document.querySelectorAll('.modal-close, .cerrar-modal');

    const formProducto = document.getElementById('formProducto');
    const formCategoria = document.getElementById('formCategoria');
    const formCombo = document.getElementById('formCombo');

    // Campos ocultos para almacenar el ID durante la edición
    const editIdProducto = document.getElementById('editIdProducto') || (() => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.id = 'editIdProducto';
        document.getElementById('formProducto').appendChild(input);
        return input;
    })();
    const editIdCategoria = document.getElementById('editIdCategoria') || (() => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.id = 'editIdCategoria';
        document.getElementById('formCategoria').appendChild(input);
        return input;
    })();
    const editIdCombo = document.getElementById('editIdCombo') || (() => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.id = 'editIdCombo';
        document.getElementById('formCombo').appendChild(input);
        return input;
    })();

    function escapeHtml(str) {
        return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;'));
    }
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString();
    }

    function cerrarModales() {
        modalProducto.style.display = 'none';
        modalCategoria.style.display = 'none';
        modalCombo.style.display = 'none';
        // Limpiar campos ocultos solo al cerrar manualmente
        editIdProducto.value = '';
        editIdCategoria.value = '';
        editIdCombo.value = '';
        currentEdit = null;
    }

    function abrirModal(modal) {
        // Ocultar todos los modales sin limpiar campos
        modalProducto.style.display = 'none';
        modalCategoria.style.display = 'none';
        modalCombo.style.display = 'none';
        modal.style.display = 'flex';
    }

    // Cargar selectores (productos y categorías)
    async function cargarSelectores() {
        try {
            const resProd = await fetch(`${API_BASE}/productos?limite=1000`);
            const dataProd = await resProd.json();
            const productos = dataProd.data || [];
            const selectProducto = document.getElementById('prodProducto');
            if (selectProducto) {
                selectProducto.innerHTML = '<option value="">Seleccionar producto</option>' + 
                    productos.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('');
            }
            window.listaProductos = productos;

            const resCat = await fetch(`${API_BASE}/categoria`);
            const categorias = await resCat.json();
            const selectCategoria = document.getElementById('catCategoria');
            if (selectCategoria) {
                selectCategoria.innerHTML = '<option value="">Seleccionar categoría</option>' + 
                    categorias.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join('');
            }
        } catch (error) {
            console.error('Error cargando selectores:', error);
        }
    }

    // Cargar todas las promociones y combos
    async function cargarTodo() {
        try {
            const resNormales = await fetch(`${API_BASE}/promociones`);
            if (!resNormales.ok) throw new Error(`HTTP ${resNormales.status}`);
            promocionesNormales = await resNormales.json();

            const resCombos = await fetch(`${API_BASE}/promociones/combos/todos`);
            if (!resCombos.ok) throw new Error(`HTTP ${resCombos.status}`);
            combos = await resCombos.json();

            renderizar();
        } catch (error) {
            console.error('Error en cargarTodo:', error);
            promoGrid.innerHTML = `<div class="error">Error al cargar datos: ${error.message}</div>`;
        }
    }

    function renderizar() {
        if (!promocionesNormales) promocionesNormales = [];
        if (!combos) combos = [];

        let todas = [];
        promocionesNormales.forEach(p => {
            todas.push({
                ...p,
                tipo: p.producto_id ? 'producto' : 'categoria',
                entidad: 'normal',
                id_original: p.id,
                detalle: p.producto_id ? `Producto: ${p.producto_nombre || 'ID '+p.producto_id}` : `Categoría: ${p.categoria_nombre || 'ID '+p.categoria_id}`
            });
        });
        combos.forEach(c => {
            todas.push({
                ...c,
                tipo: 'combo',
                entidad: 'combo',
                id_original: c.id,
                detalle: `Productos: ${c.productos_nombres || 'varios'}`
            });
        });

        const searchTerm = searchInput.value.trim().toLowerCase();
        const tipo = tipoFilter.value;
        let filtradas = todas;
        if (searchTerm) filtradas = filtradas.filter(item => item.titulo.toLowerCase().includes(searchTerm));
        if (tipo !== 'all') filtradas = filtradas.filter(item => item.tipo === tipo);

        if (filtradas.length === 0) {
            promoGrid.innerHTML = '<div class="empty-state">No hay promociones o combos</div>';
            return;
        }

        // ██████████ BOTONES SIN ICONOS ██████████
        promoGrid.innerHTML = filtradas.map(item => `
            <div class="promo-card" data-id="${item.id_original}" data-tipo="${item.tipo}" data-entidad="${item.entidad}">
                <div class="promo-tipo ${item.tipo}">${item.tipo === 'producto' ? 'Producto' : (item.tipo === 'categoria' ? 'Categoría' : 'Combo')}</div>
                <h3>${escapeHtml(item.titulo)}</h3>
                <div class="promo-descuento">${item.descuento}% OFF</div>
                <div class="promo-detalle">${escapeHtml(item.detalle)}</div>
                <div class="promo-fechas">${formatDate(item.fecha_inicio)} → ${formatDate(item.fecha_fin)}</div>
                <div class="promo-status">${item.activa ? 'Activa' : 'Inactiva'}</div>
                <div class="promo-actions">
                    <button class="btn-edit" data-id="${item.id_original}" data-tipo="${item.tipo}" data-entidad="${item.entidad}">Editar</button>
                    <button class="btn-delete" data-id="${item.id_original}" data-tipo="${item.tipo}" data-entidad="${item.entidad}">Eliminar</button>
                    <button class="btn-toggle" data-id="${item.id_original}" data-tipo="${item.tipo}" data-entidad="${item.entidad}">${item.activa ? 'Desactivar' : 'Activar'}</button>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                const tipo = btn.dataset.tipo;
                const entidad = btn.dataset.entidad;
                editarPromocion(id, tipo, entidad);
            });
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                const tipo = btn.dataset.tipo;
                const entidad = btn.dataset.entidad;
                if (confirm('¿Eliminar?')) await eliminarPromocion(id, tipo, entidad);
            });
        });
        document.querySelectorAll('.btn-toggle').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                const tipo = btn.dataset.tipo;
                const entidad = btn.dataset.entidad;
                await toggleEstado(id, tipo, entidad);
            });
        });
    }

    async function eliminarPromocion(id, tipo, entidad) {
        try {
            let url = '';
            if (entidad === 'normal') url = `${API_BASE}/promociones/${id}`;
            else url = `${API_BASE}/promociones/combos/${id}`;
            const res = await fetch(url, { method: 'DELETE' });
            if (res.ok) cargarTodo();
            else alert('Error al eliminar');
        } catch (error) { alert('Error de conexión'); }
    }

    async function toggleEstado(id, tipo, entidad) {
        try {
            let url = '';
            if (entidad === 'normal') url = `${API_BASE}/promociones/${id}/toggle`;
            else url = `${API_BASE}/promociones/combos/${id}/toggle`;
            const res = await fetch(url, { method: 'PATCH' });
            if (res.ok) cargarTodo();
            else alert('Error');
        } catch (error) { alert('Error de conexión'); }
    }

    async function editarPromocion(id, tipo, entidad) {
        try {
            let data;
            if (entidad === 'normal') {
                const res = await fetch(`${API_BASE}/promociones/${id}`);
                if (!res.ok) throw new Error('Error al cargar promoción');
                data = await res.json();
                currentEdit = { id, tipo, entidad };
                if (tipo === 'producto') {
                    document.getElementById('prodTitulo').value = data.titulo;
                    document.getElementById('prodProducto').value = data.producto_id;
                    document.getElementById('prodDescuento').value = data.descuento;
                    document.getElementById('prodDescripcion').value = data.descripcion || '';
                    document.getElementById('prodFechaInicio').value = data.fecha_inicio?.split('T')[0] || '';
                    document.getElementById('prodFechaFin').value = data.fecha_fin?.split('T')[0] || '';
                    document.getElementById('prodActiva').checked = data.activa === 1;
                    // Abrir modal ANTES de asignar ID
                    abrirModal(modalProducto);
                    editIdProducto.value = id;
                } else if (tipo === 'categoria') {
                    document.getElementById('catTitulo').value = data.titulo;
                    document.getElementById('catCategoria').value = data.categoria_id;
                    document.getElementById('catDescuento').value = data.descuento;
                    document.getElementById('catDescripcion').value = data.descripcion || '';
                    document.getElementById('catFechaInicio').value = data.fecha_inicio?.split('T')[0] || '';
                    document.getElementById('catFechaFin').value = data.fecha_fin?.split('T')[0] || '';
                    document.getElementById('catActiva').checked = data.activa === 1;
                    abrirModal(modalCategoria);
                    editIdCategoria.value = id;
                }
            } else { // combo
                const res = await fetch(`${API_BASE}/promociones/combos/todos`);
                const combosList = await res.json();
                data = combosList.find(c => c.id == id);
                if (!data) throw new Error('Combo no encontrado');
                currentEdit = { id, tipo, entidad };
                document.getElementById('comboTitulo').value = data.titulo;
                document.getElementById('comboDescripcion').value = data.descripcion || '';
                document.getElementById('comboDescuento').value = data.descuento;
                document.getElementById('comboFechaInicio').value = data.fecha_inicio?.split('T')[0] || '';
                document.getElementById('comboFechaFin').value = data.fecha_fin?.split('T')[0] || '';
                document.getElementById('comboActiva').checked = data.activa === 1;
                const idsSeleccionados = data.productos_ids ? data.productos_ids.split(',').map(Number) : [];
                productosSeleccionadosCombo = idsSeleccionados.map(pid => {
                    const prod = window.listaProductos.find(p => p.id == pid);
                    return prod ? { id: prod.id, nombre: prod.nombre } : null;
                }).filter(p => p);
                abrirModal(modalCombo);
                editIdCombo.value = id;
                actualizarListaSeleccionadosCombo();
            }
        } catch (error) {
            console.error(error);
            alert('Error al cargar datos para editar');
        }
    }

    // Lógica para combo
    let productosSeleccionadosCombo = [];
    let busquedaTimeout;

    function actualizarListaSeleccionadosCombo() {
        const container = document.getElementById('listaSeleccionadosCombo');
        if (!container) return;
        if (productosSeleccionadosCombo.length === 0) {
            container.innerHTML = '<span style="color:#999;">No hay productos seleccionados</span>';
            return;
        }
        container.innerHTML = productosSeleccionadosCombo.map(p => `
            <div class="tag-producto">
                ${escapeHtml(p.nombre)}
                <button type="button" data-id="${p.id}" class="remover-producto">✖</button>
            </div>
        `).join('');
        document.querySelectorAll('.remover-producto').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(btn.dataset.id);
                productosSeleccionadosCombo = productosSeleccionadosCombo.filter(p => p.id !== id);
                actualizarListaSeleccionadosCombo();
            });
        });
    }

    function configurarBusquedaCombo() {
        const inputBusqueda = document.getElementById('buscarProductoCombo');
        const resultadosDiv = document.getElementById('resultadosBusquedaCombo');
        if (!inputBusqueda) return;
        inputBusqueda.addEventListener('input', () => {
            clearTimeout(busquedaTimeout);
            const term = inputBusqueda.value.trim().toLowerCase();
            if (term.length < 2) {
                resultadosDiv.innerHTML = '';
                return;
            }
            busquedaTimeout = setTimeout(() => {
                const filtrados = (window.listaProductos || []).filter(p => 
                    p.nombre.toLowerCase().includes(term) && 
                    !productosSeleccionadosCombo.some(sel => sel.id === p.id)
                );
                resultadosDiv.innerHTML = filtrados.slice(0, 10).map(p => `
                    <div class="resultado-item" data-id="${p.id}" data-nombre="${escapeHtml(p.nombre)}">
                        ${escapeHtml(p.nombre)} - C$ ${p.precio}
                    </div>
                `).join('');
                document.querySelectorAll('.resultado-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const id = parseInt(item.dataset.id);
                        const nombre = item.dataset.nombre;
                        if (!productosSeleccionadosCombo.some(p => p.id === id)) {
                            productosSeleccionadosCombo.push({ id, nombre });
                            actualizarListaSeleccionadosCombo();
                            inputBusqueda.value = '';
                            resultadosDiv.innerHTML = '';
                        }
                    });
                });
            }, 300);
        });
    }

    async function validarProductoSinPromocion(productoId, promocionIdEditar = null) {
        try {
            const res = await fetch(`${API_BASE}/promociones?activa=1`);
            const promociones = await res.json();
            const tienePromocion = promociones.some(p => p.producto_id == productoId && (promocionIdEditar === null || p.id != promocionIdEditar));
            return !tienePromocion;
        } catch (error) {
            console.error('Error validando promoción única:', error);
            return false;
        }
    }

    async function guardarProducto(e) {
        e.preventDefault();
        const titulo = document.getElementById('prodTitulo').value.trim();
        const producto_id = document.getElementById('prodProducto').value;
        const descuento = parseInt(document.getElementById('prodDescuento').value);
        const descripcion = document.getElementById('prodDescripcion').value;
        const fecha_inicio = document.getElementById('prodFechaInicio').value;
        const fecha_fin = document.getElementById('prodFechaFin').value;
        const activa = document.getElementById('prodActiva').checked ? 1 : 0;
        if (!titulo || !producto_id || !descuento || !fecha_inicio || !fecha_fin) {
            alert('Complete todos los campos obligatorios');
            return;
        }

        const editId = editIdProducto.value;
        const editando = editId !== '';
        const productoIdActual = parseInt(producto_id);

        if (!editando) {
            const esValido = await validarProductoSinPromocion(productoIdActual, null);
            if (!esValido) {
                alert('Este producto ya tiene una promoción activa. Solo puede tener una.');
                return;
            }
        } else {
            const esValido = await validarProductoSinPromocion(productoIdActual, parseInt(editId));
            if (!esValido) {
                alert('Este producto ya tiene otra promoción activa. Solo puede tener una.');
                return;
            }
        }

        const body = { titulo, producto_id: productoIdActual, descripcion, descuento, fecha_inicio, fecha_fin, activa };
        let url = `${API_BASE}/promociones`;
        let method = 'POST';
        if (editando) {
            url += `/${editId}`;
            method = 'PUT';
        }

        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (res.ok) {
                alert(editando ? 'Actualizado' : 'Creado');
                cerrarModales();
                cargarTodo();
            } else {
                const err = await res.json();
                alert('Error: ' + (err.error || 'No se pudo guardar'));
            }
        } catch (error) { alert('Error de conexión'); }
    }

    async function guardarCategoria(e) {
        e.preventDefault();
        const titulo = document.getElementById('catTitulo').value.trim();
        const categoria_id = document.getElementById('catCategoria').value;
        const descuento = parseInt(document.getElementById('catDescuento').value);
        const descripcion = document.getElementById('catDescripcion').value;
        const fecha_inicio = document.getElementById('catFechaInicio').value;
        const fecha_fin = document.getElementById('catFechaFin').value;
        const activa = document.getElementById('catActiva').checked ? 1 : 0;
        if (!titulo || !categoria_id || !descuento || !fecha_inicio || !fecha_fin) {
            alert('Complete todos los campos obligatorios');
            return;
        }

        const editId = editIdCategoria.value;
        const editando = editId !== '';
        const body = { titulo, categoria_id: parseInt(categoria_id), descripcion, descuento, fecha_inicio, fecha_fin, activa };
        let url = `${API_BASE}/promociones`;
        let method = 'POST';
        if (editando) {
            url += `/${editId}`;
            method = 'PUT';
        }

        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (res.ok) {
                alert(editando ? 'Actualizado' : 'Creado');
                cerrarModales();
                cargarTodo();
            } else {
                const err = await res.json();
                alert('Error: ' + (err.error || 'No se pudo guardar'));
            }
        } catch (error) { alert('Error de conexión'); }
    }

    async function guardarCombo(e) {
        e.preventDefault();
        const titulo = document.getElementById('comboTitulo').value.trim();
        const descripcion = document.getElementById('comboDescripcion').value;
        const descuento = parseInt(document.getElementById('comboDescuento').value);
        const fecha_inicio = document.getElementById('comboFechaInicio').value;
        const fecha_fin = document.getElementById('comboFechaFin').value;
        const activa = document.getElementById('comboActiva').checked ? 1 : 0;
        const productos_ids = productosSeleccionadosCombo.map(p => p.id);
        if (!titulo || !descuento || !fecha_inicio || !fecha_fin || productos_ids.length === 0) {
            alert('Complete todos los campos y seleccione al menos un producto');
            return;
        }

        const editId = editIdCombo.value;
        const editando = editId !== '';
        const body = { titulo, descripcion, descuento, fecha_inicio, fecha_fin, activa, productos_ids };
        let url = `${API_BASE}/promociones/combos`;
        let method = 'POST';
        if (editando) {
            url += `/${editId}`;
            method = 'PUT';
        }

        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (res.ok) {
                alert(editando ? 'Combo actualizado' : 'Combo creado');
                cerrarModales();
                cargarTodo();
            } else {
                const err = await res.json();
                alert('Error: ' + (err.error || 'No se pudo guardar'));
            }
        } catch (error) { alert('Error de conexión'); }
    }

    // Eventos
    btnProducto.addEventListener('click', () => {
        currentEdit = null;
        editIdProducto.value = '';
        formProducto.reset();
        document.getElementById('prodActiva').checked = true;
        abrirModal(modalProducto);
    });
    btnCategoria.addEventListener('click', () => {
        currentEdit = null;
        editIdCategoria.value = '';
        formCategoria.reset();
        document.getElementById('catActiva').checked = true;
        abrirModal(modalCategoria);
    });
    btnCombo.addEventListener('click', () => {
        currentEdit = null;
        editIdCombo.value = '';
        formCombo.reset();
        document.getElementById('comboActiva').checked = true;
        productosSeleccionadosCombo = [];
        actualizarListaSeleccionadosCombo();
        const inputBusqueda = document.getElementById('buscarProductoCombo');
        if (inputBusqueda) inputBusqueda.value = '';
        document.getElementById('resultadosBusquedaCombo').innerHTML = '';
        abrirModal(modalCombo);
    });

    closeModalBtns.forEach(btn => btn.addEventListener('click', cerrarModales));
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) cerrarModales();
    });

    formProducto.addEventListener('submit', guardarProducto);
    formCategoria.addEventListener('submit', guardarCategoria);
    formCombo.addEventListener('submit', guardarCombo);

    searchInput.addEventListener('input', () => renderizar());
    tipoFilter.addEventListener('change', () => renderizar());

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

    // Inicialización
    await cargarSelectores();
    await cargarTodo();
    configurarBusquedaCombo();
});