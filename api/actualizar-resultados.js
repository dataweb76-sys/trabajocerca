/**
 * Cron job — obtiene resultados del Mundial 2026 desde openfootball (GitHub)
 * y los guarda en Supabase mundial_partidos
 * Vercel cron: cada 5 minutos
 */

const SB_URL = 'https://iqeiszkoifxgygoqvbem.supabase.co'
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs'

const FUENTES = [
  'https://raw.githubusercontent.com/openfootball/world-cup.json/master/2026/worldcup.json',
  'https://raw.githubusercontent.com/openfootball/world-cup/master/2026/worldcup.json',
]

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    // Cargar equipos de Supabase
    const eqRes = await fetch(`${SB_URL}/rest/v1/mundial_equipos?select=*`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
    })
    const equipos = await eqRes.json()
    const equipoMap = {}
    for (const e of equipos) {
      equipoMap[norm(e.nombre)] = e
      if (e.codigo) equipoMap[e.codigo.toLowerCase()] = e
    }

    // Intentar cada fuente hasta que una funcione
    let partidos = []
    for (const url of FUENTES) {
      try {
        const r = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
          signal: AbortSignal.timeout(8000),
        })
        if (!r.ok) continue
        const data = await r.json()
        partidos = extraerPartidos(data)
        if (partidos.length > 0) break
      } catch { continue }
    }

    if (partidos.length === 0) {
      return res.status(200).json({ ok: true, msg: 'Sin datos disponibles aún', ts: Date.now() })
    }

    // Filtrar solo partidos terminados
    const terminados = partidos.filter(p => p.fin && p.gl !== null && p.gv !== null)

    let actualizados = 0
    for (const p of terminados) {
      const eq1 = buscarEquipo(p.local, equipoMap)
      const eq2 = buscarEquipo(p.visitante, equipoMap)
      if (!eq1 || !eq2) continue

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
          body: JSON.stringify({
            goles_local: p.gl,
            goles_visitante: p.gv,
            completado: true,
          }),
        }
      )
      if (r.ok) actualizados++
    }

    res.status(200).json({ ok: true, total: partidos.length, terminados: terminados.length, actualizados, ts: Date.now() })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '').trim()

function buscarEquipo(nombre, map) {
  if (!nombre) return null
  const n = norm(nombre)
  if (map[n]) return map[n]
  // Buscar por prefijo de 5 letras o 3 letras (código FIFA)
  if (n.length >= 3) {
    const pre5 = n.slice(0, 5)
    const pre3 = n.slice(0, 3)
    for (const [k, v] of Object.entries(map)) {
      if (k.startsWith(pre5)) return v
    }
    for (const [k, v] of Object.entries(map)) {
      if (k === pre3) return v
    }
  }
  return null
}

function extraerPartidos(data) {
  const lista = []

  // Formato openfootball: { rounds: [{ matches: [{ team1, team2, score1, score2, ... }] }] }
  if (data.rounds) {
    for (const round of data.rounds) {
      for (const m of (round.matches || [])) {
        const gl = m.score1 ?? m.score?.ft?.[0] ?? null
        const gv = m.score2 ?? m.score?.ft?.[1] ?? null
        const fin = gl !== null && gv !== null
        lista.push({
          local:    m.team1?.code || m.team1?.name || m.team1 || '',
          visitante:m.team2?.code || m.team2?.name || m.team2 || '',
          gl: fin ? Number(gl) : null,
          gv: fin ? Number(gv) : null,
          fin,
        })
      }
    }
  }

  // Formato alternativo: { groups: [{ matches: [...] }] }
  if (data.groups) {
    for (const g of data.groups) {
      for (const m of (g.matches || [])) {
        const gl = m.score1 ?? null
        const gv = m.score2 ?? null
        const fin = gl !== null && gv !== null
        lista.push({
          local:    m.team1?.code || m.team1?.name || m.team1 || '',
          visitante:m.team2?.code || m.team2?.name || m.team2 || '',
          gl: fin ? Number(gl) : null,
          gv: fin ? Number(gv) : null,
          fin,
        })
      }
    }
  }

  return lista
}
