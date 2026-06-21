const fs = require('fs')
const path = require('path')

const today = new Date().toISOString().split('T')[0]

const oficios = [
  'plomero','electricista','gasista','albanil','pintor','carpintero',
  'cerrajero','jardinero','mecanico','techista','herrero','fumigador',
  'mudanzas','limpieza','contador','abogado','arquitecto','psicologo',
  'veterinario','kinesiologo','profesor-particular'
]

const ciudades = [
  'buenos-aires','cordoba','rosario','mendoza',
  'la-plata','mar-del-plata','tucuman','salta'
]

const staticUrls = [
  { loc: '/',                    freq: 'daily',   pri: '1.0' },
  { loc: '/buscador_oficios',    freq: 'daily',   pri: '0.9' },
  { loc: '/buscador_profesionales', freq: 'daily',pri: '0.9' },
  { loc: '/mapa',                freq: 'weekly',  pri: '0.8' },
  { loc: '/pedidos',             freq: 'daily',   pri: '0.8' },
  { loc: '/buscador_trabajos',   freq: 'daily',   pri: '0.7' },
  { loc: '/buscador_cv',         freq: 'daily',   pri: '0.7' },
  { loc: '/registro',            freq: 'monthly', pri: '0.6' },
]

function url(loc, freq, pri) {
  return `  <url>\n    <loc>https://www.trabajoscerca.com.ar${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${pri}</priority>\n  </url>`
}

const entries = [
  ...staticUrls.map(u => url(u.loc, u.freq, u.pri)),
  ...oficios.flatMap(o => ciudades.map(c => url(`/${o}-en-${c}`, 'weekly', '0.8')))
]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>\n`

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), xml, 'utf8')
console.log(`Sitemap generado: ${entries.length} URLs — fecha ${today}`)
