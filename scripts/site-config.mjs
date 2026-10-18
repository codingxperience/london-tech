const fallbackSiteUrl = 'https://london-tech.vercel.app';
const configuredSiteUrl = (process.env.PUBLIC_SITE_URL || fallbackSiteUrl).trim().replace(/\/+$/, '');

let parsedSiteUrl;
try {
  parsedSiteUrl = new URL(configuredSiteUrl);
} catch {
  throw new Error(`PUBLIC_SITE_URL is not a valid absolute URL: ${configuredSiteUrl}`);
}

if (parsedSiteUrl.protocol !== 'https:' || parsedSiteUrl.pathname !== '/' || parsedSiteUrl.search || parsedSiteUrl.hash) {
  throw new Error('PUBLIC_SITE_URL must be an HTTPS origin without a path, query string or fragment.');
}

export const siteUrl = configuredSiteUrl;

const previewOrigins = ['https://london-tech.vercel.app'];

export const rewriteSiteOrigin = (source) => previewOrigins.reduce(
  (result, origin) => result.replaceAll(origin, siteUrl),
  source
);
