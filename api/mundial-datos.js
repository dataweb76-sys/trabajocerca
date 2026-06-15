/**
 * Vercel Serverless Function — /api/mundial-datos
 * Proxy para canchallena.lanacion.com.ar — parsea HTML y devuelve JSON.
 * 3 requests en paralelo, sin riesgo de timeout.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300')

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

    const partidos   = parsearPartidos(htmlFix)
    const grupos     = parsearGrupos(htmlGrupos)
    const goleadores = parsearGoleadores(htmlGol)

    res.status(200).json({ ok: true, partidos, grupos, goleadores, ts: Date.now() })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
}

/* ── Partidos / Fixture ───────────────────────────────────────────────── */
function parsearPartidos(html) {
  const partidos = []

  // Dividir por bloques de fecha (h2 o h3)
  const partes = html.split(/<h[23][^>]*>/i)

  for (let i = 1; i < partes.length; i++) {
    const bloque = partes[i]

    // Extraer texto del encabezado (antes del primer <)
    const fechaRaw = bloque.match(/^([^<]{2,80})/)
    if (!fechaRaw) continue
    const fechaStr = limpiarHTML(fechaRaw[1]).trim()

    // Solo bloques con fecha real (meses en español)
    if (!/enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|\d{4}/i.test(fechaStr)) continue

    // Buscar partidos con resultado: ABC 2 - 1 DEF
    const reResult = /\b([A-Z]{2,4})\s+(\d+)\s*[-–]\s*(\d+)\s+([A-Z]{2,4})\b/g
    let m
    while ((m = reResult.exec(bloque)) !== null) {
      partidos.push({
        fecha:     fechaStr,
        local:     m[1],
        golesL:    parseInt(m[2]),
        golesV:    parseInt(m[3]),
        visitante: m[4],
        estado:    'FT'
      })
    }

    // Buscar horarios con equipos: ABC 18:00 DEF o ABC - DEF (sin score)
    // Patrón: código hora código
    const reHora = /\b([A-Z]{2,4})\s+(\d{1,2}:\d{2})\s+([A-Z]{2,4})\b/g
    while ((m = reHora.exec(bloque)) !== null) {
      const existe = partidos.some(p =>
        p.fecha === fechaStr && (p.local === m[1] || p.visitante === m[1])
      )
      if (!existe) {
        partidos.push({ fecha: fechaStr, local: m[1], golesL: null, golesV: null, visitante: m[3], hora: m[2], estado: 'PRG' })
      }
    }

    // En vivo: buscar "en vivo" o similar cerca del partido
    const reEnVivo = /\b([A-Z]{2,4})\s+(\d+)\s*[-–]\s*(\d+)\s+([A-Z]{2,4})\b[^<]*(?:vivo|live|\d{2,3}')/gi
    while ((m = reEnVivo.exec(bloque)) !== null) {
      const idx = partidos.findIndex(p =>
        p.local === m[1] && p.visitante === m[4] && p.fecha === fechaStr
      )
      if (idx >= 0) partidos[idx].estado = 'LIVE'
    }
  }

  return partidos
}

/* ── Grupos / Standings ───────────────────────────────────────────────── */
function parsearGrupos(html) {
  const grupos = {}

  // Encontrar todas las ocurrencias de "Grupo X"
  const reGrupo = /Grupo\s+([A-L])/gi
  const matches = [...html.matchAll(reGrupo)]
  const posiciones = matches.map(m => ({ letra: m[1].toUpperCase(), pos: m.index }))

  // Eliminar duplicados de letra
  const vistas = new Set()
  const unicas = posiciones.filter(p => {
    if (vistas.has(p.letra)) return false
    vistas.add(p.letra)
    return true
  })

  for (let i = 0; i < unicas.length; i++) {
    const { letra, pos } = unicas[i]
    const fin = unicas[i + 1]?.pos ?? pos + 10000
    const segmento = html.slice(pos, fin)
    const equipos = parsearTablaGrupo(segmento)
    if (equipos.length > 0) grupos[letra] = equipos
  }

  return grupos
}

function parsearTablaGrupo(segmento) {
  const equipos = []

  // Filas de tabla
  const reFila = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let m
  while ((m = reFila.exec(segmento)) !== null) {
    const filaHTML = m[1]
    const celdas = [...filaHTML.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map(c => limpiarHTML(c[1]).trim())

    if (celdas.length < 7) continue

    // Identificar celda de equipo (texto con letras, no solo números)
    const nombreIdx = celdas.findIndex(c => /[A-Za-záéíóúñÁÉÍÓÚÑ]{3,}/.test(c) && !/^(?:PTS|PJ|PG|PE|PP|DG|GF|GC|EQUIPO|ÚLTIMOS)$/i.test(c))
    if (nombreIdx < 0) continue

    // Extraer solo números de las demás celdas
    const nums = celdas
      .filter((_, idx) => idx !== nombreIdx)
      .map(c => c.match(/^-?\d+$/) ? parseInt(c) : null)
      .filter(n => n !== null)

    if (nums.length < 6) continue

    equipos.push({
      equipo: celdas[nombreIdx],
      pts:    nums[0],
      pj:     nums[1],
      pg:     nums[2],
      pe:     nums[3],
      pp:     nums[4],
      dg:     nums[5],
      gf:     nums[6] ?? 0,
      gc:     nums[7] ?? 0,
    })

    if (equipos.length >= 4) break
  }

  return equipos
}

/* ── Goleadores ───────────────────────────────────────────────────────── */
function parsearGoleadores(html) {
  const goleadores = []

  const reFila = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let m
  while ((m = reFila.exec(html)) !== null) {
    const celdas = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map(c => limpiarHTML(c[1]).trim())

    if (celdas.length < 2) continue

    // Nombre: celda con letras y más de 3 chars
    const nombre = celdas.find(c => /[A-Za-záéíóúñÁÉÍÓÚÑ]{4,}/.test(c) && !/^(?:Jugador|Equipo|Goles|Rank|Nombre|GOLES|JUGADOR)/i.test(c))
    // Goles: celda solo con dígito(s)
    const golesStr = celdas.find(c => /^\d{1,2}$/.test(c))

    if (!nombre || !golesStr) continue

    goleadores.push({ nombre, goles: parseInt(golesStr) })
    if (goleadores.length >= 20) break
  }

  return goleadores
}

/* ── Helpers ──────────────────────────────────────────────────────────── */
function limpiarHTML(str) {
  return str
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í').replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ')
    .replace(/\s+/g, ' ')
    .trim()
}
