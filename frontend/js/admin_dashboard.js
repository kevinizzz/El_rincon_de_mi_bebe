// admin_dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
    // Autenticación simple (temporal, sin JWT)
    if (!sessionStorage.getItem('admin_logged')) {
        window.location.href = 'login.html';
        return;
    }

    const API_BASE = 'http://localhost:3000/api';

    // Elementos del DOM
    const metricsGrid = document.getElementById('metricsGrid');
    const popularListDiv = document.getElementById('popularList');
    const activityTimelineDiv = document.getElementById('activityTimeline');
    const sessionsChartCanvas = document.getElementById('sessionsChart');
    const topViewedChartCanvas = document.getElementById('topViewedChart');

    // ========== MODAL (para "Ver todos") ==========
    function createModal() {
        if (document.getElementById('dataModal')) return;
        const modalHTML = `
            <div id="dataModal" class="modal-overlay" style="display: none;">
                <div class="modal-container modal-large">
                    <div class="modal-header">
                        <h2 id="modalTitle">Todos los productos</h2>
                        <button class="modal-close" id="closeModalBtn"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <div class="search-box-modal" style="margin-bottom: 20px;">
                            <i class="fas fa-search"></i>
                            <input type="text" id="modalSearch" placeholder="Buscar producto...">
                        </div>
                        <div class="modal-table-container">
                            <table id="modalTable" class="modal-table">
                                <thead><tr><th>Producto</th><th>Categoría</th><th>Visitas</th><th>Favoritos</th><th>Precio</th></tr></thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary close-modal">Cerrar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.getElementById('closeModalBtn').addEventListener('click', closeModal);
        document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', closeModal));
    }

    function openModal(title, items) {
        const modal = document.getElementById('dataModal');
        const modalTitle = document.getElementById('modalTitle');
        const tbody = document.querySelector('#modalTable tbody');
        const searchInput = document.getElementById('modalSearch');
        if (!modal) return;
        modalTitle.innerText = title;
        renderModalTable(items);
        modal.style.display = 'flex';
        searchInput.oninput = () => {
            const term = searchInput.value.toLowerCase();
            const filtered = items.filter(item => item.nombre.toLowerCase().includes(term));
            renderModalTable(filtered);
        };
    }

    function renderModalTable(items) {
        const tbody = document.querySelector('#modalTable tbody');
        tbody.innerHTML = items.map(item => `
            <tr>
                <td>${escapeHtml(item.nombre)}</td>
                <td>${escapeHtml(item.categoria_nombre || '-')}</td>
                <td>${item.visitas || 0}</td>
                <td>${item.favoritos || 0}</td>
                <td>C$ ${item.precio}</td>
            </tr>
        `).join('');
    }

    function closeModal() { document.getElementById('dataModal').style.display = 'none'; }

    // ========== MÉTRICAS ==========
    async function loadMetrics() {
        try {
            // Llamadas en paralelo usando los endpoints corregidos
            const [prodTotalRes, destacadosRes, promosRes, allRes] = await Promise.all([
                fetch(`${API_BASE}/productos?pagina=1&limite=1`),
                fetch(`${API_BASE}/productos?destacado=1&limite=100`), // destacado ahora soportado
                fetch(`${API_BASE}/promociones?activa=1`),              // solo activas
                fetch(`${API_BASE}/productos?limite=1000`)              // para sumar visitas/favoritos
            ]);
            const prodData = await prodTotalRes.json();
            const destacadosData = await destacadosRes.json();
            const promos = await promosRes.json();
            const allData = await allRes.json();

            const totalProductos = prodData.total || 0;
            const totalDestacados = destacadosData.data ? destacadosData.data.length : 0;
            const totalPromos = promos.length || 0;
            const productos = allData.data || [];
            const totalVisitas = productos.reduce((sum, p) => sum + (p.visitas || 0), 0);
            const totalFavoritos = productos.reduce((sum, p) => sum + (p.favoritos || 0), 0);

            // Valores de ejemplo si no tienes endpoints reales de "visitas hoy" y "sesiones semana"
            const visitasHoy = 482;
            const sesionesSemana = 1250;

            metricsGrid.innerHTML = `
                <div class="metric-card"><div class="metric-icon"><i class="fas fa-box"></i></div><div class="metric-info"><h3>${totalProductos}</h3><p>Total productos</p><span class="trend up">+14 este mes</span></div></div>
                <div class="metric-card"><div class="metric-icon"><i class="fas fa-star"></i></div><div class="metric-info"><h3>${totalDestacados}</h3><p>Destacados</p><span class="trend up">+4 este mes</span></div></div>
                <div class="metric-card"><div class="metric-icon"><i class="fas fa-tag"></i></div><div class="metric-info"><h3>${totalPromos}</h3><p>Promociones activas</p><span class="trend neutral">Sin cambios</span></div></div>
                <div class="metric-card"><div class="metric-icon"><i class="fas fa-chart-simple"></i></div><div class="metric-info"><h3>${totalVisitas.toLocaleString()}</h3><p>Visitas totales</p><span class="trend up">+12.5%</span></div></div>
                <div class="metric-card"><div class="metric-icon"><i class="fas fa-heart"></i></div><div class="metric-info"><h3>${totalFavoritos.toLocaleString()}</h3><p>Favoritos</p><span class="trend up">+230/mes</span></div></div>
                <div class="metric-card"><div class="metric-icon"><i class="fas fa-eye"></i></div><div class="metric-info"><h3>${visitasHoy}</h3><p>Visitas hoy</p><span class="trend up">+8.2%</span></div></div>
                <div class="metric-card"><div class="metric-icon"><i class="fas fa-users"></i></div><div class="metric-info"><h3>${sesionesSemana}</h3><p>Sesiones/última semana</p><span class="trend up">+5.1%</span></div></div>
            `;
        } catch (error) { console.error('Error cargando métricas:', error); }
    }

    // ========== GRÁFICOS ==========
    async function loadSessionsChart() {
        if (!sessionsChartCanvas) return;
        try {
            const res = await fetch(`${API_BASE}/sesiones/por-dia?dias=7`);
            let data = res.ok ? await res.json() : [
                { dia: 'Lun', total: 600 }, { dia: 'Mar', total: 450 },
                { dia: 'Mié', total: 300 }, { dia: 'Jue', total: 150 },
                { dia: 'Vie', total: 420 }, { dia: 'Sáb', total: 380 }, { dia: 'Dom', total: 290 }
            ];
            new Chart(sessionsChartCanvas, {
                type: 'line',
                data: {
                    labels: data.map(d => d.dia),
                    datasets: [{ data: data.map(d => d.total), borderColor: '#ff9a9e', backgroundColor: 'rgba(255,154,158,0.05)', tension: 0.3, fill: true, pointBackgroundColor: '#ff9a9e' }]
                },
                options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
            });
        } catch (error) { console.error('Error en gráfico de sesiones:', error); }
    }

    async function loadTopViewedChart() {
        if (!topViewedChartCanvas) return;
        try {
            // Usamos orden=views (soportado por el backend)
            const res = await fetch(`${API_BASE}/productos?orden=views&limite=5`);
            const data = await res.json();
            const top5 = data.data || [];
            new Chart(topViewedChartCanvas, {
                type: 'bar',
                data: {
                    labels: top5.map(p => p.nombre.length > 15 ? p.nombre.slice(0,12)+'…' : p.nombre),
                    datasets: [{ data: top5.map(p => p.visitas), backgroundColor: '#ff9a9e', borderRadius: 12, barPercentage: 0.6 }]
                },
                options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
            });
        } catch (error) { console.error('Error en gráfico de más vistos:', error); }
    }

    // ========== PRODUCTOS POPULARES + BOTÓN VER TODOS ==========
    async function loadPopularProducts() {
        if (!popularListDiv) return;
        try {
            const res = await fetch(`${API_BASE}/productos?orden=views&limite=5`);
            const data = await res.json();
            const top5 = data.data || [];
            popularListDiv.innerHTML = top5.map(p => `
                <div class="popular-item">
                    <div class="popular-img">${p.imagen_principal ? `<img src="${p.imagen_principal}" alt="${escapeHtml(p.nombre)}">` : '👕'}</div>
                    <div class="popular-info"><h4>${escapeHtml(p.nombre)}</h4><p>${escapeHtml(p.categoria_nombre || '-')}</p></div>
                    <div class="popular-stats">${p.visitas} <span>visitas</span><br>❤ ${p.favoritos}</div>
                </div>
            `).join('');
            const header = document.querySelector('.popular-products-card .card-header');
            if (header && !document.getElementById('verTodosPopular')) {
                const btn = document.createElement('button');
                btn.id = 'verTodosPopular';
                btn.innerHTML = 'Ver todos <i class="fas fa-arrow-right"></i>';
                btn.style.cssText = 'background:none; border:none; color:#ff9a9e; cursor:pointer; font-size:0.85rem;';
                btn.addEventListener('click', async () => {
                    const allRes = await fetch(`${API_BASE}/productos?orden=views&limite=1000`);
                    const allData = await allRes.json();
                    openModal('Productos más vistos (todos)', allData.data || []);
                });
                header.appendChild(btn);
            }
        } catch (error) { console.error('Error cargando productos populares:', error); }
    }

    // ========== ACTIVIDAD RECIENTE ==========
    async function loadRecentActivity() {
        if (!activityTimelineDiv) return;
        try {
            const res = await fetch(`${API_BASE}/interacciones/recientes?limite=6`);
            let actividades;
            if (res.ok) {
                actividades = await res.json();
            } else {
                actividades = [
                    { texto: 'Producto visto', detalle: 'Chaqueta Acolchada Nieve', tiempo: 'hace 2 minutos', icono: 'fas fa-eye' },
                    { texto: 'Consulta por WhatsApp', detalle: 'Vestido Floral Verano', tiempo: 'hace 15 minutos', icono: 'fab fa-whatsapp' }
                ];
            }
            activityTimelineDiv.innerHTML = actividades.map(a => `
                <div class="activity-item">
                    <div class="activity-icon"><i class="${a.icono}"></i></div>
                    <div class="activity-detail">
                        <strong>${a.texto}</strong>
                        <p>${a.detalle}</p>
                        <span style="font-size:0.65rem; color:#aaa">${a.tiempo}</span>
                    </div>
                </div>
            `).join('');
        } catch (error) { console.error('Error cargando actividad:', error); }
    }

    // ========== SIDEBAR Y LOGOUT ==========
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeSidebar = document.getElementById('closeSidebar');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
        if (closeSidebar) closeSidebar.addEventListener('click', () => sidebar.classList.remove('open'));
    }
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        sessionStorage.removeItem('admin_logged');
        window.location.href = 'login.html';
    });

    function escapeHtml(str) {
        return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;'));
    }

    createModal();
    await loadMetrics();
    await loadSessionsChart();
    await loadTopViewedChart();
    await loadPopularProducts();
    await loadRecentActivity();
});