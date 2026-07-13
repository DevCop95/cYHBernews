/* ═══════════════════════════════════════════════════════════
   I18N — Diccionario, idioma activo y motor de traducción
   ═══════════════════════════════════════════════════════════ */
import { getCleanTitle, getCleanSummary } from './utils.js';

const LANG_KEY = 'cyhbernews-lang';
let currentLang = localStorage.getItem(LANG_KEY) || 'es';
document.documentElement.setAttribute('lang', currentLang);

export const translations = {
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

export function getLang() {
    return currentLang;
}

export function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.setAttribute('lang', lang);
}

// Traducción de clave estática en el idioma activo (puede devolver undefined)
export function t(key) {
    return translations[currentLang][key];
}

// ─────────────────────────────────────────────────────────
// CACHÉ DE TRADUCCIONES DINÁMICAS (Google Translate)
// ─────────────────────────────────────────────────────────
const CACHE_KEY = 'cyhbernews-trans-cache';
export let translationCache = {};
try {
    translationCache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
} catch (e) {
    console.warn("Could not read sessionStorage cache", e);
}

function saveTranslationCache() {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(translationCache));
    } catch (e) {
        console.warn("Could not save translation cache to sessionStorage", e);
    }
}

export async function translateText(text, targetLang) {
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

export async function translateNewsItem(news, targetLang) {
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

export function updateStaticTranslations() {
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

export function getRelativeTime(isoString) {
    const diff = Date.now() - new Date(isoString).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return t('agoMoment');
    if (hours < 24) return t('agoHours').replace('{n}', hours);
    const days = Math.floor(hours / 24);
    if (days === 1) return t('agoDay');
    return t('agoDays').replace('{n}', days);
}
