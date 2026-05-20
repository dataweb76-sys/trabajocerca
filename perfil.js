import { supabase } from "./supabase.js"

async function init(){
  const { data: userData } = await supabase.auth.getUser()
  if(!userData.user){ location.href = "/login.html"; return }

  const userId = userData.user.id

  /* ── Guardar perfil pendiente del registro (cuando se confirma email) ── */
  const pending = localStorage.getItem("pendingPerfil")
  if(pending){
    try {
      const perfilData = JSON.parse(pending)
      const { data: existing } = await supabase.from("perfiles").select("id").eq("id", userId).single()
      if(!existing){
        await supabase.from("perfiles").insert({ id: userId, ...perfilData })
      }
    } catch(e){}
    localStorage.removeItem("pendingPerfil")
  }

  const { data, error } = await supabase
    .from("perfiles").select("*").eq("id", userId).single()

  if(error || !data){
    document.getElementById("dash").innerHTML = `
      <div class="alerta alerta-err" style="margin-bottom:16px;">No se encontraron tus datos de perfil.</div>
      <a href="/perfil_servicio.html?nuevo=1" class="btn btn-primary" style="margin-bottom:10px;">
        <i class="fa-solid fa-tools"></i> Completar perfil de profesional
      </a>
      <a href="/perfil_cv.html?nuevo=1" class="btn btn-success">
        <i class="fa-solid fa-file-lines"></i> Completar CV
      </a>`
    return
  }

  /* ── Completitud del perfil ── */
  const campos = [data.foto, data.nombre, data.apellido, data.movil, data.localidad, data.direccion, data.telefono_fijo]
  const completitud = Math.round((campos.filter(Boolean).length / campos.length) * 100)

  const fotoHtml = data.foto
    ? `<img src="${data.foto}" class="dash-avatar">`
    : `<div class="dash-avatar-placeholder"><i class="fa-solid fa-user"></i></div>`

  const badgeHtml = data.tipo === "profesional"
    ? '<span class="badge badge-pro">🔨 Profesional</span>'
    : '<span class="badge badge-work">📄 Busca trabajo</span>'

  const accionPrincipal = data.tipo === "profesional"
    ? `<a href="/perfil_servicio.html" class="btn btn-orange"><i class="fa-solid fa-tools"></i> Gestionar mi servicio</a>`
    : `<a href="/perfil_cv.html" class="btn btn-success"><i class="fa-solid fa-file-lines"></i> Gestionar mi CV</a>`

  /* ── Disponibilidad (solo para profesionales) ── */
  let disponibleHtml = ""
  if(data.tipo === "profesional"){
    const { data: srv } = await supabase.from("servicios").select("id,disponible").eq("usuario_id", userId).single()
    const isDisp = srv?.disponible !== false
    disponibleHtml = `
      <div class="toggle-wrap">
        <label class="toggle">
          <input type="checkbox" id="toggleDisponible" ${isDisp ? "checked" : ""}
            onchange="cambiarDisponibilidad(this.checked,'${srv?.id || ""}')">
          <span class="toggle-slider"></span>
        </label>
        <div>
          <strong id="labelDisp" style="font-size:15px;">${isDisp ? "Disponible" : "No disponible ahora"}</strong>
          <p style="margin:2px 0 0;font-size:13px;color:#64748b;">
            ${isDisp ? "Aparecés en las búsquedas" : "Estás oculto en las búsquedas"}
          </p>
        </div>
      </div>`
  }

  document.getElementById("dash").innerHTML = `

    <div class="dash-header">
      <div style="text-align:center;">
        ${fotoHtml}
        <div style="margin-top:8px;">
          <label for="inputFoto" style="cursor:pointer;color:#2563eb;font-size:12px;font-weight:600;">
            <i class="fa-solid fa-camera"></i> Cambiar foto
          </label>
          <input type="file" id="inputFoto" accept="image/*" style="display:none" onchange="subirFoto(this)">
        </div>
      </div>
      <div class="dash-info" style="flex:1;">
        <h3>${data.nombre || ""} ${data.apellido || ""}</h3>
        <p><i class="fa-solid fa-location-dot"></i> ${data.localidad || "Sin localidad"}${data.provincia ? ", " + data.provincia : ""}</p>
        <p><i class="fa-brands fa-whatsapp" style="color:#25D366"></i> ${data.movil || "Sin móvil"}</p>
        ${badgeHtml}
        <div style="margin-top:10px;">
          <p style="font-size:12px;color:#64748b;margin:0 0 4px;">Perfil completado: <strong>${completitud}%</strong></p>
          <div class="progreso-barra"><div class="progreso-fill" style="width:${completitud}%"></div></div>
          ${completitud < 100 ? '<p style="font-size:11px;color:#94a3b8;margin:4px 0 0;">Completá todos los datos para aparecer mejor posicionado</p>' : '<p style="font-size:11px;color:#16a34a;margin:4px 0 0;"><i class="fa-solid fa-check"></i> Perfil completo</p>'}
        </div>
      </div>
    </div>

    <div class="dash-actions">
      ${accionPrincipal}
      <a href="/perfil_publico.html?id=${userId}" class="btn btn-outline" target="_blank">
        <i class="fa-solid fa-eye"></i> Ver mi perfil público
      </a>
      <button class="btn" onclick="compartirPagina('${userId}')"
        style="background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);color:white;border:none;">
        <i class="fa-brands fa-instagram"></i> Compartí en redes
      </button>
    </div>
    <div id="msgCompartir" style="margin-top:8px;"></div>

    <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;">

    ${disponibleHtml}

    <h3 style="margin:0 0 16px;font-size:17px;">Mis datos</h3>

    <div class="grid-2col">
      <div><label>Nombre *</label><input id="editNombre" value="${esc(data.nombre)}"></div>
      <div><label>Apellido *</label><input id="editApellido" value="${esc(data.apellido)}"></div>
    </div>

    <label>Móvil / WhatsApp *</label>
    <input id="editMovil" value="${esc(data.movil)}" type="tel" placeholder="Ej: 1123456789">

    <label><i class="fa-brands fa-instagram" style="color:#e1306c;"></i> Instagram</label>
    <input id="editInstagram" value="${esc(data.instagram)}" placeholder="Ej: @tunombre">

    <label>Teléfono fijo</label>
    <input id="editTelefono" value="${esc(data.telefono_fijo)}" type="tel" placeholder="Ej: 02214567890">

    <label>Dirección</label>
    <input id="editDireccion" value="${esc(data.direccion)}" placeholder="Ej: Av. Rivadavia 1234, piso 2">

    <label>Código Postal</label>
    <input id="editCP" value="${esc(data.codigo_postal)}" placeholder="Ej: 1900" oninput="autocompletarCPPerfil(this.value)">

    <label>Localidad</label>
    <select id="editLocalidad">
      <option value="${esc(data.localidad)}">${esc(data.localidad) || "Ingresá el CP primero"}</option>
    </select>

    <label>Provincia</label>
    <input id="editProvincia" value="${esc(data.provincia)}" readonly placeholder="Se completa automático">

    <label>Email</label>
    <input value="${esc(data.email)}" readonly style="color:#94a3b8;">

    <div id="msgPerfil"></div>

    <button class="btn btn-primary" onclick="guardarDatos()">
      <i class="fa-solid fa-save"></i> Guardar cambios
    </button>

    <hr style="margin:28px 0;border:none;border-top:1px solid #e2e8f0;">

    ${data.tipo === "profesional" ? `
      <h3 style="margin:0 0 6px;font-size:17px;">
        <i class="fa-solid fa-star" style="color:#f59e0b;"></i> Puntuar a un cliente
      </h3>
      <p style="font-size:14px;color:#64748b;margin:0 0 16px;">
        Cuando cerrés un trato, buscá al cliente por su email y dejale una puntuación para ayudar a la comunidad.
      </p>
      <label>Email del cliente</label>
      <input id="emailCliente" type="email" placeholder="email registrado del cliente">
      <div id="clienteEncontrado" style="margin-bottom:10px;"></div>
      <button class="btn btn-outline" onclick="buscarCliente()" style="margin-bottom:18px;">
        <i class="fa-solid fa-magnifying-glass"></i> Buscar cliente
      </button>
      <div id="formClienteRating" style="display:none;">
        <label>Puntuación *</label>
        <div class="stars-input" id="starsCliente">
          <i class="fa-solid fa-star" onclick="setEstrellaCliente(1)" onmouseover="hoverEstrellaCliente(1)" onmouseout="resetHoverCliente()"></i>
          <i class="fa-solid fa-star" onclick="setEstrellaCliente(2)" onmouseover="hoverEstrellaCliente(2)" onmouseout="resetHoverCliente()"></i>
          <i class="fa-solid fa-star" onclick="setEstrellaCliente(3)" onmouseover="hoverEstrellaCliente(3)" onmouseout="resetHoverCliente()"></i>
          <i class="fa-solid fa-star" onclick="setEstrellaCliente(4)" onmouseover="hoverEstrellaCliente(4)" onmouseout="resetHoverCliente()"></i>
          <i class="fa-solid fa-star" onclick="setEstrellaCliente(5)" onmouseover="hoverEstrellaCliente(5)" onmouseout="resetHoverCliente()"></i>
        </div>
        <label>Comentario</label>
        <textarea id="comentarioCliente" rows="3"
          placeholder="¿Cómo fue trabajar con este cliente? Puntualidad, trato, pago..."></textarea>
        <div id="msgClienteRating"></div>
        <button class="btn btn-success" onclick="enviarRatingCliente()">
          <i class="fa-solid fa-paper-plane"></i> Enviar puntuación
        </button>
      </div>
    ` : ""}

    <hr style="margin:28px 0;border:none;border-top:1px solid #e2e8f0;">

    <button class="btn btn-outline" onclick="cerrarSesion()" style="color:#ef4444;border-color:#ef4444;">
      <i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión
    </button>
  `
}

/* ── DISPONIBILIDAD ── */
window.cambiarDisponibilidad = async function(activo, servicioId){
  const lbl = document.getElementById("labelDisp")
  if(!servicioId) return
  await supabase.from("servicios").update({ disponible: activo }).eq("id", servicioId)
  lbl.textContent = activo ? "Disponible" : "No disponible ahora"
  lbl.nextElementSibling.textContent = activo ? "Aparecés en las búsquedas" : "Estás oculto en las búsquedas"
}

/* ── AUTOCOMPLETAR CP EN PERFIL ── */
window.autocompletarCPPerfil = async function(codigo){
  if(codigo.trim().length < 4) return
  try {
    const res = await fetch(`https://api.zippopotam.us/ar/${codigo.trim()}`)
    if(!res.ok) return
    const data = await res.json()
    const sel = document.getElementById("editLocalidad")
    sel.innerHTML = ""
    data.places.forEach(p => {
      const o = document.createElement("option"); o.value = o.textContent = p["place name"]; sel.appendChild(o)
    })
    document.getElementById("editProvincia").value = data.places[0]["state"]
  } catch(e){}
}

/* ── FOTO ── */
window.subirFoto = async function(input){
  const file = input.files[0]; if(!file) return
  const { data: ud } = await supabase.auth.getUser()
  const uid = ud.user.id
  const name = `perfil_${uid}_${Date.now()}`
  const { error } = await supabase.storage.from("trabajos").upload(name, file, { upsert: true })
  if(error){ alert(error.message); return }
  const { data } = supabase.storage.from("trabajos").getPublicUrl(name)
  await supabase.from("perfiles").update({ foto: data.publicUrl }).eq("id", uid)
  init()
}

/* ── GUARDAR DATOS ── */
window.guardarDatos = async function(){
  const { data: ud } = await supabase.auth.getUser()
  const uid  = ud.user.id
  const msg  = document.getElementById("msgPerfil")
  const nombre   = document.getElementById("editNombre").value.trim()
  const apellido = document.getElementById("editApellido").value.trim()

  if(!nombre || !apellido){
    msg.innerHTML = '<div class="alerta alerta-err">Nombre y apellido son obligatorios</div>'
    return
  }

  const { error } = await supabase.from("perfiles").update({
    nombre,
    apellido,
    movil:         document.getElementById("editMovil").value.trim(),
    instagram:     document.getElementById("editInstagram").value.trim(),
    telefono_fijo: document.getElementById("editTelefono").value.trim(),
    direccion:     document.getElementById("editDireccion").value.trim(),
    codigo_postal: document.getElementById("editCP").value.trim(),
    localidad:     document.getElementById("editLocalidad").value,
    provincia:     document.getElementById("editProvincia").value
  }).eq("id", uid)

  if(error){ msg.innerHTML = `<div class="alerta alerta-err">${error.message}</div>`; return }

  msg.innerHTML = '<div class="alerta alerta-ok"><i class="fa-solid fa-check"></i> Cambios guardados</div>'
  setTimeout(() => { msg.innerHTML = ""; init() }, 2000)
}

/* ── PUNTUAR CLIENTE ── */
let clienteIdSel = null, estrellaCliente = 0

window.buscarCliente = async function(){
  const email = document.getElementById("emailCliente").value.trim()
  const div   = document.getElementById("clienteEncontrado")
  const form  = document.getElementById("formClienteRating")
  if(!email){ div.innerHTML = '<div class="alerta alerta-err">Ingresá un email</div>'; return }

  const { data } = await supabase.from("perfiles").select("id,nombre,apellido,foto").eq("email", email).single()
  if(!data){
    div.innerHTML = '<div class="alerta alerta-err">No se encontró ningún usuario con ese email</div>'
    form.style.display = "none"; return
  }
  clienteIdSel = data.id
  const fotoEl = data.foto
    ? `<img src="${data.foto}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:8px;">`
    : `<i class="fa-solid fa-user" style="color:#2563eb;margin-right:8px;"></i>`
  div.innerHTML = `<div class="alerta alerta-ok">${fotoEl}<strong>${data.nombre} ${data.apellido}</strong> encontrado</div>`
  form.style.display = "block"
  estrellaCliente = 0
  actualizarStarsCliente(0)
}

window.setEstrellaCliente = function(n){ estrellaCliente = n; actualizarStarsCliente(n) }
window.hoverEstrellaCliente = function(n){ actualizarStarsCliente(n, true) }
window.resetHoverCliente = function(){ actualizarStarsCliente(estrellaCliente) }

function actualizarStarsCliente(n, hover){
  document.querySelectorAll("#starsCliente i").forEach((el, i) => {
    el.classList.remove("lit")
    if(i < n) el.classList.add("lit")
  })
}

window.enviarRatingCliente = async function(){
  const msg = document.getElementById("msgClienteRating")
  if(!clienteIdSel)   { msg.innerHTML = '<div class="alerta alerta-err">Buscá primero al cliente</div>'; return }
  if(!estrellaCliente){ msg.innerHTML = '<div class="alerta alerta-err">Seleccioná una puntuación</div>'; return }

  const { data: ud } = await supabase.auth.getUser()
  const { error } = await supabase.from("reviews").insert({
    trabajador_id: clienteIdSel, autor_id: ud.user.id,
    rating: estrellaCliente,
    comentario: document.getElementById("comentarioCliente").value.trim(),
    tipo: "cliente"
  })
  if(error){ msg.innerHTML = `<div class="alerta alerta-err">${error.message}</div>`; return }
  document.getElementById("formClienteRating").innerHTML =
    '<div class="alerta alerta-ok"><i class="fa-solid fa-check"></i> Puntuación enviada al cliente.</div>'
  clienteIdSel = null; estrellaCliente = 0
}

/* ── COMPARTIR EN REDES ── */
window.compartirPagina = async function(userId){
  const url  = `https://trabajocerca.vercel.app/perfil_publico.html?id=${userId}`
  const texto = "¡Sumate a Trabajos Cerca! Encontrá trabajo, profesionales y oficios en tu ciudad 👷‍♂️💼\n"
  const msg  = document.getElementById("msgCompartir")

  try { await navigator.clipboard.writeText(url) } catch(e){}

  if(navigator.share){
    try {
      await navigator.share({ title: "Trabajos Cerca", text: texto, url })
      return
    } catch(e){}
  }

  window.open("https://www.instagram.com/", "_blank")
  msg.innerHTML = `<div class="alerta alerta-ok" style="font-size:14px;">
    <i class="fa-solid fa-check"></i>
    <strong>¡Enlace copiado!</strong> Abrimos Instagram — pegalo en tu historia o bio.<br>
    <small style="color:#64748b;">Cuantos más conozcan la página, más rápido conseguís lo que buscás 🚀</small>
  </div>`
  setTimeout(() => { msg.innerHTML = "" }, 6000)
}

/* ── CERRAR SESIÓN ── */
window.cerrarSesion = async function(){
  await supabase.auth.signOut()
  location.href = "/index.html"
}

function esc(v){ return (v || "").toString().replace(/"/g,"&quot;") }

init()
