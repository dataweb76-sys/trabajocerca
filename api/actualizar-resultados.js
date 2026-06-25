/**
 * Cron job — raspa canchallena y guarda resultados en Supabase mundial_partidos
 * Vercel cron: cada 5 minutos
 */

const SB_URL = 'https://iqeiszkoifxgygoqvbem.supabase.co'
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs'

const HDR = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
  'Accept-Language': 'es-AR,es;q=0.9',
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    // Cargar equipos de Supabase para poder hacer el match por nombre
    const eqRes = await fetch(`${SB_URL}/rest/v1/mundial_equipos?select=*`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
    })
    const equipos = await eqRes.json()
    const equipoMap = {} // nombre_normalizado -> {id, codigo, nombre}
    for (const e of equipos) {
      equipoMap[norm(e.nombre)] = e
      if (e.codigo) equipoMap[e.codigo.toLowerCase()] = e
    }

    // Raspar múltiples páginas del fixture de canchallena
    const resultados = []
    const urls = [
      'https://canchallena.lanacion.com.ar/futbol/mundial/fixture/',
      'https://canchallena.lanacion.com.ar/futbol/mundial/grupos/',
    ]
    for (let fecha = 1; fecha <= 20; fecha++) {
      urls.push(`https://canchallena.lanacion.com.ar/futbol/mundial/fixture/?fecha=${fecha}`)
    }

    const htmls = await Promise.allSettled(
      urls.map(u => fetch(u, { headers: HDR }).then(r => r.ok ? r.text() : ''))
    )

    const vistos = new Set()
    for (const { value: html } of htmls) {
      if (!html) continue
      const partidos = parsearHTML(html)
      for (const p of partidos) {
        if (p.estado !== 'FT' && p.estado !== 'LIVE') continue
        const key = `${norm(p.localNombre)}|${norm(p.visitanteNombre)}`
        if (vistos.has(key)) continue
        vistos.add(key)
        resultados.push(p)
      }
    }

    // Actualizar Supabase
    let actualizados = 0
    for (const p of resultados) {
      const eq1 = buscarEquipo(p.localNombre, equipoMap)
      const eq2 = buscarEquipo(p.visitanteNombre, equipoMap)
      if (!eq1 || !eq2) continue

      const patch = {
        goles_local: p.golesL,
        goles_visitante: p.golesV,
        completado: p.estado === 'FT',
      }

      const r = await fetch(
        `${SB_URL}/rest/v1/mundial_partidos?equipo_local_id=eq.${eq1.id}&equipo_visitante_id=eq.${eq2.id}&fase=eq.grupo`,
        {
          method: 'PATCH',
          headers: {
            apikey: SB_KEY,
            Authorization: `Bearer ${SB_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(patch),
        }
      )
      if (r.ok) actualizados++
    }

    res.status(200).json({ ok: true, resultados: resultados.length, actualizados, ts: Date.now() })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '').trim()

function buscarEquipo(nombre, map) {
  const n = norm(nombre)
  if (map[n]) return map[n]
  // Buscar por primeras 4 letras
  const prefix = n.slice(0, 5)
  for (const [k, v] of Object.entries(map)) {
    if (k.startsWith(prefix) || k.includes(prefix)) return v
  }
  return null
}

function getState(html) {
  const i = html.indexOf('window.__PRELOADED_STATE__')
  if (i < 0) return null
  const s = html.indexOf('{', i)
  if (s < 0) return null
  let d = 0, inStr = false, esc = false
  for (let j = s; j < html.length; j++) {
    const c = html[j]
    if (esc) { esc = false; continue }
    if (c === '\\' && inStr) { esc = true; continue }
    if (c === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (c === '{') d++
    else if (c === '}') { d--; if (d === 0) { try { return JSON.parse(html.slice(s, j + 1)) } catch { return null } } }
  }
  return null
}

function parsearPartido(m, fecha) {
  const home = m.homeTeam || {}
  const away = m.awayTeam || {}
  const st = m.matchStatus
  const fin  = st == 1 || m.postGameText === 'Final'
  const vivo = st == 3 || st == 2
  const gl = fin || vivo ? parseInt(m.score?.homeTeam?.goals ?? home.score ?? '') : null
  const gv = fin || vivo ? parseInt(m.score?.awayTeam?.goals ?? away.score ?? '') : null
  return {
    fecha,
    localNombre:     home.name || home.shortName || '',
    localLogo:       home.imgProps?.src || '',
    golesL:          isNaN(gl) ? null : gl,
    golesV:          isNaN(gv) ? null : gv,
    visitanteNombre: away.name || away.shortName || '',
    visitanteLogo:   away.imgProps?.src || '',
    estado:          fin ? 'FT' : vivo ? 'LIVE' : 'PRG',
  }
}

function parsearHTML(html) {
  const state = getState(html)
  if (!state) return []
  const partidos = []
  // Probar múltiples keys posibles
  const buscar = (obj) => {
    if (!obj || typeof obj !== 'object') return
    if (obj.dayMatchesData) {
      for (const day of obj.dayMatchesData) {
        const fecha = day.dataHeader?.text || day.dataHeader?.title || ''
        for (const m of (day.tableBody || [])) {
          partidos.push(parsearPartido(m, fecha))
        }
      }
    }
    for (const v of Object.values(obj)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) buscar(v)
    }
  }
  buscar(state)
  return partidos
}
