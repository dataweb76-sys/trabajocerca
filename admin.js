import { supabase } from "./supabase.js"

/* ── Verificar admin ── */
async function verificarAdmin() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { location.href = "/login.html"; return false }
  const { data } = await supabase.from("perfiles").select("admin").eq("id", user.id).single()
  if (!data?.admin) { alert("Sin acceso de administrador"); location.href = "/"; return false }
  return true
}

/* ── Estado ── */
let _perfiles = []
let _filtro   = ""

/* ── Cargar perfiles ── */
async function cargarPerfiles() {
  document.getElementById("tablaPerfiles").innerHTML =
    `<div style="text-align:center;padding:30px;color:#64748b;"><i class="fa-solid fa-spinner fa-spin" style="font-size:24px;"></i></div>`

  const { data, error } = await supabase
    .from("perfiles")
    .select("id, nombre, apellido, nombre_empresa, email, localidad, provincia, verificado, destacado, admin, created_at, tipo, servicios(categoria)")
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    document.getElementById("tablaPerfiles").innerHTML =
      `<div class="alerta alerta-err">Error: ${error.message}</div>`
    return
  }

  _perfiles = data || []
  renderTabla()
}

/* ── Render tabla ── */
function renderTabla() {
  const f = _filtro.toLowerCase()
  const lista = f
    ? _perfiles.filter(p =>
        (p.nombre||"").toLowerCase().includes(f) ||
        (p.apellido||"").toLowerCase().includes(f) ||
        (p.nombre_empresa||"").toLowerCase().includes(f) ||
        (p.email||"").toLowerCase().includes(f) ||
        (p.localidad||"").toLowerCase().includes(f)
      )
    : _perfiles

  const cont = document.getElementById("tablaPerfiles")

  if (!lista.length) {
    cont.innerHTML = `<p style="text-align:center;color:#94a3b8;padding:30px;">No se encontraron perfiles.</p>`
    return
  }

  cont.innerHTML = lista.map(p => {
    const nombre = (p.nombre_empresa && p.nombre_empresa.trim())
      ? p.nombre_empresa
      : `${p.nombre||""} ${p.apellido||""}`.trim() || "(sin nombre)"

    const fecha = p.created_at ? new Date(p.created_at).toLocaleDateString("es-AR") : "-"
    const cat   = p.servicios?.[0]?.categoria || null

    return `
    <div class="admin-row" id="row-${p.id}">
      <div class="admin-info">
        <strong style="font-size:15px;">${nombre}</strong>
        <span style="font-size:12px;color:#64748b;">${p.email||""}</span>
        ${cat ? `<span style="font-size:11px;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:20px;padding:1px 10px;font-weight:700;display:inline-block;width:fit-content;">
          <i class="fa-solid fa-tag"></i> ${cat}</span>` : `<span style="font-size:11px;color:#94a3b8;">Sin categoría</span>`}
        <span style="font-size:12px;color:#94a3b8;">
          ${p.localidad||""}${p.provincia?", "+p.provincia:""}
          · Registrado: ${fecha}
        </span>
      </div>
      <div class="admin-badges">
        ${p.verificado
          ? `<span class="badge-on badge-verif"><i class="fa-solid fa-circle-check"></i> Verificado</span>`
          : `<span class="badge-off"><i class="fa-regular fa-circle"></i> No verificado</span>`}
        ${p.destacado
          ? `<span class="badge-on badge-dest"><i class="fa-solid fa-crown"></i> Destacado</span>`
          : ""}
        ${p.admin
          ? `<span class="badge-on badge-admin"><i class="fa-solid fa-shield-halved"></i> Admin</span>`
          : ""}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;align-items:center;">
        <span style="font-size:11px;color:#64748b;font-weight:600;">Buscadores:</span>
        ${[
          {id:"oficio",     label:"Oficios",          color:"#0ea5e9"},
          {id:"profesional",label:"Profesionales",    color:"#7c3aed"},
          {id:"cv",         label:"CVs/Empleados",    color:"#16a34a"},
          {id:"emprendimiento",label:"Emprendimientos",color:"#f59e0b"},
          {id:"trabajo",    label:"Ofertas trabajo",  color:"#ef4444"},
        ].map(b => {
          const activo = (p.tipo||"").split(",").map(t=>t.trim()).includes(b.id)
          return `<button onclick="toggleTipoAdmin('${p.id}','${b.id}',${activo})" style="font-size:11px;padding:3px 10px;border-radius:20px;cursor:pointer;font-weight:700;border:1.5px solid ${b.color};background:${activo?b.color:"white"};color:${activo?"white":b.color};">${b.label}</button>`
        }).join("")}
      </div>
      <div class="admin-acciones">
        <button onclick="toggleVerificado('${p.id}', ${!p.verificado})"
          class="btn btn-sm ${p.verificado ? "btn-outline" : ""}"
          style="${p.verificado ? "color:#0ea5e9;border-color:#0ea5e9;" : "background:#0ea5e9;color:white;"}">
          <i class="fa-solid fa-circle-check"></i> ${p.verificado ? "Quitar verif." : "Verificar"}
        </button>
        <button onclick="toggleDestacado('${p.id}', ${!p.destacado})"
          class="btn btn-sm ${p.destacado ? "btn-outline" : ""}"
          style="${p.destacado ? "color:#f59e0b;border-color:#f59e0b;" : "background:#f59e0b;color:white;"}">
          <i class="fa-solid fa-crown"></i> ${p.destacado ? "Quitar dest." : "Destacar"}
        </button>
        <a href="/perfil_publico.html?id=${p.id}" target="_blank"
          class="btn btn-sm btn-outline" style="font-size:12px;">
          <i class="fa-solid fa-eye"></i> Ver perfil
        </a>
        <button onclick="toggleAdmin('${p.id}', ${!p.admin})"
          class="btn btn-sm btn-outline" style="${p.admin ? "color:#7c3aed;border-color:#7c3aed;" : "color:#94a3b8;border-color:#cbd5e1;"}font-size:12px;">
          <i class="fa-solid fa-shield-halved"></i> ${p.admin ? "Quitar admin" : "Dar admin"}
        </button>
        <button onclick="eliminarCuenta('${p.id}', '${(nombre).replace(/'/g,"\\'")}', '${p.email||""}')"
          class="btn btn-sm btn-outline" style="color:#dc2626;border-color:#dc2626;font-size:12px;">
          <i class="fa-solid fa-trash"></i> Eliminar
        </button>
      </div>
    </div>`
  }).join("")

  document.getElementById("contadorPerfiles").textContent =
    `${lista.length} perfil${lista.length !== 1 ? "es" : ""}${f ? " (filtrados)" : ""}`
}

/* ── Toggle verificado ── */
window.toggleVerificado = async function(id, nuevoVal) {
  const btn = document.querySelector(`#row-${id} .admin-acciones button:first-child`)
  if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>` }

  const { error } = await supabase
    .from("perfiles").update({ verificado: nuevoVal }).eq("id", id)

  if (error) {
    alert("Error: " + error.message)
    if (btn) btn.disabled = false
    return
  }

  const idx = _perfiles.findIndex(p => p.id === id)
  if (idx >= 0) _perfiles[idx].verificado = nuevoVal
  renderTabla()

  // Notificar al usuario si fue verificado
  if (nuevoVal) {
    supabase.from("notificaciones").insert({
      usuario_id: id,
      tipo: "sistema",
      titulo: "¡Tu perfil fue verificado! ✓",
      cuerpo: "A partir de ahora aparecés con el badge de perfil verificado en los resultados.",
      url: "/perfil.html"
    }).catch(() => {})
  }
}

/* ── Toggle destacado ── */
window.toggleDestacado = async function(id, nuevoVal) {
  const btn = document.querySelector(`#row-${id} .admin-acciones button:nth-child(2)`)
  if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>` }

  const { error } = await supabase
    .from("perfiles").update({ destacado: nuevoVal }).eq("id", id)

  if (error) {
    alert("Error: " + error.message)
    if (btn) btn.disabled = false
    return
  }

  const idx = _perfiles.findIndex(p => p.id === id)
  if (idx >= 0) _perfiles[idx].destacado = nuevoVal
  renderTabla()
}

/* ── Filtro ── */
window.filtrarPerfiles = function(val) {
  _filtro = val
  renderTabla()
}

/* ── Stats ── */
async function cargarStats() {
  const hoy  = new Date(); hoy.setHours(0,0,0,0)
  const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1)
  const hace7 = new Date(Date.now() - 7*24*60*60*1000).toISOString()

  const [
    { count: total },
    { count: verificados },
    { count: destacados },
    { count: solPendientes },
    visitasHoyRes,
    visitasAyerRes,
    visitas7Res
  ] = await Promise.all([
    supabase.from("perfiles").select("id", { count: "exact", head: true }),
    supabase.from("perfiles").select("id", { count: "exact", head: true }).eq("verificado", true),
    supabase.from("perfiles").select("id", { count: "exact", head: true }).eq("destacado", true),
    supabase.from("solicitudes_portfolio").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
    supabase.from("visitas_pagina").select("id", { count: "exact", head: true }).gte("created_at", hoy.toISOString()),
    supabase.from("visitas_pagina").select("id", { count: "exact", head: true }).gte("created_at", ayer.toISOString()).lt("created_at", hoy.toISOString()),
    supabase.from("visitas_pagina").select("id", { count: "exact", head: true }).gte("created_at", hace7)
  ])

  const visitasHoy  = visitasHoyRes.count  || 0
  const visitasAyer = visitasAyerRes.count || 0
  const visitas7    = visitas7Res.count    || 0
  const tendencia   = visitasHoy >= visitasAyer ? "⬆️" : "⬇️"

  document.getElementById("statsGrid").innerHTML = `
    <div class="stat-box">
      <div class="stat-num">${total || 0}</div>
      <div class="stat-label"><i class="fa-solid fa-users"></i> Perfiles totales</div>
    </div>
    <div class="stat-box stat-blue">
      <div class="stat-num">${verificados || 0}</div>
      <div class="stat-label"><i class="fa-solid fa-circle-check"></i> Verificados</div>
    </div>
    <div class="stat-box stat-yellow">
      <div class="stat-num">${destacados || 0}</div>
      <div class="stat-label"><i class="fa-solid fa-crown"></i> Destacados</div>
    </div>
    <div class="stat-box" style="border-color:${solPendientes > 0 ? "#fed7aa" : "#e2e8f0"};background:${solPendientes > 0 ? "#fff7ed" : "white"}">
      <div class="stat-num" style="color:${solPendientes > 0 ? "#ea580c" : "#1e293b"}">${solPendientes || 0}</div>
      <div class="stat-label"><i class="fa-solid fa-images" style="color:#f97316;"></i> Sol. portfolio</div>
    </div>
    <div class="stat-box" style="border-color:#c7d2fe;background:#eef2ff;">
      <div class="stat-num" style="color:#4f46e5;">${visitasHoy} ${tendencia}</div>
      <div class="stat-label" style="color:#4f46e5;"><i class="fa-solid fa-chart-line"></i> Visitas hoy</div>
      <div style="font-size:11px;color:#6366f1;margin-top:4px;">Ayer: ${visitasAyer} · 7 días: ${visitas7}</div>
    </div>
  `
}

/* ══════════════════════════════════════
   SOLICITUDES DE PORTFOLIO
══════════════════════════════════════ */

async function cargarSolicitudes() {
  const cont = document.getElementById("listaSolicitudes")
  if (!cont) return

  const { data, error } = await supabase
    .from("solicitudes_portfolio")
    .select("id, plan, estado, created_at, usuario_id, perfiles(id, nombre, apellido, nombre_empresa, email, localidad, provincia, foto)")
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    cont.innerHTML = `<div class="alerta alerta-err">Error: ${error.message}</div>`
    return
  }

  const pendientes = (data || []).filter(s => s.estado === "pendiente")
  const historial  = (data || []).filter(s => s.estado !== "pendiente")

  const total = pendientes.length
  document.getElementById("contadorSolicitudes").textContent =
    total ? `· ${total} pendiente${total !== 1 ? "s" : ""}` : "· todo al día ✓"

  // Alerta al admin cuando hay solicitudes pendientes (1 vez por sesión)
  if(total > 0 && !sessionStorage.getItem("tc_sol_alerta")) {
    sessionStorage.setItem("tc_sol_alerta", "1")
    const nombres = pendientes.slice(0, 3).map(s => {
      const p = s.perfiles || {}
      const cant = s.cantidad || 1
      const nom  = (p.nombre_empresa && p.nombre_empresa.trim())
        ? p.nombre_empresa
        : `${p.nombre || ""} ${p.apellido || ""}`.trim() || "(sin nombre)"
      return `• ${nom} — Plan ${s.plan} (${cant} trabajo${cant > 1 ? "s" : ""})`
    }).join("\n")
    const msg =
      `⚠️ Hay ${total} solicitud${total > 1 ? "es" : ""} de portfolio pendiente${total > 1 ? "s" : ""}:\n\n` +
      nombres + (total > 3 ? `\n  …y ${total - 3} más.` : "") +
      `\n\nHacé clic en "Aprobar" para activarle el plan al profesional.`
    setTimeout(() => alert(msg), 400)
  }

  if (!data?.length) {
    cont.innerHTML = `<p style="text-align:center;color:#94a3b8;padding:20px;font-size:13px;">No hay solicitudes aún.</p>`
    return
  }

  const renderSol = (s, isPendiente) => {
    const p = s.perfiles || {}
    const nombre = (p.nombre_empresa && p.nombre_empresa.trim())
      ? p.nombre_empresa
      : `${p.nombre || ""} ${p.apellido || ""}`.trim() || "(sin nombre)"
    const cant   = s.cantidad || 1
    const precio = s.precio   || 10000
    const planLabel = `${cant} trabajo${cant>1?"s":""} — $${precio.toLocaleString("es-AR")}/mes`
    const planColor = cant >= 5 ? "#f97316" : cant >= 2 ? "#7c3aed" : "#2563eb"
    const fecha = new Date(s.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })

    const foto = p.foto
      ? `<img src="${p.foto}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;flex-shrink:0;">`
      : `<div style="width:44px;height:44px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#94a3b8;flex-shrink:0;font-size:18px;"><i class="fa-solid fa-user"></i></div>`

    const estadoBadge = isPendiente
      ? `<span style="background:#fef9c3;color:#713f12;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid #fde68a;">⏳ PENDIENTE</span>`
      : s.estado === "aprobado"
        ? `<span style="background:#dcfce7;color:#166534;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid #bbf7d0;">✓ APROBADO</span>`
        : `<span style="background:#fee2e2;color:#991b1b;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid #fca5a5;">✗ RECHAZADO</span>`

    return `
    <div style="background:${isPendiente ? "#fffbeb" : "#f8fafc"};border:1.5px solid ${isPendiente ? "#fde68a" : "#e2e8f0"};border-radius:12px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;" id="sol-${s.id}">
      ${foto}
      <div style="flex:1;min-width:160px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px;">
          <strong style="font-size:14px;">${nombre}</strong>
          ${estadoBadge}
        </div>
        <div style="font-size:12px;color:#64748b;">
          ${p.email || ""}
          ${p.localidad ? ` · ${p.localidad}${p.provincia ? ", " + p.provincia : ""}` : ""}
        </div>
        <div style="margin-top:4px;">
          <span style="display:inline-flex;align-items:center;gap:4px;background:${planColor};color:white;font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px;">
            <i class="fa-solid fa-${s.plan === "basico" ? "image" : "crown"}" style="font-size:9px;"></i>
            ${planLabel}
          </span>
          <span style="font-size:11px;color:#94a3b8;margin-left:6px;">${fecha}</span>
        </div>
      </div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center;">
        ${isPendiente ? `
          <button onclick="aprobarSolicitud('${s.id}', '${s.usuario_id}', ${cant})"
            class="btn btn-sm" style="background:#16a34a;color:white;">
            <i class="fa-solid fa-circle-check"></i> Aprobar ${cant} trabajo${cant>1?"s":""}
          </button>
          <button onclick="rechazarSolicitud('${s.id}')"
            class="btn btn-sm btn-outline" style="color:#dc2626;border-color:#dc2626;font-size:12px;">
            <i class="fa-solid fa-xmark"></i> Rechazar
          </button>` : ""}
        <a href="/perfil_publico.html?id=${s.usuario_id}" target="_blank"
          class="btn btn-sm btn-outline" style="font-size:12px;">
          <i class="fa-solid fa-eye"></i> Ver perfil
        </a>
      </div>
    </div>`
  }

  let html = pendientes.map(s => renderSol(s, true)).join("")

  if (historial.length) {
    html += `<details style="margin-top:12px;">
      <summary style="cursor:pointer;font-size:13px;color:#64748b;padding:6px 0;">
        <i class="fa-solid fa-history"></i> Historial (${historial.length})
      </summary>
      <div style="margin-top:8px;">${historial.map(s => renderSol(s, false)).join("")}</div>
    </details>`
  }

  cont.innerHTML = html
}

/* ── Aprobar solicitud ── */
window.aprobarSolicitud = async function(solicitudId, usuarioId, cantidad) {
  // plan_nivel: 1 = 1 trabajo, 2 = 2 trabajos, 3 = 5 trabajos
  const planNivel = cantidad >= 5 ? 3 : cantidad >= 2 ? 2 : 1
  const esDestacado = cantidad >= 5  // Plan Pro incluye badge Destacado

  const row = document.getElementById(`sol-${solicitudId}`)
  if (row) row.style.opacity = "0.5"

  // Activar plan en el perfil
  const { error: e1 } = await supabase
    .from("perfiles").update({
      plan_nivel: planNivel,
      ...(esDestacado ? { destacado: true } : {})
    }).eq("id", usuarioId)

  if (e1) { alert("Error: " + e1.message); if (row) row.style.opacity = "1"; return }

  // Marcar solicitud como aprobada
  await supabase.from("solicitudes_portfolio")
    .update({ estado: "aprobado" }).eq("id", solicitudId)

  // Notificar al profesional con la cantidad exacta
  await supabase.from("notificaciones").insert({
    usuario_id: usuarioId,
    tipo:       "sistema",
    titulo:     `🎉 ¡Tu plan fue aprobado!`,
    cuerpo:     `Ya podés subir hasta ${cantidad} trabajo${cantidad>1?"s":""} realizado${cantidad>1?"s":""} con fotos. ` +
                `Entrá a "Mi servicio" → sección "Trabajos realizados".`,
    url:        "/perfil_servicio.html"
  }).catch(() => {})

  // Actualizar stats y lista
  await Promise.all([cargarSolicitudes(), cargarStats()])
  const idx = _perfiles.findIndex(p => p.id === usuarioId)
  if (idx >= 0) {
    _perfiles[idx].plan_nivel = planNivel
    if (esDestacado) _perfiles[idx].destacado = true
  }
}

/* ── Rechazar solicitud ── */
window.rechazarSolicitud = async function(solicitudId) {
  if (!confirm("¿Rechazar esta solicitud?")) return

  await supabase.from("solicitudes_portfolio")
    .update({ estado: "rechazado" }).eq("id", solicitudId)

  await cargarSolicitudes()
}

/* ── Eliminar cuenta ── */
window.eliminarCuenta = async function(id, nombre, email) {
  const confirmMsg =
    `⚠️ ELIMINAR CUENTA\n\n` +
    `Nombre: ${nombre}\n` +
    `Email: ${email}\n\n` +
    `Esto eliminará el perfil, servicio, reseñas, fotos y la cuenta de acceso.\n` +
    `Esta acción NO se puede deshacer.\n\n` +
    `¿Estás seguro?`

  if (!confirm(confirmMsg)) return

  const row = document.getElementById(`row-${id}`)
  if (row) { row.style.opacity = "0.4"; row.style.pointerEvents = "none" }

  try {
    // 1. Llamar la función SQL que elimina el usuario de auth.users (y en cascada todo lo demás)
    const { error } = await supabase.rpc("eliminar_usuario", { usuario_id: id })

    if (error) {
      // Si la función no existe, intentar eliminar solo el perfil
      const { error: e2 } = await supabase.from("perfiles").delete().eq("id", id)
      if (e2) throw e2
      alert(`✓ Perfil eliminado.\nNota: la cuenta de auth.users debe borrarse manualmente en el dashboard de Supabase si el botón de login aún funciona.`)
    } else {
      alert(`✓ Cuenta de ${nombre} eliminada completamente.`)
    }

    // Quitar de la lista local y re-renderizar
    _perfiles = _perfiles.filter(p => p.id !== id)
    renderTabla()
    cargarStats()
  } catch (e) {
    alert("Error al eliminar: " + e.message)
    if (row) { row.style.opacity = "1"; row.style.pointerEvents = "" }
  }
}

/* ── Toggle Admin ── */
window.toggleAdmin = async function(id, nuevoVal) {
  const accion = nuevoVal ? "dar permisos de administrador" : "quitar permisos de administrador"
  if (!confirm(`¿Estás seguro de ${accion} a este usuario?`)) return

  const { error } = await supabase
    .from("perfiles").update({ admin: nuevoVal }).eq("id", id)

  if (error) { alert("Error: " + error.message); return }

  const idx = _perfiles.findIndex(p => p.id === id)
  if (idx >= 0) _perfiles[idx].admin = nuevoVal
  renderTabla()
}

/* ══════════════════════════════════════
   GESTIÓN DE CATEGORÍAS
══════════════════════════════════════ */

let _catTipo = 'oficio'

const CAT_DEFAULTS = {
  oficio: {
    'Albañilería':                 ['Construcción nueva','Remodelaciones','Pisos y revestimientos','Paredes y mampostería','Techos y azoteas','Impermeabilización','Reparaciones generales'],
    'Plomería':                    ['Destapes','Instalaciones nuevas','Reparación de pérdidas','Calefón y termotanques','Conexiones de gas','Reparaciones generales'],
    'Gasista':                     ['Instalación de gasoducto','Calefones y termotanques','Estufas y cocinas','Calderas y radiadores','Verificación de instalaciones'],
    'Electricidad':                ['Instalaciones nuevas','Tableros eléctricos','Iluminación y luminarias','Reparaciones','Domótica','Instalaciones industriales'],
    'Carpintería':                 ['Muebles a medida','Puertas y ventanas','Placares y closets','Deck y pergolados','Escaleras de madera','Reparaciones'],
    'Pintura':                     ['Pintura interior','Pintura exterior','Enduido y revoques finos','Empapelado','Impermeabilización','Pintura decorativa'],
    'Herrería':                    ['Rejas y portones','Puertas de hierro','Estructuras metálicas','Escaleras de hierro','Reparaciones y soldaduras'],
    'Cerrajería':                  ['Apertura de puertas','Cambio de cerraduras','Puertas blindadas','Cajas fuertes','Copiado de llaves'],
    'Jardinería':                  ['Diseño de jardines','Mantenimiento de jardines','Poda de árboles','Sistemas de riego','Césped natural y artificial'],
    'Limpieza':                    ['Casas y departamentos','Oficinas y comercios','Limpieza post obra','Tapizados y alfombras','Vidrios en altura'],
    'Mudanzas y Fletes':           ['Mudanzas locales','Mudanzas larga distancia','Fletes y traslados','Embalaje profesional'],
    'Refrigeración / AC':          ['Instalación de split','Mantenimiento y limpieza','Reparación de equipos','Aire central','Cámaras frigoríficas'],
    'Informática':                 ['Reparación de PC y notebook','Reparación de celulares','Instalación de redes','Soporte técnico','Cámaras de seguridad'],
    'Mecánica Automotriz':         ['Service general','Reparación de motor','Frenos y suspensión','Electricidad del auto','Chapería y pintura'],
    'Tapicería':                   ['Tapizado de autos','Tapizado de muebles','Cortinados y persianas','Reparaciones'],
    'Techos e Impermeabilización': ['Tejas cerámicas y calcáreas','Chapa y zinc','Membrana líquida y asfáltica','Policarbonato','Impermeabilización de terrazas'],
    'Soldadura':                   ['Soldadura MIG / TIG','Estructuras metálicas','Portones y rejas','Aluminio','Acero inoxidable'],
    'Cadetería y Delivery':        ['Mensajería en moto','Paquetería y encomiendas','Delivery de comida','Trámites y diligencias'],
    'Fotografía y Video':          ['Eventos sociales','Fotografía corporativa','Video y edición','Retratos y book'],
    'Peluquería y Estética':       ['Corte y peinado','Coloración y mechas','Manicura y pedicura','Cejas y pestañas','Depilación','Micropigmentación'],
    'Costura y Modistería':        ['Arreglos de ropa','Ropa a medida','Uniformes','Bordados'],
    'Gastronomía y Catering':      ['Catering para eventos','Comida por encargo','Repostería y tortas','Servicio de mesa y mozos'],
    'Gestoría y Trámites':         ['Trámites vehiculares (VTV, transferencias)','Trámites AFIP / ARCA','Trámites municipales','Habilitaciones comerciales','Monotributo','Jubilaciones y pensiones','Trámites migratorios'],
    'Carnicería':                  ['Cortes vacunos','Cortes porcinos','Achuras y menudencias','Embutidos artesanales','Delivery de carne'],
    'Personal Trainer':            ['Entrenamiento funcional','Musculación','Cardio y HIIT','Entrenamiento a domicilio','Online / videollamada','Adultos mayores'],
    'Cuidado de personas':         ['Niñera','Cuidado de adultos mayores','Acompañante terapéutico','Asistente geriátrico','Cuidado de enfermos'],
    'Planchado y Lavandería':      ['Planchado a domicilio','Retiro y entrega','Lavado y planchado','Ropa de cama y manteles'],
    'Enfermería':                  ['Inyectables y curaciones','Control de presión y glucemia','Atención domiciliaria','Acompañamiento hospitalario','Cuidados post-operatorios'],
    'Diseño':                      ['Diseño gráfico','Diseño web','UX/UI','Diseño de logo','Diseño editorial'],
    'Clases y Tutorías':           ['Matemáticas','Inglés','Física y química','Apoyo escolar','Música','Idiomas'],
    'Mecánica del Hogar':          ['Arreglo de electrodomésticos','Instalación de artefactos','Climatización','Sanitarios'],
    'Otro oficio':                 []
  },
  profesional: {
    'Medicina':         ['Clínica médica','Pediatría','Cardiología','Dermatología','Ginecología','Traumatología','Neurología','Oftalmología','Psiquiatría','Cirugía general','Medicina familiar'],
    'Odontología':      ['Odontología general','Ortodoncia','Implantología','Endodoncia','Periodoncia','Odontopediatría','Odontología estética'],
    'Psicología':       ['Psicología clínica','Psicología infantil','Psicología laboral','Psicología de pareja','Neuropsicología','Orientación vocacional'],
    'Nutrición':        ['Nutrición clínica','Nutrición deportiva','Nutrición pediátrica','Coaching nutricional'],
    'Kinesiología':     ['Traumatológica','Neurológica','Deportiva','Respiratoria','Rehabilitación postquirúrgica'],
    'Fonoaudiología':   ['Trastornos del lenguaje','Dislexia','Voz profesional','Deglución'],
    'Enfermería':       ['Enfermería clínica','Domiciliaria','Pediátrica','Urgencias','Cuidados paliativos'],
    'Veterinaria':      ['Pequeños animales','Animales de granja','Animales exóticos','Cirugía veterinaria'],
    'Derecho':          ['Derecho civil','Derecho penal','Derecho laboral','Derecho de familia','Derecho comercial','Derecho tributario','Derecho inmobiliario'],
    'Contabilidad':     ['Contabilidad general','Impuestos y AFIP','Auditoría','Contabilidad de pymes','Liquidación de sueldos'],
    'Arquitectura':     ['Residencial','Comercial','Diseño de interiores','Planificación urbana','Dirección de obra','Paisajismo'],
    'Ingeniería':       ['Civil','Mecánica','Eléctrica','Sistemas','Industrial','Ambiental'],
    'Diseño':           ['Diseño gráfico','Diseño web/UX','Diseño de moda','Diseño industrial','Diseño editorial','Animación'],
    'Informática':      ['Desarrollo web','Desarrollo mobile','Ciberseguridad','Redes y servidores','Soporte técnico','Data science / IA'],
    'Educación':        ['Educación primaria','Educación secundaria','Educación especial','Idiomas','Apoyo escolar','Tutoría universitaria'],
    'Otra profesión':   []
  },
  emprendimiento: {
    'Gastronomía':               ['Empanadas','Pizzas','Hamburguesas','Sushi','Tartas y quiches','Facturas y medialunas','Alfajores y dulces','Tortas y pasteles','Cupcakes y muffins','Comida vegana/vegetariana','Catering','Menú del día','Milanesas','Asado y parrilla','Helados artesanales'],
    'Fletes y Mudanzas':         ['Flete local','Flete provincial','Flete nacional','Mudanza chica','Mudanza grande','Carga liviana','Carga pesada','Mensajería'],
    'Tienda y Comercio':         ['Electrodomésticos','Ropa y calzado','Alimentos no perecederos','Bebidas','Artículos del hogar','Juguetes','Libros y papelería','Ferretería','Artículos deportivos'],
    'Belleza y Estética':        ['Peluquería a domicilio','Barbería a domicilio','Manicuria','Pedicuria','Depilación','Maquillaje','Micropigmentación','Extensión de pestañas','Uñas acrílicas/gel'],
    'Indumentaria y Moda':       ['Ropa de mujer','Ropa de hombre','Ropa infantil','Ropa deportiva','Calzado','Accesorios','Lencería','Trajes de baño'],
    'Artesanías y Manualidades': ['Tejidos y crochet','Macramé','Cerámica','Cuero artesanal','Velas aromáticas','Jabones artesanales','Joyería artesanal','Arte y pinturas'],
    'Salud y Bienestar':         ['Productos naturales','Suplementos deportivos','Cosmética natural','Aromaterapia','Entrenamiento personal','Alimentación saludable'],
    'Tecnología y Digital':      ['Diseño gráfico','Desarrollo web','Redes sociales','Fotografía','Edición de video','Impresión 3D','Reparación de celulares'],
    'Hogar y Decoración':        ['Muebles artesanales','Plantas y jardín','Velas y difusores','Textil del hogar','Cuadros y arte'],
    'Mascotas':                  ['Accesorios para mascotas','Comida artesanal','Juguetes','Peluquería canina','Paseos de perros'],
    'Educación y Cursos':        ['Clases particulares','Idiomas','Música','Arte y pintura','Costura','Cocina y repostería','Programación','Apoyo escolar'],
    'Eventos y Entretenimiento': ['Decoración de eventos','Tortas y mesa dulce','Animación infantil','Fotografía de eventos','Catering','DJ y música','Juegos e inflables'],
    'Servicios Profesionales':   ['Contabilidad para pymes','Asesoría legal','Marketing y publicidad','Traducciones','Coaching'],
    'Otro rubro':                []
  }
}

let _catData = { oficio: null, profesional: null, emprendimiento: null }

/* ── Toggle panel categorías ── */
window.toggleCategorias = function() {
  const sec = document.getElementById('seccionCategorias')
  const chev = document.getElementById('catChevron')
  const abierto = sec.style.display !== 'none'
  sec.style.display = abierto ? 'none' : 'block'
  chev.className = abierto ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up'
  document.querySelector('#seccionCategorias').previousElementSibling
    ?.querySelector('button')?.textContent
  document.querySelector('[onclick="window.toggleCategorias()"]').innerHTML =
    `<i class="fa-solid fa-chevron-${abierto ? 'down' : 'up'}" id="catChevron"></i> ${abierto ? 'Abrir' : 'Cerrar'}`
  if(!abierto) window.abrirTabCat(_catTipo)
}

/* ── Cambiar tab ── */
window.abrirTabCat = async function(tipo) {
  _catTipo = tipo
  ;['oficio','profesional','emprendimiento'].forEach(t => {
    const btn = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1))
    if(!btn) return
    const colores = { oficio: '#ea580c', profesional: '#7c3aed', emprendimiento: '#d97706' }
    if(t === tipo){
      btn.style.background = colores[t]; btn.style.color = 'white'
      btn.style.borderColor = colores[t]
    } else {
      btn.style.background = 'white'; btn.style.color = colores[t]
      btn.style.borderColor = colores[t]
    }
  })
  await renderCategorias()
}

/* ── Renderizar categorías ── */
async function renderCategorias() {
  const cont = document.getElementById('catContenido')
  cont.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;font-size:13px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando...</div>`

  // Intentar cargar desde Supabase
  if(!_catData[_catTipo]){
    const { data } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', 'categorias_' + _catTipo)
      .single()
    _catData[_catTipo] = data?.valor || CAT_DEFAULTS[_catTipo]
    // Actualizar localStorage para que el buscador lo lea sin auth
    try { localStorage.setItem('tc_cats_' + _catTipo, JSON.stringify(_catData[_catTipo])) } catch(e) {}
  }

  const cats = _catData[_catTipo]
  const colores = { oficio: '#ea580c', profesional: '#7c3aed', emprendimiento: '#d97706' }
  const color = colores[_catTipo]

  cont.innerHTML = Object.entries(cats).map(([cat, subs]) => `
    <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
        <strong style="font-size:13.5px;color:#1e293b;">${cat}</strong>
        <div style="display:flex;gap:6px;">
          <button onclick="window.editarSubcats('${cat.replace(/'/g,"\\'")}')"
            class="btn btn-sm btn-outline" style="font-size:11px;color:#4f46e5;border-color:#4f46e5;">
            <i class="fa-solid fa-pen"></i> Editar subs
          </button>
          <button onclick="window.eliminarCategoria('${cat.replace(/'/g,"\\'")}')"
            class="btn btn-sm btn-outline" style="font-size:11px;color:#dc2626;border-color:#dc2626;">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
      ${subs.length
        ? `<div style="display:flex;flex-wrap:wrap;gap:5px;">${subs.map(s =>
            `<span style="background:${color}1a;color:${color};border:1px solid ${color}40;
              border-radius:20px;padding:2px 9px;font-size:11px;font-weight:600;">${s}</span>`
          ).join('')}</div>`
        : `<span style="font-size:11px;color:#94a3b8;font-style:italic;">Sin subcategorías</span>`
      }
    </div>`
  ).join('') || `<p style="color:#94a3b8;text-align:center;padding:20px;">No hay categorías guardadas. Se usarán las predeterminadas del sistema.</p>`
}

/* ── Agregar categoría ── */
window.agregarCategoria = async function() {
  const nombre = document.getElementById('nuevaCatNombre').value.trim()
  const subsStr = document.getElementById('nuevaCatSubs').value.trim()
  if(!nombre) { alert('Ingresá el nombre de la categoría.'); return }

  const subs = subsStr ? subsStr.split(',').map(s => s.trim()).filter(Boolean) : []

  if(!_catData[_catTipo]) _catData[_catTipo] = { ...CAT_DEFAULTS[_catTipo] }
  _catData[_catTipo][nombre] = subs

  await guardarCategorias()
  document.getElementById('nuevaCatNombre').value = ''
  document.getElementById('nuevaCatSubs').value  = ''
  renderCategorias()
}

/* ── Editar subcategorías ── */
window.editarSubcats = async function(cat) {
  const actual = (_catData[_catTipo]?.[cat] || []).join(', ')
  const nuevo = prompt(`Subcategorías de "${cat}"\n(Separá con comas):`, actual)
  if(nuevo === null) return
  _catData[_catTipo][cat] = nuevo.split(',').map(s => s.trim()).filter(Boolean)
  await guardarCategorias()
  renderCategorias()
}

/* ── Eliminar categoría ── */
window.eliminarCategoria = async function(cat) {
  if(!confirm(`¿Eliminar la categoría "${cat}" y todas sus subcategorías?`)) return
  if(!_catData[_catTipo]) _catData[_catTipo] = { ...CAT_DEFAULTS[_catTipo] }
  delete _catData[_catTipo][cat]
  await guardarCategorias()
  renderCategorias()
}

/* ── Guardar en Supabase + localStorage (para que el buscador lo lea sin auth) ── */
async function guardarCategorias() {
  const { error } = await supabase
    .from('configuracion')
    .upsert({ clave: 'categorias_' + _catTipo, valor: _catData[_catTipo] })
  if(error) { alert('Error al guardar: ' + error.message); return }
  // Guardar en localStorage para que el buscador público lo pueda leer
  try { localStorage.setItem('tc_cats_' + _catTipo, JSON.stringify(_catData[_catTipo])) } catch(e) {}
}

/* ══════════════════════════════════════════════════════
   GESTIÓN DE PUBLICIDADES
══════════════════════════════════════════════════════ */

const PUB_DEFAULTS = {
  inicio_a:       ['banner-pub-albanil.jpg','banner-pub-empresa.jpg','banner-pub-profesional.jpg','banner-pub-tech.jpg','banner-pub-oficina.jpg'],
  inicio_b:       ['banner-pub-empresa.jpg','banner-pub-profesional.jpg','banner-pub-tech.jpg','banner-pub-oficina.jpg','banner-pub-albanil.jpg'],
  oficios:        ['banner-pub-albanil.jpg','banner-pub-empresa.jpg','banner-pub-profesional.jpg','banner-pub-tech.jpg','banner-pub-oficina.jpg'],
  profesionales:  ['banner-pub-profesional.jpg','banner-pub-empresa.jpg','banner-pub-tech.jpg','banner-pub-oficina.jpg','banner-pub-albanil.jpg'],
  emprendimientos:['banner-pub-empresa.jpg','banner-pub-tech.jpg','banner-pub-oficina.jpg','banner-pub-albanil.jpg','banner-pub-profesional.jpg']
}

let _pubConfig = {
  inicio_a:       { cantidad: 5, imagenes: [...PUB_DEFAULTS.inicio_a] },
  inicio_b:       { cantidad: 5, imagenes: [...PUB_DEFAULTS.inicio_b] },
  oficios:        { cada: 3,    imagenes: [...PUB_DEFAULTS.oficios]       },
  profesionales:  { cada: 3,    imagenes: [...PUB_DEFAULTS.profesionales] },
  emprendimientos:{ cada: 3,    imagenes: [...PUB_DEFAULTS.emprendimientos]}
}

window.togglePub = function() {
  const sec = document.getElementById('seccionPub')
  const ch  = document.getElementById('pubChevron')
  const abierto = sec.style.display !== 'none'
  sec.style.display = abierto ? 'none' : 'block'
  ch.className = abierto ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up'
  if(!abierto) cargarPub()
}

window.abrirTabPub = function(tab) {
  const tabs = ['inicio','oficios','profesionales','emprendimientos']
  const colores = { inicio:'#f59e0b', oficios:'#ea580c', profesionales:'#7c3aed', emprendimientos:'#059669' }
  tabs.forEach(t => {
    const cont = document.getElementById('tabContent_' + t)
    const btn  = document.getElementById('tabPub_' + t)
    if(cont) cont.style.display = t === tab ? 'block' : 'none'
    if(btn)  btn.style.cssText  = t === tab
      ? `background:${colores[t]};color:white;border-color:${colores[t]};`
      : `color:${colores[t]};border-color:${colores[t]};border:1.5px solid;background:white;`
  })
}

async function cargarPub() {
  // Cargar config guardada
  const { data } = await supabase.from('configuracion').select('valor').eq('clave','pub_config').maybeSingle()
  if(data?.valor) {
    try { _pubConfig = { ..._pubConfig, ...JSON.parse(data.valor) } } catch(e){}
  }
  // Sincronizar selectores
  const ca = document.getElementById('cantInicio_a')
  const cb = document.getElementById('cantInicio_b')
  const co = document.getElementById('cadaOficios')
  if(ca) ca.value = _pubConfig.inicio_a?.cantidad || 5
  if(cb) cb.value = _pubConfig.inicio_b?.cantidad || 5
  if(co) co.value = _pubConfig.oficios?.cada || 3

  const cp = document.getElementById('cadaProfesionales')
  const ce = document.getElementById('cadaEmprendimientos')
  if(cp) cp.value = _pubConfig.profesionales?.cada || 3
  if(ce) ce.value = _pubConfig.emprendimientos?.cada || 3

  renderSlots('inicio_a',       'slots_inicio_a',       5)
  renderSlots('inicio_b',       'slots_inicio_b',       5)
  renderSlots('oficios',        'slots_oficios',         5)
  renderSlots('profesionales',  'slots_profesionales',   5)
  renderSlots('emprendimientos','slots_emprendimientos',  5)
}

function renderSlots(seccion, contenedorId, total) {
  const cont = document.getElementById(contenedorId)
  if(!cont) return
  const imgs  = _pubConfig[seccion]?.imagenes || PUB_DEFAULTS[seccion]
  const links = _pubConfig[seccion]?.links    || []
  let html = ''
  for(let i = 0; i < total; i++) {
    const url      = imgs[i]  || ''
    const link     = links[i] || ''
    // Cache-bust para GIFs (evita que el browser muestre versión estática cacheada)
    const esGifUrl = url.includes('.gif')
    const src      = url
      ? (url.startsWith('http') ? url : ('/' + url)) + (esGifUrl ? '?t=' + Date.now() : '')
      : ''
    const tieneImg = !!src
    html += `
      <div style="background:#f8fafc;border:1.5px solid ${tieneImg?'#bfdbfe':'#e2e8f0'};border-radius:10px;overflow:hidden;text-align:center;">
        <div style="height:90px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;">
          ${tieneImg
            ? `<img src="${src}" style="width:100%;height:90px;object-fit:contain;background:#f1f5f9;" onerror="this.parentNode.innerHTML='<i class=\\'fa-solid fa-image\\' style=\\'font-size:24px;color:#94a3b8;\\'></i>'">`
            : '<i class="fa-solid fa-image" style="font-size:24px;color:#94a3b8;"></i>'}
        </div>
        <div style="padding:8px 6px 10px;display:flex;flex-direction:column;gap:5px;align-items:center;">
          <div style="font-size:11px;font-weight:700;color:#64748b;">Slot ${i+1}</div>

          <!-- Campo de link / Instagram -->
          <input type="url"
            id="link_${seccion}_${i}"
            placeholder="https:// o instagram.com/usuario"
            value="${link}"
            style="width:100%;padding:5px 7px;border:1.5px solid #e2e8f0;border-radius:7px;
                   font-size:10px;color:#374151;outline:none;"
            onchange="window.guardarLink('${seccion}',${i},this.value)"
            onblur="window.guardarLink('${seccion}',${i},this.value)">

          <label style="
            display:inline-flex;align-items:center;gap:5px;cursor:pointer;
            background:#2563eb;color:white;font-size:11px;font-weight:700;
            padding:5px 10px;border-radius:7px;width:100%;justify-content:center;">
            <i class="fa-solid fa-upload"></i> ${tieneImg ? 'Cambiar' : 'Subir'}
            <input type="file" accept="image/*,image/gif" style="display:none"
              onchange="window.subirPub('${seccion}',${i},this)">
          </label>
          ${tieneImg ? `
          <button onclick="window.borrarPub('${seccion}',${i})"
            style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;
            background:#fee2e2;color:#dc2626;font-size:11px;font-weight:700;
            padding:4px 10px;border-radius:7px;border:1.5px solid #fca5a5;width:100%;justify-content:center;">
            <i class="fa-solid fa-trash"></i> Borrar
          </button>` : ''}
        </div>
      </div>`
  }
  cont.innerHTML = html
}

/* Guardar link de un slot sin recargar toda la vista */
window.guardarLink = async function(seccion, idx, valor) {
  if(!_pubConfig[seccion]) _pubConfig[seccion] = { imagenes: [...(PUB_DEFAULTS[seccion]||[])] }
  if(!_pubConfig[seccion].links) _pubConfig[seccion].links = []
  _pubConfig[seccion].links[idx] = valor.trim()
  await guardarConfig()
}

window.subirPub = async function(seccion, idx, input) {
  if(!input.files?.length) return
  const file    = input.files[0]
  const esGif   = file.type === 'image/gif'
  const ext     = esGif ? 'gif' : 'jpg'
  // Timestamp en nombre → rompe caché del browser y del CDN
  const ts      = Date.now()
  const path    = `pub/${seccion}_${idx+1}_${ts}.${ext}`
  mostrarPubMsg('Subiendo imagen...', 'info')
  // Borrar archivos anteriores del mismo slot (limpieza)
  await Promise.allSettled([
    supabase.storage.from('trabajos').remove([`pub/${seccion}_${idx+1}.jpg`]),
    supabase.storage.from('trabajos').remove([`pub/${seccion}_${idx+1}.gif`]),
  ])

  // GIFs: subir sin tocar (preserva animación)
  // Otras imágenes: redimensionar a formato banner (960×360 px, cropeado centrado)
  let blob = file
  if(!esGif) {
    try {
      blob = await new Promise((res, rej) => {
        const img = new Image()
        img.onload = () => {
          const BANNER_W = 960, BANNER_H = 360
          const cv = document.createElement('canvas')
          cv.width = BANNER_W; cv.height = BANNER_H
          const ctx = cv.getContext('2d')
          // Escalar para cubrir el banner (cover)
          const escalaW = BANNER_W / img.width
          const escalaH = BANNER_H / img.height
          const escala  = Math.max(escalaW, escalaH)
          const dw = img.width  * escala
          const dh = img.height * escala
          const dx = (BANNER_W - dw) / 2
          const dy = (BANNER_H - dh) / 2
          ctx.drawImage(img, dx, dy, dw, dh)
          cv.toBlob(b => res(b), 'image/jpeg', 0.85)
        }
        img.onerror = rej
        img.src = URL.createObjectURL(file)
      })
    } catch(e) { blob = file }
  }

  const contentType = esGif ? 'image/gif' : 'image/jpeg'
  const { error } = await supabase.storage.from('trabajos').upload(path, blob, { upsert: true, contentType })
  if(error) { mostrarPubMsg('❌ Error al subir: ' + error.message, 'err'); return }

  const { data: urlData } = supabase.storage.from('trabajos').getPublicUrl(path)
  const url = urlData.publicUrl

  if(!_pubConfig[seccion]) _pubConfig[seccion] = { imagenes: [...(PUB_DEFAULTS[seccion]||[])] }
  if(!_pubConfig[seccion].imagenes) _pubConfig[seccion].imagenes = [...(PUB_DEFAULTS[seccion]||[])]
  _pubConfig[seccion].imagenes[idx] = url

  await guardarConfig()
  renderSlots(seccion, `slots_${seccion}`, 5)
  mostrarPubMsg('✅ Imagen ' + (idx+1) + ' actualizada' + (esGif ? ' (GIF animado)' : ' y redimensionada al formato banner'), 'ok')
}

/* ── Borrar imagen de un slot ── */
window.borrarPub = async function(seccion, idx) {
  if(!confirm(`¿Borrar la imagen del slot ${idx+1} de "${seccion}"?`)) return
  mostrarPubMsg('Borrando...', 'info')

  // Borrar del storage: la URL guardada tiene el nombre real con timestamp
  const urlActual = _pubConfig[seccion]?.imagenes?.[idx] || ''
  if(urlActual) {
    const pathMatch = urlActual.match(/\/trabajos\/(.+)$/)
    if(pathMatch) await supabase.storage.from('trabajos').remove([decodeURIComponent(pathMatch[1])])
  }
  // Fallback: intentar nombres sin timestamp
  await Promise.allSettled([
    supabase.storage.from('trabajos').remove([`pub/${seccion}_${idx+1}.jpg`]),
    supabase.storage.from('trabajos').remove([`pub/${seccion}_${idx+1}.gif`])
  ])

  // Limpiar la URL de la config
  if(_pubConfig[seccion]?.imagenes) {
    _pubConfig[seccion].imagenes[idx] = ''
  }

  await guardarConfig()
  renderSlots(seccion, `slots_${seccion}`, 5)
  mostrarPubMsg('✅ Imagen del slot ' + (idx+1) + ' eliminada', 'ok')
}

window.guardarConfig = async function() {
  // Leer los selectores
  const ca = document.getElementById('cantInicio_a')
  const cb = document.getElementById('cantInicio_b')
  const co = document.getElementById('cadaOficios')
  const cp = document.getElementById('cadaProfesionales')
  const ce = document.getElementById('cadaEmprendimientos')
  if(ca) _pubConfig.inicio_a.cantidad       = parseInt(ca.value)
  if(cb) _pubConfig.inicio_b.cantidad       = parseInt(cb.value)
  if(co) _pubConfig.oficios.cada            = parseInt(co.value)
  if(cp) _pubConfig.profesionales.cada      = parseInt(cp.value)
  if(ce) _pubConfig.emprendimientos.cada    = parseInt(ce.value)

  const { error } = await supabase.from('configuracion')
    .upsert({ clave: 'pub_config', valor: JSON.stringify(_pubConfig) })
  if(error) { mostrarPubMsg('❌ Error al guardar configuración', 'err'); return }
  mostrarPubMsg('✅ Configuración guardada', 'ok')
  setTimeout(() => { const m = document.getElementById('pubMsg'); if(m) m.style.display='none' }, 3000)
}

function mostrarPubMsg(txt, tipo) {
  const el = document.getElementById('pubMsg')
  if(!el) return
  el.textContent = txt
  el.style.cssText = tipo === 'ok'
    ? 'display:block;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px;'
    : tipo === 'err'
    ? 'display:block;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px;'
    : 'display:block;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px;'
}

/* ── Postulantes a Vendedor ── */
async function cargarVendedores() {
  const cont = document.getElementById("listaVendedores")
  const { data, error } = await supabase
    .from("vendedores_postulaciones")
    .select("*")
    .order("created_at", { ascending: false })

  if(error || !data?.length) {
    cont.innerHTML = `<p style="color:#94a3b8;font-size:13px;text-align:center;padding:20px;">Sin postulaciones aún.</p>`
    return
  }

  document.getElementById("contadorVendedores").textContent = `(${data.length})`

  cont.innerHTML = data.map(p => {
    const wa = p.telefono ? `https://wa.me/${p.telefono.replace(/\D/g,"")}?text=${encodeURIComponent(`Hola ${p.nombre}, vi tu postulación en Trabajos Cerca y me interesa hablar con vos. 👋`)}` : null
    const fecha = new Date(p.created_at).toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",year:"numeric"})
    const tipoLabel = p.tipo_postulacion === "jefe_ventas" ? "Jefe/a de Ventas" : "Vendedor/a"
    const estadoColor = p.estado === "aprobado" ? "#16a34a" : p.estado === "rechazado" ? "#dc2626" : "#d97706"

    return `<div style="border:1.5px solid #e2e8f0;border-radius:12px;padding:16px 18px;margin-bottom:12px;display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;">
      ${p.foto ? `<img src="${p.foto}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0;">` : `<div style="width:56px;height:56px;border-radius:50%;background:#ede9fe;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa-solid fa-user" style="color:#7c3aed;font-size:22px;"></i></div>`}
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
          <strong style="font-size:15px;">${p.nombre} ${p.apellido}</strong>
          <span style="background:#ede9fe;color:#7c3aed;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;">${tipoLabel}</span>
          <span style="color:${estadoColor};font-size:11px;font-weight:700;text-transform:uppercase;">${p.estado || "pendiente"}</span>
        </div>
        <div style="font-size:12px;color:#64748b;margin-bottom:6px;">
          📍 ${p.ciudad || ""}${p.provincia ? ", " + p.provincia : ""} ${p.cp ? "· CP "+p.cp : ""} · ${fecha}
          ${p.email ? `· <a href="mailto:${p.email}" style="color:#2563eb;">${p.email}</a>` : ""}
        </div>
        ${p.motivacion ? `<p style="font-size:13px;color:#374151;margin:0 0 10px;line-height:1.5;">${p.motivacion.slice(0,200)}${p.motivacion.length>200?"…":""}</p>` : ""}
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${p.usuario_id ? `<a href="/perfil_publico.html?id=${p.usuario_id}" target="_blank" class="btn btn-outline btn-sm"><i class="fa-solid fa-id-card"></i> Ver CV</a>` : ""}
          ${wa ? `<a href="${wa}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:#25d366;color:white;border-radius:8px;padding:6px 14px;font-size:13px;font-weight:700;text-decoration:none;"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>` : ""}
          <button onclick="cambiarEstadoVendedor('${p.id}','aprobado',this)" style="background:#f0fdf4;color:#16a34a;border:1.5px solid #bbf7d0;border-radius:8px;padding:6px 14px;font-size:13px;font-weight:700;cursor:pointer;">✓ Aprobar</button>
          <button onclick="cambiarEstadoVendedor('${p.id}','rechazado',this)" style="background:#fef2f2;color:#dc2626;border:1.5px solid #fecaca;border-radius:8px;padding:6px 14px;font-size:13px;font-weight:700;cursor:pointer;">✗ Rechazar</button>
        </div>
      </div>
    </div>`
  }).join("")
}

window.toggleTipoAdmin = async function(userId, tipo, estaActivo) {
  const { data: perf } = await supabase.from("perfiles").select("tipo").eq("id", userId).single()
  const tipos = (perf?.tipo || "").split(",").map(t => t.trim()).filter(Boolean)
  const nuevosTipos = estaActivo ? tipos.filter(t => t !== tipo) : [...tipos, tipo]
  await supabase.from("perfiles").update({ tipo: nuevosTipos.join(",") }).eq("id", userId)

  if(tipo === "cv") {
    const cvActivo = !estaActivo
    // Buscar curriculum existente
    const { data: cv } = await supabase.from("curriculum").select("id").eq("usuario_id", userId).maybeSingle()
    if(cv) {
      await supabase.from("curriculum").update({ cv_publico: cvActivo }).eq("id", cv.id)
    } else if(cvActivo) {
      // No tiene curriculum — crear entrada mínima para que aparezca en el buscador
      await supabase.from("curriculum").insert({
        usuario_id: userId,
        cv_publico: true,
        titulo_profesional: "CV en construcción"
      })
    }
  }

  const idx = _perfiles.findIndex(p => p.id === userId)
  if(idx >= 0) _perfiles[idx].tipo = nuevosTipos.join(",")
  renderTabla()
}

window.cambiarEstadoVendedor = async function(id, estado, btn) {
  btn.disabled = true
  await supabase.from("vendedores_postulaciones").update({ estado }).eq("id", id)
  cargarVendedores()
}

/* ── Init ── */
async function init() {
  const ok = await verificarAdmin()
  if (!ok) return
  await Promise.all([cargarStats(), cargarPerfiles(), cargarSolicitudes(), cargarVendedores()])
}

init()
