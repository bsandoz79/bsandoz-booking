/**
 * Après `vite build` : une page HTML par route publique, avec son titre, sa description, son adresse canonique, les
 * données structurées et un contenu lisible sans JavaScript (remplacé par l'application au chargement), plus
 * sitemap.xml et robots.txt. Adresse du site : VITE_SITE_URL (par défaut https://demo.bsandoz.fr).
 *   node --experimental-strip-types scripts/prerender.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMUNES, MOTS_CLES, PAGES_SEO, PRESTATIONS_SEO, donneesStructurees, type PageSeo } from '../src/seo/donnees.ts';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const urlSite = (process.env.VITE_SITE_URL || 'https://demo.bsandoz.fr').replace(/\/$/, '');
const modele = readFileSync(join(dist, 'index.html'), 'utf-8');

const echapper = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonLd = JSON.stringify(donneesStructurees(urlSite)).replace(/</g, '\\u003c');

function contenu(page: PageSeo): string {
  const parties = [`<h1>${echapper(page.h1)}</h1>`];
  if (page.texte) parties.push(`<p>${echapper(page.texte)}</p>`);
  if (page.chemin === '/' || page.chemin.startsWith('/nettoyage-voiture/')) {
    parties.push('<h2>Prestations</h2><ul>' + PRESTATIONS_SEO.map((p) => `<li>${echapper(p.nom)} (${echapper(p.detail)}) : à partir de ${p.aPartirDe} €</li>`).join('') + '</ul>');
    parties.push('<h2>Communes desservies autour d’Abbeville</h2><ul>' + COMMUNES.map((c) => `<li><a href="/nettoyage-voiture/${c.slug}">Nettoyage voiture ${echapper(c.nom)}</a></li>`).join('') + '</ul>');
    parties.push('<p><a href="/reserver">Réserver un créneau en ligne</a></p>');
  }
  return `<main class="container">${parties.join('')}</main>`;
}

function html(page: PageSeo): string {
  const url = `${urlSite}${page.chemin === '/' ? '/' : page.chemin}`;
  const tete = [
    `<title>${echapper(page.titre)}</title>`,
    `<meta name="description" content="${echapper(page.description)}" />`,
    `<meta name="keywords" content="${echapper(MOTS_CLES)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="fr_FR" />`,
    `<meta property="og:site_name" content="Perfect Clean" />`,
    `<meta property="og:title" content="${echapper(page.titre)}" />`,
    `<meta property="og:description" content="${echapper(page.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${urlSite}/icon-512.png" />`,
    `<meta name="geo.region" content="FR-80" />`,
    `<meta name="geo.placename" content="Abbeville" />`,
    `<script type="application/ld+json">${jsonLd}</script>`,
  ].join('\n    ');

  return modele
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace('</head>', `    ${tete}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${contenu(page)}</div>`);
}

for (const page of PAGES_SEO) {
  // « /cgv » → dist/cgv.html, servi par le .htaccess sans redirection (pas de dossier, donc pas de « / » final ajouté).
  const fichier = page.chemin === '/' ? join(dist, 'index.html') : join(dist, `${page.chemin}.html`);
  mkdirSync(dirname(fichier), { recursive: true });
  writeFileSync(fichier, html(page));
}

const aujourdhui = new Date().toISOString().slice(0, 10);
writeFileSync(join(dist, 'sitemap.xml'), [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...PAGES_SEO.map((p) => `  <url><loc>${urlSite}${p.chemin}</loc><lastmod>${aujourdhui}</lastmod><priority>${p.chemin === '/' ? '1.0' : p.chemin.startsWith('/nettoyage-voiture/') ? '0.8' : '0.3'}</priority></url>`),
  '</urlset>',
  '',
].join('\n'));

writeFileSync(join(dist, 'robots.txt'), [
  'User-agent: *',
  'Allow: /',
  'Disallow: /pro',
  'Disallow: /mon-espace',
  'Disallow: /compte/',
  'Disallow: /rendez-vous',
  'Disallow: /confirmation',
  '',
  `Sitemap: ${urlSite}/sitemap.xml`,
  '',
].join('\n'));

console.log(`Référencement : ${PAGES_SEO.length} pages, sitemap.xml et robots.txt générés pour ${urlSite}.`);
