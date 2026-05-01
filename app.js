document.addEventListener('DOMContentLoaded', () => {
    const newsGrid = document.getElementById('news-grid');
    const filterButtons = document.querySelectorAll('.ios-tab');
    let allNews = [];

    // ─────────────────────────────────────────
    // 0.1  iOS Clock
    // ─────────────────────────────────────────
    function updateIOSTime() {
        const timeEl = document.getElementById('current-time');
        const now = new Date();
        timeEl.textContent =
            now.getHours().toString().padStart(2, '0') + ':' +
            now.getMinutes().toString().padStart(2, '0');
    }
    setInterval(updateIOSTime, 1000);
    updateIOSTime();

    function refreshIcons() {
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    refreshIcons();

    // ─────────────────────────────────────────
    // 0.2  Scramble Effect  (reutilizable)
    // ─────────────────────────────────────────
    const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&!?';

    function scramble(targetId, finalText, onDone) {
        const el = document.getElementById(targetId);
        if (!el) return;

        const REVEAL_DELAY = 60;
        const NOISE_FRAMES = 8;

        el.innerHTML = finalText
            .split('')
            .map((ch, i) => `<span class="scramble-char" data-i="${i}">${ch}</span>`)
            .join('');

        const spans = el.querySelectorAll('.scramble-char');
        let resolved = 0;

        spans.forEach((span, i) => {
            const target = finalText[i];
            let revealed = false;

            const noiseId = setInterval(() => {
                if (!revealed)
                    span.textContent = CHARSET[Math.floor(Math.random() * CHARSET.length)];
            }, 40);

            setTimeout(() => {
                let frame = 0;
                const revealId = setInterval(() => {
                    if (frame >= NOISE_FRAMES) {
                        clearInterval(noiseId);
                        clearInterval(revealId);
                        span.textContent = target;
                        span.classList.remove('scramble-char');
                        revealed = true;
                        resolved++;
                        if (resolved === spans.length && typeof onDone === 'function') onDone();
                    } else {
                        span.textContent = CHARSET[Math.floor(Math.random() * CHARSET.length)];
                        frame++;
                    }
                }, 40);
            }, i * REVEAL_DELAY);
        });
    }

    // ─────────────────────────────────────────
    // 0.3  Loader Logic
    // ─────────────────────────────────────────
    const loaderOverlay = document.getElementById('loader-overlay');
    const loaderBar     = document.getElementById('loader-bar');
    const statusText    = document.getElementById('loader-status-text');

    const STATUS_STEPS = [
        { pct: 20,  msg: 'Connecting to feed...' },
        { pct: 45,  msg: 'Fetching articles...'  },
        { pct: 70,  msg: 'Parsing data...'       },
        { pct: 90,  msg: 'Almost there...'       },
        { pct: 100, msg: 'Ready.'                },
    ];

    function advanceLoader(step) {
        if (step >= STATUS_STEPS.length) return;
        loaderBar.style.width  = STATUS_STEPS[step].pct + '%';
        statusText.textContent = STATUS_STEPS[step].msg;
    }

    // Tiempo mínimo que el loader permanece visible (ms)
    const MIN_LOADER_MS = 3200;
    const loaderStart   = Date.now();

    function hideLoader() {
        const elapsed   = Date.now() - loaderStart;
        const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
        setTimeout(() => {
            advanceLoader(4);                                          // barra al 100 %
            setTimeout(() => loaderOverlay.classList.add('hide'), 700); // fade-out más suave
        }, remaining);
    }

    scramble('loader-scramble-title', 'cYHBernews');
    advanceLoader(0);
    setTimeout(() => advanceLoader(1), 700);   // Fetching…
    setTimeout(() => advanceLoader(2), 1400);  // Parsing…
    setTimeout(() => advanceLoader(3), 2200);  // Almost there…

    // ─────────────────────────────────────────
    // 0.4  Header scramble + hover
    // ─────────────────────────────────────────
    function triggerHeaderScramble() {
        scramble('scramble-title', 'cYHBernews');
    }
    triggerHeaderScramble();

    const headerTitle = document.getElementById('scramble-title');
    if (headerTitle) {
        headerTitle.style.cursor = 'default';
        headerTitle.addEventListener('mouseenter', triggerHeaderScramble);
    }

    // ─────────────────────────────────────────
    // 1.  Cargar noticias
    // ─────────────────────────────────────────
    async function loadNews() {
        try {
            const response = await fetch(`noticias.json?v=${Date.now()}`);
            if (!response.ok) throw new Error('Error al cargar noticias.');
            allNews = await response.json();
            allNews.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            renderNews(allNews);
        } catch (error) {
            console.error(error);
            newsGrid.innerHTML = `<p class="error-msg">Error: No se pudieron cargar las noticias.</p>`;
        } finally {
            hideLoader();
        }
    }

    // ─────────────────────────────────────────
    // 2.  Render
    // ─────────────────────────────────────────
    function renderNews(newsToRender) {
        if (newsToRender.length === 0) {
            newsGrid.innerHTML = `<p class="empty-msg">No hay noticias disponibles.</p>`;
            return;
        }

        newsGrid.innerHTML = newsToRender.map(news => `
            <a href="${news.enlace_original}" target="_blank" rel="noopener noreferrer" class="news-card">
                <div class="card-window-header">
                    <div class="dot red"></div>
                    <div class="dot yellow"></div>
                    <div class="dot green"></div>
                </div>
                ${news.url_imagen
                    ? `<img src="${news.url_imagen}" alt="${news.titulo}" class="card-image" loading="lazy">`
                    : ''}
                <div class="card-content">
                    <div class="code-editor">
                        <span class="code-comment"># cYHBernews_report.py</span><br>
                        <span class="code-keyword">news_item</span> = {<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;<span class="code-string">"title"</span>: <span class="code-string">"${news.titulo}"</span>,<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;<span class="code-string">"category"</span>: <span class="code-string">"${news.categoria}"</span>,<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;<span class="code-string">"summary"</span>: <span class="code-string">"${news.resumen}"</span>,<br>
                        &nbsp;&nbsp;&nbsp;&nbsp;<span class="code-string">"source"</span>: <span class="code-func">load_source</span>(<span class="code-string">"${news.fuente}"</span>)<br>
                        }
                    </div>
                    <div class="card-footer">
                        <span class="card-source">Process: SUCCESS</span>
                        <span class="card-date">${formatDate(news.fecha)}</span>
                    </div>
                </div>
            </a>
        `).join('');

        refreshIcons();
    }

    function formatDate(isoString) {
        return new Date(isoString).toLocaleDateString('es-ES',
            { year: 'numeric', month: 'short', day: 'numeric' });
    }

    // ─────────────────────────────────────────
    // 4.  Filtros
    // ─────────────────────────────────────────
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const category = button.getAttribute('data-category');
            renderNews(category === 'all' ? allNews : allNews.filter(n => n.categoria === category));
        });
    });

    loadNews();
});