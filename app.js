/* ═══════════════════════════════════════════════════════════
   THREE.JS BACKGROUND — Particle Network Topology
   Nodes represent news sources; edges represent data flows.
   Adapts to light/dark theme automatically.
   ═══════════════════════════════════════════════════════════ */
(function initThreeBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    /* ── Setup renderer ── */
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
        -window.innerWidth / 2, window.innerWidth / 2,
        window.innerHeight / 2, -window.innerHeight / 2,
        0.1, 100
    );
    camera.position.z = 1;

    /* ── Theme detection ── */
    function isDark() {
        const ex = document.documentElement.getAttribute('data-theme');
        if (ex === 'dark')  return true;
        if (ex === 'light') return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    function getAccentHex() { return isDark() ? 0x00ff88 : 0x1a6432; }
    function getNodeOpacity()  { return isDark() ? 0.45 : 0.30; }
    function getLineOpacity()  { return isDark() ? 0.10 : 0.08; }

    /* ── Create nodes ── */
    const NODE_COUNT = 70;
    const nodes = [];
    const nodeGeo = new THREE.CircleGeometry(2.5, 8);

    for (let i = 0; i < NODE_COUNT; i++) {
        const mat = new THREE.MeshBasicMaterial({
            color: getAccentHex(),
            transparent: true,
            opacity: Math.random() * 0.3 + 0.15,
        });
        const mesh = new THREE.Mesh(nodeGeo, mat);
        mesh.position.set(
            (Math.random() - 0.5) * window.innerWidth  * 1.1,
            (Math.random() - 0.5) * window.innerHeight * 1.1,
            0
        );
        nodes.push({
            mesh,
            vx: (Math.random() - 0.5) * 0.22,
            vy: (Math.random() - 0.5) * 0.22,
            pulsePhase: Math.random() * Math.PI * 2,
            pulseSpeed: 0.005 + Math.random() * 0.012,
        });
        scene.add(mesh);
    }

    /* ── Lines between nearby nodes ── */
    const MAX_DIST = 180;
    let lineSegments = null;
    const lineMat = new THREE.LineBasicMaterial({
        color: getAccentHex(),
        transparent: true,
        opacity: getLineOpacity(),
    });

    function rebuildLines() {
        if (lineSegments) {
            scene.remove(lineSegments);
            lineSegments.geometry.dispose();
        }
        const pts = [];
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].mesh.position.x - nodes[j].mesh.position.x;
                const dy = nodes[i].mesh.position.y - nodes[j].mesh.position.y;
                if (dx * dx + dy * dy < MAX_DIST * MAX_DIST) {
                    pts.push(
                        nodes[i].mesh.position.x, nodes[i].mesh.position.y, 0,
                        nodes[j].mesh.position.x, nodes[j].mesh.position.y, 0
                    );
                }
            }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        lineSegments = new THREE.LineSegments(geo, lineMat);
        scene.add(lineSegments);
    }

    /* ── Mouse parallax ── */
    let mouse = { x: 0, y: 0 };
    document.addEventListener('mousemove', e => {
        mouse.x =  (e.clientX - window.innerWidth  / 2);
        mouse.y = -(e.clientY - window.innerHeight / 2);
    }, { passive: true });

    /* ── Animation loop ── */
    let frame = 0;
    const hw = () => window.innerWidth  / 2 + 30;
    const hh = () => window.innerHeight / 2 + 30;

    function animate() {
        requestAnimationFrame(animate);
        frame++;

        nodes.forEach(n => {
            /* Pulse opacity */
            n.pulsePhase += n.pulseSpeed;
            n.mesh.material.opacity = getNodeOpacity() * (0.55 + 0.45 * Math.sin(n.pulsePhase));

            /* Mouse repulsion */
            const dx = n.mesh.position.x - mouse.x;
            const dy = n.mesh.position.y - mouse.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 18000) {
                const d = Math.sqrt(d2);
                n.vx += (dx / d) * 0.04;
                n.vy += (dy / d) * 0.04;
            }

            /* Speed cap + damping */
            const sp = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
            if (sp > 0.7) { n.vx *= 0.92; n.vy *= 0.92; }

            n.mesh.position.x += n.vx;
            n.mesh.position.y += n.vy;

            /* Wrap around */
            const W = hw(), H = hh();
            if (n.mesh.position.x >  W) n.mesh.position.x = -W;
            if (n.mesh.position.x < -W) n.mesh.position.x =  W;
            if (n.mesh.position.y >  H) n.mesh.position.y = -H;
            if (n.mesh.position.y < -H) n.mesh.position.y =  H;
        });

        /* Rebuild lines every 3 frames */
        if (frame % 3 === 0) rebuildLines();

        /* Update colors when theme changes (every 60 frames) */
        if (frame % 60 === 0) {
            const col = getAccentHex();
            lineMat.color.setHex(col);
            lineMat.opacity = getLineOpacity();
        }

        renderer.render(scene, camera);
    }

    rebuildLines();
    animate();

    /* ── Resize ── */
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.left   = -window.innerWidth  / 2;
        camera.right  =  window.innerWidth  / 2;
        camera.top    =  window.innerHeight / 2;
        camera.bottom = -window.innerHeight / 2;
        camera.updateProjectionMatrix();
    }, { passive: true });
})();

/* ═══════════════════════════════════════════════════════════
   APP MAIN — cYHBernews
   ═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    // ─────────────────────────────────────────────────────────
    // SELECTORES ORIGINALES
    // ─────────────────────────────────────────────────────────
    const newsGrid      = document.getElementById('news-grid');
    const filterButtons = document.querySelectorAll('.ios-tab');
    const searchInput   = document.getElementById('news-search');
    const sortSelect    = document.getElementById('news-sort');
    const totalCount    = document.getElementById('total-count');
    const latestDate    = document.getElementById('latest-date');
    const sourceCount   = document.getElementById('source-count');
    const resultsLabel  = document.getElementById('results-label');
    const pager         = document.getElementById('news-pager');
    const pagerStatus   = document.getElementById('pager-status');
    const loadMoreButton = document.getElementById('load-more-news');
    const menuButton    = document.getElementById('nav-menu-button');
    const newsMenu      = document.getElementById('news-menu');

    // ─────────────────────────────────────────────────────────
    // SELECTORES NUEVOS
    // ─────────────────────────────────────────────────────────
    const themeToggleBtn = document.getElementById('theme-toggle');
    const backToTopBtn   = document.getElementById('back-to-top');
    const appToast       = document.getElementById('app-toast');

    // ─────────────────────────────────────────────────────────
    // ESTADO DE LA APP (sin cambios)
    // ─────────────────────────────────────────────────────────
    let allNews = [];
    let currentResults = [];
    const PAGE_SIZE = 12;
    const state = {
        category:     'all',
        query:        '',
        sort:         'newest',
        visibleCount: PAGE_SIZE,
    };

    // ─────────────────────────────────────────────────────────
    // MÓDULO: THEME MANAGER
    // El token en localStorage puede ser 'light', 'dark' o null
    // (null = seguir la preferencia del sistema operativo).
    // ─────────────────────────────────────────────────────────
    const THEME_KEY = 'cyhbernews-theme';
    const htmlEl    = document.documentElement;

    /**
     * Devuelve true si el tema activo en este momento es oscuro,
     * ya sea por preferencia explícita o por prefers-color-scheme.
     */
    function isDarkThemeActive() {
        const explicit = htmlEl.getAttribute('data-theme');
        if (explicit === 'dark')  return true;
        if (explicit === 'light') return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    /**
     * Actualiza el ícono del botón según el tema activo.
     * Sun  → estamos en oscuro  (pulsar irá a claro)
     * Moon → estamos en claro   (pulsar irá a oscuro)
     */
    function syncThemeIcon() {
        if (!themeToggleBtn) return;
        const iconEl = themeToggleBtn.querySelector('i');
        if (!iconEl) return;
        iconEl.setAttribute('data-lucide', isDarkThemeActive() ? 'sun' : 'moon');
        refreshIcons();
    }

    /** Alterna entre claro y oscuro y persiste la elección. */
    function cycleTheme() {
        const next = isDarkThemeActive() ? 'light' : 'dark';
        htmlEl.setAttribute('data-theme', next);
        localStorage.setItem(THEME_KEY, next);
        syncThemeIcon();
    }

    // Sincronizar ícono al cargar (el tema ya fue aplicado en <head>).
    syncThemeIcon();

    // Resinoconizar si el usuario cambia la preferencia del SO mientras
    // está en la página y no tiene tema explícito guardado.
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (!htmlEl.hasAttribute('data-theme')) syncThemeIcon();
    });

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', cycleTheme);
    }

    // ─────────────────────────────────────────────────────────
    // MÓDULO: TOAST
    // ─────────────────────────────────────────────────────────
    let toastTimeout = null;

    /**
     * Muestra una notificación breve en la parte inferior de la pantalla.
     * @param {string} message  Texto a mostrar.
     * @param {string} icon     Nombre del ícono Lucide (default: 'check').
     * @param {number} duration Milisegundos antes de ocultarse (default: 2400).
     */
    function showToast(message, icon = 'check', duration = 2400) {
        if (!appToast) return;
        clearTimeout(toastTimeout);
        appToast.innerHTML = `<i data-lucide="${icon}"></i>${escapeHTML(message)}`;
        refreshIcons();
        // Forzar reflow para que la transición se dispare siempre
        appToast.classList.remove('show');
        void appToast.offsetWidth;
        appToast.classList.add('show');
        toastTimeout = setTimeout(() => appToast.classList.remove('show'), duration);
    }

    // ─────────────────────────────────────────────────────────
    // MÓDULO: BACK TO TOP
    // ─────────────────────────────────────────────────────────
    const SCROLL_THRESHOLD = 380; // px antes de mostrar el botón

    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            const shouldShow = window.scrollY > SCROLL_THRESHOLD;
            backToTopBtn.classList.toggle('visible', shouldShow);
        }, { passive: true });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ─────────────────────────────────────────────────────────
    // MÓDULO: SHARE
    // Usa Web Share API si está disponible (iOS Safari, Chrome Android,
    // Edge). En escritorio copia el URL al portapapeles como fallback.
    // Delegamos el evento en newsGrid para cubrir cards renderizadas
    // dinámicamente sin necesidad de re-bindear listeners.
    // ─────────────────────────────────────────────────────────
    newsGrid.addEventListener('click', async (e) => {
        const btn = e.target.closest('.share-btn');
        if (!btn) return;
        // Evitar que el click navegue al enlace de la card
        e.preventDefault();
        e.stopPropagation();

        const url   = btn.dataset.url;
        const title = btn.dataset.title;

        try {
            if (navigator.share && navigator.canShare && navigator.canShare({ title, url })) {
                await navigator.share({ title, url });
                // No mostramos toast: el SO da su propio feedback.
            } else {
                await navigator.clipboard.writeText(url);
                showToast('Enlace copiado al portapapeles', 'clipboard-check');
            }
        } catch (err) {
            // AbortError = el usuario cerró el share sheet (no es un error real).
            if (err.name !== 'AbortError') {
                // Último recurso: selección manual
                showToast('No se pudo copiar el enlace', 'alert-circle', 3000);
            }
        }
    });

    // ─────────────────────────────────────────────────────────
    // HELPERS ORIGINALES (sin cambios)
    // ─────────────────────────────────────────────────────────
    function updateIOSTime() {
        const timeEl = document.getElementById('current-time');
        if (!timeEl) return;
        const now = new Date();
        timeEl.textContent =
            now.getHours().toString().padStart(2, '0') + ':' +
            now.getMinutes().toString().padStart(2, '0');
    }
    setInterval(updateIOSTime, 1000);
    updateIOSTime();

    function refreshIcons() {
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    refreshIcons();

    const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&!?';

    function scramble(targetId, finalText, onDone) {
        const el = document.getElementById(targetId);
        if (!el) return;

        const REVEAL_DELAY = 60;
        const NOISE_FRAMES = 8;

        el.innerHTML = finalText
            .split('')
            .map((ch, i) => `<span class="scramble-char" data-i="${i}">${escapeHTML(ch)}</span>`)
            .join('');

        const spans = el.querySelectorAll('.scramble-char');
        let resolved = 0;

        spans.forEach((span, i) => {
            const target = finalText[i];
            let revealed = false;

            const noiseId = setInterval(() => {
                if (!revealed) {
                    span.textContent = CHARSET[Math.floor(Math.random() * CHARSET.length)];
                }
            }, 40);

            setTimeout(() => {
                let frame = 0;
                const revealId = setInterval(() => {
                    if (frame >= NOISE_FRAMES) {
                        clearInterval(noiseId);
                        clearInterval(revealId);
                        span.textContent = target;
                        span.classList.remove('scramble-char');
                        revealed = true;
                        resolved++;
                        if (resolved === spans.length && typeof onDone === 'function') onDone();
                    } else {
                        span.textContent = CHARSET[Math.floor(Math.random() * CHARSET.length)];
                        frame++;
                    }
                }, 40);
            }, i * REVEAL_DELAY);
        });
    }

    const loaderOverlay = document.getElementById('loader-overlay');
    const loaderBar     = document.getElementById('loader-bar');
    const statusText    = document.getElementById('loader-status-text');

    const STATUS_STEPS = [
        { pct: 20,  msg: 'Connecting to feed...' },
        { pct: 45,  msg: 'Fetching articles...'  },
        { pct: 70,  msg: 'Parsing data...'       },
        { pct: 90,  msg: 'Organizing feed...'    },
        { pct: 100, msg: 'Ready.'                },
    ];

    function advanceLoader(step) {
        if (!loaderBar || !statusText || step >= STATUS_STEPS.length) return;
        loaderBar.style.width   = STATUS_STEPS[step].pct + '%';
        statusText.textContent  = STATUS_STEPS[step].msg;
    }

    const MIN_LOADER_MS = 1600;
    const loaderStart   = Date.now();

    function hideLoader() {
        if (!loaderOverlay) return;
        const elapsed   = Date.now() - loaderStart;
        const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
        setTimeout(() => {
            advanceLoader(4);
            setTimeout(() => loaderOverlay.classList.add('hide'), 450);
        }, remaining);
    }

    scramble('loader-scramble-title', 'cYHBernews');
    advanceLoader(0);
    setTimeout(() => advanceLoader(1), 400);
    setTimeout(() => advanceLoader(2), 800);
    setTimeout(() => advanceLoader(3), 1200);

    const headerTitle = document.getElementById('scramble-title');
    if (headerTitle) {
        headerTitle.textContent = 'cYHBernews';
        headerTitle.style.cursor = 'default';
    }

    // ─────────────────────────────────────────────────────────
    // CARGA Y FILTRADO (sin cambios)
    // ─────────────────────────────────────────────────────────
    async function loadNews() {
        try {
            const response = await fetch(`noticias.json?v=${Date.now()}`);
            if (!response.ok) throw new Error('Error al cargar noticias.');
            allNews = await response.json();
            allNews.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            updateOverview(allNews);
            applyFilters();
        } catch (error) {
            console.error(error);
            newsGrid.innerHTML = `<p class="error-msg">Error: No se pudieron cargar las noticias.</p>`;
        } finally {
            hideLoader();
        }
    }

    function updateOverview(news) {
        if (totalCount) totalCount.textContent = news.length.toString();
        if (latestDate) latestDate.textContent  = news[0] ? formatDate(news[0].fecha) : '-';
        if (sourceCount) {
            sourceCount.textContent = new Set(news.map(item => item.fuente).filter(Boolean)).size.toString();
        }
    }

    function applyFilters() {
        state.visibleCount = PAGE_SIZE;
        currentResults = getFilteredNews();
        renderNews();
    }

    function getFilteredNews() {
        const query    = normalizeText(state.query);
        const filtered = allNews.filter(news => {
            const matchesCategory = state.category === 'all' || news.categoria === state.category;
            const searchable      = normalizeText([
                news.titulo,
                news.resumen,
                news.fuente,
                news.categoria,
            ].join(' '));
            return matchesCategory && (!query || searchable.includes(query));
        });

        return filtered.sort((a, b) => {
            if (state.sort === 'oldest') return new Date(a.fecha) - new Date(b.fecha);
            if (state.sort === 'source') return String(a.fuente).localeCompare(String(b.fuente), 'es');
            return new Date(b.fecha) - new Date(a.fecha);
        });
    }

    function renderNews() {
        const newsToRender = currentResults.slice(0, state.visibleCount);

        if (resultsLabel) {
            const label = state.category === 'all' ? 'la actualidad' : state.category;
            resultsLabel.textContent = `${currentResults.length} noticias en ${label}`;
        }

        if (currentResults.length === 0) {
            newsGrid.innerHTML = `<p class="empty-msg">No hay noticias para estos filtros.</p>`;
            updatePager();
            return;
        }

        const [featured, ...rest] = newsToRender;
        const groupedNews = groupByDay(rest);

        newsGrid.innerHTML = `
            <section class="featured-news" aria-label="Noticia destacada">
                ${renderCard(featured, true)}
            </section>
            ${Object.entries(groupedNews).map(([day, items]) => `
                <section class="news-day-group">
                    <div class="day-heading">
                        <span>${escapeHTML(day)}</span>
                        <small>${items.length} ${items.length === 1 ? 'nota' : 'notas'}</small>
                    </div>
                    <div class="news-list">
                        ${items.map(news => renderCard(news)).join('')}
                    </div>
                </section>
            `).join('')}
        `;

        refreshIcons();
        updatePager();
    }

    function updatePager() {
        if (!pager || !pagerStatus || !loadMoreButton) return;

        const shown     = Math.min(state.visibleCount, currentResults.length);
        const remaining = Math.max(0, currentResults.length - shown);

        pager.hidden                 = currentResults.length <= PAGE_SIZE;
        pagerStatus.textContent      = `Mostrando ${shown} de ${currentResults.length}`;
        loadMoreButton.hidden        = remaining === 0;
        loadMoreButton.disabled      = remaining === 0;
        loadMoreButton.innerHTML     = `<i data-lucide="plus"></i> Cargar ${Math.min(PAGE_SIZE, remaining)} más`;
        refreshIcons();
    }

    // ─────────────────────────────────────────────────────────
    // NUEVO HELPER: TIEMPO DE LECTURA
    // Velocidad media de lectura en español: ~200 palabras/minuto.
    // ─────────────────────────────────────────────────────────
    function estimateReadingTime(text) {
        const words   = String(text || '').trim().split(/\s+/).filter(Boolean).length;
        const minutes = Math.max(1, Math.round(words / 200));
        return minutes === 1 ? '1 min' : `${minutes} min`;
    }

    // ─────────────────────────────────────────────────────────
    // RENDERIZADO DE CARDS (modificado: + share btn, + reading time)
    // ─────────────────────────────────────────────────────────
    function renderCard(news, isFeatured = false) {
        const title   = getCleanTitle(news);
        const displayTitle = isFeatured ? getPunchyTitle(title) : title;
        const summary = getCleanSummary(news);
        const readTime = estimateReadingTime(title + ' ' + summary);

        return `
            <a href="${escapeAttribute(news.enlace_original)}" target="_blank" rel="noopener noreferrer"
               class="news-card ${isFeatured ? 'is-featured' : ''}">

                ${news.url_imagen
                    ? `<img src="${escapeAttribute(news.url_imagen)}" alt="${escapeAttribute(title)}"
                           class="card-image" loading="lazy">`
                    : ''
                }

                <!--
                    NUEVO: Botón de compartir (posición absoluta sobre la card).
                    El click se gestiona por delegación en newsGrid para no
                    romper el flujo del <a> padre.
                -->
                <button class="share-btn"
                        data-url="${escapeAttribute(news.enlace_original)}"
                        data-title="${escapeAttribute(title)}"
                        aria-label="Compartir: ${escapeAttribute(title)}"
                        type="button">
                    <i data-lucide="share-2"></i>
                </button>

                <div class="card-content">
                    <div class="card-meta">
                        <span>${escapeHTML(news.categoria || 'General')}</span>
                        <span>${formatDate(news.fecha)}</span>
                    </div>
                    <h2>${escapeHTML(displayTitle)}</h2>
                    <p>${escapeHTML(summary)}</p>
                    <div class="card-footer">
                        <span>${escapeHTML(news.fuente || 'Fuente desconocida')}</span>
                        <!--
                            NUEVO: Lado derecho del footer agrupa
                            el tiempo de lectura y el CTA "Abrir".
                        -->
                        <div class="card-footer-right">
                            <span class="reading-time">
                                <i data-lucide="clock-3"></i>${escapeHTML(readTime)}
                            </span>
                            <span class="read-link">Abrir <i data-lucide="external-link"></i></span>
                        </div>
                    </div>
                </div>
            </a>
        `;
    }

    // ─────────────────────────────────────────────────────────
    // HELPERS ORIGINALES (sin cambios)
    // ─────────────────────────────────────────────────────────
    function groupByDay(news) {
        return news.reduce((groups, item) => {
            const day = formatDate(item.fecha);
            groups[day] = groups[day] || [];
            groups[day].push(item);
            return groups;
        }, {});
    }

    function getCleanTitle(news) {
        const title = String(news.titulo || 'Sin título').replace(/^Tít[uú]lo:\s*/i, '').trim();
        return title.split('\n')[0].trim().replace(/^["'“”]+|["'“”]+$/g, '');
    }

    function getPunchyTitle(title) {
        const firstSentence = String(title || '').split(/(?<=[.!?])\s+/)[0].trim();
        const headline = firstSentence.split(/\s+(con|Esta|Este)\s+/i)[0].trim() || firstSentence;
        const compact = headline.length > 82 ? `${headline.slice(0, 79).trim()}...` : headline;
        return compact.replace(/^["'“”]+|["'“”]+$/g, '');
    }

    function getCleanSummary(news) {
        const summary = String(news.resumen || '').replace(/^Res[uú]men:\s*/i, '').trim();
        if (summary) return summary;
        const titleParts = String(news.titulo || '').split('\n').slice(1).join(' ').trim();
        return titleParts || 'Resumen no disponible por ahora.';
    }

    function normalizeText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&':  '&amp;',
            '<':  '&lt;',
            '>':  '&gt;',
            '"':  '&quot;',
            "'": '&#039;',
        }[char]));
    }

    function escapeAttribute(value) {
        return escapeHTML(value).replace(/`/g, '&#096;');
    }

    function formatDate(isoString) {
        return new Date(isoString).toLocaleDateString('es-ES',
            { year: 'numeric', month: 'short', day: 'numeric' });
    }

    // ─────────────────────────────────────────────────────────
    // MENÚ (sin cambios en la lógica, se añade ⌘K más abajo)
    // ─────────────────────────────────────────────────────────
    function closeMenu() {
        if (!menuButton || !newsMenu || newsMenu.style.display === 'none') return;

        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Abrir herramientas');
        menuButton.classList.remove('active');
        newsMenu.style.display = 'none';

        const iconEl = menuButton.querySelector('i');
        if (iconEl) {
            iconEl.setAttribute('data-lucide', 'menu');
            refreshIcons();
        }
    }

    function openMenu() {
        if (!menuButton || !newsMenu) return;
        menuButton.setAttribute('aria-expanded', 'true');
        menuButton.setAttribute('aria-label', 'Cerrar herramientas');
        menuButton.classList.add('active');
        newsMenu.style.display = 'grid';

        const iconEl = menuButton.querySelector('i');
        if (iconEl) {
            iconEl.setAttribute('data-lucide', 'x');
            refreshIcons();
        }
    }

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            state.category = button.getAttribute('data-category');
            applyFilters();
            closeMenu();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', event => {
            state.query = event.target.value;
            applyFilters();
        });

        searchInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                closeMenu();
                searchInput.blur();
            }
        });

        const searchIcon = searchInput.parentElement.querySelector('i[data-lucide="search"]');
        if (searchIcon) {
            searchIcon.style.cursor = 'pointer';
            searchIcon.addEventListener('click', () => closeMenu());
        }
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', event => {
            state.sort = event.target.value;
            applyFilters();
            closeMenu();
        });
    }

    if (loadMoreButton) {
        loadMoreButton.addEventListener('click', () => {
            state.visibleCount += PAGE_SIZE;
            renderNews();
        });
    }

    if (menuButton && newsMenu) {
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (newsMenu.style.display === 'none') {
                openMenu();
            } else {
                closeMenu();
            }
        });

        document.addEventListener('click', event => {
            if (newsMenu.style.display === 'none') return;
            const isClickInsideMenu = newsMenu.contains(event.target);
            const isClickOnButton   = menuButton.contains(event.target);
            if (!isClickInsideMenu && !isClickOnButton) closeMenu();
        });
    }

    // ─────────────────────────────────────────────────────────
    // NUEVO: ATAJOS DE TECLADO GLOBALES
    //   ⌘K (Mac) / Ctrl+K (Win/Linux) → abrir búsqueda
    //   Escape                          → cerrar menú (original, unificado aquí)
    // ─────────────────────────────────────────────────────────
    document.addEventListener('keydown', event => {
        const isMac     = navigator.platform.toUpperCase().includes('MAC');
        const modKey    = isMac ? event.metaKey : event.ctrlKey;

        // Escape: cerrar menú
        if (event.key === 'Escape' && newsMenu && newsMenu.style.display !== 'none') {
            closeMenu();
            menuButton?.focus();
            return;
        }

        // ⌘K / Ctrl+K: abrir menú y enfocar búsqueda
        if (modKey && event.key === 'k') {
            // No interferir con atajos del navegador si el foco
            // está en un input que no es el de búsqueda.
            const focused = document.activeElement;
            const isInInput = focused && focused !== searchInput &&
                              (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA');
            if (isInInput) return;

            event.preventDefault();
            if (newsMenu && newsMenu.style.display === 'none') {
                openMenu();
            }
            // Pequeño delay para que el menú termine de mostrarse
            setTimeout(() => {
                searchInput?.focus();
                searchInput?.select();
            }, 60);
        }
    });

    // ─────────────────────────────────────────────────────────
    // ARRANQUE
    // ─────────────────────────────────────────────────────────
    loadNews();
});
