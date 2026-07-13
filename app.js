/* ═══════════════════════════════════════════════════════════
   APP MAIN — cYHBernews
   Orquestador: estado, carga de datos, filtros y eventos.
   La lógica está repartida en módulos ES bajo js/:
     js/utils.js  → helpers puros
     js/i18n.js   → idioma y traducciones
     js/ui.js     → toast, tema, loader, compartir
     js/stats.js  → vistas y likes (Firestore)
     js/render.js → plantillas de hero y tarjetas
     js/modal.js  → vista previa de noticia
   ═══════════════════════════════════════════════════════════ */
import { getNewsId, getCleanTitle, getCleanSummary, normalizeText } from './js/utils.js';
import { translations, translationCache, getLang, setLang, t, translateNewsItem, updateStaticTranslations } from './js/i18n.js';
import { refreshIcons, showToast, shareContent, initTheme, initBackToTop, initLoader, setLoaderProgress, showLoader, hideLoader } from './js/ui.js';
import { statsCache, getLikedNews, fetchStatsForNews, incrementView, toggleLike } from './js/stats.js';
import { renderHeroCard, renderGridCard } from './js/render.js';
import { initModal } from './js/modal.js';

function main() {
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
    const langToggleBtn  = document.getElementById('lang-toggle');

    let allNews = [];
    let currentResults = [];
    let archiveManifest = [];

    const PAGE_SIZE = 12;
    const state = {
        category:     'all',
        query:        '',
        action:       'home',
        visibleCount: PAGE_SIZE,
    };

    // ─────────────────────────────────────────────────────────
    // DATA LOADING
    // Carga rápida: data/noticias-recientes.json (últimos días) y
    // después los archivos mensuales en segundo plano. Si el índice
    // no existe todavía, cae al noticias.json completo.
    // ─────────────────────────────────────────────────────────
    function prepareNews(data) {
        const cleaned = data.filter(news => news.resumen && news.resumen.trim() !== "");
        cleaned.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        return cleaned;
    }

    async function fetchInitialNews() {
        try {
            const idxRes = await fetch('data/index.json', { cache: 'no-cache' });
            if (!idxRes.ok) throw new Error('index.json no disponible');
            const idx = await idxRes.json();
            archiveManifest = idx.archivos || [];
            const res = await fetch(`data/${idx.recientes.file}?v=${idx.recientes.v}`);
            if (!res.ok) throw new Error('recientes no disponible');
            return prepareNews(await res.json());
        } catch (e) {
            console.warn('Datos particionados no disponibles, usando noticias.json completo.', e);
            archiveManifest = [];
            const res = await fetch('noticias.json', { cache: 'no-cache' });
            if (!res.ok) throw new Error('Error loading news');
            return prepareNews(await res.json());
        }
    }

    async function loadArchivesInBackground() {
        if (!archiveManifest.length) return;
        const results = await Promise.allSettled(
            archiveManifest.map(async (archive) => {
                const res = await fetch(`data/${archive.file}?v=${archive.v}`);
                if (!res.ok) throw new Error(`No se pudo cargar ${archive.file}`);
                return res.json();
            })
        );

        const seen = new Set(allNews.map(n => n.enlace_original));
        let added = 0;
        for (const result of results) {
            if (result.status !== 'fulfilled') {
                console.warn('Archivo mensual no cargado:', result.reason);
                continue;
            }
            for (const item of prepareNews(result.value)) {
                if (seen.has(item.enlace_original)) continue;
                seen.add(item.enlace_original);
                allNews.push(item);
                added++;
            }
        }
        if (!added) return;

        allNews.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        currentResults = getFilteredNews();
        // Los archivos son más antiguos que lo visible: en la vista por
        // defecto solo cambia el total del pager. Con filtros activos los
        // resultados pueden crecer, así que re-renderizamos.
        if (state.query || state.action !== 'home' || state.category !== 'all') {
            await renderNews();
        } else {
            updatePager();
        }
    }

    async function loadNews() {
        try {
            setLoaderProgress(20);
            allNews = await fetchInitialNews();
            setLoaderProgress(70);
            await applyFilters();
            setLoaderProgress(100);
            loadArchivesInBackground();
        } catch (error) {
            console.error(error);
            setLoaderProgress(100);
            if (newsGrid) newsGrid.innerHTML = `<p class="error-msg">${t('errorLoading')}</p>`;
        } finally {
            hideLoader();
        }
    }

    // ─────────────────────────────────────────────────────────
    // FILTROS Y RENDER
    // ─────────────────────────────────────────────────────────
    async function applyFilters() {
        state.visibleCount = PAGE_SIZE;
        currentResults = getFilteredNews();
        await renderNews();
    }

    function getFilteredNews() {
        const query = normalizeText(state.query);
        let filtered = allNews.filter(news => {
            const matchesCategory = state.category === 'all' || news.categoria === state.category;

            let searchStrings = [
                news.titulo,
                news.resumen,
                news.fuente,
                news.categoria
            ];

            if (getLang() === 'en') {
                const title = getCleanTitle(news);
                const summary = getCleanSummary(news);
                const combined = `${title} ||| ${summary}`;
                if (translationCache[combined]) {
                    searchStrings.push(translationCache[combined]);
                }
                searchStrings.push(translations['en'][news.categoria] || '');
                searchStrings.push(news.fuente === 'Fuente desconocida' ? translations['en']['unknownSource'] : '');
            }

            const searchable = normalizeText(searchStrings.join(' '));
            return matchesCategory && (!query || searchable.includes(query));
        });

        // Apply Action View Modes
        if (state.action === 'liked') {
            const likedNews = getLikedNews();
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
                    <p>${t('emptyState')}</p>
                    <button id="clear-filters-btn" class="clear-filters-btn">
                        <i data-lucide="x-circle"></i> ${t('clearFilters')}
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

        // Translate the news items in parallel
        const allItemsToTranslate = [featured, ...newsToRender].filter(Boolean);
        const translatedItemsMap = new Map();

        try {
            const translatedList = await Promise.all(
                allItemsToTranslate.map(async (news) => {
                    const id = getNewsId(news.enlace_original);
                    const trans = await translateNewsItem(news, getLang());
                    return { id, trans };
                })
            );
            translatedList.forEach(item => {
                translatedItemsMap.set(item.id, item.trans);
            });
        } catch (err) {
            console.error("Error translating news list", err);
        }

        // Render hero
        if (heroSection && featured) {
            const id = getNewsId(featured.enlace_original);
            const trans = translatedItemsMap.get(id) || {
                title: getCleanTitle(featured),
                summary: getCleanSummary(featured),
                category: t(featured.categoria) || featured.categoria || 'Actualidad',
                fuente: featured.fuente || t('unknownSource')
            };
            heroSection.innerHTML = renderHeroCard(featured, trans);
        } else if (heroSection) {
            heroSection.innerHTML = '';
        }

        // Render grid
        if (newsGrid) {
            newsGrid.innerHTML = newsToRender.map(news => {
                const id = getNewsId(news.enlace_original);
                const trans = translatedItemsMap.get(id) || {
                    title: getCleanTitle(news),
                    summary: getCleanSummary(news),
                    category: t(news.categoria) || news.categoria || 'Actualidad',
                    fuente: news.fuente || t('unknownSource')
                };
                return renderGridCard(news, trans);
            }).join('');
        }

        refreshIcons();
        updatePager();

        // Fetch stats for all items to be rendered in the background (non-blocking)
        fetchStatsForNews([featured, ...newsToRender].filter(Boolean)).then(() => {
            [featured, ...newsToRender].forEach(news => {
                if (!news) return;
                const id = getNewsId(news.enlace_original);
                const stats = statsCache[id];
                if (!stats) return;

                const formatViews = stats.views > 0 ? `${stats.views} ${t('views')}` : t('new');

                // Update views display in DOM
                document.querySelectorAll(`.views-display[data-news-id="${id}"]`).forEach(el => {
                    el.textContent = formatViews;
                });

                // Update likes count in DOM if needed
                document.querySelectorAll(`.like-btn[data-id="${id}"]`).forEach(btn => {
                    const countSpan = btn.querySelector('.like-count');
                    if (countSpan) {
                        countSpan.textContent = stats.likes > 0 ? stats.likes : '';
                    }
                });
            });
        }).catch(err => console.warn("Failed to update stats dynamically:", err));
    }

    function updatePager() {
        if (!pager || !pagerStatus || !loadMoreButton) return;
        const totalRest = Math.max(0, currentResults.length - 1);
        const shown = Math.min(state.visibleCount - 1, totalRest);
        const remaining = Math.max(0, totalRest - shown);

        pager.hidden = currentResults.length <= PAGE_SIZE;
        pagerStatus.textContent = t('pagerStatus')
            .replace('{shown}', shown)
            .replace('{total}', totalRest);
        loadMoreButton.hidden = remaining === 0;
        loadMoreButton.disabled = remaining === 0;
        refreshIcons();
    }

    // ─────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────
    // Interceptar clics para likes, compartir y conteo de vistas
    document.body.addEventListener('click', async (e) => {
        // Interceptar Like (primero porque tiene prioridad)
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            await toggleLike(likeBtn.dataset.id);
            return;
        }

        // Interceptar Share
        const shareBtn = e.target.closest('.share-btn:not(.like-btn)');
        if (shareBtn) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            await shareContent(shareBtn.dataset.url, shareBtn.dataset.title);
            return;
        }

        // Interceptar clic en la tarjeta para contar vista
        const cardLink = e.target.closest('.news-card, a.hero-card');
        if (cardLink) {
            const id = cardLink.dataset.id;
            if (id) {
                incrementView(id);
            }
        }
    });

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

    // Clear search button (X)
    const clearSearchBtn = document.getElementById('clear-search');
    function updateClearBtn() {
        if (clearSearchBtn) {
            clearSearchBtn.style.display = searchInput && searchInput.value.length > 0 ? 'flex' : 'none';
        }
    }
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            state.query = '';
            updateClearBtn();
            await applyFilters();
        });
    }

    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', e => {
            clearTimeout(debounceTimer);
            updateClearBtn();
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

    // Click outside to close sidebar (mobile)
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const isMobile = window.innerWidth <= 768;
        if (isMobile && document.body.classList.contains('sidebar-open')) {
            // Close if click is outside sidebar and outside menu button
            if (sidebar && !sidebar.contains(e.target) && menuButton && !menuButton.contains(e.target)) {
                document.body.classList.remove('sidebar-open');
            }
        }
    });

    // Click outside to close mobile search
    document.addEventListener('click', (e) => {
        if (!appHeader || !appHeader.classList.contains('mobile-search-active')) return;
        const headerEl = document.querySelector('.app-header');
        if (headerEl && !headerEl.contains(e.target)) {
            appHeader.classList.remove('mobile-search-active');
        }
    });

    // ─────────────────────────────────────────────────────────
    // LANGUAGE TOGGLE
    // ─────────────────────────────────────────────────────────
    async function toggleLanguage() {
        setLang(getLang() === 'es' ? 'en' : 'es');

        showLoader();
        setLoaderProgress(30);

        updateStaticTranslations();

        setLoaderProgress(60);

        await applyFilters();

        setLoaderProgress(100);
        hideLoader();

        showToast(getLang() === 'es' ? 'Idioma cambiado a Español' : 'Language changed to English', 'languages');
    }

    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', toggleLanguage);
    }

    // ─────────────────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────────────────
    initLoader();
    initTheme();
    initBackToTop();
    refreshIcons();
    updateStaticTranslations();
    initModal((id) => allNews.find(n => getNewsId(n.enlace_original) === id));
    loadNews();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
