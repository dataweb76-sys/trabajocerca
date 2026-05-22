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
    .select("id, nombre, apellido, nombre_empresa, email, localidad, provincia, verificado, destacado, admin, created_at")
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

    return `
    <div class="admin-row" id="row-${p.id}">
      <div class="admin-info">
        <strong style="font-size:15px;">${nombre}</strong>
        <span style="font-size:12px;color:#64748b;">${p.email||""}</span>
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
  const [
    { count: total },
    { count: verificados },
    { count: destacados },
    { count: solPendientes },
    { count: pedidos }
  ] = await Promise.all([
    supabase.from("perfiles").select("id", { count: "exact", head: true }),
    supabase.from("perfiles").select("id", { count: "exact", head: true }).eq("verificado", true),
    supabase.from("perfiles").select("id", { count: "exact", head: true }).eq("destacado", true),
    supabase.from("solicitudes_portfolio").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
    supabase.from("pedidos").select("id", { count: "exact", head: true }).eq("estado", "abierto")
  ])

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

  if (!data?.length) {
    cont.innerHTML = `<p style="text-align:center;color:#94a3b8;padding:20px;font-size:13px;">No hay solicitudes aún.</p>`
    return
  }

  const renderSol = (s, isPendiente) => {
    const p = s.perfiles || {}
    const nombre = (p.nombre_empresa && p.nombre_empresa.trim())
      ? p.nombre_empresa
      : `${p.nombre || ""} ${p.apellido || ""}`.trim() || "(sin nombre)"
    const planLabel = s.plan === "basico" ? "Básico — $10.000/mes" : "Pro — $20.000/mes"
    const planColor = s.plan === "basico" ? "#2563eb" : "#f97316"
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
          <button onclick="aprobarSolicitud('${s.id}', '${s.usuario_id}', '${s.plan}')"
            class="btn btn-sm" style="background:#16a34a;color:white;">
            <i class="fa-solid fa-circle-check"></i> Aprobar
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
window.aprobarSolicitud = async function(solicitudId, usuarioId, plan) {
  const planNivel = plan === "basico" ? 1 : 2
  const planLabel = plan === "basico" ? "Básico" : "Pro"

  const row = document.getElementById(`sol-${solicitudId}`)
  if (row) row.style.opacity = "0.5"

  // Activar plan en el perfil
  const { error: e1 } = await supabase
    .from("perfiles").update({
      plan_nivel: planNivel,
      ...(plan === "pro" ? { destacado: true } : {})
    }).eq("id", usuarioId)

  if (e1) { alert("Error: " + e1.message); if (row) row.style.opacity = "1"; return }

  // Marcar solicitud como aprobada
  await supabase.from("solicitudes_portfolio")
    .update({ estado: "aprobado" }).eq("id", solicitudId)

  // Notificar al profesional
  await supabase.from("notificaciones").insert({
    usuario_id: usuarioId,
    tipo:       "sistema",
    titulo:     `🎉 Plan ${planLabel} activado`,
    cuerpo:     `Tu plan fue aprobado. Entrá a "Mi servicio" y empezá a subir fotos de tus trabajos.`,
    url:        "/perfil_servicio.html"
  }).catch(() => {})

  // Actualizar stats y lista
  await Promise.all([cargarSolicitudes(), cargarStats()])
  // Actualizar en la tabla de perfiles también
  const idx = _perfiles.findIndex(p => p.id === usuarioId)
  if (idx >= 0) {
    _perfiles[idx].plan_nivel = planNivel
    if (plan === "pro") _perfiles[idx].destacado = true
  }
}

/* ── Rechazar solicitud ── */
window.rechazarSolicitud = async function(solicitudId) {
  if (!confirm("¿Rechazar esta solicitud?")) return

  await supabase.from("solicitudes_portfolio")
    .update({ estado: "rechazado" }).eq("id", solicitudId)

  await cargarSolicitudes()
}

/* ── Init ── */
async function init() {
  const ok = await verificarAdmin()
  if (!ok) return
  await Promise.all([cargarStats(), cargarPerfiles(), cargarSolicitudes()])
}

init()
