#!/usr/bin/env node
/**
 * split-news.js — Parte noticias.json en archivos más pequeños para la web.
 *
 * Genera en data/:
 *   - noticias-recientes.json  → últimos RECENT_DAYS días (mínimo MIN_RECENT items)
 *   - archivo-YYYY-MM.json     → resto de noticias agrupadas por mes
 *   - index.json               → manifiesto con versión (hash) por archivo
 *
 * noticias.json sigue siendo la fuente de verdad que escribe el bot;
 * este script solo deriva los archivos que consume el frontend.
 * Se ejecuta desde GitHub Actions en cada push a noticias.json.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RECENT_DAYS = 7;
const MIN_RECENT = 60;

const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');

const raw = fs.readFileSync(path.join(rootDir, 'noticias.json'), 'utf8');
const allNews = JSON.parse(raw);

// Mismo orden que usa el frontend: más recientes primero
allNews.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

const newestDate = new Date(allNews[0]?.fecha || Date.now());
const cutoff = new Date(newestDate.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000);

let recentCount = allNews.filter(n => new Date(n.fecha) >= cutoff).length;
if (recentCount < MIN_RECENT) recentCount = Math.min(MIN_RECENT, allNews.length);

const recent = allNews.slice(0, recentCount);
const older = allNews.slice(recentCount);

// Agrupar el resto por mes (YYYY-MM)
const byMonth = new Map();
for (const item of older) {
    const d = new Date(item.fecha);
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month).push(item);
}

fs.mkdirSync(dataDir, { recursive: true });

function writeJson(filename, data) {
    const json = JSON.stringify(data);
    fs.writeFileSync(path.join(dataDir, filename), json);
    return {
        count: data.length,
        v: crypto.createHash('sha256').update(json).digest('hex').slice(0, 10)
    };
}

const recientesInfo = writeJson('noticias-recientes.json', recent);

const archivos = [];
const months = [...byMonth.keys()].sort().reverse();
for (const month of months) {
    const filename = `archivo-${month}.json`;
    const info = writeJson(filename, byMonth.get(month));
    archivos.push({ file: filename, month, ...info });
}

// Eliminar archivos mensuales huérfanos de ejecuciones anteriores
for (const f of fs.readdirSync(dataDir)) {
    if (/^archivo-\d{4}-\d{2}\.json$/.test(f) && !archivos.some(a => a.file === f)) {
        fs.unlinkSync(path.join(dataDir, f));
    }
}

const index = {
    generated: new Date().toISOString(),
    total: allNews.length,
    recientes: { file: 'noticias-recientes.json', ...recientesInfo },
    archivos
};
fs.writeFileSync(path.join(dataDir, 'index.json'), JSON.stringify(index, null, 2));

console.log(`OK: ${recent.length} recientes + ${older.length} en ${archivos.length} archivo(s) mensual(es).`);
