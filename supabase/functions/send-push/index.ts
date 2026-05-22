// ══════════════════════════════════════════════════════
// Trabajos Cerca — Edge Function: send-push
// Se dispara desde un Database Webhook cuando se inserta
// una fila en la tabla "notificaciones".
// Envía un Web Push a todos los dispositivos del usuario.
// ══════════════════════════════════════════════════════

import { serve }        from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush          from "npm:web-push@3.6.6"

const VAPID_PUBLIC  = Deno.env.get("VAPID_PUBLIC_KEY")!
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!
const VAPID_EMAIL   = Deno.env.get("VAPID_EMAIL") || "mailto:admin@trabajocerca.com"

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

serve(async (req) => {
  // Preflight CORS
  if(req.method === "OPTIONS"){
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
      }
    })
  }

  try {
    const body = await req.json()

    // El webhook de Supabase manda { type, table, schema, record, old_record }
    const record = body.record
    if(!record?.usuario_id){
      return new Response("sin record", { status: 200 })
    }

    // Traer suscripciones push del usuario
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, subscription, endpoint")
      .eq("usuario_id", record.usuario_id)

    if(error || !subs?.length){
      return new Response("sin suscripciones", { status: 200 })
    }

    const payload = JSON.stringify({
      title: record.titulo || "Trabajos Cerca",
      body:  record.cuerpo || "",
      url:   record.url   || "/index.html",
      tag:   record.tipo  || "tc"
    })

    // Enviar push a cada dispositivo
    const resultados = await Promise.allSettled(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(s.subscription, payload)
        } catch(err: any){
          // Suscripción vencida o inválida → eliminar
          if(err.statusCode === 410 || err.statusCode === 404){
            await supabase.from("push_subscriptions").delete().eq("id", s.id)
          }
          throw err
        }
      })
    )

    const enviados = resultados.filter(r => r.status === "fulfilled").length
    const fallidos  = resultados.filter(r => r.status === "rejected").length

    console.log(`Push enviado a ${enviados}/${subs.length} dispositivos (${fallidos} fallidos)`)

    return new Response(
      JSON.stringify({ ok: true, enviados, fallidos }),
      { headers: { "Content-Type": "application/json" } }
    )

  } catch(err){
    console.error("Error en send-push:", err)
    return new Response("Error: " + (err as Error).message, { status: 500 })
  }
})
