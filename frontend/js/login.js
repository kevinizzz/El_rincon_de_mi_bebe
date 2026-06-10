document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        alert('Por favor, ingresa usuario y contraseña');
        return;
    }

    // Aquí puedes agregar validación real contra el backend si lo deseas
    // Por ahora, solo guarda la sesión y redirige (demo)
    sessionStorage.setItem('admin_logged', 'true');
    window.location.href = 'admin_dashboard.html';
});