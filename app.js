import { supabase } from "./supabase.js"

/* ============================
   REFERIDOS
============================ */
async function creditarReferido(nuevoUserId){
  const ref = localStorage.getItem('tc_ref')
  if(!ref || ref === nuevoUserId) return
  try {
    const { data: ya } = await supabase.from("referidos").select("id").eq("referido_id", nuevoUserId).maybeSingle()
    if(ya) return
    await supabase.from("referidos").insert({ referidor_id: ref, referido_id: nuevoUserId })
    const { data: rp } = await supabase.from("perfiles").select("puntos_referidos").eq("id", ref).single()
    const pts = (rp?.puntos_referidos || 0) + 1
    await supabase.from("perfiles").update({ puntos_referidos: pts }).eq("id", ref)
    await supabase.from("notificaciones").insert({
      usuario_id: ref, tipo: "sistema",
      titulo: "🎉 ¡Ganaste 1 punto de referido!",
      cuerpo: "Alguien se registró con tu link de invitación. ¡Seguí compartiendo!",
      url: "/perfil.html"
    })
    localStorage.removeItem('tc_ref')
  } catch(e){ console.warn("creditarReferido:", e) }
}

/* ============================
   AUTOCOMPLETAR UBICACIÓN
============================ */

async function obtenerUbicacion(codigo){
  codigo = codigo.trim()
  if(codigo.length < 4) return

  try {
    const res = await fetch(`https://api.zippopotam.us/ar/${codigo}`)
    if(!res.ok) return

    const data = await res.json()
    const select = document.getElementById("localidad")

    select.innerHTML = '<option value="">Seleccione localidad</option>'

    data.places.forEach(place => {
      const opt = document.createElement("option")
      opt.value = place["place name"]
      opt.textContent = place["place name"]
      select.appendChild(opt)
    })

    document.getElementById("provincia").value = data.places[0]["state"]

    if(data.places.length === 1){
      select.value = data.places[0]["place name"]
    }
  } catch(err) {
    console.error(err)
  }
}

document.getElementById("codigo_postal")
  .addEventListener("input", e => obtenerUbicacion(e.target.value))

/* ============================
   OBTENER COORDENADAS
============================ */

async function obtenerCoordenadas(ciudad, provincia){
  try {
    const url = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(ciudad)}&state=${encodeURIComponent(provincia)}&country=Argentina&format=json&limit=1`
    const res = await fetch(url)
    const data = await res.json()
    if(!data.length) return { lat: null, lng: null }
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return { lat: null, lng: null }
  }
}

/* ============================
   REGISTRO
============================ */

async function registrarUsuario(e){
  e.preventDefault()

  const btn = e.target.querySelector("button[type=submit]")
  btn.disabled = true
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando...'

  const tipo           = document.getElementById("tipo").value
  const esEmp          = tipo === "empleador"
  // Para empleador: el "nombre" es el nombre de la empresa
  const nombreEmpInput = document.getElementById("nombre_empresa_emp")?.value.trim() || ""
  const nombre         = esEmp ? nombreEmpInput : document.getElementById("nombre").value.trim()
  const apellido       = esEmp ? "" : document.getElementById("apellido").value.trim()
  const email          = document.getElementById("email").value.trim()
  const password       = document.getElementById("password").value
  const movil          = document.getElementById("movil").value.trim()
  const codigo         = document.getElementById("codigo_postal").value.trim()
  const localidad      = document.getElementById("localidad").value
  const provincia      = document.getElementById("provincia").value
  const nombre_empresa = esEmp ? nombreEmpInput : (document.getElementById("nombre_empresa")?.value || "").trim()
  const mostrar_como   = esEmp ? "empresa" : (document.querySelector('input[name="mostrar_como"]:checked')?.value || "personal")
  const mostrar_tel    = document.getElementById("mostrar_telefono")?.checked ?? true
  const terminos       = document.getElementById("terminos")?.checked

  const msg = document.getElementById("msg")

  const btnLabel = esEmp
    ? '<i class="fa-solid fa-building"></i> Crear cuenta empresa gratis'
    : 'Continuar <i class="fa-solid fa-arrow-right"></i>'

  if(!terminos){
    msg.innerHTML = '<div class="alerta alerta-err">Debés aceptar los Términos y Condiciones para continuar</div>'
    btn.disabled = false; btn.innerHTML = btnLabel
    return
  }

  if(esEmp && !nombre){
    msg.innerHTML = '<div class="alerta alerta-err">Ingresá el nombre de la empresa o comercio</div>'
    btn.disabled = false; btn.innerHTML = btnLabel
    return
  }

  if(!localidad){
    msg.innerHTML = '<div class="alerta alerta-err">Seleccioná una localidad</div>'
    btn.disabled = false; btn.innerHTML = btnLabel
    return
  }

  const coords = await obtenerCoordenadas(localidad, provincia)

  const { data, error } = await supabase.auth.signUp({ email, password })

  if(error){
    msg.innerHTML = `<div class="alerta alerta-err">${error.message}</div>`
    btn.disabled = false; btn.innerHTML = btnLabel
    return
  }

  // Guardar datos del perfil para insertarlos después de confirmar email
  const perfilData = {
    nombre, apellido, email, movil,
    nombre_empresa: nombre_empresa || null,
    mostrar_como,
    mostrar_telefono: mostrar_tel,
    codigo_postal: codigo, localidad, provincia,
    pais: "Argentina", lat: coords.lat, lng: coords.lng, tipo
  }
  localStorage.setItem("pendingPerfil", JSON.stringify(perfilData))

  // Supabase puede requerir confirmación de email — data.user puede ser null
  if(!data.user){
    msg.innerHTML = `<div class="alerta alerta-ok">
      <i class="fa-solid fa-envelope"></i>
      Te enviamos un email de confirmación a <strong>${email}</strong>. Hacé clic en el enlace del mail para activar tu cuenta.
    </div>`
    btn.disabled = false; btn.innerHTML = btnLabel
    return
  }

  // Si no hay confirmación de email, insertamos directo
  const userId = data.user.id
  await supabase.from("perfiles").insert({ id: userId, ...perfilData })
  localStorage.removeItem("pendingPerfil")
  await creditarReferido(userId)

  if(tipo === "profesional"){
    window.location.href = "/perfil_servicio.html?nuevo=1"
  } else if(tipo === "empleador"){
    window.location.href = "/perfil.html?nueva_empresa=1"
  } else {
    window.location.href = "/perfil_cv.html?nuevo=1"
  }
}

document.getElementById("registroForm")
  .addEventListener("submit", registrarUsuario)

async function registroConGoogle(){
  // Guardamos el tipo elegido para usarlo en el callback
  const tipo = document.getElementById("tipo").value
  localStorage.setItem("googleTipo", tipo)

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://trabajocerca.vercel.app/auth_callback.html"
    }
  })
  if(error){
    const msg = document.getElementById("msg")
    msg.innerHTML = `<div class="alerta alerta-err">${error.message}</div>`
  }
}

window.registroConGoogle = registroConGoogle
