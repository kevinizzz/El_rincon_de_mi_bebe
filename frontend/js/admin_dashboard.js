// admin_dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
    const logged = sessionStorage.getItem('admin_logged');
    if (!logged) {
        window.location.href = 'login.html';
        return;
    }

    let adminData = { nombre: 'Admin' };
    try {
        const stored = sessionStorage.getItem('admin_data');
        if (stored) adminData = JSON.parse(stored);
    } catch(e) { console.warn(e); }

    const adminAvatar = document.getElementById('adminAvatar');
    if (adminAvatar) {
        adminAvatar.textContent = adminData.nombre ? adminData.nombre.charAt(0).toUpperCase() : 'A';
    }

    const API_BASE = 'https://elrincondemibebe-production.up.railway.app/api';

    // Elementos DOM
    const metricsGrid = document.getElementById('metricsGrid');
    const popularListDiv = document.getElementById('popularList');
    const activityTimelineDiv = document.getElementById('activityTimeline');
    const sessionsChartCanvas = document.getElementById('sessionsChart');
    const topViewedChartCanvas = document.getElementById('topViewedChart');
    const favoritesChartCanvas = document.getElementById('favoritesChart');
    const lastUpdateSpan = document.getElementById('lastUpdateTime');

    let sessionsChart = null;
    let topViewedChart = null;
    let favoritesChart = null;

    function updateLastRefresh() {
        if (lastUpdateSpan) lastUpdateSpan.textContent = new Date().toLocaleTimeString();
    }

    // ========== MODAL ==========
    function createModal() {
        if (document.getElementById('dataModal')) return;
        const modalHTML = `
            <div id="dataModal" class="modal-overlay" style="display: none;">
                <div class="modal-container modal-large">
                    <div class="modal-header">
                        <h2 id="modalTitle">Top 10 productos más populares</h2>
                        <button class="modal-close" id="closeModalBtn"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <div class="search-box-modal" style="margin-bottom: 20px;">
                            <i class="fas fa-search"></i>
                            <input type="text" id="modalSearch" placeholder="Buscar producto...">
                        </div>
                        <div class="modal-table-container">
                            <table id="modalTable" class="modal-table">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Categoría</th>
                                        <th>Visitas</th>
                                        <th>Favoritos</th>
                                        <th>Rating</th>
                                        <th>Precio</th>
                                    </tr>
                                </thead>
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

    function openModal(items) {
        const modal = document.getElementById('dataModal');
        if (!modal) return;
        document.getElementById('modalTitle').innerText = 'Top 10 productos más populares';
        renderModalTable(items);
        modal.style.display = 'flex';
        const searchInput = document.getElementById('modalSearch');
        if (searchInput) {
            searchInput.oninput = () => {
                const term = searchInput.value.toLowerCase();
                const filtered = items.filter(item => item.nombre.toLowerCase().includes(term));
                renderModalTable(filtered);
            };
        }
    }

    function renderModalTable(items) {
        const tbody = document.querySelector('#modalTable tbody');
        if (!tbody) return;
        tbody.innerHTML = items.map(item => `
            <tr>
                <td>${escapeHtml(item.nombre)}</td>
                <td>${escapeHtml(item.categoria_nombre || '-')}</td>
                <td>${item.visitas || 0}</td>
                <td>${item.favoritos || 0}</td>
                <td>${(item.rating_promedio || 0).toFixed(1)} ⭐</td>
                <td>C$ ${item.precio}</td>
            </tr>
        `).join('');
    }

    function closeModal() {
        const modal = document.getElementById('dataModal');
        if (modal) modal.style.display = 'none';
    }

    // ========== MÉTRICAS ==========
    async function loadMetrics() {
        try {
            // Productos
            const productosRes = await fetch(`${API_BASE}/productos?limite=10000`);
            const productosData = await productosRes.json();
            let productos = [];
            if (Array.isArray(productosData)) {
                productos = productosData;
            } else if (productosData.data && Array.isArray(productosData.data)) {
                productos = productosData.data;
            }
            const totalProductos = productos.length;
            const haceUnMes = new Date();
            haceUnMes.setMonth(haceUnMes.getMonth() - 1);
            const nuevosProductos = productos.filter(p => new Date(p.fecha_publicacion) >= haceUnMes).length;

            // Promociones activas y nuevas este mes
            const promosRes = await fetch(`${API_BASE}/promociones?activa=1`);
            let promosActivas = [];
            if (promosRes.ok) promosActivas = await promosRes.json();
            const totalPromos = promosActivas.length;
            const nuevasPromos = promosActivas.filter(p => new Date(p.fecha_inicio) >= haceUnMes).length;

            // ===== NUEVO: Visitas hoy = sesiones de hoy =====
            let visitasHoy = 0;
            try {
                const sesionesHoyRes = await fetch(`${API_BASE}/sesiones/por-dia?dias=1`);
                if (sesionesHoyRes.ok) {
                    const data = await sesionesHoyRes.json();
                    if (data && data.length > 0) {
                        visitasHoy = data[0].total || 0;
                    }
                }
            } catch(e) { console.warn(e); }

            // Visitas este mes (desde interacciones, o también podrías usar sesiones)
            let visitasMes = 0;
            try {
                const desde = haceUnMes.toISOString().split('T')[0];
                const visitasMesRes = await fetch(`${API_BASE}/interacciones/contar?tipo=ver_producto&desde=${desde}`);
                if (visitasMesRes.ok) visitasMes = (await visitasMesRes.json()).total || 0;
            } catch(e) { console.warn(e); }

            const totalFavoritos = productos.reduce((sum, p) => sum + (p.favoritos || 0), 0);
            const destacados = productos.filter(p => p.destacado === 1).length;
            const nuevosDestacados = productos.filter(p => p.destacado === 1 && new Date(p.fecha_publicacion) >= haceUnMes).length;

            let consultasWhatsApp = 0;
            try {
                const whatsappRes = await fetch(`${API_BASE}/interacciones/contar?tipo=consulta_producto`);
                if (whatsappRes.ok) consultasWhatsApp = (await whatsappRes.json()).total || 0;
            } catch(e) { console.warn(e); }

            if (metricsGrid) {
                metricsGrid.innerHTML = `
                    <div class="metric-card">
                        <div class="metric-icon"><i class="fas fa-box"></i></div>
                        <div class="metric-info">
                            <h3>${totalProductos}</h3>
                            <p>Total productos</p>
                            <span class="trend up">+${nuevosProductos} este mes</span>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon"><i class="fas fa-percent"></i></div>
                        <div class="metric-info">
                            <h3>${totalPromos}</h3>
                            <p>Promociones activas</p>
                            <span class="trend up">+${nuevasPromos} este mes</span>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon"><i class="fas fa-eye"></i></div>
                        <div class="metric-info">
                            <h3>${visitasHoy.toLocaleString()}</h3>
                            <p>Visitas hoy (sesiones)</p>
                            <span class="trend up">${visitasMes > 0 ? '+' + Math.round((visitasHoy / (visitasMes/30))*100) : 0}% vs promedio</span>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon"><i class="fas fa-chart-line"></i></div>
                        <div class="metric-info">
                            <h3>${visitasMes.toLocaleString()}</h3>
                            <p>Visitas este mes</p>
                            <span class="trend up">últimos 30 días</span>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon"><i class="fas fa-star"></i></div>
                        <div class="metric-info">
                            <h3>${destacados}</h3>
                            <p>Productos destacados</p>
                            <span class="trend up">+${nuevosDestacados} este mes</span>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon"><i class="fas fa-heart"></i></div>
                        <div class="metric-info">
                            <h3>${totalFavoritos.toLocaleString()}</h3>
                            <p>Favoritos totales</p>
                            <span class="trend up">acumulados</span>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon"><i class="fab fa-whatsapp"></i></div>
                        <div class="metric-info">
                            <h3>${consultasWhatsApp}</h3>
                            <p>Consultas WhatsApp</p>
                            <span class="trend up">totales</span>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error cargando métricas:', error);
            if (metricsGrid) metricsGrid.innerHTML = '<div class="error">Error al cargar métricas</div>';
        }
    }

    // ========== GRÁFICOS ==========
    async function loadSessionsChart() {
        if (!sessionsChartCanvas) return;
        try {
            const res = await fetch(`${API_BASE}/sesiones/por-dia?dias=7`);
            let data = res.ok ? await res.json() : [
                { dia: 'Lun', total: 600 }, { dia: 'Mar', total: 450 }, { dia: 'Mié', total: 300 },
                { dia: 'Jue', total: 150 }, { dia: 'Vie', total: 420 }, { dia: 'Sáb', total: 380 }, { dia: 'Dom', total: 290 }
            ];
            if (sessionsChart) sessionsChart.destroy();
            sessionsChart = new Chart(sessionsChartCanvas, {
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
            const res = await fetch(`${API_BASE}/productos?orden=views&limite=5`);
            const data = await res.json();
            const top5 = data.data || [];
            if (topViewedChart) topViewedChart.destroy();
            topViewedChart = new Chart(topViewedChartCanvas, {
                type: 'bar',
                data: {
                    labels: top5.map(p => p.nombre.length > 15 ? p.nombre.slice(0,12)+'…' : p.nombre),
                    datasets: [{ data: top5.map(p => p.visitas), backgroundColor: '#ff9a9e', borderRadius: 12, barPercentage: 0.6 }]
                },
                options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
            });
        } catch (error) { console.error('Error en gráfico de más vistos:', error); }
    }

    async function loadFavoritesChart() {
        if (!favoritesChartCanvas) return;
        try {
            const res = await fetch(`${API_BASE}/productos?orden=favoritos&limite=5`);
            const data = await res.json();
            const topFav = data.data || [];
            if (favoritesChart) favoritesChart.destroy();
            favoritesChart = new Chart(favoritesChartCanvas, {
                type: 'bar',
                data: {
                    labels: topFav.map(p => p.nombre.length > 15 ? p.nombre.slice(0,12)+'…' : p.nombre),
                    datasets: [{ data: topFav.map(p => p.favoritos), backgroundColor: '#ffb648', borderRadius: 12, barPercentage: 0.6 }]
                },
                options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
            });
        } catch (error) { console.error('Error en gráfico de favoritos:', error); }
    }

    // ========== PRODUCTOS POPULARES ==========
    async function loadPopularProducts() {
        if (!popularListDiv) return;
        try {
            const res = await fetch(`${API_BASE}/productos?orden=views&limite=10`);
            const data = await res.json();
            const top10 = data.data || [];
            popularListDiv.innerHTML = top10.slice(0,5).map(p => `
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
                    openModal(top10);
                });
                header.appendChild(btn);
            }
        } catch (error) { console.error('Error cargando productos populares:', error); }
    }

    // ========== ACTIVIDAD RECIENTE ==========
    async function loadRecentActivity() {
        if (!activityTimelineDiv) return;
        try {
            const res = await fetch(`${API_BASE}/admin/actividades?limite=6`);
            let actividades = [];
            if (res.ok) {
                actividades = await res.json();
            } else {
                actividades = [{ texto: 'No se pudo cargar actividad', detalle: 'Intenta más tarde', tiempo: 'ahora', icono: 'fas fa-exclamation-circle' }];
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
        } catch (error) {
            console.error('Error cargando actividad:', error);
            activityTimelineDiv.innerHTML = '<div class="activity-item">No se pudo cargar la actividad reciente</div>';
        }
    }

    // ========== SIDEBAR Y LOGOUT ==========
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
            sessionStorage.removeItem('admin_data');
            window.location.href = 'login.html';
        });
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;'));
    }

    createModal();
    await loadMetrics();
    await loadSessionsChart();
    await loadTopViewedChart();
    await loadFavoritesChart();
    await loadPopularProducts();
    await loadRecentActivity();
    updateLastRefresh();

    setInterval(async () => {
        await loadMetrics();
        await loadSessionsChart();
        await loadTopViewedChart();
        await loadFavoritesChart();
        await loadPopularProducts();
        await loadRecentActivity();
        updateLastRefresh();
    }, 60000);
});