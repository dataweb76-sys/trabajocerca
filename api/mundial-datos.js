export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')

  const HDR = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
    'Accept-Language': 'es-AR,es;q=0.9',
  }

  try {
    const [htmlFix, htmlGrupos] = await Promise.all([
      fetch('https://canchallena.lanacion.com.ar/futbol/mundial/fixture/', { headers: HDR }).then(r => r.text()),
      fetch('https://canchallena.lanacion.com.ar/futbol/mundial/grupos/',  { headers: HDR }).then(r => r.text()),
    ])

    const partidos = extraerPartidos(htmlFix)
    const grupos   = extraerGrupos(htmlGrupos)

    res.status(200).json({ ok: true, partidos, grupos, ts: Date.now() })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
}

function getState(html) {
  const i = html.indexOf('window.__PRELOADED_STATE__')
  if (i < 0) return null
  const s = html.indexOf('{', i)
  if (s < 0) return null
  let d = 0, str = false, esc = false
  for (let j = s; j < html.length; j++) {
    const c = html[j]
    if (esc)            { esc = false; continue }
    if (c==='\\' && str){ esc = true;  continue }
    if (c==='"')        { str = !str;  continue }
    if (str) continue
    if (c==='{') d++
    else if (c==='}') { d--; if (d===0) { try { return JSON.parse(html.slice(s, j+1)) } catch { return null } } }
  }
  return null
}

function parsear(m, fecha) {
  const home = m.homeTeam || {}
  const away = m.awayTeam || {}
  // matchStatus: 1=Final, 0=Programado, 3=EnVivo  (puede ser número o string)
  const st = m.matchStatus
  const fin  = st == 1 || m.postGameText === 'Final'
  const vivo = st == 3 || st == 2

  const gl = fin||vivo ? parseInt(m.score?.homeTeam?.goals ?? home.score ?? '') : null
  const gv = fin||vivo ? parseInt(m.score?.awayTeam?.goals ?? away.score ?? '') : null

  return {
    fecha,
    fechaISO:        m.matchDateUTC || '',
    hora:            m.matchDateUTC ? new Date(m.matchDateUTC).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Argentina/Buenos_Aires'}) : '',
    local:           home.code || home.name || '',
    localNombre:     home.name || '',
    localLogo:       home.imgProps?.src || '',
    golesL:          isNaN(gl) ? null : gl,
    golesV:          isNaN(gv) ? null : gv,
    visitante:       away.code || away.name || '',
    visitanteNombre: away.name || '',
    visitanteLogo:   away.imgProps?.src || '',
    estado:          fin ? 'FT' : vivo ? 'LIVE' : 'PRG',
    grupo:           m.group || '',
    matchId:         m.matchId || '',
  }
}

function extraerPartidos(html) {
  const state = getState(html)
  const days  = state?.fixtureReducer?.fixtureData?.fixture?.dayMatchesData || []
  const out   = []
  days.forEach(day => {
    const fecha = day.dataHeader?.text || day.dataHeader?.title || ''
    ;(day.tableBody || []).forEach(m => out.push(parsear(m, fecha)))
  })
  return out
}

function extraerGrupos(html) {
  const state  = getState(html)
  const tables = state?.standingsReducer?.groupsLeaderboards?.tables || []
  const grupos = {}
  tables.forEach(t => {
    const m = (t.name||'').match(/Grupo\s*([A-L])/i)
    if (!m) return
    grupos[m[1].toUpperCase()] = (t.dataBody||[]).map(e => ({
      equipo: e.team?.name || '',
      logo:   e.team?.imgProps?.src || '',
      pts: e.points||0, pj: e.playedST||0,
      pg: e.wonST||0,   pe: e.tiedST||0,  pp: e.lostST||0,
      gf: e.goalsMade||0, gc: e.goalsAgainst||0, dg: e.difference||0,
    }))
  })
  return grupos
}
