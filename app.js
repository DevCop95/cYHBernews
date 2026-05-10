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
        themeToggleBtn.innerHTML = `<i data-lucide="${isDarkThemeActive() ? 'sun' : 'moon'}"></i>`;
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
        { pct: 20,  msg: 'Conectando...' },
        { pct: 45,  msg: 'Obteniendo noticias...'  },
        { pct: 70,  msg: 'Procesando...'       },
        { pct: 90,  msg: 'Organizando...'    },
        { pct: 100, msg: 'Listo.'                },
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
            setTimeout(() => {
                loaderOverlay.classList.add('hide');
            }, 450);
        }, remaining);
    }

    scramble('loader-scramble-title', 'cYHBernews');
    advanceLoader(0);
    setTimeout(() => advanceLoader(1), 400);
    setTimeout(() => advanceLoader(2), 800);
    setTimeout(() => advanceLoader(3), 1200);

    const headerTitle = document.getElementById('scramble-title');
    if (headerTitle) {
        headerTitle.style.cursor = 'default';
    }

    // ─────────────────────────────────────────────────────────
    // CARGA Y FILTRADO (sin cambios)
    // ─────────────────────────────────────────────────────────
    async function loadNews() {
        try {
            const response = await fetch(`noticias.json?v=${Date.now()}`);
            if (!response.ok) throw new Error('Error al cargar noticias.');
            const data = await response.json();
            
            // Filtrar noticias que no tengan resumen globalmente
            allNews = data.filter(news => news.resumen && news.resumen.trim() !== "");
            
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

        // Debug: verificar fuente
        if (!news.fuente) {
            console.warn('News sin fuente:', news.id, news.titulo);
        }

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
                        <div class="card-footer-left">
                            <span class="reading-time">
                                <i data-lucide="clock-3"></i>${escapeHTML(readTime)}
                            </span>
                            <span class="read-link">Abrir <i data-lucide="external-link"></i></span>
                        </div>
                        <span class="card-source">${escapeHTML(news.fuente || 'Fuente desconocida')}</span>
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
    // Toggle atómico simple
    if (menuButton && newsMenu) {
        menuButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isShowing = newsMenu.classList.toggle('show');
            menuButton.classList.toggle('active', isShowing);
            menuButton.setAttribute('aria-expanded', isShowing);
            menuButton.innerHTML = isShowing ? '<i data-lucide="x"></i>' : '<i data-lucide="menu"></i>';
            refreshIcons();
            console.log('Menu state:', isShowing);
        };

        // Cerrar al click fuera
        document.onclick = (e) => {
            if (!newsMenu.contains(e.target) && !menuButton.contains(e.target)) {
                newsMenu.classList.remove('show');
                menuButton.classList.remove('active');
                menuButton.setAttribute('aria-expanded', 'false');
                menuButton.innerHTML = '<i data-lucide="menu"></i>';
                refreshIcons();
            }
        };
    }

    const closeMenu = () => {
        if (newsMenu) {
            newsMenu.classList.remove('show');
            if (menuButton) {
                menuButton.classList.remove('active');
                menuButton.setAttribute('aria-expanded', 'false');
                menuButton.innerHTML = '<i data-lucide="menu"></i>';
                refreshIcons();
            }
        }
    };

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

    // ─────────────────────────────────────────────────────────
    // NUEVO: ATAJOS DE TECLADO GLOBALES
    //   ⌘K (Mac) / Ctrl+K (Win/Linux) → abrir búsqueda
    //   Escape                          → cerrar menú (original, unificado aquí)
    // ─────────────────────────────────────────────────────────
    document.addEventListener('keydown', event => {
        const isMac     = navigator.platform.toUpperCase().includes('MAC');
        const modKey    = isMac ? event.metaKey : event.ctrlKey;

        // Escape: cerrar menú
        if (event.key === 'Escape' && newsMenu && newsMenu.classList.contains('show')) {
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
            if (newsMenu && !newsMenu.classList.contains('show')) {
                newsMenu.classList.add('show');
                if (menuButton) menuButton.classList.add('active');
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
