import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildSeoPages } from './seo-pages.mjs';
import { precompileDcDocument } from './precompile-dc.mjs';
import { rewriteSiteOrigin, siteUrl } from './site-config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceHtml = path.join(root, 'index.html');
const sourceAdminHtml = path.join(root, 'admin.html');
const sourcePublic = path.join(root, 'public');
const output = path.join(root, 'dist');

await Promise.all([stat(sourceHtml), stat(sourceAdminHtml), stat(sourcePublic)]);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(sourcePublic, output, { recursive: true });
const [sourceStorefrontHtml, adminHtml] = await Promise.all([
  readFile(sourceHtml, 'utf8'),
  readFile(sourceAdminHtml, 'utf8')
]);
const storefrontHtml = rewriteSiteOrigin(sourceStorefrontHtml);
const [builtStorefrontHtml, builtAdminHtml] = await Promise.all([
  precompileDcDocument({ html: storefrontHtml, output, label: 'index.html', names: ['Root', 'index'], scriptFile: 'app-logic.js' }),
  precompileDcDocument({ html: adminHtml, output, label: 'admin.html', names: ['admin'], scriptFile: 'admin-logic.js' })
]);
await Promise.all([
  writeFile(path.join(output, 'index.html'), builtStorefrontHtml, 'utf8'),
  writeFile(path.join(output, 'admin.html'), builtAdminHtml, 'utf8')
]);
const seoBuild = await buildSeoPages({ sourceHtml: storefrontHtml, output });
await Promise.all(['llms.txt', 'llms-full.txt'].map(async (file) => {
  const filePath = path.join(output, file);
  const content = await readFile(filePath, 'utf8');
  await writeFile(filePath, rewriteSiteOrigin(content), 'utf8');
}));

console.log(`Production storefront and admin logic precompiled for a strict Content Security Policy at ${siteUrl}. Generated ${seoBuild.collectionCount} crawlable collection pages, ${seoBuild.catalogCount} product pages and ${seoBuild.sitemapCount} sitemap URLs.`);
