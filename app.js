import { supabase } from "./supabase.js"

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

  const tipo     = document.getElementById("tipo").value
  const nombre   = document.getElementById("nombre").value.trim()
  const apellido = document.getElementById("apellido").value.trim()
  const email    = document.getElementById("email").value.trim()
  const password = document.getElementById("password").value
  const movil    = document.getElementById("movil").value.trim()
  const codigo   = document.getElementById("codigo_postal").value.trim()
  const localidad= document.getElementById("localidad").value
  const provincia= document.getElementById("provincia").value

  const msg = document.getElementById("msg")

  if(!localidad){
    msg.innerHTML = '<div class="alerta alerta-err">Seleccioná una localidad</div>'
    btn.disabled = false
    btn.innerHTML = 'Continuar <i class="fa-solid fa-arrow-right"></i>'
    return
  }

  const coords = await obtenerCoordenadas(localidad, provincia)

  const { data, error } = await supabase.auth.signUp({ email, password })

  if(error){
    msg.innerHTML = `<div class="alerta alerta-err">${error.message}</div>`
    btn.disabled = false
    btn.innerHTML = 'Continuar <i class="fa-solid fa-arrow-right"></i>'
    return
  }

  // Supabase puede requerir confirmación de email — data.user puede ser null
  if(!data.user){
    msg.innerHTML = `<div class="alerta alerta-ok">
      <i class="fa-solid fa-envelope"></i>
      Te enviamos un email de confirmación. Revisá tu bandeja y hacé clic en el enlace para activar la cuenta.
    </div>`
    btn.disabled = false
    btn.innerHTML = 'Continuar <i class="fa-solid fa-arrow-right"></i>'
    return
  }

  const userId = data.user.id

  const { error: insertError } = await supabase.from("perfiles").insert({
    id:            userId,
    nombre,
    apellido,
    email,
    movil,
    codigo_postal: codigo,
    localidad,
    provincia,
    pais:          "Argentina",
    lat:           coords.lat,
    lng:           coords.lng,
    tipo
  })

  if(insertError){
    msg.innerHTML = `<div class="alerta alerta-err">${insertError.message}</div>`
    btn.disabled = false
    btn.innerHTML = 'Continuar <i class="fa-solid fa-arrow-right"></i>'
    return
  }

  if(tipo === "profesional"){
    window.location.href = "/perfil_servicio.html?nuevo=1"
  } else {
    window.location.href = "/perfil_cv.html?nuevo=1"
  }
}

document.getElementById("registroForm")
  .addEventListener("submit", registrarUsuario)
