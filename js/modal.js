/* ═══════════════════════════════════════════════════════════
   MODAL — Vista previa de noticia
   ═══════════════════════════════════════════════════════════ */
import { getNewsId, getCleanTitle } from './utils.js';
import { getLang, getRelativeTime, translateNewsItem } from './i18n.js';
import { statsCache, getLikedNews, toggleLike } from './stats.js';
import { refreshIcons, shareContent } from './ui.js';

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

async function openNewsModal(id, triggerElement) {
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
    const isLiked = !!getLikedNews()[id];

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
