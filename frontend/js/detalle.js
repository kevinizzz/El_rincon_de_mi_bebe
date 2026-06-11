// detalle.js
document.addEventListener('DOMContentLoaded', async () => {
const API_BASE = 'https://elrincondemibebe-production.up.railway.app/api';
    const urlParams = new URLSearchParams(window.location.search);
    const productoId = urlParams.get('id');
    const container = document.getElementById('productoDetalle');

    let esFavorito = false;  // estado actual del favorito

    if (!productoId) {
        container.innerHTML = '<div style="text-align:center; padding:40px;">Producto no especificado</div><a href="catalogo.html" class="boton">Volver al catálogo</a>';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/productos/${productoId}`);
        if (!res.ok) throw new Error('Producto no encontrado');
        const p = await res.json();

        // Verificar si el producto está en favoritos (usando el endpoint /favoritos)
        esFavorito = await verificarFavorito(productoId);

        // Renderizar la vista del producto
        renderProducto(p);
        cargarPromedio(productoId);
        cargarMiCalificacion(productoId);
        cargarRelacionados(p.categoria_id, productoId);
        inicializarEventos(p);

    } catch (error) {
        container.innerHTML = `<div style="text-align:center; padding:40px;">Producto no encontrado</div><a href="catalogo.html" class="boton">Volver al catálogo</a>`;
    }

    // ========== FUNCIONES DE FAVORITOS ==========
    async function verificarFavorito(productId) {
        const session_uuid = localStorage.getItem('session_uuid');
        if (!session_uuid) return false;
        try {
            const res = await fetch(`${API_BASE}/favoritos?session_uuid=${session_uuid}`);
            if (!res.ok) return false;
            const favoritos = await res.json();
            return favoritos.some(fav => fav.id == productId);
        } catch (error) {
            console.error('Error al verificar favorito:', error);
            return false;
        }
    }

    function actualizarBotonFavorito(estado) {
        const favBtn = document.getElementById('favoritoBtn');
        if (favBtn) {
            if (estado) {
                favBtn.innerHTML = '<i class="fas fa-heart" style="color:#ff9a9e;"></i>';
                favBtn.classList.add('activo');
            } else {
                favBtn.innerHTML = '<i class="fa-regular fa-heart"></i>';
                favBtn.classList.remove('activo');
            }
        }
    }

    async function toggleFavorito(productId) {
        const session_uuid = localStorage.getItem('session_uuid');
        if (!session_uuid) {
            alert('Debes iniciar sesión para guardar favoritos');
            return;
        }
        const nuevaEstado = !esFavorito;
        try {
            const res = await fetch(`${API_BASE}/favoritos/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_uuid,
                    producto_id: productId,
                    agregar: nuevaEstado
                })
            });
            if (res.ok) {
                esFavorito = nuevaEstado;
                actualizarBotonFavorito(esFavorito);
                // Registrar interacción (opcional)
                if (window.registrarInteraccion) {
                    window.registrarInteraccion(nuevaEstado ? 'agregar_favorito' : 'quitar_favorito', productId);
                }
            } else {
                const err = await res.json();
                alert('Error al guardar favorito: ' + (err.error || 'Intenta más tarde'));
            }
        } catch (error) {
            console.error('Error al toggle favorito:', error);
            alert('Error de conexión');
        }
    }

    // ========== RENDERIZADO DEL PRODUCTO ==========
    function renderProducto(p) {
        // Preparar imágenes
        const imagenes = [];
        if (p.imagen_principal) imagenes.push(p.imagen_principal);
        if (p.fotos && p.fotos.length) imagenes.push(...p.fotos.slice(0, 3));

        const miniaturasHtml = imagenes.map((img, idx) => `
            <button class="miniatura_producto ${idx === 0 ? 'activa' : ''}" data-img="${img}">
                <img src="${img}" alt="Miniatura ${idx+1}">
            </button>
        `).join('');

        const tieneDescuento = p.descuento_total && p.descuento_total > 0;
        const precioHtml = tieneDescuento ? `
            <div class="precio_contenedor">
                <span class="precio_actual">C$ ${p.precio_con_descuento}</span>
                <span class="precio_anterior">C$ ${parseFloat(p.precio).toFixed(2)}</span>
                <span class="descuento-badge">-${p.descuento_total}%</span>
            </div>
        ` : `<div class="precio_contenedor"><span class="precio_actual">C$ ${parseFloat(p.precio).toFixed(2)}</span></div>`;

        const tallas = p.tallas ? p.tallas.split(',') : [];
        const tallasHtml = tallas.length ? `
            <div class="bloque_tallas">
                <div class="encabezado_tallas"><h3 class="etiqueta_talla">Talla</h3><a href="#" class="guia_tallas">Guía de tallas</a></div>
                <div class="grid_tallas">${tallas.map(t => `<button class="boton_talla">${t}</button>`).join('')}</div>
            </div>
        ` : '<p>Sin tallas disponibles</p>';

        container.innerHTML = `
            <div class="miniaturas_producto" id="miniaturasContainer">
                ${miniaturasHtml}
            </div>
            <div class="imagen_principal_producto" id="imagenPrincipalContainer">
                <img src="${imagenes[0] || 'https://placehold.co/400x400'}" alt="${escapeHtml(p.nombre)}" id="imagenPrincipal">
            </div>
            <div class="informacion_producto">
                <div class="encabezado_info">
                    <span class="categoria_detalle">${escapeHtml(p.categoria_nombre || 'Categoría')}</span>
                    <button class="boton_favorito" id="favoritoBtn">
                        <i class="fa-regular fa-heart"></i>
                    </button>
                </div>
                <h1 class="titulo_producto">${escapeHtml(p.nombre)}</h1>
                ${precioHtml}
                <p class="descripcion_corta">${escapeHtml(p.descripcion || 'Sin descripción')}</p>
                ${tallasHtml}
                <div class="rating-promedio" id="ratingPromedio"></div>
                <div class="calificacion-usuario">
                    <h4>Tu calificación</h4>
                    <div class="estrellas-usuario" id="estrellasUsuario">
                        <span class="estrella" data-valor="1">★</span>
                        <span class="estrella" data-valor="2">★</span>
                        <span class="estrella" data-valor="3">★</span>
                        <span class="estrella" data-valor="4">★</span>
                        <span class="estrella" data-valor="5">★</span>
                    </div>
                    <textarea id="comentario" class="comentario-textarea" rows="2" placeholder="Tu opinión (opcional)"></textarea>
                    <button id="btnCalificar" class="boton_secundario">Enviar calificación</button>
                    <div id="mensajeCalificacion" style="margin-top:8px;"></div>
                </div>
                <button class="boton_whatsapp_grande" id="whatsappBtn">
                    <i class="fa-brands fa-whatsapp"></i> Consultar por WhatsApp
                </button>
            </div>
        `;

        // Actualizar el botón según el estado obtenido
        actualizarBotonFavorito(esFavorito);

        // Evento de cambio de imagen en miniaturas
        document.querySelectorAll('.miniatura_producto').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.miniatura_producto').forEach(b => b.classList.remove('activa'));
                btn.classList.add('activa');
                const nuevaImg = btn.dataset.img;
                document.getElementById('imagenPrincipal').src = nuevaImg;
            });
        });
    }

    // ========== CALIFICACIONES ==========
    async function cargarPromedio(id) {
        try {
            const res = await fetch(`${API_BASE}/calificaciones/producto/${id}`);
            const data = await res.json();
            const promedio = data.promedio || 0;
            const total = data.total || 0;
            const ratingDiv = document.getElementById('ratingPromedio');
            if (ratingDiv) {
                ratingDiv.innerHTML = generarEstrellas(promedio, total);
            }
        } catch(e) { console.error(e); }
    }

    async function cargarMiCalificacion(id) {
        const session_uuid = localStorage.getItem('session_uuid');
        if (!session_uuid) return;
        try {
            const res = await fetch(`${API_BASE}/calificaciones/usuario?session_uuid=${session_uuid}&producto_id=${id}`);
            const data = await res.json();
            if (data) {
                window.valorSeleccionado = data.puntuacion;
                seleccionarEstrellas(data.puntuacion);
                document.getElementById('comentario').value = data.comentario || '';
            }
        } catch(e) { console.error(e); }
    }

    async function enviarCalificacion(id) {
        const session_uuid = localStorage.getItem('session_uuid');
        if (!session_uuid) { alert('Error de sesión'); return; }
        let puntuacion = window.valorSeleccionado || 0;
        if (puntuacion === 0) { alert('Selecciona una puntuación'); return; }
        const comentario = document.getElementById('comentario').value;
        try {
            const res = await fetch(`${API_BASE}/calificaciones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_uuid, producto_id: id, puntuacion, comentario })
            });
            if (res.ok) {
                document.getElementById('mensajeCalificacion').innerHTML = '<span style="color:green;">¡Gracias por tu calificación!</span>';
                cargarPromedio(id);
            } else alert('Error al guardar');
        } catch(e) { alert('Error de conexión'); }
    }

    function seleccionarEstrellas(valor) {
        const estrellas = document.querySelectorAll('.estrellas-usuario .estrella');
        estrellas.forEach((e, idx) => {
            if (idx < valor) e.classList.add('seleccionada');
            else e.classList.remove('seleccionada');
        });
        window.valorSeleccionado = valor;
    }

    // ========== EVENTOS ==========
    function inicializarEventos(p) {
        // Estrellas de calificación
        const estrellas = document.querySelectorAll('.estrellas-usuario .estrella');
        estrellas.forEach(estrella => {
            estrella.addEventListener('click', () => {
                const valor = parseInt(estrella.dataset.valor);
                seleccionarEstrellas(valor);
            });
            estrella.addEventListener('mouseenter', () => {
                const hover = parseInt(estrella.dataset.valor);
                estrellas.forEach((e, idx) => e.style.color = idx < hover ? '#ffb648' : '#ccc');
            });
            estrella.addEventListener('mouseleave', () => {
                estrellas.forEach(e => e.style.color = '');
                if (window.valorSeleccionado) seleccionarEstrellas(window.valorSeleccionado);
            });
        });
        document.getElementById('btnCalificar')?.addEventListener('click', () => enviarCalificacion(p.id));

        // Botón favorito
        const favBtn = document.getElementById('favoritoBtn');
        if (favBtn) {
            favBtn.addEventListener('click', () => toggleFavorito(p.id));
        }

        // WhatsApp
        document.getElementById('whatsappBtn')?.addEventListener('click', () => {
            if (window.registrarInteraccion) {
                window.registrarInteraccion('consulta_producto', p.id);
            }
            window.open(`https://wa.me/50512345678?text=Hola, me interesa el producto: ${encodeURIComponent(p.nombre)}`, '_blank');
        });
    }

    // ========== PRODUCTOS RELACIONADOS ==========
    async function cargarRelacionados(categoriaId, productoActualId) {
        if (!categoriaId) return;
        try {
            const res = await fetch(`${API_BASE}/productos?categoria=${categoriaId}&limite=4&pagina=1`);
            const data = await res.json();
            let productos = Array.isArray(data) ? data : (data.data || []);
            productos = productos.filter(p => p.id != productoActualId).slice(0, 4);
            const grid = document.getElementById('productosRelacionadosGrid');
            const section = document.getElementById('relacionadosSection');
            if (!grid || !section) return;
            if (productos.length === 0) {
                section.style.display = 'none';
                return;
            }
            section.style.display = 'block';
            grid.innerHTML = productos.map(p => `
                <div class="tarjeta_producto" onclick="window.location.href='detalle.html?id=${p.id}'">
                    <div class="contenedor_imagen_producto">
                        <img src="${p.imagen_principal || 'https://placehold.co/300x300'}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <div class="info_producto">
                        <h3 class="nombre_producto">${escapeHtml(p.nombre)}</h3>
                        <div class="product-price">C$ ${parseFloat(p.precio).toFixed(2)}</div>
                        <button class="boton_producto">Ver detalles</button>
                    </div>
                </div>
            `).join('');
        } catch(e) { console.error('Error cargando relacionados:', e); }
    }

    // ========== UTILIDADES ==========
    function generarEstrellas(promedio, total) {
        if (total === 0) return '<span>Sin opiniones</span>';
        const estrellaLlena = '<i class="fas fa-star"></i>';
        const estrellaMedia = '<i class="fas fa-star-half-alt"></i>';
        const estrellaVacia = '<i class="far fa-star"></i>';
        let html = '<div class="rating-estrellas">';
        const entero = Math.floor(promedio);
        const decimal = promedio - entero;
        for (let i = 1; i <= entero; i++) html += estrellaLlena;
        if (decimal >= 0.5) html += estrellaMedia;
        for (let i = 1; i <= 5 - Math.ceil(promedio); i++) html += estrellaVacia;
        html += `<span class="rating-count">(${total} opiniones)</span>`;
        html += '</div>';
        return html;
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;'));
    }
});