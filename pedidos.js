import { supabase } from "./supabase.js"

/* ── Constantes ── */
const SB_URL = "https://iqeiszkoifxgygoqvbem.supabase.co"
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs"

const TODAS_CATS = [
  "Albañilería","Plomería","Gasista","Electricista","Pintura","Carpintería",
  "Jardinería","Herrería","Cerrajería","Limpieza","Mudanzas","Refrigeración",
  "Informática","Gastronomía","Mecánico","Tapicería","Personal Trainer",
  "Enfermero","Niñera","Delivery","Planchado","Peluquería","Fotógrafo",
  "Médico","Odontólogo","Psicólogo","Kinesiólogo","Nutricionista","Veterinario",
  "Arquitecto","Abogado","Contador","Ingeniero","Diseñador","Profesor",
  "Administración","Comunicación","Biólogo/Químico"
]

const CAT_ICONOS = {
  "Albañilería":"🧱","Plomería":"🔧","Gasista":"🔥","Electricista":"⚡",
  "Pintura":"🎨","Carpintería":"🪚","Jardinería":"🌿","Herrería":"⛏️",
  "Cerrajería":"🔑","Limpieza":"🧹","Mudanzas":"📦","Refrigeración":"❄️",
  "Informática":"💻","Gastronomía":"👨‍🍳","Mecánico":"🔩","Tapicería":"🛋️",
  "Personal Trainer":"💪","Enfermero":"🩺","Niñera":"👶","Delivery":"🛵",
  "Planchado":"👔","Peluquería":"✂️","Fotógrafo":"📸","Médico":"🏥",
  "Odontólogo":"🦷","Psicólogo":"🧠","Kinesiólogo":"🏃","Nutricionista":"🥗",
  "Veterinario":"🐾","Arquitecto":"🏗️","Abogado":"⚖️","Contador":"📊",
  "Ingeniero":"🔬","Diseñador":"🎯","Profesor":"📚","Administración":"🗂️",
  "Comunicación":"📣","Biólogo/Químico":"🔭"
}

function getIco(cat) {
  if (!cat) return "📋"
  for (const [k, v] of Object.entries(CAT_ICONOS)) {
    if (cat.toLowerCase().includes(k.toLowerCase())) return v
  }
  return "📋"
}

/* ── Estado global ── */
let _usuario = null   // { id, nombre, apellido, movil, ... } o null
let _pedidos  = []

/* ── Init ── */
async function init() {
  const { data: authData } = await supabase.auth.getUser()
  if (authData?.user) {
    const { data: perfil } = await supabase
      .from("perfiles").select("id, nombre, apellido, movil")
      .eq("id", authData.user.id).single()
    _usuario = perfil || null
  }
  await cargarPedidos()
}

/* ── Cargar pedidos ── */
async function cargarPedidos() {
  const cat = document.getElementById("filtroCat")?.value?.trim() || ""
  const loc = document.getElementById("filtroLoc")?.value?.trim() || ""

  let q = supabase
    .from("pedidos")
    .select("*, perfiles(id, nombre, apellido, nombre_empresa, mostrar_como, movil, mostrar_telefono)")
    .eq("estado", "abierto")
    .order("urgente", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60)

  if (cat) q = q.eq("categoria", cat)
  if (loc) q = q.ilike("localidad", `%${loc}%`)

  const { data, error } = await q

  if (error) {
    document.getElementById("lista-pedidos").innerHTML =
      `<div class="alerta alerta-err">Error al cargar pedidos: ${error.message}</div>`
    return
  }

  _pedidos = data || []
  renderPedidos()
}

/* ── Render pedidos ── */
function renderPedidos() {
  const el = document.getElementById("lista-pedidos")
  if (!_pedidos.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:48px 20px;color:#64748b;">
        <div style="font-size:48px;margin-bottom:12px;">📭</div>
        <p style="font-size:16px;font-weight:600;margin:0 0 6px;">No hay pedidos por ahora</p>
        <p style="font-size:14px;margin:0;">¡Sé el primero en publicar lo que necesitás!</p>
      </div>`
    return
  }

  el.innerHTML = _pedidos.map(p => {
    /* Nombre del cliente */
    let nombre = "Anónimo"
    if (p.perfiles) {
      const pf = p.perfiles
      nombre = (pf.mostrar_como === "empresa" && pf.nombre_empresa)
        ? pf.nombre_empresa
        : `${pf.nombre || ""} ${pf.apellido || ""}`.trim() || "Usuario"
    } else if (p.contacto_nombre) {
      nombre = p.contacto_nombre
    }

    /* Tiempo relativo */
    const hace = tiempoRelativo(p.created_at)

    /* Botón de contacto */
    let btnContacto = ""
    const movil = p.perfiles?.mostrar_telefono !== false && p.perfiles?.movil
      ? p.perfiles.movil
      : (!p.perfiles && p.contacto_movil ? p.contacto_movil : null)

    if (_usuario && movil) {
      const msg = encodeURIComponent(`Hola ${nombre}! Vi tu pedido de ${p.categoria} en Trabajos Cerca y me interesa ayudarte. 🙋‍♂️`)
      const tel = movil.replace(/\D/g, "")
      btnContacto = `<a class="btn-interesa" href="https://wa.me/${tel}?text=${msg}" target="_blank" rel="noopener">
        <i class="fa-brands fa-whatsapp"></i> Me interesa
      </a>`
    } else if (!_usuario) {
      btnContacto = `<a href="/login.html" style="font-size:13px;color:#2563eb;text-decoration:underline;">
        <i class="fa-solid fa-lock" style="font-size:11px;"></i> Iniciá sesión para contactar
      </a>`
    }

    return `
    <div class="pedido-card${p.urgente ? " urgente" : ""}">
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px;">
        <div style="font-size:32px;line-height:1;">${getIco(p.categoria)}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px;">
            <span style="font-weight:800;font-size:16px;color:#1e293b;">${p.categoria}</span>
            ${p.urgente ? `<span class="badge-urgente"><i class="fa-solid fa-bolt"></i> URGENTE</span>` : ""}
          </div>
          <div style="font-size:13px;color:#64748b;">
            <i class="fa-solid fa-user" style="font-size:11px;"></i> ${nombre}
            ${p.localidad ? ` &nbsp;·&nbsp; <i class="fa-solid fa-location-dot" style="font-size:11px;"></i> ${p.localidad}` : ""}
            &nbsp;·&nbsp; <i class="fa-solid fa-clock" style="font-size:11px;"></i> ${hace}
          </div>
        </div>
      </div>
      ${p.descripcion ? `<p style="margin:0 0 12px;font-size:14px;color:#475569;line-height:1.55;background:#f8fafc;border-radius:8px;padding:10px 12px;">${escHtml(p.descripcion)}</p>` : ""}
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        ${btnContacto}
        <span style="font-size:12px;color:#94a3b8;">
          <i class="fa-solid fa-hashtag" style="font-size:10px;"></i>${p.id.substring(0,8)}
        </span>
      </div>
    </div>`
  }).join("")
}

/* ── Helpers ── */
function escHtml(t) {
  return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
}

function tiempoRelativo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60)   return "ahora"
  if (diff < 3600) return `hace ${Math.floor(diff/60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff/3600)} hs`
  const d = Math.floor(diff/86400)
  return d === 1 ? "hace 1 día" : `hace ${d} días`
}

/* ── Modal ── */
window.abrirModalPedido = function() {
  // Pre-rellenar datos si está logueado
  if (_usuario) {
    if (_usuario.nombre) document.getElementById("pNombre").value =
      `${_usuario.nombre} ${_usuario.apellido || ""}`.trim()
    if (_usuario.movil) document.getElementById("pMovil").value = _usuario.movil
  }
  document.getElementById("modalPedidoOverlay").style.display = "flex"
  document.body.style.overflow = "hidden"
  document.getElementById("msgNuevoPedido").innerHTML = ""
}

window.cerrarModalPedido = function() {
  document.getElementById("modalPedidoOverlay").style.display = "none"
  document.body.style.overflow = ""
}

window.cerrarModalPedidoClick = function(e) {
  if (e.target === document.getElementById("modalPedidoOverlay")) {
    window.cerrarModalPedido()
  }
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape") window.cerrarModalPedido()
})

/* ── Publicar pedido ── */
window.publicarNuevoPedido = async function() {
  const msgEl = document.getElementById("msgNuevoPedido")
  const cat    = document.getElementById("pCategoria").value
  const desc   = document.getElementById("pDescripcion").value.trim()
  const loc    = document.getElementById("pLocalidad").value.trim()
  const urgente = document.getElementById("pUrgente").checked
  const nombre = document.getElementById("pNombre").value.trim()
  const movil  = document.getElementById("pMovil").value.trim()

  if (!cat) {
    msgEl.innerHTML = '<div class="alerta alerta-err">Seleccioná una categoría</div>'
    return
  }
  if (!loc) {
    msgEl.innerHTML = '<div class="alerta alerta-err">Escribí tu localidad</div>'
    return
  }
  if (!movil) {
    msgEl.innerHTML = '<div class="alerta alerta-err">Tu número de WhatsApp es necesario para que los profesionales te contacten</div>'
    return
  }

  msgEl.innerHTML = '<div style="color:#64748b;font-size:13px;"><i class="fa-solid fa-spinner fa-spin"></i> Publicando...</div>'

  const pedido = {
    categoria:       cat,
    descripcion:     desc || null,
    localidad:       loc,
    urgente:         urgente,
    estado:          "abierto",
    contacto_nombre: nombre || null,
    contacto_movil:  movil
  }

  if (_usuario) {
    pedido.cliente_id = _usuario.id
  }

  const { data: nuevoPedido, error } = await supabase
    .from("pedidos").insert(pedido).select().single()

  if (error) {
    msgEl.innerHTML = `<div class="alerta alerta-err">${error.message}</div>`
    return
  }

  // Notificar profesionales de la categoría
  notificarProfesionales(cat, loc, nuevoPedido.id).catch(() => {})

  msgEl.innerHTML = '<div class="alerta alerta-ok"><i class="fa-solid fa-check"></i> ¡Pedido publicado! Los profesionales de tu zona te van a contactar.</div>'

  // Limpiar form
  document.getElementById("pCategoria").value = ""
  document.getElementById("pDescripcion").value = ""
  document.getElementById("pLocalidad").value = ""
  document.getElementById("pUrgente").checked = false
  if (!_usuario) {
    document.getElementById("pNombre").value = ""
    document.getElementById("pMovil").value = ""
  }

  // Refrescar lista después de 1.5s y cerrar modal
  setTimeout(async () => {
    window.cerrarModalPedido()
    await cargarPedidos()
  }, 1500)
}

/* ── Notificar profesionales ── */
async function notificarProfesionales(categoria, localidad, pedidoId) {
  // Buscar hasta 50 profesionales con esa categoría
  const { data: servicios } = await supabase
    .from("servicios")
    .select("usuario_id")
    .ilike("categoria", `%${categoria}%`)
    .limit(50)

  if (!servicios?.length) return

  const ids = [...new Set(servicios.map(s => s.usuario_id))]

  // Insertar en lotes de 10
  const cuerpo = localidad
    ? `Alguien en ${localidad} busca un/a ${categoria}`
    : `Alguien cerca busca un/a ${categoria}`

  const notifs = ids.map(uid => ({
    usuario_id: uid,
    tipo:       "pedido",
    titulo:     `Nuevo pedido de ${categoria}`,
    cuerpo:     cuerpo,
    url:        "/pedidos.html"
  }))

  for (let i = 0; i < notifs.length; i += 10) {
    await supabase.from("notificaciones")
      .insert(notifs.slice(i, i + 10))
      .catch(() => {})
  }
}

/* ── Filtros ── */
window.buscarPedidos = async function() {
  document.getElementById("lista-pedidos").innerHTML =
    `<div style="text-align:center;padding:40px;color:#64748b;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size:28px;"></i>
    </div>`
  await cargarPedidos()
}

window.limpiarFiltros = async function() {
  document.getElementById("filtroCat").value = ""
  document.getElementById("filtroLoc").value = ""
  await cargarPedidos()
}

/* ── Arrancar ── */
init()
