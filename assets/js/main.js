/**
 * main.js - Inicializa todas las secciones dinamicas de index.html
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Main] DOMContentLoaded iniciado');

    initMobileMenu();
    initNavbarScroll();
    initScrollToTop();
    initVideoModal();

    // Cargar secciones segun pagina
    const page = getCurrentPage();
    console.log('[Main] Pagina detectada:', page);

    if (page === 'index') {
        console.log('[Main] Cargando secciones index...');
        await loadActividadesDestacadas();
        await loadTimeline();
        await loadComunicados();
        await loadCampanas();
        await loadTemasManual();
        await loadConfig();
        await loadEnlaces();
    } else if (page === 'campana-lista') {
        await loadAllCampanas();
        initCampanaSearchFilter();
        await loadConfig();
        await loadEnlaces();
    } else if (page === 'campana-detalle') {
        await loadCampanaData();
        await loadConfig();
        await loadEnlaces();
    } else if (page === 'manual-index') {
        await loadAllTemas();
        await loadConfig();
        await loadEnlaces();
        initSearchFilter();
    } else if (page === 'manual-tema') {
        await loadTemaContent();
        await loadConfig();
        await loadEnlaces();
    }
});

/**
 * Obtiene la pagina actual por nombre de archivo
 */
function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    const search = window.location.search;

    if (filename === 'tema.html' && path.includes('manual')) return 'manual-tema';
    if (filename === 'index.html' && path.includes('manual')) return 'manual-index';
    if (filename === 'campana.html') {
        const params = new URLSearchParams(search);
        if (params.has('id')) return 'campana-detalle';
        return 'campana-lista';
    }
    if (filename === 'recursos.html') return 'recursos';
    if (filename === 'index.html' || filename === '') return 'index';
    return 'index';
}

/**
 * Menu hamburguesa movil
 */
function initMobileMenu() {
    const menuBtn = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');

    if (!menuBtn || !mobileMenu) return;

    menuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });
}

/**
 * Navbar sombra al hacer scroll
 */
function initNavbarScroll() {
    const navbar = document.getElementById('navbar');

    if (!navbar) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 10) {
            navbar.classList.add('shadow-lg');
        } else {
            navbar.classList.remove('shadow-lg');
        }
    });
}

/**
 * Boton scroll to top
 */
function initScrollToTop() {
    const btn = document.getElementById('scroll-top');

    if (!btn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            btn.classList.remove('opacity-0', 'pointer-events-none');
        } else {
            btn.classList.add('opacity-0', 'pointer-events-none');
        }
    });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

/**
 * Carga config desde Sheets y actualiza elementos estaticos
 */
async function loadConfig() {
    try {
        const nombre = await getConfig('nombre_institucion');
        const correo = await getConfig('correo_contacto');
        const direccion = await getConfig('direccion');
        const whatsapp = await getConfig('whatsapp');
        const horario = await getConfig('horario');

        console.log('[loadConfig] Datos:', { nombre, correo, direccion, whatsapp, horario });

        // Actualizar Nombre de Institucion (Logo y Footer)
        const brandNames = document.querySelectorAll('.brand-name');
        brandNames.forEach(el => el.textContent = nombre || 'Consejo de Padres ENSM');

        // Actualizar Correo (Top Bar y Seccion Contacto)
        const correoLinks = document.querySelectorAll('.correo-link');
        correoLinks.forEach(el => {
            if (el.tagName === 'A') el.href = `mailto:${correo}`;
            el.textContent = correo;
        });

        // Actualizar Direccion
        const direccionTexts = document.querySelectorAll('.direccion-text');
        direccionTexts.forEach(el => el.textContent = direccion);

        // Actualizar Horario
        const horarioText = document.getElementById('horario-text');
        if (horarioText) horarioText.textContent = horario;

        // Actualizar WhatsApp
        const whatsappLinks = document.querySelectorAll('.whatsapp-link');
        const whatsappNums = document.querySelectorAll('.whatsapp-num');
        
        if (whatsapp) {
            const cleanWA = whatsapp.replace(/\D/g, '');
            whatsappLinks.forEach(el => el.href = `https://wa.me/${cleanWA}`);
            whatsappNums.forEach(el => el.textContent = whatsapp);
        }
    } catch (error) {
        console.error('Error cargando config:', error);
    }
}

/**
 * Carga enlaces dinamicos (redes sociales y footer)
 */
async function loadEnlaces() {
    try {
        // Cargar redes sociales
        const redes = await getEnlaces('redes');
        const socialContainer = document.getElementById('social-links');
        console.log('[loadEnlaces] Redes sociales:', redes);
        
        if (socialContainer && redes.length > 0) {
            socialContainer.innerHTML = redes.map(red => `
                <a href="${red.url}" target="_blank" class="text-blue-200 hover:text-white transition-colors" title="${red.nombre}">
                    <span class="sr-only">${red.nombre}</span>
                    ${getSocialIcon(red.nombre.toLowerCase())}
                </a>
            `).join('');
        }

        // Cargar enlaces principales (Footer)
        const enlacesPrin = await getEnlaces('principal');
        const footerLinksContainer = document.getElementById('footer-links');
        console.log('[loadEnlaces] Enlaces principales:', enlacesPrin);

        if (footerLinksContainer && enlacesPrin.length > 0) {
            footerLinksContainer.innerHTML = enlacesPrin.map(enl => `
                <li><a href="${enl.url}" class="hover:text-white transition-colors">${enl.nombre}</a></li>
            `).join('');
        }
    } catch (error) {
        console.error('Error cargando enlaces:', error);
    }
}

/**
 * Retorna el icono SVG segun la red social
 */
function getSocialIcon(name) {
    if (name.includes('facebook')) return '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>';
    if (name.includes('instagram')) return '<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>';
    if (name.includes('twitter') || name.includes(' x ')) return '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';
    if (name.includes('youtube')) return '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505a3.017 3.017 0 00-2.122 2.136C0 8.055 0 12 0 12s0 3.945.501 5.814a3.017 3.017 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.945 24 12 24 12s0-3.945-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>';
    return '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>';
}

/**
 * Carga actividades destacadas
 */
async function loadActividadesDestacadas() {
    const container = document.getElementById('actividades-container');
    if (!container) return;

    try {
        const actividades = await getActividades({ destacado: 'si' });
        // Ordenar por fecha ascendente y limitar a 4 mas proximas
        actividades.sort((a, b) => parseDate(a.fecha) - parseDate(b.fecha));
        const limited = actividades.slice(0, 4);

        if (limited.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center col-span-full">No hay actividades destacadas</p>';
            return;
        }

        container.innerHTML = limited.map(act => createActividadCard(act)).join('');

        observeCards(container.querySelectorAll('.card-animated'));
    } catch (error) {
        container.innerHTML = '<p class="text-red-500 text-center col-span-full">Error cargando actividades</p>';
    }
}

/**
 * Carga linea de tiempo
 */
async function loadTimeline() {
    const container = document.getElementById('timeline-container');
    if (!container) {
        console.error('[Timeline] Contenedor #timeline-container no encontrado');
        return;
    }

    console.log('[Timeline] Inicio de carga');

    try {
        console.log('[Timeline] Llamando getActividades...');
        const actividades = await getActividades({ soloFuturas: false });
        console.log('[Timeline] Resultado getActividades:', actividades);
        console.log('[Timeline] Llamando renderTimeline...');
        renderTimeline(actividades, 'timeline-container');
        console.log('[Timeline] renderTimeline completado');
    } catch (error) {
        console.error('[Timeline] Error:', error);
        container.innerHTML = '<p class="text-red-500 text-center">Error cargando linea de tiempo</p>';
    }
}

/**
 * Carga comunicados recientes
 */
async function loadComunicados() {
    const container = document.getElementById('comunicados-container');
    if (!container) return;

    try {
        const comunicados = await getComunicados();
        const limited = comunicados.slice(0, 3);

        if (limited.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center col-span-full">No hay comunicados</p>';
            return;
        }

        container.innerHTML = limited.map(com => createComunicadoCard(com)).join('');

        observeCards(container.querySelectorAll('.card-animated'));
    } catch (error) {
        container.innerHTML = '<p class="text-red-500 text-center col-span-full">Error cargando comunicados</p>';
    }
}

/**
 * Carga campanas activas
 */
async function loadCampanas() {
    const container = document.getElementById('campanas-container');
    if (!container) return;

    try {
        const campanas = await getCampanas();

        if (campanas.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center col-span-full">No hay campanas activas</p>';
            return;
        }

        container.innerHTML = campanas.map(camp => createCampanaCard(camp)).join('');

        observeCards(container.querySelectorAll('.card-animated'));
    } catch (error) {
        container.innerHTML = '<p class="text-red-500 text-center col-span-full">Error cargando campanas</p>';
    }
}

/**
 * Carga temas del manual
 */
async function loadTemasManual() {
    const container = document.getElementById('temas-container');
    if (!container) return;

    try {
        const temas = await getTemasManual({ visible: 'si' });
        const limited = temas.slice(0, 6);

        if (limited.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center col-span-full">No hay temas disponibles</p>';
            return;
        }

        container.innerHTML = limited.map(tema => createTemaCard(tema)).join('');

        observeCards(container.querySelectorAll('.card-animated'));
    } catch (error) {
        container.innerHTML = '<p class="text-red-500 text-center col-span-full">Error cargando temas</p>';
    }
}

/**
 * Carga todas las campañas para el listado
 */
async function loadAllCampanas() {
    const container = document.getElementById('campanas-container');
    if (!container) return;

    try {
        const campanas = await getCampanas();
        console.log('[Campana] Todas las campañas:', campanas.length);

        if (campanas.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center col-span-full">No hay campañas disponibles</p>';
            return;
        }

        window.allCampanas = campanas;
        container.innerHTML = campanas.map(camp => createCampanaCard(camp)).join('');
        observeCards(container.querySelectorAll('.card-animated'));

        // Ocultar secciones de detalle de forma segura
        const sectionsToHide = ['hero-campana', 'campana-about-section', 'videos-section', 'juegos-section', 'recursos-section', 'temas-section'];
        sectionsToHide.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
    } catch (error) {
        console.error('[Campana] Error:', error);
        container.innerHTML = '<p class="text-red-500 text-center">Error cargando campañas</p>';
    }
}

/**
 * Inicializa buscador y filtros de campañas
 */
function initCampanaSearchFilter() {
    const searchInput = document.getElementById('search-input');
    const estadoFilter = document.getElementById('estado-filter');
    const container = document.getElementById('campanas-container');

    if (!searchInput || !estadoFilter || !container) return;

    const filterCampanas = () => {
        const query = searchInput.value.toLowerCase();
        const estado = estadoFilter.value;
        console.log('[filterCampanas] query:', query, 'estado:', estado);

        const filtered = window.allCampanas.filter(camp => {
            const matchText = (camp.nombre || '').toLowerCase().includes(query) ||
                (camp.descripcion || '').toLowerCase().includes(query);
            const matchEstado = !estado || camp.estado === estado;
            return matchText && matchEstado;
        });

        console.log('[filterCampanas] resultado:', filtered.length);
        container.innerHTML = filtered.map(camp => createCampanaCard(camp)).join('');
        observeCards(container.querySelectorAll('.card-animated'));
    };

    searchInput.addEventListener('input', filterCampanas);
    estadoFilter.addEventListener('change', filterCampanas);
}

/**
 * Carga datos de una campana por ID desde URL (?id=cam-001)
 */
async function loadCampanaData() {
    const params = new URLSearchParams(window.location.search);
    const idCampana = params.get('id');

    console.log('[Campana] ID de URL:', idCampana);

    if (!idCampana) {
        showCampanaError('No se especifico ninguna campana.');
        return;
    }

    try {
        // Cargar datos de la campana
        const campana = await getCampanaById(idCampana);

        if (!campana) {
            showCampanaError('La campana "' + idCampana + '" no existe o no esta disponible.');
            return;
        }

        // Actualizar UI con datos de la campana
        updateCampanaUI(campana);

        // Ocultar modo lista, mostrar modo detalle
        const toHide = ['campana-search-section', 'campanas-grid-section'];
        const toShow = ['hero-campana', 'campana-about-section', 'videos-section', 'juegos-section', 'recursos-section'];
        
        toHide.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
        toShow.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('hidden');
        });

        // Cargar contenido en paralelo de forma segura
        await Promise.all([
            loadCampanaVideos(idCampana).catch(e => console.error('Error videos:', e)),
            loadCampanaJuegos(idCampana).catch(e => console.error('Error juegos:', e)),
            loadCampanaRecursos(idCampana).catch(e => console.error('Error recursos:', e)),
            loadCampanaNavigation(idCampana).catch(e => console.error('Error nav:', e))
        ]);
    } catch (error) {
        console.error('[Campana] Error general:', error);
        showCampanaError('Error al cargar la campana. Intenta de nuevo.');
    }
}

/**
 * Muestra mensaje de error amigable
 */
function showCampanaError(mensaje) {
    const heroTitulo = document.getElementById('hero-titulo');
    const heroDesc = document.getElementById('hero-descripcion');
    const heroBadge = document.getElementById('hero-badge');
    const campanaAbout = document.querySelector('.bg-light');
    const allSections = document.querySelectorAll('section');

    if (heroTitulo) heroTitulo.textContent = 'Campana no encontrada';
    if (heroBadge) heroBadge.textContent = 'Error';
    if (heroDesc) heroDesc.innerHTML = mensaje + '<br><a href="index.html" class="btn-primary mt-4 inline-block">Volver al inicio</a>';

    // Asegurar que el hero sea visible para mostrar el error
    const heroSection = document.getElementById('hero-campana');
    if (heroSection) heroSection.classList.remove('hidden');

    // Ocultar demas secciones
    allSections.forEach(section => {
        if (!section.classList.contains('hero') && !section.classList.contains('footer') && !section.classList.contains('top-bar') && !section.classList.contains('navbar')) {
            section.style.display = 'none';
        }
    });
}

/**
 * Actualiza elementos UI de la campana con datos del Sheets
 */
function updateCampanaUI(campana) {
    console.log('[Campana] updateCampanaUI:', campana);

    // Badge superior
    const heroBadge = document.getElementById('hero-badge');
    if (heroBadge) heroBadge.textContent = campana.subtitulo || 'Campana';

    // Titulo principal
    const heroTitulo = document.getElementById('hero-titulo');
    if (heroTitulo) heroTitulo.textContent = campana.nombre || 'Campana sin nombre';


    // Descripcion about
    const aboutText = document.getElementById('campana-about-text');
    if (aboutText) aboutText.textContent = campana.descripcion || campana.subtitulo || '';

    // Titulo de about
    const aboutTitle = document.getElementById('campana-about-title');
    if (aboutTitle) aboutTitle.textContent = 'Sobre esta campana';

    // Imagen de fondo del hero si existe
    const hero = document.getElementById('hero-campana');
    if (hero && campana.imagen_url) {
        hero.style.backgroundImage = `url(${campana.imagen_url})`;
        hero.style.backgroundSize = 'cover';
        hero.style.backgroundPosition = 'center';
    }

    // Actualizar titulo de pagina
    document.title = `${campana.nombre || 'Campana'} - Consejo de Padres`;

    // Meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = campana.descripcion || '';

    // Nav link NO cambiar - debe seguir diciendo "Campañas" para volver al listado
}

/**
 * Carga videos de una campana especifica
 */
async function loadCampanaVideos(idCampana) {
    const container = document.getElementById('videos-container');
    if (!container) return;

    try {
        const videos = await getVideosCampana(idCampana);
        console.log('[Campana] Videos cargados:', videos.length);

        if (videos.length === 0) {
            container.innerHTML = createPlaceholder('videos');
            return;
        }

        // Mostrar boton solo si hay videos
        const btn = document.getElementById('btn-videos');
        if (btn) btn.classList.remove('hidden');

        container.innerHTML = videos.map(vid => createVideoCard(vid)).join('');
        initVideoModal();
    } catch (error) {
        console.error('[Campana] Error videos:', error);
        container.innerHTML = '<p class="text-red-500">Error cargando videos</p>';
    }
}

/**
 * Carga juegos de una campana especifica
 */
async function loadCampanaJuegos(idCampana) {
    const container = document.getElementById('juegos-container');
    if (!container) return;

    try {
        const juegos = await getJuegosCampana(idCampana);
        console.log('[Campana] Juegos cargados:', juegos.length);

        if (juegos.length === 0) {
            container.innerHTML = createPlaceholder('juegos');
            return;
        }

        // Mostrar boton solo si hay juegos
        const btn = document.getElementById('btn-juegos');
        if (btn) btn.classList.remove('hidden');

        container.innerHTML = juegos.map(juego => createJuegoCard(juego)).join('');
    } catch (error) {
        console.error('[Campana] Error juegos:', error);
        container.innerHTML = '<p class="text-red-500">Error cargando juegos</p>';
    }
}

/**
 * Carga recursos de una campana especifica
 */
async function loadCampanaRecursos(idCampana) {
    const container = document.getElementById('recursos-container');
    if (!container) return;

    try {
        const recursos = await getRecursosCampana(idCampana);
        console.log('[Campana] Recursos cargados:', recursos.length);

        if (recursos.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No hay recursos disponibles para esta campana.</p>';
            return;
        }

        // Mostrar boton solo si hay recursos
        const btn = document.getElementById('btn-recursos');
        if (btn) btn.classList.remove('hidden');

        container.innerHTML = recursos.map(rec => createRecursoCard(rec)).join('');
    } catch (error) {
        console.error('[Campana] Error recursos:', error);
        container.innerHTML = '<p class="text-red-500">Error cargando recursos</p>';
    }
}


/**
 * Carga todos los temas para manual/index.html
 */
async function loadAllTemas() {
    const container = document.getElementById('all-temas-container');
    if (!container) return;

    try {
        const temas = await getTemasManual({ visible: 'si' });

        if (temas.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center col-span-full">No hay temas disponibles</p>';
            return;
        }

        window.allTemas = temas; // Guardar para filtro
        populateCategoryFilter(temas);
        container.innerHTML = temas.map(tema => createTemaCard(tema, true)).join('');

        observeCards(container.querySelectorAll('.card-animated'));
    } catch (error) {
        container.innerHTML = '<p class="text-red-500 text-center">Error cargando temas</p>';
    }
}

/**
 * Popula el filtro de categorías dinámicamente
 */
function populateCategoryFilter(temas) {
    const filter = document.getElementById('category-filter');
    if (!filter) return;

    // Obtener categorías únicas
    const categories = [...new Set(temas.map(t => t.categoria))].filter(Boolean).sort();
    console.log('[populateCategoryFilter] Categorias detectadas:', categories);

    // Guardar la opción por defecto ("Todas")
    const firstOption = filter.options[0];
    filter.innerHTML = '';
    filter.appendChild(firstOption);

    // Agregar las nuevas opciones detectadas
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        // Capitalizar primera letra para mostrar en el dropdown
        option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        filter.appendChild(option);
    });
}

/**
 * Inicializa buscador y filtros
 */
function initSearchFilter() {
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const container = document.getElementById('all-temas-container');

    if (!searchInput || !categoryFilter || !container) return;

    const filterTemas = () => {
        const query = searchInput.value.toLowerCase();
        const category = categoryFilter.value;
        console.log('[filterTemas] query:', query, 'category:', category);
        console.log('[filterTemas] allTemas exists:', !!window.allTemas, 'length:', window.allTemas ? window.allTemas.length : 0);

        const filtered = window.allTemas.filter(tema => {
            const matchText = tema.titulo.toLowerCase().includes(query) ||
                tema.resumen.toLowerCase().includes(query);
            const matchCategory = !category || tema.categoria === category;
            return matchText && matchCategory;
        });

        console.log('[filterTemas] filtered count:', filtered.length);
        container.innerHTML = filtered.map(tema => createTemaCard(tema, true)).join('');
        observeCards(container.querySelectorAll('.card-animated'));
    };

    searchInput.addEventListener('input', filterTemas);
    categoryFilter.addEventListener('change', filterTemas);
}

/**
 * Carga contenido de un tema individual
 */
async function loadTemaContent() {
    const container = document.getElementById('tema-content');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');

    if (!slug) {
        container.innerHTML = '<p class="text-red-500">Tema no especificado</p>';
        return;
    }

    try {
        const tema = await getTemaBySlug(slug);

        if (!tema) {
            container.innerHTML = '<p class="text-red-500">Tema no encontrado</p>';
            return;
        }

        // Actualizar titulo y meta
        document.title = `${tema.titulo} - Manual de Convivencia`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.content = tema.resumen;

        // Actualizar Hero y Titulos
        const heroBadge = document.getElementById('tema-categoria-badge');
        const heroTitulo = document.getElementById('tema-titulo-main');
        const heroResumen = document.getElementById('tema-resumen-main');
        const heroSection = document.getElementById('hero-tema');
        const heroOverlay = document.getElementById('hero-overlay');

        if (heroBadge) heroBadge.textContent = tema.categoria;
        if (heroTitulo) heroTitulo.textContent = tema.titulo;
        if (heroResumen) heroResumen.textContent = tema.resumen;

        // Imagen de fondo si existe
        if (heroSection && tema.imagen_url) {
            heroSection.style.backgroundImage = `url(${tema.imagen_url})`;
            heroSection.style.backgroundSize = 'cover';
            heroSection.style.backgroundPosition = 'center';
            if (heroOverlay) heroOverlay.classList.remove('hidden');
        } else if (heroSection) {
            heroSection.style.backgroundImage = 'none';
            if (heroOverlay) heroOverlay.classList.add('hidden');
        }

        // Cargar bloques
        const bloques = await getBloquesManual(tema.id);

        if (bloques.length === 0) {
            container.innerHTML = headerHtml + '<p class="text-gray-500 italic">Contenido en construccion</p>';
            return;
        }

        const bloquesHtml = bloques.map(bloque => renderBloque(bloque)).join('');
        container.innerHTML = bloquesHtml;

        // Inicializar acordeones
        initAccordions();
    } catch (error) {
        container.innerHTML = '<p class="text-red-500">Error cargando contenido</p>';
    }
}

/**
 * Renderiza un bloque segun su tipo
 */
function renderBloque(bloque) {
    switch (bloque.tipo_bloque) {
        case 'intro':
            return `<div class="bloque-intro"><p>${bloque.contenido}</p></div>`;

        case 'lista':
            return `<div class="bloque-lista">
                <h3>${bloque.titulo_bloque || ''}</h3>
                <ul>${formatListContent(bloque.contenido)}</ul>
            </div>`;

        case 'pasos':
            return `<div class="bloque-pasos">
                <h3>${bloque.titulo_bloque || ''}</h3>
                <ol class="steps-list">${formatListContent(bloque.contenido)}</ol>
            </div>`;

        case 'faq':
            return `<div class="bloque-faq">
                <div class="faq-item">
                    <button class="faq-question">${bloque.titulo_bloque}</button>
                    <div class="faq-answer">${bloque.contenido}</div>
                </div>
            </div>`;

        case 'alerta':
            return `<div class="bloque-alerta">
                <strong>${bloque.titulo_bloque || 'Importante'}</strong>
                <p>${bloque.contenido}</p>
            </div>`;

        case 'cita':
            return `<blockquote class="bloque-cita">
                <p>${bloque.contenido}</p>
                ${bloque.titulo_bloque ? `<cite>${bloque.titulo_bloque}</cite>` : ''}
            </blockquote>`;

        case 'recurso':
            return `<div class="bloque-recurso">
                <h4>${bloque.titulo_bloque || 'Recurso'}</h4>
                <p>${bloque.contenido}</p>
            </div>`;

        default:
            return `<div class="bloque-default"><p>${bloque.contenido}</p></div>`;
    }
}

/**
 * Formatea contenido de lista
 */
function formatListContent(content) {
    if (!content) return '';
    const items = content.split('\n').filter(item => item.trim());
    return items.map(item => `<li>${item.trim()}</li>`).join('');
}

/**
 * Inicializa acordeones FAQ
 */
function initAccordions() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');

        if (!question || !answer) return;

        question.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');
            faqItems.forEach(i => i.classList.remove('open'));
            if (!isOpen) item.classList.add('open');
        });
    });
}

// ==================== HELPERS ====================

/**
 * Crea HTML de tarjeta de actividad
 */
function createActividadCard(act) {
    return `
        <div class="card-animated bg-white rounded-xl shadow-md p-6 border-l-4 border-primary">
            <div class="text-sm text-gray-500 mb-2">${formatDate(act.fecha)}</div>
            <span class="inline-block px-2 py-1 text-xs rounded bg-green-100 text-green-800 mb-3">${act.periodo || ''}</span>
            <h3 class="text-lg font-semibold text-gray-800 mb-2">${act.titulo}</h3>
            <p class="text-gray-600 text-sm mb-3">${act.descripcion || ''}</p>
            ${act.responsables ? `<p class="text-xs text-gray-500"><strong>Responsable:</strong> ${act.responsables}</p>` : ''}
        </div>
    `;
}

/**
 * Crea HTML de tarjeta de comunicado
 */
function createComunicadoCard(com) {
    const isDestacado = com.destacado === 'si';
    const cardClass = isDestacado ? 'bg-amber-50 border-l-4 border-amber-400' : 'bg-white';
    
    // Si la carta entera es un enlace, el hover de la imagen ya no necesita el "group" en la imagen,
    // usamos "group" en la carta principal para animar elementos internos.
    const imageHtml = com.miniatura_url ? `
        <div class="w-full h-48 bg-gray-50 rounded-lg mb-4 flex items-center justify-center overflow-hidden border border-gray-100 relative">
            <img src="${com.miniatura_url}" alt="${com.titulo}" class="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300">
        </div>
    ` : '';

    const Tag = com.pdf_url ? 'a' : 'div';
    const hrefAttr = com.pdf_url ? `href="${com.pdf_url}" target="_blank" title="Abrir documento"` : '';
    const hoverClass = com.pdf_url ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all group block' : 'group';

    const actionText = com.pdf_url ? `
        <div class="mt-4 flex items-center text-primary font-medium text-sm group-hover:text-blue-700 transition-colors">
            <span>Abrir comunicado</span>
            <svg class="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </div>
    ` : '';

    return `
        <${Tag} ${hrefAttr} class="card-animated ${cardClass} rounded-xl shadow-md p-6 ${hoverClass}">
            <div class="text-sm text-gray-500 mb-2">${formatDate(com.fecha)}</div>
            ${isDestacado ? '<span class="inline-block px-2 py-1 text-xs rounded bg-amber-200 text-amber-800 mb-2">Destacado</span>' : ''}
            <h3 class="text-lg font-semibold text-gray-800 mb-2 group-hover:text-primary transition-colors">${com.titulo}</h3>
            ${imageHtml}
            <p class="text-gray-600 text-sm">${com.resumen || ''}</p>
            ${actionText}
        </${Tag}>
    `;
}


/**
 * Crea HTML de tarjeta de campana
 */
function createCampanaCard(camp) {
    return `
        <div class="card-animated bg-white rounded-xl shadow-md overflow-hidden">
            ${camp.imagen_url ? `<img src="${camp.imagen_url}" alt="${camp.nombre}" class="w-full aspect-video object-cover cursor-pointer hover:opacity-90 transition-opacity" data-full-src="${camp.imagen_url}" title="Click para ampliar">` : ''}
            <div class="p-6">
                <h3 class="text-xl font-bold text-gray-800 mb-2">${camp.nombre}</h3>
                <p class="text-sm text-primary font-medium mb-2">${camp.subtitulo || ''}</p>
                <p class="text-gray-600 text-sm mb-4">${camp.descripcion || ''}</p>
                <a href="${camp.enlace || `campana.html?id=${camp.id}`}" class="btn-primary text-sm">Ver mas</a>
            </div>
        </div>
    `;
}

/**
 * Crea HTML de tarjeta de tema
 */
function createTemaCard(tema, linkToTema = false) {
    const href = linkToTema ? `tema.html?slug=${tema.slug}` : `manual/tema.html?slug=${tema.slug}`;
    const categoryLabels = {
        'convivencia': 'bg-red-100 text-red-800',
        'participacion': 'bg-blue-100 text-blue-800',
        'familias': 'bg-purple-100 text-purple-800',
        'compromiso': 'bg-amber-100 text-amber-800'
    };
    const catClass = categoryLabels[tema.categoria] || 'bg-gray-100 text-gray-800';

    return `
        <div class="card-animated bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <span class="inline-block px-2 py-1 text-xs rounded ${catClass} mb-3">${tema.categoria}</span>
            <h3 class="text-lg font-semibold text-gray-800 mb-2">${tema.titulo}</h3>
            <p class="text-gray-600 text-sm mb-4">${tema.resumen || ''}</p>
            <a href="${href}" class="btn-secondary text-sm">Ver tema</a>
        </div>
    `;
}

/**
 * Crea HTML de tarjeta de video
 */
function createVideoCard(vid) {
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(vid.video_url || '');
    let mediaHtml = '';

    if (isImage) {
        // Imagen: abre en lightbox
        mediaHtml = `
            <div class="w-full h-48 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100 relative group">
                <img src="${vid.miniatura_url || vid.video_url}" alt="${vid.titulo}"
                    class="w-full h-full object-contain p-2 cursor-pointer group-hover:scale-105 transition-transform duration-300"
                    data-full-src="${vid.video_url}">
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none"></div>
            </div>
        `;
    } else if (vid.video_url && vid.video_url.includes('youtube')) {
        mediaHtml = `
            <div class="video-container relative w-full h-48 bg-black rounded-lg overflow-hidden group" data-video-url="${vid.video_url}">
                <img src="${vid.miniatura_url || 'https://img.youtube.com/vi/' + vid.video_url.split('v=')[1] + '/hqdefault.jpg'}" alt="${vid.titulo}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer">
                <button class="play-btn absolute inset-0 flex items-center justify-center group-hover:scale-110 transition-transform duration-300" data-video-url="${vid.video_url}">
                    <svg class="w-16 h-16 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </button>
            </div>
        `;
    } else if (vid.video_url && vid.video_url.includes('cloudinary')) {
        mediaHtml = `
            <div class="video-wrapper relative w-full h-48 bg-black rounded-lg overflow-hidden group" data-video-url="${vid.video_url}" data-poster="${vid.miniatura_url || ''}">
                <img src="${vid.miniatura_url || ''}" alt="${vid.titulo}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer">
                <button class="play-btn absolute inset-0 flex items-center justify-center group-hover:scale-110 transition-transform duration-300" data-video-url="${vid.video_url}" data-poster="${vid.miniatura_url || ''}">
                    <svg class="w-16 h-16 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </button>
            </div>
        `;
    } else if (vid.video_url) {
        mediaHtml = `
            <video controls class="w-full rounded-lg" poster="${vid.miniatura_url || ''}">
                <source src="${vid.video_url}" type="video/mp4">
            </video>
        `;
    }

    return `
        <div class="bg-white rounded-xl shadow-md p-6">
            ${mediaHtml}
            <div class="mt-4">
                <h4 class="font-semibold text-gray-800">${vid.titulo}</h4>
                <p class="text-sm text-gray-600">${vid.descripcion || ''}</p>
            </div>
        </div>
    `;
}

/**
 * Inicializa modal de video
 */
function initVideoModal() {
    const playBtns = document.querySelectorAll('.play-btn');

    playBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const videoUrl = btn.dataset.videoUrl;
            const poster = btn.dataset.poster || '';
            openVideoModal(videoUrl, poster);
        });
    });

    // Lightbox para imagenes
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');

    if (lightbox && lightboxImg) {
        // Usar delegacion de eventos para manejar imagenes dinamicas
        document.addEventListener('click', (e) => {
            const img = e.target.closest('img[data-full-src]');
            if (img) {
                console.log('[Lightbox] Abriendo imagen:', img.dataset.fullSrc);
                lightboxImg.src = img.dataset.fullSrc;
                lightbox.classList.remove('hidden');
                lightbox.classList.add('flex');
                document.body.style.overflow = 'hidden'; // Evitar scroll
            }
        });

        lightboxClose.addEventListener('click', () => {
            lightbox.classList.add('hidden');
            lightbox.classList.remove('flex');
            lightboxImg.src = '';
            document.body.style.overflow = '';
        });

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                lightbox.classList.add('hidden');
                lightbox.classList.remove('flex');
                lightboxImg.src = '';
                document.body.style.overflow = '';
            }
        });
    }
}

/**
 * Abre modal con video
 */
function openVideoModal(videoUrl, poster) {
    // Crear modal si no existe
    let modal = document.getElementById('video-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'video-modal';
        modal.className = 'fixed inset-0 bg-black/90 z-[100] flex items-center justify-center hidden';
        modal.innerHTML = `
            <button id="close-video-modal" class="absolute top-4 right-4 text-white hover:text-gray-300 z-10">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
            <div class="video-modal-content max-w-4xl w-full mx-4"></div>
        `;
        document.body.appendChild(modal);

        document.getElementById('close-video-modal').addEventListener('click', closeVideoModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeVideoModal();
        });
    }

    const modalContent = modal.querySelector('.video-modal-content');

    if (videoUrl.includes('youtube')) {
        const videoId = videoUrl.split('v=')[1];
        modalContent.innerHTML = `
            <div class="video-container relative" style="padding-top: 56.25%;">
                <iframe class="absolute inset-0 w-full h-full" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allowfullscreen allow="autoplay"></iframe>
            </div>
        `;
    } else {
        modalContent.innerHTML = `
            <video controls class="w-full rounded-lg" autoplay>
                <source src="${videoUrl}" type="video/mp4">
            </video>
        `;
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

/**
 * Cierra modal de video
 */
function closeVideoModal() {
    const modal = document.getElementById('video-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.querySelector('.video-modal-content').innerHTML = '';
        document.body.style.overflow = '';
    }
}

/**
 * Crea HTML de tarjeta de juego
 */
function createJuegoCard(juego) {
    return `
        <div class="bg-white rounded-xl shadow-md p-6 text-center">
            <div class="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
                <img src="assets/img/rana-juego.png" alt="Juego" class="w-full h-full object-cover">
            </div>
            <h4 class="font-semibold text-gray-800 mb-2">${juego.titulo}</h4>
            <p class="text-sm text-gray-600 mb-4">${juego.descripcion || ''}</p>
            ${juego.juego_url ?
            `<a href="${juego.juego_url}" target="_blank" class="btn-primary">Abrir juego</a>` :
            '<span class="text-gray-400">Proximamente</span>'
        }
        </div>
    `;
}

/**
 * Crea HTML de tarjeta de recurso
 */
function createRecursoCard(rec) {
    const iconMap = {
        'pdf': '📄',
        'enlace': '🔗',
        'documento': '📝',
        'video': '🎬'
    };

    return `
        <div class="bg-white rounded-lg shadow-sm p-4 flex items-center gap-4">
            <span class="text-2xl">${iconMap[rec.tipo] || '📁'}</span>
            <div class="flex-1">
                <h4 class="font-medium text-gray-800">${rec.titulo}</h4>
                <p class="text-sm text-gray-600">${rec.descripcion || ''}</p>
            </div>
            ${rec.url ? `<a href="${rec.url}" target="_blank" class="btn-secondary text-sm">Ver</a>` : ''}
        </div>
    `;
}

/**
 * Crea placeholder para secciones vacias
 */
function createPlaceholder(tipo) {
    const content = {
        'videos': {
            'icon': '🎬',
            'title': 'Videos proximamente',
            'text': 'Estamos preparando contenido educativo en video.'
        },
        'juegos': {
            'icon': '🎮',
            'title': 'Juegos proximamente',
            'text': 'Actividades interactivas para aprender jugando.'
        }
    };

    const c = content[tipo] || { icon: '📁', title: 'Proximamente', text: '' };

    return `
        <div class="placeholder-card bg-gray-50 rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
            <div class="text-5xl mb-4">${c.icon}</div>
            <h4 class="text-lg font-semibold text-gray-700 mb-2">${c.title}</h4>
            <p class="text-gray-500">${c.text}</p>
        </div>
    `;
}

/**
 * Observa tarjetas para animacion
 */
function observeCards(cards) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    cards.forEach(card => observer.observe(card));
}

/**
 * Carga navegacion entre campanas (Anterior/Siguiente)
 */
async function loadCampanaNavigation(currentId) {
    const prevContainer = document.getElementById('prev-campana-link');
    const nextContainer = document.getElementById('next-campana-link');
    const navSection = document.getElementById('campana-navigation');

    if (!prevContainer || !nextContainer || !navSection) return;

    try {
        const allCampanas = await getCampanas();
        const currentIndex = allCampanas.findIndex(c => c.id === currentId);

        if (currentIndex === -1) return;

        let hasNavigation = false;

        // Campana Anterior
        if (currentIndex > 0) {
            const prev = allCampanas[currentIndex - 1];
            prevContainer.innerHTML = `
                <a href="campana.html?id=${prev.id}" class="group flex items-center gap-3 text-left">
                    <div class="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                    </div>
                    <div>
                        <span class="text-xs text-gray-500 uppercase tracking-wider">Anterior</span>
                        <div class="font-semibold text-gray-800 line-clamp-1">${prev.nombre}</div>
                    </div>
                </a>
            `;
            hasNavigation = true;
        } else {
            prevContainer.innerHTML = '';
        }

        // Campana Siguiente
        if (currentIndex < allCampanas.length - 1) {
            const next = allCampanas[currentIndex + 1];
            nextContainer.innerHTML = `
                <a href="campana.html?id=${next.id}" class="group flex items-center gap-3 text-right justify-end">
                    <div>
                        <span class="text-xs text-gray-500 uppercase tracking-wider">Siguiente</span>
                        <div class="font-semibold text-gray-800 line-clamp-1">${next.nombre}</div>
                    </div>
                    <div class="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </div>
                </a>
            `;
            hasNavigation = true;
        } else {
            nextContainer.innerHTML = '';
        }

        if (hasNavigation) {
            navSection.classList.remove('hidden');
        }
    } catch (error) {
        console.error('[Navigation] Error:', error);
    }
}
