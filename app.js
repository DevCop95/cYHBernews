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
    const langToggleBtn  = document.getElementById('lang-toggle');
    const backToTopBtn   = document.getElementById('back-to-top');
    const appToast       = document.getElementById('app-toast');

    // ─────────────────────────────────────────────────────────
    // TRANSLATION ENGINE & DICTIONARY
    // ─────────────────────────────────────────────────────────
    const LANG_KEY = 'cyhbernews-lang';
    let currentLang = localStorage.getItem(LANG_KEY) || 'es';
    document.documentElement.setAttribute('lang', currentLang);

    const translations = {
        es: {
            title: "cYHBernews | Tu Periódico Tech",
            loaderStatus: "Cargando noticias...",
            ariaOpenMenu: "Abrir menú",
            ariaCloseSearch: "Cerrar búsqueda",
            searchPlaceholder: "Buscar titulares, temas, fuentes...",
            ariaClearSearch: "Borrar búsqueda",
            ariaSearch: "Buscar",
            ariaTrending: "Tendencias",
            ariaThemeToggle: "Cambiar tema",
            ariaLangToggle: "Cambiar idioma",
            sidebarHome: "Inicio",
            sidebarTrending: "Tendencias",
            sidebarMostViewed: "Más Visto",
            sidebarYou: "TÚ >",
            sidebarHistory: "Historial",
            sidebarSaved: "Guardados",
            sidebarLiked: "Me gusta",
            sidebarWatchLater: "Ver más tarde",
            sidebarTopics: "TEMAS",
            sidebarAll: "Actualidad",
            sidebarCyber: "Ciberseguridad",
            sidebarAI: "IA",
            footerBot: "Crea tu bot",
            pillAll: "Actualidad",
            pillCyber: "Ciberseguridad",
            pillAI: "IA",
            pagerStatus: "Mostrando {shown} de {total}",
            loadMore: "Cargar más",
            ariaBackToTop: "Volver al inicio",
            ariaClose: "Cerrar",
            ariaLike: "Me gusta",
            ariaShare: "Compartir",
            modalRead: "Leer completa",
            
            'Like removido': 'Like removido',
            '¡Te gustó esta noticia!': '¡Te gustó esta noticia!',
            'Error de conexión': 'Error de conexión',
            'Link copiado': 'Link copiado',
            'Error al copiar': 'Error al copiar',
            'Función próximamente': 'Función próximamente',
            views: "vistas",
            new: "Nuevo",
            emptyState: "No se encontraron noticias con estos filtros.",
            clearFilters: "Limpiar filtros",
            readFullStory: "Leer historia completa",
            
            agoMoment: "Hace un momento",
            agoHours: "Hace {n} horas",
            agoDay: "Hace 1 día",
            agoDays: "Hace {n} días",
            
            CRITICA: "URGENTE",
            ALTA: "ALTA",
            MEDIA: "MEDIA",
            BAJA: "BAJA",
            
            Ciberseguridad: "Ciberseguridad",
            IA: "IA",
            Actualidad: "Actualidad",
            unknownSource: "Fuente desconocida",
            errorLoading: "Error cargando noticias."
        },
        en: {
            title: "cYHBernews | Your Tech News",
            loaderStatus: "Loading news...",
            ariaOpenMenu: "Open menu",
            ariaCloseSearch: "Close search",
            searchPlaceholder: "Search headlines, topics, sources...",
            ariaClearSearch: "Clear search",
            ariaSearch: "Search",
            ariaTrending: "Trending",
            ariaThemeToggle: "Change theme",
            ariaLangToggle: "Change language",
            sidebarHome: "Home",
            sidebarTrending: "Trending",
            sidebarMostViewed: "Most Viewed",
            sidebarYou: "YOU >",
            sidebarHistory: "History",
            sidebarSaved: "Saved",
            sidebarLiked: "Liked",
            sidebarWatchLater: "Watch Later",
            sidebarTopics: "TOPICS",
            sidebarAll: "All News",
            sidebarCyber: "Cybersecurity",
            sidebarAI: "AI",
            footerBot: "Create your bot",
            pillAll: "All News",
            pillCyber: "Cybersecurity",
            pillAI: "AI",
            pagerStatus: "Showing {shown} of {total}",
            loadMore: "Load more",
            ariaBackToTop: "Back to top",
            ariaClose: "Close",
            ariaLike: "Like",
            ariaShare: "Share",
            modalRead: "Read full",
            
            'Like removido': 'Like removed',
            '¡Te gustó esta noticia!': 'You liked this article!',
            'Error de conexión': 'Connection error',
            'Link copiado': 'Link copied',
            'Error al copiar': 'Error copying',
            'Función próximamente': 'Feature coming soon',
            views: "views",
            new: "New",
            emptyState: "No news found with these filters.",
            clearFilters: "Clear filters",
            readFullStory: "Read full story",
            
            agoMoment: "Just now",
            agoHours: "{n} hours ago",
            agoDay: "1 day ago",
            agoDays: "{n} days ago",
            
            CRITICA: "CRITICAL",
            ALTA: "HIGH",
            MEDIA: "MEDIUM",
            BAJA: "LOW",
            
            Ciberseguridad: "Cybersecurity",
            IA: "AI",
            Actualidad: "All News",
            unknownSource: "Unknown source",
            errorLoading: "Error loading news."
        }
    };

    const CACHE_KEY = 'cyhbernews-trans-cache';
    let translationCache = {};
    try {
        translationCache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
    } catch(e) {
        console.warn("Could not read sessionStorage cache", e);
    }

    function saveTranslationCache() {
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(translationCache));
        } catch(e) {
            console.warn("Could not save translation cache to sessionStorage", e);
        }
    }

    async function translateText(text, targetLang) {
        if (!text || targetLang === 'es') return text;
        const trimmed = text.trim();
        if (!trimmed) return text;
        if (translationCache[trimmed]) {
            return translationCache[trimmed];
        }
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=en&dt=t&q=${encodeURIComponent(trimmed)}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error('Translation API error');
            const data = await res.json();
            if (data && data[0]) {
                const translated = data[0].map(item => item[0]).join('');
                translationCache[trimmed] = translated;
                saveTranslationCache();
                return translated;
            }
            return text;
        } catch (e) {
            console.warn('Translation failed for text:', trimmed, e);
            return text;
        }
    }

    async function translateNewsItem(news, targetLang) {
        if (targetLang === 'es') {
            return {
                title: getCleanTitle(news),
                summary: getCleanSummary(news),
                category: translations['es'][news.categoria] || news.categoria || 'Actualidad',
                fuente: news.fuente || translations['es']['unknownSource']
            };
        }
        
        const origTitle = getCleanTitle(news);
        const origSummary = getCleanSummary(news);
        const origCategory = news.categoria || 'Actualidad';
        const origSource = news.fuente || 'Fuente desconocida';
        
        const combined = `${origTitle} ||| ${origSummary}`;
        const translatedCombined = await translateText(combined, 'en');
        
        let title = origTitle;
        let summary = origSummary;
        
        if (translatedCombined && translatedCombined.includes('|||')) {
            const parts = translatedCombined.split(/\|\|\|/);
            title = parts[0] ? parts[0].trim() : origTitle;
            summary = parts[1] ? parts[1].trim() : origSummary;
        } else if (translatedCombined) {
            const altParts = translatedCombined.split(/\s*\|\|\|\s*/);
            title = altParts[0] ? altParts[0].trim() : origTitle;
            summary = altParts[1] ? altParts[1].trim() : origSummary;
        }
        
        let fuente = origSource;
        if (origSource === 'Fuente desconocida') {
            fuente = translations['en']['unknownSource'];
        }
        const category = translations['en'][origCategory] || origCategory;
        return { title, summary, category, fuente };
    }

    function updateStaticTranslations() {
        document.title = translations[currentLang].title;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[currentLang][key]) {
                if (el.children.length === 0) {
                    el.textContent = translations[currentLang][key];
                } else {
                    for (let node of el.childNodes) {
                        if (node.nodeType === Node.TEXT_NODE) {
                            node.textContent = translations[currentLang][key];
                            break;
                        }
                    }
                }
            }
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (translations[currentLang][key]) {
                el.placeholder = translations[currentLang][key];
            }
        });
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            if (translations[currentLang][key]) {
                el.setAttribute('aria-label', translations[currentLang][key]);
            }
        });
    }

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
        // Interceptar Like (primero porque tiene prioridad)
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            const id = likeBtn.dataset.id;
            const title = likeBtn.dataset.title;
            await toggleLike(id, title);
            return;
        }

        // Interceptar Share
        const shareBtn = e.target.closest('.share-btn:not(.like-btn)');
        if (shareBtn) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
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

        // Interceptar clic en la tarjeta para contar vista
        const cardLink = e.target.closest('.news-card, a.hero-card');
        if (cardLink) {
            const id = cardLink.dataset.id;
            if (id) {
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
        const translatedMsg = translations[currentLang][message] || message;
        appToast.innerHTML = `<i data-lucide="${icon}"></i>${escapeHTML(translatedMsg)}`;
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

    const loaderBar = document.getElementById('loader-bar');
    function setLoaderProgress(pct) {
        if (loaderBar) loaderBar.style.width = pct + '%';
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
            setLoaderProgress(20);
            const response = await fetch(`noticias.json?v=${Date.now()}`);
            setLoaderProgress(50);
            if (!response.ok) throw new Error('Error loading news');
            const data = await response.json();
            setLoaderProgress(70);
            allNews = data.filter(news => news.resumen && news.resumen.trim() !== "");
            allNews.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            await applyFilters();
            setLoaderProgress(100);
        } catch (error) {
            console.error(error);
            setLoaderProgress(100);
            if (newsGrid) newsGrid.innerHTML = `<p class="error-msg">${translations[currentLang].errorLoading}</p>`;
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
            
            let searchStrings = [
                news.titulo,
                news.resumen,
                news.fuente,
                news.categoria
            ];

            if (currentLang === 'en') {
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
                    <p>${translations[currentLang].emptyState}</p>
                    <button id="clear-filters-btn" class="clear-filters-btn">
                        <i data-lucide="x-circle"></i> ${translations[currentLang].clearFilters}
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
                    const trans = await translateNewsItem(news, currentLang);
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
                category: translations[currentLang][featured.categoria] || featured.categoria || 'Actualidad',
                fuente: featured.fuente || translations[currentLang]['unknownSource']
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
                    category: translations[currentLang][news.categoria] || news.categoria || 'Actualidad',
                    fuente: news.fuente || translations[currentLang]['unknownSource']
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

                const formatViews = stats.views > 0 ? `${stats.views} ${translations[currentLang].views}` : translations[currentLang].new;

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

    function getBadgeHtml(severidad, isHero = false) {
        if (!severidad) return '';
        const sv = severidad.toUpperCase();
        let icon = 'alert-circle';
        let color = 'var(--accent)';
        let text = translations[currentLang][sv] || sv;

        if (sv === 'CRITICA') {
            icon = 'flame';
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

    function renderHeroCard(news, trans) {
        if (!news) return '';
        const id = getNewsId(news.enlace_original);
        const title = trans ? trans.title : getCleanTitle(news);
        const summary = trans ? trans.summary : getCleanSummary(news);
        const category = trans ? trans.category : (news.categoria || 'Actualidad');
        const fuente = trans ? trans.fuente : (news.fuente || 'Fuente desconocida');
        const timeStr = getRelativeTime(news.fecha);
        const initial = (fuente || 'G')[0].toUpperCase();
        const badgeHtml = getBadgeHtml(news.severidad, true);
        
        const views = statsCache[id]?.views || 0;
        const likes = statsCache[id]?.likes || 0;
        const formatViews = views > 0 ? `${views} ${translations[currentLang].views}` : translations[currentLang].new;

        const likedNews = JSON.parse(localStorage.getItem('likedNews') || '{}');
        const isLiked = !!likedNews[id];

        return `
            <a href="${escapeAttribute(news.enlace_original)}" target="_blank" rel="noopener noreferrer" class="hero-card" data-id="${id}">
                ${news.url_imagen ? `<img src="${escapeAttribute(news.url_imagen)}" alt="${escapeAttribute(title)}" loading="lazy">` : ''}
                <div class="hero-content">
                    ${badgeHtml}
                    <span class="hero-category">${escapeHTML(category)}</span>
                    <h1 class="hero-title">${escapeHTML(title)}</h1>
                    <p class="hero-desc">${escapeHTML(summary)}</p>
                    <div class="hero-meta">
                        <div class="hero-source">
                            <div class="hero-source-avatar">${initial}</div>
                            ${escapeHTML(fuente)}
                        </div>
                        &bull; <span class="views-display" data-news-id="${id}">${formatViews}</span> &bull; ${timeStr}
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 16px;">
                        <button class="read-story-btn" style="margin-top: 0;">
                            ${translations[currentLang].readFullStory} <i data-lucide="arrow-right"></i>
                        </button>
                        <button class="share-btn like-btn ${isLiked ? 'active' : ''}" data-id="${id}" data-title="${escapeAttribute(title)}" aria-label="${translations[currentLang].ariaLike}" style="background: rgba(255,255,255,0.2);">
                            <i data-lucide="heart" fill="${isLiked ? 'currentColor' : 'none'}"></i>
                            <span class="like-count" style="font-size: 13px; margin-left: 4px; font-weight: bold;">${likes > 0 ? likes : ''}</span>
                        </button>
                        <button class="share-btn" data-url="${escapeAttribute(news.enlace_original)}" data-title="${escapeAttribute(title)}" aria-label="${translations[currentLang].ariaShare}" style="background: rgba(255,255,255,0.2);">
                            <i data-lucide="share-2"></i>
                        </button>
                    </div>
                </div>
            </a>
        `;
    }

    function renderGridCard(news, trans) {
        const id = getNewsId(news.enlace_original);
        const title = trans ? trans.title : getCleanTitle(news);
        const category = trans ? trans.category : (news.categoria || 'Actualidad');
        const fuente = trans ? trans.fuente : (news.fuente || 'Fuente desconocida');
        const timeStr = getRelativeTime(news.fecha);
        const initial = (fuente || 'N')[0].toUpperCase();
        const badgeHtml = getBadgeHtml(news.severidad, false);
        
        const views = statsCache[id]?.views || 0;
        const likes = statsCache[id]?.likes || 0;
        const formatViews = views > 0 ? `${views} ${translations[currentLang].views}` : translations[currentLang].new;

        const likedNews = JSON.parse(localStorage.getItem('likedNews') || '{}');
        const isLiked = !!likedNews[id];

        return `
            <div class="news-card" data-id="${id}">
                <div class="card-thumbnail card-preview-trigger" data-news-id="${id}">
                    ${news.url_imagen ? `<img src="${escapeAttribute(news.url_imagen)}" alt="${escapeAttribute(title)}" loading="lazy">` : ''}
                    ${badgeHtml}
                    <div class="card-thumbnail-overlay">
                        <div style="display: flex; gap: 8px;">
                            <button class="share-btn like-btn ${isLiked ? 'active' : ''}" data-id="${id}" data-title="${escapeAttribute(title)}" aria-label="${translations[currentLang].ariaLike}">
                                <i data-lucide="heart" fill="${isLiked ? 'currentColor' : 'none'}"></i>
                                <span class="like-count" style="font-size: 12px; margin-left: 4px;">${likes > 0 ? likes : ''}</span>
                            </button>
                            <button class="share-btn" data-url="${escapeAttribute(news.enlace_original)}" data-title="${escapeAttribute(title)}" aria-label="${translations[currentLang].ariaShare}">
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
                            <span class="source">${escapeHTML(fuente)}</span>
                            <div class="stats"><span class="views-display" data-news-id="${id}">${formatViews}</span> &bull; ${timeStr}</div>
                        </div>
                        <a href="${escapeAttribute(news.enlace_original)}" target="_blank" rel="noopener noreferrer" class="card-read-more">
                            ${currentLang === 'es' ? 'Ver más' : 'Read more'} <i data-lucide="arrow-right"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    function updatePager() {
        if (!pager || !pagerStatus || !loadMoreButton) return;
        const totalRest = Math.max(0, currentResults.length - 1);
        const shown = Math.min(state.visibleCount - 1, totalRest);
        const remaining = Math.max(0, totalRest - shown);

        pager.hidden = currentResults.length <= PAGE_SIZE;
        pagerStatus.textContent = translations[currentLang].pagerStatus
            .replace('{shown}', shown)
            .replace('{total}', totalRest);
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
        if (hours < 1) return translations[currentLang].agoMoment;
        if (hours < 24) return translations[currentLang].agoHours.replace('{n}', hours);
        const days = Math.floor(hours / 24);
        if (days === 1) return translations[currentLang].agoDay;
        return translations[currentLang].agoDays.replace('{n}', days);
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
    // NEWS PREVIEW MODAL
    // ─────────────────────────────────────────────────────────
    const newsModal = document.getElementById('news-modal');
    const modalBackdrop = newsModal ? newsModal.querySelector('.news-modal-backdrop') : null;
    const modalCloseBtn = newsModal ? newsModal.querySelector('.news-modal-close') : null;
    const modalImg = document.getElementById('modal-img');
    const modalCategory = document.getElementById('modal-category');
    const modalTitle = document.getElementById('modal-title');
    const modalSummary = document.getElementById('modal-summary');
    const modalAvatar = document.getElementById('modal-avatar');
    const modalSourceName = document.getElementById('modal-source-name');
    const modalTime = document.getElementById('modal-time');
    const modalLikeBtn = document.getElementById('modal-like-btn');
    const modalShareBtn = document.getElementById('modal-share-btn');
    const modalReadBtn = document.getElementById('modal-read-btn');

    let currentModalNews = null;
    let lastFocusedElement = null;

    async function openNewsModal(id, triggerElement) {
        lastFocusedElement = triggerElement || document.activeElement;
        const news = allNews.find(n => getNewsId(n.enlace_original) === id);
        if (!news || !newsModal) return;
        currentModalNews = news;

        const trans = await translateNewsItem(news, currentLang);
        const title = trans.title;
        const summary = trans.summary;
        const category = trans.category;
        const fuente = trans.fuente;
        const initial = (fuente || 'N')[0].toUpperCase();
        const likedNews = JSON.parse(localStorage.getItem('likedNews') || '{}');
        const isLiked = !!likedNews[id];

        if (news.url_imagen) {
            modalImg.src = news.url_imagen;
            modalImg.alt = title;
            modalImg.parentElement.style.display = '';
        } else {
            modalImg.parentElement.style.display = 'none';
        }

        modalCategory.textContent = category;
        modalTitle.textContent = title;
        modalSummary.textContent = summary;
        modalAvatar.textContent = initial;
        modalSourceName.textContent = fuente;
        modalTime.textContent = getRelativeTime(news.fecha);

        modalLikeBtn.dataset.id = id;
        modalLikeBtn.dataset.title = title;
        modalLikeBtn.classList.toggle('active', isLiked);
        const likeSvg = modalLikeBtn.querySelector('svg');
        if (likeSvg) likeSvg.setAttribute('fill', isLiked ? 'currentColor' : 'none');
        const likeCount = modalLikeBtn.querySelector('.like-count');
        const likes = statsCache[id]?.likes || 0;
        if (likeCount) likeCount.textContent = likes > 0 ? likes : '';

        modalShareBtn.dataset.url = news.enlace_original;
        modalShareBtn.dataset.title = title;

        modalReadBtn.href = news.enlace_original;

        newsModal.classList.add('active');
        newsModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
        if (modalCloseBtn) modalCloseBtn.focus();
        refreshIcons();
    }

    function closeNewsModal() {
        if (!newsModal) return;
        newsModal.classList.remove('active');
        newsModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        currentModalNews = null;
        
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
            lastFocusedElement.focus();
        } else if (modalCloseBtn) {
            modalCloseBtn.blur();
        }
    }

    document.addEventListener('click', async (e) => {
        // No abrir modal si se hizo click en like o share
        if (e.target.closest('.like-btn') || e.target.closest('.share-btn:not(.like-btn)')) return;
        
        const trigger = e.target.closest('.card-preview-trigger');
        if (trigger) {
            e.preventDefault();
            e.stopPropagation();
            const id = trigger.dataset.newsId;
            if (id) await openNewsModal(id, trigger);
            return;
        }
    });

    if (modalBackdrop) modalBackdrop.addEventListener('click', closeNewsModal);
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeNewsModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && newsModal && newsModal.classList.contains('active')) {
            closeNewsModal();
        }
    });

    if (modalLikeBtn) {
        modalLikeBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (currentModalNews) {
                const id = getNewsId(currentModalNews.enlace_original);
                await toggleLike(id, getCleanTitle(currentModalNews));
                const likedNews = JSON.parse(localStorage.getItem('likedNews') || '{}');
                const isLiked = !!likedNews[id];
                modalLikeBtn.classList.toggle('active', isLiked);
                const svg = modalLikeBtn.querySelector('svg');
                if (svg) svg.setAttribute('fill', isLiked ? 'currentColor' : 'none');
                const countSpan = modalLikeBtn.querySelector('.like-count');
                const likes = statsCache[id]?.likes || 0;
                if (countSpan) countSpan.textContent = likes > 0 ? likes : '';
            }
        });
    }

    if (modalShareBtn) {
        modalShareBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = modalShareBtn.dataset.url;
            const title = modalShareBtn.dataset.title;
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
        });
    }

    // Init
    updateStaticTranslations();
    
    async function toggleLanguage() {
        currentLang = currentLang === 'es' ? 'en' : 'es';
        localStorage.setItem(LANG_KEY, currentLang);
        document.documentElement.setAttribute('lang', currentLang);
        
        if (loaderOverlay) {
            loaderOverlay.classList.remove('hide');
            setLoaderProgress(30);
        }
        
        updateStaticTranslations();
        
        if (loaderOverlay) setLoaderProgress(60);
        
        await applyFilters();
        
        if (loaderOverlay) {
            setLoaderProgress(100);
            hideLoader();
        }
        
        showToast(currentLang === 'es' ? 'Idioma cambiado a Español' : 'Language changed to English', 'languages');
    }

    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', toggleLanguage);
    }

    loadNews();
});
