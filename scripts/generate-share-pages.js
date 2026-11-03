#!/usr/bin/env node
/**
 * generate-share-pages.js — Genera páginas estáticas con Open Graph para compartir cada noticia.
 *
 * Crea:
 *   share/<id>/index.html
 *
 * Cada archivo contiene las metaetiquetas Open Graph y Twitter Cards con:
 *   - Título de la noticia
 *   - Resumen redactado por cYHBernews
 *   - Imagen de la noticia (o fallback a og-image.png)
 *   - Redirección automática instantánea a https://cyhbernews.dev101x.online/?noticia=<id>
 *
 * De este modo, al compartir en WhatsApp, Twitter/X, Telegram, LinkedIn, etc.,
 * se previsualiza el resumen y la imagen de cYHBernews. Al hacer clic, el usuario
 * aterriza en cYHBernews con la noticia abierta y con el botón directo para ir a la
 * fuente original si lo desea.
 */

const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://cyhbernews.dev101x.online';
const DEFAULT_OG_IMAGE = `${DOMAIN}/og-image.png`;

const rootDir = path.join(__dirname, '..');
const shareDir = path.join(rootDir, 'share');

function escapeHTML(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttribute(str) {
    return escapeHTML(str).replace(/`/g, '&#096;');
}

function cleanTitle(news) {
    return String(news.titulo || 'Sin título')
        .replace(/^Tít[uú]lo:\s*/i, '')
        .replace(/[\u202F\u00A0]/g, ' ')
        .replace(/[\u2010\u2011\u2012\u2013\u2014]/g, '-')
        .trim()
        .split('\n')[0]
        .trim()
        .replace(/^["'“”]+|["'“”]+$/g, '');
}

function cleanSummary(news) {
    const summary = String(news.resumen || '')
        .replace(/^Res[uú]men:\s*/i, '')
        .replace(/[\u202F\u00A0]/g, ' ')
        .replace(/[\u2010\u2011\u2012\u2013\u2014]/g, '-')
        .trim();
    return summary || 'Resumen no disponible en cYHBernews.';
}

function generateShareHTML(item) {
    const title = cleanTitle(item);
    const summary = cleanSummary(item);
    const id = item.id;
    const shareUrl = `${DOMAIN}/share/${id}/`;
    const appUrl = `../../?noticia=${encodeURIComponent(id)}`;
    const imageUrl = (item.url_imagen && item.url_imagen.startsWith('http')) ? item.url_imagen : DEFAULT_OG_IMAGE;
    const categoria = item.categoria || 'Actualidad';
    const fuente = item.fuente || 'cYHBernews';
    const fecha = item.fecha || new Date().toISOString();

    const eTitle = escapeHTML(title);
    const eSummary = escapeHTML(summary);
    const aTitle = escapeAttribute(title);
    const aSummary = escapeAttribute(summary);
    const aImage = escapeAttribute(imageUrl);
    const aOriginalUrl = escapeAttribute(item.enlace_original || DOMAIN);

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${eTitle} | cYHBernews</title>
    <meta name="description" content="${aSummary}">
    <link rel="canonical" href="${shareUrl}">
    <link rel="icon" type="image/svg+xml" href="../../favicon.svg">
    <meta name="theme-color" content="#0d1117">

    <!-- Open Graph / Facebook / WhatsApp / Telegram / LinkedIn -->
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="cYHBernews | Tu Periódico Tech">
    <meta property="og:url" content="${shareUrl}">
    <meta property="og:title" content="${aTitle}">
    <meta property="og:description" content="${aSummary}">
    <meta property="og:image" content="${aImage}">
    <meta property="og:image:secure_url" content="${aImage}">
    <meta property="og:image:alt" content="${aTitle}">
    <meta property="og:locale" content="es_ES">
    <meta property="article:published_time" content="${fecha}">
    <meta property="article:section" content="${escapeAttribute(categoria)}">

    <!-- Twitter / X -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@cYHBernews">
    <meta name="twitter:url" content="${shareUrl}">
    <meta name="twitter:title" content="${aTitle}">
    <meta name="twitter:description" content="${aSummary}">
    <meta name="twitter:image" content="${aImage}">
    <meta name="twitter:image:alt" content="${aTitle}">

    <!-- Redirección instantánea para usuarios -->
    <meta http-equiv="refresh" content="0; url=${appUrl}">
    <script>
        window.location.replace("${appUrl}");
    </script>
    <style>
        :root {
            --bg: #0d1117;
            --card-bg: #161b22;
            --border: #30363d;
            --text: #c9d1d9;
            --text-heading: #f0f6fc;
            --accent: #58a6ff;
            --accent-hover: #79c0ff;
            --btn-bg: #21262d;
            --btn-border: #363b42;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
        }
        .share-card {
            max-width: 600px;
            width: 100%;
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 16px 40px rgba(0,0,0,0.5);
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .card-img-wrap {
            width: 100%;
            height: 240px;
            overflow: hidden;
            background: #000;
        }
        .card-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        .card-body {
            padding: 1.5rem;
        }
        .card-header-meta {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            margin-bottom: 0.75rem;
        }
        .badge {
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            padding: 0.2rem 0.6rem;
            border-radius: 999px;
            background: rgba(88, 166, 255, 0.15);
            color: var(--accent);
            border: 1px solid rgba(88, 166, 255, 0.3);
        }
        .source-name {
            font-size: 0.85rem;
            color: #8b949e;
        }
        .card-title {
            font-size: 1.25rem;
            color: var(--text-heading);
            line-height: 1.4;
            margin-bottom: 0.85rem;
        }
        .card-summary {
            font-size: 0.95rem;
            line-height: 1.6;
            color: #8b949e;
            margin-bottom: 1.5rem;
        }
        .actions {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.8rem 1.25rem;
            border-radius: 8px;
            font-size: 0.95rem;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s ease;
            cursor: pointer;
        }
        .btn-primary {
            background: #238636;
            color: #ffffff;
            border: 1px solid rgba(240, 246, 252, 0.1);
        }
        .btn-primary:hover {
            background: #2ea043;
        }
        .btn-secondary {
            background: var(--btn-bg);
            color: var(--accent);
            border: 1px solid var(--btn-border);
        }
        .btn-secondary:hover {
            background: #30363d;
            color: var(--accent-hover);
        }
        .redirect-notice {
            font-size: 0.8rem;
            color: #6e7681;
            text-align: center;
            margin-top: 1.25rem;
        }
    </style>
</head>
<body>
    <div class="share-card">
        ${item.url_imagen ? `<div class="card-img-wrap"><img src="${aImage}" alt="${aTitle}" class="card-img"></div>` : ''}
        <div class="card-body">
            <div class="card-header-meta">
                <span class="badge">${escapeHTML(categoria)}</span>
                <span class="source-name">${escapeHTML(fuente)}</span>
            </div>
            <h1 class="card-title">${eTitle}</h1>
            <p class="card-summary">${eSummary}</p>
            <div class="actions">
                <a href="${appUrl}" class="btn btn-primary">
                    Ver noticia en cYHBernews &rarr;
                </a>
                <a href="${aOriginalUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
                    Ir directo a la noticia original &nearr;
                </a>
            </div>
            <p class="redirect-notice">Redirigiendo automáticamente a cYHBernews...</p>
        </div>
    </div>
</body>
</html>
`;
}

function main() {
    const raw = fs.readFileSync(path.join(rootDir, 'noticias.json'), 'utf8');
    const allNews = JSON.parse(raw);

    const force = process.argv.includes('--force');
    fs.mkdirSync(shareDir, { recursive: true });

    let written = 0;
    let skipped = 0;

    for (const item of allNews) {
        if (!item.id) continue;
        const targetDir = path.join(shareDir, String(item.id));
        const targetFile = path.join(targetDir, 'index.html');

        if (!force && fs.existsSync(targetFile)) {
            skipped++;
            continue;
        }

        fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(targetFile, generateShareHTML(item), 'utf8');
        written++;
    }

    console.log(`Páginas de compartir: ${written} creadas, ${skipped} sin cambios.`);
}

main();
