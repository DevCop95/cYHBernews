/* ═══════════════════════════════════════════════════════════
   RENDER — Plantillas HTML de hero y tarjetas del grid
   ═══════════════════════════════════════════════════════════ */
import { getNewsId, getCleanTitle, getCleanSummary, escapeHTML, escapeAttribute } from './utils.js';
import { t, getLang, getRelativeTime } from './i18n.js';
import { statsCache, getLikedNews } from './stats.js';

export function getBadgeHtml(severidad, isHero = false) {
    if (!severidad) return '';
    const sv = severidad.toUpperCase();
    let icon = 'alert-circle';
    let color = 'var(--accent)';
    let text = t(sv) || sv;

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

export function renderHeroCard(news, trans) {
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
    const formatViews = views > 0 ? `${views} ${t('views')}` : t('new');

    const isLiked = !!getLikedNews()[id];

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
                        ${t('readFullStory')} <i data-lucide="arrow-right"></i>
                    </button>
                    <button class="share-btn like-btn ${isLiked ? 'active' : ''}" data-id="${id}" data-title="${escapeAttribute(title)}" aria-label="${t('ariaLike')}" style="background: rgba(255,255,255,0.2);">
                        <i data-lucide="heart" fill="${isLiked ? 'currentColor' : 'none'}"></i>
                        <span class="like-count" style="font-size: 13px; margin-left: 4px; font-weight: bold;">${likes > 0 ? likes : ''}</span>
                    </button>
                    <button class="share-btn" data-url="${escapeAttribute(news.enlace_original)}" data-title="${escapeAttribute(title)}" aria-label="${t('ariaShare')}" style="background: rgba(255,255,255,0.2);">
                        <i data-lucide="share-2"></i>
                    </button>
                </div>
            </div>
        </a>
    `;
}

export function renderGridCard(news, trans) {
    const id = getNewsId(news.enlace_original);
    const title = trans ? trans.title : getCleanTitle(news);
    const category = trans ? trans.category : (news.categoria || 'Actualidad');
    const fuente = trans ? trans.fuente : (news.fuente || 'Fuente desconocida');
    const timeStr = getRelativeTime(news.fecha);
    const initial = (fuente || 'N')[0].toUpperCase();
    const badgeHtml = getBadgeHtml(news.severidad, false);

    const views = statsCache[id]?.views || 0;
    const likes = statsCache[id]?.likes || 0;
    const formatViews = views > 0 ? `${views} ${t('views')}` : t('new');

    const isLiked = !!getLikedNews()[id];

    return `
        <div class="news-card" data-id="${id}">
            <div class="card-thumbnail card-preview-trigger" data-news-id="${id}">
                ${news.url_imagen ? `<img src="${escapeAttribute(news.url_imagen)}" alt="${escapeAttribute(title)}" loading="lazy">` : ''}
                ${badgeHtml}
                <div class="card-thumbnail-overlay">
                    <div style="display: flex; gap: 8px;">
                        <button class="share-btn like-btn ${isLiked ? 'active' : ''}" data-id="${id}" data-title="${escapeAttribute(title)}" aria-label="${t('ariaLike')}">
                            <i data-lucide="heart" fill="${isLiked ? 'currentColor' : 'none'}"></i>
                            <span class="like-count" style="font-size: 12px; margin-left: 4px;">${likes > 0 ? likes : ''}</span>
                        </button>
                        <button class="share-btn" data-url="${escapeAttribute(news.enlace_original)}" data-title="${escapeAttribute(title)}" aria-label="${t('ariaShare')}">
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
                        ${getLang() === 'es' ? 'Ver más' : 'Read more'} <i data-lucide="arrow-right"></i>
                    </a>
                </div>
            </div>
        </div>
    `;
}
