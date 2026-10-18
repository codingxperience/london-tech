import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectionPages, parseCatalog, siteUrl } from './seo-pages.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const read = (file) => readFile(path.join(root, file), 'utf8');
const requireText = (source, expected, label) => {
  if (!source.includes(expected)) throw new Error(`Missing ${label}: ${expected}`);
};

const [html, adminHtml, manifestText, robots, sitemap, llms, llmsFull, assetSources, adminData] = await Promise.all([
  read('index.html'), read('admin.html'), read('public/site.webmanifest'), read('public/robots.txt'),
  read('public/sitemap.xml'), read('public/llms.txt'), read('public/llms-full.txt'),
  read('ASSET_SOURCES.md'), read('public/admin-data.js')
]);
const manifest = JSON.parse(manifestText);
const catalog = parseCatalog(html);

requireText(html, '<title>London Tech | London Technology Store</title>', 'storefront title');
requireText(html, 'assets/london-tech-logo.png', 'owner-supplied London Tech logo');
requireText(html, 'assets/london-tech-mark.png', 'compact London Tech brand mark');
requireText(html, 'property="og:image" content="https://london-tech.vercel.app/assets/london-tech-logo.png"', 'London Tech white-logo social preview');
requireText(html, 'data-word-subtitle', 'London Technology Store wordmark');
requireText(adminHtml, 'No real orders, customers, payments or business systems are connected.', 'admin prototype boundary');
requireText(adminHtml, 'sample records stored in this browser', 'admin sample-data disclosure');
requireText(adminData, 'window.LONDON_TECH_CATALOG', 'London Tech sample catalogue');
requireText(assetSources, 'london-tech-logo-source.png', 'owner-supplied logo provenance');

if (manifest.name !== 'London Tech — London Technology Store') throw new Error('The installable site name does not match London Tech.');
if (!manifest.icons.some((icon) => icon.src === 'assets/london-tech-mark.png' && icon.sizes === '128x128')) {
  throw new Error('The installable app manifest does not use the compact London Tech mark.');
}
if (!robots.includes(`${siteUrl}/sitemap.xml`)) throw new Error('The robots file does not point to the configured sitemap.');
const sourceSitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, value]) => new URL(value));
if (sourceSitemapUrls.some((url) => url.origin !== siteUrl)) {
  throw new Error('The source sitemap includes an unexpected origin.');
}

for (const file of [
  'public/assets/london-tech-logo.png',
  'public/assets/london-tech-mark.png',
  'public/assets/london-tech-social-card.png',
  'public/favicon.ico',
  'dist/index.html',
  'dist/admin.html',
  'dist/app-logic.js',
  'dist/admin-logic.js',
  'dist/sitemap.xml',
  'dist/robots.txt'
]) await access(path.join(root, file));

const favicon = await readFile(path.join(root, 'dist/favicon.ico'));
if (favicon.readUInt16LE(0) !== 0 || favicon.readUInt16LE(2) !== 1 || favicon.readUInt16LE(4) < 1) {
  throw new Error('The generated London Tech favicon is not a valid ICO file.');
}

const builtHome = await read('dist/index.html');
const builtAdmin = await read('dist/admin.html');
const builtSitemap = await read('dist/sitemap.xml');
requireText(builtHome, `${siteUrl}/`, 'configured canonical storefront origin');
requireText(builtHome, 'London Tech', 'built London Tech storefront');
requireText(builtAdmin, 'London Tech', 'built London Tech admin prototype');
for (const page of collectionPages) {
  const file = `dist/collections/${page.slug}/index.html`;
  await access(path.join(root, file));
  const content = await read(file);
  requireText(content, '<title>', `${page.slug} collection title`);
  requireText(builtSitemap, `${siteUrl}/collections/${page.slug}/`, `${page.slug} sitemap entry`);
}
for (const product of catalog) {
  await access(path.join(dist, 'products', product.id, 'index.html'));
}

const builtSiteMapStat = await stat(path.join(dist, 'sitemap.xml'));
if (!builtSiteMapStat.size) throw new Error('The built sitemap is empty.');
console.log(`London Tech QA passed: storefront, admin prototype, logo, ${collectionPages.length} collections and ${catalog.length} catalogue pages are present.`);
