/**
 * Vercel Serverless Function — /api/mundial-datos
 * Raspa canchallena.lanacion.com.ar para obtener resultados del Mundial 2026
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=90, stale-while-revalidate=300')

  const BASE = 'https://canchallena.lanacion.com.ar/futbol/mundial'
  const HDR  = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-AR,es;q=0.9',
    'Cache-Control': 'no-cache',
  }

  try {
    // Buscar en fixture (tiene todas las fechas paginadas) y grupos (tiene standings)
    const [htmlFix, htmlGrupos] = await Promise.all([
      fetch(`${BASE}/fixture/`, { headers: HDR }).then(r => r.text()),
      fetch(`${BASE}/grupos/`,  { headers: HDR }).then(r => r.text()),
    ])

    const partidos = extraerPartidos(htmlFix)
    const grupos   = extraerGrupos(htmlGrupos)

    // Si el fixture solo trajo partidos próximos, complementar con resultados
    // buscando en el state de grupos (tiene los últimos partidos también)
    const terminados = partidos.filter(p => p.estado === 'FT').length
    if (terminados < 10) {
      const ptGrupos = extraerPartidosDeGrupos(htmlGrupos)
      const vistos = new Set(partidos.map(p => norm(p.localNombre) + '|' + norm(p.visitanteNombre)))
      for (const p of ptGrupos) {
        const key = norm(p.localNombre) + '|' + norm(p.visitanteNombre)
        if (!vistos.has(key)) { partidos.push(p); vistos.add(key) }
      }
    }

    res.status(200).json({ ok: true, partidos, grupos, ts: Date.now() })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
}

const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim()

/* ── Helpers ─────────────────────────────────────────────────────────── */
function getPreloadedState(html) {
  const idx   = html.indexOf('window.__PRELOADED_STATE__')
  if (idx < 0) return null
  const start = html.indexOf('{', idx)
  if (start < 0) return null

  let depth = 0, inStr = false, escape = false
  for (let i = start; i < html.length; i++) {
    const c = html[i]
    if (escape)              { escape = false; continue }
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

function parsearPartido(m, fecha) {
  const home   = m.homeTeam || {}
  const away   = m.awayTeam || {}
  // matchStatus puede ser número o string: 1=Final, 0=Programado, 3=EnVivo
  const status = m.matchStatus
  const terminado = status == 1 || status === '1' || m.postGameText === 'Final'
  const enVivo    = status == 3 || status === '3' || status == 2 || status === '2'

  const golesL = terminado || enVivo
    ? (parseInt(m.score?.homeTeam?.goals ?? m.homeScore ?? home.score ?? '') ?? null)
    : null
  const golesV = terminado || enVivo
    ? (parseInt(m.score?.awayTeam?.goals ?? m.awayScore ?? away.score ?? '') ?? null)
    : null

  return {
    fecha,
    local:            home.code || home.name || '?',
    localNombre:      home.name || home.shortName || '',
    localLogo:        home.imgProps?.src || home.logo || '',
    golesL:           isNaN(golesL) ? null : golesL,
    golesV:           isNaN(golesV) ? null : golesV,
    visitante:        away.code || away.name || '?',
    visitanteNombre:  away.name || away.shortName || '',
    visitanteLogo:    away.imgProps?.src || away.logo || '',
    hora:             m.matchDateUTC
      ? new Date(m.matchDateUTC).toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit', timeZone:'America/Argentina/Buenos_Aires' })
      : (m.matchHour || ''),
    fechaISO:         m.matchDateUTC || m.dateISO || '',
    estado:           terminado ? 'FT' : enVivo ? 'LIVE' : 'PRG',
    grupo:            m.group || m.groupName || '',
    fase:             m.round || m.phase || '',
    matchId:          m.matchId || m.id || '',
  }
}

/* ── Partidos desde fixture ────────────────────────────────────────────── */
function extraerPartidos(html) {
  const state    = getPreloadedState(html)
  const partidos = []

  // Múltiples keys posibles donde canchallena guarda los partidos
  const days = state?.fixtureReducer?.fixtureData?.fixture?.dayMatchesData
    || state?.fixtureReducer?.fixture?.dayMatchesData
    || state?.matchesReducer?.fixture?.dayMatchesData
    || []

  days.forEach(day => {
    const fecha = day.dataHeader?.text || day.dataHeader?.title || ''
    ;(day.tableBody || []).forEach(m => partidos.push(parsearPartido(m, fecha)))
  })

  return partidos
}

/* ── Partidos adicionales desde página de grupos ─────────────────────── */
function extraerPartidosDeGrupos(html) {
  const state    = getPreloadedState(html)
  const partidos = []

  const fuentes = [
    state?.fixtureReducer?.fixtureData?.fixture?.dayMatchesData,
    state?.fixtureReducer?.fixture?.dayMatchesData,
    state?.matchesReducer?.fixture?.dayMatchesData,
    state?.groupsReducer?.matches,
  ].filter(Array.isArray)

  for (const days of fuentes) {
    days.forEach(item => {
      const fecha = item.dataHeader?.text || item.dataHeader?.title || item.date || ''
      const rows  = item.tableBody || (item.matchId ? [item] : [])
      rows.forEach(m => partidos.push(parsearPartido(m, fecha)))
    })
  }

  return partidos
}

/* ── Grupos / Standings ────────────────────────────────────────────────── */
function extraerGrupos(html) {
  const state  = getPreloadedState(html)
  const tables = state?.standingsReducer?.groupsLeaderboards?.tables
    || state?.standingsReducer?.tables
    || []
  const grupos = {}

  tables.forEach(tabla => {
    const nombre     = tabla.name || tabla.groupName || ''
    const letraMatch = nombre.match(/Grupo\s*([A-L])/i)
    if (!letraMatch) return
    const letra = letraMatch[1].toUpperCase()

    grupos[letra] = (tabla.dataBody || tabla.rows || []).map(e => ({
      equipo: e.team?.name || e.teamName || '?',
      logo:   e.team?.imgProps?.src || e.teamLogo || '',
      pos:    e.position || 0,
      pts:    e.points   || 0,
      pj:     e.playedST || e.played || 0,
      pg:     e.wonST    || e.won    || 0,
      pe:     e.tiedST   || e.drawn  || 0,
      pp:     e.lostST   || e.lost   || 0,
      gf:     e.goalsMade    || e.goalsFor     || 0,
      gc:     e.goalsAgainst || e.goalsAgainst || 0,
      dg:     e.difference   || 0,
    }))
  })

  return grupos
}
