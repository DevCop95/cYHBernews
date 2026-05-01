document.addEventListener('DOMContentLoaded', () => {
    const newsGrid = document.getElementById('news-grid');
    const filterButtons = document.querySelectorAll('.ios-tab');
    let allNews = [];

    // --- 0.1 iOS Time Helper ---
    function updateIOSTime() {
        const timeEl = document.getElementById('current-time');
        const now = new Date();
        timeEl.textContent = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    }
    setInterval(updateIOSTime, 1000);
    updateIOSTime();

    // Initialize Lucide icons with safety check
    function refreshIcons() {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    refreshIcons();

    // 1. Cargar noticias desde el JSON
    async function loadNews() {
        try {
            const response = await fetch(`noticias.json?v=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Error al cargar el archivo de noticias.');
            
            allNews = await response.json();
            allNews.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            renderNews(allNews);
        } catch (error) {
            console.error(error);
            newsGrid.innerHTML = `<p class="error-msg">Error: No se pudieron cargar las noticias.</p>`;
        }
    }

    // 2. Renderizar las noticias en el DOM (Python Code Style)
    function renderNews(newsToRender) {
        if (newsToRender.length === 0) {
            newsGrid.innerHTML = `<p class="empty-msg">No hay noticias disponibles.</p>`;
            return;
        }

        const newsHTML = newsToRender.map(news => `
            <a href="${news.enlace_original}" target="_blank" rel="noopener noreferrer" class="news-card">
                <div class="card-window-header">
                    <div class="dot red"></div>
                    <div class="dot yellow"></div>
                    <div class="dot green"></div>
                </div>
                ${news.url_imagen ? `<img src="${news.url_imagen}" alt="${news.titulo}" class="card-image" loading="lazy">` : ''}
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

        newsGrid.innerHTML = newsHTML;
        refreshIcons(); // Re-initialize icons if any were in the dynamic HTML
    }

    function formatDate(isoString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(isoString).toLocaleDateString('es-ES', options);
    }

    // 4. Lógica de Filtros iOS
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const category = button.getAttribute('data-category');
            if (category === 'all') {
                renderNews(allNews);
            } else {
                const filtered = allNews.filter(n => n.categoria === category);
                renderNews(filtered);
            }
        });
    });

    loadNews();
});
