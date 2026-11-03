/* =========================================================
   FRECUENCIA CREATIVA · Index.js
   1. Menú móvil
   2. Enlace activo según la sección visible
   3. Escenas: scroll automático infinito
   ========================================================= */
(() => {
    'use strict';

    /* ---------------------------------------------------------
       1. MENÚ MÓVIL
    --------------------------------------------------------- */
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.getElementById('menu-principal');

    if (toggle && menu) {
        const cerrarMenu = () => {
            menu.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-label', 'Abrir menú');
        };

        toggle.addEventListener('click', () => {
            const abierto = menu.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', String(abierto));
            toggle.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
        });

        menu.addEventListener('click', (e) => {
            if (e.target.closest('a')) cerrarMenu();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') cerrarMenu();
        });
    }

    /* ---------------------------------------------------------
       2. ENLACE ACTIVO DEL MENÚ
    --------------------------------------------------------- */
    const enlaces = Array.from(document.querySelectorAll('.nav-menu a[href^="#"]'));

    if (enlaces.length && 'IntersectionObserver' in window) {
        const porId = new Map(enlaces.map((a) => [a.getAttribute('href').slice(1), a]));

        const observador = new IntersectionObserver((entradas) => {
            entradas.forEach((entrada) => {
                if (!entrada.isIntersecting) return;
                enlaces.forEach((a) => a.classList.remove('is-active'));
                const activo = porId.get(entrada.target.id);
                if (activo) activo.classList.add('is-active');
            });
        }, { rootMargin: '-45% 0px -50% 0px' });

        porId.forEach((_, id) => {
            const seccion = document.getElementById(id);
            if (seccion) observador.observe(seccion);
        });
    }

    /* ---------------------------------------------------------
       3. ESCENAS · SCROLL AUTOMÁTICO INFINITO
       - Se duplican las imágenes (antes y después) para que el
         bucle no tenga cortes en ningún sentido.
       - Se pausa al pasar el mouse, al enfocar con teclado, al
         arrastrar o al tocar; reanuda solo a los 2,5 s.
       - Con "reducir movimiento" activado en el sistema, la
         galería queda manual (sin animación automática).
    --------------------------------------------------------- */
    const galeria = document.querySelector('.escenas-galeria');
    if (!galeria) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const VELOCIDAD = 45;        // píxeles por segundo
    const REANUDAR_MS = 2500;    // espera tras tocar / usar la rueda

    // Triplicar el contenido: [copia][originales][copia]
    const originales = Array.from(galeria.children);
    const crearCopias = () => originales.map((img) => {
        const copia = img.cloneNode(true);
        copia.alt = '';
        copia.setAttribute('aria-hidden', 'true');
        return copia;
    });
    galeria.prepend(...crearCopias());
    galeria.append(...crearCopias());

    // Estado
    let listo = false;
    let visible = true;
    let sobre = false;
    let enfocado = false;
    let arrastrando = false;
    let tocando = false;
    let reanudarEn = 0;
    let pos = 0;
    let ultimo = performance.now();
    let inicioX = 0;
    let inicioScroll = 0;

    const anchoBloque = () => galeria.scrollWidth / 3;
    const pausarUnRato = () => { reanudarEn = performance.now() + REANUDAR_MS; };

    function cuadro(t) {
        const dt = Math.min(t - ultimo, 50);
        ultimo = t;

        const bloque = anchoBloque();

        if (visible && bloque > galeria.clientWidth) {
            const pausado = sobre || enfocado || arrastrando || tocando || t < reanudarEn;

            if (pausado) {
                pos = galeria.scrollLeft;          // seguir a la persona
            } else {
                pos += VELOCIDAD * dt / 1000;      // avance automático
                galeria.scrollLeft = pos;
            }

            // Reubicar sin que se note para mantener el bucle infinito
            let ajuste = 0;
            if (pos >= bloque * 2) ajuste = -bloque;
            else if (pos <= 0) ajuste = bloque;

            if (ajuste) {
                pos += ajuste;
                galeria.scrollLeft = pos;
                inicioScroll += ajuste;            // mantiene el arrastre coherente
            }
        }

        requestAnimationFrame(cuadro);
    }

    function iniciar() {
        pos = anchoBloque();                       // empezar en el bloque central
        galeria.scrollLeft = pos;
        listo = true;
        ultimo = performance.now();
        requestAnimationFrame(cuadro);
    }

    // Mouse: pausa al pasar por encima
    galeria.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') sobre = true; });
    galeria.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') sobre = false; });

    // Mouse: arrastrar para explorar
    galeria.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        arrastrando = true;
        inicioX = e.clientX;
        inicioScroll = galeria.scrollLeft;
        galeria.setPointerCapture(e.pointerId);
        galeria.classList.add('is-dragging');
    });

    galeria.addEventListener('pointermove', (e) => {
        if (!arrastrando) return;
        galeria.scrollLeft = inicioScroll - (e.clientX - inicioX);
    });

    const soltar = () => {
        if (!arrastrando) return;
        arrastrando = false;
        galeria.classList.remove('is-dragging');
    };
    galeria.addEventListener('pointerup', soltar);
    galeria.addEventListener('pointercancel', soltar);

    // Táctil y rueda / trackpad
    galeria.addEventListener('touchstart', () => { tocando = true; }, { passive: true });
    galeria.addEventListener('touchend', () => { tocando = false; pausarUnRato(); }, { passive: true });
    galeria.addEventListener('touchcancel', () => { tocando = false; pausarUnRato(); }, { passive: true });
    galeria.addEventListener('wheel', pausarUnRato, { passive: true });

    // Teclado: solo pausa si el foco es visible (no al hacer clic con el mouse)
    galeria.addEventListener('focusin', () => { enfocado = galeria.matches(':focus-visible'); });
    galeria.addEventListener('focusout', () => { enfocado = false; });

    // No animar cuando la galería no está en pantalla
    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entradas) => {
            visible = entradas[0].isIntersecting;
        }).observe(galeria);
    }

    // Esperar a que carguen las imágenes para medir bien el ancho
    if (document.readyState === 'complete') iniciar();
    else window.addEventListener('load', iniciar, { once: true });
})();
