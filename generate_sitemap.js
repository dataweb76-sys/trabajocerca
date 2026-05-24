const fs   = require('fs')
const path = require('path')

const SITE = "https://trabajoscerca.com.ar"
const HOY  = new Date().toISOString().split('T')[0]

const PAGINAS_PRINCIPALES = [
  { url: "/",                          priority: "1.0", changefreq: "daily"   },
  { url: "/buscador_oficios",          priority: "0.9", changefreq: "daily"   },
  { url: "/buscador_profesionales",    priority: "0.9", changefreq: "daily"   },
  { url: "/mapa",                      priority: "0.8", changefreq: "weekly"  },
  { url: "/pedidos",                   priority: "0.8", changefreq: "daily"   },
  { url: "/buscador_trabajos",         priority: "0.7", changefreq: "daily"   },
  { url: "/buscador_cv",               priority: "0.7", changefreq: "daily"   },
  { url: "/registro",                  priority: "0.6", changefreq: "monthly" },
  { url: "/registro_profesional",      priority: "0.6", changefreq: "monthly" },
]

const OFICIOS = ["plomero","electricista","gasista","albanil","pintor","carpintero","cerrajero","jardinero"]
const CIUDADES = ["buenos-aires","cordoba","rosario","mendoza","la-plata","mar-del-plata","tucuman","salta"]

const paginas_seo = []
for(const o of OFICIOS){
  for(const c of CIUDADES){
    paginas_seo.push({ url: `/${o}-en-${c}`, priority: "0.8", changefreq: "weekly" })
  }
}

const todas = [...PAGINAS_PRINCIPALES, ...paginas_seo]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${todas.map(p => `  <url>
    <loc>${SITE}${p.url}</loc>
    <lastmod>${HOY}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), xml, 'utf8')
console.log(`✅ sitemap.xml generado con ${todas.length} URLs`)
