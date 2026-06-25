/**
 * /api/mundial-datos
 * Usa ESPN public API — sin key, sin scraping, datos reales
 */

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600')

  try {
    // Buscar partidos en todas las fechas del mundial (11 jun - 19 jul 2026)
    const fechas = generarFechas('2026-06-11', '2026-07-19')

    // Traer standings y partidos en paralelo
    const [standingsRes, ...scoreboards] = await Promise.all([
      fetch(`${ESPN}/standings`, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
      ...fechas.map(f =>
        fetch(`${ESPN}/scoreboard?dates=${f}&limit=50`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    ])

    // Partidos
    const partidos = []
    for (const data of scoreboards) {
      if (!data?.events) continue
      for (const ev of data.events) {
        const comp = ev.competitions?.[0]
        if (!comp) continue
        const home = comp.competitors?.find(c => c.homeAway === 'home')
        const away = comp.competitors?.find(c => c.homeAway === 'away')
        if (!home || !away) continue

        const status  = ev.status?.type?.name  // 'STATUS_FINAL', 'STATUS_IN_PROGRESS', 'STATUS_SCHEDULED'
        const terminado = status === 'STATUS_FINAL'
        const enVivo    = status === 'STATUS_IN_PROGRESS'

        const grupoBruto = comp.groups?.name || comp.series?.summary || ev.season?.slug || ''
        const grupoLetra = (grupoBruto.match(/Group\s*([A-L])/i) || grupoBruto.match(/Grupo\s*([A-L])/i) || [])[1] || ''

        partidos.push({
          matchId:          ev.id,
          fecha:            ev.date ? new Date(ev.date).toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long', timeZone:'America/Argentina/Buenos_Aires' }) : '',
          fechaISO:         ev.date || '',
          hora:             ev.date ? new Date(ev.date).toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit', timeZone:'America/Argentina/Buenos_Aires' }) : '',
          local:            home.team?.abbreviation || '',
          localNombre:      home.team?.displayName || home.team?.name || '',
          localLogo:        home.team?.logo || '',
          golesL:           terminado || enVivo ? parseInt(home.score) || 0 : null,
          golesV:           terminado || enVivo ? parseInt(away.score) || 0 : null,
          visitante:        away.team?.abbreviation || '',
          visitanteNombre:  away.team?.displayName || away.team?.name || '',
          visitanteLogo:    away.team?.logo || '',
          estado:           terminado ? 'FT' : enVivo ? 'LIVE' : 'PRG',
          grupo:            grupoLetra,
          fase:             comp.type?.abbreviation || '',
          sede:             comp.venue?.fullName || '',
        })
      }
    }

    // Standings por grupo desde ESPN
    const grupos = {}
    if (standingsRes.ok) {
      const sd = await standingsRes.json()
      const tablas = sd.children || sd.standings?.entries ? [sd] : (sd.children || [])
      for (const tabla of tablas) {
        const nombre = tabla.name || tabla.abbreviation || ''
        const m = nombre.match(/Group\s*([A-L])/i)
        if (!m) continue
        const letra = m[1].toUpperCase()
        const rows  = tabla.standings?.entries || []
        grupos[letra] = rows.map(e => {
          const stats = {}
          ;(e.stats || []).forEach(s => { stats[s.name] = s.value })
          return {
            equipo: e.team?.displayName || e.team?.name || '',
            logo:   e.team?.logo || '',
            pos:    stats.rank || 0,
            pts:    stats.points || 0,
            pj:     stats.gamesPlayed || 0,
            pg:     stats.wins || 0,
            pe:     stats.ties || 0,
            pp:     stats.losses || 0,
            gf:     stats.pointsFor || 0,
            gc:     stats.pointsAgainst || 0,
            dg:     stats.pointDifferential || 0,
          }
        })
      }
    }

    res.status(200).json({ ok: true, partidos, grupos, ts: Date.now() })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
}

function generarFechas(desde, hasta) {
  const fechas = []
  const d = new Date(desde)
  const h = new Date(hasta)
  while (d <= h) {
    fechas.push(d.toISOString().slice(0, 10).replace(/-/g, ''))
    d.setDate(d.getDate() + 1)
  }
  return fechas
}
