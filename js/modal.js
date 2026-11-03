/* ═══════════════════════════════════════════════════════════
   MODAL — Vista previa de noticia
   ═══════════════════════════════════════════════════════════ */
import { getNewsId, getCleanTitle } from './utils.js?v=15';
import { getLang, getRelativeTime, translateNewsItem } from './i18n.js?v=15';
import { statsCache, getLikedNews, toggleLike } from './stats.js?v=15';
import { refreshIcons, shareContent } from './ui.js?v=15';

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
let findNewsById = () => null;

function getShareUrl(news) {
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin && !window.location.origin.startsWith('file')) ? window.location.origin : 'https://cyhbernews.dev101x.online';
    return (news && news.id) ? `${origin}/share/${news.id}/` : (news ? news.enlace_original : '');
}

export async function openNewsModal(id, triggerElement) {
    lastFocusedElement = triggerElement || document.activeElement;
    const news = findNewsById(id);
    if (!news || !newsModal) return;
    currentModalNews = news;

    const trans = await translateNewsItem(news, getLang());
    const title = trans.title;
    const summary = trans.summary;
    const category = trans.category;
    const fuente = trans.fuente;
    const initial = (fuente || 'N')[0].toUpperCase();

    const newsInternalId = getNewsId(news.enlace_original);
    const isLiked = !!getLikedNews()[newsInternalId];

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

    modalLikeBtn.dataset.id = newsInternalId;
    modalLikeBtn.dataset.title = title;
    modalLikeBtn.classList.toggle('active', isLiked);
    const likeSvg = modalLikeBtn.querySelector('svg');
    if (likeSvg) likeSvg.setAttribute('fill', isLiked ? 'currentColor' : 'none');
    const likeCount = modalLikeBtn.querySelector('.like-count');
    const likes = statsCache[newsInternalId]?.likes || 0;
    if (likeCount) likeCount.textContent = likes > 0 ? likes : '';

    const shareUrl = getShareUrl(news);
    modalShareBtn.dataset.url = shareUrl;
    modalShareBtn.dataset.title = title;

    modalReadBtn.href = news.enlace_original;

    // Sincronizar URL para reflejar la noticia abierta sin recargar
    try {
        const url = new URL(window.location);
        url.searchParams.set('noticia', news.id || newsInternalId);
        window.history.replaceState({ modalOpen: true, newsId: news.id }, '', url);
    } catch (_) {}

    newsModal.classList.add('active');
    newsModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (modalCloseBtn) modalCloseBtn.focus();
    refreshIcons();
}

export function closeNewsModal() {
    if (!newsModal) return;
    newsModal.classList.remove('active');
    newsModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentModalNews = null;

    // Limpiar parámetro de URL si estaba presente
    try {
        const url = new URL(window.location);
        if (url.searchParams.has('noticia') || url.searchParams.has('news') || url.searchParams.has('id')) {
            url.searchParams.delete('noticia');
            url.searchParams.delete('news');
            url.searchParams.delete('id');
            window.history.replaceState({}, '', url);
        }
    } catch (_) {}

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
    } else if (modalCloseBtn) {
        modalCloseBtn.blur();
    }
}

export function initModal(newsLookup) {
    findNewsById = newsLookup;

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

    window.addEventListener('popstate', () => {
        const params = new URLSearchParams(window.location.search);
        if (!params.get('noticia') && !params.get('news') && !params.get('id') && newsModal && newsModal.classList.contains('active')) {
            closeNewsModal();
        }
    });

    if (modalLikeBtn) {
        modalLikeBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (currentModalNews) {
                const id = getNewsId(currentModalNews.enlace_original);
                await toggleLike(id);
                const isLiked = !!getLikedNews()[id];
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
            await shareContent(modalShareBtn.dataset.url, modalShareBtn.dataset.title);
        });
    }
}
