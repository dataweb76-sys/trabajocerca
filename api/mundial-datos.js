/**
 * Lee partidos y standings desde Supabase (que el cron actualiza cada 5 min)
 */

const SB_URL = 'https://iqeiszkoifxgygoqvbem.supabase.co'
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs'
const HDR = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')

  try {
    const [ptRes, eqRes] = await Promise.all([
      fetch(`${SB_URL}/rest/v1/mundial_partidos?select=*&order=numero_partido`, { headers: HDR }),
      fetch(`${SB_URL}/rest/v1/mundial_equipos?select=*`, { headers: HDR }),
    ])

    const partidos = ptRes.ok ? await ptRes.json() : []
    const equipos  = eqRes.ok ? await eqRes.json() : []

    // Map id→equipo
    const eqMap = {}
    equipos.forEach(e => { eqMap[e.id] = e })

    // Calcular standings por grupo desde los partidos terminados
    const grupos = {}
    const grupoPartidos = partidos.filter(p => p.fase === 'grupo')

    for (const p of grupoPartidos) {
      const g = p.grupo
      if (!g) continue
      if (!grupos[g]) grupos[g] = {}

      const eq1 = eqMap[p.equipo_local_id]
      const eq2 = eqMap[p.equipo_visitante_id]

      for (const eq of [eq1, eq2]) {
        if (!eq) continue
        if (!grupos[g][eq.id]) grupos[g][eq.id] = {
          equipo: eq.nombre, logo: eq.logo_url || '',
          pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0
        }
      }

      if (!p.completado && p.goles_local === null) continue
      if (!eq1 || !eq2) continue

      const gl = p.goles_local, gv = p.goles_visitante
      const t1 = grupos[g][eq1.id], t2 = grupos[g][eq2.id]
      if (!t1 || !t2) continue

      t1.pj++; t2.pj++
      t1.gf += gl; t1.gc += gv
      t2.gf += gv; t2.gc += gl

      if (gl > gv)      { t1.pg++; t1.pts += 3; t2.pp++ }
      else if (gl < gv) { t2.pg++; t2.pts += 3; t1.pp++ }
      else              { t1.pe++; t1.pts++; t2.pe++; t2.pts++ }
    }

    // Convertir grupos a arrays ordenados
    const gruposArr = {}
    for (const [g, teams] of Object.entries(grupos)) {
      gruposArr[g] = Object.values(teams)
        .sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf)
        .map((t, i) => ({ ...t, pos: i + 1, dg: t.gf - t.gc }))
    }

    // Convertir partidos al formato que espera el frontend
    const partidosOut = partidos.map(p => {
      const eq1 = eqMap[p.equipo_local_id]
      const eq2 = eqMap[p.equipo_visitante_id]
      const fin  = p.completado || (p.goles_local !== null && p.goles_visitante !== null)
      const gl = p.goles_local, gv = p.goles_visitante
      return {
        matchId:         p.id,
        fecha:           p.fecha || '',
        fechaISO:        p.fecha_iso || '',
        hora:            p.hora || '',
        local:           eq1?.codigo || p.desc_local || '',
        localNombre:     eq1?.nombre || p.desc_local || '',
        localLogo:       eq1?.logo_url || '',
        golesL:          fin ? gl : null,
        golesV:          fin ? gv : null,
        visitante:       eq2?.codigo || p.desc_visitante || '',
        visitanteNombre: eq2?.nombre || p.desc_visitante || '',
        visitanteLogo:   eq2?.logo_url || '',
        estado:          fin ? 'FT' : 'PRG',
        grupo:           p.grupo || '',
        fase:            p.fase || '',
        sede:            p.sede || '',
      }
    })

    res.status(200).json({ ok: true, partidos: partidosOut, grupos: gruposArr, ts: Date.now() })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
}
