// admin-categorias.js
document.addEventListener('DOMContentLoaded', () => {
    if (!sessionStorage.getItem('admin_logged')) window.location.href = 'login.html';

    // ✅ URL base corregida (sin /backend)
    const API_BASE = 'https://elrincondemibebe-production.up.railway.app/api';

    // Datos completos para filtrar
    let todasCategorias = [];
    let todasTemporadas = [];

    // Elementos DOM
    const categoriasGrid = document.getElementById('categoriasGrid');
    const temporadasGrid = document.getElementById('temporadasGrid');
    const addCategoriaBtn = document.querySelector('.agregar-categoria-btn');
    const addTemporadaBtn = document.querySelector('.agregar-temporada-btn');
    const searchCategorias = document.getElementById('searchCategorias');
    const searchTemporadas = document.getElementById('searchTemporadas');

    // Modales categorías
    const categoriaModal = document.getElementById('categoriaModal');
    const categoriaForm = document.getElementById('categoriaForm');
    const categoriaNombre = document.getElementById('categoriaNombre');
    const categoriaModalTitle = document.getElementById('categoriaModalTitle');
    let editingCategoriaId = null;

    // Modales temporadas
    const temporadaModal = document.getElementById('temporadaModal');
    const temporadaForm = document.getElementById('temporadaForm');
    const temporadaNombre = document.getElementById('temporadaNombre');
    const temporadaModalTitle = document.getElementById('temporadaModalTitle');
    let editingTemporadaId = null;

    // ==================== CATEGORÍAS ====================
    async function loadCategorias() {
        try {
            // ✅ Endpoint correcto: /categoria/con-conteo (sin 's' final)
            const response = await fetch(`${API_BASE}/categoria/con-conteo`);
            if (!response.ok) throw new Error('Error al cargar categorías');
            todasCategorias = await response.json();
            renderCategorias(todasCategorias);
        } catch (error) {
            console.error(error);
            categoriasGrid.innerHTML = '<div class="empty-state">Error al cargar categorías</div>';
        }
    }

    function renderCategorias(categorias) {
        if (!categoriasGrid) return;
        if (categorias.length === 0) {
            categoriasGrid.innerHTML = '<div class="empty-state">No hay categorías. Crea una nueva.</div>';
            return;
        }
        categoriasGrid.innerHTML = categorias.map(cat => `
            <div class="tarjeta-item" data-id="${cat.id}" data-tipo="categoria">
                <div class="tarjeta-info">
                    <h3>${escapeHtml(cat.nombre)}</h3>
                    <p>📦 ${cat.total_productos} producto${cat.total_productos !== 1 ? 's' : ''}</p>
                </div>
                <div class="tarjeta-acciones">
                    <button class="edit-categoria" data-id="${cat.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="delete-categoria" data-id="${cat.id}" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        `).join('');
    }

    function filterCategorias() {
        const term = searchCategorias.value.trim().toLowerCase();
        if (!term) {
            renderCategorias(todasCategorias);
            return;
        }
        const filtradas = todasCategorias.filter(cat => cat.nombre.toLowerCase().includes(term));
        renderCategorias(filtradas);
    }

    // ==================== TEMPORADAS ====================
    async function loadTemporadas() {
        try {
            // ✅ Endpoint correcto: /temporada/con-conteo (sin 's' final)
            const response = await fetch(`${API_BASE}/temporada/con-conteo`);
            if (!response.ok) throw new Error('Error al cargar temporadas');
            todasTemporadas = await response.json();
            renderTemporadas(todasTemporadas);
        } catch (error) {
            console.error(error);
            temporadasGrid.innerHTML = '<div class="empty-state">Error al cargar temporadas</div>';
        }
    }

    function renderTemporadas(temporadas) {
        if (!temporadasGrid) return;
        if (temporadas.length === 0) {
            temporadasGrid.innerHTML = '<div class="empty-state">No hay temporadas. Crea una nueva.</div>';
            return;
        }
        temporadasGrid.innerHTML = temporadas.map(temp => `
            <div class="tarjeta-item" data-id="${temp.id}" data-tipo="temporada">
                <div class="tarjeta-info">
                    <h3>${escapeHtml(temp.nombre)}</h3>
                    <p>📦 ${temp.total_productos} producto${temp.total_productos !== 1 ? 's' : ''}</p>
                </div>
                <div class="tarjeta-acciones">
                    <button class="edit-temporada" data-id="${temp.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="delete-temporada" data-id="${temp.id}" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        `).join('');
    }

    function filterTemporadas() {
        const term = searchTemporadas.value.trim().toLowerCase();
        if (!term) {
            renderTemporadas(todasTemporadas);
            return;
        }
        const filtradas = todasTemporadas.filter(temp => temp.nombre.toLowerCase().includes(term));
        renderTemporadas(filtradas);
    }

    // ==================== CRUD CATEGORÍAS ====================
    function openCategoriaModal(id = null) {
        editingCategoriaId = id;
        if (id) {
            categoriaModalTitle.innerText = 'Editar categoría';
            // ✅ Endpoint correcto: /categoria/${id}
            fetch(`${API_BASE}/categoria/${id}`)
                .then(res => res.json())
                .then(cat => { categoriaNombre.value = cat.nombre; })
                .catch(err => console.error(err));
        } else {
            categoriaModalTitle.innerText = 'Nueva categoría';
            categoriaNombre.value = '';
        }
        categoriaModal.style.display = 'flex';
    }

    function closeCategoriaModal() {
        categoriaModal.style.display = 'none';
        editingCategoriaId = null;
        categoriaForm.reset();
    }

    async function saveCategoria(event) {
        event.preventDefault();
        const nombre = categoriaNombre.value.trim();
        if (!nombre) {
            alert('El nombre es obligatorio');
            return;
        }
        try {
            // ✅ Endpoint correcto: /categoria (sin 's')
            let url = `${API_BASE}/categoria`;
            let method = 'POST';
            if (editingCategoriaId) {
                url += `/${editingCategoriaId}`;
                method = 'PUT';
            }
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre })
            });
            if (response.ok) {
                alert(editingCategoriaId ? 'Categoría actualizada' : 'Categoría creada');
                closeCategoriaModal();
                loadCategorias();
            } else {
                const error = await response.json();
                alert('Error: ' + (error.error || 'No se pudo guardar'));
            }
        } catch (error) {
            alert('Error de conexión');
        }
    }

    async function deleteCategoria(id, nombre) {
        if (!confirm(`¿Eliminar la categoría "${nombre}"?`)) return;
        try {
            // ✅ Endpoint correcto: /categoria/${id}
            const response = await fetch(`${API_BASE}/categoria/${id}`, { method: 'DELETE' });
            if (response.ok) {
                alert('Categoría eliminada');
                loadCategorias();
            } else {
                const error = await response.json();
                alert('Error: ' + (error.error || 'No se pudo eliminar'));
            }
        } catch (error) {
            alert('Error de conexión');
        }
    }

    // ==================== CRUD TEMPORADAS ====================
    function openTemporadaModal(id = null) {
        editingTemporadaId = id;
        if (id) {
            temporadaModalTitle.innerText = 'Editar temporada';
            // ✅ Endpoint correcto: /temporada/${id}
            fetch(`${API_BASE}/temporada/${id}`)
                .then(res => res.json())
                .then(temp => { temporadaNombre.value = temp.nombre; })
                .catch(err => console.error(err));
        } else {
            temporadaModalTitle.innerText = 'Nueva temporada';
            temporadaNombre.value = '';
        }
        temporadaModal.style.display = 'flex';
    }

    function closeTemporadaModal() {
        temporadaModal.style.display = 'none';
        editingTemporadaId = null;
        temporadaForm.reset();
    }

    async function saveTemporada(event) {
        event.preventDefault();
        const nombre = temporadaNombre.value.trim();
        if (!nombre) {
            alert('El nombre es obligatorio');
            return;
        }
        try {
            // ✅ Endpoint correcto: /temporada (sin 's')
            let url = `${API_BASE}/temporada`;
            let method = 'POST';
            if (editingTemporadaId) {
                url += `/${editingTemporadaId}`;
                method = 'PUT';
            }
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre })
            });
            if (response.ok) {
                alert(editingTemporadaId ? 'Temporada actualizada' : 'Temporada creada');
                closeTemporadaModal();
                loadTemporadas();
            } else {
                const error = await response.json();
                alert('Error: ' + (error.error || 'No se pudo guardar'));
            }
        } catch (error) {
            alert('Error de conexión');
        }
    }

    async function deleteTemporada(id, nombre) {
        if (!confirm(`¿Eliminar la temporada "${nombre}"?`)) return;
        try {
            // ✅ Endpoint correcto: /temporada/${id}
            const response = await fetch(`${API_BASE}/temporada/${id}`, { method: 'DELETE' });
            if (response.ok) {
                alert('Temporada eliminada');
                loadTemporadas();
            } else {
                const error = await response.json();
                alert('Error: ' + (error.error || 'No se pudo eliminar'));
            }
        } catch (error) {
            alert('Error de conexión');
        }
    }

    // ==================== EVENTOS ====================
    addCategoriaBtn.addEventListener('click', () => openCategoriaModal(null));
    document.getElementById('closeCategoriaModalBtn').addEventListener('click', closeCategoriaModal);
    document.querySelectorAll('.cancel-categoria-modal').forEach(btn => btn.addEventListener('click', closeCategoriaModal));
    categoriaForm.addEventListener('submit', saveCategoria);

    addTemporadaBtn.addEventListener('click', () => openTemporadaModal(null));
    document.getElementById('closeTemporadaModalBtn').addEventListener('click', closeTemporadaModal);
    document.querySelectorAll('.cancel-temporada-modal').forEach(btn => btn.addEventListener('click', closeTemporadaModal));
    temporadaForm.addEventListener('submit', saveTemporada);

    // Delegación de eventos
    categoriasGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.edit-categoria');
        if (btn) {
            openCategoriaModal(parseInt(btn.dataset.id));
            return;
        }
        const delBtn = e.target.closest('.delete-categoria');
        if (delBtn) {
            const id = parseInt(delBtn.dataset.id);
            const card = delBtn.closest('.tarjeta-item');
            const nombre = card?.querySelector('h3')?.innerText || '';
            deleteCategoria(id, nombre);
        }
    });

    temporadasGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.edit-temporada');
        if (btn) {
            openTemporadaModal(parseInt(btn.dataset.id));
            return;
        }
        const delBtn = e.target.closest('.delete-temporada');
        if (delBtn) {
            const id = parseInt(delBtn.dataset.id);
            const card = delBtn.closest('.tarjeta-item');
            const nombre = card?.querySelector('h3')?.innerText || '';
            deleteTemporada(id, nombre);
        }
    });

    // Búsqueda en tiempo real
    searchCategorias.addEventListener('input', filterCategorias);
    searchTemporadas.addEventListener('input', filterTemporadas);

    // Sidebar y logout
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

    function escapeHtml(str) {
        return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;'));
    }

    // Inicializar
    loadCategorias();
    loadTemporadas();
});