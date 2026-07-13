/* ═══════════════════════════════════════════════════════════
   UTILS — Helpers puros (sin estado, sin DOM)
   ═══════════════════════════════════════════════════════════ */

// Generar un ID válido para Firestore basado en la URL
export function getNewsId(url) {
    if (!url) return 'unknown';
    return btoa(url).replace(/[=+/]/g, '');
}

export function getCleanTitle(news) {
    return String(news.titulo || 'Sin título').replace(/^Tít[uú]lo:\s*/i, '').trim().split('\n')[0].trim().replace(/^["'“”]+|["'“”]+$/g, '');
}

export function getCleanSummary(news) {
    const summary = String(news.resumen || '').replace(/^Res[uú]men:\s*/i, '').trim();
    return summary || 'Resumen no disponible.';
}

export function normalizeText(value) {
    return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

export function escapeAttribute(value) {
    return escapeHTML(value).replace(/`/g, '&#096;');
}
