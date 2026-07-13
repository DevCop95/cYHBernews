/* ═══════════════════════════════════════════════════════════
   STATS — Vistas y likes (Firestore)
   ═══════════════════════════════════════════════════════════ */
import { db, doc, getDoc, setDoc, updateDoc, increment } from '../firebase-config.js';
import { getNewsId } from './utils.js';
import { showToast } from './ui.js';

export const statsCache = {}; // Cache for views and likes

export function getLikedNews() {
    return JSON.parse(localStorage.getItem('likedNews') || '{}');
}

// Obtener stats de un lote de noticias (con timeout para no bloquear)
export async function fetchStatsForNews(newsList) {
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

export async function incrementView(id) {
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

// Actualizar UI de todos los botones de like (hero, grid y modal)
function syncLikeButtons(id, nowLiked) {
    const btns = document.querySelectorAll(`.like-btn[data-id="${id}"]`);
    btns.forEach(btn => {
        btn.classList.toggle('active', nowLiked);
        const countSpan = btn.querySelector('.like-count');
        if (countSpan) countSpan.textContent = statsCache[id].likes > 0 ? statsCache[id].likes : '';

        const svg = btn.querySelector('svg');
        if (svg) svg.setAttribute('fill', nowLiked ? 'currentColor' : 'none');
    });
}

export async function toggleLike(id) {
    const likedNews = getLikedNews();
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
        syncLikeButtons(id, !isLiked);
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
        syncLikeButtons(id, !isLiked);

    } catch (e) {
        console.error("Error toggling like:", e);
        showToast('Error de conexión', 'alert-circle');
    }
}
