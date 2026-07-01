/**
 * POST /api/enviar-notificacion
 * Envía emails del sistema a usuarios.
 * Requiere RESEND_API_KEY en Vercel → Settings → Environment Variables
 * Registro gratis en resend.com (3000 emails/mes gratis)
 */

const SB_URL = 'https://iqeiszkoifxgygoqvbem.supabase.co'
const SB_KEY = process.env.SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const RESEND_KEY = process.env.RESEND_API_KEY
  if (!RESEND_KEY) return res.status(500).json({ error: 'RESEND_API_KEY no configurado en Vercel' })

  const { tipo, email_destino } = req.body || {}

  // ── MODO TEST: enviar a un email específico ──
  if (tipo === 'test_ubicacion') {
    const resultado = await enviarEmail(RESEND_KEY, {
      to: email_destino || 'datawebgames@gmail.com',
      subject: '⚠️ Completá tu provincia y ciudad — Trabajos Cerca',
      html: templateUbicacion({ nombre: 'Usuario de prueba' }),
    })
    return res.status(resultado.ok ? 200 : 500).json(resultado)
  }

  // ── MODO MASIVO: notificar a todos los usuarios sin ubicación ──
  if (tipo === 'masivo_ubicacion') {
    // Buscar perfiles sin provincia/localidad que tengan email en auth
    const pRes = await fetch(
      `${SB_URL}/rest/v1/perfiles?select=id,nombre,apellido&provincia=is.null&localidad=is.null`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
    )
    const perfiles = pRes.ok ? await pRes.json() : []

    // Para cada perfil, obtener el email de auth.users via admin API
    let enviados = 0, errores = 0
    for (const p of perfiles) {
      const authRes = await fetch(`${SB_URL}/auth/v1/admin/users/${p.id}`, {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
      })
      if (!authRes.ok) { errores++; continue }
      const authUser = await authRes.json()
      const email = authUser.email
      if (!email) { errores++; continue }

      const nombre = [p.nombre, p.apellido].filter(Boolean).join(' ') || 'Usuario'
      const r = await enviarEmail(RESEND_KEY, {
        to: email,
        subject: '⚠️ Completá tu provincia y ciudad — Trabajos Cerca',
        html: templateUbicacion({ nombre }),
      })
      if (r.ok) enviados++; else errores++
      await new Promise(r => setTimeout(r, 100)) // no saturar la API
    }

    return res.status(200).json({ ok: true, perfiles: perfiles.length, enviados, errores })
  }

  return res.status(400).json({ error: 'tipo no reconocido. Usá: test_ubicacion | masivo_ubicacion' })
}

async function enviarEmail(apiKey, { to, subject, html }) {
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Trabajos Cerca <noreply@trabajoscerca.com.ar>',
        to: [to],
        subject,
        html,
      }),
    })
    const data = await r.json()
    if (!r.ok) return { ok: false, error: data.message || JSON.stringify(data) }
    return { ok: true, id: data.id, to }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

function templateUbicacion({ nombre }) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);">

        <!-- HEADER -->
        <tr>
          <td style="background:#2563eb;padding:28px 32px;text-align:center;">
            <img src="https://trabajoscerca.com.ar/logo.png" alt="Trabajos Cerca" style="height:44px;display:block;margin:0 auto 8px;" onerror="this.style.display='none'">
            <p style="color:rgba(255,255,255,.85);font-size:13px;margin:0;">La comunidad de trabajo más cercana a vos</p>
          </td>
        </tr>

        <!-- ALERTA -->
        <tr>
          <td style="background:#fef3c7;padding:14px 32px;border-left:4px solid #f59e0b;text-align:center;">
            <span style="font-size:20px;">⚠️</span>
            <span style="font-size:14px;font-weight:700;color:#92400e;margin-left:8px;">Tu perfil está incompleto</span>
          </td>
        </tr>

        <!-- CUERPO -->
        <tr>
          <td style="padding:32px;">
            <p style="font-size:16px;font-weight:700;color:#1e293b;margin:0 0 12px;">Hola, ${nombre} 👋</p>
            <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 20px;">
              Notamos que tu perfil en <strong>Trabajos Cerca</strong> no tiene
              <strong>provincia</strong> ni <strong>ciudad/localidad</strong> cargadas.
            </p>
            <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 24px;">
              Esto hace que <strong style="color:#dc2626;">no aparezcas en los resultados de búsqueda</strong>
              cuando alguien busca un profesional u oficio en tu zona.
              ¡Completalo ahora y empezá a recibir consultas!
            </p>

            <!-- BENEFICIOS -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:12px;padding:16px;margin-bottom:28px;">
              <tr><td style="padding:6px 0;font-size:13px;color:#15803d;">✅ &nbsp;Aparecés en búsquedas por provincia y ciudad</td></tr>
              <tr><td style="padding:6px 0;font-size:13px;color:#15803d;">✅ &nbsp;Los clientes de tu zona te encuentran fácil</td></tr>
              <tr><td style="padding:6px 0;font-size:13px;color:#15803d;">✅ &nbsp;Más consultas directas por WhatsApp</td></tr>
            </table>

            <!-- BOTÓN -->
            <div style="text-align:center;margin-bottom:28px;">
              <a href="https://trabajoscerca.com.ar/perfil.html"
                 style="display:inline-block;background:#2563eb;color:white;font-weight:800;font-size:15px;
                        padding:14px 32px;border-radius:12px;text-decoration:none;letter-spacing:.3px;">
                📍 Completar mi provincia y ciudad
              </a>
            </div>

            <p style="font-size:13px;color:#94a3b8;text-align:center;margin:0;">
              Si ya completaste tu perfil, ignorá este mensaje. ¡Gracias!
            </p>
          </td>
        </tr>

        <!-- PIE -->
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="font-size:12px;color:#94a3b8;margin:0;">
              © 2026 Trabajos Cerca · <a href="https://trabajoscerca.com.ar" style="color:#2563eb;text-decoration:none;">trabajoscerca.com.ar</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
