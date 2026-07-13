/* ═══════════════════════════════════════════════════════════
   UI — Toast, iconos, tema, loader y compartir
   ═══════════════════════════════════════════════════════════ */
import { escapeHTML } from './utils.js';
import { t } from './i18n.js';

export function refreshIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────
const appToast = document.getElementById('app-toast');
let toastTimeout = null;

export function showToast(message, icon = 'check', duration = 2400) {
    if (!appToast) return;
    clearTimeout(toastTimeout);
    const translatedMsg = t(message) || message;
    appToast.innerHTML = `<i data-lucide="${icon}"></i>${escapeHTML(translatedMsg)}`;
    refreshIcons();
    appToast.classList.remove('show');
    void appToast.offsetWidth;
    appToast.classList.add('show');
    toastTimeout = setTimeout(() => appToast.classList.remove('show'), duration);
}

// ─────────────────────────────────────────────────────────
// COMPARTIR (Web Share API con fallback a portapapeles)
// ─────────────────────────────────────────────────────────
export async function shareContent(url, title) {
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
}

// ─────────────────────────────────────────────────────────
// THEME MANAGER
// ─────────────────────────────────────────────────────────
const THEME_KEY = 'cyhbernews-theme';
const htmlEl = document.documentElement;
const themeToggleBtn = document.getElementById('theme-toggle');

function isDarkThemeActive() {
    const explicit = htmlEl.getAttribute('data-theme');
    if (explicit === 'dark') return true;
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

export function initTheme() {
    syncThemeIcon();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (!htmlEl.hasAttribute('data-theme')) syncThemeIcon();
    });
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', cycleTheme);
}

// ─────────────────────────────────────────────────────────
// BACK TO TOP
// ─────────────────────────────────────────────────────────
export function initBackToTop() {
    const backToTopBtn = document.getElementById('back-to-top');
    if (!backToTopBtn) return;
    const SCROLL_THRESHOLD = 380;
    window.addEventListener('scroll', () => {
        const shouldShow = window.scrollY > SCROLL_THRESHOLD;
        backToTopBtn.classList.toggle('visible', shouldShow);
    }, { passive: true });
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ─────────────────────────────────────────────────────────
// LOADER (overlay + scramble + barra de progreso)
// ─────────────────────────────────────────────────────────
const loaderOverlay = document.getElementById('loader-overlay');
const loaderBar = document.getElementById('loader-bar');
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

export function initLoader() {
    const scrambleEl = document.getElementById('loader-scramble-title');
    if (scrambleEl) {
        scramblePromise = scrambleText(scrambleEl, 'cYHBernews', 1800);
    }
}

export function setLoaderProgress(pct) {
    if (loaderBar) loaderBar.style.width = pct + '%';
}

export function showLoader() {
    if (loaderOverlay) loaderOverlay.classList.remove('hide');
}

export async function hideLoader() {
    await scramblePromise;
    if (loaderOverlay) {
        setTimeout(() => {
            loaderOverlay.classList.add('hide');
        }, 500);
    }
}
