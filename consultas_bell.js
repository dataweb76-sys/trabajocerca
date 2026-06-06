/* consultas_bell.js
   Widget de campanita para consultas urgentes en la zona del usuario.
   Se carga como <script type="module"> en cualquier página.
   Inyecta la campanita en el topbar y una sección resumen en el perfil.
*/
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SB_URL = "https://iqeiszkoifxgygoqvbem.supabase.co"
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs"
const supabase = createClient(SB_URL, SB_KEY)

const LS_LAST = "tc_consultas_last_check"

function getUserId(){
  try {
    const tok = JSON.parse(localStorage.getItem("sb-iqeiszkoifxgygoqvbem-auth-token"))?.access_token
    if(!tok) return null
    return JSON.parse(atob(tok.split(".")[1])).sub || null
  } catch(e){ return null }
}

async function init(){
  const uid = getUserId()
  if(!uid) return

  // Cargar datos del perfil (provincia + ciudad)
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre,apellido,provincia,localidad")
    .eq("id", uid)
    .maybeSingle()
  if(!perfil?.provincia) return

  const provincia = perfil.provincia
  const ciudad    = perfil.localidad || ""
  const lastCheck = localStorage.getItem(LS_LAST) || new Date(0).toISOString()

  // ── Contar consultas nuevas en la zona desde último check ──
  const { count: nuevas } = await supabase
    .from("consultas_urgentes")
    .select("id", { count:"exact", head:true })
    .eq("activo", true)
    .ilike("provincia", `%${provincia}%`)
    .gt("created_at", lastCheck)
    .neq("usuario_id", uid)   // no mostrar las propias

  // ── Total en la zona (para el panel) ──
  const { count: total } = await supabase
    .from("consultas_urgentes")
    .select("id", { count:"exact", head:true })
    .eq("activo", true)
    .ilike("provincia", `%${provincia}%`)

  // ── Inyectar campanita en topbar ──
  inyectarCampanita(nuevas || 0, provincia, ciudad, total || 0)

  // ── Inyectar sección en el dashboard del perfil ──
  await inyectarSeccionPerfil(uid, provincia, ciudad, nuevas || 0, `${perfil.nombre||""} ${perfil.apellido||""}`.trim())
}

function inyectarCampanita(nuevas, provincia, ciudad, total){
  // Busca el anchor en el nav — si no existe, lo agrega al nav
  let anchor = document.getElementById("consultas-bell-anchor")
  if(!anchor){
    const nav = document.querySelector("header .topbar nav") || document.querySelector("nav")
    if(!nav) return
    anchor = document.createElement("div")
    anchor.id = "consultas-bell-anchor"
    anchor.style.cssText = "display:inline-flex;align-items:center;"
    // Insertarlo antes del último ítem (Salir)
    const items = nav.children
    if(items.length > 0){
      nav.insertBefore(anchor, items[items.length - 1])
    } else {
      nav.appendChild(anchor)
    }
  }

  const url = `/consultas_urgentes.html?provincia=${encodeURIComponent(provincia)}`
  anchor.innerHTML = `
    <a href="${url}" title="${total} consultas urgentes en ${provincia}" id="consultasBellBtn"
      style="position:relative;display:inline-flex;align-items:center;justify-content:center;
             width:38px;height:38px;border-radius:50%;color:${nuevas>0?'#dc2626':'#64748b'};
             text-decoration:none;font-size:18px;transition:background .15s;"
      onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
      <i class="fa-solid fa-bell${nuevas>0?' fa-shake':''}"></i>
      ${nuevas > 0 ? `<span style="position:absolute;top:2px;right:2px;background:#dc2626;color:white;border-radius:50%;
        width:16px;height:16px;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;
        border:2px solid white;line-height:1;">${nuevas > 9 ? "9+" : nuevas}</span>` : ""}
    </a>`

  // Al hacer click actualizar el timestamp
  anchor.querySelector("a")?.addEventListener("click", () => {
    localStorage.setItem(LS_LAST, new Date().toISOString())
  })
}

async function inyectarSeccionPerfil(uid, provincia, ciudad, nuevas, nombrePerfil){
  // Solo inyectar en perfil.html
  if(!location.pathname.includes("perfil.html") && !location.pathname.endsWith("/perfil")) return

  // Esperar a que el dashboard cargue con contenido real (no solo el spinner)
  await new Promise(resolve => setTimeout(resolve, 1800))

  // Cargar consultas recientes en la zona (excluir las propias)
  const { data: consultasZona } = await supabase
    .from("consultas_urgentes")
    .select("id,nombre,categoria,ciudad,provincia,necesita,created_at")
    .eq("activo", true)
    .ilike("provincia", `%${provincia}%`)
    .neq("usuario_id", uid)
    .order("created_at", { ascending: false })
    .limit(5)

  // Cargar MIS consultas con sus ayudas
  const { data: misConsultas } = await supabase
    .from("consultas_urgentes")
    .select("id,nombre,categoria,ciudad,provincia,necesita,created_at,activo,ayudas_consulta(id,ayudante_nombre,comentario,contacto_numero,created_at)")
    .eq("usuario_id", uid)
    .order("created_at", { ascending: false })
    .limit(10)

  const totalAyudasNuevas = (misConsultas || [])
    .reduce((sum, c) => sum + (c.ayudas_consulta?.length || 0), 0)

  // Construir sección
  const section = document.createElement("div")
  section.id = "seccion-consultas-urgentes"
  section.style.cssText = "margin-top:24px;"

  const zonaBadge = `<span style="background:#fff1f2;color:#dc2626;border:1px solid #fecaca;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;margin-left:6px;">
    ${nuevas > 0 ? `${nuevas} nuevas` : provincia}
  </span>`

  section.innerHTML = `
    <!-- MIS CONSULTAS (con soluciones) -->
    ${misConsultas?.length ? `
    <div style="background:linear-gradient(135deg,#eff6ff,#f0fdf4);border:1.5px solid #bfdbfe;border-radius:16px;padding:18px 18px 14px;margin-bottom:18px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <h3 style="margin:0;font-size:15px;color:#1e293b;display:flex;align-items:center;gap:8px;">
          <i class="fa-solid fa-clipboard-list" style="color:#2563eb;"></i>
          Mis consultas urgentes
          ${totalAyudasNuevas > 0 ? `<span style="background:#dc2626;color:white;border-radius:20px;padding:1px 8px;font-size:11px;font-weight:800;">${totalAyudasNuevas} solución${totalAyudasNuevas!==1?"es":""}</span>` : ""}
        </h3>
        <a href="/consultas_urgentes.html" style="font-size:12px;color:#2563eb;font-weight:700;text-decoration:none;">Ver todas</a>
      </div>
      <div id="mis-consultas-lista">
        ${(misConsultas || []).map(c => renderMiConsulta(c, nombrePerfil)).join("")}
      </div>
    </div>` : ""}

    <!-- CONSULTAS EN MI ZONA -->
    <div style="background:white;border:1.5px solid #fecaca;border-radius:16px;padding:18px 18px 14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <h3 style="margin:0;font-size:15px;color:#1e293b;display:flex;align-items:center;gap:8px;">
          <i class="fa-solid fa-bell" style="color:#dc2626;${nuevas>0?'animation:bellShake 1s infinite':''}"></i>
          Consultas urgentes en tu zona ${zonaBadge}
        </h3>
        <a href="/consultas_urgentes.html?provincia=${encodeURIComponent(provincia)}"
          style="font-size:12px;color:#dc2626;font-weight:700;text-decoration:none;">Ver todas →</a>
      </div>
      ${consultasZona?.length ? `
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${consultasZona.map(c => `
            <div style="border:1px solid #fecaca;border-radius:10px;padding:12px 14px;background:#fff5f5;">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px;">
                <div>
                  <span style="font-size:12px;font-weight:800;color:#dc2626;background:#fff1f2;border-radius:20px;padding:2px 8px;">
                    ${c.categoria || "Sin categoría"}
                  </span>
                </div>
                <span style="font-size:11px;color:#94a3b8;flex-shrink:0;">${new Date(c.created_at).toLocaleDateString("es-AR",{day:"2-digit",month:"short"})}</span>
              </div>
              <p style="margin:4px 0 6px;font-size:13px;color:#334155;line-height:1.5;">"${(c.necesita||"").substring(0,90)}${c.necesita?.length>90?"...":""}"</p>
              <p style="margin:0 0 8px;font-size:11px;color:#94a3b8;"><i class="fa-solid fa-location-dot"></i> ${[c.ciudad,c.provincia].filter(Boolean).join(", ")}</p>
              <a href="/consultas_urgentes.html?categoria=${encodeURIComponent(c.categoria||"")}"
                style="display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#16a34a,#15803d);color:white;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;">
                <i class="fa-solid fa-hands-helping"></i> Ayudar a encontrar
              </a>
            </div>`).join("")}
        </div>` : `
        <div style="text-align:center;padding:20px;color:#94a3b8;font-size:13px;">
          <i class="fa-solid fa-check-circle" style="color:#16a34a;font-size:24px;display:block;margin-bottom:8px;opacity:.5;"></i>
          No hay consultas urgentes en ${provincia} por ahora.
        </div>`}
    </div>
    <style>
      @keyframes bellShake {
        0%,100%{transform:rotate(0)} 10%,30%,50%,70%{transform:rotate(-8deg)}
        20%,40%,60%,80%{transform:rotate(8deg)}
      }
    </style>
  `

  // Insertar al final del contenedor principal (después del dash)
  const dash = document.getElementById("dash")
  const container = document.querySelector(".container") || document.body
  if(dash && dash.parentNode === container){
    container.insertBefore(section, dash.nextSibling)
  } else if(dash){
    dash.appendChild(section)
  } else {
    container.appendChild(section)
  }
}

function renderMiConsulta(consulta, nombrePerfil){
  const ayudas = consulta.ayudas_consulta || []
  const catLabel = consulta.categoria || "profesional"
  const fechaStr = new Date(consulta.created_at).toLocaleDateString("es-AR",{day:"2-digit",month:"short",year:"2-digit"})

  const ayudasHtml = ayudas.map(a => {
    const waNum = (a.contacto_numero || "").replace(/\D/g,"")
    const waMsg = encodeURIComponent(
      `¡Hola! Me llamo ${nombrePerfil}. Te escribo desde trabajoscerca.com.ar porque un usuario me recomendó tu número — estoy buscando un ${catLabel}${consulta.necesita ? ` porque ${consulta.necesita.substring(0,120)}` : ""}. ¿Podés ayudarme? ¡Y si te registrás en la página vas a poder conseguir más clientes como yo! 👉 www.trabajoscerca.com.ar`
    )
    const waLink = waNum ? `https://wa.me/54${waNum}?text=${waMsg}` : null

    return `
      <div style="background:white;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <div style="width:32px;height:32px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;font-size:14px;color:#16a34a;flex-shrink:0;">
            <i class="fa-solid fa-user"></i>
          </div>
          <div>
            <p style="margin:0;font-size:13px;font-weight:800;color:#1e293b;">${a.ayudante_nombre || "Anónimo"}</p>
            <p style="margin:0;font-size:11px;color:#94a3b8;">te dejó un contacto</p>
          </div>
          <span style="background:#dcfce7;color:#15803d;border-radius:20px;padding:2px 8px;font-size:11px;font-weight:700;margin-left:auto;">💡 Solución</span>
        </div>
        ${a.comentario ? `<p style="margin:0 0 8px;font-size:13px;color:#475569;font-style:italic;">"${a.comentario}"</p>` : ""}
        ${waLink ? `
          <a href="${waLink}" target="_blank" rel="noopener"
            style="display:inline-flex;align-items:center;gap:7px;background:#25D366;color:white;padding:9px 16px;border-radius:10px;font-size:13px;font-weight:800;text-decoration:none;width:100%;box-sizing:border-box;justify-content:center;">
            <i class="fa-brands fa-whatsapp"></i> Enviar WhatsApp al ${catLabel}
          </a>` : `<p style="font-size:12px;color:#dc2626;margin:0;">Sin número de contacto</p>`}
      </div>`
  }).join("")

  return `
    <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:10px;">
      <div style="background:#f8fafc;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <div>
          <span style="font-size:12px;font-weight:800;color:#2563eb;">${catLabel}</span>
          <span style="font-size:11px;color:#94a3b8;margin-left:8px;">${fechaStr}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          ${ayudas.length > 0 ? `
            <span style="background:#dcfce7;color:#15803d;border-radius:20px;padding:2px 8px;font-size:11px;font-weight:800;">
              <i class="fa-solid fa-lightbulb"></i> ${ayudas.length} solución${ayudas.length!==1?"es":""}
            </span>` : `<span style="font-size:11px;color:#94a3b8;">Sin soluciones aún</span>`}
        </div>
      </div>
      ${ayudas.length > 0 ? `<div style="padding:10px 14px;">${ayudasHtml}</div>` : ""}
    </div>`
}

function esperarElemento(selector, timeout=5000){
  return new Promise(resolve => {
    if(document.querySelector(selector)) return resolve()
    const obs = new MutationObserver(() => {
      if(document.querySelector(selector)){ obs.disconnect(); resolve() }
    })
    obs.observe(document.body, { childList:true, subtree:true })
    setTimeout(() => { obs.disconnect(); resolve() }, timeout)
  })
}

// ── START ──
init()
