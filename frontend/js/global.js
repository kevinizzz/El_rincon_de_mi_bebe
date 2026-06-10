document.addEventListener('DOMContentLoaded', function() {
    const botonHamburguesa = document.querySelector('.boton_hamburguesa');
    const listaNav = document.querySelector('.lista_navegacion');
    const body = document.body;

    if (botonHamburguesa && listaNav) {
        botonHamburguesa.addEventListener('click', function(e) {
            e.stopPropagation();
            body.classList.toggle('menu-abierto');
        });

        document.addEventListener('click', function(e) {
            if (body.classList.contains('menu-abierto')) {
                if (!listaNav.contains(e.target) && !botonHamburguesa.contains(e.target)) {
                    body.classList.remove('menu-abierto');
                }
            }
        });

        listaNav.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                body.classList.remove('menu-abierto');
            }
        });
    }
});