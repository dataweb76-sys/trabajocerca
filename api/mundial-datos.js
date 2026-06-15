/**
 * Vercel Serverless Function — /api/mundial-datos
 * Lee window.__PRELOADED_STATE__ de canchallena y devuelve JSON limpio.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=90, stale-while-revalidate=300')

  const BASE = 'https://canchallena.lanacion.com.ar/futbol/mundial'
  const HDR  = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'es-AR,es;q=0.9'
  }

  try {
    const [htmlFix, htmlGrupos, htmlGol] = await Promise.all([
      fetch(`${BASE}/fixture/`, { headers: HDR }).then(r => r.text()),
      fetch(`${BASE}/grupos/`,  { headers: HDR }).then(r => r.text()),
      fetch(`${BASE}/goleadores/`, { headers: HDR }).then(r => r.text()),
    ])

    const partidos   = extraerPartidos(htmlFix)
    const grupos     = extraerGrupos(htmlGrupos)
    const goleadores = extraerGoleadores(htmlGol)

    res.status(200).json({ ok: true, partidos, grupos, goleadores, ts: Date.now() })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
function getPreloadedState(html) {
  const idx   = html.indexOf('window.__PRELOADED_STATE__')
  if (idx < 0) return null
  const start = html.indexOf('{', idx)
  if (start < 0) return null

  // Balancear llaves para encontrar el cierre exacto del objeto JSON
  let depth = 0, inStr = false, escape = false
  for (let i = start; i < html.length; i++) {
    const c = html[i]
    if (escape)            { escape = false; continue }
    if (c === '\\' && inStr) { escape = true;  continue }
    if (c === '"')           { inStr = !inStr;  continue }
    if (inStr)               continue
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        try { return JSON.parse(html.slice(start, i + 1)) }
        catch { return null }
      }
    }
  }
  return null
}

/* ── Partidos ─────────────────────────────────────────────────────────── */
function extraerPartidos(html) {
  const state = getPreloadedState(html)
  const days  = state?.fixtureReducer?.fixtureData?.fixture?.dayMatchesData || []
  const partidos = []

  days.forEach(day => {
    const fecha = day.dataHeader?.text || day.dataHeader?.title || ''
    ;(day.tableBody || []).forEach(m => {
      const home = m.homeTeam || {}
      const away = m.awayTeam || {}
      const status = m.matchStatus  // "1"=final, "0"=scheduled, "3"=live
      const terminado = status === '1' || m.postGameText === 'Final'
      const enVivo    = status === '3' || status === '2'

      partidos.push({
        fecha,
        local:     home.code || home.name || '?',
        localNombre: home.name || '',
        localLogo:   home.imgProps?.src || '',
        golesL:    terminado || enVivo ? parseInt(m.score?.homeTeam?.goals ?? home.score ?? '') : null,
        golesV:    terminado || enVivo ? parseInt(m.score?.awayTeam?.goals ?? away.score ?? '') : null,
        visitante: away.code || away.name || '?',
        visitanteNombre: away.name || '',
        visitanteLogo:   away.imgProps?.src || '',
        hora:      m.matchDateUTC ? new Date(m.matchDateUTC).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) : '',
        fechaISO:  m.matchDateUTC || m.dateISO || '',
        estado:    terminado ? 'FT' : enVivo ? 'LIVE' : 'PRG',
        matchId:   m.matchId || '',
      })
    })
  })

  return partidos
}

/* ── Grupos ───────────────────────────────────────────────────────────── */
function extraerGrupos(html) {
  const state  = getPreloadedState(html)
  const tables = state?.standingsReducer?.groupsLeaderboards?.tables || []
  const grupos = {}

  tables.forEach(tabla => {
    const nombreGrupo = tabla.name || ''  // "Grupo A", "Grupo B" ...
    const letraMatch  = nombreGrupo.match(/Grupo\s+([A-Z])/i)
    if (!letraMatch) return
    const letra = letraMatch[1].toUpperCase()

    grupos[letra] = (tabla.dataBody || []).map(e => ({
      equipo: e.team?.name || '?',
      logo:   e.team?.imgProps?.src || '',
      pos:    e.position || 0,
      pts:    e.points   || 0,
      pj:     e.playedST || 0,
      pg:     e.wonST    || 0,
      pe:     e.tiedST   || 0,
      pp:     e.lostST   || 0,
      gf:     e.goalsMade    || 0,
      gc:     e.goalsAgainst || 0,
      dg:     e.difference || '0',
    }))
  })

  return grupos
}

/* ── Goleadores ───────────────────────────────────────────────────────── */
function extraerGoleadores(html) {
  const state = getPreloadedState(html)

  // Buscar en varios lugares posibles
  const scorers = state?.standingsReducer?.topScorers
                || state?.scorersReducer?.topScorers
                || state?.fixtureReducer?.topScorers
                || null

  if (!scorers) return []

  // Puede ser objeto o array
  const lista = Array.isArray(scorers) ? scorers
    : Object.values(scorers).find(v => Array.isArray(v)) || []

  return lista.slice(0, 20).map(s => ({
    nombre: s.player?.name || s.name || s.fullName || '?',
    equipo: s.team?.name || s.teamName || '',
    logo:   s.team?.imgProps?.src || s.teamLogo || '',
    goles:  s.goals || s.goalsCount || s.value || 0,
  }))
}
