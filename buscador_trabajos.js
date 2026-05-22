/* buscador_trabajos.js — Buscador de empleados (CVs) */

const SB_URL = "https://iqeiszkoifxgygoqvbem.supabase.co"
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs"
const SB_HEADERS = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` }

const RUBROS = [
  "Atención al público", "Ventas y comercial", "Administración",
  "Contabilidad y finanzas", "Logística y depósito", "Cocina y gastronomía",
  "Limpieza y mantenimiento", "Seguridad y vigilancia", "Educación y docencia",
  "Salud y enfermería", "Electricidad y gas", "Construcción",
  "Informática y sistemas", "Marketing y publicidad", "Transporte y delivery",
  "Producción e industria", "Diseño y arte", "Turismo y hotelería",
  "Cuidado de personas", "Recursos humanos", "Mecánica automotriz",
  "Servicio técnico", "Textil y confección", "Agropecuario"
]

let todosLosCVs   = []
let rubroActivo   = null
let _termBusqueda = ""
let _userTipo     = undefined   // null = no logueado, "empleador" | "profesional" | "trabajador"

/* ── AUTH ── */
function getAccessToken(){
  try { return JSON.parse(localStorage.getItem("sb-iqeiszkoifxgygoqvbem-auth-token"))?.access_token || null } catch(e){ return null }
}
function getCurrentUserId(){
  const t = getAccessToken(); if(!t) return null
  try { return JSON.parse(atob(t.split(".")[1])).sub || null } catch(e){ return null }
}
function esEmpleador(){ return _userTipo === "empleador" }

async function cargarUserTipo(){
  const uid = getCurrentUserId()
  if(!uid){ _userTipo = null; return }
  try {
    const res = await fetch(`${SB_URL}/rest/v1/perfiles?id=eq.${uid}&select=tipo`, { headers: SB_HEADERS })
    if(res.ok){ const d = await res.json(); _userTipo = d?.[0]?.tipo || null }
    else _userTipo = null
  } catch(e){ _userTipo = null }
}

/* ── INIT ── */
async function init(){
  renderChips()
  await cargarUserTipo()
  await cargarCVs()
}

/* ── CHIPS DE RUBROS ── */
function renderChips(){
  const cont = document.getElementById("rubrosChips")
  const todos = document.createElement("span")
  todos.className = "chip-rubro todos activo"
  todos.textContent = "Todos"
  todos.onclick = () => seleccionarChip(null, todos)
  cont.appendChild(todos)

  RUBROS.forEach(r => {
    const chip = document.createElement("span")
    chip.className = "chip-rubro"
    chip.textContent = r
    chip.dataset.rubro = r
    chip.onclick = () => seleccionarChip(r, chip)
    cont.appendChild(chip)
  })
}

function seleccionarChip(rubro, elChip){
  rubroActivo = rubro
  document.querySelectorAll(".chip-rubro").forEach(c => {
    c.classList.remove("activo")
    if(c.classList.contains("todos") && !rubro) c.classList.add("activo")
  })
  elChip.classList.add("activo")
  document.getElementById("inputTexto").value = ""
  _termBusqueda = ""
  aplicarFiltros()
}

/* ── CARGA DATOS ── */
async function cargarCVs(){
  const cont = document.getElementById("resultados")
  try {
    const url = `${SB_URL}/rest/v1/curriculum` +
      `?select=usuario_id,titulo_profesional,rubros,disponibilidad,modalidad,edad,habilidades,resumen` +
      `,perfiles!usuario_id(nombre,apellido,foto,localidad,provincia,movil)` +
      `&order=created_at.desc`

    const res = await fetch(url, { headers: SB_HEADERS })
    if(!res.ok){ const e = await res.json(); throw new Error(e.message || res.statusText) }
    todosLosCVs = (await res.json()).filter(cv => cv.perfiles && cv.titulo_profesional)
  } catch(e){
    cont.innerHTML = `<div class="alerta alerta-err">Error al cargar candidatos: ${e.message}</div>`
    return
  }
  aplicarFiltros()
}

/* ── FILTROS ── */
window.aplicarFiltros = function(){
  _termBusqueda = (document.getElementById("inputTexto")?.value || "").trim().toLowerCase()
  const ciudad  = (document.getElementById("inputCiudad")?.value || "").trim().toLowerCase()
  const divSug  = document.getElementById("sugerenciaRubro")

  // Verificar si el término coincide con algún rubro
  let chipCoincide = null
  if(_termBusqueda){
    chipCoincide = RUBROS.find(r => r.toLowerCase().includes(_termBusqueda) || _termBusqueda.includes(r.toLowerCase().split(" ")[0]))
    if(chipCoincide){
      // Seleccionar chip automáticamente
      document.querySelectorAll(".chip-rubro").forEach(c => {
        c.classList.remove("activo")
        if(c.dataset.rubro === chipCoincide) c.classList.add("activo")
      })
      rubroActivo = chipCoincide
    }
  }

  let filtrados = todosLosCVs.filter(cv => {
    const p = cv.perfiles

    // Filtro rubro
    if(rubroActivo){
      const rubros = Array.isArray(cv.rubros) ? cv.rubros : []
      if(!rubros.includes(rubroActivo)) return false
    }

    // Filtro texto (si no seleccionó chip automático)
    if(_termBusqueda && !chipCoincide){
      const haystack = [
        cv.titulo_profesional, cv.habilidades, cv.resumen,
        ...(Array.isArray(cv.rubros) ? cv.rubros : [])
      ].join(" ").toLowerCase()
      if(!haystack.includes(_termBusqueda)) return false
    }

    // Filtro ciudad
    if(ciudad){
      const loc = (p.localidad || "").toLowerCase()
      const prov = (p.provincia || "").toLowerCase()
      if(!loc.includes(ciudad) && !prov.includes(ciudad)) return false
    }

    return true
  })

  // Sugerencia si no hay resultados y término no está en RUBROS
  if(divSug){
    if(_termBusqueda && !chipCoincide && filtrados.length === 0){
      document.getElementById("textoSugerencia").textContent =
        `No encontramos candidatos para "${_termBusqueda}" y este rubro aún no está en nuestra lista.`
      divSug.style.display = "block"
      window._terminoSugerido = _termBusqueda
    } else {
      divSug.style.display = "none"
    }
  }

  renderResultados(filtrados)
}

/* ── SUGERIR RUBRO ── */
window.sugerirRubro = async function(){
  const termino = window._terminoSugerido
  if(!termino) return
  try {
    await fetch(`${SB_URL}/rest/v1/rubros_sugeridos`, {
      method: "POST",
      headers: { ...SB_HEADERS, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ termino, created_at: new Date().toISOString() })
    })
  } catch(e){}
  document.getElementById("sugerenciaRubro").innerHTML = `
    <div class="alerta alerta-ok" style="margin:0;">
      <i class="fa-solid fa-check"></i> ¡Gracias! Vamos a agregar <strong>"${termino}"</strong> pronto.
    </div>`
}

/* ── RENDER ── */
function renderResultados(cvs){
  const cont      = document.getElementById("resultados")
  const empleador = esEmpleador()
  const uid       = getCurrentUserId()

  if(!cvs.length){
    cont.innerHTML = `<div style="text-align:center;padding:50px 20px;color:#94a3b8;">
      <i class="fa-solid fa-user-slash" style="font-size:44px;opacity:.3;display:block;margin-bottom:14px;"></i>
      <p style="font-size:16px;margin-bottom:8px;">No hay candidatos para esta búsqueda.</p>
      ${rubroActivo ? `<p style="font-size:14px;">Probá seleccionando <strong>"Todos"</strong> o cambiando el rubro.</p>` : ""}
    </div>`
    return
  }

  const total = cvs.length

  // Banner para no-empleadores: prominente y convincente
  let bannerHtml = ""
  if(!empleador){
    bannerHtml = `
    <div style="background:linear-gradient(135deg,#7c3aed,#1d4ed8);border-radius:16px;padding:22px 24px;margin-bottom:22px;">
      <div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap;">
        <div style="font-size:36px;flex-shrink:0;margin-top:2px;">🔓</div>
        <div style="flex:1;min-width:200px;">
          <p style="margin:0 0 4px;font-size:17px;font-weight:900;color:white;">
            Registrate y contactá candidatos de tu zona
          </p>
          <p style="margin:0 0 14px;font-size:13px;color:rgba(255,255,255,.85);line-height:1.6;">
            Estás viendo <strong style="color:white;">${total} persona${total!==1?"s":""}</strong> que buscan trabajo cerca tuyo.
            Con una cuenta de empresa accedés al <strong style="color:white;">CV completo</strong>,
            <strong style="color:white;">datos de contacto</strong> y podés escribirles por
            <strong style="color:white;">WhatsApp</strong> directamente. <strong style="color:white;">100% gratis.</strong>
          </p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
            <span style="background:rgba(255,255,255,.18);border-radius:20px;padding:4px 12px;font-size:12px;color:white;font-weight:600;">📋 CV completo</span>
            <span style="background:rgba(255,255,255,.18);border-radius:20px;padding:4px 12px;font-size:12px;color:white;font-weight:600;">💬 WhatsApp directo</span>
            <span style="background:rgba(255,255,255,.18);border-radius:20px;padding:4px 12px;font-size:12px;color:white;font-weight:600;">🎯 Filtros por rubro y ciudad</span>
            <span style="background:rgba(255,255,255,.18);border-radius:20px;padding:4px 12px;font-size:12px;color:white;font-weight:600;">🆓 Sin costo</span>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <a href="/registro_empresa.html"
              style="display:inline-flex;align-items:center;gap:8px;padding:12px 22px;background:white;color:#7c3aed;border-radius:12px;font-weight:800;font-size:14px;text-decoration:none;">
              <i class="fa-solid fa-building"></i> Registrá tu empresa gratis
            </a>
            <a href="/login.html?redirect=/buscador_trabajos.html"
              style="display:inline-flex;align-items:center;gap:8px;padding:12px 18px;background:rgba(255,255,255,.15);color:white;border-radius:12px;font-weight:700;font-size:13px;text-decoration:none;border:1.5px solid rgba(255,255,255,.4);">
              Ya tengo cuenta
            </a>
          </div>
        </div>
      </div>
    </div>`
  }

  cont.innerHTML = `
    ${bannerHtml}
    <p style="color:#64748b;margin-bottom:16px;font-size:14px;">
      <strong>${total}</strong> candidato${total!==1?"s":""} encontrado${total!==1?"s":""}
      ${rubroActivo ? `· rubro: <strong>${rubroActivo}</strong>` : ""}
    </p>`

  cvs.forEach(cv => {
    const p      = cv.perfiles
    const rubros = Array.isArray(cv.rubros) ? cv.rubros : []

    const nombre   = `${p.nombre || ""} ${p.apellido || ""}`.trim() || "Candidato"
    const fotoHtml = `<div class="cv-avatar-ph"><i class="fa-solid fa-user"></i></div>`

    const rubrosHtml = rubros.length
      ? `<div class="cv-rubros">${rubros.map(r => `<span class="cv-rubro-tag">${r}</span>`).join("")}</div>`
      : ""

    const metaItems = [
      cv.edad           ? `<i class="fa-solid fa-cake-candles"></i> ${cv.edad} años` : "",
      p.localidad       ? `<i class="fa-solid fa-location-dot"></i> ${p.localidad}${p.provincia ? ", " + p.provincia : ""}` : "",
      cv.disponibilidad ? `<i class="fa-solid fa-calendar-check"></i> ${cv.disponibilidad.replace(/_/g," ")}` : "",
      cv.modalidad      ? `<i class="fa-solid fa-laptop-house"></i> ${cv.modalidad}` : ""
    ].filter(Boolean).join("  ·  ")

    // Botones según estado del usuario
    let accionesHtml
    if(empleador){
      // ── Empleador verificado: acceso completo ──
      const waNum  = (p.movil || "").replace(/\D/g,"")
      const waLink = waNum
        ? `https://wa.me/${waNum}?text=${encodeURIComponent(`Hola${p.nombre?" "+p.nombre:""}! Vi tu CV en Trabajos Cerca y me interesás para una posición. ¿Podemos hablar? 👋`)}`
        : null
      accionesHtml = `
        <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
          <a href="/perfil_publico.html?id=${cv.usuario_id}" target="_blank"
            class="btn btn-outline btn-sm" style="display:inline-flex;align-items:center;gap:6px;">
            <i class="fa-solid fa-eye"></i> Ver CV completo
          </a>
          ${waLink ? `<a href="${waLink}" target="_blank" rel="noopener"
            class="btn btn-sm" style="background:#25D366;color:white;display:inline-flex;align-items:center;gap:6px;">
            <i class="fa-brands fa-whatsapp"></i> WhatsApp
          </a>` : ""}
        </div>`
    } else if(uid){
      // ── Logueado pero NO es empleador ──
      accionesHtml = `
        <div style="margin-top:12px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <i class="fa-solid fa-lock" style="color:#7c3aed;flex-shrink:0;"></i>
          <span style="font-size:13px;color:#4c1d95;flex:1;">Necesitás una <strong>cuenta de empresa</strong> para ver el CV y contactar.</span>
          <a href="/registro_empresa.html"
            style="display:inline-flex;align-items:center;gap:5px;padding:8px 14px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:white;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;white-space:nowrap;">
            <i class="fa-solid fa-building"></i> Registrar empresa
          </a>
        </div>`
    } else {
      // ── Sin sesión: invitar a registrarse ──
      accionesHtml = `
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
          <a href="/registro_empresa.html"
            style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:white;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">
            <i class="fa-solid fa-eye"></i> Ver CV completo
          </a>
          <a href="/registro_empresa.html"
            style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#e2e8f0;color:#64748b;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;">
            <i class="fa-brands fa-whatsapp"></i> WhatsApp
          </a>
        </div>`
    }

    const card = document.createElement("div")
    card.className = "cv-card"
    card.innerHTML = `
      <div class="cv-card-header">
        ${fotoHtml}
        <div style="flex:1;min-width:0;">
          <p class="cv-nombre">${nombre}</p>
          <p class="cv-titulo"><i class="fa-solid fa-briefcase"></i> ${cv.titulo_profesional}</p>
          <p class="cv-meta">${metaItems}</p>
        </div>
      </div>
      ${rubrosHtml}
      ${accionesHtml}
    `
    cont.appendChild(card)
  })
}

init()
