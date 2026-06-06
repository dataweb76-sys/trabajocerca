/* api/notify-instagram.js
   Vercel Serverless Function
   Recibe webhook de Supabase y reenvía a Make.com para publicar en Instagram.

   Configurar en Vercel → Settings → Environment Variables:
     MAKE_WEBHOOK_CONSULTAS  = https://hook.make.com/TU-WEBHOOK-CONSULTAS
     MAKE_WEBHOOK_REGISTROS  = https://hook.make.com/TU-WEBHOOK-REGISTROS
     SUPABASE_WEBHOOK_SECRET = un string secreto que pones en Supabase también
*/

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  // Verificar secret para que solo Supabase pueda llamar este endpoint
  const secret = req.headers["x-webhook-secret"]
  if (secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { type, table, record } = req.body

  // Solo procesar inserts nuevos
  if (type !== "INSERT") {
    return res.status(200).json({ ok: true, skipped: true })
  }

  let webhookUrl = null
  let payload    = {}

  if (table === "consultas_urgentes") {
    webhookUrl = process.env.MAKE_WEBHOOK_CONSULTAS
    payload = {
      tipo:      "consulta_urgente",
      nombre:    record.nombre    || "Alguien",
      categoria: record.categoria || "profesional",
      ciudad:    record.ciudad    || "",
      provincia: record.provincia || "",
      necesita:  (record.necesita || "").substring(0, 150),
      imagen_url: "https://trabajoscerca.com.ar/banner-comunidad.jpg",
      caption: `🚨 ¡CONSULTA URGENTE en ${record.provincia}!\n\nAlguien busca un/a ${record.categoria} en ${record.ciudad}.\n\n"${(record.necesita||"").substring(0,100)}"\n\n¿Conocés a alguien? Ayudalo en 👇\nwww.trabajoscerca.com.ar\n\n#TrabajosArgentina #${(record.categoria||"").replace(/\s+/g,"")} #${(record.provincia||"").replace(/\s+/g,"")} #trabajoscerca #empleos #oficio`
    }
  }

  else if (table === "perfiles") {
    webhookUrl = process.env.MAKE_WEBHOOK_REGISTROS
    const tipo = record.tipo || "perfil"
    const tipoLabel = { oficio:"Oficio", profesional:"Profesional", empresa:"Empresa", emprendimiento:"Emprendimiento", cv:"CV" }[tipo] || tipo
    payload = {
      tipo:      "nuevo_registro",
      nombre:    `${record.nombre || ""} ${record.apellido || ""}`.trim() || "Un nuevo usuario",
      tipo_perfil: tipoLabel,
      provincia: record.provincia || "",
      localidad: record.localidad || "",
      imagen_url: "https://trabajoscerca.com.ar/banner-comunidad.jpg",
      caption: `👋 ¡Bienvenido/a a la comunidad!\n\n${`${record.nombre||""} ${record.apellido||""}`.trim()} se registró como ${tipoLabel} en ${record.provincia || "Argentina"}.\n\n¡Registrate vos también! 👇\nwww.trabajoscerca.com.ar\n\n#TrabajosArgentina #${tipoLabel.replace(/\s+/g,"")} #${(record.provincia||"").replace(/\s+/g,"")} #trabajoscerca #nuevoperfil`
    }
  }

  else {
    return res.status(200).json({ ok: true, skipped: "tabla no reconocida" })
  }

  if (!webhookUrl) {
    return res.status(500).json({ error: "MAKE_WEBHOOK no configurado" })
  }

  // Enviar a Make.com
  try {
    const makeRes = await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload)
    })
    const text = await makeRes.text()
    return res.status(200).json({ ok: true, make_status: makeRes.status, make_body: text })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
