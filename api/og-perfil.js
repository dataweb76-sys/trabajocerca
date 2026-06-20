/**
 * Vercel Serverless Function — /api/og-perfil?id=UUID
 * Devuelve HTML con Open Graph tags para el perfil público de un profesional.
 * Facebook/WhatsApp scrapers llaman a esta URL via rewrite en vercel.json
 */

const SUPABASE_URL = 'https://iqeiszkoifxgygoqvbem.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs'

export default async function handler(req, res) {
  const { id } = req.query

  if (!id) {
    return res.redirect(302, 'https://www.trabajoscerca.com.ar/perfil_publico')
  }

  let nombre = 'Profesional en Trabajos Cerca'
  let descripcion = 'Encontrá profesionales y oficios cerca tuyo en Trabajos Cerca.'
  let imagen = 'https://www.trabajoscerca.com.ar/logo.png'
  let oficio = ''

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/perfiles?id=eq.${id}&select=nombre,apellido,nombre_empresa,oficio,descripcion,foto_url,avatar_url`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    const data = await r.json()
    const p = data?.[0]

    if (p) {
      nombre = p.nombre_empresa || `${p.nombre || ''} ${p.apellido || ''}`.trim() || nombre
      oficio = p.oficio || ''
      descripcion = p.descripcion
        ? p.descripcion.slice(0, 200)
        : oficio
          ? `${nombre} — ${oficio} en Trabajos Cerca. Contactá directamente desde la plataforma.`
          : descripcion
      if (p.foto_url || p.avatar_url) {
        imagen = p.foto_url || p.avatar_url
      }
    }
  } catch (_) {}

  const titulo = oficio ? `${nombre} — ${oficio}` : nombre
  const url = `https://www.trabajoscerca.com.ar/perfil_publico?id=${id}`

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${esc(titulo)} | Trabajos Cerca</title>
  <meta name="description" content="${esc(descripcion)}">

  <!-- Open Graph -->
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${esc(titulo)}">
  <meta property="og:description" content="${esc(descripcion)}">
  <meta property="og:image" content="${esc(imagen)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:site_name" content="Trabajos Cerca">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(titulo)}">
  <meta name="twitter:description" content="${esc(descripcion)}">
  <meta name="twitter:image" content="${esc(imagen)}">

  <!-- WhatsApp usa og: tags -->

  <meta http-equiv="refresh" content="0;url=${esc(url)}">
</head>
<body>
  <p>Redirigiendo a <a href="${esc(url)}">${esc(titulo)}</a>…</p>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  res.status(200).send(html)
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
