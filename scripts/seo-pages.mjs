import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { siteUrl } from './site-config.mjs';

export { siteUrl };

const categoryLabels = {
  'game-discs': 'Games',
  bags: 'Bags',
  travel: 'Travel',
  mobiles: 'Phones',
  laptops: 'Laptops',
  tablets: 'Tablets',
  audio: 'Audio',
  watches: 'Watches',
  gaming: 'Gaming',
  cameras: 'Cameras',
  accessories: 'Accessories',
  lifestyle: 'Fragrance & grooming'
};

const categoryCollection = {
  mobiles: 'mobiles',
  laptops: 'laptops',
  tablets: 'ipads-tablets',
  audio: 'audio',
  watches: 'watches',
  gaming: 'gaming',
  'game-discs': 'gaming',
  bags: 'bags-travel',
  travel: 'bags-travel',
  lifestyle: 'fragrance-grooming',
  accessories: 'shop',
  cameras: 'shop'
};

export const collectionPages = [
  { slug: 'shop', title: 'Shop technology & accessories', description: 'Explore phones, computers, audio, gaming and everyday technology in the London Tech catalogue.', categories: null },
  { slug: 'mobiles', title: 'Phones', description: 'Browse phone models and product information in the London Tech catalogue.', categories: ['mobiles'] },
  { slug: 'apple-products-london', title: 'Apple products in London', description: 'Explore Apple phones, tablets, computers, watches and audio in the London Tech catalogue.', productFilter: 'apple', categories: null },
  { slug: 'iphones-london', title: 'iPhones in London', description: 'Browse iPhone models and compare product information in the London Tech catalogue.', productFilter: 'iphone', categories: null },
  { slug: 'samsung-galaxy-ultra-london', title: 'Samsung Galaxy Ultra phones in London', description: 'Explore Samsung Galaxy Ultra models and product information in the London Tech catalogue.', productFilter: 'samsung-ultra', categories: null },
  { slug: 'laptops', title: 'Laptops', description: 'Browse laptop models and product information in the London Tech catalogue.', categories: ['laptops'] },
  { slug: 'ipads-tablets', title: 'iPads & tablets', description: 'Explore iPad and tablet models in the London Tech catalogue.', categories: ['tablets'] },
  { slug: 'audio', title: 'Headphones & speakers', description: 'Browse headphones, speakers and audio products in the London Tech catalogue.', categories: ['audio'] },
  { slug: 'watches', title: 'Smart watches', description: 'Explore smart watches and wearable technology in the London Tech catalogue.', categories: ['watches'] },
  { slug: 'gaming', title: 'Gaming', description: 'Browse consoles, games and gaming accessories in the London Tech catalogue.', categories: ['gaming', 'game-discs'] },
  { slug: 'bags-travel', title: 'Bags & travel', description: 'Explore laptop bags, travel cases and related accessories in the London Tech catalogue.', categories: ['bags', 'travel'] },
  { slug: 'fragrance-grooming', title: 'Fragrance & grooming', description: 'Browse fragrance and grooming products in the London Tech catalogue.', categories: ['lifestyle'] },
  { slug: 'visit', title: 'London Tech store information', description: 'Find confirmed London Tech address, opening hours and contact information here when they are available.', categories: [] }
];

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const json = (value) => JSON.stringify(value)
  .replaceAll('<', '\\u003c')
  .replaceAll('>', '\\u003e')
  .replaceAll('&', '\\u0026');

const absoluteUrl = (value) => /^https?:\/\//i.test(value)
  ? value
  : `${siteUrl}/${String(value).replace(/^\//, '')}`;
const collectionUrl = (slug) => `${siteUrl}/collections/${slug}/`;
const productUrl = (id) => `${siteUrl}/products/${encodeURIComponent(id)}/`;
const productImage = (product) => absoluteUrl(product.img || 'assets/london-tech-social-card.png');
const categoryName = (category) => categoryLabels[category] || 'Technology';

const appleProductPattern = /(?:iphone|ipad|macbook|apple watch|airpods|beats)/i;

export const parseCatalog = (source) => {
  const match = source.match(/\n\s*P = \[([\s\S]*?)\n\s*\];\n\n\s*TYPE = \[/);
  if (!match) throw new Error('Could not find the storefront catalogue.');

  const catalog = Function(`"use strict"; return [${match[1]}];`)();
  if (!Array.isArray(catalog) || catalog.length === 0) {
    throw new Error('The storefront catalogue is empty.');
  }
  return catalog;
};

const productsForCollection = (page, catalog) => {
  if (page.productFilter === 'apple') return catalog.filter((product) => appleProductPattern.test(product.name));
  if (page.productFilter === 'iphone') return catalog.filter((product) => /iphone/i.test(product.name));
  if (page.productFilter === 'samsung-ultra') return catalog.filter((product) => /samsung galaxy s\d+ ultra|galaxy s\d+ ultra/i.test(product.name));
  return page.categories ? catalog.filter((product) => page.categories.includes(product.cat)) : catalog;
};

const organization = {
  '@type': 'Organization',
  '@id': `${siteUrl}/#organization`,
  name: 'London Tech',
  alternateName: 'London Technology Store',
  url: `${siteUrl}/`,
  logo: absoluteUrl('assets/london-tech-logo.png'),
  image: absoluteUrl('assets/london-tech-social-card.png'),
  description: 'London Tech is a London technology store with a catalogue of phones, computers, audio, gaming and accessories.',
  areaServed: { '@type': 'City', name: 'London' },
  knowsAbout: ['consumer electronics', 'phones', 'computers', 'audio', 'gaming', 'accessories']
};

const website = {
  '@type': 'WebSite',
  '@id': `${siteUrl}/#website`,
  url: `${siteUrl}/`,
  name: 'London Tech',
  alternateName: 'London Technology Store',
  inLanguage: 'en-GB',
  publisher: { '@id': `${siteUrl}/#organization` }
};

const faqSchema = (faqs) => ({
  '@type': 'FAQPage',
  mainEntity: faqs.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer }
  }))
});

const collectionFaqs = [
  {
    question: 'Does the catalogue show live store availability?',
    answer: 'The catalogue presents product information. London Tech confirms current availability and pricing before purchase.'
  },
  {
    question: 'Where can I find the store address and opening hours?',
    answer: 'Confirmed address, opening hours and contact details will be published on the store information page.'
  },
  {
    question: 'Are product support and warranty terms the same for every item?',
    answer: 'Support and warranty terms can vary by product. London Tech will share the applicable details before purchase.'
  }
];

const navigation = () => collectionPages.map((page) => ({
  '@type': 'SiteNavigationElement',
  name: page.slug === 'shop' ? 'Shop' : page.title,
  url: collectionUrl(page.slug)
}));

const head = ({ title, description, canonical, image, schema }) => `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | London Tech</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <link rel="canonical" href="${canonical}">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="apple-touch-icon" href="/assets/london-tech-mark.png">
  <link rel="alternate" type="text/plain" href="/llms.txt" title="London Tech site information">
  <meta name="theme-color" content="#081b33">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="London Tech">
  <meta property="og:title" content="${escapeHtml(title)} | London Tech">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:alt" content="London Tech catalogue imagery">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)} | London Tech">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${image}">
  <script type="application/ld+json">${json(schema)}</script>
  <style>
    :root { color-scheme:dark; --bg:#081b33; --panel:#102744; --line:rgba(226,233,242,.12); --red:#d92f40; --ink:#f7f9fc; --muted:#a9bad0; }
    * { box-sizing:border-box; }
    html { background:var(--bg); }
    body { min-width:320px; margin:0; background:radial-gradient(ellipse at 50% -20%,#173858 0,transparent 52%),var(--bg); color:var(--ink); font:16px/1.65 "Segoe UI",system-ui,-apple-system,sans-serif; }
    a { color:inherit; text-decoration:none; }
    a:focus-visible { outline:2px solid #fa8590; outline-offset:4px; }
    .shell { width:min(1160px,calc(100% - 40px)); margin:0 auto; }
    .site-header { position:sticky; top:0; z-index:10; border-bottom:1px solid var(--line); background:rgba(8,27,51,.9); backdrop-filter:blur(16px); }
    .header-inner { display:flex; align-items:center; justify-content:space-between; min-height:78px; gap:24px; }
    .brand { display:flex; align-items:center; gap:12px; min-width:0; }
    .brand img { width:48px; height:48px; border-radius:12px; background:#fff; }
    .brand strong { display:block; font-size:13px; line-height:1.2; letter-spacing:.15em; }
    .brand small { display:block; margin-top:4px; color:var(--muted); font-size:10px; letter-spacing:.12em; text-transform:uppercase; }
    nav.primary-nav { display:flex; flex-wrap:wrap; gap:18px; color:var(--muted); font-size:13px; }
    nav a:hover, footer a:hover { color:#fff; }
    main { padding:64px 0 88px; }
    .eyebrow { margin:0 0 12px; color:#fa8590; font-size:11px; font-weight:800; letter-spacing:.2em; text-transform:uppercase; }
    h1,h2,h3,p { margin-top:0; }
    h1 { max-width:900px; margin-bottom:16px; font-size:clamp(38px,7vw,76px); line-height:.98; letter-spacing:-.055em; }
    h2 { font-size:clamp(24px,4vw,38px); line-height:1.08; letter-spacing:-.035em; }
    .intro { max-width:720px; margin-bottom:28px; color:#d5dfec; font-size:18px; }
    .actions { display:flex; flex-wrap:wrap; gap:10px; margin:26px 0 42px; }
    .button { display:inline-flex; align-items:center; justify-content:center; min-height:46px; padding:11px 20px; border:1px solid var(--red); border-radius:999px; background:var(--red); color:#fff; font-weight:750; }
    .button.secondary { border-color:var(--line); background:transparent; }
    .visit,.editorial article,.faq article { border:1px solid var(--line); border-radius:20px; background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018)); }
    .visit { margin:42px 0; padding:clamp(24px,5vw,46px); }
    .editorial { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr)); gap:16px; margin:38px 0; }
    .editorial article { padding:24px; }
    .editorial h2 { font-size:22px; }
    .editorial p,.faq p { color:var(--muted); }
    .inventory { margin-top:54px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr)); gap:16px; }
    .card { overflow:hidden; border:1px solid var(--line); border-radius:18px; background:var(--panel); }
    .card img { display:block; width:100%; aspect-ratio:1; object-fit:cover; background:#0d2444; }
    .card-copy { padding:16px; }
    .kicker { color:#fa8590; font-size:10px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; }
    .card h2 { margin:5px 0 8px; font-size:18px; letter-spacing:-.02em; }
    .card p { margin:0; color:var(--muted); font-size:13px; }
    .faq { margin-top:54px; }
    .faq-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr)); gap:14px; }
    .faq article { padding:20px; }
    .faq h3 { margin-bottom:8px; font-size:16px; }
    .detail { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr)); gap:clamp(24px,5vw,56px); align-items:start; }
    .detail>img { width:100%; max-height:640px; object-fit:contain; border:1px solid var(--line); border-radius:24px; background:#0d2444; }
    .specs { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr)); gap:10px; margin-top:30px; }
    .spec { padding:14px; border:1px solid var(--line); border-radius:12px; color:var(--muted); }
    .spec b { display:block; margin-bottom:4px; color:var(--ink); font-size:11px; letter-spacing:.1em; text-transform:uppercase; }
    footer { border-top:1px solid var(--line); padding:28px 0 40px; color:var(--muted); font-size:13px; }
    .footer-nav { display:flex; flex-wrap:wrap; gap:10px 18px; margin-bottom:20px; }
    @media(max-width:680px) { .header-inner { align-items:flex-start; flex-direction:column; padding:13px 0; gap:12px; } nav.primary-nav { gap:12px; font-size:12px; } main { padding-top:42px; } }
  </style>
</head>`;

const pageHeader = () => `<header class="site-header"><div class="shell header-inner"><a class="brand" href="/" aria-label="London Tech home"><img src="/assets/london-tech-mark.png" alt="" width="48" height="48"><span><strong>LONDON TECH</strong><small>London Technology Store</small></span></a><nav class="primary-nav" aria-label="Primary navigation"><a href="/collections/shop/">Shop</a><a href="/collections/mobiles/">Phones</a><a href="/collections/laptops/">Laptops</a><a href="/collections/audio/">Audio</a><a href="/collections/visit/">Store information</a></nav></div></header>`;

const pageFooter = () => `<footer><div class="shell"><nav class="footer-nav" aria-label="Explore London Tech">${collectionPages.map((page) => `<a href="/collections/${page.slug}/">${escapeHtml(page.slug === 'shop' ? 'Shop all technology' : page.title)}</a>`).join('')}</nav><p>London Tech · London Technology Store. Confirmed address, opening hours and contact details will appear on the store information page.</p></div></footer>`;

const productCard = (product) => `<article class="card"><a href="${productUrl(product.id).replace(siteUrl, '')}"><img src="${escapeHtml(productImage(product).replace(siteUrl, ''))}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async"><div class="card-copy"><span class="kicker">${escapeHtml(categoryName(product.cat))}</span><h2>${escapeHtml(product.name)}</h2><p>${escapeHtml(product.blurb)}</p></div></a></article>`;

const renderFaq = (faqs = collectionFaqs) => `<section class="faq" aria-labelledby="questions-title"><p class="eyebrow">Before you choose</p><h2 id="questions-title">Product information</h2><div class="faq-grid">${faqs.map(({ question, answer }) => `<article><h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p></article>`).join('')}</div></section>`;

const renderCollection = (page, catalog) => {
  const canonical = collectionUrl(page.slug);
  const products = productsForCollection(page, catalog);
  const image = products.length ? productImage(products[0]) : absoluteUrl('assets/london-tech-social-card.png');
  const listRoute = page.productFilter === 'iphone' || page.productFilter === 'samsung-ultra'
    ? '/#/shop/mobiles'
    : page.slug === 'shop' || page.productFilter === 'apple'
      ? '/#/shop'
      : `/#/shop/${page.categories?.[0] || 'all'}`;
  const faqs = page.slug === 'visit'
    ? [{
        question: 'Where is London Tech located?',
        answer: 'London Tech is a London technology store. The confirmed street address and opening hours will be published here.'
      }, ...collectionFaqs.slice(1)]
    : collectionFaqs;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      website,
      {
        '@type': page.slug === 'visit' ? 'WebPage' : 'CollectionPage',
        '@id': canonical,
        url: canonical,
        name: page.title,
        description: page.description,
        inLanguage: 'en-GB',
        isPartOf: { '@id': `${siteUrl}/#website` },
        ...(page.slug === 'visit' ? {} : {
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: products.length,
            itemListElement: products.map((product, index) => ({
              '@type': 'ListItem', position: index + 1, url: productUrl(product.id), name: product.name
            }))
          }
        })
      },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: page.title, item: canonical }
      ] },
      faqSchema(faqs),
      ...navigation()
    ]
  };

  if (page.slug === 'visit') {
    return `${head({ title: page.title, description: page.description, canonical, image, schema })}<body>${pageHeader()}<main class="shell"><p class="eyebrow">London Technology Store</p><h1>Store information.</h1><p class="intro">London Tech is a London technology store. Confirmed address, opening hours and contact details will be added here.</p><section class="visit"><h2>Plan your visit</h2><p>Store location, collection options and opening hours are being confirmed. Explore the product catalogue in the meantime.</p><div class="actions"><a class="button" href="/collections/shop/">Explore the catalogue</a><a class="button secondary" href="/#/visit">Open store information</a></div></section>${renderFaq(faqs)}</main>${pageFooter()}</body></html>`;
  }

  return `${head({ title: page.title, description: page.description, canonical, image, schema })}<body>${pageHeader()}<main class="shell"><p class="eyebrow">London Tech · London</p><h1>${escapeHtml(page.title)}.</h1><p class="intro">${escapeHtml(page.description)} Product information is provided for comparison; availability, pricing and service terms are confirmed before purchase.</p><div class="actions"><a class="button" href="${listRoute}">Browse in the interactive shop</a><a class="button secondary" href="/collections/visit/">Store information</a></div><section class="inventory" aria-labelledby="inventory-title"><p class="eyebrow">Explore the catalogue</p><h2 id="inventory-title">${escapeHtml(page.title)}</h2><div class="grid" aria-label="${escapeHtml(page.title)} catalogue">${products.map(productCard).join('')}</div></section>${renderFaq()}</main>${pageFooter()}</body></html>`;
};

const renderProduct = (product) => {
  const canonical = productUrl(product.id);
  const specs = Array.isArray(product.specs) ? product.specs : [];
  const categorySlug = categoryCollection[product.cat] || 'shop';
  const productBrand = /iphone|ipad|macbook|apple watch|airpods|beats/i.test(product.name)
    ? 'Apple'
    : /samsung|galaxy/i.test(product.name) ? 'Samsung' : null;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      website,
      {
        '@type': 'Product',
        '@id': canonical,
        url: canonical,
        name: product.name,
        description: product.blurb,
        image: productImage(product),
        sku: product.id,
        category: categoryName(product.cat),
        ...(productBrand ? { brand: { '@type': 'Brand', name: productBrand } } : {}),
        additionalProperty: specs.map(([name, value]) => ({ '@type': 'PropertyValue', name, value }))
      },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: categoryName(product.cat), item: collectionUrl(categorySlug) },
        { '@type': 'ListItem', position: 3, name: product.name, item: canonical }
      ] }
    ]
  };
  const specMarkup = specs.map(([name, value]) => `<div class="spec"><b>${escapeHtml(name)}</b>${escapeHtml(value)}</div>`).join('');
  const description = `${product.blurb} Product information is provided for comparison. London Tech confirms availability, pricing and applicable service terms before purchase.`;
  return `${head({ title: product.name, description, canonical, image: productImage(product), schema })}<body>${pageHeader()}<main class="shell"><p class="eyebrow"><a href="/collections/${categorySlug}/">${escapeHtml(categoryName(product.cat))}</a> · London Tech</p><section class="detail"><img src="${escapeHtml(productImage(product).replace(siteUrl, ''))}" alt="${escapeHtml(product.name)}" loading="eager"><div><h1>${escapeHtml(product.name)}.</h1><p class="intro">${escapeHtml(product.blurb)}</p><section class="visit"><h2>Product information</h2><p>Use these details to compare models. Availability, pricing, warranty and service information are confirmed by London Tech before purchase.</p><div class="actions"><a class="button" href="/collections/visit/">Store information</a><a class="button secondary" href="/#/p/${encodeURIComponent(product.id)}">Open product gallery</a></div></section><div class="specs">${specMarkup}</div></div></section></main>${pageFooter()}</body></html>`;
};

const sitemap = (urls) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>
`;

const savePage = async (output, route, document) => {
  const directory = path.join(output, route);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'index.html'), document, 'utf8');
};

export const buildSeoPages = async ({ sourceHtml, output }) => {
  const catalog = parseCatalog(sourceHtml);
  await Promise.all(collectionPages.map((page) => savePage(output, `collections/${page.slug}`, renderCollection(page, catalog))));
  await Promise.all(catalog.map((product) => savePage(output, `products/${product.id}`, renderProduct(product))));

  const urls = [
    `${siteUrl}/`,
    ...collectionPages.map((page) => collectionUrl(page.slug)),
    ...catalog.map((product) => productUrl(product.id))
  ];
  await writeFile(path.join(output, 'sitemap.xml'), sitemap(urls), 'utf8');
  await writeFile(path.join(output, 'robots.txt'), `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`, 'utf8');

  return { catalogCount: catalog.length, collectionCount: collectionPages.length, sitemapCount: urls.length };
};
