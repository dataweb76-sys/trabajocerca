/**
 * Vercel Serverless Function — /api/mundial-datos
 * Trae standings, partidos de hoy y goleadores del Mundial 2026 desde ESPN.
 * Corre server-side → sin CORS, sin límites de fetch del browser.
 */

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD"

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.json()
}

// Rango de días desde el inicio del mundial hasta hoy
function diasDesdeInicio() {
  const inicio = new Date("2026-06-11")
  const hoy    = new Date()
  const dias   = []
  for (let d = new Date(inicio); d <= hoy; d = new Date(d.getTime() + 86400000)) {
    dias.push(d.toISOString().slice(0, 10).replace(/-/g, ""))
  }
  return dias
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30")

  try {
    const dias = diasDesdeInicio().slice(0, 35)

    // 1. Descargar todos los partidos en paralelo
    const resultados = await Promise.all(
      dias.map(d =>
        fetchJSON(`${ESPN}/scoreboard?dates=${d}&limit=50`)
          .then(j => j.events || [])
          .catch(() => [])
      )
    )

    const evMap = {}
    resultados.flat().forEach(ev => { evMap[ev.id] = ev })
    const todosPartidos = Object.values(evMap)

    // 2. Separar partidos de hoy (AR = UTC-3)
    const ahora   = new Date()
    const dStrAR  = new Date(ahora.getTime() - 3 * 3600000).toISOString().slice(0, 10).replace(/-/g, "")
    const dStrUTC = ahora.toISOString().slice(0, 10).replace(/-/g, "")
    const partidosHoy = todosPartidos
      .filter(ev => {
        const d = new Date(ev.date).toISOString().slice(0, 10).replace(/-/g, "")
        return d === dStrAR || d === dStrUTC
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(ev => {
        const comp = ev.competitions[0]
        const home = comp.competitors.find(c => c.homeAway === "home") || comp.competitors[0]
        const away = comp.competitors.find(c => c.homeAway === "away") || comp.competitors[1]
        return {
          id:         ev.id,
          fecha:      ev.date,
          completado: ev.status.type.completed,
          descripcion:ev.status.type.description,
          reloj:      ev.status.displayClock || "",
          periodo:    ev.status.period || 0,
          local:  { nombre: home.team?.displayName || "?", logo: home.team?.logos?.[0]?.href || "", score: home.score ?? null },
          visita: { nombre: away.team?.displayName || "?", logo: away.team?.logos?.[0]?.href || "", score: away.score ?? null },
        }
      })

    // 3. Calcular standings desde todos los partidos
    const grupos = {} // "A" → { "teamId": { stats... } }

    todosPartidos.forEach(ev => {
      const comp   = ev.competitions[0]
      const notes  = comp.notes || []
      const grpRaw = comp.groups?.abbreviation
                  || comp.groups?.shortName
                  || comp.groups?.name
                  || notes.find(n => /group/i.test(n.headline || ""))?.headline
                  || ""
      const m = grpRaw.match(/\bGroup\s+([A-L])\b/i) || grpRaw.match(/\b([A-L])\b/)
      const grp = m ? m[1].toUpperCase() : ""
      if (!grp) return

      const comp2 = ev.competitions[0]
      comp2.competitors.forEach(c => {
        if (!grupos[grp]) grupos[grp] = {}
        if (!grupos[grp][c.team.id]) {
          grupos[grp][c.team.id] = {
            id:    c.team.id,
            nombre:c.team.displayName || c.team.name || "?",
            logo:  c.team.logos?.[0]?.href || c.team.logo || "",
            pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0
          }
        }
      })

      if (!ev.status.type.completed) return
      const home = comp2.competitors.find(c => c.homeAway === "home")
      const away = comp2.competitors.find(c => c.homeAway === "away")
      if (!home || !away) return
      const gl = parseInt(home.score ?? 0), gv = parseInt(away.score ?? 0)
      if (isNaN(gl) || isNaN(gv)) return

      const L = grupos[grp]?.[home.team.id]
      const V = grupos[grp]?.[away.team.id]
      if (!L || !V) return

      L.pj++; V.pj++; L.gf += gl; L.gc += gv; V.gf += gv; V.gc += gl
      if (gl > gv)      { L.pg++; L.pts += 3; V.pp++ }
      else if (gl < gv) { V.pg++; V.pts += 3; L.pp++ }
      else              { L.pe++; L.pts++;     V.pe++; V.pts++ }
    })

    // Convertir grupos a array ordenado por pts
    const standings = {}
    Object.keys(grupos).sort().forEach(g => {
      standings[g] = Object.values(grupos[g]).sort(
        (a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf
      )
    })

    // 4. Goleadores: fetch summaries de partidos terminados
    const terminados = todosPartidos.filter(ev => ev.status.type.completed).slice(0, 48)
    const summaries  = await Promise.all(
      terminados.map(ev =>
        fetchJSON(`${ESPN}/summary?event=${ev.id}`).catch(() => null)
      )
    )

    const golesMap = {}
    summaries.forEach(s => {
      if (!s) return
      const plays = s.scoringPlays || []
      plays.forEach(p => {
        const jugador = p.participants?.[0]?.athlete?.displayName
                     || p.text?.split(/[(\n]/)[0]?.trim()
        if (!jugador || jugador.length < 2) return
        const team = p.team || {}
        const key  = jugador + "|" + (team.id || "")
        if (!golesMap[key]) {
          golesMap[key] = {
            nombre: jugador,
            equipo: team.displayName || team.name || "",
            logo:   team.logos?.[0]?.href || team.logo || "",
            goles:  0
          }
        }
        golesMap[key].goles++
      })
    })

    const goleadores = Object.values(golesMap)
      .sort((a, b) => b.goles - a.goles)
      .slice(0, 25)

    res.status(200).json({ ok: true, partidosHoy, standings, goleadores })

  } catch (err) {
    console.error("mundial-datos:", err)
    res.status(500).json({ ok: false, error: err.message })
  }
}
