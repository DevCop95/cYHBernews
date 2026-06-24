/* ═══════════════════════════════════════════════════════════
   APP MAIN — cYHBernews (YouTube Dark Mode + Firebase)
   ═══════════════════════════════════════════════════════════ */
import { db, doc, getDoc, setDoc, updateDoc, increment } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    const newsGrid      = document.getElementById('news-grid');
    const heroSection   = document.getElementById('hero-section');
    const filterPills   = document.querySelectorAll('.pill');
    const sidebarTopics = document.querySelectorAll('.sidebar-item[data-category]');
    const sidebarActions = document.querySelectorAll('.sidebar-item[data-action]');
    const searchInput   = document.getElementById('news-search');
    const pager         = document.getElementById('news-pager');
    const pagerStatus   = document.getElementById('pager-status');
    const loadMoreButton = document.getElementById('load-more-news');
    const menuButton    = document.getElementById('nav-menu-button');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const backToTopBtn   = document.getElementById('back-to-top');
    const appToast       = document.getElementById('app-toast');

    let allNews = [];
    let currentResults = [];
    let statsCache = {}; // Cache for views and likes
    
    const PAGE_SIZE = 12;
    const state = {
        category:     'all',
        query:        '',
        action:       'home',
        visibleCount: PAGE_SIZE,
    };

    // ─────────────────────────────────────────────────────────
    // FIREBASE HELPERS
    // ─────────────────────────────────────────────────────────
    // Generar un ID válido para Firestore basado en la URL
    function getNewsId(url) {
        if (!url) return 'unknown';
        return btoa(url).replace(/[=+/]/g, ''); 
    }

    // Obtener stats de un lote de noticias (con timeout para no bloquear)
    async function fetchStatsForNews(newsList) {
        // Asignar defaults primero para que siempre haya datos
        newsList.forEach(news => {
            const id = getNewsId(news.enlace_original);
            if (!statsCache[id]) statsCache[id] = { views: 0, likes: 0 };
        });

        if (!db) return;

        // Race contra un timeout de 5s para no bloquear el render
        const TIMEOUT_MS = 5000;
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, TIMEOUT_MS));

        const fetchPromise = Promise.all(
            newsList.map(async (news) => {
                const id = getNewsId(news.enlace_original);
                try {
                    const docRef = doc(db, "news_stats", id);
                    // Timeout individual de 4s por documento
                    const docSnap = await Promise.race([
                        getDoc(docRef),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
                    ]);
                    if (docSnap.exists()) {
                        statsCache[id] = docSnap.data();
                    }
                } catch (e) {
                    // Ya tiene defaults, solo log si no es timeout
                    if (e.message !== 'timeout') {
                        console.warn("Stats fetch skipped:", e.message);
                    }
                }
            })
        );

        await Promise.race([fetchPromise, timeoutPromise]);
    }

    async function incrementView(id) {
        if (!db) return;
        try {
            const docRef = doc(db, "news_stats", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                await updateDoc(docRef, { views: increment(1) });
            } else {
                await setDoc(docRef, { views: 1, likes: 0 });
            }
        } catch (e) {
            console.error("Error incrementing view:", e);
        }
    }

    async function toggleLike(id, title) {
        const likedNews = JSON.parse(localStorage.getItem('likedNews') || '{}');
        const isLiked = !!likedNews[id];

        if (!db) {
            if (isLiked) {
                delete likedNews[id];
                statsCache[id] = statsCache[id] || {};
                statsCache[id].likes = Math.max(0, (statsCache[id].likes || 0) - 1);
                showToast('Like removido');
            } else {
                likedNews[id] = true;
                statsCache[id] = statsCache[id] || {};
                statsCache[id].likes = (statsCache[id].likes || 0) + 1;
                showToast('¡Te gustó esta noticia!', 'heart');
            }
            localStorage.setItem('likedNews', JSON.stringify(likedNews));
            const btns = document.querySelectorAll(`.like-btn[data-id="${id}"]`);
            btns.forEach(btn => {
                const nowLiked = !isLiked;
                btn.classList.toggle('active', nowLiked);
                const countSpan = btn.querySelector('.like-count');
                if (countSpan) countSpan.textContent = statsCache[id].likes > 0 ? statsCache[id].likes : '';
                
                const svg = btn.querySelector('svg');
                if (svg) svg.setAttribute('fill', nowLiked ? 'currentColor' : 'none');
            });
            return;
        }

        try {
            const docRef = doc(db, "news_stats", id);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                await setDoc(docRef, { views: 0, likes: isLiked ? 0 : 1 });
            } else {
                await updateDoc(docRef, { likes: increment(isLiked ? -1 : 1) });
            }

            if (isLiked) {
                delete likedNews[id];
                statsCache[id].likes = Math.max(0, (statsCache[id].likes || 0) - 1);
                showToast('Like removido');
            } else {
                likedNews[id] = true;
                statsCache[id].likes = (statsCache[id].likes || 0) + 1;
                showToast('¡Te gustó esta noticia!', 'heart');
            }
            
            localStorage.setItem('likedNews', JSON.stringify(likedNews));
            
            // Actualizar UI de todos los botones de like (hero y grid)
            const btns = document.querySelectorAll(`.like-btn[data-id="${id}"]`);
            btns.forEach(btn => {
                const nowLiked = !isLiked;
                btn.classList.toggle('active', nowLiked);
                const countSpan = btn.querySelector('.like-count');
                if (countSpan) countSpan.textContent = statsCache[id].likes > 0 ? statsCache[id].likes : '';
                
                // Actualizar icono SVG si existe
                const svg = btn.querySelector('svg');
                if (svg) svg.setAttribute('fill', nowLiked ? 'currentColor' : 'none');
            });
            
        } catch (e) {
            console.error("Error toggling like:", e);
            showToast('Error de conexión', 'alert-circle');
        }
    }

    // Interceptar clics en los enlaces para contar vistas y likes
    document.body.addEventListener('click', async (e) => {
        // Interceptar Share
        const shareBtn = e.target.closest('.share-btn:not(.like-btn)');
        if (shareBtn) {
            e.preventDefault();
            e.stopPropagation();
            const url   = shareBtn.dataset.url;
            const title = shareBtn.dataset.title;
            try {
                if (navigator.share && navigator.canShare && navigator.canShare({ title, url })) {
                    await navigator.share({ title, url });
                } else {
                    await navigator.clipboard.writeText(url);
                    showToast('Link copiado', 'clipboard-check');
                }
            } catch (err) {
                if (err.name !== 'AbortError') showToast('Error al copiar', 'alert-circle');
            }
            return;
        }

        // Interceptar Like
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            e.preventDefault();
            e.stopPropagation();
            const id = likeBtn.dataset.id;
            const title = likeBtn.dataset.title;
            await toggleLike(id, title);
            return;
        }

        // Interceptar clic en la tarjeta para contar vista
        const cardLink = e.target.closest('a.news-card, a.hero-card');
        if (cardLink) {
            const id = cardLink.dataset.id;
            if (id) {
                // No esperamos a que termine para no bloquear la navegación
                incrementView(id);
            }
        }
    });

    // ─────────────────────────────────────────────────────────
    // THEME MANAGER
    // ─────────────────────────────────────────────────────────
    const THEME_KEY = 'cyhbernews-theme';
    const htmlEl    = document.documentElement;
    function isDarkThemeActive() {
        const explicit = htmlEl.getAttribute('data-theme');
        if (explicit === 'dark')  return true;
        if (explicit === 'light') return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    function syncThemeIcon() {
        if (!themeToggleBtn) return;
        themeToggleBtn.innerHTML = `<i data-lucide="${isDarkThemeActive() ? 'sun' : 'moon'}"></i>`;
        refreshIcons();
    }
    function cycleTheme() {
        const next = isDarkThemeActive() ? 'light' : 'dark';
        htmlEl.setAttribute('data-theme', next);
        localStorage.setItem(THEME_KEY, next);
        syncThemeIcon();
    }
    syncThemeIcon();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (!htmlEl.hasAttribute('data-theme')) syncThemeIcon();
    });
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', cycleTheme);

    // ─────────────────────────────────────────────────────────
    // UI HELPERS
    // ─────────────────────────────────────────────────────────
    let toastTimeout = null;
    function showToast(message, icon = 'check', duration = 2400) {
        if (!appToast) return;
        clearTimeout(toastTimeout);
        appToast.innerHTML = `<i data-lucide="${icon}"></i>${escapeHTML(message)}`;
        refreshIcons();
        appToast.classList.remove('show');
        void appToast.offsetWidth;
        appToast.classList.add('show');
        toastTimeout = setTimeout(() => appToast.classList.remove('show'), duration);
    }

    const SCROLL_THRESHOLD = 380;
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            const shouldShow = window.scrollY > SCROLL_THRESHOLD;
            backToTopBtn.classList.toggle('visible', shouldShow);
        }, { passive: true });
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    function refreshIcons() {
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    refreshIcons();

    const loaderOverlay = document.getElementById('loader-overlay');
    const scrambleEl = document.getElementById('loader-scramble-title');

    let scramblePromise = Promise.resolve();

    // ─── Scramble Text Effect ───
    function scrambleText(element, finalText, duration = 1500) {
        return new Promise(resolve => {
            const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
            const len = finalText.length;
            const startTime = performance.now();
            let lastUpdate = 0;

            function update(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Throttle DOM updates to ~25fps (every 40ms) to avoid lag/flicker
                if (now - lastUpdate > 40) {
                    let result = '';
                    for (let i = 0; i < len; i++) {
                        const charThreshold = (i / len) * 0.6; // Scale down so all finish before 1.0
                        if (progress > charThreshold + 0.3) {
                            result += finalText[i];
                        } else {
                            result += chars[Math.floor(Math.random() * chars.length)];
                        }
                    }
                    element.textContent = result;
                    lastUpdate = now;
                }

                if (progress < 1) {
                    requestAnimationFrame(update);
                } else {
                    element.textContent = finalText;
                    resolve();
                }
            }
            requestAnimationFrame(update);
        });
    }

    if (scrambleEl) {
        scramblePromise = scrambleText(scrambleEl, 'cYHBernews', 1800);
    }

    function hideLoader() {
        if (loaderOverlay) {
            setTimeout(() => {
                loaderOverlay.classList.add('hide');
            }, 500);
        }
    }

    // ─────────────────────────────────────────────────────────
    // DATA LOADING & RENDERING
    // ─────────────────────────────────────────────────────────
    async function loadNews() {
        try {
            const response = await fetch(`noticias.json?v=${Date.now()}`);
            if (!response.ok) throw new Error('Error loading news');
            const data = await response.json();
            allNews = data.filter(news => news.resumen && news.resumen.trim() !== "");
            allNews.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            await applyFilters();
        } catch (error) {
            console.error(error);
            if (newsGrid) newsGrid.innerHTML = `<p class="error-msg">Error loading news.</p>`;
        } finally {
            await scramblePromise;
            hideLoader();
        }
    }

    async function applyFilters() {
        state.visibleCount = PAGE_SIZE;
        currentResults = getFilteredNews();
        await renderNews();
    }

    function getFilteredNews() {
        const query    = normalizeText(state.query);
        let filtered = allNews.filter(news => {
            const matchesCategory = state.category === 'all' || news.categoria === state.category;
            const searchable      = normalizeText([
                news.titulo,
                news.resumen,
                news.fuente,
                news.categoria,
            ].join(' '));
            return matchesCategory && (!query || searchable.includes(query));
        });

        // Apply Action View Modes
        if (state.action === 'liked') {
            const likedNews = JSON.parse(localStorage.getItem('likedNews') || '{}');
            filtered = filtered.filter(news => likedNews[getNewsId(news.enlace_original)]);
        } else if (state.action === 'trending') {
            const sevVal = { 'CRITICA': 4, 'ALTA': 3, 'MEDIA': 2, 'BAJA': 1 };
            filtered.sort((a, b) => {
                const valA = sevVal[a.severidad?.toUpperCase()] || 0;
                const valB = sevVal[b.severidad?.toUpperCase()] || 0;
                if (valA !== valB) return valB - valA;
                return new Date(b.fecha) - new Date(a.fecha);
            });
        } else if (state.action === 'most-viewed') {
            filtered.sort((a, b) => {
                const idA = getNewsId(a.enlace_original);
                const idB = getNewsId(b.enlace_original);
                const vA = statsCache[idA]?.views || 0;
                const vB = statsCache[idB]?.views || 0;
                if (vA !== vB) return vB - vA;
                return new Date(b.fecha) - new Date(a.fecha);
            });
        }
        
        return filtered;
    }

    async function renderNews() {
        if (currentResults.length === 0) {
            if (heroSection) heroSection.innerHTML = '';
            if (newsGrid) newsGrid.innerHTML = `
                <div class="empty-state">
                    <p>No se encontraron noticias con estos filtros.</p>
                    <button id="clear-filters-btn" class="clear-filters-btn">
                        <i data-lucide="x-circle"></i> Limpiar filtros
                    </button>
                </div>
            `;
            refreshIcons();
            const clearBtn = document.getElementById('clear-filters-btn');
            if (clearBtn) clearBtn.addEventListener('click', clearFilters);
            updatePager();
            return;
        }

        const [featured, ...rest] = currentResults;
        const newsToRender = rest.slice(0, state.visibleCount - 1);
        
        // Fetch stats for all items to be rendered
        await fetchStatsForNews([featured, ...newsToRender]);
        
        // Render hero
        if (heroSection) {
            heroSection.innerHTML = renderHeroCard(featured);
        }

        // Render grid
        if (newsGrid) {
            newsGrid.innerHTML = newsToRender.map(news => renderGridCard(news)).join('');
        }

        refreshIcons();
        updatePager();
    }

    function getBadgeHtml(severidad, isHero = false) {
        if (!severidad) return '';
        const sv = severidad.toUpperCase();
        let icon = 'alert-circle';
        let color = 'var(--accent)';
        let text = sv;

        if (sv === 'CRITICA') {
            icon = 'flame';
            text = 'URGENTE';
            color = '#e11d48';
        } else if (sv === 'ALTA') {
            icon = 'alert-triangle';
            color = '#ea580c';
        } else if (sv === 'MEDIA') {
            icon = 'alert-circle';
            color = '#ca8a04';
        } else if (sv === 'BAJA') {
            icon = 'info';
            color = '#2563eb';
        } else {
            return '';
        }

        const className = isHero ? 'hero-badge' : 'grid-badge';
        return `<div class="${className}" style="background-color: ${color}"><i data-lucide="${icon}"></i> ${text}</div>`;
    }

    function renderHeroCard(news) {
        if (!news) return '';
        const id = getNewsId(news.enlace_original);
        const title = getCleanTitle(news);
        const summary = getCleanSummary(news);
        const timeStr = getRelativeTime(news.fecha);
        const initial = (news.fuente || 'G')[0].toUpperCase();
        const badgeHtml = getBadgeHtml(news.severidad, true);
        
        const views = statsCache[id]?.views || 0;
        const likes = statsCache[id]?.likes || 0;
        const formatViews = views > 0 ? `${views} vistas` : 'Nuevo';

        const likedNews = JSON.parse(localStorage.getItem('likedNews') || '{}');
        const isLiked = !!likedNews[id];

        return `
            <a href="${escapeAttribute(news.enlace_original)}" target="_blank" rel="noopener noreferrer" class="hero-card" data-id="${id}">
                ${news.url_imagen ? `<img src="${escapeAttribute(news.url_imagen)}" alt="${escapeAttribute(title)}" loading="lazy">` : ''}
                <div class="hero-content">
                    ${badgeHtml}
                    <span class="hero-category">${escapeHTML(news.categoria || 'Actualidad')}</span>
                    <h1 class="hero-title">${escapeHTML(title)}</h1>
                    <p class="hero-desc">${escapeHTML(summary)}</p>
                    <div class="hero-meta">
                        <div class="hero-source">
                            <div class="hero-source-avatar">${initial}</div>
                            ${escapeHTML(news.fuente || 'Fuente desconocida')}
                        </div>
                        &bull; ${formatViews} &bull; ${timeStr}
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 16px;">
                        <button class="read-story-btn" style="margin-top: 0;">
                            Leer historia completa <i data-lucide="arrow-right"></i>
                        </button>
                        <button class="share-btn like-btn ${isLiked ? 'active' : ''}" data-id="${id}" data-title="${escapeAttribute(title)}" aria-label="Me gusta" style="background: rgba(255,255,255,0.2);">
                            <i data-lucide="heart" fill="${isLiked ? 'currentColor' : 'none'}"></i>
                            <span class="like-count" style="font-size: 13px; margin-left: 4px; font-weight: bold;">${likes > 0 ? likes : ''}</span>
                        </button>
                        <button class="share-btn" data-url="${escapeAttribute(news.enlace_original)}" data-title="${escapeAttribute(title)}" aria-label="Compartir" style="background: rgba(255,255,255,0.2);">
                            <i data-lucide="share-2"></i>
                        </button>
                    </div>
                </div>
            </a>
        `;
    }

    function renderGridCard(news) {
        const id = getNewsId(news.enlace_original);
        const title = getCleanTitle(news);
        const timeStr = getRelativeTime(news.fecha);
        const initial = (news.fuente || 'N')[0].toUpperCase();
        const badgeHtml = getBadgeHtml(news.severidad, false);
        
        const views = statsCache[id]?.views || 0;
        const likes = statsCache[id]?.likes || 0;
        const formatViews = views > 0 ? `${views} vistas` : 'Nuevo';

        const likedNews = JSON.parse(localStorage.getItem('likedNews') || '{}');
        const isLiked = !!likedNews[id];

        return `
            <a href="${escapeAttribute(news.enlace_original)}" target="_blank" rel="noopener noreferrer" class="news-card" data-id="${id}">
                <div class="card-thumbnail">
                    ${news.url_imagen ? `<img src="${escapeAttribute(news.url_imagen)}" alt="${escapeAttribute(title)}" loading="lazy">` : ''}
                    ${badgeHtml}
                    <div class="card-thumbnail-overlay">
                        <div style="display: flex; gap: 8px;">
                            <button class="share-btn like-btn ${isLiked ? 'active' : ''}" data-id="${id}" data-title="${escapeAttribute(title)}" aria-label="Me gusta">
                                <i data-lucide="heart" fill="${isLiked ? 'currentColor' : 'none'}"></i>
                                <span class="like-count" style="font-size: 12px; margin-left: 4px;">${likes > 0 ? likes : ''}</span>
                            </button>
                            <button class="share-btn" data-url="${escapeAttribute(news.enlace_original)}" data-title="${escapeAttribute(title)}" aria-label="Compartir">
                                <i data-lucide="share-2"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-details">
                    <div class="card-source-icon">${initial}</div>
                    <div class="card-info">
                        <h3 class="card-title">${escapeHTML(title)}</h3>
                        <div class="card-meta-small">
                            <span class="source">${escapeHTML(news.fuente || 'Fuente desconocida')}</span>
                            <div class="stats">${formatViews} &bull; ${timeStr}</div>
                        </div>
                    </div>
                </div>
            </a>
        `;
    }

    function updatePager() {
        if (!pager || !pagerStatus || !loadMoreButton) return;
        const totalRest = Math.max(0, currentResults.length - 1);
        const shown = Math.min(state.visibleCount - 1, totalRest);
        const remaining = Math.max(0, totalRest - shown);

        pager.hidden = currentResults.length <= PAGE_SIZE;
        pagerStatus.textContent = `Mostrando ${shown} de ${totalRest}`;
        loadMoreButton.hidden = remaining === 0;
        loadMoreButton.disabled = remaining === 0;
        refreshIcons();
    }

    // ─────────────────────────────────────────────────────────
    // DATA HELPERS
    // ─────────────────────────────────────────────────────────
    function getCleanTitle(news) {
        return String(news.titulo || 'Sin título').replace(/^Tít[uú]lo:\s*/i, '').trim().split('\n')[0].trim().replace(/^["'“”]+|["'“”]+$/g, '');
    }
    function getCleanSummary(news) {
        const summary = String(news.resumen || '').replace(/^Res[uú]men:\s*/i, '').trim();
        return summary || 'Resumen no disponible.';
    }
    function normalizeText(value) {
        return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }
    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
    }
    function escapeAttribute(value) {
        return escapeHTML(value).replace(/`/g, '&#096;');
    }
    function getRelativeTime(isoString) {
        const diff = Date.now() - new Date(isoString).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return 'Hace un momento';
        if (hours < 24) return `Hace ${hours} horas`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'Hace 1 día';
        return `Hace ${days} días`;
    }

    // ─────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────
    async function clearFilters() {
        state.query = '';
        state.category = 'all';
        if (searchInput) searchInput.value = '';
        syncCategoryUI('all');
        await applyFilters();
    }

    function syncCategoryUI(cat) {
        filterPills.forEach(btn => btn.classList.toggle('active', btn.dataset.category === cat));
        sidebarTopics.forEach(btn => btn.classList.toggle('active-topic', btn.dataset.category === cat));
    }

    if (menuButton) {
        menuButton.addEventListener('click', () => {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                document.body.classList.toggle('sidebar-open');
            } else {
                document.body.classList.toggle('sidebar-closed');
            }
        });
    }

    const handleCategoryClick = async (e) => {
        const cat = e.currentTarget.dataset.category;
        state.category = cat;
        // Optionally reset action when a category is clicked
        if (state.action !== 'home') {
            state.action = 'home';
            syncActionUI('home');
        }
        syncCategoryUI(cat);
        await applyFilters();
        if (window.innerWidth <= 768) document.body.classList.remove('sidebar-open');
    };
    filterPills.forEach(btn => btn.addEventListener('click', handleCategoryClick));
    sidebarTopics.forEach(btn => btn.addEventListener('click', handleCategoryClick));

    function syncActionUI(act) {
        sidebarActions.forEach(btn => btn.classList.toggle('active', btn.dataset.action === act));
    }

    const handleActionClick = async (e) => {
        e.preventDefault();
        const act = e.currentTarget.dataset.action;
        
        if (['history', 'saved', 'watch-later'].includes(act)) {
            showToast('Función próximamente', 'info');
            return;
        }
        
        state.action = act;
        syncActionUI(act);
        
        // Reset category if switching views to give a fresh slate (optional)
        if (act !== 'home' && state.category !== 'all') {
            state.category = 'all';
            syncCategoryUI('all');
        }

        await applyFilters();
        if (window.innerWidth <= 768) document.body.classList.remove('sidebar-open');
    };
    sidebarActions.forEach(btn => btn.addEventListener('click', handleActionClick));

    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', e => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                state.query = e.target.value;
                await applyFilters();
            }, 300);
        });
    }

    if (loadMoreButton) {
        loadMoreButton.addEventListener('click', async () => {
            state.visibleCount += PAGE_SIZE;
            await renderNews();
        });
    }

    // Mobile Search Toggle
    const mobileSearchBtn = document.querySelector('.mobile-only-search');
    const mobileCloseSearchBtn = document.querySelector('.mobile-close-search');
    const appHeader = document.querySelector('.app-header');

    if (mobileSearchBtn) {
        mobileSearchBtn.addEventListener('click', () => {
            appHeader.classList.add('mobile-search-active');
            if (searchInput) searchInput.focus();
        });
    }
    if (mobileCloseSearchBtn) {
        mobileCloseSearchBtn.addEventListener('click', () => {
            appHeader.classList.remove('mobile-search-active');
            if (searchInput) {
                searchInput.value = '';
                state.query = '';
                applyFilters();
            }
        });
    }

    // Init
    loadNews();
});
